import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { successResponse, warningResponse } from "../utils/response";
import * as teacherExamService from "../services/teacherExam.service";
import { AssignExamDto } from "../models/exam.model";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any; // This matches how the auth middleware attaches the user
    }
  }
}

// Assign exam to students
export const assignExamToStudents = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const { studentIds } = req.body as AssignExamDto;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const result = await teacherExamService.assignExamToStudents(
      examId,
      studentIds,
      teacherId
    );

    return successResponse(
      res,
      result,
      `Assigned exam to ${result.assignments.length} students`,
      201
    );
  } catch (error: any) {
    logger.error("Error assigning exam to students:", error);
    return warningResponse(res, null, error.message, 400);
  }
};

// Get students assigned to an exam with status
export const getAssignedStudents = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const studentExams = await teacherExamService.getAssignedStudents(
      examId,
      teacherId
    );

    return successResponse(
      res,
      studentExams,
      `Retrieved ${studentExams.length} students assigned to exam`
    );
  } catch (error: any) {
    logger.error("Error getting assigned students:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Ban/unban student from exam
export const toggleStudentBan = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const result = await teacherExamService.toggleStudentBan(
      examId,
      studentId,
      teacherId
    );

    if (result.action === "unbanned") {
      return successResponse(res, null, "Student unbanned successfully");
    }

    if (result.removedAssignment) {
      return successResponse(
        res,
        result,
        "Student banned successfully and exam assignment removed"
      );
    }

    if (result.reason) {
      return warningResponse(
        res,
        result,
        "Student banned successfully, but existing exam assignment could not be removed due to its status",
        400
      );
    }

    return successResponse(res, result, "Student banned successfully");
  } catch (error: any) {
    logger.error("Error toggling student ban:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Get all results for an exam
export const getExamResults = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const results = await teacherExamService.getExamResults(examId, teacherId);

    return successResponse(
      res,
      results,
      `Retrieved ${results.results.length} results for exam`
    );
  } catch (error: any) {
    logger.error("Error getting exam results:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Get specific student's result for an exam
export const getStudentResult = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const result = await teacherExamService.getStudentResult(
      examId,
      studentId,
      teacherId
    );

    return successResponse(res, result, "Result retrieved successfully");
  } catch (error: any) {
    logger.error("Error getting student result:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Get student's answer sheet
export const getStudentAnswerSheet = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const answerSheet = await teacherExamService.getStudentAnswerSheet(
      examId,
      studentId,
      teacherId
    );

    return successResponse(
      res,
      answerSheet,
      "Answer sheet retrieved successfully"
    );
  } catch (error: any) {
    logger.error("Error getting student answer sheet:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Get cheating logs for a student
export const getStudentCheatLogs = async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const cheatLogs = await teacherExamService.getStudentCheatLogs(
      examId,
      studentId,
      teacherId
    );

    return successResponse(
      res,
      cheatLogs,
      `Retrieved ${cheatLogs.length} cheat logs`
    );
  } catch (error: any) {
    logger.error("Error getting student cheat logs:", error);
    return warningResponse(res, null, error.message, 404);
  }
};

// Get banned students for an exam
export const getBannedStudents = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const bannedStudents = await teacherExamService.getBannedStudents(
      examId,
      teacherId
    );

    return successResponse(
      res,
      bannedStudents,
      `Retrieved ${bannedStudents.length} banned students`
    );
  } catch (error: any) {
    logger.error("Error getting banned students:", error);
    return warningResponse(res, null, error.message, 404);
  }
};
