import { Request, Response, NextFunction } from "express";
// import * as userService from "../services/user.service";
import { userService } from "../services/user.service";
import { subjectService } from "../services/subject.service";
import { UnauthorizedError } from "../utils/errors";
import {
  successResponse,
  createdResponse,
  noContentResponse,
} from "../utils/response";
import { UserRole } from "../constants/user";
import { 
  UserResponseDto, 
  UserWithProfileResponseDto,
  TeacherResponseDto,
  StudentResponseDto,
  UserQueryParams,
  CreateUserDto,
  UpdateUserDto,
  TeacherProfileDto,
  StudentProfileDto,
  UserProfileUpdateDto,
} from "../models/user.model";
import {
  ChangePasswordDto,
  ResetPasswordDto
} from "../models/auth.model";

// Change password
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordDto;
    const result = await userService.changeUserPassword(
      req.user!.id,
      currentPassword,
      newPassword
    );
    return successResponse(res, result, "Password changed successfully");
  } catch (error) {
    next(error);
  }
};

// Get all users
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get paginated users with pagination info
    const result = await userService.getAllUsers(req.query as UserQueryParams);

    // Return with pagination metadata
    return successResponse(res, result.users, "Users retrieved successfully", {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: UserWithProfileResponseDto = await userService.getUserById(req.params.userId);

    let subjects: any[] = [];
    try {
      subjects = await subjectService.getUserSubjects(req.params.userId);
    } catch (error) {
      console.error("Error fetching user subjects:", error);
      // Proceed with empty subjects array
    }

    // Return the user with subjects
    return successResponse(
      res,
      { ...user, subjects },
      "User retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Create user
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userData: CreateUserDto = req.body;
    const newUser: UserResponseDto = await userService.createUser(userData);
    return createdResponse(res, newUser, "User created successfully");
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userData: UpdateUserDto = req.body;
    const updatedUser: UserResponseDto = await userService.updateUser(req.params.userId, userData);
    return successResponse(res, updatedUser, "User updated successfully");
  } catch (error) {
    next(error);
  }
};

// Update user status
export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isActive } = req.body;
    const updatedUser: UserWithProfileResponseDto = await userService.updateUserStatus(
      req.params.userId,
      isActive
    );

    // Create a more descriptive message based on the user role
    let userType = "User";
    if (updatedUser.role === "TEACHER") {
      userType = "Teacher";
    } else if (updatedUser.role === "STUDENT") {
      userType = "Student";
    }

    return successResponse(
      res,
      updatedUser,
      `${userType} with email ${updatedUser.email} has been ${
        isActive ? "activated" : "deactivated"
      } successfully`
    );
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { newPassword } = req.body as ResetPasswordDto;
    // Get user info first to include in the message
    const user: UserResponseDto = await userService.getUserById(req.params.userId);

    // Reset the password
    const result = await userService.resetUserPassword(
      req.params.userId,
      newPassword
    );

    // Create a more descriptive message based on the user role
    let userType = "User";
    if (user.role === "TEACHER") {
      userType = "Teacher";
    } else if (user.role === "STUDENT") {
      userType = "Student";
    }

    return successResponse(
      res,
      result,
      `Password for ${userType} with email ${user.email} has been reset successfully`
    );
  } catch (error) {
    next(error);
  }
};

// Get profile status
export const getProfileStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return successResponse(res, {
      profileCompleted: req.user!.profileCompleted,
      role: req.user!.role,
      requiresAdditionalSetup:
        (req.user!.role === UserRole.STUDENT ||
          req.user!.role === UserRole.TEACHER) &&
        !req.user!.profileCompleted,
    });
  } catch (error) {
    next(error);
  }
};

// Create teacher profile
export const createTeacherProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teacherProfileData: TeacherProfileDto = req.body;
    const result: TeacherResponseDto = await userService.createTeacherProfile(
      req.user!.id,
      teacherProfileData
    );

    return successResponse(res, result, "Teacher profile created successfully");
  } catch (error) {
    next(error);
  }
};

// Create student profile
export const createStudentProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentProfileData: StudentProfileDto = req.body;
    const result: StudentResponseDto = await userService.createStudentProfile(
      req.user!.id,
      studentProfileData
    );

    return successResponse(res, result, "Student profile created successfully");
  } catch (error) {
    next(error);
  }
};

// Get user profile
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userProfile: UserWithProfileResponseDto = await userService.getUserWithProfile(req.user!.id);

    return successResponse(
      res,
      userProfile,
      "User profile fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const profileData: UserProfileUpdateDto = req.body;
    const updatedProfile: UserWithProfileResponseDto = await userService.updateUserProfile(
      req.user!.id,
      profileData
    );

    return successResponse(res, updatedProfile, "Profile updated successfully");
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    await userService.deleteUser(userId);
    return noContentResponse(res);
  } catch (error) {
    next(error);
  }
};
