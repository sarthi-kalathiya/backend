import { Router } from "express";
import * as userController from "../controllers/user.controller";
import {
  authenticate,
  authenticateAdmin,
  authenticateTeacher,
  authenticateStudent,
  requireProfileCompletion
} from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  changePasswordSchema,
  resetPasswordSchema,
  teacherProfileSchema,
  studentProfileSchema,
  userProfileUpdateSchema,
} from "../validations/user.validation";

const router = Router();

router.get("/profile-status", authenticate, userController.getProfileStatus);

router.post(
  "/teacher-profile",
  authenticateTeacher,
  validateFields(teacherProfileSchema),
  userController.createTeacherProfile
);
router.post(
  "/student-profile",
  authenticateStudent,
  validateFields(studentProfileSchema),
  userController.createStudentProfile
);

// Profile routes - require authentication
router.get("/profile", authenticate, requireProfileCompletion, userController.getUserProfile);
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
router.get("/admin/users", authenticateAdmin, userController.getAllUsers);
router.get(
  "/admin/users/:userId",
  authenticateAdmin,
  userController.getUserById
);
router.post(
  "/admin/users",
  authenticateAdmin,
  validateFields(createUserSchema),
  userController.createUser
);
router.put(
  "/admin/users/:userId",
  authenticateAdmin,
  validateFields(updateUserSchema),
  userController.updateUser
);
router.patch(
  "/admin/users/:userId/status",
  authenticateAdmin,
  validateFields(updateUserStatusSchema),
  userController.updateUserStatus
);
router.patch(
  "/admin/users/:userId/reset-password",
  authenticateAdmin,
  validateFields(resetPasswordSchema),
  userController.resetPassword
);
router.delete(
  "/admin/users/:userId",
  authenticateAdmin,
  userController.deleteUser
);

export default router;
