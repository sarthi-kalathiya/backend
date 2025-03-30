import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { UserRole } from '../constants/user';
import * as authService from './auth.service';
import { TeacherProfileDto, StudentProfileDto, UserProfileUpdateDto, CreateUserDto, ProfileCompletionDto } from '../models/user.model';

export const getAllUsers = async (filters: any = {}) => {
  const { role, isActive, searchTerm, page = 1, pageSize = 10 } = filters;

  const whereCondition: any = {};

  if (role) {
    whereCondition.role = role;
  }

  if (isActive !== undefined) {
    whereCondition.isActive = isActive === 'true';
  }

  if (searchTerm) {
    whereCondition.OR = [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  // Convert page and pageSize to numbers and validate
  const pageNum = parseInt(page as string, 10);
  const pageSizeNum = parseInt(pageSize as string, 10);
  
  // Calculate pagination values
  const skip = (pageNum - 1) * pageSizeNum;
  const take = pageSizeNum;

  // Get total count for pagination info
  const totalCount = await prisma.user.count({
    where: whereCondition
  });

  // Get paginated users
  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });

  // Return both users and pagination info
  return {
    users,
    pagination: {
      total: totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(totalCount / pageSizeNum)
    }
  };
};

export const getUserById = async (userId: string) => {
  // First get the user with basic profile info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      profileCompleted: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
          grade: true,
          parentContactNumber: true,
          joiningDate: true,
          completedExams: true,
          createdAt: true,
          updatedAt: true
        }
      },
      teacher: {
        select: {
          id: true,
          userId: true,
          qualification: true,
          expertise: true,
          experience: true,
          bio: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Now get the user's subjects
  let subjects: any[] = [];
  
  try {
    // If the user is a student or teacher, get their subjects
    if (user.student || user.teacher) {
      // Get subjects from the database based on the user's role
      if (user.student) {
        const studentSubjects = await prisma.studentsOnSubjects.findMany({
          where: { studentId: user.student.id },
          include: {
            subject: true
          }
        });
        subjects = studentSubjects.map(item => item.subject);
      } else if (user.teacher) {
        const teacherSubjects = await prisma.teachersOnSubjects.findMany({
          where: { teacherId: user.teacher.id },
          include: {
            subject: true
          }
        });
        subjects = teacherSubjects.map(item => item.subject);
      }
    }
  } catch (error) {
    console.error('Error fetching user subjects:', error);
    // Continue with subjects as empty array
  }

  // Return user with subjects
  return {
    ...user,
    subjects
  };
};

export const createUser = async (userData: CreateUserDto) => {
  const { firstName, lastName, email, password, role, contactNumber } = userData;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !role || !contactNumber) {
    throw new BadRequestError('All fields are required: firstName, lastName, email, password, role, and contact number');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format');
  }

  // Validate contact number (assuming a simple format, adjust as needed)
  const contactRegex = /^\+?[\d\s-]{10,}$/;
  if (!contactRegex.test(contactNumber)) {
    throw new BadRequestError('Invalid contact number format');
  }

  // Validate role
  const validRoles = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT];
  if (!validRoles.includes(role)) {
    throw new BadRequestError('Invalid role. Must be one of: ADMIN, TEACHER, STUDENT');
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new BadRequestError('Email already in use');
  }

  // Hash password
  const hashedPassword = await authService.hashPassword(password);

  // Create user transaction
  const result = await prisma.$transaction(async (prismaClient) => {
    // Create user with profileCompleted field
    const user = await prismaClient.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        contactNumber,
        profileCompleted: role === UserRole.ADMIN // Only admin profiles are complete by default
      }
    });

    // If user is a teacher or student, create a temporary profile
    if (role === UserRole.TEACHER) {
      await prismaClient.teacher.create({
        data: {
          userId: user.id,
          experience: 0,
          qualification: "", // Empty string for temporary profile
          expertise: "",    // Empty string for temporary profile
          bio: ""          // Empty string for temporary profile
        }
      });
    } else if (role === UserRole.STUDENT) {
      await prismaClient.student.create({
        data: {
          userId: user.id,
          rollNumber: "",  // Empty string for temporary profile
          grade: "",      // Empty string for temporary profile
          parentContactNumber: "" // Empty string for temporary profile
        }
      });
    }

    return user;
  });

  // Return user without password
  return {
    id: result.id,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    role: result.role,
    contactNumber: result.contactNumber,
    isActive: result.isActive,
    profileCompleted: result.profileCompleted,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt
  };
};

