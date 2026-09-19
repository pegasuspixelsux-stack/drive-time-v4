import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";

export interface CurrentUser {
  email: string;
  name: string;
  role: string;
}

let authInstance: ReturnType<typeof getAuth> | null = null;

function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\-_]/).filter(Boolean);
  if (parts.length === 0) return "Admin";
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toCurrentUser(user: User): CurrentUser {
  const email = user.email ?? "";
  return {
    email,
    name: user.displayName || deriveNameFromEmail(email),
    role: "Admin",
  };
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Correo electrónico o contraseña incorrectos.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/too-many-requests": "Demasiados intentos. Intenta de nuevo más tarde.",
};

export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  return (code && AUTH_ERROR_MESSAGES[code]) || "No se pudo iniciar sesión. Intenta de nuevo.";
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuth(callback: (user: CurrentUser | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    callback(user ? toCurrentUser(user) : null);
  });
}
