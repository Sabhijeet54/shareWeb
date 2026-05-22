import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeWrapper } from "@/components/ThemeWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShareWeb – Indian Market Trading",
  description: "Professional NSE/BSE trading platform with live market data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      data-theme="dark"
    >
      <body
        className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]"
        suppressHydrationWarning
      >
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
