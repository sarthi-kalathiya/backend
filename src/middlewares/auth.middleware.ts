import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import prisma from '../utils/prismaClient';
import { UserRole } from '../constants/user';
import { TokenPayload } from '../models/auth.model';

// No need for global declaration as it's in src/types/express.d.ts

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.app.jwtSecret as jwt.Secret) as TokenPayload;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        student: true,
        teacher: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User is inactive');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

export const authorizeAdmin = authorize(UserRole.ADMIN);
export const authorizeTeacher = authorize(UserRole.TEACHER);
export const authorizeStudent = authorize(UserRole.STUDENT);
export const authorizeTeacherOrAdmin = authorize(UserRole.TEACHER, UserRole.ADMIN);
export const authorizeStudentOrTeacher = authorize(UserRole.STUDENT, UserRole.TEACHER); 