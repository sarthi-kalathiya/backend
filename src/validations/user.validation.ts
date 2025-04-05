import { validators } from "../middlewares/validation.middleware";
import { UserRole } from "../constants/user";

// User creation validation schema
export const createUserSchema = {
  firstName: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  lastName: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  email: validators.compose(
    validators.required,
    validators.string,
    validators.email
  ),
  password: validators.compose(
    validators.required,
    validators.string,
    validators.password
  ),
  contactNumber: validators.compose(
    validators.required,
    validators.string,
    validators.phone
  ),
  role: validators.compose(
    validators.required,
    validators.string,
    validators.oneOf(Object.values(UserRole))
  ),
};

// User update validation schema
export const updateUserSchema = {
  firstName: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  lastName: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  email: validators.compose(validators.string, validators.email),
  contactNumber: validators.compose(validators.string, validators.phone),
  role: validators.compose(
    validators.string,
    validators.oneOf(Object.values(UserRole))
  ),
};

// Update user status validation schema
export const updateUserStatusSchema = {
  isActive: validators.compose(validators.required, validators.boolean),
};

// Teacher profile validation schema
export const teacherProfileSchema = {
  qualification: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  expertise: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  experience: validators.compose(
    validators.required,
    validators.number,
    validators.min(0),
    validators.max(80)
  ),
  bio: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(10),
    validators.maxLength(500)
  ),
};

// Student profile validation schema
export const studentProfileSchema = {
  rollNumber: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(10),
    validators.rollNumber
  ),
  grade: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(1),
    validators.maxLength(20)
  ),
  parentContactNumber: validators.compose(
    validators.required,
    validators.string,
    validators.phone
  ),
};

// User profile update validation schema
export const userProfileUpdateSchema = {
  firstName: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  lastName: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  contactNumber: validators.compose(validators.string, validators.phone),
  teacherProfile: validators.object,
  studentProfile: validators.object,
};

// Query parameter validation schemas
export const userQuerySchema = {
  page: validators.compose(validators.number, validators.min(1)),
  limit: validators.compose(
    validators.number,
    validators.min(1),
    validators.max(100)
  ),
  search: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(50)
  ),
  role: validators.compose(
    validators.string,
    validators.oneOf(Object.values(UserRole))
  ),
  isActive: validators.boolean,
  sortBy: validators.compose(
    validators.string,
    validators.oneOf([
      "firstName",
      "lastName",
      "email",
      "createdAt",
      "updatedAt",
    ])
  ),
  sortOrder: validators.compose(
    validators.string,
    validators.oneOf(["asc", "desc"])
  ),
};

// Route parameter validation schemas
export const userIdParamSchema = {
  userId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
};

// Student ID parameter validation schema
export const studentIdParamSchema = {
  studentId: validators.compose(
    validators.required,
    validators.string,
    validators.uuid
  ),
};

// ----
