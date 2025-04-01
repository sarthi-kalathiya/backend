import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

// Assign exam to students
export const assignExamToStudents = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { studentIds } = req.body;
    const teacherId = req.user?.teacher?.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "No student IDs provided" });
    }

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
      include: {
        bannedStudents: true,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Check if the exam is valid (question count and total marks match)
    if (
      exam.currentQuestionCount !== exam.numQuestions ||
      exam.currentTotalMarks !== exam.totalMarks
    ) {
      return res.status(400).json({
        error: "Exam configuration is incomplete",
        details: {
          questions: {
            required: exam.numQuestions,
            current: exam.currentQuestionCount,
            isComplete: exam.currentQuestionCount === exam.numQuestions,
          },
          totalMarks: {
            required: exam.totalMarks,
            current: exam.currentTotalMarks,
            isComplete: exam.currentTotalMarks === exam.totalMarks,
          },
        },
        message:
          "The exam cannot be assigned to students until it has the correct number of questions and total marks.",
      });
    }

    // Check if any students are banned
    const bannedStudentIds = exam.bannedStudents.map(
      (student: { id: string }) => student.id
    );
    const attemptedBannedStudents = studentIds.filter((id: string) =>
      bannedStudentIds.includes(id)
    );

    if (attemptedBannedStudents.length > 0) {
      // Fetch details of banned students for better error information
      const bannedStudents = await prisma.student.findMany({
        where: {
          id: {
            in: attemptedBannedStudents,
          },
        },
        include: {
          user: true,
        },
      });

      const bannedStudentInfo = bannedStudents.map(
        (student: { id: string; user: { name: string; email: string } }) => ({
          id: student.id,
          name: student.user.name,
          email: student.user.email,
        })
      );

      return res.status(400).json({
        error: "Cannot assign exam to banned students",
        bannedStudents: bannedStudentInfo,
      });
    }

    // Get students enrolled in the exam's subject
    const enrolledStudents = await prisma.studentsOnSubjects.findMany({
      where: {
        subjectId: exam.subjectId,
        studentId: {
          in: studentIds,
        },
      },
    });

    const validStudentIds = enrolledStudents.map(
      (es: { studentId: string }) => es.studentId
    );
    const invalidStudentIds = studentIds.filter(
      (id: string) => !validStudentIds.includes(id)
    );

    if (invalidStudentIds.length > 0) {
      return res.status(400).json({
        error: "Some students are not enrolled in this subject",
        invalidStudentIds,
      });
    }

    // Check if any students are already assigned to this exam
    const existingAssignments = await prisma.studentExam.findMany({
      where: {
        examId,
        studentId: {
          in: validStudentIds,
        },
      },
    });

    const alreadyAssignedStudentIds = existingAssignments.map(
      (ea: { studentId: string }) => ea.studentId
    );
    const newStudentIds = validStudentIds.filter(
      (id: string) => !alreadyAssignedStudentIds.includes(id)
    );

    if (newStudentIds.length === 0) {
      return res.status(400).json({
        error: "All valid students are already assigned to this exam",
        alreadyAssignedStudentIds,
      });
    }

    // Create student exam assignments
    const assignments = await Promise.all(
      newStudentIds.map((studentId: string) =>
        prisma.studentExam.create({
          data: {
            studentId,
            examId,
            status: "NOT_STARTED",
          },
        })
      )
    );

    logger.info(`Assigned exam ${examId} to ${assignments.length} students`);
    res.json({
      message: `Assigned exam to ${assignments.length} students`,
      assignments,
      alreadyAssignedStudents:
        alreadyAssignedStudentIds.length > 0
          ? alreadyAssignedStudentIds
          : undefined,
    });
  } catch (error) {
    logger.error("Error assigning exam to students:", error);
    res.status(500).json({ error: "Failed to assign exam to students" });
  }
};

