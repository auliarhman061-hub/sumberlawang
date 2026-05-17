import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get user role from Clerk publicMetadata
 * Default: "student" jika tidak ada metadata
 */
export async function getUserRole(userId: string): Promise<string> {
  const { users } = await clerkClient();
  const user = await users.getUser(userId);
  return (user.publicMetadata?.role as string) ?? "student";
}

/**
 * Set user role di Clerk publicMetadata
 * Hanya bisa dipanggil dari API route (bukan client-side)
 */
export async function setUserRole(
  userId: string,
  role: "admin" | "teacher" | "student"
): Promise<void> {
  const { users } = await clerkClient();
  await users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });
}