import { Router } from 'express';
import * as examController from '../controllers/exam.controller';
import { authenticate, authorizeTeacher } from '../middlewares/auth.middleware';

const router = Router();

// Teacher exam routes
router.get('/teacher/exams', authenticate, authorizeTeacher, examController.getTeacherExams);
router.post('/teacher/exams', authenticate, authorizeTeacher, examController.createExam);
router.get('/teacher/exams/:examId', authenticate, authorizeTeacher, examController.getExamById);
router.put('/teacher/exams/:examId', authenticate, authorizeTeacher, examController.updateExam);
router.patch('/teacher/exams/:examId/status', authenticate, authorizeTeacher, examController.updateExamStatus);

// Question management routes
router.get('/teacher/exams/:examId/questions', authenticate, authorizeTeacher, examController.getExamQuestions);
router.post('/teacher/exams/:examId/questions', authenticate, authorizeTeacher, examController.addQuestion);
router.put('/teacher/exams/:examId/questions/:questionId', authenticate, authorizeTeacher, examController.updateQuestion);
router.delete('/teacher/exams/:examId/questions/:questionId', authenticate, authorizeTeacher, examController.deactivateQuestion);

export default router; 