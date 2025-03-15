import { UserRole, UserStatus } from '../constants/user';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
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
  rollNumber: string;
  grade: string;
  parentContactNumber: string;
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

// Base user response DTO
export interface UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended user response with profile data
export interface UserWithProfileResponseDto extends UserResponseDto {
  student?: StudentResponseDto | null;
  teacher?: TeacherResponseDto | null;
}

// Teacher profile response
export interface TeacherResponseDto {
  id: string;
  userId: string;
  qualification: string;
  expertise: string;
  experience: number;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Student profile response
export interface StudentResponseDto {
  id: string;
  userId: string;
  rollNumber: string;
  grade: string;
  parentContactNumber: string;
  joiningDate: Date;
  completedExams: number;
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating teacher profile
export interface TeacherProfileDto {
  qualification: string;
  expertise: string;
  experience: number;
  bio: string;
}

// DTO for creating student profile
export interface StudentProfileDto {
  rollNumber: string;
  grade: string;
  parentContactNumber: string;
}

// DTO for updating student profile
export interface UpdateStudentProfileDto {
  rollNumber?: string;
  grade?: string;
  parentContactNumber?: string;
}

// DTO for updating user profile
export interface UserProfileUpdateDto {
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  teacherProfile?: Partial<TeacherProfileDto>;
  studentProfile?: Partial<StudentProfileDto>;
}

export interface CompleteProfileDto {
  name?: string;
  contactNumber?: string;
  experience?: number; // For teachers
} 