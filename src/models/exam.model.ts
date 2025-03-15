import { ExamStatus } from '../constants/exam';

export interface Exam {
  id: string;
  name: string;
  ownerId: string;
  subjectId: string;
  numQuestions: number;
  passingMarks: number;
  totalMarks: number;
  duration: number;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  examId: string;
  questionText: string;
  hasImage: boolean;
  images: string[];
  marks: number;
  negativeMarks: number;
  correctOptionId: string;
}

export interface Option {
  id: string;
  questionId: string;
  optionText: string;
}

export interface StudentExam {
  id: string;
  studentId: string;
  examId: string;
  status: ExamStatus;
  startTime?: Date;
  endTime?: Date;
  submittedAt?: Date;
  autoSubmitted: boolean;
}

export interface Result {
  id: string;
  studentExamId: string;
  marks: number;
  timeTaken: number;
  status: string; // "PASS" | "FAIL"
  createdAt: Date;
}

export interface AnswerSheet {
  id: string;
  studentExamId: string;
  submittedAt: Date;
}

export interface Response {
  id: string;
  answerSheetId: string;
  questionId: string;
  optionId: string;
}

export interface AntiCheatingLog {
  id: string;
  studentExamId: string;
  eventType: string; // "TAB_SWITCH" | "FULLSCREEN_EXIT"
  eventTime: Date;
}

// DTOs for exam operations
export interface CreateExamDto {
  name: string;
  subjectId: string;
  numQuestions: number;
  passingMarks: number;
  totalMarks: number;
  duration: number;
  startDate: string | Date;
  endDate: string | Date;
}

export interface UpdateExamDto {
  name: string;
  numQuestions: number;
  passingMarks: number;
  totalMarks: number;
  duration: number;
  startDate: string | Date;
  endDate: string | Date;
}

export interface ExamStatusUpdateDto {
  isActive: boolean;
}

// DTOs for question operations
export interface QuestionOptionDto {
  text: string;
  isCorrect: boolean;
}

export interface CreateQuestionDto {
  questionText: string;
  hasImage?: boolean;
  images?: string[];
  marks?: number;
  negativeMarks?: number;
  options: QuestionOptionDto[];
}

export interface UpdateQuestionDto {
  questionText: string;
  hasImage?: boolean;
  images?: string[];
  marks?: number;
  negativeMarks?: number;
  options: QuestionOptionDto[];
}

// DTOs for student exam operations
export interface AssignExamDto {
  studentIds: string[];
} 