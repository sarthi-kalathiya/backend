import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { BadRequestError } from '../utils/errors';
import { successResponse } from '../utils/response';

export const adminSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new BadRequestError('Please provide name, email and password');
    }

    const result = await authService.adminSignup(name, email, password);
    return successResponse(res, result, 'Admin registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const adminSignin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Please provide email and password');
    }

    const result = await authService.signin(email, password);
    return successResponse(res, result, 'Admin logged in successfully');
  } catch (error) {
    next(error);
  }
};

export const userSignin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Please provide email and password');
    }

    const result = await authService.signin(email, password);
    return successResponse(res, result, 'User logged in successfully');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Please provide refresh token');
    }

    const result = await authService.refreshAuthToken(refreshToken);
    return successResponse(res, result, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  // JWT is stateless, so we don't need to do anything server-side
  // The client should discard the tokens
  return successResponse(res, null, 'Logged out successfully');
}; 