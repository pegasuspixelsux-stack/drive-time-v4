"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { useMessages } from "@/lib/firebase/messages";
import { fadeUp, staggerContainer } from "@/lib/motion";

function formatTimestamp(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ContactPage() {
  const { items: messages, loading, markRead, deleteMessage } = useMessages();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const active = messages.find((message) => message.id === activeId) ?? null;

  const openMessage = (message: { id: string; read: boolean }) => {
    setActiveId(message.id);
    if (!message.read) {
      void markRead(message.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteMessage(id);
    setConfirmDeleteId(null);
    setActiveId(null);
  };

  const unreadCount = messages.filter((message) => !message.read).length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contacto</h1>
        <p className="mt-1 text-sm text-slate-500">{unreadCount} sin leer de {messages.length} mensajes.</p>
      </div>

      <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">Cargando mensajes…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${message.read ? "bg-transparent" : "bg-indigo-600"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`truncate text-sm ${message.read ? "font-normal text-slate-700" : "font-semibold text-slate-900"}`}>
                        {message.name}
                      </p>
                      <span className="flex-shrink-0 text-xs text-slate-400">{formatTimestamp(message.receivedAt)}</span>
                    </div>
                    <p className="truncate text-sm text-slate-600">{message.subject}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <Modal open={active !== null} onClose={() => { setActiveId(null); setConfirmDeleteId(null); }} title={active?.subject ?? ""}>
        {active && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{active.name}</p>
              <p className="text-xs text-slate-500">{active.email} · {formatTimestamp(active.receivedAt)}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{active.message}</p>
            <button
              type="button"
              onClick={() => handleDelete(active.id)}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${
                confirmDeleteId === active.id
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <Trash2 size={15} />
              {confirmDeleteId === active.id ? "Confirmar eliminación" : "Eliminar mensaje"}
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
