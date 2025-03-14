import prisma from '../utils/prismaClient';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { ExamStatus } from '../constants/exam';
import { CreateQuestionDto, UpdateQuestionDto, StudentExam } from '../models/exam.model';
import { PrismaClient } from '@prisma/client';

// Teacher exam operations
export const getTeacherExams = async (teacherId: string) => {
  const exams = await prisma.exam.findMany({
    where: {
      ownerId: teacherId
    },
    include: {
      subject: true,
      _count: {
        select: {
          questions: true,
          studentExams: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return exams;
};

export const getExamById = async (examId: string, teacherId?: string) => {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId
    },
    include: {
      subject: true,
      owner: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      questions: {
        include: {
          options: true
        },
        orderBy: {
          id: 'asc'
        }
      },
      _count: {
        select: {
          studentExams: true,
          bannedStudents: true
        }
      }
    }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  // Check if the teacher is the owner of the exam
  if (teacherId && exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to view this exam');
  }

  return exam;
};

export const createExam = async (teacherId: string, examData: any) => {
  const {
    name,
    subjectId,
    numQuestions,
    passingMarks,
    duration,
    startDate,
    endDate
  } = examData;

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new BadRequestError('Subject not found');
  }

  // Verify teacher teaches this subject
  const teacherSubject = await prisma.teachersOnSubjects.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId
      }
    }
  });

  if (!teacherSubject) {
    throw new BadRequestError('You do not teach this subject');
  }

  // Create exam
  const exam = await prisma.exam.create({
    data: {
      name,
      subjectId,
      ownerId: teacherId,
      numQuestions: Number(numQuestions),
      passingMarks: Number(passingMarks),
      duration: Number(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    },
    include: {
      subject: true
    }
  });

  return exam;
};

export const updateExam = async (examId: string, teacherId: string, examData: any) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      studentExams: true
    }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to update this exam');
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se: StudentExam) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError('Cannot update exam that has already been taken');
  }

  const {
    name,
    numQuestions,
    passingMarks,
    duration,
    startDate,
    endDate
  } = examData;

  // Update exam
  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      name,
      numQuestions: Number(numQuestions),
      passingMarks: Number(passingMarks),
      duration: Number(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    },
    include: {
      subject: true
    }
  });

  return updatedExam;
};

export const updateExamStatus = async (examId: string, teacherId: string, isActive: boolean) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to update this exam');
  }

  // Update exam status
  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: { isActive }
  });

  return updatedExam;
};

// Question management
export const getExamQuestions = async (examId: string, teacherId: string) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to view this exam');
  }

  // Get questions
  const questions = await prisma.question.findMany({
    where: { examId },
    include: {
      options: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  return questions;
};

export const addQuestion = async (examId: string, teacherId: string, questionData: CreateQuestionDto) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: true,
      studentExams: true
    }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to modify this exam');
  }

  // // Check if exam has already been taken by any student
  // if (exam.studentExams.some((se: StudentExam) => se.status === ExamStatus.COMPLETED)) {
  //   throw new BadRequestError('Cannot modify exam that has already been taken');
  // }

  // Check if we're exceeding the number of questions
  if (exam.questions.length >= exam.numQuestions) {
    throw new BadRequestError(`Cannot add more than ${exam.numQuestions} questions to this exam`);
  }

  const {
    questionText,
    hasImage,
    images,
    marks,
    negativeMarks,
    options
  } = questionData;

  // Validate that options exist and have a correct option
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new BadRequestError('Please provide at least 2 options');
  }

  const correctOptionIndex = options.findIndex(opt => opt.isCorrect);
  if (correctOptionIndex === -1) {
    throw new BadRequestError('Please mark one option as correct');
  }

  // Validate images if hasImage is true
  if (hasImage === true && (!images || !Array.isArray(images) || images.length === 0)) {
    throw new BadRequestError('Images array cannot be empty when hasImage is true');
  }

  // Create question with options in a transaction
  const result = await prisma.$transaction(async (tx: PrismaClient) => {
    // Create the question first
    const question = await tx.question.create({
      data: {
        examId,
        questionText,
        hasImage: !!hasImage,
        images: hasImage ? images : [],
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
        // Create a temporary correctOptionId until we create the options
        correctOptionId: 'temp' 
      }
    });

    // Create options
    const createdOptions = await Promise.all(
      options.map(opt => 
        tx.option.create({
          data: {
            questionId: question.id,
            optionText: opt.text
          }
        })
      )
    );

    // Update question with correct option ID
    const correctOption = createdOptions[correctOptionIndex];
    const updatedQuestion = await tx.question.update({
      where: { id: question.id },
      data: { correctOptionId: correctOption.id },
      include: { options: true }
    });

    return updatedQuestion;
  });

  return result;
};

export const updateQuestion = async (
  examId: string,
  questionId: string, 
  teacherId: string, 
  questionData: UpdateQuestionDto
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      studentExams: true
    }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to modify this exam');
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se: StudentExam) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError('Cannot modify exam that has already been taken');
  }

  // Verify question exists and belongs to this exam
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true }
  });

  if (!question) {
    throw new NotFoundError('Question not found');
  }

  if (question.examId !== examId) {
    throw new BadRequestError('Question does not belong to this exam');
  }

  const {
    questionText,
    hasImage,
    images,
    marks,
    negativeMarks,
    options
  } = questionData;

  // Validate that options exist and have a correct option
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new BadRequestError('Please provide at least 2 options');
  }

  // Identify correct option
  const correctOptionIndex = options.findIndex(opt => opt.isCorrect);
  if (correctOptionIndex === -1) {
    throw new BadRequestError('Please mark one option as correct');
  }

  // Validate images if hasImage is true
  if (hasImage === true && (!images || !Array.isArray(images) || images.length === 0)) {
    throw new BadRequestError('Images array cannot be empty when hasImage is true');
  }

  // Update question with options in a transaction
  const result = await prisma.$transaction(async (tx: PrismaClient) => {
    // Delete existing options
    await tx.option.deleteMany({
      where: { questionId }
    });

    // Create new options
    const createdOptions = await Promise.all(
      options.map(opt => 
        tx.option.create({
          data: {
            questionId,
            optionText: opt.text
          }
        })
      )
    );

    // Update question with correct option ID and other fields
    const correctOption = createdOptions[correctOptionIndex];
    const updatedQuestion = await tx.question.update({
      where: { id: questionId },
      data: {
        questionText,
        hasImage: !!hasImage,
        images: hasImage ? images : [],
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
        correctOptionId: correctOption.id
      },
      include: { options: true }
    });

    return updatedQuestion;
  });

  return result;
};

export const deactivateQuestion = async (examId: string, questionId: string, teacherId: string) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId }
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  if (exam.ownerId !== teacherId) {
    throw new ForbiddenError('You do not have permission to modify this exam');
  }

  // Verify question exists and belongs to this exam
  const question = await prisma.question.findUnique({
    where: { id: questionId }
  });

  if (!question) {
    throw new NotFoundError('Question not found');
  }

  if (question.examId !== examId) {
    throw new BadRequestError('Question does not belong to this exam');
  }

  // In our schema, we don't have isActive for questions, so we'll just delete it
  // This could be changed to use a soft delete pattern with isActive if needed
  await prisma.option.deleteMany({
    where: { questionId }
  });

  await prisma.question.delete({
    where: { id: questionId }
  });

  return { success: true };
}; 