import { Router } from 'express';
import * as examController from '../controllers/exam.controller';
import { authenticate, authorizeTeacher } from '../middlewares/auth.middleware';

const router = Router();

console.log('Exam routes file loaded');

// Teacher exam routes
// Note: The prefix '/teacher' is already in the app.use('/api/teacher', examRoutes)
// So we remove 'teacher/' from the route paths
router.get('/exams', authenticate, authorizeTeacher, examController.getTeacherExams);
router.post('/exams', authenticate, authorizeTeacher, examController.createExam);
router.get('/exams/:examId', authenticate, authorizeTeacher, examController.getExamById);
router.put('/exams/:examId', authenticate, authorizeTeacher, examController.updateExam);
router.patch('/exams/:examId/status', authenticate, authorizeTeacher, examController.updateExamStatus);

// Question management routes
router.get('/exams/:examId/questions', authenticate, authorizeTeacher, examController.getExamQuestions);
router.post('/exams/:examId/questions', authenticate, authorizeTeacher, examController.addQuestion);
router.put('/exams/:examId/questions/:questionId', authenticate, authorizeTeacher, examController.updateQuestion);
router.delete('/exams/:examId/questions/:questionId', authenticate, authorizeTeacher, examController.deactivateQuestion);

export default router; 