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
