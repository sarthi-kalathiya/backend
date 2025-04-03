import { Router } from "express";
import * as examController from "../controllers/exam.controller";
import { authenticateTeacher, requireProfileCompletion } from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  createExamSchema,
  updateExamSchema,
  updateExamStatusSchema,
  questionSchema,
} from "../validations/exam.validation";

const router = Router();

console.log("Exam routes file loaded");

// get teacher exams
router.get("/exams", authenticateTeacher, requireProfileCompletion, examController.getTeacherExams);

// create exam
router.post(
  "/exams",
  authenticateTeacher,
  validateFields(createExamSchema),
  examController.createExam
);

// get exam by id
router.get("/exams/:examId", authenticateTeacher, examController.getExamById);

// update exam
router.put(
  "/exams/:examId",
  authenticateTeacher,
  validateFields(updateExamSchema),
  examController.updateExam
);

// update exam status
router.patch(
  "/exams/:examId/status",
  authenticateTeacher,
  validateFields(updateExamStatusSchema),
  examController.updateExamStatus
);

// validate exam
router.get(
  "/exams/:examId/validate",
  authenticateTeacher,
  examController.validateExam
);

// Question management routes
router.get(
  "/exams/:examId/questions",
  authenticateTeacher,
  examController.getExamQuestions
);

// add question
router.post(
  "/exams/:examId/question",
  authenticateTeacher,
  validateFields(questionSchema),
  examController.addQuestion
);

// add bulk questions
router.post(
  "/exams/:examId/questions",
  authenticateTeacher,
  examController.addBulkQuestions
);

// update question
router.put(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  validateFields(questionSchema),
  examController.updateQuestion
);

// delete question
router.delete(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  examController.deactivateQuestion
);

export default router;
