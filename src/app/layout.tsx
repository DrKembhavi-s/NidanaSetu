import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentDoctor } from "@/lib/doctor";
import { logout } from "@/app/login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NidanaSetu",
  description: "AI-assisted diagnostic interpretation for doctors",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const doctor = await getCurrentDoctor();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {doctor && (
          <header className="border-b px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">
              NidanaSetu
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>Dr. {doctor.full_name}</span>
              <form action={logout}>
                <button type="submit" className="underline">
                  Log out
                </button>
              </form>
            </div>
          </header>
        )}
        <main className="flex-1 px-6 py-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
