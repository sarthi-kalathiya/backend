import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const prisma = new PrismaClient();

/**
 * Automatically submits exams that have exceeded their time limit
 * Can be run as a scheduled job (e.g., every 1-5 minutes)
 */
export const autoSubmitExpiredExams = async () => {
  const now = new Date();

  try {
    // Find all exams that are in progress but have passed their end time
    const expiredExams = await prisma.studentExam.findMany({
      where: {
        status: "IN_PROGRESS",
        endTime: {
          lt: now,
        },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        exam: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
        answerSheet: {
          include: {
            responses: true,
          },
        },
      },
    });

    logger.info(`Found ${expiredExams.length} expired exams to auto-submit`);

    let successCount = 0;
    let errorCount = 0;

    for (const studentExam of expiredExams) {
      try {
        if (!studentExam.exam || !studentExam.student) {
          logger.error(
            `Skipping auto-submit for exam ${studentExam.id}: Missing exam or student data`
          );
          errorCount++;
          continue;
        }

        // Get existing responses if any
        const responses = studentExam.answerSheet?.responses || [];

        // Create answer sheet if it doesn't exist
        let answerSheet = studentExam.answerSheet;
        if (!answerSheet) {
          answerSheet = await prisma.answerSheet.create({
            data: {
              studentExamId: studentExam.id,
              responses: {
                create: responses.map((response) => ({
                  questionId: response.questionId,
                  optionId: response.optionId,
                })),
              },
            },
          });
        }

        // Calculate marks
        let obtainedMarks = 0;
        const startTime = studentExam.startTime || now; // Fallback in case startTime is null
        const timeTaken = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );

        // Calculate marks for each response
        if (Array.isArray(responses) && responses.length > 0) {
          for (const response of responses) {
            if (!response || !response.questionId || !response.optionId) {
              logger.warn(
                `Skipping invalid response in auto-submit for exam ${studentExam.id}`
              );
              continue;
            }

            const question = studentExam.exam.questions.find(
              (q) => q.id === response.questionId
            );
            if (question && response.optionId === question.correctOptionId) {
              obtainedMarks += question.marks;
            } else if (question && question.negativeMarks > 0) {
              obtainedMarks -= question.negativeMarks;
            }
          }
        } else {
          logger.info(
            `No responses found for auto-submitted exam ${studentExam.id}`
          );
        }

        // Ensure obtained marks is not negative
        obtainedMarks = Math.max(0, obtainedMarks);

        // Create result
        await prisma.result.create({
          data: {
            studentExamId: studentExam.id,
            marks: obtainedMarks,
            timeTaken,
            status:
              obtainedMarks >= studentExam.exam.passingMarks ? "PASS" : "FAIL",
            autoGraded: true,
          },
        });

        // Update student stats
        await prisma.student.update({
          where: { id: studentExam.student.id },
          data: {
            completedExams: {
              increment: 1,
            },
          },
        });

        // Update student exam status
        await prisma.studentExam.update({
          where: { id: studentExam.id },
          data: {
            status: "COMPLETED",
            submittedAt: now,
            autoSubmitted: true,
          },
        });

        logger.info(
          `Auto-submitted exam for student ${studentExam.student.user.name} (ID: ${studentExam.studentId}), exam ID: ${studentExam.examId}`
        );
        successCount++;
      } catch (error) {
        logger.error(`Error auto-submitting exam ${studentExam.id}:`, error);
        errorCount++;
      }
    }

    return {
      processed: expiredExams.length,
      success: successCount,
      errors: errorCount,
    };
  } catch (error) {
    logger.error("Error in auto-submit process:", error);
    return {
      processed: 0,
      success: 0,
      errors: 1,
      error,
    };
  }
};

/**
 * Checks and enforces exam time limits
 * Returns the time remaining in seconds, or 0 if time is up
 */
export const checkExamTimeLimit = async (studentExamId: string) => {
  const studentExam = await prisma.studentExam.findUnique({
    where: { id: studentExamId },
    include: {
      exam: true,
    },
  });

  if (!studentExam) {
    throw new Error("Exam not found");
  }

  if (studentExam.status !== "IN_PROGRESS") {
    return {
      timeRemaining: 0,
      isActive: false,
      message: "Exam is not in progress",
    };
  }

  const now = new Date();
  const endTime =
    studentExam.endTime ||
    new Date(
      studentExam.startTime!.getTime() + studentExam.exam.duration * 60 * 1000
    );

  if (now > endTime) {
    // Time is up
    return {
      timeRemaining: 0,
      isActive: false,
      message: "Time is up",
    };
  }

  // Calculate remaining time in seconds
  const remainingTime = Math.floor((endTime.getTime() - now.getTime()) / 1000);

  return {
    timeRemaining: remainingTime,
    isActive: true,
    endTime,
  };
};

/**
 * Prepares email notifications for students with upcoming exams
 * This function doesn't actually send emails, but it identifies which students
 * should be notified and prepares the notification data
 */
export const prepareExamReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Find exams starting within the next 24 hours
    const upcomingExams = await prisma.exam.findMany({
      where: {
        startDate: {
          gt: now,
          lt: tomorrow,
        },
        isActive: true,
      },
      include: {
        subject: true,
        owner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        studentExams: {
          where: {
            status: "NOT_STARTED",
          },
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${upcomingExams.length} upcoming exams for reminders`);

    // Prepare notifications for each student
    const notifications = [];

    for (const exam of upcomingExams) {
      const startTime = new Date(exam.startDate);
      const hoursUntilStart = Math.round(
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      for (const studentExam of exam.studentExams) {
        const student = studentExam.student;

        // Check if student is banned
        const isBanned = await prisma.exam.findFirst({
          where: {
            id: exam.id,
            bannedStudents: {
              some: {
                id: student.id,
              },
            },
          },
        });

        if (isBanned) {
          continue; // Skip banned students
        }

        notifications.push({
          examId: exam.id,
          examName: exam.name,
          subjectName: exam.subject.name,
          teacherName: exam.owner.user.name,
          startTime: exam.startDate,
          duration: exam.duration,
          hoursUntilStart,
          studentId: student.id,
          studentName: student.user.name,
          studentEmail: student.user.email,
          message: `Reminder: Your exam "${exam.name}" for ${exam.subject.name} starts in ${hoursUntilStart} hours.`,
        });
      }
    }

    logger.info(
      `Prepared ${notifications.length} reminders for students with upcoming exams`
    );
    return notifications;
  } catch (error) {
    logger.error("Error preparing exam reminders:", error);
    return [];
  }
};
