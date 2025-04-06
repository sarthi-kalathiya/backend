import { Request, Response, NextFunction } from "express";
import * as examService from "../services/exam.service";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { ExamStatus } from "../constants/exam";
import { validateFields } from "../middlewares/validation.middleware";
import {
  successResponse,
  createdResponse,
  warningResponse,
} from "../utils/response";
import { CreateQuestionDto, UpdateQuestionDto } from "../models/exam.model";

// Helper to add status text to exam responses
const addStatusToExam = (exam: any) => {
  if (!exam) return exam;
  
  return {
    ...exam,
    statusText: examService.getExamStatusText(exam)
  };
};

// Teacher exam operations
export const getTeacherExams = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher!.id;
    
    // Extract filter parameters from query
    const { page, limit, searchTerm, status, subjectId } = req.query;
    
    // Use the new filtered method
    const result = await examService.getFilteredTeacherExams(teacherId, {
      page: page as string,
      limit: limit as string,
      searchTerm: searchTerm as string,
      status: status as string,
      subjectId: subjectId as string
    });

    // Return successful response with pagination metadata
    return successResponse(res, {
      exams: result.exams,
      pagination: {
        total: result.total,
        page: parseInt(page as string || '1', 10),
        limit: parseInt(limit as string || '10', 10),
        totalPages: Math.ceil(result.total / parseInt(limit as string || '10', 10))
      }
    }, 'Exams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const exam = await examService.getExamById(req.params.examId, teacherId);
    // Add status text to the exam response
    const examWithStatus = addStatusToExam(exam);
    return successResponse(res, examWithStatus, "Exam retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const {
      name,
      subjectId,
      numQuestions,
      passingMarks,
      totalMarks,
      duration,
      startDate,
      endDate,
    } = req.body;

    const exam = await examService.createExam(teacherId!, {
      name,
      subjectId,
      numQuestions,
      passingMarks,
      totalMarks,
      duration,
      startDate,
      endDate,
    });

    return createdResponse(res, exam, "Exam created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const {
      name,
      numQuestions,
      passingMarks,
      totalMarks,
      duration,
      startDate,
      endDate,
    } = req.body;

    const exam = await examService.updateExam(req.params.examId, teacherId!, {
      name,
      numQuestions,
      passingMarks,
      totalMarks,
      duration,
      startDate,
      endDate,
    });

    return successResponse(res, exam, "Exam updated successfully");
  } catch (error) {
    next(error);
  }
};

export const updateExamStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const { isActive } = req.body;
    if (isActive === undefined) {
      throw new BadRequestError("Missing isActive field");
    }

    // Get the current exam to check its status
    const currentExam = await examService.getExamById(req.params.examId, teacherId!);
    const currentStatus = examService.getExamStatusText(currentExam);
    
    // Implement status change restrictions
    // If trying to deactivate (change to Draft)
    if (!isActive) {
      // If exam is Active (not just Upcoming), prevent changing to Draft
      if (currentStatus === 'Active') {
        throw new BadRequestError("Cannot change exam from Active to Draft once students may have started the exam");
      }
      
      // Finished exams can't be changed
      if (currentStatus === 'Finished') {
        throw new BadRequestError("Cannot change the status of a finished exam");
      }
    }
    
    const exam = await examService.updateExamStatus(
      req.params.examId,
      teacherId!,
      isActive
    );
    
    // Add status text to the response
    const examWithStatus = addStatusToExam(exam);
    
    return successResponse(
      res,
      examWithStatus,
      `Exam ${isActive ? "activated" : "deactivated"} successfully`
    );
  } catch (error) {
    next(error);
  }
};

