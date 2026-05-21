"use client";
// ─── Theme Provider ──────────────────────────────────────────────────────
// Syncs Zustand theme state with the document root class and CSS custom props.
// Handles hydration by using useEffect for DOM updates only.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAppStore, type ThemeMode } from "@/lib/store";

const ThemeContext = createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
}>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storeTheme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(storeTheme);
    root.setAttribute("data-theme", storeTheme);
  }, [storeTheme, mounted]);

  // Always render with "dark" on server to match the html className
  const theme = mounted ? storeTheme : "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
