import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import * as studentExamService from "../services/studentExam.service";
import { CheatingEventType } from "../constants/exam";
import { successResponse } from "../utils/response";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";

// Get all exams for student (with filters for assigned/completed)
export const getStudentExams = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const studentId = req.user?.student?.id;
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }
    
    const { status } = req.query;
    const studentExams = await studentExamService.getStudentExams(studentId, status as string | undefined);
    return successResponse(res, studentExams, "Student exams retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get exam details
export const getExamDetails = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const studentExam = await studentExamService.getExamDetails(examId, studentId);
    return successResponse(res, studentExam, "Exam details retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Start an exam
export const startExam = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const examSession = await studentExamService.startExam(examId, studentId);
    return successResponse(res, examSession, "Exam started successfully");
  } catch (error) {
    next(error);
  }
};

// Submit an exam
export const submitExam = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }
    
    const { responses } = req.body;

    const result = await studentExamService.submitExam(examId, studentId, responses);
    return successResponse(res, result, "Exam submitted successfully");
  } catch (error) {
    next(error);
  }
};

// Get questions for active exam
export const getExamQuestions = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const questions = await studentExamService.getExamQuestions(examId, studentId);
    return successResponse(res, questions, "Exam questions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Save responses during exam
export const saveResponses = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }
    
    const { responses } = req.body;

    const answerSheet = await studentExamService.saveResponses(examId, studentId, responses);
    return successResponse(res, answerSheet, "Responses saved successfully");
  } catch (error) {
    next(error);
  }
};

// Get saved responses for current exam
export const getSavedResponses = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const responses = await studentExamService.getSavedResponses(examId, studentId);
    return successResponse(res, responses, "Saved responses retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get results for all exams
export const getStudentResults = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const results = await studentExamService.getStudentResults(studentId);
    return successResponse(res, results, "Student results retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get result for specific exam
export const getExamResult = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const result = await studentExamService.getExamResult(examId, studentId);
    return successResponse(res, result, "Exam result retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// View submitted answer sheet
export const getAnswerSheet = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const answerSheet = await studentExamService.getAnswerSheet(examId, studentId);
    return successResponse(res, answerSheet, "Answer sheet retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Log cheating event
export const logCheatEvent = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }
    
    const { eventType } = req.body;

    const result = await studentExamService.logCheatEvent(examId, studentId, eventType as CheatingEventType);
    return successResponse(res, result, "Cheat event logged successfully");
  } catch (error) {
    next(error);
  }
};

// Get upcoming exams for student
export const getUpcomingExams = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const upcomingExams = await studentExamService.getUpcomingExams(studentId);
    return successResponse(res, upcomingExams, "Upcoming exams retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Check if student is banned from an exam
export const checkBanStatus = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const banStatus = await studentExamService.checkBanStatus(examId, studentId);
    return successResponse(res, banStatus, "Ban status checked successfully");
  } catch (error) {
    next(error);
  }
};

// Get reminders for upcoming exams
export const getExamReminders = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const studentId = req.user?.student?.id;
    
    if (!studentId) {
      throw new BadRequestError("Student ID is required");
    }

    const reminders = await studentExamService.getExamReminders(studentId);
    return successResponse(res, reminders, "Exam reminders retrieved successfully");
  } catch (error) {
    next(error);
  }
};
