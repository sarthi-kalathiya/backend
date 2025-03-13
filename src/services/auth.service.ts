import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config';
import prisma from '../utils/prismaClient';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../utils/errors';
import { UserRole } from '../constants/roles';

export const generateToken = (userId: string, role: string) => {
  return jwt.sign(
    { id: userId, role },
    config.app.jwtSecret,
    { expiresIn: config.app.jwtExpiresIn }
  );
};

export const generateRefreshToken = (userId: string, role: string) => {
  return jwt.sign(
    { id: userId, role },
    config.app.jwtRefreshSecret,
    { expiresIn: config.app.jwtRefreshExpiresIn }
  );
};

export const verifyRefreshToken = (token: string) => {
  try {
    const decoded: any = jwt.verify(token, config.app.jwtRefreshSecret);
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};

export const adminSignup = async (name: string, email: string, password: string) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new BadRequestError('Email already in use');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create admin user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN
    }
  });

  // Generate tokens
  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token,
    refreshToken
  };
};

export const signin = async (email: string, password: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token,
    refreshToken
  };
};

export const refreshAuthToken = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken);
  
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.id }
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid token');
  }

  // Generate new tokens
  const newToken = generateToken(user.id, user.role);
  const newRefreshToken = generateRefreshToken(user.id, user.role);

  return {
    token: newToken,
    refreshToken: newRefreshToken
  };
}; 