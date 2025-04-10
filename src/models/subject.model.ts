// ----
export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for subject operations
export interface CreateSubjectDto {
  name: string;
  code: string;
  description?: string;
  credits: number;
}

export interface UpdateSubjectDto {
  name: string;
  code: string;
  description?: string;
  credits: number;
}

export interface SubjectResponseDto {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
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

// Pagination response interface
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