// Question management
export const getExamQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const questions = await examService.getExamQuestions(
      req.params.examId,
      teacherId!
    );
    return successResponse(res, questions, "Questions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const { questionText, hasImage, images, marks, negativeMarks, options } =
      req.body;

    // Validate options array
    if (options.length < 2) {
      throw new BadRequestError("Please provide at least 2 options");
    }

    // Ensure one option is marked as correct
    const hasCorrectOption = options.some(
      (option: { isCorrect?: boolean }) => option.isCorrect === true
    );
    if (!hasCorrectOption) {
      throw new BadRequestError("Please mark one option as correct");
    }

    // Validate images if hasImage is true
    if (hasImage === true) {
      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new BadRequestError(
          "Images array cannot be empty when hasImage is true"
        );
      }
    }

    // Create the DTO
    const questionDto: CreateQuestionDto = {
      questionText,
      hasImage,
      images: hasImage ? images : [],
      marks: marks ? Number(marks) : undefined,
      negativeMarks: negativeMarks ? Number(negativeMarks) : undefined,
      options,
    };

    const result = await examService.addQuestion(
      req.params.examId,
      teacherId!,
      questionDto
    );

    // Extract validation data
    const { validation, ...questionData } = result;

    // Return standardized response structure
    return createdResponse(
      res,
      {
        questions: [questionData],
        examStatus: {
          numQuestions: {
            required: validation.numQuestions.declared,
            current: validation.numQuestions.actual,
            isComplete: validation.numQuestions.match,
          },
          totalMarks: {
            required: validation.totalMarks.declared,
            current: validation.totalMarks.calculated,
            isComplete: validation.totalMarks.match,
          },
          isValid: validation.isComplete,
        },
      },
      `Successfully added 1 question to the exam`
    );
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const { questionText, hasImage, images, marks, negativeMarks, options } =
      req.body;

    // Ensure one option is marked as correct
    const hasCorrectOption = options.some(
      (option: { isCorrect?: boolean }) => option.isCorrect === true
    );
    if (!hasCorrectOption) {
      throw new BadRequestError("Please mark one option as correct");
    }

    // Create the DTO
    const questionDto: UpdateQuestionDto = {
      questionText,
      hasImage,
      images: hasImage ? images : [],
      marks: marks ? Number(marks) : undefined,
      negativeMarks: negativeMarks ? Number(negativeMarks) : undefined,
      options,
    };

    const result = await examService.updateQuestion(
      req.params.examId,
      req.params.questionId,
      teacherId!,
      questionDto
    );

    // Extract validation data
    const { validation, ...questionData } = result;

    // Check if we need to provide warnings about validation
    if (!validation.isComplete || !validation.totalMarks.match) {
      const warnings = [];

      if (!validation.isComplete) {
        warnings.push(
          `Exam has ${validation.numQuestions.actual}/${validation.numQuestions.declared} questions.`
        );
      }

      if (!validation.totalMarks.match) {
        warnings.push(
          `Total marks (${validation.totalMarks.calculated}) do not match the declared total (${validation.totalMarks.declared}).`
        );
      }

      return successResponse(
        res,
        {
          question: questionData,
          validation,
          warnings,
        },
        "Question updated successfully with validation warnings"
      );
    }

    return successResponse(
      res,
      {
        question: questionData,
        validation,
        examComplete: validation.isComplete && validation.totalMarks.match,
      },
      "Question updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const deactivateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    await examService.deactivateQuestion(
      req.params.examId,
      req.params.questionId,
      teacherId!
    );
    return successResponse(res, null, "Question removed successfully");
  } catch (error) {
    next(error);
  }
};

// Validate exam completeness
export const validateExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const { examId } = req.params;

    // Get exam with questions
    const exam = await examService.getExamById(examId, teacherId);

    // Validate total marks and number of questions
    const validation = await examService.validateExamTotalMarks(examId);

    // Create a detailed response
    const validationResponse = {
      isValid: validation.isValid,
      numQuestions: validation.numQuestions,
      totalMarks: validation.totalMarks,
      canActivate: validation.isValid,
      validationErrors: [] as string[],
    };

    // Add specific error messages if validation fails
    if (!validation.numQuestions.match) {
      validationResponse.validationErrors.push(
        `Number of questions (${validation.numQuestions.actual}) does not match the declared number (${validation.numQuestions.declared}).`
      );
    }

    if (!validation.totalMarks.match) {
      validationResponse.validationErrors.push(
        `Total marks (${validation.totalMarks.calculated}) do not match the declared total (${validation.totalMarks.declared}).`
      );
    }

    if (validation.isValid) {
      return successResponse(
        res,
        validationResponse,
        "Exam is valid and ready to be activated."
      );
    } else {
      return warningResponse(
        res,
        validationResponse,
        "Exam validation failed. Please fix the issues before activating."
      );
    }
  } catch (error) {
    next(error);
  }
};

export const addBulkQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;

    const { questions } = req.body;

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestError("Please provide an array of questions");
    }

    // Create DTOs for each question
    const questionDtos: CreateQuestionDto[] = questions.map((q, index) => {
      // Basic validation for required fields
      if (!q.questionText) {
        throw new BadRequestError(
          `Question at index ${index}: Question text is required`
        );
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestError(
          `Question at index ${index}: Please provide at least 2 options`
        );
      }

      // Ensure one option is marked as correct
      const hasCorrectOption = q.options.some(
        (option: { isCorrect?: boolean }) => option.isCorrect === true
      );
      if (!hasCorrectOption) {
        throw new BadRequestError(
          `Question at index ${index}: Please mark one option as correct`
        );
      }

      // Create the DTO
      return {
        questionText: q.questionText,
        hasImage: q.hasImage,
        images: q.hasImage ? q.images : [],
        marks: q.marks ? Number(q.marks) : undefined,
        negativeMarks: q.negativeMarks ? Number(q.negativeMarks) : undefined,
        options: q.options,
      };
    });

    const result = await examService.addBulkQuestions(
      req.params.examId,
      teacherId!,
      questionDtos
    );

    return createdResponse(
      res,
      result,
      `Successfully added ${questions.length} questions to the exam`
    );
  } catch (error) {
    next(error);
  }
};

export const getExamStudentStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;
    const examId = req.params.examId;

    const stats = await examService.getExamStudentStats(examId, teacherId!);
    return successResponse(res, stats, "Exam student statistics retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Reorder Questions
export const reorderQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherId = req.user!.teacher?.id;
    const { examId } = req.params;
    const { questionIds } = req.body;

    if ( questionIds.length === 0) {
      throw new BadRequestError("Please provide an array of question IDs in the desired order");
    }

    const updatedQuestions = await examService.reorderQuestions(
      examId,
      teacherId!,
      questionIds
    );

    return successResponse(
      res,
      updatedQuestions,
      "Questions reordered successfully"
    );
  } catch (error) {
    next(error);
  }
};
