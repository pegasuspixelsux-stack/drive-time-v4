"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cars } from "@/data/cars";
import { CarCard, type CardLayout } from "@/components/car-card";
import { fadeUp, staggerContainer } from "@/lib/motion";

const BODY_TYPE_PILLS = ["All", "Sedan", "SUV", "Coupe"] as const;

const BODY_TYPE_LABELS: Record<(typeof BODY_TYPE_PILLS)[number], string> = {
  All: "Todos",
  Sedan: "Sedán",
  SUV: "SUV",
  Coupe: "Cupé",
};

export function CarGrid() {
  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPE_PILLS)[number]>("All");
  const [cardLayout, setCardLayout] = useState<CardLayout>("horizontal");

  const visibleCars =
    bodyType === "All" ? cars : cars.filter((car) => car.bodyType === bodyType);

  return (
    <section id="inventory" className="bg-background px-3 pb-28 pt-[5%] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 hidden md:block"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Inventario Destacado
          </h2>
          <p className="mt-3 max-w-md text-[0.95rem] text-muted">
            Nueve vehículos seleccionados a mano, cada uno inspeccionado y
            certificado antes de llegar a ti.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {BODY_TYPE_PILLS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBodyType(type)}
                className={`rounded-full border px-4 py-2 text-[0.85rem] font-medium transition-colors duration-200 ${
                  bodyType === type
                    ? "border-foreground bg-foreground text-accent-foreground"
                    : "border-border-strong text-muted hover:text-foreground"
                }`}
              >
                {BODY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong p-1">
            <button
              type="button"
              aria-label="Vista horizontal"
              aria-pressed={cardLayout === "horizontal"}
              onClick={() => setCardLayout("horizontal")}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                cardLayout === "horizontal"
                  ? "bg-foreground text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Rows3 size={16} />
            </button>
            <button
              type="button"
              aria-label="Vista vertical"
              aria-pressed={cardLayout === "vertical"}
              onClick={() => setCardLayout("vertical")}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                cardLayout === "vertical"
                  ? "bg-foreground text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className={`grid gap-3 sm:gap-6 ${
            cardLayout === "vertical"
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {visibleCars.map((car) => (
            <CarCard key={car.id} car={car} layout={cardLayout} />
          ))}
        </motion.div>

        <a
          href="#inventory"
          className="mt-8 block text-center text-[0.9rem] font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Ver todo el inventario
        </a>
      </div>
    </section>
  );
}
