import { UserRole, UserStatus } from "../constants/user";

// Base interfaces for database models
export interface BaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  contactNumber?: string;
  isActive: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseStudent {
  id: string;
  userId: string;
  rollNumber?: string;
  grade?: string;
  parentContactNumber?: string;
  joiningDate: Date;
  completedExams: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseTeacher {
  id: string;
  userId: string;
  qualification?: string;
  expertise?: string;
  experience: number;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API responses
export interface UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  contactNumber?: string;
  isActive: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherResponseDto {
  id: string;
  userId: string;
  qualification?: string;
  expertise?: string;
  experience: number;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentResponseDto {
  id: string;
  userId: string;
  rollNumber?: string;
  grade?: string;
  parentContactNumber?: string;
  joiningDate: Date;
  completedExams: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfileResponseDto extends UserResponseDto {
  student?: StudentResponseDto | null;
  teacher?: TeacherResponseDto | null;
}

// DTOs for creating/updating data
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  contactNumber?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
}

export interface TeacherProfileDto {
  qualification: string;
  expertise: string;
  experience: number;
  bio: string;
}

export interface StudentProfileDto {
  rollNumber: string;
  grade: string;
  parentContactNumber: string;
}

export interface UserProfileUpdateDto {
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  teacherProfile?: Partial<TeacherProfileDto>;
  studentProfile?: Partial<StudentProfileDto>;
}

export interface UpdateStudentProfileDto {
  rollNumber?: string;
  grade?: string;
  parentContactNumber?: string;
}

// Query parameter interfaces
export interface UserQueryParams {
  role?: UserRole;
  isActive?: boolean;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Pagination response interface
export interface PaginatedResponse<T> {
  users: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Database model interfaces (for Prisma)
export interface User extends BaseUser {}
export interface UserWithProfile extends BaseUser {
  student?: BaseStudent;
  teacher?: BaseTeacher;
}
export interface Student extends BaseStudent {}
export interface Teacher extends BaseTeacher {}
