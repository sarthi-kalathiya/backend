import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { BadRequestError } from "../utils/errors";
import { successResponse } from "../utils/response";
import {
  AdminSignupDto,
  LoginDto,
  RefreshTokenDto,
} from "../models/auth.model";

export const adminSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminData: AdminSignupDto = req.body;

    if (
      !adminData.firstName ||
      !adminData.lastName ||
      !adminData.email ||
      !adminData.password
    ) {
      throw new BadRequestError(
        "Please provide firstName, lastName, email and password"
      );
    }

    const result = await authService.adminSignup(adminData);
    return successResponse(res, result, "Admin registered successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const userSignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credentials: LoginDto = req.body;

    if (!credentials.email || !credentials.password) {
      throw new BadRequestError("Please provide email and password");
    }

    const result = await authService.signin(credentials);
    return successResponse(res, result, "User logged in successfully");
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body as RefreshTokenDto;

    if (!refreshToken) {
      throw new BadRequestError("Please provide refresh token");
    }

    const result = await authService.refreshAuthToken(refreshToken);
    return successResponse(res, result, "Token refreshed successfully");
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  // JWT is stateless, so we don't need to do anything server-side
  // The client should discard the tokens
  return successResponse(res, null, "Logged out successfully");
};
