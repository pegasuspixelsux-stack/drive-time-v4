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
