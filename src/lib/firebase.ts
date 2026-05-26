import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

const firebaseApiKey = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
const firebaseAuthDomain = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
const firebaseProjectId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const firebaseStorageBucket = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
const firebaseMessagingSenderId = cleanEnv(
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
);
const firebaseAppId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

const missingFirebaseEnv = [
  !firebaseApiKey && "NEXT_PUBLIC_FIREBASE_API_KEY",
  !firebaseAuthDomain && "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  !firebaseProjectId && "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  !firebaseStorageBucket && "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  !firebaseMessagingSenderId && "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  !firebaseAppId && "NEXT_PUBLIC_FIREBASE_APP_ID",
].filter(Boolean) as string[];

if (missingFirebaseEnv.length) {
  throw new Error(
    `Missing Firebase env vars: ${missingFirebaseEnv.join(", ")}`,
  );
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Firebase can reject persistence in restricted browser modes.
  });
}

export const adminEmail =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@example.com";

export const adminUpiId =
  process.env.NEXT_PUBLIC_ADMIN_UPI_ID ?? "admin@upi";
