import {
  Result,
  AnswerSheet,
  Response,
  Question,
  Option,
  Exam,
  AntiCheatingLog as ExamAntiCheatingLog,
} from "./exam.model";
import { User, Student } from "./user.model";

// Types for controller request params
export interface ExamIdParam {
  examId: string;
}

export interface StudentIdParam {
  studentId: string;
}

// Prisma user structure - match actual returned shape from Prisma
export interface PrismaUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  contactNumber: string;
  isActive: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Prisma student structure - match actual returned shape from Prisma
export interface PrismaStudent {
  id: string;
  userId: string;
  rollNumber: string | null;
  grade: string | null;
  parentContactNumber: string | null;
  joiningDate: Date;
  completedExams: number;
  createdAt: Date;
  updatedAt: Date;
  user: PrismaUser;
}

// For banned student info display
export interface BannedStudentInfo {
  id: string;
  name?: string; // For display purposes
  firstName?: string;
  lastName?: string;
  email: string;
}

// Prisma StudentExam structure as returned by Prisma
export interface PrismaStudentExam {
  id: string;
  studentId: string;
  examId: string;
  status: string;
  startTime: Date | null;
  endTime: Date | null;
  submittedAt: Date | null;
  autoSubmitted: boolean;
  student?: PrismaStudent;
}

// Prisma Result structure as returned by Prisma
export interface PrismaResult {
  id: string;
  studentExamId: string;
  marks: number;
  timeTaken: number;
  status: string;
  createdAt: Date;
  studentExam?: PrismaStudentExam;
  totalMarks?: number; // Added by our service
}

// Model interfaces with relations for response types
export interface StudentWithUser extends Student {
  user: User;
}

export interface StudentExamWithStudent extends PrismaStudentExam {
  student: PrismaStudent;
}

export interface ResultWithStudentExam extends PrismaResult {
  studentExam: StudentExamWithStudent;
}

export interface QuestionWithOptions extends Question {
  options: Option[];
}

export interface ResponseWithQuestion extends Response {
  question: QuestionWithOptions;
}

export interface AnswerSheetWithResponses extends AnswerSheet {
  responses: ResponseWithQuestion[];
}

export interface ExamWithBannedStudents extends Exam {
  bannedStudents: PrismaStudent[];
}

// Reexport AntiCheatingLog
export type AntiCheatingLog = ExamAntiCheatingLog;

// Response types for service functions
export interface AssignExamResponse {
  assignments: PrismaStudentExam[];
  alreadyAssignedStudents?: string[];
}

export interface ToggleBanResponse {
  action: "banned" | "unbanned";
  removedAssignment?: boolean;
  reason?: string;
}

export interface ExamResultsResponse {
  results: PrismaResult[];
  totalMarks: number;
}

export interface StudentResultResponse extends PrismaResult {
  totalMarks: number;
}
