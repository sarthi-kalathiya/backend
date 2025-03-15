import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as studentExamController from '../controllers/studentExam.controller';
import { authenticateStudent } from '../middlewares/auth.middleware';
import { validateResponses, validateExamId, validateAuth } from '../middlewares/validation.middleware';
import { checkExamTimeLimit } from '../utils/examUtils';
import { sendError, sendNotFoundError, sendServerError, sendValidationError, sendAuthError, sendSuccess } from '../utils/responseUtils';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authenticateStudent);

// Get all exams for student
router.get('/exams', studentExamController.getStudentExams);

// Check if student is banned from an exam
router.get('/exams/:examId/ban-status', validateExamId, validateAuth, studentExamController.checkBanStatus);

// Get all upcoming exams for student
router.get('/upcoming-exams', studentExamController.getUpcomingExams);

// Get exam reminders
router.get('/reminders', studentExamController.getExamReminders);

// Get details of a specific exam
router.get('/exams/:examId', validateExamId, studentExamController.getExamDetails);

// Start an exam
router.post('/exams/:examId/start', validateExamId, validateAuth, studentExamController.startExam);

// Submit an exam
router.post('/exams/:examId/submit', 
  validateExamId, 
  validateAuth, 
  validateResponses(false), // Don't allow empty submissions
  studentExamController.submitExam
);

// Check time remaining
router.get('/exams/:examId/time-check', async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user?.student?.id;
    
    if (!examId) {
      return sendValidationError(res, 'Exam ID is required');
    }
    
    if (!studentId) {
      return sendAuthError(res, 'Authentication required');
    }
    
    const studentExam = await prisma.studentExam.findFirst({
      where: {
        examId,
        studentId,
        status: 'IN_PROGRESS'
      }
    });
    
    if (!studentExam) {
      return sendNotFoundError(res, 'active exam', 'No active exam found with this ID for the current student');
    }
    
    try {
      const timeCheck = await checkExamTimeLimit(studentExam.id);
      return sendSuccess(res, timeCheck);
    } catch (innerError) {
      console.error('Error checking exam time limit:', innerError);
      return sendError(res, 500, 'Failed to check exam time limit', 'An error occurred while checking the time limit for this exam');
    }
  } catch (error) {
    console.error('Error in time check endpoint:', error);
    return sendServerError(res, error, 'An unexpected error occurred while processing your request');
  }
});

// Get questions for active exam
router.get('/exams/:examId/questions', validateExamId, validateAuth, studentExamController.getExamQuestions);

// Save responses during exam
router.post('/exams/:examId/responses', 
  validateExamId,
  validateAuth, 
  validateResponses(true), // Allow empty submissions for saving
  studentExamController.saveResponses
);

// Get saved responses for current exam
router.get('/exams/:examId/responses', validateExamId, validateAuth, studentExamController.getSavedResponses);

// Get result for an exam
router.get('/exams/:examId/result', validateExamId, validateAuth, studentExamController.getExamResult);

// Get answer sheet for a completed exam
router.get('/exams/:examId/answer-sheet', validateExamId, validateAuth, studentExamController.getAnswerSheet);

// Get results for all exams
router.get('/results', studentExamController.getStudentResults);

// Log a cheating event
router.post('/exams/:examId/cheat-event', validateExamId, validateAuth, studentExamController.logCheatEvent);

export default router; 