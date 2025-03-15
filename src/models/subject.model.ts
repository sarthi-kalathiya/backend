export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for subject operations
export interface CreateSubjectDto {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubjectDto {
  name: string;
  code: string;
  description?: string;
}

export interface SubjectResponseDto {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentsOnSubjects {
  studentId: string;
  subjectId: string;
  assignedAt: Date;
}

export interface TeachersOnSubjects {
  teacherId: string;
  subjectId: string;
  assignedAt: Date;
}

export interface SubjectAssignmentDto {
  subjectIds: string[];
} 