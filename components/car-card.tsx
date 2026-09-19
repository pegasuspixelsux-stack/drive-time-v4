"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gauge, Calendar, Zap, Fuel, ArrowUpRight } from "lucide-react";
import type { Car } from "@/data/cars";
import { fadeUp } from "@/lib/motion";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const mileageFormat = new Intl.NumberFormat("en-US");

const ESTIMATE_APR = 6.5;
const ESTIMATE_TERM_MONTHS = 60;
const ESTIMATE_DOWN_RATE = 0.1;

const BODY_TYPE_LABELS: Record<string, string> = {
  Sedan: "Sedán",
  SUV: "SUV",
  Coupe: "Cupé",
};

const FUEL_TYPE_LABELS: Record<string, string> = {
  Gasoline: "Nafta",
  Hybrid: "Híbrido",
  Electric: "Eléctrico",
};

function estimateMonthlyPayment(price: number) {
  const principal = price * (1 - ESTIMATE_DOWN_RATE);
  const monthlyRate = ESTIMATE_APR / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, ESTIMATE_TERM_MONTHS);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

export function CarCard({ car }: { car: Car }) {
  const FuelIcon = car.fuelType === "Electric" ? Zap : Fuel;

  return (
    <motion.article
      variants={fadeUp}
      className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-surface-2"
    >
      <Image
        src={car.image}
        alt={`${car.year} ${car.make} ${car.model} ${car.trim}`}
        fill
        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.08]"
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0)_33%)]" />

      <span className="glass absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[0.75rem] font-medium text-white">
        {BODY_TYPE_LABELS[car.bodyType] ?? car.bodyType}
      </span>

      <Link
        href={`/inventory/${car.id}`}
        aria-label="Ver detalles"
        className="glass absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors duration-200 ease-out group-hover:bg-white group-hover:text-black"
      >
        <ArrowUpRight
          size={16}
          className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-5">
        <div>
          <h3 className="text-[1.05rem] font-semibold leading-tight text-white">
            {car.make} {car.model}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.8rem] text-white/70">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full border border-white/40"
              style={{ backgroundColor: car.colorHex }}
            />
            <span>{car.color}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-white/70">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge size={14} />
            <span>{mileageFormat.format(car.mileage)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FuelIcon size={14} />
            <span>{FUEL_TYPE_LABELS[car.fuelType] ?? car.fuelType}</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-2">
          <p className="whitespace-nowrap text-[0.75rem] text-white/60">
            {currency.format(car.price)}
          </p>
          <p className="text-[1.2rem] font-semibold leading-none text-white">
            {currencyPrecise.format(estimateMonthlyPayment(car.price))}
            <span className="text-[0.75rem] font-normal text-white/70">/mes</span>
          </p>
        </div>
      </div>
    </motion.article>
  );
}
