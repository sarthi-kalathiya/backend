import { Router } from "express";
import * as teacherExamController from "../controllers/teacherExam.controller";
import { authenticateTeacher } from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  assignExamSchema,
  examIdParamSchema,
} from "../validations/exam.validation";
import { studentIdParamSchema } from "../validations/user.validation";

const router = Router();

// Student assignment & monitoring routes
router.post(
  "/exams/:examId/assign",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  validateFields(assignExamSchema),
  teacherExamController.assignExamToStudents
);

// Get assigned students
router.get(
  "/exams/:examId/students",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  teacherExamController.getAssignedStudents
);

// Get filtered students with pagination
router.get(
  "/exams/:examId/students/filtered",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  teacherExamController.getFilteredStudents
);

// Get student statistics
router.get(
  "/exams/:examId/student-statistics",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  teacherExamController.getExamStudentStatistics
);

// Get banned students
router.get(
  "/exams/:examId/banned-students",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  teacherExamController.getBannedStudents
);

// Toggle student ban status
router.patch(
  "/exams/:examId/students/:studentId/toggle-ban",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  validateFields(studentIdParamSchema, "params"),
  teacherExamController.toggleStudentBan
);

// Get exam results
router.get(
  "/exams/:examId/results",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  teacherExamController.getExamResults
);

// Get student result
router.get(
  "/exams/:examId/students/:studentId/result",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  validateFields(studentIdParamSchema, "params"),
  teacherExamController.getStudentResult
);

// Get student answer sheet
router.get(
  "/exams/:examId/students/:studentId/answer-sheet",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  validateFields(studentIdParamSchema, "params"),
  teacherExamController.getStudentAnswerSheet
);

// get cheat logs
router.get(
  "/exams/:examId/students/:studentId/cheat-logs",
  authenticateTeacher,
  validateFields(examIdParamSchema, "params"),
  validateFields(studentIdParamSchema, "params"),
  teacherExamController.getStudentCheatLogs
);

export default router;
