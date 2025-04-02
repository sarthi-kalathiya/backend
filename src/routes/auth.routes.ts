import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validateFields } from "../middlewares/validation.middleware";
import {
  adminSignupSchema,
  signinSchema,
  refreshTokenSchema,
} from "../validations/auth.validation";

const router = Router();

console.log("Auth routes file loaded");

// Admin auth routes
router.post(
  "/admin/signup",
  validateFields(adminSignupSchema),
  authController.adminSignup
);

// User auth routes (for teachers and students)
router.post("/signin", validateFields(signinSchema), authController.userSignin);

// Common auth routes
router.post(
  "/refresh-token",
  validateFields(refreshTokenSchema),
  authController.refreshToken
);
router.post("/logout", authController.logout);

export default router;
