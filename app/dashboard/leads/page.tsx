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
  const { items: leads, loading, error, updateStatus, deleteLead } = useLeads();
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
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-red-600">
                  No se pudo cargar — intenta de nuevo.
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
