import { validators } from "../middlewares/validation.middleware";

// Admin signup validation schema
export const adminSignupSchema = {
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
};

// User signin validation schema
export const signinSchema = {
  email: validators.compose(
    validators.required,
    validators.string,
    validators.email
  ),
  password: validators.compose(validators.required, validators.string),
};

// Refresh token validation schema
export const refreshTokenSchema = {
  refreshToken: validators.compose(validators.required, validators.string),
};

// ----
// Change password validation schema
export const changePasswordSchema = {
  currentPassword: validators.compose(validators.required, validators.string),
  newPassword: validators.compose(
    validators.required,
    validators.string,
    validators.password
  ),
};

// Reset password validation schema
export const resetPasswordSchema = {
  newPassword: validators.compose(
    validators.required,
    validators.string,
    validators.password
  ),
};
