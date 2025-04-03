import { Router } from "express";
import * as userController from "../controllers/user.controller";
import {
  authenticate,
  authenticateAdmin,
  authenticateTeacher,
  authenticateStudent,
  requireProfileCompletion,
} from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  teacherProfileSchema,
  studentProfileSchema,
  userProfileUpdateSchema,
  userQuerySchema,
  userIdParamSchema,
} from "../validations/user.validation";
import { changePasswordSchema , resetPasswordSchema } from "../validations/auth.validation";

const router = Router();

router.get("/profile-status", authenticate, userController.getProfileStatus);

// Teacher profile routes - require teacher authentication
router.post(
  "/teacher-profile",
  authenticateTeacher,
  validateFields(teacherProfileSchema),
  userController.createTeacherProfile
);

// Student profile routes - require student authentication
router.post(
  "/student-profile",
  authenticateStudent,
  validateFields(studentProfileSchema),
  userController.createStudentProfile
);

// Profile routes - require authentication
router.get(
  "/profile",
  authenticate,
  requireProfileCompletion,
  userController.getUserProfile
);
router.put(
  "/profile",
  authenticate,
  requireProfileCompletion,
  validateFields(userProfileUpdateSchema),
  userController.updateUserProfile
);

// User password management - require authentication
router.patch(
  "/password",
  authenticate,
  validateFields(changePasswordSchema),
  userController.changePassword
);

// Admin user management routes - with admin authentication
router.get(
  "/admin/users",
  authenticateAdmin,
  validateFields(userQuerySchema, "query"),
  userController.getAllUsers
);

// Get user by ID - require admin authentication
router.get(
  "/admin/users/:userId",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  userController.getUserById
);

// Create user - require admin authentication
router.post(
  "/admin/users",
  authenticateAdmin,
  validateFields(createUserSchema),
  userController.createUser
);

// Update user - require admin authentication
router.put(
  "/admin/users/:userId",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  validateFields(updateUserSchema),
  userController.updateUser
);

// Update user status - require admin authentication
router.patch(
  "/admin/users/:userId/status",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  validateFields(updateUserStatusSchema),
  userController.updateUserStatus
);

// Reset user password - require admin authentication
router.patch(
  "/admin/users/:userId/reset-password",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  validateFields(resetPasswordSchema),
  userController.resetPassword
);

// Delete user - require admin authentication 
router.delete(
  "/admin/users/:userId",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  userController.deleteUser
);

export default router;