// Get students assigned to an exam with status
export const getAssignedStudents = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    const studentExams = await prisma.studentExam.findMany({
      where: { examId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    logger.info(
      `Retrieved ${studentExams.length} students assigned to exam ${examId}`
    );
    res.json(studentExams);
  } catch (error) {
    logger.error("Error getting assigned students:", error);
    res.status(500).json({ error: "Failed to get assigned students" });
  }
};

// Ban/unban student from exam
export const toggleStudentBan = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    // Check if student is banned
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
      // Unban student
      await prisma.exam.update({
        where: { id: examId },
        data: {
          bannedStudents: {
            disconnect: { id: studentId },
          },
        },
      });
      logger.info(`Unbanned student ${studentId} from exam ${examId}`);
      res.json({ message: "Student unbanned successfully" });
    } else {
      // Find existing exam assignment
      const existingAssignment = await prisma.studentExam.findFirst({
        where: {
          examId,
          studentId,
        },
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      });

      // Ban student
      await prisma.exam.update({
        where: { id: examId },
        data: {
          bannedStudents: {
            connect: { id: studentId },
          },
        },
      });

      // If student is already assigned to this exam, remove the assignment
      if (existingAssignment) {
        // We can only delete the assignment if the exam hasn't been started or completed
        if (existingAssignment.status === "NOT_STARTED") {
          await prisma.studentExam.delete({
            where: { id: existingAssignment.id },
          });
          logger.info(
            `Banned student ${studentId} (${existingAssignment.student.user.name}) from exam ${examId} and removed assignment`
          );
          res.json({
            message: "Student banned successfully and exam assignment removed",
            removedAssignment: true,
          });
        } else {
          // If the exam is already in progress or completed, we can't delete it
          // but we mark it as being banned
          logger.warn(
            `Banned student ${studentId} from exam ${examId}, but could not remove assignment because status is ${existingAssignment.status}`
          );
          res.json({
            message:
              "Student banned successfully, but existing exam assignment could not be removed due to its status",
            removedAssignment: false,
            reason: `Exam is in "${existingAssignment.status}" status`,
          });
        }
      } else {
        logger.info(`Banned student ${studentId} from exam ${examId}`);
        res.json({
          message: "Student banned successfully",
          removedAssignment: false,
        });
      }
    }
  } catch (error) {
    logger.error("Error toggling student ban:", error);
    res.status(500).json({ error: "Failed to toggle student ban" });
  }
};

// Get all results for an exam
export const getExamResults = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    const results = await prisma.result.findMany({
      where: {
        studentExam: {
          examId,
        },
      },
      include: {
        studentExam: {
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

    logger.info(`Retrieved ${results.length} results for exam ${examId}`);
    res.json({
      results,
      totalMarks: exam.totalMarks,
    });
  } catch (error) {
    logger.error("Error getting exam results:", error);
    res.status(500).json({ error: "Failed to get exam results" });
  }
};

// Get specific student's result for an exam
export const getStudentResult = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

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
            student: {
              include: {
                user: true,
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
    res.json({
      ...result,
      totalMarks: exam.totalMarks,
    });
  } catch (error) {
    logger.error("Error getting student result:", error);
    res.status(500).json({ error: "Failed to get student result" });
  }
};

// Get student's answer sheet
export const getStudentAnswerSheet = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

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
    logger.error("Error getting student answer sheet:", error);
    res.status(500).json({ error: "Failed to get student answer sheet" });
  }
};

// Get cheating logs for a student
export const getStudentCheatLogs = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    const cheatLogs = await prisma.antiCheatingLog.findMany({
      where: {
        studentExam: {
          examId,
          studentId,
        },
      },
      orderBy: {
        eventTime: "desc",
      },
    });

    logger.info(
      `Retrieved ${cheatLogs.length} cheat logs for student ${studentId}, exam ${examId}`
    );
    res.json(cheatLogs);
  } catch (error) {
    logger.error("Error getting student cheat logs:", error);
    res.status(500).json({ error: "Failed to get student cheat logs" });
  }
};

// Get banned students for an exam
export const getBannedStudents = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher?.id;

    // Verify teacher owns the exam
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
      include: {
        bannedStudents: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or unauthorized" });
    }

    logger.info(
      `Retrieved ${exam.bannedStudents.length} banned students for exam ${examId}`
    );
    res.json(exam.bannedStudents);
  } catch (error) {
    logger.error("Error getting banned students:", error);
    res.status(500).json({ error: "Failed to get banned students" });
  }
};
