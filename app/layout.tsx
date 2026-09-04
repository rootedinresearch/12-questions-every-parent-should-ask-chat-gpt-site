import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Poppins", "Helvetica Neue", "Arial", "sans-serif"],
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-800.woff2", weight: "800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "12 Questions Every Parent Should Ask | British Swim School",
  description: "A quick parent guide to choosing the right swim school—from safety and teaching quality to scheduling and flexibility.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
