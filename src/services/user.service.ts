import { PrismaClient, User, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UserRole } from "../constants/user";
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UserResponseDto, 
  UserWithProfileResponseDto,
  TeacherResponseDto,
  StudentResponseDto,
  PaginatedResponse,
  UserQueryParams
} from "../models/user.model";
import { NotFoundError, BadRequestError } from "../utils/errors";
import {
  TeacherProfileDto,
  StudentProfileDto,
  UserProfileUpdateDto,
} from "../models/user.model";

const prisma = new PrismaClient();

// Helper function to map User to UserResponseDto
const mapUserToResponse = (user: User): UserResponseDto => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role as UserRole,
  contactNumber: user.contactNumber || undefined,
  isActive: user.isActive,
  profileCompleted: user.profileCompleted,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Helper function to map User with profile to UserWithProfileResponseDto
const mapUserWithProfileToResponse = (user: User & { student?: any; teacher?: any }): UserWithProfileResponseDto => ({
  ...mapUserToResponse(user),
  student: user.student ? {
    id: user.student.id,
    userId: user.student.userId,
    rollNumber: user.student.rollNumber || undefined,
    grade: user.student.grade || undefined,
    parentContactNumber: user.student.parentContactNumber || undefined,
    joiningDate: user.student.joiningDate,
    completedExams: user.student.completedExams,
    createdAt: user.student.createdAt,
    updatedAt: user.student.updatedAt
  } : null,
  teacher: user.teacher ? {
    id: user.teacher.id,
    userId: user.teacher.userId,
    qualification: user.teacher.qualification || undefined,
    expertise: user.teacher.expertise || undefined,
    experience: user.teacher.experience,
    bio: user.teacher.bio || undefined,
    createdAt: user.teacher.createdAt,
    updatedAt: user.teacher.updatedAt
  } : null
});

export const userService = {
  async getAllUsers(query: UserQueryParams): Promise<PaginatedResponse<UserResponseDto>> {
    const {
      role,
      isActive,
      searchTerm,
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Convert page and pageSize to numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(searchTerm && {
        OR: [
          { firstName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } }
        ]
      })
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { [sortBy]: sortOrder }
      })
    ]);

  return {
      users: users.map(mapUserToResponse),
    pagination: {
        total,
      page: pageNum,
      pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    };
    },

  async getUserById(id: string): Promise<UserWithProfileResponseDto> {
  const user = await prisma.user.findUnique({
      where: { id },
      include: {
        student: true,
        teacher: true
      }
  });

  if (!user) {
      throw new NotFoundError('User not found');
    }

    return mapUserWithProfileToResponse(user);
  },

  async createUser(data: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const user = await prisma.user.create({
        data: {
        ...data,
          password: hashedPassword,
        isActive: true,
        profileCompleted: false,
        contactNumber: data.contactNumber || ''
      }
    });

    return mapUserToResponse(user);
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const user = await prisma.user.update({
      where: { id },
      data
    });

    return mapUserToResponse(user);
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<UserWithProfileResponseDto> {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
    include: {
      student: true,
        teacher: true
      }
    });

    return mapUserWithProfileToResponse(user);
  },

  async resetUserPassword(id: string, newPassword: string): Promise<{ message: string }> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
  await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return { message: 'Password reset successfully' };
  },

  async changeUserPassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return { message: 'Password changed successfully' };
  },

  async createTeacherProfile(userId: string, data: TeacherProfileDto): Promise<TeacherResponseDto> {
    const teacher = await prisma.teacher.create({
      data: {
        ...data,
        userId
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true }
    });

  return {
      id: teacher.id,
      userId: teacher.userId,
      qualification: teacher.qualification || undefined,
      expertise: teacher.expertise || undefined,
      experience: teacher.experience,
      bio: teacher.bio || undefined,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt
    };
  },

  async createStudentProfile(userId: string, data: StudentProfileDto): Promise<StudentResponseDto> {
    const student = await prisma.student.create({
      data: {
        ...data,
        userId,
        joiningDate: new Date(),
        completedExams: 0
      }
    });

      await prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true }
    });

    return {
      id: student.id,
      userId: student.userId,
      rollNumber: student.rollNumber || undefined,
      grade: student.grade || undefined,
      parentContactNumber: student.parentContactNumber || undefined,
      joiningDate: student.joiningDate,
      completedExams: student.completedExams,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt
    };
  },

  async getUserWithProfile(userId: string): Promise<UserWithProfileResponseDto> {
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

    return mapUserWithProfileToResponse(user);
  },

  async updateUserProfile(userId: string, data: UserProfileUpdateDto): Promise<UserWithProfileResponseDto> {
    const { teacherProfile, studentProfile, ...userData } = data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: userData,
      include: {
        student: true,
        teacher: true
      }
    });

    if (teacherProfile && user.teacher) {
      await prisma.teacher.update({
        where: { id: user.teacher.id },
        data: teacherProfile
      });
    }

    if (studentProfile && user.student) {
      await prisma.student.update({
        where: { id: user.student.id },
        data: studentProfile
      });
    }

    return mapUserWithProfileToResponse(user);
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    return { message: 'User deactivated successfully' };
  }
};
