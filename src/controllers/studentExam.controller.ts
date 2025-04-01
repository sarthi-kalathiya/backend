import { Request, Response } from "express";
import prisma from "../utils/prismaClient";
import { logger } from "../utils/logger";
import { CheatingEventType } from "../constants/exam";
import { Question } from "../models/exam.model";

// Get all exams for student (with filters for assigned/completed)
export const getStudentExams = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.student?.id;
    const { status } = req.query;

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
                user: true,
              },
            },
          },
        },
      },
    });

    logger.info(
      `Retrieved ${studentExams.length} exams for student ${studentId}`
    );
    res.json(studentExams);
  } catch (error) {
    logger.error("Error getting student exams:", error);
    res.status(500).json({ error: "Failed to get student exams" });
  }
};

// Get exam details
export const getExamDetails = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentExam) {
      return res
        .status(404)
        .json({ error: "Exam not found or not assigned to student" });
    }

    logger.info(
      `Retrieved exam details for student ${studentId}, exam ${examId}`
    );
    res.json(studentExam);
  } catch (error) {
    logger.error("Error getting exam details:", error);
    res.status(500).json({ error: "Failed to get exam details" });
  }
};

// Start an exam
export const startExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
      return res
        .status(404)
        .json({ error: "Exam not found or not assigned to student" });
    }

    // Check if student is banned from this exam
    const isBanned = await prisma.exam.findFirst({
      where: {
        id: examId,
        bannedStudents: {
          some: {
            id: studentId,
          },
        },
      },
    });

    if (isBanned) {
      return res
        .status(403)
        .json({ error: "You are banned from taking this exam" });
    }

    // Check if exam has already been started or completed
    if (studentExam.status !== "NOT_STARTED") {
      return res.status(400).json({
        error: "Exam already started or completed",
        status: studentExam.status,
      });
    }

    // Check if exam is active
    if (!studentExam.exam.isActive) {
      return res.status(400).json({ error: "Exam is not active" });
    }

    // Check if exam has started (based on startDate)
    const now = new Date();
    if (now < studentExam.exam.startDate) {
      return res.status(400).json({
        error: "Exam has not started yet",
        startDate: studentExam.exam.startDate,
      });
    }

    // Check if exam has ended (based on endDate)
    if (now > studentExam.exam.endDate) {
      return res.status(400).json({
        error: "Exam has ended",
        endDate: studentExam.exam.endDate,
      });
    }

    // Calculate exam end time based on duration
    const endTime = new Date(
      now.getTime() + studentExam.exam.duration * 60 * 1000
    );

    // Update student exam status to IN_PROGRESS
    const updatedStudentExam = await prisma.studentExam.update({
      where: { id: studentExam.id },
      data: {
        status: "IN_PROGRESS",
        startTime: now,
        endTime,
      },
    });

    // Log the start of exam with anti-cheating monitoring
    logger.info(
      `Student ${studentId} started exam ${examId} at ${now.toISOString()}`
    );

    // Return exam details with anti-cheating configuration
    res.json({
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
    });
  } catch (error) {
    logger.error("Error starting exam:", error);
    res.status(500).json({ error: "Failed to start exam" });
  }
};

// Submit an exam
export const submitExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    const { responses } = req.body;

    // Validate responses array
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        error: "Invalid submission format",
        message: "Responses must be a non-empty array of question answers",
        required: {
          responses: "Array of { questionId: string, optionId: string }",
        },
      });
    }

    // Validate each response has required fields
    const invalidResponses = responses.filter(
      (r: any) => !r || typeof r !== "object" || !r.questionId || !r.optionId
    );

    if (invalidResponses.length > 0) {
      return res.status(400).json({
        error: "Invalid response format",
        message: "Each response must have questionId and optionId fields",
        invalidResponses: invalidResponses.length,
      });
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
      return res
        .status(404)
        .json({ error: "Exam not found or not assigned to student" });
    }

    if (studentExam.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Exam not in progress" });
    }

    const now = new Date();

    // Check if exam is being submitted after the allowed end time
    if (studentExam.endTime && now > studentExam.endTime) {
      // Allow submission but mark it as auto-submitted
      logger.warn(
        `Student ${studentId} submitted exam ${examId} after time limit`
      );
    }

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
        status:
          obtainedMarks >= studentExam.exam.passingMarks ? "PASS" : "FAIL",
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
        autoSubmitted: studentExam.endTime && now > studentExam.endTime,
      },
    });

    logger.info(
      `Student ${studentId} (${studentExam.student.user.name}) submitted exam ${examId} with marks ${obtainedMarks}/${studentExam.exam.totalMarks}`
    );
    res.json({
      exam: updatedExam,
      result: {
        ...result,
        totalMarks: studentExam.exam.totalMarks,
      },
      answerSheet,
      unansweredQuestions:
        unansweredQuestions.length > 0 ? unansweredQuestions : undefined,
    });
  } catch (error) {
    logger.error("Error submitting exam:", error);
    res.status(500).json({ error: "Failed to submit exam" });
  }
};

// Get questions for active exam
export const getExamQuestions = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
            },
          },
        },
      },
    });

    if (!studentExam) {
      return res.status(404).json({ error: "Active exam not found" });
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

    // SECURITY NOTE: The original questions with correctOptionId are safely stored in the database
    // When the student submits the exam in the submitExam function, we validate against
    // the actual correctOptionId values stored in the database, not what we send to the client.

    logger.info(`Retrieved questions for student ${studentId}, exam ${examId}`);
    res.json(secureQuestions);
  } catch (error) {
    logger.error("Error getting exam questions:", error);
    res.status(500).json({ error: "Failed to get exam questions" });
  }
};

