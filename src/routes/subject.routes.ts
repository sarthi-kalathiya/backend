import { Router } from "express";
import * as subjectController from "../controllers/subject.controller";
import { authenticateAdmin } from "../middlewares/auth.middleware";
import { validateFields } from "../middlewares/validation.middleware";
import {
  createSubjectSchema,
  updateSubjectSchema,
  updateSubjectStatusSchema,
  assignSubjectsSchema,
  deleteSubjectSchema,
  subjectIdParamSchema,
} from "../validations/subject.validation";
import { userIdParamSchema } from "../validations/user.validation";
const router = Router();

// Public subject routes
router.get("/", authenticateAdmin, subjectController.getAllSubjects);

// Get subject by ID
router.get(
  "/:subjectId",
  authenticateAdmin,
  validateFields(subjectIdParamSchema, "params"),
  subjectController.getSubjectById
);

// Admin subject management routes
router.post(
  "/admin/subjects",
  authenticateAdmin,
  validateFields(createSubjectSchema),
  subjectController.createSubject
);

// Update subject
router.put(
  "/admin/subjects/:subjectId",
  authenticateAdmin,
  validateFields(subjectIdParamSchema, "params"),
  validateFields(updateSubjectSchema),
  subjectController.updateSubject
);

// Update subject status
router.patch(
  "/admin/subjects/:subjectId/status",
  authenticateAdmin,
  validateFields(subjectIdParamSchema, "params"),
  validateFields(updateSubjectStatusSchema),
  subjectController.updateSubjectStatus
);

// Delete subject
router.delete(
  "/admin/subjects/:subjectId",
  authenticateAdmin,
  validateFields(subjectIdParamSchema, "params"),
  validateFields(deleteSubjectSchema),
  subjectController.deleteSubject
);

// User-subject assignment routes
router.get(
  "/admin/users/:userId/subjects",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  subjectController.getUserSubjects
);

// Add multiple subjects to user
router.post(
  "/admin/users/:userId/subjects",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  validateFields(assignSubjectsSchema),
  subjectController.assignSubjectsToUser
);

// Add single subject to user
router.post(
  "/admin/users/:userId/subjects/:subjectId",
  authenticateAdmin,
  validateFields(userIdParamSchema, "params"),
  validateFields(subjectIdParamSchema, "params"),
  subjectController.assignSubjectToUser
);

export default router;
