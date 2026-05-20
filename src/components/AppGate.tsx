"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DashboardApp } from "@/components/DashboardApp";
import { LoginScreen } from "@/components/LoginScreen";

function GateContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b10] text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
      </main>
    );
  }

  return user ? <DashboardApp /> : <LoginScreen />;
}

export function AppGate() {
  return (
    <AuthProvider>
      <GateContent />
    </AuthProvider>
  );
}
