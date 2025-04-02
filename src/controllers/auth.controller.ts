import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { BadRequestError } from "../utils/errors";
import { successResponse } from "../utils/response";
import {
  AdminSignupDto,
  LoginDto,
  RefreshTokenDto,
} from "../models/auth.model";

// Admin signup
export const adminSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminData: AdminSignupDto = req.body;
    const result = await authService.adminSignup(adminData);
    return successResponse(res, result, "Admin registered successfully", 201);
  } catch (error) {
    next(error);
  }
};

// User signin
export const userSignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credentials: LoginDto = req.body;

    const result = await authService.signin(credentials);
    return successResponse(res, result, "User logged in successfully");
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body as RefreshTokenDto;
    const result = await authService.refreshAuthToken(refreshToken);
    return successResponse(res, result, "Token refreshed successfully");
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = (req: Request, res: Response) => {
  return successResponse(res, null, "Logged out successfully");
};
