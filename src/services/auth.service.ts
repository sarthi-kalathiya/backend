import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../config";
import prisma from "../utils/prismaClient";
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from "../utils/errors";
import { UserRole } from "../constants/user";
import {
  AdminSignupDto,
  LoginDto,
  TokenPayload,
  TokenResponse,
} from "../models/auth.model";
import { UserResponseDto } from "../models/user.model";

export const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign(
    { id: userId, role } as TokenPayload,
    config.app.jwtSecret as jwt.Secret,
    { expiresIn: config.app.jwtExpiresIn }
  );
};

export const generateRefreshToken = (
  userId: string,
  role: UserRole
): string => {
  return jwt.sign(
    { id: userId, role } as TokenPayload,
    config.app.jwtRefreshSecret as jwt.Secret,
    { expiresIn: config.app.jwtRefreshExpiresIn }
  );
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      config.app.jwtRefreshSecret as jwt.Secret
    ) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new UnauthorizedError("Invalid refresh token");
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const adminSignup = async (
  adminData: AdminSignupDto
): Promise<{ user: UserResponseDto } & TokenResponse> => {
  const { firstName, lastName, email, password, contactNumber } = adminData;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError("Email already in use");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create admin user - admin profiles are always considered complete
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      contactNumber,
      profileCompleted: true, // Admin profiles are always complete
    },
  });

  // Generate tokens
  const accessToken = generateToken(user.id, user.role as UserRole);
  const refreshToken = generateRefreshToken(user.id, user.role as UserRole);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as UserRole,
      contactNumber: user.contactNumber,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  };
};

export const signin = async (
  credentials: LoginDto
): Promise<{ user: UserResponseDto } & TokenResponse> => {
  const { email, password } = credentials;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError("Account is inactive");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Generate tokens
  const accessToken = generateToken(user.id, user.role as UserRole);
  const refreshToken = generateRefreshToken(user.id, user.role as UserRole);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as UserRole,
      contactNumber: user.contactNumber,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshAuthToken = async (
  refreshToken: string
): Promise<TokenResponse> => {
  const decoded = verifyRefreshToken(refreshToken);

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid token");
  }

  // Generate new tokens
  const accessToken = generateToken(user.id, user.role as UserRole);
  const newRefreshToken = generateRefreshToken(user.id, user.role as UserRole);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};
