"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CarDetailImage } from "@/data/car-details";

const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;

export function CarSlideshow({ images }: { images: CarDetailImage[] }) {
  const [index, setIndex] = useState(0);

  const goTo = (next: number) => {
    setIndex((next + images.length) % images.length);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD) {
      goTo(index + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD) {
      goTo(index - 1);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] px-6 pt-8 sm:px-8">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-zinc-100 shadow-lg">
        <motion.div
          className="flex h-full w-full cursor-grab active:cursor-grabbing"
          drag="x"
          dragElastic={0.15}
          dragConstraints={{ left: 0, right: 0 }}
          dragSnapToOrigin={true}
          onDragEnd={handleDragEnd}
          animate={{ x: `${-index * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        >
          {images.map((image, i) => (
            <div key={image.src + i} className="relative h-full w-full flex-shrink-0">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="pointer-events-none object-cover object-[center_33%]"
                priority={i === 0}
              />
            </div>
          ))}
        </motion.div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => goTo(index - 1)}
              className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md transition-transform duration-200 hover:scale-105"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => goTo(index + 1)}
              className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md transition-transform duration-200 hover:scale-105"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {images.map((image, i) => (
                <button
                  key={image.src + i}
                  type="button"
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
