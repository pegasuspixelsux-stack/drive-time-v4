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
