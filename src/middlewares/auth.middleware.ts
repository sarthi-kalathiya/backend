import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import prisma from "../utils/prismaClient";
import { UserRole } from "../constants/user";
import { TokenPayload } from "../models/auth.model";

const verifyAuthAndGetUser = async (
  req: Request,
  options?: {
    requiredRole?: UserRole;
    checkProfileCompletion?: boolean;
  }
) => {
  // Extract and validate auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("No authentication token provided");
  }

  const token = authHeader.split(" ")[1];

  // Verify JWT token
  const decoded = (jwt.verify as any)(
    token,
    config.app.jwtSecret
  ) as TokenPayload;

  // Find user in database with profile information
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      teacher: true,
      student: true,
    },
  });

  // Check if user exists
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError("User is inactive");
  }

  // Check role if required
  if (options?.requiredRole && user.role !== options.requiredRole) {
    throw new ForbiddenError(`${options.requiredRole} role required`);
  }

  return { user, profileCompleted: user.profileCompleted };
};

const createAuthMiddleware = (options?: {
  requiredRole?: UserRole;
  checkProfileCompletion?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = await verifyAuthAndGetUser(req, options);

      // Attach user to request
      req.user = user;

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new UnauthorizedError("Invalid token"));
      }
      next(error);
    }
  };
};

export const authenticateAdmin = createAuthMiddleware({
  requiredRole: UserRole.ADMIN,
});

// Middleware for teacher authentication with profile completion check
export const authenticateTeacher = createAuthMiddleware({
  requiredRole: UserRole.TEACHER,
  checkProfileCompletion: true,
});

// Middleware for student authentication with profile completion check
export const authenticateStudent = createAuthMiddleware({
  requiredRole: UserRole.STUDENT,
  checkProfileCompletion: true,
});

// Middleware for basic authentication with profile completion check
export const authenticate = createAuthMiddleware({
  checkProfileCompletion: true,
});

// Middleware to check if a profile is completed (for protected routes)
export const requireProfileCompletion = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }

  // Only check profile completion for students and teachers
  if (
    (req.user.role === UserRole.STUDENT ||
      req.user.role === UserRole.TEACHER) &&
    !req.user.profileCompleted
  ) {
    return next(
      new ForbiddenError(
        "Profile setup required before accessing this resource"
      )
    );
  }

  next();
};

// ----
