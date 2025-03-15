import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { 
  authenticate,
  authenticateAdmin,
  authenticateTeacher,
  authenticateStudent,
  requireProfileCompletion
} from '../middlewares/auth.middleware';
import { validatePassword } from '../middlewares/validation.middleware';

const router = Router();

// Profile status routes - accessible after authentication without completed profile
router.get('/profile-status', authenticate, userController.getProfileStatus);

// Profile setup routes - with role-specific authentication
router.post('/teacher-profile', authenticateTeacher, userController.createTeacherProfile);
router.post('/student-profile', authenticateStudent, userController.createStudentProfile);

// Profile routes - require authentication
router.get('/profile', authenticate, userController.getUserProfile);
router.put('/profile', authenticate, userController.updateUserProfile);

// User password management - require authentication
router.patch('/password', authenticate, validatePassword, userController.changePassword);

// Admin user management routes - with admin authentication
router.get('/admin/users', authenticateAdmin, userController.getAllUsers);
router.get('/admin/users/:userId', authenticateAdmin, userController.getUserById);
router.post('/admin/users', authenticateAdmin, validatePassword, userController.createUser);
router.put('/admin/users/:userId', authenticateAdmin, userController.updateUser);
router.patch('/admin/users/:userId/status', authenticateAdmin, userController.updateUserStatus);
router.patch('/admin/users/:userId/reset-password', authenticateAdmin, validatePassword, userController.resetPassword);
router.delete('/admin/users/:userId', authenticateAdmin, userController.deleteUser);

export default router;