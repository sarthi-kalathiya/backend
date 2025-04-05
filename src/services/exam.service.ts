import prisma from "../utils/prismaClient";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors";
import { ExamStatus } from "../constants/exam";
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  StudentExam,
} from "../models/exam.model";
import { PrismaClient } from "@prisma/client";

// Teacher exam operations
export const getFilteredTeacherExams = async (
  teacherId: string,
  filters: {
    page?: number | string;
    limit?: number | string;
    searchTerm?: string;
    status?: string;
    subjectId?: string;
  }
): Promise<{ exams: any[]; total: number }> => {
  const { page = 1, limit = 10, searchTerm, status, subjectId } = filters;

  // Convert page and limit to numbers
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const skip = (pageNum - 1) * limitNum;

  // Build base query - only exams owned by this teacher
  const whereCondition: any = {
    ownerId: teacherId,
  };

  // Add subject filter if provided
  if (subjectId) {
    whereCondition.subjectId = subjectId;
  }

  // Add status filter if provided
  if (status) {
    const now = new Date();
    
    switch (status) {
      case 'active':
        whereCondition.isActive = true;
        whereCondition.startDate = { lte: now };
        whereCondition.endDate = { gte: now };
        break;
      case 'draft':
        whereCondition.isActive = false;
        break;
      case 'upcoming':
        whereCondition.isActive = true;
        whereCondition.startDate = { gt: now };
        break;
      case 'completed':
        whereCondition.isActive = true;
        whereCondition.endDate = { lt: now };
        break;
    }
  }

  // Add search filter if provided
  if (searchTerm) {
    whereCondition.OR = [
      {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        subject: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      },
      {
        subject: {
          code: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  // Get total count for pagination
  const totalExams = await prisma.exam.count({
    where: whereCondition,
  });
console.log(whereCondition);
  // Get paginated exams with related data
  const exams = await prisma.exam.findMany({
    where: whereCondition,
    include: {
      subject: true,
      questions: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: limitNum,
  });
console.log(exams);
  // Calculate derived properties for each exam
  const processedExams = exams.map((exam) => {
    const currentQuestionCount = exam.questions.length;
    
    return {
      ...exam,
      currentQuestionCount,
      questions: undefined, // Remove the questions array from the response
    };
  });

  return {
    exams: processedExams,
    total: totalExams,
  };
};

// Get exam by ID
export const getExamById = async (examId: string, teacherId?: string) => {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId,
      ownerId: teacherId,
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
      questions: {
        include: {
          options: true,
        },
        orderBy: {
          id: "asc",
        },
      },
      _count: {
        select: {
          studentExams: true,
          bannedStudents: true,
        },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  return exam;
};

// Create exam
export const createExam = async (teacherId: string, examData: any) => {
  const {
    name,
    subjectId,
    numQuestions,
    passingMarks,
    totalMarks,
    duration,
    startDate,
    endDate,
  } = examData;

  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new BadRequestError("Subject not found");
  }

  // Verify teacher teaches this subject
  const teacherSubject = await prisma.teachersOnSubjects.findUnique({
    where: {
      teacherId_subjectId: {
        teacherId,
        subjectId,
      },
    },
  });

  if (!teacherSubject) {
    throw new BadRequestError("You do not teach this subject");
  }

  // Create exam with aggregates initialized to 0
  const exam = await prisma.exam.create({
    data: {
      name,
      subjectId,
      ownerId: teacherId,
      numQuestions: Number(numQuestions),
      passingMarks: Number(passingMarks),
      totalMarks: Number(totalMarks),
      currentQuestionCount: 0,
      currentTotalMarks: 0,
      duration: Number(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    include: {
      subject: true,
    },
  });

  return exam;
};

// Update exam
export const updateExam = async (
  examId: string,
  teacherId: string,
  examData: any
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
    include: {
      studentExams: true,
      questions: true,
    },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError("Cannot update exam that has already been taken");
  }

  const {
    name,
    numQuestions,
    passingMarks,
    totalMarks,
    duration,
    startDate,
    endDate,
  } = examData;

  // Validate that new values are not less than current values
  if (numQuestions < exam.currentQuestionCount) {
    throw new BadRequestError(
      `Cannot reduce number of questions below current count. ` +
        `Current questions: ${exam.currentQuestionCount}, New value: ${numQuestions}`
    );
  }

  if (totalMarks < exam.currentTotalMarks) {
    throw new BadRequestError(
      `Cannot reduce total marks below current total. ` +
        `Current total: ${exam.currentTotalMarks}, New value: ${totalMarks}`
    );
  }

  // Validate passing marks
  if (passingMarks > totalMarks) {
    throw new BadRequestError(
      `Passing marks (${passingMarks}) cannot be greater than total marks (${totalMarks})`
    );
  }

  // Validate dates
  const newStartDate = new Date(startDate);
  const newEndDate = new Date(endDate);

  if (newStartDate >= newEndDate) {
    throw new BadRequestError("Start date must be before end date");
  }

  // Check if exam has already started
  const now = new Date();
  if (exam.startDate <= now) {
    // If exam has started, only allow updating end date
    if (
      name !== exam.name ||
      numQuestions !== exam.numQuestions ||
      passingMarks !== exam.passingMarks ||
      totalMarks !== exam.totalMarks ||
      duration !== exam.duration
    ) {
      throw new BadRequestError(
        "Cannot update exam parameters after it has started. Only end date can be modified."
      );
    }
  }

  // Update exam
  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      name,
      numQuestions: Number(numQuestions),
      passingMarks: Number(passingMarks),
      totalMarks: Number(totalMarks),
      duration: Number(duration),
      startDate: newStartDate,
      endDate: newEndDate,
    },
    include: {
      subject: true,
      _count: {
        select: {
          questions: true,
          studentExams: true,
        },
      },
    },
  });

  // Add validation status to response
  const validation = await validateExamTotalMarks(examId);

  return {
    ...updatedExam,
    validation: {
      numQuestions: {
        declared: updatedExam.numQuestions,
        actual: updatedExam.currentQuestionCount,
        match: validation.numQuestions.match,
      },
      totalMarks: {
        declared: updatedExam.totalMarks,
        calculated: updatedExam.currentTotalMarks,
        match: validation.totalMarks.match,
      },
      isComplete: validation.isValid,
    },
  };
};

// Update exam status
export const updateExamStatus = async (
  examId: string,
  teacherId: string,
  isActive: boolean
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // If trying to activate the exam, validate it first
  if (isActive) {
    const validation = await validateExamTotalMarks(examId);

    if (!validation.isValid) {
      let errorMessage = "Cannot activate exam: ";

      if (!validation.numQuestions.match) {
        errorMessage += `Number of questions (${validation.numQuestions.actual}) must match the declared number (${validation.numQuestions.declared}). `;
      }

      if (!validation.totalMarks.match) {
        errorMessage += `Total marks (${validation.totalMarks.calculated}) must match the declared total (${validation.totalMarks.declared}).`;
      }

      throw new BadRequestError(errorMessage.trim());
    }
  }

  // Update exam status
  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: { isActive },
  });

  return updatedExam;
};

// Get exam questions
export const getExamQuestions = async (examId: string, teacherId: string) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Get questions
  const questions = await prisma.question.findMany({
    where: { examId },
    include: {
      options: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  return questions;
};

// Calculate and validate total marks for an exam
export const validateExamTotalMarks = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Use the cached aggregates for validation
  const numQuestionsMatch = exam.currentQuestionCount === exam.numQuestions;
  const totalMarksMatch = exam.currentTotalMarks === exam.totalMarks;

  return {
    numQuestions: {
      declared: exam.numQuestions,
      actual: exam.currentQuestionCount,
      match: numQuestionsMatch,
    },
    totalMarks: {
      declared: exam.totalMarks,
      calculated: exam.currentTotalMarks,
      match: totalMarksMatch,
    },
    isValid: numQuestionsMatch && totalMarksMatch,
  };
};

// Add validation to addQuestion and updateQuestion functions
export const addQuestion = async (
  examId: string,
  teacherId: string,
  questionData: CreateQuestionDto
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
    include: {
      studentExams: true,
    },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError("Cannot modify exam that has already been taken");
  }

  // Check if we're exceeding the number of questions using the cached counter
  if (exam.currentQuestionCount >= exam.numQuestions) {
    throw new BadRequestError(
      `Cannot add more than ${exam.numQuestions} questions to this exam. The exam already has ${exam.currentQuestionCount} questions.`
    );
  }

  // Check if adding this question would complete the exam
  const willCompleteExam = exam.currentQuestionCount + 1 === exam.numQuestions;
  const newQuestionMarks = Number(questionData.marks) || 1;
  const remainingMarks = exam.totalMarks - exam.currentTotalMarks;

  // If this question will complete the exam, validate that marks match exactly
  if (willCompleteExam && newQuestionMarks !== remainingMarks) {
    throw new BadRequestError(
      `Cannot add this question. The exam requires exactly ${exam.totalMarks} marks. ` +
        `Current total: ${exam.currentTotalMarks}, New question marks: ${newQuestionMarks}, ` +
        `Remaining marks needed: ${remainingMarks}. ` +
        `Please adjust the marks to match the required total.`
    );
  }

  // For non-completing questions, just check if we're not exceeding the total
  if (!willCompleteExam && newQuestionMarks > remainingMarks) {
    throw new BadRequestError(
      `Adding this question would exceed the declared total marks for the exam. ` +
        `Current total: ${exam.currentTotalMarks}, New question marks: ${newQuestionMarks}, ` +
        `Declared total: ${exam.totalMarks}, Remaining marks available: ${remainingMarks}`
    );
  }

  const { questionText, hasImage, images, marks, negativeMarks, options } =
    questionData;

  // Validate that options exist and have a correct option
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new BadRequestError("Please provide at least 2 options");
  }

  const correctOptionIndex = options.findIndex((opt) => opt.isCorrect);
  if (correctOptionIndex === -1) {
    throw new BadRequestError("Please mark one option as correct");
  }

  // Validate images if hasImage is true
  if (
    hasImage === true &&
    (!images || !Array.isArray(images) || images.length === 0)
  ) {
    throw new BadRequestError(
      "Images array cannot be empty when hasImage is true"
    );
  }

  // Create question with options in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the question first
    const question = await tx.question.create({
      data: {
        examId,
        questionText,
        hasImage: !!hasImage,
        images: hasImage ? images : [],
        marks: newQuestionMarks,
        negativeMarks: Number(negativeMarks) || 0,
        // Create a temporary correctOptionId until we create the options
        correctOptionId: "temp",
      },
    });

    // Create options
    const createdOptions = await Promise.all(
      options.map((opt) =>
        tx.option.create({
          data: {
            questionId: question.id,
            optionText: opt.text,
          },
        })
      )
    );

    // Update question with correct option ID
    const correctOption = createdOptions[correctOptionIndex];
    const updatedQuestion = await tx.question.update({
      where: { id: question.id },
      data: { correctOptionId: correctOption.id },
      include: { options: true },
    });

    // Update exam aggregates
    await tx.exam.update({
      where: { id: examId },
      data: {
        currentQuestionCount: { increment: 1 },
        currentTotalMarks: { increment: newQuestionMarks },
      },
    });

    return updatedQuestion;
  });

  // Get updated exam stats
  const updatedExam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      numQuestions: true,
      totalMarks: true,
      currentQuestionCount: true,
      currentTotalMarks: true,
    },
  });

  // Check if the exam is now valid
  const isValid =
    updatedExam?.currentQuestionCount === updatedExam?.numQuestions &&
    updatedExam?.currentTotalMarks === updatedExam?.totalMarks;

  // Return the result with validation info
  return {
    ...result,
    validation: {
      numQuestions: {
        declared: updatedExam?.numQuestions,
        actual: updatedExam?.currentQuestionCount,
        match: updatedExam?.currentQuestionCount === updatedExam?.numQuestions,
      },
      totalMarks: {
        declared: updatedExam?.totalMarks,
        calculated: updatedExam?.currentTotalMarks,
        match: updatedExam?.currentTotalMarks === updatedExam?.totalMarks,
      },
      isComplete: isValid,
    },
  };
};

