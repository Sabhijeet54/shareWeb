"use client";

import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { adminEmail, auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types/app";

type AuthContextValue = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeProfile?.();
      setUser(currentUser);

      if (!currentUser?.email) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userRef,
        {
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email.split("@")[0],
          walletBalance: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        setProfile(snapshot.data() as AppUser);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAdmin:
        Boolean(user?.email) &&
        user?.email?.toLowerCase() === adminEmail.toLowerCase(),
      login,
      logout,
    }),
    [loading, login, logout, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
