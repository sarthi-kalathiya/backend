import { Router } from 'express';
import * as subjectController from '../controllers/subject.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public subject routes
router.get('/', subjectController.getAllSubjects);
router.get('/:subjectId', subjectController.getSubjectById);

// Admin subject management routes
router.post('/admin/subjects', authenticate, authorizeAdmin, subjectController.createSubject);
router.put('/admin/subjects/:subjectId', authenticate, authorizeAdmin, subjectController.updateSubject);
router.patch('/admin/subjects/:subjectId/status', authenticate, authorizeAdmin, subjectController.updateSubjectStatus);

// User-subject assignment routes
router.get('/admin/users/:userId/subjects', authenticate, authorizeAdmin, subjectController.getUserSubjects);
router.patch('/admin/users/:userId/subjects', authenticate, authorizeAdmin, subjectController.assignSubjectsToUser);

export default router; 