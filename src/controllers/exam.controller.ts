import { Request, Response, NextFunction } from 'express';
import * as examService from '../services/exam.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { successResponse, createdResponse } from '../utils/response';
import { CreateQuestionDto, UpdateQuestionDto } from '../models/exam.model';

// Teacher exam operations
export const getTeacherExams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const exams = await examService.getTeacherExams(teacherId);
    return successResponse(res, exams, 'Exams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const exam = await examService.getExamById(req.params.examId, teacherId);
    return successResponse(res, exam, 'Exam retrieved successfully');
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
 *   "duration": 120,
 *   "startDate": "2023-11-01T09:00:00Z",
 *   "endDate": "2023-11-01T11:00:00Z"
 * }
 */
export const createExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const {
      name,
      subjectId,
      numQuestions,
      passingMarks,
      duration,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!name || !subjectId || !numQuestions || !passingMarks || !duration || !startDate || !endDate) {
      throw new BadRequestError('Missing required fields');
    }

    const exam = await examService.createExam(teacherId, {
      name,
      subjectId,
      numQuestions,
      passingMarks,
      duration,
      startDate,
      endDate
    });

    return createdResponse(res, exam, 'Exam created successfully');
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
 *   "duration": 90,
 *   "startDate": "2023-11-01T09:00:00Z",
 *   "endDate": "2023-11-01T10:30:00Z"
 * }
 */
export const updateExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const {
      name,
      numQuestions,
      passingMarks,
      duration,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!name || !numQuestions || !passingMarks || !duration || !startDate || !endDate) {
      throw new BadRequestError('Missing required fields');
    }

    const exam = await examService.updateExam(req.params.examId, teacherId, {
      name,
      numQuestions,
      passingMarks,
      duration,
      startDate,
      endDate
    });

    return successResponse(res, exam, 'Exam updated successfully');
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
export const updateExamStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      throw new BadRequestError('Missing isActive field');
    }

    const exam = await examService.updateExamStatus(req.params.examId, teacherId, isActive);
    return successResponse(res, exam, `Exam ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

// Question management
export const getExamQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const questions = await examService.getExamQuestions(req.params.examId, teacherId);
    return successResponse(res, questions, 'Questions retrieved successfully');
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
export const addQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const { 
      questionText, 
      hasImage, 
      images, 
      marks, 
      negativeMarks, 
      options 
    } = req.body;

    // Validate required fields
    if (!questionText) {
      throw new BadRequestError('Question text is required');
    }

    // Validate options array
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new BadRequestError('Please provide at least 2 options');
    }

    // Ensure one option is marked as correct
    const hasCorrectOption = options.some(option => option.isCorrect === true);
    if (!hasCorrectOption) {
      throw new BadRequestError('Please mark one option as correct');
    }

    // Validate images if hasImage is true
    if (hasImage === true) {
      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new BadRequestError('Images array cannot be empty when hasImage is true');
      }
    }

    // Create the DTO
    const questionDto: CreateQuestionDto = {
      questionText,
      hasImage,
      images: hasImage ? images : [],
      marks: marks ? Number(marks) : undefined,
      negativeMarks: negativeMarks ? Number(negativeMarks) : undefined,
      options
    };

    const question = await examService.addQuestion(req.params.examId, teacherId, questionDto);

    return createdResponse(res, question, 'Question added successfully');
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
export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    const { 
      questionText, 
      hasImage, 
      images, 
      marks, 
      negativeMarks, 
      options 
    } = req.body;

    // Validate required fields
    if (!questionText) {
      throw new BadRequestError('Question text is required');
    }

    // Validate options array
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new BadRequestError('Please provide at least 2 options');
    }

    // Ensure one option is marked as correct
    const hasCorrectOption = options.some(option => option.isCorrect === true);
    if (!hasCorrectOption) {
      throw new BadRequestError('Please mark one option as correct');
    }

    // Validate images if hasImage is true
    if (hasImage === true) {
      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new BadRequestError('Images array cannot be empty when hasImage is true');
      }
    }

    // Create the DTO
    const questionDto: UpdateQuestionDto = {
      questionText,
      hasImage,
      images: hasImage ? images : [],
      marks: marks ? Number(marks) : undefined,
      negativeMarks: negativeMarks ? Number(negativeMarks) : undefined,
      options
    };

    

    const question = await examService.updateQuestion(
      req.params.examId,
      req.params.questionId,
      teacherId,
      questionDto
    );

    return successResponse(res, question, 'Question updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deactivateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found or incomplete');
    }

    await examService.deactivateQuestion(req.params.examId, req.params.questionId, teacherId);
    return successResponse(res, null, 'Question removed successfully');
  } catch (error) {
    next(error);
  }
}; 