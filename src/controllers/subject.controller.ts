import { Request, Response, NextFunction } from "express";
import { subjectService } from "../services/subject.service";
import { BadRequestError } from "../utils/errors";
import { successResponse, createdResponse } from "../utils/response";
import { PrismaClient } from "@prisma/client";
import { SubjectResponseDto } from "../models/subject.model";

const prisma = new PrismaClient();

// Get all subjects
export const getAllSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract query parameters
    const includeInactive = req.query.includeInactive === "true";
    const searchTerm = req.query.searchTerm as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    // Add handling for direct isActive filtering
    let filterActive: boolean | undefined = undefined;
    if (req.query.isActive !== undefined) {
      filterActive = req.query.isActive === "true";
    }
    // Get subjects with pagination
    const result = await subjectService.getAllSubjects(
      includeInactive,
      searchTerm,
      page,
      pageSize,
      filterActive
    );

    return successResponse(
      res,
      result.data,
      "Subjects retrieved successfully",
      {
        pagination: result.pagination,
      }
    );
  } catch (error) {
    console.error("Error in getAllSubjects:", error);
    next(error);
  }
};

// Get subject by ID
export const getSubjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subject: SubjectResponseDto = await subjectService.getSubjectById(
      req.params.subjectId
    );
    return successResponse(res, subject, "Subject retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Create subject
export const createSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, code, description, credits, isActive } = req.body;

    // Parse isActive boolean
    const activeStatus = isActive === undefined ? true : Boolean(isActive);

    const subject: SubjectResponseDto = await subjectService.createSubject(
      name,
      code,
      description,
      credits,
      activeStatus
    );
    return createdResponse(res, subject, "Subject created successfully");
  } catch (error) {
    next(error);
  }
};

// Update subject
export const updateSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, code, description, credits, isActive } = req.body;

    // Parse isActive boolean if provided
    const activeStatus = isActive === undefined ? undefined : Boolean(isActive);

    const subject: SubjectResponseDto = await subjectService.updateSubject(
      req.params.subjectId,
      name,
      code,
      description,
      credits,
      activeStatus
    );
    return successResponse(res, subject, "Subject updated successfully");
  } catch (error) {
    next(error);
  }
};

// Update subject status
export const updateSubjectStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isActive } = req.body;

    const subject: SubjectResponseDto =
      await subjectService.updateSubjectStatus(req.params.subjectId, isActive);
    return successResponse(
      res,
      subject,
      `Subject ${isActive ? "activated" : "deactivated"} successfully`
    );
  } catch (error) {
    next(error);
  }
};

// Get user subjects
export const getUserSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const subjects: SubjectResponseDto[] = await subjectService.getUserSubjects(
      userId
    );
    return successResponse(
      res,
      subjects,
      "User subjects retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get current user's subjects
export const getCurrentUserSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const subjects: SubjectResponseDto[] = await subjectService.getUserSubjects(
      userId
    );
    return successResponse(
      res,
      subjects,
      "Your subjects retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Assign subjects to user
export const assignSubjectsToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { subjectIds } = req.body;

    const subjects: SubjectResponseDto[] =
      await subjectService.assignSubjectsToUser(userId, subjectIds);
    return successResponse(
      res,
      subjects,
      "Subjects assigned to user successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Assign subject to user
export const assignSubjectToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, subjectId } = req.params;

    const subjects: SubjectResponseDto[] =
      await subjectService.assignSubjectToUser(userId, subjectId);
    return successResponse(
      res,
      subjects,
      "Subject assigned to user successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Delete subject
export const deleteSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { subjectId } = req.params;

    // Delete the subject using the service method
    await subjectService.deleteSubject(subjectId);

    return successResponse(res, null, "Subject deleted successfully");
  } catch (error) {
    next(error);
  }
};