// Update question
export const updateQuestion = async (
  examId: string,
  questionId: string,
  teacherId: string,
  questionData: UpdateQuestionDto
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
    include: {
      studentExams: true,
    },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError("Cannot modify exam that has already been taken");
  }

  // Verify question exists and belongs to this exam
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  if (question.examId !== examId) {
    throw new BadRequestError("Question does not belong to this exam");
  }

  const { questionText, hasImage, images, marks, negativeMarks, options } =
    questionData;

  // Validate that options exist and have a correct option
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new BadRequestError("Please provide at least 2 options");
  }

  // Identify correct option
  const correctOptionIndex = options.findIndex((opt) => opt.isCorrect);
  if (correctOptionIndex === -1) {
    throw new BadRequestError("Please mark one option as correct");
  }

  // Validate images if hasImage is true
  if (
    hasImage === true &&
    (!images || !Array.isArray(images) || images.length === 0)
  ) {
    throw new BadRequestError(
      "Images array cannot be empty when hasImage is true"
    );
  }

  // Calculate mark difference for this question update
  const oldMarks = Number(question.marks);
  const newMarks = Number(marks) || 1;
  const marksDifference = newMarks - oldMarks;

  // Check if updating this question would exceed the declared total marks
  if (
    marksDifference > 0 &&
    exam.currentTotalMarks + marksDifference > exam.totalMarks
  ) {
    throw new BadRequestError(
      `Updating this question would exceed the declared total marks for the exam. ` +
        `Current total: ${exam.currentTotalMarks}, Marks change: +${marksDifference}, ` +
        `Declared total: ${exam.totalMarks}, Remaining marks available: ${
          exam.totalMarks - exam.currentTotalMarks
        }`
    );
  }

  // Update question with options in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Delete existing options
    await tx.option.deleteMany({
      where: { questionId },
    });

    // Create new options
    const createdOptions = await Promise.all(
      options.map((opt) =>
        tx.option.create({
          data: {
            questionId,
            optionText: opt.text,
          },
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
        marks: newMarks,
        negativeMarks: Number(negativeMarks) || 0,
        correctOptionId: correctOption.id,
      },
      include: { options: true },
    });

    // Update exam aggregate if marks changed
    if (marksDifference !== 0) {
      await tx.exam.update({
        where: { id: examId },
        data: {
          currentTotalMarks: { increment: marksDifference },
        },
      });
    }

    return updatedQuestion;
  });

  // Get updated exam stats
  const updatedExam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      numQuestions: true,
      totalMarks: true,
      currentQuestionCount: true,
      currentTotalMarks: true,
    },
  });

  // Check if the exam is now valid
  const isValid =
    updatedExam?.currentQuestionCount === updatedExam?.numQuestions &&
    updatedExam?.currentTotalMarks === updatedExam?.totalMarks;

  // Return the result with validation info
  return {
    ...result,
    validation: {
      numQuestions: {
        declared: updatedExam?.numQuestions,
        actual: updatedExam?.currentQuestionCount,
        match: updatedExam?.currentQuestionCount === updatedExam?.numQuestions,
      },
      totalMarks: {
        declared: updatedExam?.totalMarks,
        calculated: updatedExam?.currentTotalMarks,
        match: updatedExam?.currentTotalMarks === updatedExam?.totalMarks,
      },
      isComplete: isValid,
    },
  };
};

