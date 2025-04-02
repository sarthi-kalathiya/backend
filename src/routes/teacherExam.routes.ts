import { Router } from "express";
import * as teacherExamController from "../controllers/teacherExam.controller";
import { authenticateTeacher } from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import { assignExamSchema } from "../validations/exam.validation";

const router = Router();

// Student assignment & monitoring routes
router.post(
  "/exams/:examId/assign",
  authenticateTeacher,
  validateFields(assignExamSchema),
  teacherExamController.assignExamToStudents
);

// Get assigned students
router.get(
  "/exams/:examId/students",
  authenticateTeacher,
  teacherExamController.getAssignedStudents
);

// Get banned students  
router.get(
  "/exams/:examId/banned-students",
  authenticateTeacher,
  teacherExamController.getBannedStudents
);

// Toggle student ban status
router.patch(
  "/exams/:examId/students/:studentId/ban",
  authenticateTeacher,
  teacherExamController.toggleStudentBan
);

// Get exam results
router.get(
  "/exams/:examId/results",
  authenticateTeacher,
  teacherExamController.getExamResults
);

// Get student result
router.get( 
  "/exams/:examId/students/:studentId/result",
  authenticateTeacher,
  teacherExamController.getStudentResult
);

// Get student answer sheet
router.get(
  "/exams/:examId/students/:studentId/answer-sheet",
  authenticateTeacher,
  teacherExamController.getStudentAnswerSheet
);

// get cheat logs
router.get(
  "/exams/:examId/students/:studentId/cheat-logs",
  authenticateTeacher,
  teacherExamController.getStudentCheatLogs
);

export default router;
