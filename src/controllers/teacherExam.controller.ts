import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { successResponse, warningResponse } from "../utils/response";
import * as teacherExamService from "../services/teacherExam.service";
import { AssignExamDto } from "../models/exam.model";
import {
  ExamIdParam,
  StudentIdParam,
  AssignExamResponse,
  PrismaStudentExam,
  ToggleBanResponse,
  ExamResultsResponse,
  StudentResultResponse,
  AnswerSheetWithResponses,
  AntiCheatingLog,
  PrismaStudent,
} from "../models/teacherExam.model";
import { User } from "../models/user.model";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Extend Express Request type with proper types
declare global {
  namespace Express {
    interface Request {
      // Define user with proper type structure based on auth middleware
      user?: User & {
        teacher?: {
          id: string;
        };
        student?: {
          id: string;
        };
      };
    }
  }
}

// Type for URL parameters with both examId and studentId
interface ExamAndStudentParams extends ExamIdParam, StudentIdParam {}

// Assign exam to students
export const assignExamToStudents = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const { studentIds } = req.body as AssignExamDto;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }
    if (!studentIds || studentIds.length === 0) {
      return warningResponse(res, null, "No student IDs provided", 400);
    }

    const result: AssignExamResponse =
      await teacherExamService.assignExamToStudents(
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error assigning exam to students:", error);
    return warningResponse(res, null, errorMessage, 400);
  }
};

// Get students assigned to an exam with status
export const getAssignedStudents = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const studentExams: PrismaStudentExam[] =
      await teacherExamService.getAssignedStudents(examId, teacherId);

    return successResponse(
      res,
      studentExams,
      `Retrieved ${studentExams.length} students assigned to exam`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting assigned students:", error);
    return warningResponse(res, null, errorMessage, 404);
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

    const result: ToggleBanResponse = await teacherExamService.toggleStudentBan(
      examId,
      studentId,
      teacherId
    );

    if (result.action === "unbanned") {
      return successResponse(res, null, "Student unbanned successfully");
    }

    if (result.action === "banned") {
      return successResponse(
        res,
        result,
        "Student banned successfully"
      );
    }

    if (result.action === "failed") {
      return warningResponse(
        res,
        result,
        result.reason || "Could not ban student due to exam status",
        400
      );
    }

    return warningResponse(res, result, "Unexpected result from ban operation", 400);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error toggling student ban:", error);
    return warningResponse(res, null, errorMessage, 404);
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

    const results: ExamResultsResponse =
      await teacherExamService.getExamResults(examId, teacherId);

    return successResponse(
      res,
      results,
      `Retrieved ${results.results.length} results for exam`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting exam results:", error);
    return warningResponse(res, null, errorMessage, 404);
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

    const result: StudentResultResponse =
      await teacherExamService.getStudentResult(examId, studentId, teacherId);

    return successResponse(res, result, "Result retrieved successfully");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting student result:", error);
    return warningResponse(res, null, errorMessage, 404);
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

    const answerSheet: AnswerSheetWithResponses =
      await teacherExamService.getStudentAnswerSheet(
        examId,
        studentId,
        teacherId
      );

    return successResponse(
      res,
      answerSheet,
      "Answer sheet retrieved successfully"
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting student answer sheet:", error);
    return warningResponse(res, null, errorMessage, 404);
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

    const cheatLogs: AntiCheatingLog[] =
      await teacherExamService.getStudentCheatLogs(
        examId,
        studentId,
        teacherId
      );

    return successResponse(
      res,
      cheatLogs,
      `Retrieved ${cheatLogs.length} cheat logs`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting student cheat logs:", error);
    return warningResponse(res, null, errorMessage, 404);
  }
};

// Get banned students for an exam
export const getBannedStudents = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const bannedStudents: PrismaStudent[] =
      await teacherExamService.getBannedStudents(examId, teacherId);

    return successResponse(
      res,
      bannedStudents,
      `Retrieved ${bannedStudents.length} banned students`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting banned students:", error);
    return warningResponse(res, null, errorMessage, 404);
  }
};

// Get filtered students assigned to an exam with pagination, search and status filtering
export const getFilteredStudents = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;
    
    // Parse query parameters
    const { 
      page = '1', 
      limit = '10', 
      search = '', 
      status = ''
    } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    // Validate parameters
    if (isNaN(pageNum) || pageNum < 1) {
      return warningResponse(res, null, "Invalid page parameter", 400);
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return warningResponse(res, null, "Invalid limit parameter (must be between 1-100)", 400);
    }
    
    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    // Get student statistics to add to the response
    const statistics = await teacherExamService.getExamStudentStatistics(examId, teacherId);
    
    // Get filtered and paginated students
    const result = await teacherExamService.getFilteredStudents(
      examId, 
      teacherId, 
      {
        page: pageNum,
        limit: limitNum,
        search: search as string,
        status: status as string
      }
    );

    return successResponse(
      res,
      {
        students: result.students,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(result.total / limitNum)
        },
        statistics
      },
      `Retrieved ${result.students.length} students (page ${pageNum} of ${Math.ceil(result.total / limitNum)})`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting filtered students:", error);
    return warningResponse(res, null, errorMessage, 404);
  }
};

// Get student statistics for an exam
export const getExamStudentStatistics = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    // Get exam details to calculate pass rate
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        ownerId: teacherId,
      },
      select: {
        passingMarks: true,
        totalMarks: true
      }
    });

    if (!exam) {
      return warningResponse(res, null, "Exam not found or unauthorized", 404);
    }

    const statistics = await teacherExamService.getExamStudentStatistics(examId, teacherId);

    // Calculate additional statistics for the frontend
    const enhancedStatistics = {
      ...statistics,
      // Convert to integers for frontend display
      passRate: Math.round(statistics.passRate),
      averageScore: Number(statistics.averageScore.toFixed(2)), // Format to 2 decimal places
      // Add additional info needed for the exam details page
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks
    };

    return successResponse(
      res,
      enhancedStatistics,
      "Retrieved student statistics for exam"
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting exam student statistics:", error);
    return warningResponse(res, null, errorMessage, 404);
  }
};

// Get students eligible for assignment to an exam
export const getEligibleStudentsForExam = async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const teacherId = req.user?.teacher?.id;

    if (!teacherId) {
      return warningResponse(res, null, "Teacher ID not found", 401);
    }

    const eligibleStudentsData = await teacherExamService.getEligibleStudentsForExam(examId, teacherId);

    return successResponse(
      res,
      eligibleStudentsData,
      `Retrieved ${eligibleStudentsData.eligibleStudents.length} eligible students for exam`
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error getting eligible students:", error);
    return warningResponse(res, null, errorMessage, 404);
  }
};