// Deactivate question
export const deactivateQuestion = async (
  examId: string,
  questionId: string,
  teacherId: string
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Verify question exists and belongs to this exam
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  if (question.examId !== examId) {
    throw new BadRequestError("Question does not belong to this exam");
  }

  // Get the marks of the question being deleted to update the aggregates
  const questionMarks = Number(question.marks);

  // Delete the question and update aggregates in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete options first
    await tx.option.deleteMany({
      where: { questionId },
    });

    // Delete the question
    await tx.question.delete({
      where: { id: questionId },
    });

    // Update exam aggregates
    await tx.exam.update({
      where: { id: examId },
      data: {
        currentQuestionCount: { decrement: 1 },
        currentTotalMarks: { decrement: questionMarks },
      },
    });
  });

  // Get updated exam stats
  const updatedExam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      numQuestions: true,
      totalMarks: true,
      currentQuestionCount: true,
      currentTotalMarks: true,
    },
  });

  return {
    success: true,
    examStatus: {
      numQuestions: {
        declared: updatedExam?.numQuestions,
        actual: updatedExam?.currentQuestionCount,
        match: updatedExam?.currentQuestionCount === updatedExam?.numQuestions,
      },
      totalMarks: {
        declared: updatedExam?.totalMarks,
        calculated: updatedExam?.currentTotalMarks,
        match: updatedExam?.currentTotalMarks === updatedExam?.totalMarks,
      },
      isComplete:
        updatedExam?.currentQuestionCount === updatedExam?.numQuestions &&
        updatedExam?.currentTotalMarks === updatedExam?.totalMarks,
    },
  };
};

