# Firebase Integration — Design

Date: 2026-09-19

## Purpose

Replace the mock persistence layer added in the [admin dashboard design](2026-09-16-admin-dashboard-design.md) with a real backend: Firebase Authentication for admin login, Firestore for inventory/leads/messages/users, and Firebase Storage for car photos. Also connects the public site's inquiry/trade-in forms and inventory listings to the same Firestore data, so the dashboard and the public site share one source of truth.

`firebase` (`^12.19.0`) is already installed and `lib/firebase.ts` already initializes the client app from `NEXT_PUBLIC_FIREBASE_*` env vars in `.env.local`. The Firebase project is `drive-time-v3`.

## Constraints

- Only the client (web) SDK is available — no Admin SDK / service account credentials. All access control happens through Firestore/Storage **Security Rules**, not server-side privilege checks.
- The Firebase CLI on this machine is authenticated to a different Google account than the one that owns `drive-time-v3`, so rules/config cannot be deployed from this session. The user deploys rules manually (Console, or `firebase login` + `firebase deploy` under the right account).
- No Admin SDK means no way to programmatically create Auth users. Admin accounts are created manually in the Firebase Console (Authentication tab), per the user's explicit choice.

## Prerequisites (manual, user-performed)

1. Firebase Console → Authentication → Sign-in method → enable **Email/Password**. Create at least one admin user (email + password) here.
2. Firebase Console → Firestore Database → create database (Native mode, any region).
3. Firebase Console → Storage → get started (default bucket, already named `drive-time-v3.firebasestorage.app` per the config provided).
4. Paste `firestore.rules` (below) into Firestore's Rules tab, and `storage.rules` into Storage's Rules tab. Publish both.
5. Add the same `NEXT_PUBLIC_FIREBASE_*` values from `.env.local` to the Vercel project's Environment Variables (Production + Preview), since the deployed site needs them too.

Implementation work in this repo does not block on steps 1–4 happening first, but nothing will actually read/write real data until they're done — the app will show empty states / auth errors until then.

## Security rules

`firestore.rules`:

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

`storage.rules`:

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

No role distinctions (Admin/Manager/Sales) are enforced server-side — any signed-in user can read/write everything, matching today's mock behavior where any logged-in admin has full access. The `role` field on `users/{id}` remains cosmetic (dashboard display only), same as it is today.

## Data model (Firestore)

Collections mirror the existing TypeScript types in `lib/dashboard-data.ts` almost exactly — no fields are dropped or renamed, so the dashboard UI code barely changes.

- **`inventory/{id}`** — `Car & { status: InventoryStatus }`. Doc ID = the existing slug (e.g. `"bmw-m5-2023"`), preserved during migration so `/inventory/[id]` URLs don't change.
- **`leads/{id}`** — `{ name, email, phone, interestedIn, source, status, createdAt: Timestamp }`. Doc ID auto-generated for new leads (public form submissions); migrated seed leads keep their `lead-N` IDs.
- **`messages/{id}`** — `{ name, email, subject, message, receivedAt: Timestamp, read: boolean }`. Doc ID auto-generated / migrated `msg-N` IDs.
- **`users/{id}`** — `{ name, email, role, status }`. Doc ID auto-generated / migrated `user-N` IDs.

`createdAt`/`receivedAt` switch from ISO strings to Firestore `Timestamp`. Display code (`toLocaleDateString` etc.) reads `.toDate()` first.

## Firebase module layout

New files under `lib/firebase/`:

- `lib/firebase/config.ts` — (existing `lib/firebase.ts`, unchanged) exports `firebaseApp`.
- `lib/firebase/auth.ts` — `getFirebaseAuth()` (lazy `getAuth(firebaseApp)`), re-exports used directly by `lib/auth.ts`.
- `lib/firebase/db.ts` — `getFirebaseDb()` (lazy `getFirestore(firebaseApp)`).
- `lib/firebase/storage.ts` — `uploadInventoryImage(file: File, carId: string): Promise<string>` — uploads to `inventory/{carId}/{Date.now()}-{file.name}`, returns `getDownloadURL()` result.
- `lib/firebase/inventory.ts` — `useInventory()` hook (`onSnapshot` on `collection(db, "inventory")`) returning `{ items: InventoryItem[], loading: boolean, addVehicle, updateVehicle, deleteVehicle }`; plus a plain async `getInventoryOnce(): Promise<InventoryItem[]>` for server-component reads (homepage, detail page).
- `lib/firebase/leads.ts` — `useLeads()` hook returning `{ items, loading, updateStatus, deleteLead }`; plus plain async `createLead(input): Promise<void>` for the public forms (uses `addDoc` + `serverTimestamp()`).
- `lib/firebase/messages.ts` — `useMessages()` hook returning `{ items, loading, markRead, deleteMessage }`.
- `lib/firebase/users.ts` — `useTeamUsers()` hook returning `{ items, loading, addUser, updateRole, deleteUser }`.

