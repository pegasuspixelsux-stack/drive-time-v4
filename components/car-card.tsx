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

export type CardLayout = "horizontal" | "vertical";

export function CarCard({
  car,
  layout = "horizontal",
}: {
  car: Car;
  layout?: CardLayout;
}) {
  const FuelIcon = car.fuelType === "Electric" ? Zap : Fuel;
  const isVertical = layout === "vertical";

  return (
    <motion.article
      variants={fadeUp}
      className={`group relative flex overflow-hidden rounded-2xl bg-transparent ${
        isVertical ? "flex-col" : "flex-row"
      }`}
    >
      <Link
        href={`/inventory/${car.id}`}
        aria-label="Ver detalles"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground transition-colors duration-200 ease-out group-hover:border-foreground/40 group-hover:bg-foreground group-hover:text-accent-foreground"
      >
        <ArrowUpRight
          size={16}
          className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>

      <div
        className={
          isVertical
            ? "relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden bg-surface-2"
            : "relative aspect-square w-2/5 flex-shrink-0 self-start overflow-hidden bg-surface-2 sm:aspect-auto sm:w-1/2 sm:self-stretch"
        }
      >
        <Image
          src={car.image}
          alt={`${car.year} ${car.make} ${car.model} ${car.trim}`}
          fill
          sizes={
            isVertical
              ? "(min-width: 768px) 25vw, 50vw"
              : "(min-width: 640px) 25vw, 40vw"
          }
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.08]"
        />
        <span className="glass absolute left-3 top-3 rounded-full px-3 py-1 text-[0.75rem] font-medium text-foreground">
          {BODY_TYPE_LABELS[car.bodyType] ?? car.bodyType}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5 sm:gap-4">
        <div>
          <h3 className="text-[1.05rem] font-semibold leading-tight text-foreground">
            {car.make} {car.model}
          </h3>
          <div className="mt-0.5 hidden items-center gap-1.5 text-[0.85rem] text-muted sm:flex">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full border border-border-strong"
              style={{ backgroundColor: car.colorHex }}
            />
            <span>{car.color}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[0.78rem] text-muted sm:grid-cols-3 sm:border-t sm:border-border sm:pt-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge size={14} />
            <span>{mileageFormat.format(car.mileage)} km</span>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <FuelIcon size={14} />
            <span>{FUEL_TYPE_LABELS[car.fuelType] ?? car.fuelType}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1 sm:border-t sm:border-border sm:pt-4">
          <p className="whitespace-nowrap text-[0.8rem] text-muted">
            {currency.format(car.price)}
          </p>
          <div className="text-right sm:text-left">
            <p className="text-[1.3rem] font-semibold leading-none text-foreground">
              {currencyPrecise.format(estimateMonthlyPayment(car.price))}
              <span className="hidden sm:inline">/mes</span>
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted sm:hidden">/mes</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
