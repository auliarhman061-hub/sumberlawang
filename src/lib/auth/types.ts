/**
 * Lentera Sumberlawang — Auth Types
 */

export type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface SessionPayload {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}