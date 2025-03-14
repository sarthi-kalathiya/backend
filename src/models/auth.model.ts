import { UserRole } from '../constants/user';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AdminSignupDto {
  name: string;
  email: string;
  password: string;
  contactNumber: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  newPassword: string;
} 