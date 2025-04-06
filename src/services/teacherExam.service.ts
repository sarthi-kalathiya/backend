import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { ExamStatus } from "../constants/exam";
import { getStudentExamStatusText } from "../services/studentExam.service";
import {
  AssignExamResponse,
  ToggleBanResponse,
  ExamResultsResponse,
  StudentResultResponse,
  AnswerSheetWithResponses,
  AntiCheatingLog,
  PrismaStudent,
  BannedStudentInfo,
  PrismaStudentExam,
  PrismaResult
} from "../models/teacherExam.model";

const prisma = new PrismaClient();

// Assign exam to students
export const assignExamToStudents = async (
  examId: string,
  studentIds: string[],
  teacherId: string
): Promise<AssignExamResponse> => {
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

  // Check if the exam is active
  if (!exam.isActive) {
    throw new Error("Cannot assign inactive exam to students");
  }

  // Validate that the student IDs exist
  const existingStudents = await prisma.student.findMany({
    where: {
      id: {
        in: studentIds,
      },
    },
    select: {
      id: true,
    },
  });

  const existingStudentIds = existingStudents.map((student) => student.id);
  const nonExistentStudentIds = studentIds.filter(
    (id) => !existingStudentIds.includes(id)
  );

  if (nonExistentStudentIds.length > 0) {
    throw new Error(
      `The following student IDs do not exist: ${nonExistentStudentIds.join(
        ", "
      )}`
    );
  }

  // Check if exam has already been taken by any student
  if (
    exam.currentQuestionCount !== exam.numQuestions ||
    exam.currentTotalMarks !== exam.totalMarks
  ) {
    throw new Error("Exam configuration is incomplete");
  }

  // Check if any students are banned
  const bannedStudentExams = await prisma.studentExam.findMany({
    where: {
      examId,
      studentId: { in: studentIds },
      status: ExamStatus.BANNED,
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (bannedStudentExams.length > 0) {
    // Create info objects for banned students
    const bannedStudentInfo = bannedStudentExams.map((se) => ({
      id: se.student.id,
      firstName: se.student.user.firstName,
      lastName: se.student.user.lastName,
      email: se.student.user.email,
    }));

    throw new Error(`Cannot assign exam to banned students: ${bannedStudentInfo.map(s => s.email).join(', ')}`);
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
      status: { not: ExamStatus.BANNED },
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
): Promise<PrismaStudentExam[]> => {
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
  
  // Add status text to each studentExam
  const enrichedStudentExams = studentExams.map(studentExam => ({
    ...studentExam,
    statusText: getStudentExamStatusText(studentExam)
  }));

  logger.info(
    `Retrieved ${studentExams.length} students assigned to exam ${examId}`
  );
  return enrichedStudentExams;
};

// Ban/unban student from exam
export const toggleStudentBan = async (
  examId: string,
  studentId: string,
  teacherId: string
): Promise<ToggleBanResponse> => {
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

  // Verify the student exists
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} does not exist`);
  }

  // Check if student has an exam assignment with BANNED status
  const studentExam = await prisma.studentExam.findFirst({
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

  // If student has an exam assignment
  if (studentExam) {
    // Check if already banned
    if (studentExam.status === ExamStatus.BANNED) {
      // Unban by setting status back to NOT_STARTED
      await prisma.studentExam.update({
        where: { id: studentExam.id },
        data: { 
          status: ExamStatus.NOT_STARTED 
        },
      });
      
      logger.info(`Unbanned student ${studentId} from exam ${examId}`);
      return { action: "unbanned" };
    } else if (studentExam.status === ExamStatus.NOT_STARTED) {
      // Ban by setting status to BANNED
      await prisma.studentExam.update({
        where: { id: studentExam.id },
        data: { 
          status: ExamStatus.BANNED 
        },
      });
      
      logger.info(`Banned student ${studentId} from exam ${examId}`);
      return { action: "banned", removedAssignment: false };
    } else {
      // Cannot ban students who have already started or completed the exam
      logger.warn(
        `Could not ban student ${studentId} from exam ${examId} because status is ${studentExam.status}`
      );
      return {
        action: "failed",
        reason: `Cannot ban student because exam is in "${studentExam.status}" status`,
      };
    }
  } else {
    // If student doesn't have an exam assignment yet, create one with BANNED status
    await prisma.studentExam.create({
      data: {
        examId,
        studentId,
        status: ExamStatus.BANNED,
      },
    });
    
    logger.info(`Created banned exam assignment for student ${studentId} on exam ${examId}`);
    return { action: "banned", removedAssignment: false };
  }
};

// Get all results for an exam
export const getExamResults = async (
  examId: string,
  teacherId: string
): Promise<ExamResultsResponse> => {
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
): Promise<StudentResultResponse> => {
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

  // Verify the student exists
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} does not exist`);
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
): Promise<AnswerSheetWithResponses> => {
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

  // Verify the student exists
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} does not exist`);
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
  return answerSheet as AnswerSheetWithResponses;
};

// Get cheating logs for a student
export const getStudentCheatLogs = async (
  examId: string,
  studentId: string,
  teacherId: string
): Promise<AntiCheatingLog[]> => {
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

  // Verify the student exists
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} does not exist`);
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
  return cheatLogs as AntiCheatingLog[];
};

// Get banned students for an exam
export const getBannedStudents = async (
  examId: string,
  teacherId: string
): Promise<PrismaStudent[]> => {
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

  // Get students with BANNED status for this exam
  const bannedStudentExams = await prisma.studentExam.findMany({
    where: {
      examId,
      status: ExamStatus.BANNED,
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  // Extract just the student information
  const bannedStudents = bannedStudentExams.map(se => se.student);

  logger.info(
    `Retrieved ${bannedStudents.length} banned students for exam ${examId}`
  );
  
  return bannedStudents as PrismaStudent[];
};