export const updateUser = async (userId: string, userData: any) => {
  const { firstName, lastName, email, contactNumber } = userData;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if email is unique if changing
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      email,
      contactNumber
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updatedUser;
};

export const updateUserStatus = async (userId: string, isActive: boolean) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true, 
      teacher: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update user status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      student: true,
      teacher: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updatedUser;
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Hash new password
  const hashedPassword = await authService.hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return { message: 'Password reset successfully' };
};

// export const completeUserProfile = async (userId: string, profileData: ProfileCompletionDto) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: {
//       student: true,
//       teacher: true
//     }
//   });

//   if (!user) {
//     throw new NotFoundError('User not found');
//   }

//   // Common validation
//   // const { contactNumber } = profileData;
//   // if (!contactNumber) {
//   //   throw new BadRequestError('Contact number is required');
//   // }

//   // const contactRegex = /^\+?[\d\s-]{10,}$/;
//   // if (!contactRegex.test(contactNumber)) {
//   //   throw new BadRequestError('Invalid contact number format');
//   // }

//   if (user.role === UserRole.STUDENT) {
//     if (!user.student) {
//       throw new BadRequestError('Student profile not found');
//     }

//     const { rollNumber, grade, parentContactNumber } = profileData;
    
//     // Validate student-specific fields
//     if (!rollNumber || !grade || !parentContactNumber) {
//       throw new BadRequestError('All fields are required: rollNumber, grade, and parentContactNumber');
//     }

//     // Validate roll number format (alphanumeric with optional hyphens)
//     const rollNumberRegex = /^[A-Za-z0-9-]+$/;
//     if (!rollNumberRegex.test(rollNumber)) {
//       throw new BadRequestError('Invalid roll number format. Only alphanumeric characters and hyphens are allowed');
//     }

//     // Validate grade format (alphanumeric with optional spaces and hyphens)
//     const gradeRegex = /^[A-Za-z0-9\s-]+$/;
//     if (!gradeRegex.test(grade)) {
//       throw new BadRequestError('Invalid grade format. Only alphanumeric characters, spaces, and hyphens are allowed');
//     }

//     // Validate parent contact number
//     if (!contactRegex.test(parentContactNumber)) {
//       throw new BadRequestError('Invalid parent contact number format');
//     }

//     const updatedUser = await prisma.$transaction(async (tx) => {
//       // Update user
//       const userUpdate = await tx.user.update({
//         where: { id: userId },
//         data: { 
//           contactNumber,
//           profileCompleted: true
//         }
//       });

//       // Update student profile
//       const studentUpdate = await tx.student.update({
//         where: { userId },
//         data: {
//           rollNumber,
//           grade,
//           parentContactNumber
//         }
//       });

//       return {
//         ...userUpdate,
//         student: studentUpdate
//       };
//     });

//     return {
//       id: updatedUser.id,
//       firstName: updatedUser.firstName,
//       lastName: updatedUser.lastName,
//       email: updatedUser.email,
//       role: updatedUser.role,
//       contactNumber: updatedUser.contactNumber,
//       profileCompleted: updatedUser.profileCompleted,
//       createdAt: updatedUser.createdAt,
//       updatedAt: updatedUser.updatedAt,
//       student: updatedUser.student
//     };
//   } else if (user.role === UserRole.TEACHER) {
//     if (!user.teacher) {
//       throw new BadRequestError('Teacher profile not found');
//     }

