export interface Subject {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for subject operations
export interface CreateSubjectDto {
  name: string;
}

export interface UpdateSubjectDto {
  name: string;
}

export interface SubjectResponseDto {
  id: string;
  name: string;
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