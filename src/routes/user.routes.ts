import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Common user routes (for current user)
router.get('/profile', authenticate, userController.getCurrentUser);
router.put('/profile', authenticate, userController.updateCurrentUser);
router.post('/complete-profile', authenticate, userController.completeProfile);
router.patch('/password', authenticate, userController.changePassword);

// Admin routes for user management
router.get('/admin/users', authenticate, authorizeAdmin, userController.getAllUsers);
router.post('/admin/users', authenticate, authorizeAdmin, userController.createUser);
router.get('/admin/users/:userId', authenticate, authorizeAdmin, userController.getUserById);
router.put('/admin/users/:userId', authenticate, authorizeAdmin, userController.updateUser);
router.patch('/admin/users/:userId/status', authenticate, authorizeAdmin, userController.updateUserStatus);
router.post('/admin/users/:userId/reset-password', authenticate, authorizeAdmin, userController.resetPassword);

export default router; 