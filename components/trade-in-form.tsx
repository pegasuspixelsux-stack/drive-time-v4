"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { FormField, FormInput, FormSelect } from "@/components/form-controls";
import { createLead } from "@/lib/firebase/leads";

const CONDITIONS = ["Excelente", "Bueno", "Regular", "Necesita reparaciones"];

export function TradeInForm() {
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const make = String(formData.get("make") ?? "");
    const model = String(formData.get("model") ?? "");
    const year = String(formData.get("year") ?? "");
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");

    void createLead({
      name,
      email,
      phone,
      interestedIn: `${make} ${model} ${year} (trade-in, ${condition})`,
      source: "Sitio web",
    }).catch((error) => {
      console.warn("No se pudo guardar el prospecto:", error);
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center gap-3 py-14 text-center"
      >
        <span className="glass flex h-12 w-12 items-center justify-center rounded-full text-foreground">
          <CheckCircle2 size={22} />
        </span>
        <h3 className="text-[1.05rem] font-semibold text-foreground">
          Solicitud de tasación recibida
        </h3>
        <p className="max-w-sm text-[0.9rem] text-muted">
          Un asesor se pondrá en contacto con la valuación de tu vehículo
          dentro del siguiente día hábil.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 text-[0.85rem] font-medium text-foreground underline decoration-border-strong underline-offset-4"
        >
          Tasar otro vehículo
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.form
        key="trade-in-form"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Marca">
            <FormInput required placeholder="ej. BMW" name="make" />
          </FormField>
          <FormField label="Modelo">
            <FormInput required placeholder="ej. M5" name="model" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Año">
            <FormInput
              required
              type="number"
              placeholder="ej. 2021"
              min={1980}
              max={2027}
              name="year"
            />
          </FormField>
          <FormField label="Kilometraje">
            <FormInput
              required
              type="number"
              placeholder="ej. 32.000"
              min={0}
              name="mileage"
            />
          </FormField>
        </div>

        <FormField label="Estado General">
          <FormSelect
            options={CONDITIONS}
            value={condition}
            onChange={setCondition}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Nombre Completo">
            <FormInput required placeholder="Jordan Avery" name="name" />
          </FormField>
          <FormField label="Correo Electrónico">
            <FormInput
              required
              type="email"
              placeholder="tu@email.com"
              name="email"
            />
          </FormField>
        </div>

        <FormField label="Teléfono">
          <FormInput
            required
            type="tel"
            placeholder="(415) 555-0148"
            name="phone"
          />
        </FormField>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-2 flex h-12 items-center justify-center rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground"
        >
          Obtener Mi Estimación de Tasación
        </motion.button>
      </motion.form>
    </AnimatePresence>
  );
}
