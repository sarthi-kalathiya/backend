import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { UserRole } from '../constants/roles';
import * as authService from './auth.service';
import { TeacherProfileDto, StudentProfileDto, UserProfileUpdateDto, CreateUserDto } from '../models/user.model';

export const getAllUsers = async (filters: any = {}) => {
  const { role, isActive, searchTerm } = filters;

  const whereCondition: any = {};

  if (role) {
    whereCondition.role = role;
  }

  if (isActive !== undefined) {
    whereCondition.isActive = isActive === 'true';
  }

  if (searchTerm) {
    whereCondition.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      contactNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return users;
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
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

export const createUser = async (userData: CreateUserDto) => {
  const { name, email, password, role, contactNumber } = userData;

  // Validate required fields
  if (!name || !email || !password || !role || !contactNumber) {
    throw new BadRequestError('All fields are required: name, email, password, role, and contact number');
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
  const result = await prisma.$transaction(async (prismaClient: PrismaClient) => {
    // Create user
    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        contactNumber
      }
    });

    return user;
  });

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    contactNumber: result.contactNumber,
    isActive: result.isActive,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt
  };
};

export const updateUser = async (userId: string, userData: any) => {
  const { name, email, contactNumber } = userData;

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
      name,
      email,
      contactNumber
    },
    select: {
      id: true,
      name: true,
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
    where: { id: userId }
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
      name: true,
      email: true,
      role: true,
      isActive: true
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

export const completeUserProfile = async (userId: string, profileData: any) => {
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

  if (user.role === UserRole.STUDENT) {
    if (!user.student) {
      throw new BadRequestError('Student profile not found');
    }

    const { contactNumber } = profileData;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { contactNumber },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contactNumber: true,
        student: true
      }
    });

    return updatedUser;
  } else if (user.role === UserRole.TEACHER) {
    if (!user.teacher) {
      throw new BadRequestError('Teacher profile not found');
    }

    const { contactNumber, experience } = profileData;

    const updatedUser = await prisma.$transaction(async (prismaClient: PrismaClient) => {
      // Update user
      const userUpdate = await prismaClient.user.update({
        where: { id: userId },
        data: { contactNumber }
      });

      // Update teacher
      const teacherUpdate = await prismaClient.teacher.update({
        where: { userId },
        data: { experience: parseInt(experience) || 0 }
      });

      return {
        ...userUpdate,
        teacher: teacherUpdate
      };
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      contactNumber: updatedUser.contactNumber,
      teacher: updatedUser.teacher
    };
  }

  throw new BadRequestError('Invalid user role');
};

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

  if (user.teacher) {
    throw new BadRequestError('Teacher profile already exists');
  }

  // Create the teacher profile
  const teacher = await prisma.teacher.create({
    data: {
      userId,
      qualification,
      expertise,
      experience: experience || 0,
      bio
    }
  });

  // Return the user with teacher profile
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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

  if (user.student) {
    throw new BadRequestError('Student profile already exists');
  }

  // Check if roll number is unique
  const existingStudent = await prisma.student.findFirst({
    where: { rollNumber }
  });

  if (existingStudent) {
    throw new BadRequestError('Roll number is already in use');
  }

  try {
    // Create the student profile
    const student = await prisma.student.create({
      data: {
        userId,
        rollNumber,
        grade,
        parentContactNumber
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student: {
        id: student.id,
        userId: student.userId,
        rollNumber: student.rollNumber,
        grade: student.grade,
        parentContactNumber: student.parentContactNumber,
        joiningDate: student.joiningDate,
        completedExams: student.completedExams,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      }
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
      name: true,
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
      name: profileData.name,
      contactNumber: profileData.contactNumber
    }
  });

  // If teacher, update teacher profile
  if (user.role === UserRole.TEACHER && profileData.teacherProfile && user.teacher) {
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