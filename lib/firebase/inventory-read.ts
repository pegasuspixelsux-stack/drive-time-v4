import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/db";
import type { InventoryItem } from "@/lib/dashboard-data";

const COLLECTION = "inventory";

function toInventoryItem(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    id,
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    trim: String(data.trim ?? ""),
    year: Number(data.year ?? new Date().getFullYear()),
    price: Number(data.price ?? 0),
    mileage: Number(data.mileage ?? 0),
    transmission: String(data.transmission ?? ""),
    fuelType: (data.fuelType as InventoryItem["fuelType"]) ?? "Gasoline",
    bodyType: (data.bodyType as InventoryItem["bodyType"]) ?? "Sedan",
    color: String(data.color ?? ""),
    colorHex: String(data.colorHex ?? "#000000"),
    status: (data.status as InventoryItem["status"]) ?? "Available",
    image: String(data.image ?? ""),
  };
}

export async function getInventoryOnce(): Promise<InventoryItem[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((docSnap) => toInventoryItem(docSnap.id, docSnap.data()));
}
