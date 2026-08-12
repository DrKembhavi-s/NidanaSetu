import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentDoctor } from "@/lib/doctor";
import { logout } from "@/app/login/actions";
import { Footer } from "@/components/Footer";

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
          <header className="print:hidden bg-brand-700 text-white px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wide">
              NidanaSetu
            </Link>
            <div className="flex items-center gap-4 text-sm text-brand-50">
              <span>
                Dr. {doctor.full_name}
                {doctor.clinic_name ? ` · ${doctor.clinic_name}` : ""}
              </span>
              <Link href="/profile" className="underline hover:text-white">
                Profile
              </Link>
              <form action={logout}>
                <button type="submit" className="underline hover:text-white">
                  Log out
                </button>
              </form>
            </div>
          </header>
        )}
        <main className="flex-1 px-6 py-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
