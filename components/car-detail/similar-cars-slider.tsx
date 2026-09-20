"use client";

import { motion } from "framer-motion";
import type { Car } from "@/data/cars";
import { CarCard } from "@/components/car-card";
import { staggerContainer } from "@/lib/motion";

export function SimilarCarsSlider({ cars }: { cars: Car[] }) {
  if (cars.length === 0) return null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Vehículos similares
      </h2>
      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {cars.map((car) => (
          <div key={car.id} className="w-52 flex-shrink-0 snap-start sm:w-60">
            <CarCard car={car} layout="portrait" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
