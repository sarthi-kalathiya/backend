import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { validate as uuidValidate } from "uuid";

// Generic validation error response function
const validationError = (
  res: Response,
  field: string,
  message: string,
  details?: any
) => {
  return res.status(400).json({
    error: "Validation Error",
    field,
    message,
    details,
  });
};

// Generic validation middleware creator
export const validateFields = (
  schema: Record<string, ValidatorFunction>,
  source: "body" | "params" | "query" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data =
        source === "body"
          ? req.body
          : source === "params"
          ? req.params
          : req.query;

      for (const [field, validator] of Object.entries(schema)) {
        const value = data[field];
        const result = validator(value, field, data);

        if (result !== true) {
          return validationError(res, field, result);
        }
      }

      next();
    } catch (error) {
      logger.error("Error in field validation middleware:", error);
      return res.status(500).json({
        error: "Server error",
        message: "An error occurred while validating your request",
      });
    }
  };
};

// Types for validation
type ValidatorFunction = (
  value: any,
  fieldName: string,
  allValues?: any
) => true | string;

// Reusable validator functions
export const validators = {
  required: (value: any, fieldName: string): true | string => {
    if (value === undefined || value === null || value === "") {
      return `${fieldName} is required`;
    }
    return true;
  },

  string: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return `${fieldName} must be a string`;
    }
    return true;
  },

  minLength:
    (min: number) =>
    (value: any, fieldName: string): true | string => {
      if (value && typeof value === "string" && value.length < min) {
        return `${fieldName} must be at least ${min} characters long`;
      }
      return true;
    },

  maxLength:
    (max: number) =>
    (value: any, fieldName: string): true | string => {
      if (value && typeof value === "string" && value.length > max) {
        return `${fieldName} must not exceed ${max} characters`;
      }
      return true;
    },

  number: (value: any, fieldName: string): true | string => {
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "number" &&
      isNaN(Number(value))
    ) {
      return `${fieldName} must be a number`;
    }
    return true;
  },

  min:
    (min: number) =>
    (value: any, fieldName: string): true | string => {
      if (value !== undefined && value !== null && Number(value) < min) {
        return `${fieldName} must be at least ${min}`;
      }
      return true;
    },

  max:
    (max: number) =>
    (value: any, fieldName: string): true | string => {
      if (value !== undefined && value !== null && Number(value) > max) {
        return `${fieldName} must not exceed ${max}`;
      }
      return true;
    },

  email: (value: any, fieldName: string): true | string => {
    if (value && typeof value === "string") {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) {
        return `${fieldName} must be a valid email address`;
      }
    }
    return true;
  },

  uuid: (value: any, fieldName: string): true | string => {
    if (value && !uuidValidate(value)) {
      return `${fieldName} must be a valid UUID`;
    }
    return true;
  },

  phone: (value: any, fieldName: string): true | string => {
    if (value && typeof value === "string") {
      // Allows formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
      const phoneRegex =
        /^(\+?\d{1,3}[- ]?)?(\(?\d{3}\)?[- ]?)?(\d{3}[- ]?\d{4})$/;
      if (!phoneRegex.test(value)) {
        return `${fieldName} must be a valid phone number`;
      }
    }
    return true;
  },

  password: (value: any, fieldName: string): true | string => {
    if (value && typeof value === "string") {
      if (value.length < 8) {
        return `${fieldName} must be at least 8 characters long`;
      }

      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
        value
      );

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        return `${fieldName} must contain at least one uppercase letter, one lowercase letter, one number, and one special character`;
      }
    }
    return true;
  },

  boolean: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      return `${fieldName} must be a boolean value`;
    }
    return true;
  },

  array: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      return `${fieldName} must be an array`;
    }
    return true;
  },

  object: (value: any, fieldName: string): true | string => {
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== "object" || Array.isArray(value))
    ) {
      return `${fieldName} must be an object`;
    }
    return true;
  },

  oneOf:
    (options: any[]) =>
    (value: any, fieldName: string): true | string => {
      if (value !== undefined && value !== null && !options.includes(value)) {
        return `${fieldName} must be one of: ${options.join(", ")}`;
      }
      return true;
    },

  date: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`;
      }
    }
    return true;
  },

  futureDate: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`;
      }
      if (date <= new Date()) {
        return `${fieldName} must be a future date`;
      }
    }
    return true;
  },

  pastDate: (value: any, fieldName: string): true | string => {
    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`;
      }
      if (date >= new Date()) {
        return `${fieldName} must be a past date`;
      }
    }
    return true;
  },

  // Custom validator for comparing two fields (e.g., password confirmation)
  match:
    (matchField: string, errorMessage?: string) =>
    (value: any, fieldName: string, allValues: any): true | string => {
      if (
        value !== undefined &&
        value !== null &&
        value !== allValues[matchField]
      ) {
        return errorMessage || `${fieldName} must match ${matchField}`;
      }
      return true;
    },

  // Custom validator that combines multiple validators
  compose:
    (...validators: ValidatorFunction[]) =>
    (value: any, fieldName: string, allValues: any): true | string => {
      for (const validator of validators) {
        const result = validator(value, fieldName, allValues);
        if (result !== true) {
          return result;
        }
      }
      return true;
    },

  // Custom validator for subject code pattern (ABC-123)
  subjectCodePattern: (value: any, fieldName: string): true | string => {
    if (value && typeof value === "string") {
      const codeRegex = /^[A-Z]{3}-\d{3}$/;
      if (!codeRegex.test(value)) {
        return `${fieldName} must follow the pattern: ABC-123 (3 uppercase letters, hyphen, 3 digits)`;
      }
    }
    return true;
  },
};

// Validation middleware for specific endpoints

// Existing validation middleware for responses
export const validateResponses = (allowEmpty = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { responses } = req.body;

      // Validate responses array exists and is an array
      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({
          error: "Invalid request format",
          message: "Responses must be an array of question answers",
          required: {
            responses: "Array of { questionId: string, optionId: string }",
          },
        });
      }

      // Check if array can be empty based on the allowEmpty parameter
      if (!allowEmpty && responses.length === 0) {
        return res.status(400).json({
          error: "Empty submission",
          message: "Responses array cannot be empty",
          required: {
            responses:
              "Non-empty array of { questionId: string, optionId: string }",
          },
        });
      }

      // Validate individual responses if they exist
      if (responses.length > 0) {
        const invalidResponses = responses.filter(
          (r) => !r || typeof r !== "object" || !r.questionId || !r.optionId
        );

        if (invalidResponses.length > 0) {
          return res.status(400).json({
            error: "Invalid response format",
            message: "Each response must have questionId and optionId fields",
            invalidResponses: invalidResponses.length,
          });
        }
      }

      // If everything is valid, proceed
      next();
    } catch (error) {
      logger.error("Error in response validation middleware:", error);
      return res.status(500).json({
        error: "Server error",
        message: "An error occurred while validating your request",
      });
    }
  };
};

export const validateExamId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { examId } = req.params;

  if (!examId) {
    return res.status(400).json({
      error: "Missing parameter",
      message: "Exam ID is required",
    });
  }

  if (!uuidValidate(examId)) {
    return res.status(400).json({
      error: "Invalid parameter",
      message: "Exam ID must be a valid UUID",
    });
  }

  next();
};

export const validateAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const studentId = req.user?.student?.id;

  if (!studentId) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in as a student to access this resource",
    });
  }

  next();
};

// Validate password strength
export const validatePassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for either newPassword or password field
    const password = req.body.newPassword || req.body.password;

    if (!password) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Password is required",
      });
    }

    // Password must be at least 8 characters long
    if (password.length < 8) {
      return res.status(400).json({
        error: "Weak password",
        message: "Password must be at least 8 characters long",
      });
    }

    // Password must have at least one uppercase letter, one lowercase letter, one number, and one special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password
    );

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        error: "Weak password",
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    // If using the password field, assign it to newPassword for consistency
    if (req.body.password && !req.body.newPassword) {
      req.body.newPassword = req.body.password;
    }

    next();
  } catch (error) {
    logger.error("Error in password validation middleware:", error);
    return res.status(500).json({
      error: "Server error",
      message: "An error occurred while validating the password",
    });
  }
};
