import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

let dbInstance: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(firebaseApp);
  }
  return dbInstance;
}