Lazy `getAuth`/`getFirestore` (not called at module top level) avoids build-time crashes if env vars are ever missing, consistent with the Neon lazy-init pattern used elsewhere on Vercel.

## Auth wiring

`lib/auth.ts` keeps its existing exported function names (`login`, `logout`, `isAuthenticated`, `getCurrentUser`) so callers (`app/login/page.tsx`, `app/dashboard/layout.tsx`, `components/dashboard/sidebar.tsx`) need minimal changes, but the implementation changes:

- `login(email, password): Promise<void>` — calls `signInWithEmailAndPassword`, throws on failure (caller shows the Firebase error message, mapped to a friendly Spanish string for the common cases: invalid credential, too many requests).
- `logout(): Promise<void>` — calls `signOut`.
- `subscribeToAuth(callback: (user: CurrentUser | null) => void): Unsubscribe` — new export wrapping `onAuthStateChanged`. Replaces the synchronous `isAuthenticated()` check.
- `getCurrentUser()` is dropped in favor of reading the user from the `subscribeToAuth` callback (there's no synchronous "current user" available before Firebase Auth finishes initializing).

`app/dashboard/layout.tsx` changes from a one-time synchronous check to subscribing on mount:

```ts
useEffect(() => {
  const unsubscribe = subscribeToAuth((user) => {
    if (!user) { router.replace("/login"); return; }
    setCurrentUser(user);
    setReady(true);
  });
  return unsubscribe;
}, [router]);
```

`components/dashboard/sidebar.tsx` receives `currentUser` as a prop from the layout instead of calling `getCurrentUser()` itself (it can't synchronously read Firebase Auth state either).

`app/login/page.tsx`'s `handleSubmit` becomes `async`, awaits `login(email, password)`, and on rejection sets a form-level error instead of always navigating to `/dashboard`.

## Dashboard page changes

Each of `app/dashboard/{inventory,leads,contact,users}/page.tsx` swaps:

```diff
- const [inventory, setInventory] = useLocalStorage("dt_inventory", seedInventory);
+ const { items: inventory, loading, addVehicle, updateVehicle, deleteVehicle } = useInventory();
```

Handler bodies (`handleSave`, `handleDelete`, `updateStatus`, `updateRole`, `markRead`, etc.) change from `setX(prev => ...)` array transforms to calling the corresponding hook action (e.g. `updateVehicle(id, patch)`, `deleteVehicle(id)`). JSX and validation logic are otherwise unchanged. A simple loading state (existing empty-shell pattern already used for the auth-gate flash) covers the brief `onSnapshot` initial fetch.

**Inventory modal image field** (`app/dashboard/inventory/page.tsx`): add a file `<input type="file" accept="image/*">` next to the existing image-URL text input. On file select, call `uploadInventoryImage(file, editingId ?? draftTempId)`, show a small inline spinner/progress state, and set `draft.image` to the returned URL on completion. The URL field remains editable as a fallback/override.

## Public site changes

- **`components/car-grid.tsx`**: replace `import { cars } from "@/data/cars"` with `useInventory()` (read-only subset: `items`, `loading`); render nothing extra for `loading` beyond the existing empty-state (grid just renders 0 cards momentarily — acceptable, matches page's existing "use client" + Framer Motion mount pattern).
- **`app/inventory/[id]/page.tsx`**: switch from `cars.find(...)` (static import) to `getInventoryOnce()` + `.find(...)`. Becomes:
  ```ts
  const items = await getInventoryOnce();
  const car = items.find((item) => item.id === id);
  const detail = car ? carDetails[car.id] : undefined;
  if (!car) notFound();
  const resolvedDetail = detail ?? buildFallbackDetail(car);
  ```
  New helper `buildFallbackDetail(car)` in `data/car-details.ts` returns `{ images: [car.image], editorial: null, features: [] }`-shaped content for cars with no hand-authored entry. `EditorialDescription`/`FeatureColumns` are updated to render nothing when given empty/null input (small conditional guard, not a redesign).
  `getSimilarCars` takes the fetched `items` array as a parameter instead of importing the static `cars` array.
- **`components/car-detail/car-inquiry-form.tsx`**: `handleEmailSubmit` and `handleWhatsAppSubmit` both call `createLead({ name, email, phone, interestedIn: `${car.year} ${car.make} ${car.model}`, source: "Sitio web", status: "New" })` before their existing confirmation/redirect behavior. Errors are caught and logged; the UI still shows the confirmation (a failed lead-write shouldn't block the user's WhatsApp handoff), but a console warning is emitted for now — no retry UI (out of scope).
- **`components/trade-in-form.tsx`**: `handleSubmit` reads the form via `new FormData(event.currentTarget)`, calls `createLead({ name, email, phone, interestedIn: `${make} ${model} ${year} (trade-in)`, source: "Sitio web", status: "New" })`, same error handling as above.

## Migration / seed script

`scripts/seed-firestore.mjs` (Node script, run manually and once):

- Reads admin credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars (or CLI args), signs in via `signInWithEmailAndPassword` so writes pass the security rules above.
- Writes the 9 cars from `data/cars.ts` (status from today's `INVENTORY_STATUS_BY_ID` map) into `inventory/{car.id}`.
- Writes the 8 `seedLeads`, 5 `seedMessages`, 4 `seedUsers` from `lib/dashboard-data.ts` into their collections, converting `createdAt`/`receivedAt` strings to `Timestamp.fromDate(new Date(...))`.
- Logs a summary count per collection and exits.
- Documented as a one-time script in a comment header; safe to delete after running (or re-run — writes use `setDoc` with fixed IDs, so it's idempotent for the seed data).

`lib/dashboard-data.ts`'s `seed*` exports and `data/cars.ts`'s `cars` export stay in the repo (the seed script needs them, and `cars`'s `Car` type is still imported for typing) but are no longer imported by any page component once the migration lands.

## Error handling

- Firestore hook failures (e.g. rules not yet published, offline) surface as a `loading`/`error` state in each hook; pages show the existing empty-table state plus a small inline error line ("No se pudo cargar — intenta de nuevo") rather than crashing.
- `createLead` failures on public forms are caught and swallowed from the user's perspective (see above) — the business goal (don't block a hot lead) outweighs guaranteeing delivery for this pass.
- Auth errors on login map Firebase's `auth/invalid-credential`, `auth/too-many-requests`, and a generic fallback to short Spanish messages, shown the same way today's required-field errors are shown.

## Testing

No test framework exists in this repo (consistent with prior work). Verification is manual:

1. Confirm prerequisites are done (Auth provider + user, Firestore, Storage, rules published, Vercel env vars set).
2. Run `node scripts/seed-firestore.mjs` and confirm all four collections populate in the Firebase Console.
3. Dev server: log in with the real admin account (and confirm a wrong password is rejected); confirm inventory/leads/contact/users pages load the seeded data.
4. Add/edit/delete a vehicle, including uploading a photo; confirm it appears on the public homepage grid and detail page.
5. Submit the car-inquiry form and the trade-in form on the public site; confirm new leads appear in the dashboard's Leads page.
6. Update a lead's status, mark a message read, change a team user's role, delete a record in each dashboard page; confirm changes persist across a reload.
7. Log out and confirm `/dashboard` redirects to `/login`.

## Out of scope

- Admin SDK / server-side privilege checks (no service account available).
- Role-based (Admin/Manager/Sales) enforcement in security rules.
- Self-serve admin signup flow.
- Retry/offline queueing for failed lead writes.
- A public "Contact Us" form feeding the `messages` collection (none exists today; `messages` stays seed-only + dashboard-managed).
- Automated tests (none exist elsewhere in the repo).
