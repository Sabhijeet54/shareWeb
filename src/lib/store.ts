// ─── Zustand Global Store ─────────────────────────────────────────────────
// Manages: watchlist, recently viewed, theme, app preferences

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

interface RecentItem {
  symbol: string;
  name: string;
  timestamp: number;
}

interface AppStore {
  // ── Theme ──
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;

  // ── Custom Watchlist ──
  customWatchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;

  // ── Recently Viewed ──
  recentlyViewed: RecentItem[];
  addRecentlyViewed: (symbol: string, name: string) => void;
  clearRecentlyViewed: () => void;

  // ── Active Market Tab ──
  activeMarketTab: string;
  setActiveMarketTab: (tab: string) => void;

  // ── Search ──
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  lastSearchQuery: string;
  setLastSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Theme ──
      theme: "dark",
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (t) => set({ theme: t }),

      // ── Custom Watchlist ──
      customWatchlist: ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"],
      addToWatchlist: (symbol) =>
        set((s) => ({
          customWatchlist: s.customWatchlist.includes(symbol)
            ? s.customWatchlist
            : [...s.customWatchlist, symbol],
        })),
      removeFromWatchlist: (symbol) =>
        set((s) => ({
          customWatchlist: s.customWatchlist.filter((s2) => s2 !== symbol),
        })),
      isInWatchlist: (symbol) => get().customWatchlist.includes(symbol),

      // ── Recently Viewed ──
      recentlyViewed: [],
      addRecentlyViewed: (symbol, name) =>
        set((s) => {
          const filtered = s.recentlyViewed.filter((r) => r.symbol !== symbol);
          return {
            recentlyViewed: [{ symbol, name, timestamp: Date.now() }, ...filtered].slice(0, 20),
          };
        }),
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // ── Active Market Tab ──
      activeMarketTab: "stocks",
      setActiveMarketTab: (tab) => set({ activeMarketTab: tab }),

      // ── Search ──
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      lastSearchQuery: "",
      setLastSearchQuery: (q) => set({ lastSearchQuery: q }),
    }),
    {
      name: "shareweb-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        // SSR fallback
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        theme: state.theme,
        customWatchlist: state.customWatchlist,
        recentlyViewed: state.recentlyViewed,
        activeMarketTab: state.activeMarketTab,
      }),
    }
  )
);
