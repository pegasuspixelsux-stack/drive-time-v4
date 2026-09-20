"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Car } from "@/data/cars";
import { fadeUp, staggerContainer } from "@/lib/motion";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const mileageFormat = new Intl.NumberFormat("en-US");

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
          <motion.div key={car.id} variants={fadeUp} className="snap-start">
            <Link
              href={`/inventory/${car.id}`}
              className="group relative block h-72 w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 transition-colors hover:border-zinc-300"
            >
              <Image
                src={car.image}
                alt={`${car.year} ${car.make} ${car.model}`}
                fill
                sizes="256px"
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-14">
                <p className="font-semibold text-white">
                  {car.make} {car.model}
                </p>
                <p className="mt-1 text-[0.82rem] text-white/75">
                  {mileageFormat.format(car.mileage)} km
                </p>
                <p className="mt-2 text-[0.95rem] font-semibold text-white">
                  {currency.format(car.price)}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
