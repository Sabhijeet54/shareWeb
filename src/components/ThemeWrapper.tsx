"use client";
// ─── Theme Wrapper (client component) ────────────────────────────────────
// Wraps children with ThemeProvider for dark/light mode support

import { type ReactNode } from "react";
import { ThemeProvider } from "@/context/ThemeContext";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
