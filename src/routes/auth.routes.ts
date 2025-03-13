import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Admin auth routes
router.post('/admin/signup', authController.adminSignup);
router.post('/admin/signin', authController.adminSignin);

// User auth routes (for teachers and students)
router.post('/signin', authController.userSignin);

// Common auth routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

export default router; 