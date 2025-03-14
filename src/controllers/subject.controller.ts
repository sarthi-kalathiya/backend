import { Request, Response, NextFunction } from 'express';
import * as subjectService from '../services/subject.service';
import { BadRequestError } from '../utils/errors';
import { successResponse, createdResponse } from '../utils/response';

export const getAllSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const subjects = await subjectService.getAllSubjects(includeInactive);
    return successResponse(res, subjects, 'Subjects retrieved successfully');
  } catch (error) {
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
    const { name } = req.body;

    if (!name) {
      throw new BadRequestError('Please provide subject name');
    }

    const subject = await subjectService.createSubject(name);
    return createdResponse(res, subject, 'Subject created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    if (!name) {
      throw new BadRequestError('Please provide subject name');
    }

    const subject = await subjectService.updateSubject(req.params.subjectId, name);
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

export const getUserSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await subjectService.getUserSubjects(req.params.userId);
    return successResponse(res, subjects, 'User subjects retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const assignSubjectsToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectIds } = req.body;

    if (!subjectIds || !Array.isArray(subjectIds)) {
      throw new BadRequestError('Please provide an array of subject IDs');
    }

    const subjects = await subjectService.assignSubjectsToUser(req.params.userId, subjectIds);
    return successResponse(res, subjects, 'Subjects assigned to user successfully');
  } catch (error) {
    next(error);
  }
};

export const assignSubjectToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, subjectId } = req.params;

    const subject = await subjectService.assignSubjectToUser(userId, subjectId);
    return successResponse(res, subject, 'Subject assigned to user successfully');
  } catch (error) {
    next(error);
  }
}; 