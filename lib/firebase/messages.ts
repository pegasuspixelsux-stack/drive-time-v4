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
