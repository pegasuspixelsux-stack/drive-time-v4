# Firebase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock `localStorage` persistence in the admin dashboard with real Firebase (Auth, Firestore, Storage), and connect the public site's inventory display and lead-capture forms to the same data.

**Architecture:** Client-only Firebase (no Admin SDK available). Firestore Security Rules are the sole access-control layer: `inventory` is publicly readable, everything else requires a signed-in user, and `leads` allows public `create` so site visitors can submit inquiries. Four thin `lib/firebase/*` modules wrap Firestore/Storage/Auth behind the same function names the existing pages already call, so page components change minimally.

**Tech Stack:** Next.js 16 (App Router), React 19, `firebase` `^12.19.0` (modular v9+ client SDK), TypeScript, Tailwind CSS 4. No test framework exists in this repo — verification is `npx tsc --noEmit` plus manual dev-server checks, consistent with prior work here.

**Spec:** `docs/superpowers/specs/2026-09-19-firebase-integration-design.md`

## Global Constraints

- `firebase` `^12.19.0` is already installed and `lib/firebase.ts` already exports `firebaseApp`, initialized from `NEXT_PUBLIC_FIREBASE_*` env vars in `.env.local`. Do not re-install or re-initialize it.
- No Firebase Admin SDK / service account is available. Never write code that assumes server-side privilege — all access control is Firestore/Storage Security Rules.
- The Firebase CLI on this machine is logged into a different account than the one that owns the `drive-time-v3` project. Do not attempt `firebase deploy`. Rules files are committed to the repo for the user to paste into the Console (or deploy themselves once `firebase use` is pointed correctly).
- No test framework exists in this repo. Every task's verification is `npx tsc --noEmit` (must show no output / exit 0) plus a manual dev-server check described in the task. Do not add Jest/Vitest/etc. — out of scope.
- Preserve existing UI/visual conventions exactly: the dashboard uses literal Tailwind `slate`/`indigo` utilities (not the homepage's CSS-variable theme tokens), and all UI copy is Spanish, matching `docs/superpowers/specs/2026-09-16-admin-dashboard-design.md`.
- Keep the existing lightweight-confirm delete pattern (button becomes "¿Confirmar?" on first click) — never introduce `window.confirm`.
- The dev server for this project already runs on port 3006 in this environment (see prior session state) — use `npm run dev -- -p 3006` if you need to start it, and check `netstat`/existing processes first rather than assuming the port is free.

---

## Task 1: Firebase data-access foundation

**Files:**
- Create: `lib/firebase/db.ts`
- Create: `lib/firebase/storage.ts`
- Modify: `lib/image-hosts.ts`

**Interfaces:**
- Consumes: `firebaseApp` from `lib/firebase.ts` (already exists, exports the initialized `FirebaseApp`).
- Produces: `getFirebaseDb(): Firestore` (lazy singleton) from `lib/firebase/db.ts`, used by every hook in Tasks 2–5. `uploadInventoryImage(file: File, carId: string): Promise<string>` from `lib/firebase/storage.ts`, used by Task 9.

- [ ] **Step 1: Create the lazy Firestore accessor**

Create `lib/firebase/db.ts`:

```ts
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

let dbInstance: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(firebaseApp);
  }
  return dbInstance;
}
```

- [ ] **Step 2: Create the Storage upload helper**

Create `lib/firebase/storage.ts`:

```ts
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage";
import { firebaseApp } from "@/lib/firebase";

let storageInstance: FirebaseStorage | null = null;

function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(firebaseApp);
  }
  return storageInstance;
}

export async function uploadInventoryImage(file: File, carId: string): Promise<string> {
  const storage = getFirebaseStorage();
  const path = `inventory/${carId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
```

- [ ] **Step 3: Allow Firebase Storage URLs through the image allowlist**

`next/image` and the inventory form's URL validator both check `lib/image-hosts.ts`'s `ALLOWED_IMAGE_HOSTS`. Firebase Storage download URLs are served from `firebasestorage.googleapis.com` — without adding it here, an uploaded photo would fail `next/image` rendering and fail the form's own validation.

Modify `lib/image-hosts.ts`:

```diff
-export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com"] as const;
+export const ALLOWED_IMAGE_HOSTS = [
+  "images.unsplash.com",
+  "firebasestorage.googleapis.com",
+] as const;
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

- [ ] **Step 5: Commit**

```bash
git add lib/firebase/db.ts lib/firebase/storage.ts lib/image-hosts.ts
git commit -m "feat: add Firestore/Storage accessors and allow Firebase Storage image host"
```

---

## Task 2: Firestore inventory module

**Files:**
- Create: `lib/firebase/inventory.ts`

**Interfaces:**
- Consumes: `getFirebaseDb()` (Task 1). `InventoryItem`, `InventoryStatus` types from `lib/dashboard-data.ts` (already exist, unchanged).
- Produces: `useInventory(): { items: InventoryItem[], loading: boolean, error: string | null, addVehicle(item: InventoryItem): Promise<void>, updateVehicle(id: string, patch: Partial<Omit<InventoryItem, "id">>): Promise<void>, deleteVehicle(id: string): Promise<void> }` — used by Task 9 (dashboard inventory page) and Task 13 (dashboard overview). `getInventoryOnce(): Promise<InventoryItem[]>` — a one-time (non-realtime) fetch, used by Task 14 (public homepage grid and the server-component detail page, which cannot use `onSnapshot`).

- [ ] **Step 1: Write the module**

Create `lib/firebase/inventory.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/db";
import type { InventoryItem } from "@/lib/dashboard-data";

const COLLECTION = "inventory";

function toInventoryItem(id: string, data: Record<string, unknown>): InventoryItem {
  return { id, ...(data as Omit<InventoryItem, "id">) };
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => toInventoryItem(docSnap.id, docSnap.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  async function addVehicle(item: InventoryItem): Promise<void> {
    const db = getFirebaseDb();
    const { id, ...data } = item;
    await setDoc(doc(db, COLLECTION, id), data);
  }

  async function updateVehicle(id: string, patch: Partial<Omit<InventoryItem, "id">>): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION, id), patch);
  }

  async function deleteVehicle(id: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, COLLECTION, id));
  }

  return { items, loading, error, addVehicle, updateVehicle, deleteVehicle };
}

export async function getInventoryOnce(): Promise<InventoryItem[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((docSnap) => toInventoryItem(docSnap.id, docSnap.data()));
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/firebase/inventory.ts
git commit -m "feat: add Firestore inventory hook and one-time fetch helper"
```

---

## Task 3: Firestore leads module

**Files:**
- Create: `lib/firebase/leads.ts`

**Interfaces:**
- Consumes: `getFirebaseDb()` (Task 1). `Lead`, `LeadStatus` types from `lib/dashboard-data.ts`.
- Produces: `useLeads(): { items: Lead[], loading: boolean, error: string | null, updateStatus(id: string, status: LeadStatus): Promise<void>, deleteLead(id: string): Promise<void> }` — used by Task 10 and Task 13. `createLead(input: { name: string, email: string, phone: string, interestedIn: string, source: string }): Promise<void>` — used by Task 15 (public forms).

- [ ] **Step 1: Write the module**

Create `lib/firebase/leads.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/db";
import type { Lead, LeadStatus } from "@/lib/dashboard-data";

const COLLECTION = "leads";

function toLead(id: string, data: Record<string, unknown>): Lead {
  const createdAt = data.createdAt;
  const createdAtIso =
    createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : String(createdAt ?? "");
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    interestedIn: String(data.interestedIn ?? ""),
    source: String(data.source ?? ""),
    status: (data.status as LeadStatus) ?? "New",
    createdAt: createdAtIso,
  };
}

export function useLeads() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => toLead(docSnap.id, docSnap.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  async function updateStatus(id: string, status: LeadStatus): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION, id), { status });
  }

  async function deleteLead(id: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, COLLECTION, id));
  }

  return { items, loading, error, updateStatus, deleteLead };
}

export interface NewLeadInput {
  name: string;
  email: string;
  phone: string;
  interestedIn: string;
  source: string;
}

export async function createLead(input: NewLeadInput): Promise<void> {
  const db = getFirebaseDb();
  await addDoc(collection(db, COLLECTION), {
    ...input,
    status: "New",
    createdAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/firebase/leads.ts
git commit -m "feat: add Firestore leads hook and public createLead helper"
```

---

## Task 4: Firestore messages module

**Files:**
- Create: `lib/firebase/messages.ts`

**Interfaces:**
- Consumes: `getFirebaseDb()` (Task 1). `ContactMessage` type from `lib/dashboard-data.ts`.
- Produces: `useMessages(): { items: ContactMessage[], loading: boolean, error: string | null, markRead(id: string): Promise<void>, deleteMessage(id: string): Promise<void> }` — used by Task 11 and Task 13.

- [ ] **Step 1: Write the module**

Create `lib/firebase/messages.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/db";
import type { ContactMessage } from "@/lib/dashboard-data";

const COLLECTION = "messages";

function toMessage(id: string, data: Record<string, unknown>): ContactMessage {
  const receivedAt = data.receivedAt;
  const receivedAtIso =
    receivedAt instanceof Timestamp ? receivedAt.toDate().toISOString() : String(receivedAt ?? "");
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    subject: String(data.subject ?? ""),
    message: String(data.message ?? ""),
    receivedAt: receivedAtIso,
    read: Boolean(data.read),
  };
}

export function useMessages() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => toMessage(docSnap.id, docSnap.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  async function markRead(id: string): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION, id), { read: true });
  }

  async function deleteMessage(id: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, COLLECTION, id));
  }

  return { items, loading, error, markRead, deleteMessage };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/firebase/messages.ts
git commit -m "feat: add Firestore messages hook"
```

---

## Task 5: Firestore team users module

**Files:**
- Create: `lib/firebase/users.ts`

**Interfaces:**
- Consumes: `getFirebaseDb()` (Task 1). `TeamRole`, `TeamUser` types from `lib/dashboard-data.ts`.
- Produces: `useTeamUsers(): { items: TeamUser[], loading: boolean, error: string | null, addUser(input: Omit<TeamUser, "id">): Promise<void>, updateRole(id: string, role: TeamRole): Promise<void>, deleteUser(id: string): Promise<void> }` — used by Task 12.

- [ ] **Step 1: Write the module**

Create `lib/firebase/users.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/db";
import type { TeamRole, TeamUser } from "@/lib/dashboard-data";

const COLLECTION = "users";

function toTeamUser(id: string, data: Record<string, unknown>): TeamUser {
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: (data.role as TeamRole) ?? "Sales",
    status: (data.status as TeamUser["status"]) ?? "Active",
  };
}

export function useTeamUsers() {
  const [items, setItems] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => toTeamUser(docSnap.id, docSnap.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  async function addUser(input: Omit<TeamUser, "id">): Promise<void> {
    const db = getFirebaseDb();
    await addDoc(collection(db, COLLECTION), input);
  }

  async function updateRole(id: string, role: TeamRole): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, COLLECTION, id), { role });
  }

  async function deleteUser(id: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, COLLECTION, id));
  }

  return { items, loading, error, addUser, updateRole, deleteUser };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/firebase/users.ts
git commit -m "feat: add Firestore team users hook"
```

---

## Task 6: Real Firebase Authentication in `lib/auth.ts`

**Files:**
- Modify: `lib/auth.ts` (full replacement)

**Interfaces:**
- Consumes: `firebaseApp` from `lib/firebase.ts`.
- Produces: `login(email: string, password: string): Promise<void>`, `logout(): Promise<void>`, `subscribeToAuth(callback: (user: CurrentUser | null) => void): Unsubscribe`, `friendlyAuthError(error: unknown): string`, and the `CurrentUser` interface (`{ email: string, name: string, role: string }`, unchanged shape). Used by Task 7 (dashboard layout/sidebar) and Task 8 (login page). Note: `getCurrentUser()` and the old synchronous `isAuthenticated()` are removed — callers must use `subscribeToAuth` instead, since Firebase Auth state is only available asynchronously.

- [ ] **Step 1: Replace the file**

Replace the full contents of `lib/auth.ts`:

```ts
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
```

- [ ] **Step 2: Verify (expect errors from downstream callers — that's expected until Tasks 7–8 land)**

Run: `npx tsc --noEmit`
Expected: errors in `app/login/page.tsx`, `app/dashboard/layout.tsx`, and `components/dashboard/sidebar.tsx` — they still call the old `login(email)` / `isAuthenticated()` / `getCurrentUser()` signatures. This is fine; Tasks 7–8 fix them next. Confirm the errors are ONLY in those three files (no unrelated breakage).

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: back lib/auth.ts with real Firebase Authentication"
```

---

## Task 7: Wire dashboard layout + sidebar to real auth

**Files:**
- Modify: `app/dashboard/layout.tsx` (full replacement)
- Modify: `components/dashboard/sidebar.tsx` (full replacement)

**Interfaces:**
- Consumes: `subscribeToAuth`, `logout`, `type CurrentUser` from `lib/auth.ts` (Task 6).
- Produces: `Sidebar` now takes a required `currentUser: CurrentUser` prop instead of reading it itself.

- [ ] **Step 1: Replace the dashboard layout**

Replace the full contents of `app/dashboard/layout.tsx`:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuth, type CurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUser(user);
      setReady(true);
    });
    return unsubscribe;
  }, [router]);

  if (!ready || !currentUser) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Replace the sidebar**

Replace the full contents of `components/dashboard/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Target,
  Mail,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { logout, type CurrentUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventario", href: "/dashboard/inventory", icon: Car },
  { label: "Prospectos", href: "/dashboard/leads", icon: Target },
  { label: "Contacto", href: "/dashboard/contact", icon: Mail },
  { label: "Usuarios", href: "/dashboard/users", icon: Users },
];

export function Sidebar({ currentUser }: { currentUser: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials =
    currentUser.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-shrink-0 flex-col border-r border-slate-200 bg-white lg:w-64">
      <div className="flex h-16 items-center justify-center px-2 lg:justify-start lg:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-slate-900"
          title="DriveTime"
        >
          <span className="lg:hidden">DT</span>
          <span className="hidden lg:inline">DriveTime</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-3">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-2 lg:p-4">
        <div className="flex items-center justify-center gap-3 rounded-xl px-2 py-2 lg:justify-start">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initials}
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium text-slate-900">{currentUser.name}</p>
            <p className="truncate text-xs text-slate-500">{currentUser.role}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 lg:flex-row">
          <button
            type="button"
            aria-label="Configuración"
            title="Configuración"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center gap-2 rounded-lg text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:w-auto lg:flex-1"
          >
            <Settings size={16} />
            <span className="hidden lg:inline">Configuración</span>
          </button>
          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={handleLogout}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center gap-2 rounded-lg text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 lg:w-auto lg:flex-1"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors referencing `app/dashboard/layout.tsx` or `components/dashboard/sidebar.tsx` (errors may remain in `app/login/page.tsx` until Task 8).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/layout.tsx components/dashboard/sidebar.tsx
git commit -m "feat: gate dashboard on real Firebase auth state"
```

---

## Task 8: Wire login page to real auth

**Files:**
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `login`, `friendlyAuthError` from `lib/auth.ts` (Task 6).

- [ ] **Step 1: Update the submit handler and imports**

In `app/login/page.tsx`, change the import and `handleSubmit`:

```diff
-import { login } from "@/lib/auth";
+import { login, friendlyAuthError } from "@/lib/auth";
```

```diff
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
+  const [submitting, setSubmitting] = useState(false);

-  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
+  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
     event.preventDefault();
     const nextErrors: { email?: string; password?: string } = {};
     if (!email.trim()) nextErrors.email = "El correo electrónico es obligatorio";
     if (!password.trim()) nextErrors.password = "La contraseña es obligatoria";
     setErrors(nextErrors);
     if (Object.keys(nextErrors).length > 0) return;

-    login(email.trim());
-    router.push("/dashboard");
+    setSubmitting(true);
+    try {
+      await login(email.trim(), password);
+      router.push("/dashboard");
+    } catch (error) {
+      setErrors({ password: friendlyAuthError(error) });
+    } finally {
+      setSubmitting(false);
+    }
   };
```

- [ ] **Step 2: Disable the submit button while submitting**

```diff
             <motion.button
               type="submit"
+              disabled={submitting}
               whileHover={{ scale: 1.01 }}
               whileTap={{ scale: 0.98 }}
               transition={{ duration: 0.15, ease: "easeOut" }}
-              className="mt-2 flex h-12 items-center justify-center rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground"
+              className="mt-2 flex h-12 items-center justify-center rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
             >
-              Iniciar sesión
+              {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
             </motion.button>
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Manual check**

Run `npm run dev -- -p 3006` (check the port isn't already in use first), open `http://localhost:3006/login`, submit the form with any email/password. Since Firebase Auth prerequisites (Console setup) likely aren't done yet, expect a real Firebase error (e.g. "auth/invalid-credential" mapped to the Spanish message) to appear under the password field, instead of silently navigating to `/dashboard` — this confirms the mock bypass is gone. Once the user has created a real admin account in the Console, the same form should successfully sign in and redirect.

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: require real Firebase credentials on the login form"
```

---

## Task 9: Wire inventory dashboard page to Firestore + image upload

**Files:**
- Modify: `app/dashboard/inventory/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useInventory` (Task 2), `uploadInventoryImage` (Task 1).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/dashboard/inventory/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { StatusPill } from "@/components/dashboard/status-pill";
import { DashboardField, dashboardInputClass } from "@/components/dashboard/form-field";
import { InstagramPostModal } from "@/components/dashboard/instagram-post-modal";
import { useInventory } from "@/lib/firebase/inventory";
import { uploadInventoryImage } from "@/lib/firebase/storage";
import type { InventoryItem, InventoryStatus } from "@/lib/dashboard-data";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STATUS_OPTIONS: InventoryStatus[] = ["Available", "Reserved", "Sold"];

const STATUS_TONE: Record<InventoryStatus, "green" | "amber" | "slate"> = {
  Available: "green",
  Reserved: "amber",
  Sold: "slate",
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  Available: "Disponible",
  Reserved: "Reservado",
  Sold: "Vendido",
};

type DraftVehicle = {
  make: string;
  model: string;
  trim: string;
  year: string;
  price: string;
  mileage: string;
  status: InventoryStatus;
  image: string;
};

const EMPTY_DRAFT: DraftVehicle = {
  make: "",
  model: "",
  trim: "",
  year: String(new Date().getFullYear()),
  price: "",
  mileage: "",
  status: "Available",
  image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
};

function toDraft(item: InventoryItem): DraftVehicle {
  return {
    make: item.make,
    model: item.model,
    trim: item.trim,
    year: String(item.year),
    price: String(item.price),
    mileage: String(item.mileage),
    status: item.status,
    image: item.image,
  };
}

export default function InventoryPage() {
  const { items: inventory, loading, addVehicle, updateVehicle, deleteVehicle } = useInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string>("");
  const [draft, setDraft] = useState<DraftVehicle>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ image?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [instagramItem, setInstagramItem] = useState<InventoryItem | null>(null);
  const [instagramOpen, setInstagramOpen] = useState(false);

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = `${item.make} ${item.model} ${item.trim}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventory, search, statusFilter]);

  const isDraftValid = Boolean(draft.make.trim() && draft.model.trim() && draft.price.trim());

  const openAddModal = () => {
    setEditingId(null);
    setDraftId(`vehicle-${Date.now()}`);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id);
    setDraftId(item.id);
    setDraft(toDraft(item));
    setErrors({});
    setModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setErrors({});
    try {
      const url = await uploadInventoryImage(file, draftId);
      setDraft((d) => ({ ...d, image: url }));
    } catch {
      setErrors({ image: "No se pudo subir la imagen. Intenta de nuevo." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isDraftValid) return;

    const trimmedImage = draft.image.trim();
    if (trimmedImage && !isAllowedImageUrl(trimmedImage)) {
      setErrors({
        image: `La URL de la imagen debe estar alojada en: ${ALLOWED_IMAGE_HOSTS.join(", ")}`,
      });
      return;
    }
    setErrors({});

    if (editingId) {
      const existing = inventory.find((item) => item.id === editingId);
      await updateVehicle(editingId, {
        make: draft.make.trim(),
        model: draft.model.trim(),
        trim: draft.trim.trim(),
        year: Number(draft.year) || existing?.year || new Date().getFullYear(),
        price: Number(draft.price) || existing?.price || 0,
        mileage: Number(draft.mileage) || existing?.mileage || 0,
        status: draft.status,
        image: trimmedImage || existing?.image || EMPTY_DRAFT.image,
      });
    } else {
      const newItem: InventoryItem = {
        id: draftId,
        make: draft.make.trim(),
        model: draft.model.trim(),
        trim: draft.trim.trim() || "Base",
        year: Number(draft.year) || new Date().getFullYear(),
        price: Number(draft.price) || 0,
        mileage: Number(draft.mileage) || 0,
        transmission: "Automatic",
        fuelType: "Gasoline",
        bodyType: "Sedan",
        color: "Jet Black",
        colorHex: "#0a0a0b",
        status: draft.status,
        image: trimmedImage || EMPTY_DRAFT.image,
      };
      await addVehicle(newItem);
    }

    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteVehicle(id);
    setConfirmDeleteId(null);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inventario</h1>
          <p className="mt-1 text-sm text-slate-500">{inventory.length} vehículos en el lote.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus size={16} />
          Agregar Vehículo
        </button>
      </div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setConfirmDeleteId(null);
            }}
            placeholder="Buscar marca, modelo o versión"
            className={`${dashboardInputClass} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as InventoryStatus | "All");
            setConfirmDeleteId(null);
          }}
          className={`${dashboardInputClass} sm:w-48`}
        >
          <option value="All">Todos los estados</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Vehículo</th>
              <th className="px-5 py-3">Año</th>
              <th className="px-5 py-3">Kilometraje</th>
              <th className="px-5 py-3">Precio</th>
              <th className="px-5 py-3">Estado</th>
              <th className="sticky right-0 bg-white px-5 py-3 text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                  Cargando inventario…
                </td>
              </tr>
            )}
            {!loading && filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image src={item.image} alt={`${item.make} ${item.model}`} fill sizes="56px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.make} {item.model}</p>
                      <p className="text-xs text-slate-500">{item.trim}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{item.year}</td>
                <td className="px-5 py-3 text-slate-600">{item.mileage.toLocaleString()} km</td>
                <td className="px-5 py-3 text-slate-600">{currency.format(item.price)}</td>
                <td className="px-5 py-3">
                  <StatusPill label={STATUS_LABELS[item.status]} tone={STATUS_TONE[item.status]} />
                </td>
                <td className="sticky right-0 bg-white px-5 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label="Generar publicación para Instagram"
                      onClick={() => {
                        setInstagramItem(item);
                        setInstagramOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Sparkles size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Editar vehículo"
                      onClick={() => openEditModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar vehículo"
                      onClick={() => handleDelete(item.id)}
                      className={`flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                        confirmDeleteId === item.id
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                      }`}
                    >
                      {confirmDeleteId === item.id ? "¿Confirmar?" : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Vehículo" : "Agregar Vehículo"}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DashboardField label="Marca">
              <input value={draft.make} onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Modelo">
              <input value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
          </div>
          <DashboardField label="Versión">
            <input value={draft.trim} onChange={(e) => setDraft((d) => ({ ...d, trim: e.target.value }))} className={dashboardInputClass} />
          </DashboardField>
          <div className="grid grid-cols-3 gap-4">
            <DashboardField label="Año">
              <input type="number" value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Precio">
              <input type="number" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Kilometraje">
              <input type="number" value={draft.mileage} onChange={(e) => setDraft((d) => ({ ...d, mileage: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
          </div>
          <DashboardField label="Estado">
            <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as InventoryStatus }))} className={dashboardInputClass}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </DashboardField>
          <DashboardField label="Subir Imagen">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
              className={dashboardInputClass}
            />
            {uploading && <p className="text-xs text-slate-500">Subiendo imagen…</p>}
          </DashboardField>
          <DashboardField label="URL de Imagen">
            <input
              value={draft.image}
              onChange={(e) => {
                setDraft((d) => ({ ...d, image: e.target.value }));
                setErrors({});
              }}
              className={dashboardInputClass}
            />
            {errors.image && <p className="text-xs text-red-600">{errors.image}</p>}
          </DashboardField>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDraftValid || uploading}
            className="mt-2 flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {editingId ? "Guardar Cambios" : "Agregar Vehículo"}
          </button>
        </div>
      </Modal>

      <InstagramPostModal
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        item={instagramItem}
      />
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Manual check**

Run the dev server, log in (once Task 8's prerequisites are met), open `/dashboard/inventory`. Confirm: the table shows a "Cargando inventario…" row briefly then either real data or an empty table (empty is correct if Firestore hasn't been seeded yet — Task 16). Open "Agregar Vehículo", fill required fields, click the file input's manual-check is optional if Storage isn't provisioned yet, but the text-based Save flow should not crash.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/inventory/page.tsx
git commit -m "feat: back inventory dashboard page with Firestore and photo upload"
```

---

## Task 10: Wire leads dashboard page to Firestore

**Files:**
- Modify: `app/dashboard/leads/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useLeads` (Task 3).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/dashboard/leads/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { StatusPill } from "@/components/dashboard/status-pill";
import { useLeads } from "@/lib/firebase/leads";
import { type LeadStatus } from "@/lib/dashboard-data";
import { fadeUp, staggerContainer } from "@/lib/motion";

const STATUS_FILTERS: Array<LeadStatus | "All"> = ["All", "New", "Contacted", "Negotiating", "Won"];
const STATUS_OPTIONS: LeadStatus[] = ["New", "Contacted", "Negotiating", "Won"];

const STATUS_TONE: Record<LeadStatus, "blue" | "amber" | "purple" | "green"> = {
  New: "blue",
  Contacted: "amber",
  Negotiating: "purple",
  Won: "green",
};

const STATUS_LABELS: Record<LeadStatus | "All", string> = {
  All: "Todos",
  New: "Nuevo",
  Contacted: "Contactado",
  Negotiating: "Negociando",
  Won: "Ganado",
};

function formatDate(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
}

export default function LeadsPage() {
  const { items: leads, loading, updateStatus, deleteLead } = useLeads();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<LeadStatus | "All", number> = {
      All: leads.length,
      New: 0,
      Contacted: 0,
      Negotiating: 0,
      Won: 0,
    };
    leads.forEach((lead) => {
      base[lead.status] += 1;
    });
    return base;
  }, [leads]);

  const filtered = statusFilter === "All" ? leads : leads.filter((lead) => lead.status === statusFilter);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteLead(id);
    setConfirmDeleteId(null);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Prospectos</h1>
        <p className="mt-1 text-sm text-slate-500">{leads.length} consultas en el embudo de ventas.</p>
      </div>

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setConfirmDeleteId(null);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {STATUS_LABELS[status]} <span className="ml-1 text-xs opacity-70">{counts[status]}</span>
          </button>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Contacto</th>
              <th className="px-5 py-3">Interesado en</th>
              <th className="px-5 py-3">Origen</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Creado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                  Cargando prospectos…
                </td>
              </tr>
            )}
            {!loading && filtered.map((lead) => (
              <tr key={lead.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.email} · {lead.phone}</p>
                </td>
                <td className="px-5 py-3 text-slate-600">{lead.interestedIn}</td>
                <td className="px-5 py-3 text-slate-600">{lead.source}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <StatusPill label={STATUS_LABELS[lead.status]} tone={STATUS_TONE[lead.status]} />
                    <select
                      value={lead.status}
                      onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus-visible:outline-none"
                      aria-label={`Cambiar estado de ${lead.name}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-500">{formatDate(lead.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    aria-label="Eliminar prospecto"
                    onClick={() => handleDelete(lead.id)}
                    className={`inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                      confirmDeleteId === lead.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    {confirmDeleteId === lead.id ? "¿Confirmar?" : <Trash2 size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/leads/page.tsx
git commit -m "feat: back leads dashboard page with Firestore"
```

---

## Task 11: Wire contact dashboard page to Firestore

**Files:**
- Modify: `app/dashboard/contact/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useMessages` (Task 4).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/dashboard/contact/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { useMessages } from "@/lib/firebase/messages";
import { fadeUp, staggerContainer } from "@/lib/motion";

function formatTimestamp(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ContactPage() {
  const { items: messages, loading, markRead, deleteMessage } = useMessages();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const active = messages.find((message) => message.id === activeId) ?? null;

  const openMessage = (message: { id: string; read: boolean }) => {
    setActiveId(message.id);
    if (!message.read) {
      void markRead(message.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteMessage(id);
    setConfirmDeleteId(null);
    setActiveId(null);
  };

  const unreadCount = messages.filter((message) => !message.read).length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contacto</h1>
        <p className="mt-1 text-sm text-slate-500">{unreadCount} sin leer de {messages.length} mensajes.</p>
      </div>

      <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">Cargando mensajes…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${message.read ? "bg-transparent" : "bg-indigo-600"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`truncate text-sm ${message.read ? "font-normal text-slate-700" : "font-semibold text-slate-900"}`}>
                        {message.name}
                      </p>
                      <span className="flex-shrink-0 text-xs text-slate-400">{formatTimestamp(message.receivedAt)}</span>
                    </div>
                    <p className="truncate text-sm text-slate-600">{message.subject}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <Modal open={active !== null} onClose={() => { setActiveId(null); setConfirmDeleteId(null); }} title={active?.subject ?? ""}>
        {active && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{active.name}</p>
              <p className="text-xs text-slate-500">{active.email} · {formatTimestamp(active.receivedAt)}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{active.message}</p>
            <button
              type="button"
              onClick={() => handleDelete(active.id)}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${
                confirmDeleteId === active.id
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <Trash2 size={15} />
              {confirmDeleteId === active.id ? "Confirmar eliminación" : "Eliminar mensaje"}
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/contact/page.tsx
git commit -m "feat: back contact dashboard page with Firestore"
```

---

## Task 12: Wire users dashboard page to Firestore

**Files:**
- Modify: `app/dashboard/users/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useTeamUsers` (Task 5).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/dashboard/users/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { StatusPill } from "@/components/dashboard/status-pill";
import { DashboardField, dashboardInputClass } from "@/components/dashboard/form-field";
import { useTeamUsers } from "@/lib/firebase/users";
import { type TeamRole, type TeamUser } from "@/lib/dashboard-data";
import { fadeUp, staggerContainer } from "@/lib/motion";

const ROLES: TeamRole[] = ["Admin", "Manager", "Sales"];

const ROLE_LABELS: Record<TeamRole, string> = {
  Admin: "Administrador",
  Manager: "Gerente",
  Sales: "Ventas",
};

const STATUS_LABELS: Record<TeamUser["status"], string> = {
  Active: "Activo",
  Invited: "Invitado",
};

export default function UsersPage() {
  const { items: users, loading, addUser, updateRole, deleteUser } = useTeamUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", role: "Sales" as TeamRole });

  const isDraftValid = Boolean(draft.name.trim() && draft.email.trim());

  const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteUser(id);
    setConfirmDeleteId(null);
  };

  const handleInvite = async () => {
    if (!isDraftValid) return;
    await addUser({
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      status: "Invited",
    });
    setDraft({ name: "", email: "", role: "Sales" });
    setModalOpen(false);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">{users.length} miembros del equipo.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus size={16} />
          Invitar Usuario
        </button>
      </div>

      <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Miembro</th>
              <th className="px-5 py-3">Rol</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-500">
                  Cargando usuarios…
                </td>
              </tr>
            )}
            {!loading && users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {initials(user.name)}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={user.role}
                    onChange={(event) => updateRole(user.id, event.target.value as TeamRole)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus-visible:outline-none"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <StatusPill label={STATUS_LABELS[user.status]} tone={user.status === "Active" ? "green" : "slate"} />
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    aria-label="Eliminar usuario"
                    onClick={() => handleDelete(user.id)}
                    className={`inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                      confirmDeleteId === user.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    {confirmDeleteId === user.id ? "¿Confirmar?" : <Trash2 size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invitar Usuario">
        <div className="flex flex-col gap-4">
          <DashboardField label="Nombre Completo">
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={dashboardInputClass} />
          </DashboardField>
          <DashboardField label="Correo Electrónico">
            <input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} className={dashboardInputClass} />
          </DashboardField>
          <DashboardField label="Rol">
            <select value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as TeamRole }))} className={dashboardInputClass}>
              {ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </DashboardField>
          <button
            type="button"
            onClick={handleInvite}
            disabled={!isDraftValid}
            className="mt-2 flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            Enviar Invitación
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/users/page.tsx
git commit -m "feat: back users dashboard page with Firestore"
```

---

## Task 13: Wire dashboard overview page to live data

This page was not explicitly named in the design spec's per-page list but uses the same `useLocalStorage(seed...)` pattern as the four pages above — leaving it on mock data would make the Control Panel's stats disagree with the real numbers shown on the other four pages. Fixing it here keeps one source of truth, per the spec's stated goal.

**Files:**
- Modify: `app/dashboard/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useInventory` (Task 2), `useLeads` (Task 3), `useMessages` (Task 4).

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/dashboard/page.tsx`:

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Car, Target, DollarSign, Mail } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { useInventory } from "@/lib/firebase/inventory";
import { useLeads } from "@/lib/firebase/leads";
import { useMessages } from "@/lib/firebase/messages";
import { type InventoryStatus } from "@/lib/dashboard-data";
import { fadeUp, staggerContainer } from "@/lib/motion";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const INVENTORY_TONE: Record<InventoryStatus, "green" | "amber" | "slate"> = {
  Available: "green",
  Reserved: "amber",
  Sold: "slate",
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  Available: "Disponible",
  Reserved: "Reservado",
  Sold: "Vendido",
};

export default function ControlPanelPage() {
  const { items: inventory } = useInventory();
  const { items: leads } = useLeads();
  const { items: messages } = useMessages();

  const activeLeads = leads.filter((lead) => lead.status !== "Won").length;
  const monthlyRevenue = inventory
    .filter((item) => item.status === "Sold")
    .reduce((sum, item) => sum + item.price, 0);
  const pendingInquiries = messages.filter((message) => !message.read).length;

  const activity = [
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: `${lead.name} — nuevo prospecto`,
      subtitle: `Interesado en ${lead.interestedIn}`,
      timestamp: lead.createdAt,
    })),
    ...messages.map((message) => ({
      id: `msg-${message.id}`,
      title: `${message.name} envió un mensaje`,
      subtitle: message.subject,
      timestamp: message.receivedAt,
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const recentVehicles = inventory.slice(0, 4);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Panel de Control</h1>
        <p className="mt-1 text-sm text-slate-500">Un resumen del inventario, los prospectos y la actividad entrante.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Car} label="Inventario Total" value={String(inventory.length)} />
        <StatCard icon={Target} label="Prospectos Activos" value={String(activeLeads)} />
        <StatCard icon={DollarSign} label="Ingresos Mensuales" value={currency.format(monthlyRevenue)} />
        <StatCard icon={Mail} label="Consultas Pendientes" value={String(pendingInquiries)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Actividad Reciente</h2>
          <ul className="flex flex-col divide-y divide-slate-100">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">{item.timestamp}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Vehículos Agregados Recientemente</h2>
          <ul className="flex flex-col gap-3">
            {recentVehicles.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <Image src={item.image} alt={`${item.make} ${item.model}`} fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{item.make} {item.model}</p>
                  <p className="text-xs text-slate-500">{currency.format(item.price)}</p>
                </div>
                <StatusPill label={STATUS_LABELS[item.status]} tone={INVENTORY_TONE[item.status]} />
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: back dashboard overview stats with live Firestore data"
```

---

## Task 14: Wire public homepage grid + car detail page to Firestore

**Files:**
- Modify: `components/car-grid.tsx` (full replacement)
- Modify: `data/car-details.ts` (add `buildFallbackDetail` export)
- Modify: `app/inventory/[id]/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `useInventory` (Task 2, for the client-side grid), `getInventoryOnce` (Task 2, for the server-component detail page).
- Produces: `buildFallbackDetail(car: Car): CarDetail` from `data/car-details.ts`, used by the detail page for any car with no hand-authored `carDetails` entry (i.e., anything an admin adds later).

- [ ] **Step 1: Replace `components/car-grid.tsx`**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Grid2x2, LayoutGrid } from "lucide-react";
import { useInventory } from "@/lib/firebase/inventory";
import { CarCard, type CardLayout } from "@/components/car-card";
import { fadeUp, staggerContainer } from "@/lib/motion";

const BODY_TYPE_PILLS = ["All", "Sedan", "SUV", "Coupe"] as const;

const BODY_TYPE_LABELS: Record<(typeof BODY_TYPE_PILLS)[number], string> = {
  All: "Todos",
  Sedan: "Sedán",
  SUV: "SUV",
  Coupe: "Cupé",
};

type GridDensity = "comfortable" | "compact";

export function CarGrid() {
  const { items: cars, loading } = useInventory();
  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPE_PILLS)[number]>("All");
  const [density, setDensity] = useState<GridDensity>("comfortable");

  const visibleCars =
    bodyType === "All" ? cars : cars.filter((car) => car.bodyType === bodyType);

  const cardLayout: CardLayout =
    density === "comfortable" ? "split" : "portrait";

  return (
    <section id="inventory" className="bg-background px-3 pb-28 pt-[5%] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 hidden md:block"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Inventario Destacado
          </h2>
          <p className="mt-3 max-w-md text-[0.95rem] text-muted">
            Vehículos seleccionados a mano, cada uno inspeccionado y
            certificado antes de llegar a ti.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {BODY_TYPE_PILLS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBodyType(type)}
                className={`rounded-full border px-4 py-2 text-[0.85rem] font-medium transition-colors duration-200 ${
                  bodyType === type
                    ? "border-foreground bg-foreground text-accent-foreground"
                    : "border-border-strong text-muted hover:text-foreground"
                }`}
              >
                {BODY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong p-1">
            <button
              type="button"
              aria-label="Vista amplia"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                density === "comfortable"
                  ? "bg-foreground text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Grid2x2 size={16} />
            </button>
            <button
              type="button"
              aria-label="Vista compacta"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                density === "compact"
                  ? "bg-foreground text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className={`grid gap-3 sm:gap-6 ${
            density === "compact"
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {!loading && visibleCars.map((car) => (
            <CarCard key={car.id} car={car} layout={cardLayout} />
          ))}
        </motion.div>

        <a
          href="#inventory"
          className="mt-8 block text-center text-[0.9rem] font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Ver todo el inventario
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the fallback detail builder to `data/car-details.ts`**

At the top of `data/car-details.ts`, add the import:

```diff
+import type { Car } from "@/data/cars";
+
 export interface CarDetailImage {
```

At the end of `data/car-details.ts` (after the existing `carDetails` export), append:

```ts
export function buildFallbackDetail(car: Car): CarDetail {
  return {
    images: [{ src: car.image, alt: `${car.year} ${car.make} ${car.model} ${car.trim}` }],
    editorial: { headline: "", dek: "", paragraphs: [] },
    features: [],
  };
}
```

- [ ] **Step 3: Replace `app/inventory/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getInventoryOnce } from "@/lib/firebase/inventory";
import type { InventoryItem } from "@/lib/dashboard-data";
import { carDetails, buildFallbackDetail } from "@/data/car-details";
import { CarSlideshow } from "@/components/car-detail/car-slideshow";
import { CarHeaderInfo } from "@/components/car-detail/car-header-info";
import { EditorialDescription } from "@/components/car-detail/editorial-description";
import { FeatureColumns } from "@/components/car-detail/feature-columns";
import { CarInquiryForm } from "@/components/car-detail/car-inquiry-form";
import { SimilarCarsSlider } from "@/components/car-detail/similar-cars-slider";

function getSimilarCars(
  items: InventoryItem[],
  currentId: string,
  bodyType: InventoryItem["bodyType"],
): InventoryItem[] {
  const sameBodyType = items.filter(
    (item) => item.id !== currentId && item.bodyType === bodyType,
  );
  if (sameBodyType.length >= 3) return sameBodyType.slice(0, 6);

  const sameBodyTypeIds = new Set(sameBodyType.map((item) => item.id));
  const others = items.filter(
    (item) => item.id !== currentId && !sameBodyTypeIds.has(item.id),
  );
  return [...sameBodyType, ...others].slice(0, 6);
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const items = await getInventoryOnce();
  const car = items.find((item) => item.id === id);

  if (!car) {
    notFound();
  }

  const detail = carDetails[car.id] ?? buildFallbackDetail(car);
  const similarCars = getSimilarCars(items, car.id, car.bodyType);

  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="flex-1 bg-zinc-50 pt-24 sm:pt-28">
        <CarSlideshow images={detail.images} />
        <CarHeaderInfo car={car} />
        {detail.editorial.paragraphs.length > 0 && (
          <EditorialDescription editorial={detail.editorial} />
        )}
        {detail.features.length > 0 && <FeatureColumns features={detail.features} />}
        <CarInquiryForm car={car} />
        <SimilarCarsSlider cars={similarCars} />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Manual check**

Run the dev server, open `http://localhost:3006/`. If Firestore isn't seeded yet (Task 16 not run), the inventory grid legitimately renders zero cards and `/inventory/<any-id>` 404s — that is correct behavior for empty data, not a bug. Confirm there's no thrown error in the terminal or browser console (a permission-denied error here means the Firestore rules from Task 16 haven't been published yet in the Console).

- [ ] **Step 6: Commit**

```bash
git add components/car-grid.tsx data/car-details.ts app/inventory/[id]/page.tsx
git commit -m "feat: read public inventory grid and detail page from Firestore"
```

---

## Task 15: Wire public inquiry/trade-in forms to create real leads

**Files:**
- Modify: `components/car-detail/car-inquiry-form.tsx` (full replacement)
- Modify: `components/trade-in-form.tsx` (full replacement)

**Interfaces:**
- Consumes: `createLead` (Task 3).

- [ ] **Step 1: Replace `components/car-detail/car-inquiry-form.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import type { Car } from "@/data/cars";
import { fadeUp } from "@/lib/motion";
import { createLead } from "@/lib/firebase/leads";

const WHATSAPP_NUMBER = "14155550148";

const fieldClass =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-[0.9rem] text-zinc-900 placeholder:text-zinc-400 transition-colors duration-200 focus-visible:border-zinc-900 focus-visible:outline-none";

interface InquiryDraft {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const EMPTY_DRAFT: InquiryDraft = { name: "", email: "", phone: "", message: "" };

function buildWhatsAppUrl(car: Car, draft: InquiryDraft) {
  const carLabel = `${car.year} ${car.make} ${car.model}`;
  const lines = [
    `Hola, me interesa el ${carLabel}.`,
    draft.name && `Mi nombre es ${draft.name}.`,
    draft.email && `Correo electrónico: ${draft.email}`,
    draft.message,
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join(" "))}`;
}

function recordLead(car: Car, draft: InquiryDraft) {
  void createLead({
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    interestedIn: `${car.year} ${car.make} ${car.model}`,
    source: "Sitio web",
  }).catch((error) => {
    console.warn("No se pudo guardar el prospecto:", error);
  });
}

export function CarInquiryForm({ car }: { car: Car }) {
  const [draft, setDraft] = useState<InquiryDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof InquiryDraft, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const nextErrors: Partial<Record<keyof InquiryDraft, string>> = {};
    if (!draft.name.trim()) nextErrors.name = "El nombre es obligatorio";
    if (!draft.email.trim()) nextErrors.email = "El correo electrónico es obligatorio";
    if (!draft.message.trim()) nextErrors.message = "El mensaje es obligatorio";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    recordLead(car, draft);
    setSubmitted(true);
  };

  const handleWhatsAppSubmit = () => {
    if (!validate()) return;
    recordLead(car, draft);
    window.open(buildWhatsAppUrl(car, draft), "_blank", "noreferrer");
  };

  if (submitted) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8"
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-900">
            <CheckCircle2 size={22} />
          </span>
          <h3 className="text-[1.05rem] font-semibold text-zinc-900">
            Consulta recibida
          </h3>
          <p className="text-[0.9rem] text-zinc-500">
            Un asesor se pondrá en contacto en breve sobre el {car.year} {car.make}{" "}
            {car.model}.
          </p>
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_DRAFT);
              setSubmitted(false);
            }}
            className="mt-2 text-[0.85rem] font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4"
          >
            Enviar otra consulta
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          ¿Te interesa este vehículo?
        </h2>
        <p className="mt-2 text-[0.9rem] text-zinc-500">
          Envía tu consulta y un asesor se pondrá en contacto contigo.
        </p>

        <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[0.8rem] font-medium text-zinc-600">Nombre</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Jordan Avery"
                className={fieldClass}
              />
              {errors.name && <p className="text-[0.78rem] text-red-500">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[0.8rem] font-medium text-zinc-600">Correo electrónico</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="you@email.com"
                className={fieldClass}
              />
              {errors.email && <p className="text-[0.78rem] text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-medium text-zinc-600">Teléfono</label>
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="(415) 555-0148"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-medium text-zinc-600">Mensaje</label>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              placeholder={`Me gustaría saber más sobre el ${car.year} ${car.make} ${car.model}...`}
              rows={4}
              className={`${fieldClass} h-auto resize-none py-3`}
            />
            {errors.message && (
              <p className="text-[0.78rem] text-red-500">{errors.message}</p>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-[0.9rem] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Send size={16} />
              Enviar por email
            </motion.button>
            <motion.button
              type="button"
              onClick={handleWhatsAppSubmit}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[0.9rem] font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
              Enviar por WhatsApp
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Replace `components/trade-in-form.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { FormField, FormInput, FormSelect } from "@/components/form-controls";
import { createLead } from "@/lib/firebase/leads";

const CONDITIONS = ["Excelente", "Bueno", "Regular", "Necesita reparaciones"];

export function TradeInForm() {
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const make = String(formData.get("make") ?? "");
    const model = String(formData.get("model") ?? "");
    const year = String(formData.get("year") ?? "");
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");

    void createLead({
      name,
      email,
      phone,
      interestedIn: `${make} ${model} ${year} (trade-in, ${condition})`,
      source: "Sitio web",
    }).catch((error) => {
      console.warn("No se pudo guardar el prospecto:", error);
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center gap-3 py-14 text-center"
      >
        <span className="glass flex h-12 w-12 items-center justify-center rounded-full text-foreground">
          <CheckCircle2 size={22} />
        </span>
        <h3 className="text-[1.05rem] font-semibold text-foreground">
          Solicitud de tasación recibida
        </h3>
        <p className="max-w-sm text-[0.9rem] text-muted">
          Un asesor se pondrá en contacto con la valuación de tu vehículo
          dentro del siguiente día hábil.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 text-[0.85rem] font-medium text-foreground underline decoration-border-strong underline-offset-4"
        >
          Tasar otro vehículo
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.form
        key="trade-in-form"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Marca">
            <FormInput required placeholder="ej. BMW" name="make" />
          </FormField>
          <FormField label="Modelo">
            <FormInput required placeholder="ej. M5" name="model" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Año">
            <FormInput
              required
              type="number"
              placeholder="ej. 2021"
              min={1980}
              max={2027}
              name="year"
            />
          </FormField>
          <FormField label="Kilometraje">
            <FormInput
              required
              type="number"
              placeholder="ej. 32.000"
              min={0}
              name="mileage"
            />
          </FormField>
        </div>

        <FormField label="Estado General">
          <FormSelect
            options={CONDITIONS}
            value={condition}
            onChange={setCondition}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Nombre Completo">
            <FormInput required placeholder="Jordan Avery" name="name" />
          </FormField>
          <FormField label="Correo Electrónico">
            <FormInput
              required
              type="email"
              placeholder="tu@email.com"
              name="email"
            />
          </FormField>
        </div>

        <FormField label="Teléfono">
          <FormInput
            required
            type="tel"
            placeholder="(415) 555-0148"
            name="phone"
          />
        </FormField>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-2 flex h-12 items-center justify-center rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground"
        >
          Obtener Mi Estimación de Tasación
        </motion.button>
      </motion.form>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/car-detail/car-inquiry-form.tsx components/trade-in-form.tsx
git commit -m "feat: write real leads from the public inquiry and trade-in forms"
```

---

## Task 16: Security rules, seed script, and end-to-end verification

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`
- Create: `scripts/seed-firestore.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks at the type level — this is standalone infrastructure/tooling. Depends on all prior tasks being in place so the manual end-to-end check (Step 5) has something real to exercise.

- [ ] **Step 1: Write the Firestore security rules**

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inventory/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /leads/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    match /messages/{id} {
      allow read, write: if request.auth != null;
    }
    match /users/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 2: Write the Storage security rules**

Create `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /inventory/{carId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 3: Write the one-time seed script**

Create `scripts/seed-firestore.mjs`. This duplicates the seed data as plain literals (rather than importing `data/cars.ts` / `lib/dashboard-data.ts`) because it's a plain Node ESM script with no TypeScript loader configured in this project (no `tsx`/`ts-node` dependency) — adding one just for a script meant to be deleted after a single run isn't worth the dependency. `.env.local` isn't auto-loaded by Node, so the script parses it itself.

```js
#!/usr/bin/env node
// One-time migration: seeds today's mock data into Firestore.
// Usage:
//   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=yourpassword node scripts/seed-firestore.mjs
// The admin account must already exist in Firebase Console (Authentication tab) —
// this script signs in as that user so its writes pass firestore.rules.
// Safe to delete after running, or to re-run later to reset the seed data
// (writes use fixed document IDs, so re-running just overwrites with the same values).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error(
    "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (an account created in Firebase Console) before running this script.",
  );
  process.exit(1);
}

const cars = [
  { id: "range-rover-sport-2023", make: "Land Rover", model: "Range Rover Sport", trim: "Autobiography", year: 2023, price: 105700, mileage: 6800, transmission: "8-Speed Automatic", fuelType: "Gasoline", bodyType: "SUV", color: "Santorini Black", colorHex: "#161616", image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=80", status: "Available" },
  { id: "bmw-m5-2023", make: "BMW", model: "M5", trim: "Competition", year: 2023, price: 111300, mileage: 4100, transmission: "8-Speed Automatic", fuelType: "Gasoline", bodyType: "Sedan", color: "Brooklyn Grey", colorHex: "#54565c", image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80", status: "Available" },
  { id: "porsche-panamera-2024", make: "Porsche", model: "Panamera", trim: "4S", year: 2024, price: 128900, mileage: 1500, transmission: "8-Speed PDK", fuelType: "Gasoline", bodyType: "Sedan", color: "Carrara White", colorHex: "#f2f1ec", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80", status: "Reserved" },
  { id: "tesla-roadster-2024", make: "Tesla", model: "Roadster", trim: "Founders Series", year: 2024, price: 198900, mileage: 350, transmission: "Single-Speed", fuelType: "Electric", bodyType: "Coupe", color: "Red Multi-Coat", colorHex: "#a11d24", image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=80", status: "Available" },
  { id: "honda-crv-2022", make: "Honda", model: "CR-V", trim: "Touring Hybrid", year: 2022, price: 38900, mileage: 18200, transmission: "CVT Automatic", fuelType: "Hybrid", bodyType: "SUV", color: "Platinum White Pearl", colorHex: "#e9e8e3", image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80", status: "Sold" },
  { id: "nissan-gtr-2023", make: "Nissan", model: "GT-R", trim: "Premium", year: 2023, price: 118500, mileage: 3200, transmission: "6-Speed Dual-Clutch", fuelType: "Gasoline", bodyType: "Coupe", color: "Pearl White", colorHex: "#eef0ee", image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80", status: "Available" },
  { id: "ford-expedition-2023", make: "Ford", model: "Expedition", trim: "Platinum", year: 2023, price: 82400, mileage: 9100, transmission: "10-Speed Automatic", fuelType: "Gasoline", bodyType: "SUV", color: "Agate Black", colorHex: "#15171b", image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80", status: "Reserved" },
  { id: "mercedes-amg-gtr-2023", make: "Mercedes-AMG", model: "GT R", trim: "Pro", year: 2023, price: 174500, mileage: 2100, transmission: "7-Speed DCT", fuelType: "Gasoline", bodyType: "Coupe", color: "Green Hell Magno", colorHex: "#3f4a3d", image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80", status: "Available" },
  { id: "lamborghini-aventador-2023", make: "Lamborghini", model: "Aventador", trim: "SVJ", year: 2023, price: 573900, mileage: 890, transmission: "7-Speed ISR", fuelType: "Gasoline", bodyType: "Coupe", color: "Arancio Xanto", colorHex: "#d5541c", image: "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?auto=format&fit=crop&w=1600&q=80", status: "Sold" },
];

const leads = [
  { id: "lead-1", name: "Jordan Avery", email: "jordan.avery@email.com", phone: "(415) 555-0148", interestedIn: "BMW M5 Competition", source: "Sitio web", status: "New", createdAt: "2026-09-14" },
  { id: "lead-2", name: "Priya Nair", email: "priya.nair@email.com", phone: "(650) 555-0122", interestedIn: "Porsche Panamera 4S", source: "Teléfono", status: "Contacted", createdAt: "2026-09-12" },
  { id: "lead-3", name: "Marcus Webb", email: "marcus.webb@email.com", phone: "(510) 555-0177", interestedIn: "Tesla Roadster", source: "Presencial", status: "Negotiating", createdAt: "2026-09-10" },
  { id: "lead-4", name: "Elena Castillo", email: "elena.castillo@email.com", phone: "(408) 555-0193", interestedIn: "Range Rover Sport", source: "Sitio web", status: "Won", createdAt: "2026-09-05" },
  { id: "lead-5", name: "Sam Okafor", email: "sam.okafor@email.com", phone: "(925) 555-0164", interestedIn: "Nissan GT-R", source: "Referido", status: "New", createdAt: "2026-09-15" },
  { id: "lead-6", name: "Grace Lin", email: "grace.lin@email.com", phone: "(707) 555-0159", interestedIn: "Honda CR-V", source: "Sitio web", status: "Contacted", createdAt: "2026-09-11" },
  { id: "lead-7", name: "Devon Price", email: "devon.price@email.com", phone: "(831) 555-0141", interestedIn: "Ford Expedition", source: "Teléfono", status: "New", createdAt: "2026-09-13" },
  { id: "lead-8", name: "Nina Torres", email: "nina.torres@email.com", phone: "(628) 555-0136", interestedIn: "Mercedes-AMG GT R", source: "Sitio web", status: "Negotiating", createdAt: "2026-09-09" },
];

const messages = [
  { id: "msg-1", name: "Alicia Roman", email: "alicia.roman@email.com", subject: "Pregunta sobre garantía extendida", message: "Hola, estoy interesada en el Porsche Panamera 4S que tienen publicado. ¿Viene con opción de garantía extendida y, de ser así, cuánto suma al precio?", receivedAt: "2026-09-15T09:20:00", read: false },
  { id: "msg-2", name: "Tom Baird", email: "tom.baird@email.com", subject: "Entrega de mi Audi 2019 como parte de pago", message: "Me gustaría entregar mi Audi A6 2019 como parte de pago por una de sus camionetas. ¿Podrían darme una estimación aproximada antes de llevarlo?", receivedAt: "2026-09-14T15:42:00", read: false },
  { id: "msg-3", name: "Keisha Brown", email: "keisha.brown@email.com", subject: "Disponibilidad para prueba de manejo", message: "¿Está disponible el Tesla Roadster para una prueba de manejo este fin de semana? El sábado por la tarde me quedaría mejor.", receivedAt: "2026-09-13T11:05:00", read: true },
  { id: "msg-4", name: "Victor Huang", email: "victor.huang@email.com", subject: "Preaprobación de financiamiento", message: "Usé su calculadora de financiamiento y quiero obtener la preaprobación antes de visitarlos. ¿Qué documentos necesito llevar?", receivedAt: "2026-09-12T08:30:00", read: false },
  { id: "msg-5", name: "Sophie Marsh", email: "sophie.marsh@email.com", subject: "Informe del historial del vehículo", message: "¿Podrían enviarme el informe del historial del Nissan GT-R Premium que tienen publicado en su sitio?", receivedAt: "2026-09-10T17:15:00", read: true },
];

const users = [
  { id: "user-1", name: "Alejandro Gonzalez", email: "alejandro@drivetime.com", role: "Admin", status: "Active" },
  { id: "user-2", name: "Maria Chen", email: "maria.chen@drivetime.com", role: "Manager", status: "Active" },
  { id: "user-3", name: "Robert Kim", email: "robert.kim@drivetime.com", role: "Sales", status: "Active" },
  { id: "user-4", name: "Jasmine Patel", email: "jasmine.patel@drivetime.com", role: "Sales", status: "Invited" },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const db = getFirestore(app);

  for (const car of cars) {
    const { id, ...data } = car;
    await setDoc(doc(db, "inventory", id), data);
  }
  console.log(`Seeded ${cars.length} inventory items.`);

  for (const lead of leads) {
    const { id, createdAt, ...data } = lead;
    await setDoc(doc(db, "leads", id), { ...data, createdAt: Timestamp.fromDate(new Date(createdAt)) });
  }
  console.log(`Seeded ${leads.length} leads.`);

  for (const message of messages) {
    const { id, receivedAt, ...data } = message;
    await setDoc(doc(db, "messages", id), { ...data, receivedAt: Timestamp.fromDate(new Date(receivedAt)) });
  }
  console.log(`Seeded ${messages.length} messages.`);

  for (const user of users) {
    const { id, ...data } = user;
    await setDoc(doc(db, "users", id), data);
  }
  console.log(`Seeded ${users.length} team users.`);

  console.log("Done. You can delete this script now, or re-run it later to reset seed data.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
```

- [ ] **Step 4: Verify the script runs (syntax check only, until prerequisites are done)**

Run: `node --check scripts/seed-firestore.mjs`
Expected: no output (valid syntax). This does not execute the script — it can't succeed yet without the Firebase Console prerequisites (Auth provider + admin user, Firestore + Storage enabled, rules published).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules storage.rules scripts/seed-firestore.mjs
git commit -m "chore: add Firestore/Storage security rules and one-time seed script"
```

- [ ] **Step 6: End-to-end manual verification (once Firebase Console prerequisites are complete)**

This step requires the user to have finished the manual prerequisites from the spec (Authentication provider + admin user, Firestore + Storage enabled, `firestore.rules`/`storage.rules` published in the Console, Vercel env vars set). With those done:

1. Run `SEED_ADMIN_EMAIL=<admin email> SEED_ADMIN_PASSWORD=<admin password> node scripts/seed-firestore.mjs` and confirm it prints four "Seeded N ..." lines with no errors. Check the Firebase Console's Firestore data tab shows all four collections populated.
2. Start the dev server, log in at `/login` with the real admin account; confirm a wrong password shows the Spanish error message and does not navigate.
3. Visit `/dashboard`, `/dashboard/inventory`, `/dashboard/leads`, `/dashboard/contact`, `/dashboard/users` — confirm each shows the seeded data (9 vehicles, 8 leads, 5 messages, 4 users) instead of "Cargando…".
4. In `/dashboard/inventory`, add a new vehicle using the file-upload field for its photo; confirm it appears in the table, then visit `/` and confirm the new vehicle appears in the public grid, and `/inventory/<its-id>` loads without the editorial/feature sections (since it has no hand-authored `carDetails` entry) but shows its photo, header info, and inquiry form.
5. On that new vehicle's detail page, submit the inquiry form; confirm a new lead appears in `/dashboard/leads` with source "Sitio web".
6. On the homepage's trade-in section, submit the trade-in form; confirm a new lead appears in `/dashboard/leads` with "(trade-in, ...)" in its "Interesado en" column.
7. In the dashboard, change a lead's status, mark a message read, change a team member's role, and delete one record in each of the four management pages; reload each page and confirm the changes persisted (they're now in Firestore, not `localStorage`).
8. Click "Cerrar sesión" in the sidebar; confirm it redirects to `/login` and visiting `/dashboard` directly also redirects to `/login`.

Record the outcome of this checklist in the final report to the user — do not mark this task complete until all eight checks pass, or until the user explicitly defers Console setup to later (in which case, report exactly what's blocked and why).

---

## Self-Review Notes

- **Spec coverage:** Every section of the spec (prerequisites, security rules, data model, module layout, auth wiring, dashboard pages, public site, migration script, error handling, testing) maps to a task above. `app/dashboard/page.tsx` was not named in the spec's per-page list but was added as Task 13 to avoid leaving one dashboard screen on stale mock data while the other four move to Firestore — flagged inline in that task.
- **Placeholder scan:** No task contains "TBD"/"implement later"/unexplained "add error handling" — every step has literal code or an exact command.
- **Type consistency:** `InventoryItem`, `Lead`, `LeadStatus`, `ContactMessage`, `TeamRole`, `TeamUser` are imported from `lib/dashboard-data.ts` unchanged in every task that uses them. Hook return shapes (`{ items, loading, error, ... }`) are consistent across Tasks 2, 3, 4, 5, and consumed with matching destructuring (`items: inventory`, `items: leads`, etc.) in Tasks 9–14. `createLead`'s `NewLeadInput` shape (Task 3) matches exactly what Task 15's two forms pass.
