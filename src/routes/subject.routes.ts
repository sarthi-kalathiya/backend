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
  validateFields(subjectIdParamSchema),
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
  validateFields(subjectIdParamSchema),
  validateFields(updateSubjectSchema),
  subjectController.updateSubject
);

// Update subject status
router.patch(
  "/admin/subjects/:subjectId/status",
  authenticateAdmin,
  validateFields(subjectIdParamSchema),
  validateFields(updateSubjectStatusSchema),
  subjectController.updateSubjectStatus
);

// Delete subject
router.delete(
  "/admin/subjects/:subjectId",
  authenticateAdmin,
  validateFields(subjectIdParamSchema),
  validateFields(deleteSubjectSchema),
  subjectController.deleteSubject
);

// User-subject assignment routes
router.get(
  "/admin/users/:userId/subjects",
  authenticateAdmin,
  validateFields(userIdParamSchema),
  subjectController.getUserSubjects
);

// Add multiple subjects to user
router.post(
  "/admin/users/:userId/subjects",
  authenticateAdmin,
  validateFields(userIdParamSchema),
  validateFields(assignSubjectsSchema),
  subjectController.assignSubjectsToUser
);

// Add single subject to user
router.post(
  "/admin/users/:userId/subjects/:subjectId",
  authenticateAdmin,
  validateFields(userIdParamSchema),
  validateFields(subjectIdParamSchema),
  subjectController.assignSubjectToUser
);

export default router;
