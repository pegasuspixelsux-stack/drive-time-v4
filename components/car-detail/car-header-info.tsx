import type { Car } from "@/data/cars";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DETAIL_APR = 6.9;
const DETAIL_TERM_MONTHS = 60;
const DETAIL_DOWN_RATE = 0.3;

function estimateDetailMonthlyPayment(price: number) {
  const principal = price * (1 - DETAIL_DOWN_RATE);
  const monthlyRate = DETAIL_APR / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, DETAIL_TERM_MONTHS);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

export function CarHeaderInfo({ car }: { car: Car }) {
  const monthly = estimateDetailMonthlyPayment(car.price);

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {car.year} {car.make} {car.model}
          </h1>
          <p className="mt-1 text-[0.95rem] text-muted">{car.trim}</p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {currency.format(monthly)}
            <span className="text-base font-normal text-muted">/mes</span>
          </p>
          <p className="mt-1 text-[0.9rem] text-muted">
            Precio total: {currency.format(car.price)}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-4 text-[0.78rem] leading-relaxed text-muted-2">
        Cuota calculada con un pago inicial del 30%, una tasa de interés del
        6.9% y un plazo de 60 meses. Sujeto a aprobación crediticia.
      </p>
    </div>
  );
}
