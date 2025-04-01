import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import * as studentExamController from "../controllers/studentExam.controller";
import { authenticateStudent } from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import { checkExamTimeLimit } from "../utils/examUtils";
import { successResponse, warningResponse } from "../utils/response";
import {
  examResponsesSchema,
  cheatEventSchema,
} from "../validations/studentExam.validation";

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authenticateStudent);

// Get all exams for student
router.get("/exams", studentExamController.getStudentExams);

// Check if student is banned from an exam
router.get("/exams/:examId/ban-status", studentExamController.checkBanStatus);

// Get all upcoming exams for student
router.get("/upcoming-exams", studentExamController.getUpcomingExams);

// Get exam reminders
router.get("/reminders", studentExamController.getExamReminders);

// Get details of a specific exam
router.get("/exams/:examId", studentExamController.getExamDetails);

// Start an exam
router.post("/exams/:examId/start", studentExamController.startExam);

// Submit an exam
router.post(
  "/exams/:examId/submit",
  validateFields(examResponsesSchema),
  studentExamController.submitExam
);

// Get questions for active exam
router.get("/exams/:examId/questions", studentExamController.getExamQuestions);

// Save responses during exam
router.post(
  "/exams/:examId/responses",
  validateFields(examResponsesSchema),
  studentExamController.saveResponses
);

// Get saved responses for current exam
router.get("/exams/:examId/responses", studentExamController.getSavedResponses);

// Get result for an exam
router.get("/exams/:examId/result", studentExamController.getExamResult);

// Get answer sheet for a completed exam
router.get("/exams/:examId/answer-sheet", studentExamController.getAnswerSheet);

// Get results for all exams
router.get("/results", studentExamController.getStudentResults);

// Log a cheating event
router.post(
  "/exams/:examId/cheat-event",
  validateFields(cheatEventSchema),
  studentExamController.logCheatEvent
);

export default router;
