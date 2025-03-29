import { Router } from 'express';
import * as teacherExamController from '../controllers/teacherExam.controller';
import { authenticateTeacher } from '../middlewares/auth.middleware';
import { validateFields } from '../middlewares/validation.middleware';
import { assignExamSchema } from '../validations/exam.validation';

const router = Router();

// Student assignment & monitoring routes
router.post('/exams/:examId/assign', authenticateTeacher, validateFields(assignExamSchema), teacherExamController.assignExamToStudents);
router.get('/exams/:examId/students', authenticateTeacher, teacherExamController.getAssignedStudents);
router.get('/exams/:examId/banned-students', authenticateTeacher, teacherExamController.getBannedStudents);
router.patch('/exams/:examId/students/:studentId/ban', authenticateTeacher, teacherExamController.toggleStudentBan);
router.get('/exams/:examId/results', authenticateTeacher, teacherExamController.getExamResults);
router.get('/exams/:examId/students/:studentId/result', authenticateTeacher, teacherExamController.getStudentResult);
router.get('/exams/:examId/students/:studentId/answer-sheet', authenticateTeacher, teacherExamController.getStudentAnswerSheet);
router.get('/exams/:examId/students/:studentId/cheat-logs', authenticateTeacher, teacherExamController.getStudentCheatLogs);

export default router; 