import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const validateResponses = (allowEmpty = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { responses } = req.body;

      // Validate responses array exists and is an array
      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({ 
          error: 'Invalid request format',
          message: 'Responses must be an array of question answers',
          required: {
            responses: 'Array of { questionId: string, optionId: string }'
          }
        });
      }

      // Check if array can be empty based on the allowEmpty parameter
      if (!allowEmpty && responses.length === 0) {
        return res.status(400).json({ 
          error: 'Empty submission',
          message: 'Responses array cannot be empty',
          required: {
            responses: 'Non-empty array of { questionId: string, optionId: string }'
          }
        });
      }

      // Validate individual responses if they exist
      if (responses.length > 0) {
        const invalidResponses = responses.filter(
          (r) => !r || typeof r !== 'object' || !r.questionId || !r.optionId
        );
        
        if (invalidResponses.length > 0) {
          return res.status(400).json({
            error: 'Invalid response format',
            message: 'Each response must have questionId and optionId fields',
            invalidResponses: invalidResponses.length
          });
        }
      }

      // If everything is valid, proceed
      next();
    } catch (error) {
      logger.error('Error in response validation middleware:', error);
      return res.status(500).json({ 
        error: 'Server error',
        message: 'An error occurred while validating your request'
      });
    }
  };
};

export const validateExamId = (req: Request, res: Response, next: NextFunction) => {
  const { examId } = req.params;
  
  if (!examId) {
    return res.status(400).json({ 
      error: 'Missing parameter',
      message: 'Exam ID is required'
    });
  }
  
  next();
};

export const validateAuth = (req: Request, res: Response, next: NextFunction) => {
  const studentId = req.user?.student?.id;
  
  if (!studentId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in as a student to access this resource'
    });
  }
  
  next();
};

// Validate password strength
export const validatePassword = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for either newPassword or password field
    const password = req.body.newPassword || req.body.password;

    if (!password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Password is required',
      });
    }

    // Password must be at least 8 characters long
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long',
      });
    }

    // Password must have at least one uppercase letter, one lowercase letter, one number, and one special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      });
    }

    // If using the password field, assign it to newPassword for consistency
    if (req.body.password && !req.body.newPassword) {
      req.body.newPassword = req.body.password;
    }

    next();
  } catch (error) {
    logger.error('Error in password validation middleware:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while validating the password',
    });
  }
}; 