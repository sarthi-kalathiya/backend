import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { validate as uuidValidate } from "uuid";

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
      const phoneRegex = /^\d{9,11}$/;
      if (!phoneRegex.test(value)) {
        return `${fieldName} must be a valid phone number`;
      }
    }
    return true;
  },

  rollNumber: (value: any, fieldName: string): true | string => {
    if (value && typeof value === "string") {
      const rollNumberRegex = /^[a-zA-Z0-9]{2,10}$/;
      if (!rollNumberRegex.test(value)) {
        return `${fieldName} must be a valid rollNumber`;
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

  // Validates that each item in an array passes a primitive validator (like uuid, email, etc)
  arrayItems: 
    (itemValidator: ValidatorFunction) =>
    (value: any, fieldName: string): true | string => {
      if (!Array.isArray(value)) return `${fieldName} must be an array`;
      
      for (let i = 0; i < value.length; i++) {
        const result = itemValidator(value[i], `${fieldName}[${i}]`);
        if (result !== true) {
          return result;
        }
      }
      
      return true;
    },

  // Validates that each object in an array conforms to a schema
  arrayObjects:
    (schema: Record<string, ValidatorFunction>) =>
    (value: any, fieldName: string): true | string => {
      if (!Array.isArray(value)) return `${fieldName} must be an array`;
      
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        
        // Check each field in the schema
        for (const [key, validator] of Object.entries(schema)) {
          const result = validator(item[key], `${fieldName}[${i}].${key}`);
          if (result !== true) {
            return result;
          }
        }
      }
      
      return true;
    },
};

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