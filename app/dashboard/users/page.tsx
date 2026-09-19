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
  const { items: users, loading, error, addUser, updateRole, deleteUser } = useTeamUsers();
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
            {!loading && error && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-red-600">
                  No se pudo cargar — intenta de nuevo.
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
