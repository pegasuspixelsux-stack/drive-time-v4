import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getInventoryOnce } from "@/lib/firebase/inventory-read";
import type { InventoryItem } from "@/lib/dashboard-data";
import { carDetails, buildFallbackDetail } from "@/data/car-details";
import { CarSlideshow } from "@/components/car-detail/car-slideshow";
import { CarHeaderInfo } from "@/components/car-detail/car-header-info";
import { EditorialDescription } from "@/components/car-detail/editorial-description";
import { FeatureColumns } from "@/components/car-detail/feature-columns";
import { CarInquiryForm } from "@/components/car-detail/car-inquiry-form";
import { SimilarCarsSlider } from "@/components/car-detail/similar-cars-slider";

function getSimilarCars(
  items: InventoryItem[],
  currentId: string,
  bodyType: InventoryItem["bodyType"],
): InventoryItem[] {
  const sameBodyType = items.filter(
    (item) => item.id !== currentId && item.bodyType === bodyType,
  );
  if (sameBodyType.length >= 3) return sameBodyType.slice(0, 6);

  const sameBodyTypeIds = new Set(sameBodyType.map((item) => item.id));
  const others = items.filter(
    (item) => item.id !== currentId && !sameBodyTypeIds.has(item.id),
  );
  return [...sameBodyType, ...others].slice(0, 6);
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const items = await getInventoryOnce();
  const car = items.find((item) => item.id === id);

  if (!car) {
    notFound();
  }

  const detail = carDetails[car.id] ?? buildFallbackDetail(car);
  const similarCars = getSimilarCars(items, car.id, car.bodyType);

  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="flex-1 bg-zinc-50 pt-24 sm:pt-28">
        <CarSlideshow images={detail.images} />
        <CarHeaderInfo car={car} />
        {detail.editorial.paragraphs.length > 0 && (
          <EditorialDescription editorial={detail.editorial} />
        )}
        {detail.features.length > 0 && <FeatureColumns features={detail.features} />}
        <CarInquiryForm car={car} />
        <SimilarCarsSlider cars={similarCars} />
      </main>
      <Footer />
    </div>
  );
}
