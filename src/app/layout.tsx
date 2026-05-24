import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lentera Sumberlawang — Sistem Presensi Digital SMAN 1 Sumberlawang",
  description:
    "Sistem Presensi Digital berbasis RFID untuk SMAN 1 Sumberlawang. Pantau kehadiran siswa secara real-time.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}