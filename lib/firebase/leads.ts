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
