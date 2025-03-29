import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import * as subjectService from '../services/subject.service';
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
    const { firstName, lastName, email, contactNumber } = req.body;
    const updatedUser = await userService.updateUser(req.user.id, { firstName, lastName, email, contactNumber });
    return successResponse(res, updatedUser, 'User profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a user's profile
 * 
 * This is the new, preferred method for profile completion that works with temporary profiles.
 * When a user is first created, they have a temporary profile with empty values.
 * This endpoint allows them to complete their profile with real data.
 *
 * This should be used instead of the legacy createTeacherProfile and createStudentProfile endpoints.
 */
// export const completeProfile = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     if (!req.user) {
//       throw new UnauthorizedError('User not authenticated');
//     }

//     // Check if the profile is already completed
//     if (req.user.profileCompleted) {
//       throw new BadRequestError('Profile is already completed');
//     }

//     // Validate input based on user role
//     if (req.user.role === UserRole.STUDENT) {
//       const { contactNumber, rollNumber, grade, parentContactNumber } = req.body;
//       if (!contactNumber || !rollNumber || !grade || !parentContactNumber) {
//         throw new BadRequestError('All fields are required for students: contactNumber, rollNumber, grade, parentContactNumber');
//       }
//     } else if (req.user.role === UserRole.TEACHER) {
//       const { contactNumber, qualification, expertise, bio, experience } = req.body;
//       if (!contactNumber || !qualification || !expertise || !bio || !experience) {
//         throw new BadRequestError('All fields are required for teachers: contactNumber, qualification, expertise, bio');
//       }
//     }

//     const result = await userService.completeUserProfile(req.user.id, req.body);
//     return successResponse(res, result, 'Profile completed successfully');
//   } catch (error) {
//     next(error);
//   }
// };

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
    // Get paginated users with pagination info
    const result = await userService.getAllUsers(req.query);
    
    // Return with pagination metadata
    return successResponse(res, result.users, 'Users retrieved successfully', {
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    
    // Get the user's subjects
    let subjects: any[] = [];
    try {
      subjects = await subjectService.getUserSubjects(req.params.userId);
    } catch (error) {
      console.error('Error fetching user subjects:', error);
      // Proceed with empty subjects array
    }
    
    // Return the user with subjects
    return successResponse(res, { ...user, subjects }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, role, contactNumber } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      throw new BadRequestError('Please provide firstName, lastName, email, password, and role');
    }

    const newUser = await userService.createUser({
      firstName,
      lastName,
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
    const { firstName, lastName, email, contactNumber } = req.body;
    const updatedUser = await userService.updateUser(req.params.userId, { firstName, lastName, email, contactNumber });
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
      `${userType} with email ${updatedUser.email} has been ${isActive ? 'activated' : 'deactivated'} successfully`
    );
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

    // Get user info first to include in the message
    const user = await userService.getUserById(req.params.userId);
    
    // Reset the password
    const result = await userService.resetUserPassword(req.params.userId, newPassword);
    
    // Create a more descriptive message based on the user role
    let userType = "User";
    if (user.role === "TEACHER") {
      userType = "Teacher";
    } else if (user.role === "STUDENT") {
      userType = "Student";
    }
    
    return successResponse(res, result, `Password for ${userType} with email ${user.email} has been reset successfully`);
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
      profileCompleted: req.user.profileCompleted,
      role: req.user.role,
      requiresAdditionalSetup: (req.user.role === UserRole.STUDENT || req.user.role === UserRole.TEACHER) && !req.user.profileCompleted
    });
  } catch (error) {
    next(error);
  }
};


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