//     const { qualification, expertise, experience, bio } = profileData;

//     // Validate teacher-specific fields
//     if (!qualification || !expertise || !bio) {
//       throw new BadRequestError('All fields are required: qualification, expertise, and bio');
//     }

//     const updatedUser = await prisma.$transaction(async (tx) => {
//       // Update user
//       const userUpdate = await tx.user.update({
//         where: { id: userId },
//         data: { 
//           contactNumber,
//           profileCompleted: true
//         }
//       });

//       // Update teacher
//       const teacherUpdate = await tx.teacher.update({
//         where: { userId },
//         data: { 
//           qualification, 
//           expertise, 
//           experience: experience ? parseInt(experience.toString()) : 0,
//           bio 
//         }
//       });

//       return {
//         ...userUpdate,
//         teacher: teacherUpdate
//       };
//     });

//     return {
//       id: updatedUser.id,
//       firstName: updatedUser.firstName,
//       lastName: updatedUser.lastName,
//       email: updatedUser.email,
//       role: updatedUser.role,
//       contactNumber: updatedUser.contactNumber,
//       profileCompleted: updatedUser.profileCompleted,
//       createdAt: updatedUser.createdAt,
//       updatedAt: updatedUser.updatedAt,
//       teacher: updatedUser.teacher
//     };
//   } else if (user.role === UserRole.ADMIN) {
//     // Admins always have complete profiles
//     return user;
//   }

//   throw new BadRequestError('Invalid user role');
// };

export const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isPasswordValid = await authService.comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await authService.hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return { message: 'Password changed successfully' };
};

// Create a teacher profile for a user
export const createTeacherProfile = async (userId: string, teacherData: TeacherProfileDto) => {
  // Validate required fields
  const { qualification, expertise, experience, bio } = teacherData;
  
  if (!qualification || !expertise || bio === undefined) {
    throw new BadRequestError('All fields are required: qualification, expertise, and bio');
  }

  // Check if user exists and is a teacher
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacher: true }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role !== UserRole.TEACHER) {
    throw new BadRequestError('User is not a teacher');
  }

  // Check if the teacher profile exists and is not a temporary one
  if (user.teacher && user.profileCompleted) {
    throw new BadRequestError('Teacher profile already exists and is complete');
  }

  // Update the existing teacher profile or create a new one
  let teacher;
  if (user.teacher) {
    // Update the existing temporary profile
    teacher = await prisma.teacher.update({
      where: { userId },
      data: {
        qualification,
        expertise,
        experience: experience || 0,
        bio
      }
    });
    
    // Update the user's profileCompleted status
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true }
    });
  } else {
    // Create a new profile (shouldn't happen with our new implementation)
    teacher = await prisma.teacher.create({
      data: {
        userId,
        qualification,
        expertise,
        experience: experience || 0,
        bio
      }
    });
    
    // Update the user's profileCompleted status
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true }
    });
  }

  // Get the updated user with profile
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      profileCompleted: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Return the user with teacher profile
  return {
    ...updatedUser,
    teacher
  };
};

