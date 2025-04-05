import { Router } from "express";
import * as examController from "../controllers/exam.controller";
import {
  authenticateTeacher,
  requireProfileCompletion,
} from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  createExamSchema,
  updateExamSchema,
  updateExamStatusSchema,
  examIdParamSchema,
  examFilterSchema,
} from "../validations/exam.validation";
import {
  questionIdParamSchema,
  updateQuestionSchema,
  questionSchema,
  bulkQuestionsSchema,
} from "../validations/question.validation";

const router = Router();

console.log("Exam routes file loaded");

// get teacher exams
router.get(
  "/exams",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examFilterSchema, "query"),
  examController.getTeacherExams
);

// create exam
router.post(
  "/exams",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(createExamSchema),
  examController.createExam
);

// get exam by id
router.get(
  "/exams/:examId",
  authenticateTeacher,
  requireProfileCompletion,
  examController.getExamById
);

// update exam
router.put(
  "/exams/:examId",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(updateExamSchema),
  examController.updateExam
);

// update exam status
router.patch(
  "/exams/:examId/status",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(updateExamStatusSchema),
  examController.updateExamStatus
);

// validate exam
router.get(
  "/exams/:examId/validate",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  examController.validateExam
);

// Question management routes
router.get(
  "/exams/:examId/questions",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  examController.getExamQuestions
);

// add question
router.post(
  "/exams/:examId/question",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(questionSchema),
  examController.addQuestion
);

// add bulk questions
router.post(
  "/exams/:examId/questions",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(bulkQuestionsSchema),
  examController.addBulkQuestions
);

// update question
router.put(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(questionIdParamSchema, "params"),
  validateFields(updateQuestionSchema),
  examController.updateQuestion
);

// delete question
router.delete(
  "/exams/:examId/questions/:questionId",
  authenticateTeacher,
  requireProfileCompletion,
  validateFields(examIdParamSchema, "params"),
  validateFields(questionIdParamSchema, "params"),
  examController.deactivateQuestion
);

export default router;
