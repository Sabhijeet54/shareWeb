"use client";

import { useAuth } from "@/context/AuthContext";
import { DashboardApp } from "@/components/DashboardApp";
import { LoginScreen } from "@/components/LoginScreen";
import type { TabKey } from "@/components/BottomNav";

type AppGateProps = {
  initialTab?: TabKey;
};

function GateContent({ initialTab }: AppGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
      </main>
    );
  }

  return user ? <DashboardApp initialTab={initialTab} /> : <LoginScreen />;
}

export function AppGate({ initialTab }: AppGateProps) {
  return <GateContent initialTab={initialTab} />;
}
