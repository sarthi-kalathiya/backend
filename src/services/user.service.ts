import prisma from '../utils/prismaClient';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { UserRole } from '../constants/roles';
import * as authService from './auth.service';

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
          joiningDate: true,
          completedExams: true
        }
      },
      teacher: {
        select: {
          id: true,
          experience: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

export const createUser = async (userData: any) => {
  const { name, email, password, role, contactNumber } = userData;

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
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        contactNumber
      }
    });

    // Create role-specific record
    if (role === UserRole.STUDENT) {
      await tx.student.create({
        data: {
          userId: user.id
        }
      });
    } else if (role === UserRole.TEACHER) {
      await tx.teacher.create({
        data: {
          userId: user.id
        }
      });
    }

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

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user
      const userUpdate = await tx.user.update({
        where: { id: userId },
        data: { contactNumber }
      });

      // Update teacher
      const teacherUpdate = await tx.teacher.update({
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