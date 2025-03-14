import { Router } from 'express';
import * as subjectController from '../controllers/subject.controller';
import { authenticateAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public subject routes
router.get('/', subjectController.getAllSubjects);
router.get('/:subjectId', subjectController.getSubjectById);

// Admin subject management routes
router.post('/admin/subjects', authenticateAdmin, subjectController.createSubject);
router.put('/admin/subjects/:subjectId', authenticateAdmin, subjectController.updateSubject);
router.patch('/admin/subjects/:subjectId/status', authenticateAdmin, subjectController.updateSubjectStatus);

// User-subject assignment routes
router.get('/admin/users/:userId/subjects', authenticateAdmin, subjectController.getUserSubjects);
// Add multiple subjects to user
router.post('/admin/users/:userId/subjects', authenticateAdmin, subjectController.assignSubjectsToUser);
// Add single subject to user
router.post('/admin/users/:userId/subjects/:subjectId', authenticateAdmin, subjectController.assignSubjectToUser);

export default router; 