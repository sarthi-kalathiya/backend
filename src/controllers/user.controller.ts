import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { BadRequestError } from '../utils/errors';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return successResponse(res, user, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, contactNumber } = req.body;
    const updatedUser = await userService.updateUser(req.user.id, { name, email, contactNumber });
    return successResponse(res, updatedUser, 'User profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const completeProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.completeUserProfile(req.user.id, req.body);
    return successResponse(res, result, 'Profile completed successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Please provide current and new password');
    }

    const result = await userService.changeUserPassword(req.user.id, currentPassword, newPassword);
    return successResponse(res, result, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

// Admin endpoints for user management
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers(req.query);
    return successResponse(res, users, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, contactNumber } = req.body;

    if (!name || !email || !password || !role) {
      throw new BadRequestError('Please provide name, email, password, and role');
    }

    const newUser = await userService.createUser({
      name,
      email,
      password,
      role,
      contactNumber
    });

    return createdResponse(res, newUser, 'User created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, contactNumber } = req.body;
    const updatedUser = await userService.updateUser(req.params.userId, { name, email, contactNumber });
    return successResponse(res, updatedUser, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      throw new BadRequestError('Please provide isActive status');
    }

    const updatedUser = await userService.updateUserStatus(req.params.userId, isActive);
    return successResponse(res, updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      throw new BadRequestError('Please provide new password');
    }

    const result = await userService.resetUserPassword(req.params.userId, newPassword);
    return successResponse(res, result, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
}; 