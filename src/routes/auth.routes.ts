import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validatePassword } from '../middlewares/validation.middleware';

const router = Router();

console.log('Auth routes file loaded');

// Admin auth routes
console.log('Registering admin signup route: /admin/signup');
router.post('/admin/signup', validatePassword, authController.adminSignup);
router.post('/admin/signin', authController.adminSignin);

// User auth routes (for teachers and students)
router.post('/signin', authController.userSignin);

// Common auth routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;