// Create a student profile for a user
export const createStudentProfile = async (userId: string, studentData: StudentProfileDto) => {
  // Validate required fields
  const { rollNumber, grade, parentContactNumber } = studentData;

  if (!rollNumber || !grade || !parentContactNumber) {
    throw new BadRequestError('All fields are required: rollNumber, grade, and parentContactNumber');
  }

  // Validate roll number format (alphanumeric with optional hyphens)
  const rollNumberRegex = /^[A-Za-z0-9-]+$/;
  if (!rollNumberRegex.test(rollNumber)) {
    throw new BadRequestError('Invalid roll number format. Only alphanumeric characters and hyphens are allowed');
  }

  // Validate grade format (alphanumeric with optional spaces and hyphens)
  const gradeRegex = /^[A-Za-z0-9\s-]+$/;
  if (!gradeRegex.test(grade)) {
    throw new BadRequestError('Invalid grade format. Only alphanumeric characters, spaces, and hyphens are allowed');
  }

  // Validate parent contact number (must be at least 10 digits)
  const contactRegex = /^\+?[\d\s-]{10,}$/;
  if (!contactRegex.test(parentContactNumber)) {
    throw new BadRequestError('Invalid parent contact number format. Must be at least 10 digits');
  }

  // Check if user exists and is a student
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role !== UserRole.STUDENT) {
    throw new BadRequestError('User is not a student');
  }

  // Check if the student profile exists and is not a temporary one
  if (user.student && user.profileCompleted) {
    throw new BadRequestError('Student profile already exists and is complete');
  }

  // Check if roll number is unique (except for this user's temporary profile)
  const existingStudent = await prisma.student.findFirst({
    where: { 
      rollNumber,
      NOT: { userId }
    }
  });

  if (existingStudent) {
    throw new BadRequestError('Roll number is already in use by another student');
  }

  try {
    // Update the existing student profile or create a new one
    let student;
    
    if (user.student) {
      // Update the existing temporary profile
      student = await prisma.student.update({
        where: { userId },
        data: {
          rollNumber,
          grade,
          parentContactNumber
        }
      });
      
      // Update the user's profileCompleted status
      await prisma.user.update({
        where: { id: userId },
        data: { profileCompleted: true }
      });
    } else {
      // Create a new profile (shouldn't happen with our new implementation)
      student = await prisma.student.create({
        data: {
          userId,
          rollNumber,
          grade,
          parentContactNumber
        }
      });
      
      // Update the user's profileCompleted status
      await prisma.user.update({
        where: { id: userId },
        data: { profileCompleted: true }
      });
    }

    // Get the updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        contactNumber: true,
        isActive: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      ...updatedUser,
      student
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
};

// Get user with profile details
export const getUserWithProfile = async (userId: string) => {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
          grade: true,
          parentContactNumber: true,
          joiningDate: true,
          completedExams: true,
          createdAt: true,
          updatedAt: true
        }
      },
      teacher: {
        select: {
          id: true,
          userId: true,
          qualification: true,
          expertise: true,
          experience: true,
          bio: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

// Update user profile
export const updateUserProfile = async (userId: string, profileData: UserProfileUpdateDto) => {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update base user information
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      contactNumber: profileData.contactNumber
    }
  });

  // If teacher, update teacher profile
  if (user.role === UserRole.TEACHER && profileData.teacherProfile) {
    console.log(`Updating teacher profile for userId: ${userId} with:`, profileData.teacherProfile);
    
    if (!user.teacher) {
      console.warn(`Teacher record not found. Creating new teacher profile for userId: ${userId}`);
      // Create teacher profile if it doesn't exist
      await prisma.teacher.create({
        data: {
          userId,
          qualification: profileData.teacherProfile.qualification,
          expertise: profileData.teacherProfile.expertise,
          experience: profileData.teacherProfile.experience,
          bio: profileData.teacherProfile.bio
        }
      });
    } else {
      // Update existing teacher profile
      await prisma.teacher.update({
        where: { userId },
        data: {
          qualification: profileData.teacherProfile.qualification,
          expertise: profileData.teacherProfile.expertise,
          experience: profileData.teacherProfile.experience,
          bio: profileData.teacherProfile.bio
        }
      });
    }
  }

  // If student, update student profile
  if (user.role === UserRole.STUDENT && profileData.studentProfile && user.student) {
    await prisma.student.update({
      where: { userId },
      data: {
        grade: profileData.studentProfile.grade,
        rollNumber: profileData.studentProfile.rollNumber,
        parentContactNumber: profileData.studentProfile.parentContactNumber
      }
    });
  }

  // Get updated user with profile
  return getUserWithProfile(userId);
};

// Delete a user
export const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Instead of hard delete, perform a soft delete by deactivating the user
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  return { success: true };
};