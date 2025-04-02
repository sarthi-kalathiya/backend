import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

// Assign exam to students
export const assignExamToStudents = async (
  examId: string,
  studentIds: string[],
  teacherId: string
) => {
  if (studentIds.length === 0) {
    throw new Error("No student IDs provided");
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
    throw new Error("Exam not found or unauthorized");
  }

  // Check if the exam is valid (question count and total marks match)
  if (
    exam.currentQuestionCount !== exam.numQuestions ||
    exam.currentTotalMarks !== exam.totalMarks
  ) {
    throw new Error("Exam configuration is incomplete");
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

    throw new Error("Cannot assign exam to banned students");
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
    throw new Error("Some students are not enrolled in this subject");
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
    throw new Error("All valid students are already assigned to this exam");
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
  return {
    assignments,
    alreadyAssignedStudents:
      alreadyAssignedStudentIds.length > 0
        ? alreadyAssignedStudentIds
        : undefined,
  };
};

// Get students assigned to an exam with status
export const getAssignedStudents = async (
  examId: string,
  teacherId: string
) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
  return studentExams;
};

// Ban/unban student from exam
export const toggleStudentBan = async (
  examId: string,
  studentId: string,
  teacherId: string
) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
    return { action: "unbanned" };
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
        return { action: "banned", removedAssignment: true };
      } else {
        // If the exam is already in progress or completed, we can't delete it
        // but we mark it as being banned
        logger.warn(
          `Banned student ${studentId} from exam ${examId}, but could not remove assignment because status is ${existingAssignment.status}`
        );
        return {
          action: "banned",
          removedAssignment: false,
          reason: `Exam is in "${existingAssignment.status}" status`,
        };
      }
    } else {
      logger.info(`Banned student ${studentId} from exam ${examId}`);
      return { action: "banned", removedAssignment: false };
    }
  }
};

// Get all results for an exam
export const getExamResults = async (examId: string, teacherId: string) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
  return {
    results,
    totalMarks: exam.totalMarks,
  };
};

// Get specific student's result for an exam
export const getStudentResult = async (
  examId: string,
  studentId: string,
  teacherId: string
) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
    throw new Error("Result not found");
  }

  logger.info(`Retrieved result for student ${studentId}, exam ${examId}`);
  return {
    ...result,
    totalMarks: exam.totalMarks,
  };
};

// Get student's answer sheet
export const getStudentAnswerSheet = async (
  examId: string,
  studentId: string,
  teacherId: string
) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
    throw new Error("Answer sheet not found");
  }

  logger.info(
    `Retrieved answer sheet for student ${studentId}, exam ${examId}`
  );
  return answerSheet;
};

// Get cheating logs for a student
export const getStudentCheatLogs = async (
  examId: string,
  studentId: string,
  teacherId: string
) => {
  // Verify teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ownerId: teacherId,
    },
  });

  if (!exam) {
    throw new Error("Exam not found or unauthorized");
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
  return cheatLogs;
};

// Get banned students for an exam
export const getBannedStudents = async (examId: string, teacherId: string) => {
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
    throw new Error("Exam not found or unauthorized");
  }

  logger.info(
    `Retrieved ${exam.bannedStudents.length} banned students for exam ${examId}`
  );
  return exam.bannedStudents;
};
