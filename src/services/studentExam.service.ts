import prisma from "../utils/prismaClient";
import { logger } from "../utils/logger";
import { CheatingEventType } from "../constants/exam";
import { Question } from "../models/exam.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "../utils/errors";
import { ExamStatus } from "../constants/exam";

// Get all exams for student (with filters for assigned/completed)
export const getStudentExams = async (studentId: string, status?: string) => {
  const where: any = { studentId };
  if (status) {
    where.status = status;
  }

  const studentExams = await prisma.studentExam.findMany({
    where,
    include: {
      exam: {
        include: {
          subject: true,
          owner: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Add status text to each student exam
  const enrichedStudentExams = studentExams.map(studentExam => ({
    ...studentExam,
    statusText: getStudentExamStatusText(studentExam)
  }));

  logger.info(
    `Retrieved ${studentExams.length} exams for student ${studentId}`
  );
  return enrichedStudentExams;
};

// Get exam details
export const getExamDetails = async (examId: string, studentId: string) => {
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
    },
    include: {
      exam: {
        include: {
          subject: true,
          owner: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Exam not found or not assigned to student");
  }

  logger.info(
    `Retrieved exam details for student ${studentId}, exam ${examId}`
  );
  return studentExam;
};

// Start an exam
export const startExam = async (examId: string, studentId: string) => {
  // First check if the exam exists and student is assigned to it
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
    },
    include: {
      exam: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Exam not found or not assigned to student");
  }

  // Check if student is banned (by status)
  if (studentExam.status === ExamStatus.BANNED) {
    throw new ForbiddenError("You are banned from taking this exam");
  }

  // Check if exam has already been started or completed
  if (studentExam.status !== ExamStatus.NOT_STARTED) {
    throw new BadRequestError(
      `Exam already started or completed: ${studentExam.status}`
    );
  }

  // Check if exam is active
  if (!studentExam.exam.isActive) {
    throw new BadRequestError("Exam is not active");
  }

  // Check if exam has started (based on startDate)
  const now = new Date();
  if (now < studentExam.exam.startDate) {
    throw new BadRequestError(
      `Exam has not started yet. Start date: ${studentExam.exam.startDate}`
    );
  }

  // Check if exam has ended (based on endDate)
  if (now > studentExam.exam.endDate) {
    throw new BadRequestError(
      `Exam has ended. End date: ${studentExam.exam.endDate}`
    );
  }

  // Calculate exam end time based on duration
  const endTime = new Date(
    now.getTime() + studentExam.exam.duration * 60 * 1000
  );

  // Update student exam status to IN_PROGRESS
  const updatedStudentExam = await prisma.studentExam.update({
    where: { id: studentExam.id },
    data: {
      status: ExamStatus.IN_PROGRESS,
      startTime: now,
      endTime,
    },
  });

  // Log the start of exam with anti-cheating monitoring
  logger.info(
    `Student ${studentId} started exam ${examId} at ${now.toISOString()}`
  );

  // Return exam details with anti-cheating configuration
  return {
    exam: {
      id: studentExam.exam.id,
      name: studentExam.exam.name,
      subject: studentExam.exam.subject.name,
      duration: studentExam.exam.duration,
      totalMarks: studentExam.exam.totalMarks,
      passingMarks: studentExam.exam.passingMarks,
      numQuestions: studentExam.exam.numQuestions,
    },
    examSession: {
      startTime: now,
      endTime,
      timeRemaining: studentExam.exam.duration * 60, // in seconds
    },
    antiCheating: {
      fullscreenRequired: true,
      tabSwitchDetection: true,
      autoSubmitOnViolation: true,
      maxViolations: 3, // Maximum number of violations before auto-submission
    },
  };
};

// Submit an exam
export const submitExam = async (
  examId: string,
  studentId: string,
  responses: Array<{ questionId: string; optionId: string }>
) => {
  // Validate responses array
  if (!responses || !Array.isArray(responses) || responses.length === 0) {
    throw new BadRequestError(
      "Responses must be a non-empty array of question answers"
    );
  }

  // Validate each response has required fields
  const invalidResponses = responses.filter(
    (r) => !r || typeof r !== "object" || !r.questionId || !r.optionId
  );

  if (invalidResponses.length > 0) {
    throw new BadRequestError(
      "Each response must have questionId and optionId fields"
    );
  }

  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
    },
    include: {
      exam: {
        include: {
          questions: {
            include: {
              options: true,
            },
            orderBy: {
              position: 'asc'
            }
          },
        },
      },
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Exam not found or not assigned to student");
  }

  if (studentExam.status !== "IN_PROGRESS") {
    throw new BadRequestError("Exam not in progress");
  }

  const now = new Date();

  // Check if exam is being submitted after the allowed end time
  const isLateSubmission = studentExam.endTime && now > studentExam.endTime;

  // Validate that all required questions have responses
  const questionIds = studentExam.exam.questions.map((q: Question) => q.id);
  const responseQuestionIds = responses.map(
    (r: { questionId: string }) => r.questionId
  );

  // Check if all questions are answered
  const unansweredQuestions = questionIds.filter(
    (id: string) => !responseQuestionIds.includes(id)
  );

  // Calculate marks
  let obtainedMarks = 0;
  const timeTaken = Math.floor(
    (now.getTime() - studentExam.startTime!.getTime()) / 1000
  );

  // Create answer sheet and responses
  const answerSheet = await prisma.answerSheet.create({
    data: {
      studentExamId: studentExam.id,
      responses: {
        create: responses.map(
          (response: { questionId: string; optionId: string }) => ({
            questionId: response.questionId,
            optionId: response.optionId,
          })
        ),
      },
    },
  });

  // Calculate marks for each response
  for (const response of responses) {
    const question = studentExam.exam.questions.find(
      (q: Question) => q.id === response.questionId
    );
    if (question && response.optionId === question.correctOptionId) {
      obtainedMarks += question.marks;
    } else if (question && question.negativeMarks > 0) {
      obtainedMarks -= question.negativeMarks;
    }
  }

  // Ensure obtained marks is not negative
  obtainedMarks = Math.max(0, obtainedMarks);

  // Create result
  const result = await prisma.result.create({
    data: {
      studentExamId: studentExam.id,
      marks: obtainedMarks,
      timeTaken,
      status: obtainedMarks >= studentExam.exam.passingMarks ? "PASS" : "FAIL",
    },
  });

  // Update student stats
  await prisma.student.update({
    where: { id: studentId },
    data: {
      completedExams: {
        increment: 1,
      },
    },
  });

  // Update student exam status
  const updatedExam = await prisma.studentExam.update({
    where: { id: studentExam.id },
    data: {
      status: "COMPLETED",
      submittedAt: now,
      autoSubmitted: isLateSubmission || false,
    },
  });

  const studentName = `${studentExam.student.user.firstName} ${studentExam.student.user.lastName}`;
  logger.info(
    `Student ${studentId} (${studentName}) submitted exam ${examId} with marks ${obtainedMarks}/${studentExam.exam.totalMarks}`
  );

  return {
    exam: updatedExam,
    result: {
      ...result,
      totalMarks: studentExam.exam.totalMarks,
    },
    answerSheet,
    unansweredQuestions:
      unansweredQuestions.length > 0 ? unansweredQuestions : undefined,
  };
};

// Get questions for active exam
export const getExamQuestions = async (examId: string, studentId: string) => {
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
      status: "IN_PROGRESS",
    },
    include: {
      exam: {
        include: {
          questions: {
            include: {
              options: true,
            },
            orderBy: {
              position: 'asc'
            }
          },
        },
      },
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Active exam not found");
  }

  // Remove correctOptionId from questions to prevent cheating
  const secureQuestions = studentExam.exam.questions.map((question: any) => {
    // Extract correctOptionId and return the rest of the question
    const { correctOptionId, ...questionWithoutAnswer } = question;

    // Randomize option order to further prevent cheating
    const randomizedOptions = [...question.options].sort(
      () => Math.random() - 0.5
    );

    return {
      ...questionWithoutAnswer,
      options: randomizedOptions,
    };
  });

  logger.info(`Retrieved questions for student ${studentId}, exam ${examId}`);
  return secureQuestions;
};

// Save responses during exam
export const saveResponses = async (
  examId: string,
  studentId: string,
  responses: Array<{ questionId: string; optionId: string }>
) => {
  // Validate responses array
  if (!responses || !Array.isArray(responses)) {
    throw new BadRequestError("Responses must be an array of question answers");
  }

  // Allow empty array for saving (student might clear all responses)
  // But validate individual responses if they exist
  if (responses.length > 0) {
    const invalidResponses = responses.filter(
      (r) => !r || typeof r !== "object" || !r.questionId || !r.optionId
    );

    if (invalidResponses.length > 0) {
      throw new BadRequestError(
        "Each response must have questionId and optionId fields"
      );
    }
  }

  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
      status: "IN_PROGRESS",
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Active exam not found");
  }

  // Create or update answer sheet with responses
  const answerSheet = await prisma.answerSheet.upsert({
    where: { studentExamId: studentExam.id },
    create: {
      studentExamId: studentExam.id,
      responses: {
        create: responses.map(
          (response: { questionId: string; optionId: string }) => ({
            questionId: response.questionId,
            optionId: response.optionId,
          })
        ),
      },
    },
    update: {
      responses: {
        deleteMany: {},
        create: responses.map(
          (response: { questionId: string; optionId: string }) => ({
            questionId: response.questionId,
            optionId: response.optionId,
          })
        ),
      },
    },
  });

  logger.info(
    `Saved ${responses.length} responses for student ${studentId}, exam ${examId}`
  );
  return answerSheet;
};

// Get saved responses for current exam
export const getSavedResponses = async (examId: string, studentId: string) => {
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
      status: "IN_PROGRESS",
    },
    include: {
      answerSheet: {
        include: {
          responses: true,
        },
      },
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Active exam not found");
  }

  logger.info(
    `Retrieved saved responses for student ${studentId}, exam ${examId}`
  );
  return studentExam.answerSheet?.responses || [];
};

// Get results for all exams
export const getStudentResults = async (studentId: string) => {
  const results = await prisma.result.findMany({
    where: {
      studentExam: {
        studentId,
      },
    },
    include: {
      studentExam: {
        include: {
          exam: {
            include: {
              subject: true,
              owner: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  logger.info(`Retrieved results for student ${studentId}`);
  return results;
};

// Get result for specific exam
export const getExamResult = async (examId: string, studentId: string) => {
  const result = await prisma.result.findFirst({
    where: {
      studentExam: {
        examId,
        studentId,
      },
    },
    include: {
      studentExam: {
        include: {
          exam: {
            include: {
              subject: true,
              owner: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new NotFoundError("Result not found");
  }

  logger.info(`Retrieved result for student ${studentId}, exam ${examId}`);
  return result;
};

// View submitted answer sheet
export const getAnswerSheet = async (examId: string, studentId: string) => {
  const answerSheet = await prisma.answerSheet.findFirst({
    where: {
      studentExam: {
        examId,
        studentId,
      },
    },
    include: {
      responses: {
        include: {
          question: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!answerSheet) {
    throw new NotFoundError("Answer sheet not found");
  }

  logger.info(
    `Retrieved answer sheet for student ${studentId}, exam ${examId}`
  );
  return answerSheet;
};

// Log cheating event
export const logCheatEvent = async (
  examId: string,
  studentId: string,
  eventType: CheatingEventType
) => {
  // Validate event type
  if (
    !Object.values(CheatingEventType).includes(eventType as CheatingEventType)
  ) {
    throw new BadRequestError(
      `Invalid event type. Valid types: ${Object.values(CheatingEventType).join(
        ", "
      )}`
    );
  }

  // Get student exam with cheat logs
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
      status: "IN_PROGRESS",
    },
    include: {
      cheatingLogs: true,
    },
  });

  if (!studentExam) {
    throw new NotFoundError("Active exam not found");
  }

  // Create the cheat log
  const log = await prisma.antiCheatingLog.create({
    data: {
      studentExamId: studentExam.id,
      eventType,
    },
  });

  // Get total violations for this exam
  const totalViolations = studentExam.cheatingLogs.length + 1;

  // Check if we should auto-submit based on violations
  if (totalViolations >= 3) {
    // Auto-submit the exam
    const now = new Date();
    const timeTaken = Math.floor(
      (now.getTime() - studentExam.startTime!.getTime()) / 1000
    );

    // Create answer sheet with current responses
    const answerSheet = await prisma.answerSheet.create({
      data: {
        studentExamId: studentExam.id,
        responses: {
          create: [], // Empty responses for auto-submission
        },
      },
    });

    // Create result with 0 marks
    await prisma.result.create({
      data: {
        studentExamId: studentExam.id,
        marks: 0,
        timeTaken,
        status: "FAIL",
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

    logger.warn(
      `Student ${studentId} was auto-submitted from exam ${examId} ` +
        `due to ${totalViolations} anti-cheating violations`
    );

    return {
      log,
      autoSubmitted: true,
      message: "Exam auto-submitted due to multiple anti-cheating violations",
    };
  }

  logger.info(
    `Logged cheating event for student ${studentId}, exam ${examId}: ${eventType} ` +
      `(violation ${totalViolations}/3)`
  );

  return {
    log,
    violations: totalViolations,
    remainingViolations: 3 - totalViolations,
  };
};

// Get upcoming exams for student
export const getUpcomingExams = async (studentId: string) => {
  const now = new Date();

  // Find exams that haven't started yet or are currently available
  const upcomingExams = await prisma.studentExam.findMany({
    where: {
      studentId,
      status: "NOT_STARTED",
      exam: {
        endDate: {
          gt: now,
        },
      },
    },
    include: {
      exam: {
        include: {
          subject: true,
          owner: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      exam: {
        startDate: "asc",
      },
    },
  });

  // Group exams by status (upcoming, available now)
  const availableNow = [];
  const upcoming = [];

  for (const studentExam of upcomingExams) {
    if (now >= studentExam.exam.startDate && now <= studentExam.exam.endDate) {
      availableNow.push(studentExam);
    } else {
      upcoming.push(studentExam);
    }
  }

  logger.info(
    `Retrieved ${upcomingExams.length} upcoming exams for student ${studentId}`
  );
  return {
    availableNow,
    upcoming,
    today: new Date().toISOString().split("T")[0],
  };
};

// Check if student is banned from an exam
export const checkBanStatus = async (examId: string, studentId: string) => {
  // First check if the exam exists and student is assigned to it
  const studentExam = await prisma.studentExam.findFirst({
    where: {
      examId,
      studentId,
    },
    include: {
      exam: {
        include: {
          subject: true,
        },
      },
    },
  });

  // Check if student has BANNED status
  if (studentExam && studentExam.status === ExamStatus.BANNED) {
    logger.info(`Student ${studentId} is banned from exam ${examId}`);
    return {
      isBanned: true,
      message: "You are banned from taking this exam",
      examName: studentExam?.exam.name || "Unknown exam",
      subjectName: studentExam?.exam.subject?.name || "Unknown subject",
    };
  }

  // If no assignment exists, check if the student has access to the subject
  if (!studentExam) {
    const hasSubjectAccess = await prisma.studentsOnSubjects.findFirst({
      where: {
        studentId,
        subjectId: {
          equals: (
            await prisma.exam.findUnique({ where: { id: examId } })
          )?.subjectId,
        },
      },
    });

    if (!hasSubjectAccess) {
      return {
        isBanned: false,
        isAssigned: false,
        hasAccess: false,
        message: "You are not enrolled in the subject for this exam",
      };
    }

    return {
      isBanned: false,
      isAssigned: false,
      hasAccess: true,
      message:
        "You are not assigned to this exam, but have access to the subject",
    };
  }

  return {
    isBanned: false,
    isAssigned: true,
    status: studentExam.status,
    examName: studentExam.exam.name,
    subjectName: studentExam.exam.subject?.name || "Unknown subject",
  };
};

// Get reminders for upcoming exams
export const getExamReminders = async (studentId: string) => {
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  // Find exams starting within the next 3 days
  const upcomingExams = await prisma.exam.findMany({
    where: {
      startDate: {
        gt: now,
        lt: threeDaysLater,
      },
      isActive: true,
      studentExams: {
        some: {
          studentId,
          status: ExamStatus.NOT_STARTED,
        },
        none: {
          studentId,
          status: ExamStatus.BANNED
        }
      }
    },
    include: {
      subject: true,
      owner: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      studentExams: {
        where: {
          studentId,
          status: ExamStatus.NOT_STARTED,
        },
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });

  // Format reminders
  const reminders = upcomingExams.map((exam: any) => {
    const startTime = new Date(exam.startDate);
    const hoursUntilStart = Math.round(
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    return {
      examId: exam.id,
      examName: exam.name,
      subjectName: exam.subject.name,
      teacherName: `${exam.owner.user.firstName} ${exam.owner.user.lastName}`,
      startTime: exam.startDate,
      endTime: exam.endDate,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      timeUntilStart: {
        hours: hoursUntilStart,
        days: Math.floor(hoursUntilStart / 24),
      },
      message: `Your exam "${exam.name}" for ${exam.subject.name} starts in ${hoursUntilStart} hours.`,
    };
  });

  logger.info(
    `Retrieved ${reminders.length} exam reminders for student ${studentId}`
  );
  return {
    reminders,
    todayDate: now.toISOString().split("T")[0],
  };
};

// Helper function to get student exam status text
export const getStudentExamStatusText = (studentExam: any): string => {
  if (!studentExam) return 'Unknown';
  
  // Return appropriate text based on status
  switch(studentExam.status) {
    case ExamStatus.NOT_STARTED:
      return 'Not Started';
    case ExamStatus.IN_PROGRESS:
      return 'In Progress';
    case ExamStatus.COMPLETED:
      return 'Completed';
    case ExamStatus.BANNED:
      return 'Banned';
    default:
      return 'Unknown';
  }
};
