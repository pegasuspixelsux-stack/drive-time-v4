"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RangeSlider } from "@/components/range-slider";

const LOAN_TERMS = [12, 24, 36, 48, 60];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function monthlyPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
) {
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

export function FinanceCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState(68000);
  const [downPayment, setDownPayment] = useState(10000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [termMonths, setTermMonths] = useState(60);

  const principal = Math.max(vehiclePrice - downPayment, 0);

  const { payment, totalCost, totalInterest } = useMemo(() => {
    const payment = monthlyPayment(principal, interestRate, termMonths);
    const totalCost = payment * termMonths;
    const totalInterest = totalCost - principal;
    return { payment, totalCost, totalInterest };
  }, [principal, interestRate, termMonths]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-7">
        <RangeSlider
          label="Precio del Vehículo"
          value={vehiclePrice}
          min={20000}
          max={250000}
          step={500}
          onChange={setVehiclePrice}
          formatValue={(v) => currency.format(v)}
        />
        <RangeSlider
          label="Pago Inicial"
          value={downPayment}
          min={0}
          max={vehiclePrice}
          step={500}
          onChange={setDownPayment}
          formatValue={(v) => currency.format(v)}
        />
        <RangeSlider
          label="Tasa de Interés (TEA)"
          value={interestRate}
          min={0}
          max={15}
          step={0.1}
          onChange={setInterestRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />

        <div className="flex flex-col gap-3">
          <label className="text-[0.85rem] font-medium text-muted">
            Plazo del Préstamo
          </label>
          <div className="flex flex-wrap gap-2">
            {LOAN_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setTermMonths(term)}
                className={`relative rounded-full px-4 py-2 text-[0.85rem] font-medium transition-colors duration-200 ${
                  termMonths === term
                    ? "text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {termMonths === term && (
                  <motion.span
                    layoutId="term-pill"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{term} m.</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-surface/70 p-6 sm:p-7">
        <div>
          <p className="text-[0.85rem] font-medium text-muted">
            Cuota Mensual Estimada
          </p>
          <motion.p
            key={Math.round(payment)}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            {currency.format(Number.isFinite(payment) ? payment : 0)}
          </motion.p>
          <p className="mt-1 text-[0.8rem] text-muted-2">por mes</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 text-[0.85rem]">
          <div className="flex items-center justify-between">
            <span className="text-muted">Monto del préstamo</span>
            <span className="font-medium text-foreground">
              {currency.format(principal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Interés total</span>
            <span className="font-medium text-foreground">
              {currency.format(Math.max(totalInterest, 0))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Costo total</span>
            <span className="font-medium text-foreground">
              {currency.format(Math.max(totalCost, 0))}
            </span>
          </div>
        </div>

        <p className="text-[0.75rem] leading-relaxed text-muted-2">
          Solo a modo de estimación. Las tasas y condiciones finales dependen de la aprobación crediticia.
        </p>
      </div>
    </div>
  );
}