// Add bulk questions to an exam
export const addBulkQuestions = async (
  examId: string,
  teacherId: string,
  questionsData: CreateQuestionDto[]
) => {
  // Verify exam exists and teacher is the owner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, ownerId: teacherId },
    include: {
      questions: true,
      studentExams: true,
    },
  });

  if (!exam) {
    throw new NotFoundError("Exam not found");
  }

  // Check if exam has already been taken by any student
  if (exam.studentExams.some((se) => se.status === ExamStatus.COMPLETED)) {
    throw new BadRequestError("Cannot modify exam that has already been taken");
  }

  // Check if adding these questions would exceed the number of questions
  const remainingQuestionSlots = exam.numQuestions - exam.currentQuestionCount;
  if (questionsData.length > remainingQuestionSlots) {
    throw new BadRequestError(
      `Cannot add ${questionsData.length} questions. The exam already has ${exam.currentQuestionCount} questions ` +
        `and can only accept ${remainingQuestionSlots} more (total limit: ${exam.numQuestions}).`
    );
  }

  // Calculate total marks from the new questions
  let totalNewMarks = 0;
  questionsData.forEach((question) => {
    totalNewMarks += Number(question.marks) || 1;
  });

  // Check if this batch will complete the exam
  const willCompleteExam =
    exam.currentQuestionCount + questionsData.length === exam.numQuestions;
  const remainingMarks = exam.totalMarks - exam.currentTotalMarks;

  // If this batch will complete the exam, validate that marks match exactly
  if (willCompleteExam && totalNewMarks !== remainingMarks) {
    throw new BadRequestError(
      `Cannot add these questions. The exam requires exactly ${exam.totalMarks} marks. ` +
        `Current total: ${exam.currentTotalMarks}, New questions total marks: ${totalNewMarks}, ` +
        `Remaining marks needed: ${remainingMarks}. ` +
        `Please adjust the marks to match the required total.`
    );
  }

  // For non-completing batches, just check if we're not exceeding the total
  if (!willCompleteExam && totalNewMarks > remainingMarks) {
    throw new BadRequestError(
      `Adding these questions would exceed the declared total marks for the exam. ` +
        `Current total: ${exam.currentTotalMarks}, New questions total marks: ${totalNewMarks}, ` +
        `Declared total: ${exam.totalMarks}, Remaining marks available: ${remainingMarks}`
    );
  }

  // Basic validation for all questions
  questionsData.forEach((questionData, index) => {
    // Validate that options exist and have a correct option
    if (
      !questionData.options ||
      !Array.isArray(questionData.options) ||
      questionData.options.length < 2
    ) {
      throw new BadRequestError(
        `Question at index ${index}: Please provide at least 2 options`
      );
    }

    const correctOptionIndex = questionData.options.findIndex(
      (opt) => opt.isCorrect
    );
    if (correctOptionIndex === -1) {
      throw new BadRequestError(
        `Question at index ${index}: Please mark one option as correct`
      );
    }

    // Validate images if hasImage is true
    if (
      questionData.hasImage === true &&
      (!questionData.images ||
        !Array.isArray(questionData.images) ||
        questionData.images.length === 0)
    ) {
      throw new BadRequestError(
        `Question at index ${index}: Images array cannot be empty when hasImage is true`
      );
    }
  });

  // Create all questions with options in a transaction
  const createdQuestions = await prisma.$transaction(async (tx) => {
    const createdQuestionsArray = [];

    for (const questionData of questionsData) {
      const { questionText, hasImage, images, marks, negativeMarks, options } =
        questionData;

      // Create the question
      const question = await tx.question.create({
        data: {
          examId,
          questionText,
          hasImage: !!hasImage,
          images: hasImage ? images : [],
          marks: Number(marks) || 1,
          negativeMarks: Number(negativeMarks) || 0,
          correctOptionId: "temp", // Temporary until we create options
        },
      });

      // Create options
      const createdOptions = await Promise.all(
        options.map((opt) =>
          tx.option.create({
            data: {
              questionId: question.id,
              optionText: opt.text,
            },
          })
        )
      );

      // Find the correct option and update the question
      const correctOptionIndex = options.findIndex((opt) => opt.isCorrect);
      const correctOption = createdOptions[correctOptionIndex];

      const updatedQuestion = await tx.question.update({
        where: { id: question.id },
        data: { correctOptionId: correctOption.id },
        include: { options: true },
      });

      createdQuestionsArray.push(updatedQuestion);
    }

    // Update the exam aggregates in a single operation
    await tx.exam.update({
      where: { id: examId },
      data: {
        currentQuestionCount: { increment: questionsData.length },
        currentTotalMarks: { increment: totalNewMarks },
      },
    });

    return createdQuestionsArray;
  });

  // Get the updated exam with the new aggregate values
  const updatedExam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      numQuestions: true,
      totalMarks: true,
      currentQuestionCount: true,
      currentTotalMarks: true,
    },
  });

  // Check if the exam is now valid
  const isValid =
    updatedExam?.currentQuestionCount === updatedExam?.numQuestions &&
    updatedExam?.currentTotalMarks === updatedExam?.totalMarks;

  return {
    questions: createdQuestions,
    examStatus: {
      numQuestions: {
        required: updatedExam?.numQuestions,
        current: updatedExam?.currentQuestionCount,
        isComplete:
          updatedExam?.currentQuestionCount === updatedExam?.numQuestions,
      },
      totalMarks: {
        required: updatedExam?.totalMarks,
        current: updatedExam?.currentTotalMarks,
        isComplete: updatedExam?.currentTotalMarks === updatedExam?.totalMarks,
      },
      isValid,
    },
  };
};