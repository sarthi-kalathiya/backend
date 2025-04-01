import { Request, Response, NextFunction } from "express";
import * as examService from "../services/exam.service";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import {
  successResponse,
  createdResponse,
  warningResponse,
} from "../utils/response";
import { CreateQuestionDto, UpdateQuestionDto } from "../models/exam.model";

// Teacher exam operations
export const getTeacherExams = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new BadRequestError("Invalid pagination parameters");
    }

    const result = await examService.getTeacherExams(teacherId, page, limit);
    return successResponse(res, result, "Exams retrieved successfully");
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
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const exam = await examService.getExamById(req.params.examId, teacherId);
    return successResponse(res, exam, "Exam retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new exam
 *
 * Expected payload:
 * {
 *   "name": "Midterm Exam",
 *   "subjectId": "subject-uuid",
 *   "numQuestions": 50,
 *   "passingMarks": 35,
 *   "totalMarks": 100,
 *   "duration": 120,
 *   "startDate": "2023-11-01T09:00:00Z",
 *   "endDate": "2023-11-01T11:00:00Z"
 * }
 */
export const createExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

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

    // Validate required fields
    if (
      !name ||
      !subjectId ||
      !numQuestions ||
      !passingMarks ||
      !totalMarks ||
      !duration ||
      !startDate ||
      !endDate
    ) {
      throw new BadRequestError("Missing required fields");
    }

    const exam = await examService.createExam(teacherId, {
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

/**
 * Update an existing exam
 *
 * Expected payload:
 * {
 *   "name": "Updated Exam Name",
 *   "numQuestions": 40,
 *   "passingMarks": 30,
 *   "totalMarks": 80,
 *   "duration": 90,
 *   "startDate": "2023-11-01T09:00:00Z",
 *   "endDate": "2023-11-01T10:30:00Z"
 * }
 */
export const updateExam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const {
      name,
      numQuestions,
      passingMarks,
      totalMarks,
      duration,
      startDate,
      endDate,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !numQuestions ||
      !passingMarks ||
      !totalMarks ||
      !duration ||
      !startDate ||
      !endDate
    ) {
      throw new BadRequestError("Missing required fields");
    }

    const exam = await examService.updateExam(req.params.examId, teacherId, {
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

/**
 * Update the active status of an exam
 *
 * Expected payload:
 * {
 *   "isActive": true
 * }
 */
export const updateExamStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      throw new BadRequestError("Missing isActive field");
    }

    const exam = await examService.updateExamStatus(
      req.params.examId,
      teacherId,
      isActive
    );
    return successResponse(
      res,
      exam,
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
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const questions = await examService.getExamQuestions(
      req.params.examId,
      teacherId
    );
    return successResponse(res, questions, "Questions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Add a question to an exam
 *
 * Expected payload:
 * {
 *   "questionText": "What is the capital of France?",
 *   "hasImage": false,
 *   "images": [],
 *   "marks": 1,
 *   "negativeMarks": 0,
 *   "options": [
 *     { "text": "Paris", "isCorrect": true },
 *     { "text": "London", "isCorrect": false },
 *     { "text": "Berlin", "isCorrect": false },
 *     { "text": "Madrid", "isCorrect": false }
 *   ]
 * }
 */
export const addQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const { questionText, hasImage, images, marks, negativeMarks, options } =
      req.body;

    // Validate required fields
    if (!questionText) {
      throw new BadRequestError("Question text is required");
    }

    // Validate options array
    if (!options || !Array.isArray(options) || options.length < 2) {
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
      teacherId,
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

/**
 * Update a question in an exam
 *
 * Expected payload:
 * {
 *   "questionText": "What is the capital of France?",
 *   "hasImage": false,
 *   "images": [],
 *   "marks": 1,
 *   "negativeMarks": 0,
 *   "options": [
 *     { "text": "Paris", "isCorrect": true },
 *     { "text": "London", "isCorrect": false },
 *     { "text": "Berlin", "isCorrect": false },
 *     { "text": "Madrid", "isCorrect": false }
 *   ]
 * }
 */
export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    const { questionText, hasImage, images, marks, negativeMarks, options } =
      req.body;

    // Validate required fields
    if (!questionText) {
      throw new BadRequestError("Question text is required");
    }

    // Validate options array
    if (!options || !Array.isArray(options) || options.length < 2) {
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
      teacherId,
      questionDto
    );

    // Extract validation data
    const { validation, ...questionData } = result;

    // Check if we need to provide warnings about validation
    if (!validation.isComplete || !validation.marksMatch) {
      const warnings = [];

      if (!validation.isComplete) {
        warnings.push(
          `Exam has ${validation.numQuestions.actual}/${validation.numQuestions.declared} questions.`
        );
      }

      if (!validation.marksMatch) {
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
        examComplete: validation.isComplete && validation.marksMatch,
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
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

    await examService.deactivateQuestion(
      req.params.examId,
      req.params.questionId,
      teacherId
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
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

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

/**
 * Add multiple questions to an exam in a single operation
 *
 * Expected payload:
 * {
 *   "questions": [
 *     {
 *       "questionText": "What is the capital of France?",
 *       "hasImage": false,
 *       "images": [],
 *       "marks": 1,
 *       "negativeMarks": 0,
 *       "options": [
 *         { "text": "Paris", "isCorrect": true },
 *         { "text": "London", "isCorrect": false },
 *         { "text": "Berlin", "isCorrect": false },
 *         { "text": "Madrid", "isCorrect": false }
 *       ]
 *     },
 *     {
 *       "questionText": "What is 2+2?",
 *       "hasImage": false,
 *       "images": [],
 *       "marks": 1,
 *       "negativeMarks": 0,
 *       "options": [
 *         { "text": "3", "isCorrect": false },
 *         { "text": "4", "isCorrect": true },
 *         { "text": "5", "isCorrect": false },
 *         { "text": "6", "isCorrect": false }
 *       ]
 *     }
 *   ]
 * }
 */
export const addBulkQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError("Teacher profile not found or incomplete");
    }

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
      teacherId,
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
