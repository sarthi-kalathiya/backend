import { validators } from '../middlewares/validation.middleware';
import { UserRole } from '../constants/user';

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
  )
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
  email: validators.compose(
    validators.string,
    validators.email
  ),
  contactNumber: validators.compose(
    validators.string,
    validators.phone
  ),
  role: validators.compose(
    validators.string,
    validators.oneOf(Object.values(UserRole))
  )
};

// Update user status validation schema
export const updateUserStatusSchema = {
  isActive: validators.compose(
    validators.required,
    validators.boolean
  )
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
    validators.min(0)
  ),
  bio: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(10),
    validators.maxLength(500)
  )
};

// Student profile validation schema
export const studentProfileSchema = {
  rollNumber: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(2),
    validators.maxLength(20)
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
  )
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
  contactNumber: validators.compose(
    validators.string,
    validators.phone
  ),
  teacherProfile: validators.object,
  studentProfile: validators.object
};

// Profile completion validation schema
export const profileCompletionSchema = {
  // Common fields
  contactNumber: validators.compose(
    validators.required,
    validators.string,
    validators.phone
  ),
  
  // Student specific fields (validated based on role)
  rollNumber: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(20)
  ),
  grade: validators.compose(
    validators.string,
    validators.minLength(1),
    validators.maxLength(20)
  ),
  parentContactNumber: validators.compose(
    validators.string,
    validators.phone
  ),
  
  // Teacher specific fields (validated based on role)
  qualification: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  expertise: validators.compose(
    validators.string,
    validators.minLength(2),
    validators.maxLength(100)
  ),
  experience: validators.compose(
    validators.number,
    validators.min(0)
  ),
  bio: validators.compose(
    validators.string,
    validators.minLength(10),
    validators.maxLength(500)
  )
};

// Change password validation schema
export const changePasswordSchema = {
  currentPassword: validators.compose(
    validators.required,
    validators.string,
    validators.minLength(6)
  ),
  newPassword: validators.compose(
    validators.required,
    validators.string,
    validators.password
  )
};

// Reset password validation schema
export const resetPasswordSchema = {
  newPassword: validators.compose(
    validators.required,
    validators.string,
    validators.password
  )
}; 