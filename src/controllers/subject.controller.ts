import { Request, Response, NextFunction } from 'express';
import * as subjectService from '../services/subject.service';
import { BadRequestError } from '../utils/errors';
import { successResponse, createdResponse } from '../utils/response';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Received request for getAllSubjects');
    console.log('Query parameters:', req.query);
    
    // Extract query parameters
    const includeInactive = req.query.includeInactive === 'true';
    const searchTerm = req.query.searchTerm as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    
    console.log('Parsed parameters:', { includeInactive, searchTerm, page, pageSize });
    
    // Get subjects with pagination
    const result = await subjectService.getAllSubjects(includeInactive, searchTerm, page, pageSize);
    
    console.log('Returning response with data:', {
      totalItems: result.totalItems,
      totalPages: result.totalPages
    });
    
    return successResponse(res, result.data, 'Subjects retrieved successfully', { 
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: page,
        pageSize
      }
    });
  } catch (error) {
    console.error('Error in getAllSubjects:', error);
    next(error);
  }
};

export const getSubjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.subjectId);
    return successResponse(res, subject, 'Subject retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description, credits, isActive } = req.body;

    if (!name) {
      throw new BadRequestError('Please provide subject name');
    }

    if (!code) {
      throw new BadRequestError('Please provide subject code');
    }

    // Validate code format (alphanumeric with optional hyphens)
    const codeRegex = /^[A-Za-z0-9-]+$/;
    if (!codeRegex.test(code)) {
      throw new BadRequestError('Subject code must contain only letters, numbers, and hyphens');
    }

    // Validate credits
    let validatedCredits = credits ? parseInt(credits) : 3;
    if (isNaN(validatedCredits)) {
      throw new BadRequestError('Credits must be a number');
    }
    
    if (validatedCredits < 1 || validatedCredits > 6) {
      throw new BadRequestError('Credits must be between 1 and 6');
    }

    // Parse isActive boolean
    const activeStatus = isActive === undefined ? true : Boolean(isActive);

    const subject = await subjectService.createSubject(name, code, description, validatedCredits, activeStatus);
    return createdResponse(res, subject, 'Subject created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description, credits, isActive } = req.body;

    if (!name) {
      throw new BadRequestError('Please provide subject name');
    }

    if (!code) {
      throw new BadRequestError('Please provide subject code');
    }

    // Validate code format (alphanumeric with optional hyphens)
    const codeRegex = /^[A-Za-z0-9-]+$/;
    if (!codeRegex.test(code)) {
      throw new BadRequestError('Subject code must contain only letters, numbers, and hyphens');
    }

    // Validate credits if provided
    let validatedCredits = undefined;
    if (credits !== undefined) {
      validatedCredits = parseInt(credits);
      if (isNaN(validatedCredits)) {
        throw new BadRequestError('Credits must be a number');
      }
      
      if (validatedCredits < 1 || validatedCredits > 6) {
        throw new BadRequestError('Credits must be between 1 and 6');
      }
    }

    // Parse isActive boolean if provided
    const activeStatus = isActive === undefined ? undefined : Boolean(isActive);

    const subject = await subjectService.updateSubject(req.params.subjectId, name, code, description, validatedCredits, activeStatus);
    return successResponse(res, subject, 'Subject updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateSubjectStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      throw new BadRequestError('Please provide isActive status');
    }

    const subject = await subjectService.updateSubjectStatus(req.params.subjectId, isActive);
    return successResponse(res, subject, `Subject ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get subjects assigned to a user
 * @route GET /subject/admin/users/:userId/subjects
 * @access Admin
 */
export const getUserSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    // Use the service method instead of direct Prisma calls
    const subjects = await subjectService.getUserSubjects(userId);
    return successResponse(res, subjects, 'User subjects retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Assign multiple subjects to a user
 * @route POST /subject/admin/users/:userId/subjects
 * @access Admin
 */
export const assignSubjectsToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      throw new BadRequestError('Please provide an array of subject IDs');
    }

    // Use the service method instead of direct Prisma calls
    const subjects = await subjectService.assignSubjectsToUser(userId, subjectIds);
    return successResponse(res, subjects, 'Subjects assigned to user successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a single subject to a user
 * @route POST /subject/admin/users/:userId/subjects/:subjectId
 * @access Admin
 */
export const assignSubjectToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, subjectId } = req.params;

    // Use the service method instead of direct Prisma calls
    const subjects = await subjectService.assignSubjectToUser(userId, subjectId);
    return successResponse(res, subjects, 'Subject assigned to user successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a subject
 * @route DELETE /subject/admin/subjects/:subjectId
 * @access Admin
 */
export const deleteSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.params;

    // Delete the subject using the service method
    await subjectService.deleteSubject(subjectId);

    return successResponse(res, null, 'Subject deleted successfully');
  } catch (error) {
    next(error);
  }
}; 