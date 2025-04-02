import { PrismaClient } from "@prisma/client";
import prisma from "../utils/prismaClient";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { UserRole } from "../constants/user";
import * as authService from "./auth.service";
import {
  TeacherProfileDto,
  StudentProfileDto,
  UserProfileUpdateDto,
  CreateUserDto,
} from "../models/user.model";

// Get all users
export const getAllUsers = async (filters: any = {}) => {
  const { role, isActive, searchTerm, page = 1, pageSize = 10 } = filters;

  const whereCondition: any = {};

  if (role) {
    whereCondition.role = role;
  }

  if (isActive !== undefined) {
    whereCondition.isActive = isActive === "true";
  }

  if (searchTerm) {
    whereCondition.OR = [
      { firstName: { contains: searchTerm, mode: "insensitive" } },
      { lastName: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
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
    where: whereCondition,
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
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  // Return both users and pagination info
  return {
    users,
    pagination: {
      total: totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(totalCount / pageSizeNum),
    },
  };
};

// Get user by ID
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
          updatedAt: true,
        },
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
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }
  return {
    ...user,
  };
};

// Create user
export const createUser = async (userData: CreateUserDto) => {
  const { firstName, lastName, email, password, role, contactNumber } =
    userData;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError("Email already in use");
  }

  // Hash password
  const hashedPassword = await authService.hashPassword(password);

  // Create user transaction
  const result = await prisma.$transaction(
    async (prismaClient: PrismaClient) => {
      // Create user with profileCompleted field
      const user = await prismaClient.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role,
          contactNumber,
          profileCompleted: role === UserRole.ADMIN, // Only admin profiles are complete by default
        },
      });

      // If user is a teacher or student, create a temporary profile
      if (role === UserRole.TEACHER) {
        await prismaClient.teacher.create({
          data: {
            userId: user.id,
            experience: 0,
            qualification: "", // Empty string for temporary profile
            expertise: "", // Empty string for temporary profile
            bio: "", // Empty string for temporary profile
          },
        });
      } else if (role === UserRole.STUDENT) {
        await prismaClient.student.create({
          data: {
            userId: user.id,
            rollNumber: "", // Empty string for temporary profile
            grade: "", // Empty string for temporary profile
            parentContactNumber: "", // Empty string for temporary profile
          },
        });
      }

      return user;
    }
  );

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
    updatedAt: result.updatedAt,
  };
};

// Update user
export const updateUser = async (userId: string, userData: any) => {
  const { firstName, lastName, email, contactNumber } = userData;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if email is unique if changing
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError("Email already in use");
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      email,
      contactNumber,
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
      updatedAt: true,
    },
  });

  return updatedUser;
};

// Update user status
export const updateUserStatus = async (userId: string, isActive: boolean) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
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
      updatedAt: true,
    },
  });

  return updatedUser;
};

// Reset user password
export const resetUserPassword = async (
  userId: string,
  newPassword: string
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Hash new password
  const hashedPassword = await authService.hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successfully" };
};

// Change user password
export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify current password
  const isPasswordValid = await authService.comparePassword(
    currentPassword,
    user.password
  );
  if (!isPasswordValid) {
    throw new BadRequestError("Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await authService.hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password changed successfully" };
};

// Create a teacher profile for a user
export const createTeacherProfile = async (
  userId: string,
  teacherData: TeacherProfileDto
) => {
  // Validate required fields
  const { qualification, expertise, experience, bio } = teacherData;

  // Check if user exists and is a teacher
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacher: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.role !== UserRole.TEACHER) {
    throw new BadRequestError("User is not a teacher");
  }

  // Check if the teacher profile exists and is not a temporary one
  if (user.teacher && user.profileCompleted) {
    throw new BadRequestError("Teacher profile already exists and is complete");
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
        experience: experience,
        experience: experience,
        bio,
      },
    });

    // Update the user's profileCompleted status
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true },
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
      updatedAt: true,
    },
  });

  // Return the user with teacher profile
  return {
    ...updatedUser,
    teacher,
  };
};

// Create a student profile for a user
export const createStudentProfile = async (
  userId: string,
  studentData: StudentProfileDto
) => {
  // Validate required fields
  const { rollNumber, grade, parentContactNumber } = studentData;

  // Check if user exists and is a student
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.role !== UserRole.STUDENT) {
    throw new BadRequestError("User is not a student");
  }

  // Check if the student profile exists and is not a temporary one
  if (user.student && user.profileCompleted) {
    throw new BadRequestError("Student profile already exists and is complete");
  }

  // Check if roll number is unique (except for this user's temporary profile)
  const existingStudent = await prisma.student.findFirst({
    where: {
      rollNumber,
      NOT: { userId },
    },
  });

  if (existingStudent) {
    throw new BadRequestError(
      "Roll number is already in use by another student"
    );
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
          parentContactNumber,
        },
      });

      // Update the user's profileCompleted status
      await prisma.user.update({
        where: { id: userId },
        data: { profileCompleted: true },
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
        updatedAt: true,
      },
    });

    return {
      ...updatedUser,
      student,
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
          updatedAt: true,
        },
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
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  profileData: UserProfileUpdateDto
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Update base user information
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      contactNumber: profileData.contactNumber,
    },
  });

  // If teacher, update teacher profile
  if (
    user.role === UserRole.TEACHER &&
    profileData.teacherProfile &&
    user.teacher
  ) {
    // Update existing teacher profile
    await prisma.teacher.update({
      where: { userId },
      data: {
        qualification: profileData.teacherProfile.qualification,
        expertise: profileData.teacherProfile.expertise,
        experience: profileData.teacherProfile.experience,
        bio: profileData.teacherProfile.bio,
      },
    });
    if (
      user.role === UserRole.TEACHER &&
      profileData.teacherProfile &&
      user.teacher
    ) {
      // Update existing teacher profile
      await prisma.teacher.update({
        where: { userId },
        data: {
          qualification: profileData.teacherProfile.qualification,
          expertise: profileData.teacherProfile.expertise,
          experience: profileData.teacherProfile.experience,
          bio: profileData.teacherProfile.bio,
        },
      });
    }

    // If student, update student profile
    if (
      user.role === UserRole.STUDENT &&
      profileData.studentProfile &&
      user.student
    ) {
      await prisma.student.update({
        where: { userId },
        data: {
          grade: profileData.studentProfile.grade,
          rollNumber: profileData.studentProfile.rollNumber,
          parentContactNumber: profileData.studentProfile.parentContactNumber,
        },
      });
    }

    // Get updated user with profile
    return getUserWithProfile(userId);
  }
};

// Delete a user
export const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Instead of hard delete, perform a soft delete by deactivating the user
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return { success: true };
};
