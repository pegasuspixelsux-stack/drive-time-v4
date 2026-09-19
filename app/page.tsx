import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { WhyChooseUs } from "@/components/why-choose-us";
import { FinanceTabs } from "@/components/finance-tabs";
import { CarGrid } from "@/components/car-grid";
import { PreFooterHero } from "@/components/pre-footer-hero";
import { Footer } from "@/components/footer";
import { getInventoryOnce } from "@/lib/firebase/inventory-read";
import type { InventoryItem } from "@/lib/dashboard-data";

export default async function Home() {
  let initialCars: InventoryItem[] = [];
  try {
    initialCars = await getInventoryOnce();
  } catch {
    // Firestore may be unreachable or rules not yet published at build/render
    // time — fall back to an empty seed and let the client-side subscription
    // in useInventory() pick up data (and surface its own error) at runtime.
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />

        <CarGrid initialCars={initialCars} />
        <WhyChooseUs />
        <FinanceTabs />
        <PreFooterHero />
      </main>
      <Footer />
    </>
  );
}
