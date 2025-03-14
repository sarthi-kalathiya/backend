import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';
import { UserRole } from '../constants/user';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    const user = await userService.getUserById(req.user.id);
    return successResponse(res, user, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    const { name, email, contactNumber } = req.body;
    const updatedUser = await userService.updateUser(req.user.id, { name, email, contactNumber });
    return successResponse(res, updatedUser, 'User profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const completeProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    const result = await userService.completeUserProfile(req.user.id, req.body);
    return successResponse(res, result, 'Profile completed successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
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

// Profile status
export const getProfileStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    return successResponse(res, {
      profileCompleted: req.profileCompleted,
      role: req.user.role,
      requiresAdditionalSetup: req.user.role === UserRole.STUDENT || req.user.role === UserRole.TEACHER
    });
  } catch (error) {
    next(error);
  }
};

// For teacher profile creation
export const createTeacherProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    // Verify user is a teacher
    if (req.user.role !== UserRole.TEACHER) {
      throw new ForbiddenError('Only teachers can create a teacher profile');
    }
    
    const teacherProfileData = req.body;
    const result = await userService.createTeacherProfile(req.user.id, teacherProfileData);
    
    return successResponse(res, result, 'Teacher profile created successfully');
  } catch (error) {
    next(error);
  }
};

// For student profile creation
export const createStudentProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    // Verify user is a student
    if (req.user.role !== UserRole.STUDENT) {
      throw new ForbiddenError('Only students can create a student profile');
    }
    
    const studentProfileData = req.body;
    const result = await userService.createStudentProfile(req.user.id, studentProfileData);
    
    return successResponse(res, result, 'Student profile created successfully');
  } catch (error) {
    next(error);
  }
};

// Get user profile when profile is complete
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const profile = await userService.getUserWithProfile(req.user.id);
    return successResponse(res, profile);
  } catch (error) {
    next(error);
  }
};

// Update user profile when profile is complete
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const profileData = req.body;
    const updatedProfile = await userService.updateUserProfile(req.user.id, profileData);
    
    return successResponse(res, updatedProfile, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete a user (admin only)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    await userService.deleteUser(userId);
    
    return noContentResponse(res);
  } catch (error) {
    next(error);
  }
}; 