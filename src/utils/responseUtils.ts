import { Response } from 'express';
import { logger } from './logger';

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Standard success response format
 */
interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Send a consistent error response
 */
export const sendError = (
  res: Response, 
  status: number, 
  error: string, 
  message: string, 
  details?: any
) => {
  const errorResponse: ErrorResponse = {
    error,
    message
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  return res.status(status).json(errorResponse);
};

/**
 * Send a consistent validation error response
 */
export const sendValidationError = (
  res: Response,
  message: string,
  details?: any
) => {
  return sendError(res, 400, 'Validation Error', message, details);
};

/**
 * Send a consistent not found error response
 */
export const sendNotFoundError = (
  res: Response,
  entity: string,
  message?: string
) => {
  return sendError(
    res, 
    404, 
    'Not Found', 
    message || `The requested ${entity} could not be found`
  );
};

/**
 * Send a consistent authentication error response
 */
export const sendAuthError = (
  res: Response,
  message: string = 'Authentication required'
) => {
  return sendError(res, 401, 'Authentication Error', message);
};

/**
 * Send a consistent permission error response
 */
export const sendForbiddenError = (
  res: Response,
  message: string = 'You do not have permission to perform this action'
) => {
  return sendError(res, 403, 'Permission Denied', message);
};

/**
 * Send a consistent server error response
 */
export const sendServerError = (
  res: Response,
  error: any,
  message: string = 'An unexpected error occurred'
) => {
  logger.error('Server error:', error);
  return sendError(res, 500, 'Server Error', message);
};

/**
 * Send a consistent success response
 */
export const sendSuccess = <T>(
  res: Response, 
  data: T, 
  message?: string,
  status: number = 200
) => {
  const response: SuccessResponse<T> = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(status).json(response);
}; 