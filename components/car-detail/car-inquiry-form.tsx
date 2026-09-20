"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import type { Car } from "@/data/cars";
import { fadeUp } from "@/lib/motion";
import { createLead } from "@/lib/firebase/leads";

const WHATSAPP_NUMBER = "14155550148";

const fieldClass =
  "h-12 w-full rounded-xl border border-border-strong bg-surface px-4 text-[0.9rem] text-foreground placeholder:text-muted-2 transition-colors duration-200 focus-visible:border-foreground/50 focus-visible:outline-none";

interface InquiryDraft {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const EMPTY_DRAFT: InquiryDraft = { name: "", email: "", phone: "", message: "" };

function buildWhatsAppUrl(car: Car, draft: InquiryDraft) {
  const carLabel = `${car.year} ${car.make} ${car.model}`;
  const lines = [
    `Hola, me interesa el ${carLabel}.`,
    draft.name && `Mi nombre es ${draft.name}.`,
    draft.email && `Correo electrónico: ${draft.email}`,
    draft.message,
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join(" "))}`;
}

function recordLead(car: Car, draft: InquiryDraft) {
  void createLead({
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    interestedIn: `${car.year} ${car.make} ${car.model}`,
    source: "Sitio web",
  }).catch((error) => {
    console.warn("No se pudo guardar el prospecto:", error);
  });
}

export function CarInquiryForm({ car }: { car: Car }) {
  const [draft, setDraft] = useState<InquiryDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof InquiryDraft, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const nextErrors: Partial<Record<keyof InquiryDraft, string>> = {};
    if (!draft.name.trim()) nextErrors.name = "El nombre es obligatorio";
    if (!draft.email.trim()) nextErrors.email = "El correo electrónico es obligatorio";
    if (!draft.message.trim()) nextErrors.message = "El mensaje es obligatorio";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    recordLead(car, draft);
    setSubmitted(true);
  };

  const handleWhatsAppSubmit = () => {
    if (!validate()) return;
    recordLead(car, draft);
    window.open(buildWhatsAppUrl(car, draft), "_blank", "noreferrer");
  };

  if (submitted) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8"
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-foreground">
            <CheckCircle2 size={22} />
          </span>
          <h3 className="text-[1.05rem] font-semibold text-foreground">
            Consulta recibida
          </h3>
          <p className="text-[0.9rem] text-muted">
            Un asesor se pondrá en contacto en breve sobre el {car.year} {car.make}{" "}
            {car.model}.
          </p>
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_DRAFT);
              setSubmitted(false);
            }}
            className="mt-2 text-[0.85rem] font-medium text-foreground underline decoration-border-strong underline-offset-4"
          >
            Enviar otra consulta
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          ¿Te interesa este vehículo?
        </h2>
        <p className="mt-2 text-[0.9rem] text-muted">
          Envía tu consulta y un asesor se pondrá en contacto contigo.
        </p>

        <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[0.8rem] font-medium text-muted">Nombre</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Jordan Avery"
                className={fieldClass}
              />
              {errors.name && <p className="text-[0.78rem] text-red-500">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[0.8rem] font-medium text-muted">Correo electrónico</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="you@email.com"
                className={fieldClass}
              />
              {errors.email && <p className="text-[0.78rem] text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-medium text-muted">Teléfono</label>
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="(415) 555-0148"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-medium text-muted">Mensaje</label>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              placeholder={`Me gustaría saber más sobre el ${car.year} ${car.make} ${car.model}...`}
              rows={4}
              className={`${fieldClass} h-auto resize-none py-3`}
            />
            {errors.message && (
              <p className="text-[0.78rem] text-red-500">{errors.message}</p>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground"
            >
              <Send size={16} />
              Enviar por email
            </motion.button>
            <motion.button
              type="button"
              onClick={handleWhatsAppSubmit}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[0.9rem] font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
              Enviar por WhatsApp
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
