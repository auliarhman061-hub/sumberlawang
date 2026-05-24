/**
 * Lentera Sumberlawang — Custom Auth Utilities
 * Password hashing using bcryptjs
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Hash a plain-text password */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Verify a plain-text password against a stored hash */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}