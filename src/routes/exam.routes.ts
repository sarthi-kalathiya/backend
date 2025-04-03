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

// Teacher exam routes
router.get("/exams", authenticateTeacher, requireProfileCompletion, examController.getTeacherExams);
router.post(
  "/exams",
  authenticateTeacher,
  validateFields(createExamSchema),
  examController.createExam
);
router.get("/exams/:examId", authenticateTeacher, examController.getExamById);
router.put(
  "/exams/:examId",
  authenticateTeacher,
  validateFields(updateExamSchema),
  examController.updateExam
);
router.patch(
  "/exams/:examId/status",
  authenticateTeacher,
  validateFields(updateExamStatusSchema),
  examController.updateExamStatus
);
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
router.post(
  "/exams/:examId/question",
  authenticateTeacher,
  validateFields(questionSchema),
  examController.addQuestion
);
router.post(
  "/exams/:examId/questions",
  authenticateTeacher,
  examController.addBulkQuestions
);
router.put(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  validateFields(questionSchema),
  examController.updateQuestion
);
router.delete(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  examController.deactivateQuestion
);

export default router;
