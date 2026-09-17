import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/locale";
import { getTheme } from "@/lib/theme";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoK Kingdom Stats",
  description: "KvK stats dashboard for your kingdom",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <body
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        suppressHydrationWarning
      >
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col bg-slate-50 md:bg-[radial-gradient(120%_80%_at_top_left,_var(--color-slate-100),_var(--color-slate-50)_60%)] dark:bg-slate-950 dark:md:bg-[radial-gradient(120%_80%_at_top_left,_var(--color-slate-900),_var(--color-slate-950)_60%)]">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
