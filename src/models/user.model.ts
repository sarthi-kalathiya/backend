import { UserRole } from '../constants/user';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfile extends User {
  student?: Student;
  teacher?: Teacher;
}

export interface Student {
  id: string;
  userId: string;
  joiningDate: Date;
  completedExams: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Teacher {
  id: string;
  userId: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for user operations
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  contactNumber?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  contactNumber?: string;
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompleteProfileDto {
  name?: string;
  contactNumber?: string;
  experience?: number; // For teachers
} 