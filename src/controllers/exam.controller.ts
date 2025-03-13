import { Request, Response, NextFunction } from 'express';
import * as examService from '../services/exam.service';
import { BadRequestError } from '../utils/errors';
import { successResponse, createdResponse } from '../utils/response';

// Teacher exam operations
export const getTeacherExams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    const exams = await examService.getTeacherExams(teacherId);
    return successResponse(res, exams, 'Exams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    const exam = await examService.getExamById(req.params.examId, teacherId);
    return successResponse(res, exam, 'Exam retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
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

export const updateExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
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

export const updateExamStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
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
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    const questions = await examService.getExamQuestions(req.params.examId, teacherId);
    return successResponse(res, questions, 'Questions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    const { 
      questionText, 
      hasImage, 
      images, 
      marks, 
      negativeMarks, 
      options 
    } = req.body;

    if (!questionText || !options) {
      throw new BadRequestError('Missing required fields');
    }

    const question = await examService.addQuestion(req.params.examId, teacherId, {
      questionText,
      hasImage,
      images,
      marks,
      negativeMarks,
      options
    });

    return createdResponse(res, question, 'Question added successfully');
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    const { 
      questionText, 
      hasImage, 
      images, 
      marks, 
      negativeMarks, 
      options 
    } = req.body;

    if (!questionText || !options) {
      throw new BadRequestError('Missing required fields');
    }

    const question = await examService.updateQuestion(
      req.params.examId,
      req.params.questionId,
      teacherId,
      {
        questionText,
        hasImage,
        images,
        marks,
        negativeMarks,
        options
      }
    );

    return successResponse(res, question, 'Question updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deactivateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user.teacher?.id;
    if (!teacherId) {
      throw new BadRequestError('Teacher profile not found');
    }

    await examService.deactivateQuestion(req.params.examId, req.params.questionId, teacherId);
    return successResponse(res, null, 'Question removed successfully');
  } catch (error) {
    next(error);
  }
}; 