// Save responses during exam
export const saveResponses = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    const { responses } = req.body;

    // Validate responses array
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({
        error: "Invalid request format",
        message: "Responses must be an array of question answers",
        required: {
          responses: "Array of { questionId: string, optionId: string }",
        },
      });
    }

    // Allow empty array for saving (student might clear all responses)
    // But validate individual responses if they exist
    if (responses.length > 0) {
      const invalidResponses = responses.filter(
        (r: any) => !r || typeof r !== "object" || !r.questionId || !r.optionId
      );

      if (invalidResponses.length > 0) {
        return res.status(400).json({
          error: "Invalid response format",
          message: "Each response must have questionId and optionId fields",
          invalidResponses: invalidResponses.length,
        });
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
      return res.status(404).json({ error: "Active exam not found" });
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
    res.json(answerSheet);
  } catch (error) {
    logger.error("Error saving responses:", error);
    res.status(500).json({ error: "Failed to save responses" });
  }
};

// Get saved responses for current exam
export const getSavedResponses = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
      return res.status(404).json({ error: "Active exam not found" });
    }

    logger.info(
      `Retrieved saved responses for student ${studentId}, exam ${examId}`
    );
    res.json(studentExam.answerSheet?.responses || []);
  } catch (error) {
    logger.error("Error getting saved responses:", error);
    res.status(500).json({ error: "Failed to get saved responses" });
  }
};

// Get results for all exams
export const getStudentResults = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.student?.id;

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
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Retrieved results for student ${studentId}`);
    res.json(results);
  } catch (error) {
    logger.error("Error getting student results:", error);
    res.status(500).json({ error: "Failed to get student results" });
  }
};

// Get result for specific exam
export const getExamResult = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    logger.info(`Retrieved result for student ${studentId}, exam ${examId}`);
    res.json(result);
  } catch (error) {
    logger.error("Error getting exam result:", error);
    res.status(500).json({ error: "Failed to get exam result" });
  }
};

// View submitted answer sheet
export const getAnswerSheet = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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
      return res.status(404).json({ error: "Answer sheet not found" });
    }

    logger.info(
      `Retrieved answer sheet for student ${studentId}, exam ${examId}`
    );
    res.json(answerSheet);
  } catch (error) {
    logger.error("Error getting answer sheet:", error);
    res.status(500).json({ error: "Failed to get answer sheet" });
  }
};

// Log cheating event
export const logCheatEvent = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    const { eventType } = req.body;

    // Validate event type
    if (!Object.values(CheatingEventType).includes(eventType)) {
      return res.status(400).json({
        error: "Invalid event type",
        validTypes: Object.values(CheatingEventType),
      });
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
      return res.status(404).json({ error: "Active exam not found" });
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

      return res.json({
        log,
        autoSubmitted: true,
        message: "Exam auto-submitted due to multiple anti-cheating violations",
      });
    }

    logger.info(
      `Logged cheating event for student ${studentId}, exam ${examId}: ${eventType} ` +
        `(violation ${totalViolations}/3)`
    );

    res.json({
      log,
      violations: totalViolations,
      remainingViolations: 3 - totalViolations,
    });
  } catch (error) {
    logger.error("Error logging cheat event:", error);
    res.status(500).json({ error: "Failed to log cheat event" });
  }
};

// Get upcoming exams for student
export const getUpcomingExams = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.student?.id;
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
                    name: true,
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
      if (
        now >= studentExam.exam.startDate &&
        now <= studentExam.exam.endDate
      ) {
        availableNow.push(studentExam);
      } else {
        upcoming.push(studentExam);
      }
    }

    logger.info(
      `Retrieved ${upcomingExams.length} upcoming exams for student ${studentId}`
    );
    res.json({
      availableNow,
      upcoming,
      today: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("Error getting upcoming exams:", error);
    res.status(500).json({ error: "Failed to get upcoming exams" });
  }
};

// Check if student is banned from an exam
export const checkBanStatus = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;

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

    // Check if student is banned from this exam
    const isBanned = await prisma.exam.findFirst({
      where: {
        id: examId,
        bannedStudents: {
          some: {
            id: studentId,
          },
        },
      },
    });

    if (isBanned) {
      logger.info(`Student ${studentId} is banned from exam ${examId}`);
      return res.json({
        isBanned: true,
        message: "You are banned from taking this exam",
        examName: studentExam?.exam.name || "Unknown exam",
        subjectName: studentExam?.exam.subject?.name || "Unknown subject",
      });
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
        return res.json({
          isBanned: false,
          isAssigned: false,
          hasAccess: false,
          message: "You are not enrolled in the subject for this exam",
        });
      }

      return res.json({
        isBanned: false,
        isAssigned: false,
        hasAccess: true,
        message:
          "You are not assigned to this exam, but have access to the subject",
      });
    }

    return res.json({
      isBanned: false,
      isAssigned: true,
      status: studentExam.status,
      examName: studentExam.exam.name,
      subjectName: studentExam.exam.subject?.name || "Unknown subject",
    });
  } catch (error) {
    logger.error("Error checking ban status:", error);
    res.status(500).json({ error: "Failed to check ban status" });
  }
};

// Get reminders for upcoming exams
export const getExamReminders = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.student?.id;
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
            status: "NOT_STARTED",
          },
        },
        // Ensure student is not banned
        bannedStudents: {
          none: {
            id: studentId,
          },
        },
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
            studentId,
            status: "NOT_STARTED",
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
        teacherName: exam.owner.user.name,
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
    res.json({
      reminders,
      todayDate: now.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("Error getting exam reminders:", error);
    res.status(500).json({ error: "Failed to get exam reminders" });
  }
};
