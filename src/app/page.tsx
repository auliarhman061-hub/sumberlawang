/**
 * Root page — redirect berdasarkan session
 * Jika sudah login → redirect ke dashboard sesuai role
 * Jika belum login → redirect ke /sign-in
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("lentera_session");

  if (sessionCookie) {
    // Ada session cookie → coba ambil user info dari /api/auth/me
    // Tapi karena ini server component, kita tidak bisa panggil API internal
    // Solusi: redirect ke /sign-in, middleware akan handle redirect ke dashboard
    redirect("/sign-in");
  } else {
    redirect("/sign-in");
  }
}