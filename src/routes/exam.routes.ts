import { Router } from 'express';
import * as examController from '../controllers/exam.controller';
import { authenticateTeacher } from '../middlewares/auth.middleware';

const router = Router();

console.log('Exam routes file loaded');

// Teacher exam routes
// Note: The prefix '/teacher' is already in the app.use('/api/teacher', examRoutes)
// So we use paths like '/exams' instead of '/teacher/exams'
router.get('/exams', authenticateTeacher, examController.getTeacherExams);
router.post('/exams', authenticateTeacher, examController.createExam);
router.get('/exams/:examId', authenticateTeacher, examController.getExamById);
router.put('/exams/:examId', authenticateTeacher, examController.updateExam);
router.patch('/exams/:examId/status', authenticateTeacher, examController.updateExamStatus);
router.get('/exams/:examId/validate', authenticateTeacher, examController.validateExam);

// Question management routes
router.get('/exams/:examId/questions', authenticateTeacher, examController.getExamQuestions);
router.post('/exams/:examId/question', authenticateTeacher, examController.addQuestion);
router.post('/exams/:examId/questions', authenticateTeacher, examController.addBulkQuestions);
router.put('/exams/:examId/questions/:questionId', authenticateTeacher, examController.updateQuestion);
router.delete('/exams/:examId/questions/:questionId', authenticateTeacher, examController.deactivateQuestion);

export default router; 