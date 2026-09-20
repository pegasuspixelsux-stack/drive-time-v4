"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Edit3, ImageUp, Minus, Plus, RotateCcw, X } from "lucide-react";
import type { InventoryItem } from "@/lib/dashboard-data";
import { carDetails, type CarDetailImage } from "@/data/car-details";
import {
  currency,
  DEFAULT_GRADIENT_COLOR,
  DEFAULT_INSTAGRAM_HANDLE,
  DEFAULT_LOGO_SRC,
  defaultPriceText,
  defaultTitle,
  DISCLAIMER_TEXT,
  FORMAT_OPTIONS,
  FUEL_TYPE_LABELS,
  generateInstagramGraphic,
  GRADIENT_INTENSITY_DEFAULT,
  GRADIENT_INTENSITY_MAX,
  GRADIENT_INTENSITY_MIN,
  GRADIENT_INTENSITY_STEP,
  hexToRgb,
  isColorDark,
  type LogoPosition,
  mileageFormat,
  type PostFormat,
  slugify,
} from "@/lib/share/instagram-graphic";

const LOGO_POSITION_OPTIONS: { id: LogoPosition; label: string }[] = [
  { id: "left", label: "Izquierda" },
  { id: "center", label: "Centro" },
  { id: "right", label: "Derecha" },
];

export function InstagramPostModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}) {
  const gallery = useMemo<CarDetailImage[]>(() => {
    if (!item) return [];
    const detail = carDetails[item.id];
    if (detail && detail.images.length > 0) return detail.images;
    return [{ src: item.image, alt: `${item.make} ${item.model}` }];
  }, [item]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [priceText, setPriceText] = useState("");
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("right");
  const [format, setFormat] = useState<PostFormat>("square");
  const [gradientColor, setGradientColor] = useState(DEFAULT_GRADIENT_COLOR);
  const [gradientIntensity, setGradientIntensity] = useState(GRADIENT_INTENSITY_DEFAULT);
  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO_SRC);
  const [instagramHandle, setInstagramHandle] = useState(DEFAULT_INSTAGRAM_HANDLE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !item) return;
    setSelectedImageIndex(0);
    setTitle(defaultTitle(item));
    setPriceText(defaultPriceText(item));
    setLogoPosition("right");
    setFormat("square");
    setGradientColor(DEFAULT_GRADIENT_COLOR);
    setGradientIntensity(GRADIENT_INTENSITY_DEFAULT);
    setLogoSrc(DEFAULT_LOGO_SRC);
    setInstagramHandle(DEFAULT_INSTAGRAM_HANDLE);
    setError(null);
  }, [open, item]);

  if (!item) return null;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoSrc(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const blob = await generateInstagramGraphic({
        imageSrc: gallery[selectedImageIndex]?.src ?? item.image,
        logoSrc,
        title,
        priceText,
        logoPosition,
        format,
        gradientColor,
        gradientIntensity,
        instagramHandle,
        item,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(`${item.year}-${item.make}-${item.model}`)}-${format}-instagram-post.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeImage = gallery[selectedImageIndex] ?? { src: item.image, alt: item.model };
  const activeFormat = FORMAT_OPTIONS.find((f) => f.id === format) ?? FORMAT_OPTIONS[0];
  const [gradR, gradG, gradB] = hexToRgb(gradientColor);
  const isDark = isColorDark([gradR, gradG, gradB]);
  const primaryTextClass = isDark ? "text-white" : "text-slate-900";
  const secondaryTextClass = isDark ? "text-slate-200" : "text-slate-600";
  const mutedTextClass = isDark ? "text-slate-300" : "text-slate-500";
  const fuelLabel = FUEL_TYPE_LABELS[item.fuelType] ?? item.fuelType;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Generador de Publicación para Instagram
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div className="mx-auto w-full max-w-[420px]">
                <div
                  className={`relative w-full max-h-[70vh] overflow-hidden rounded-2xl bg-slate-100 ${activeFormat.aspectClass}`}
                >
                  <img
                    src={activeImage.src}
                    alt={activeImage.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-2/3"
                    style={{
                      background: `linear-gradient(to top, rgba(${gradR}, ${gradG}, ${gradB}, ${
                        gradientIntensity / 100
                      }) 0%, transparent 100%)`,
                    }}
                  />

                  {/* Logo position is the only layout choice the dealer makes -- the bottom
                      text block below (title / specs+pricing / disclaimer) never changes. */}
                  {logoPosition === "left" && (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="absolute left-3 top-3 h-8 max-w-[140px] object-contain object-left"
                    />
                  )}
                  {logoPosition === "center" && (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="absolute left-1/2 top-3 h-8 max-w-[140px] -translate-x-1/2 object-contain"
                    />
                  )}
                  {logoPosition === "right" && (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="absolute right-3 top-3 h-8 max-w-[140px] object-contain object-right"
                    />
                  )}

                  <div className="absolute inset-x-4 bottom-10 flex flex-col gap-1">
                    <p className={`text-right text-lg font-bold leading-none ${primaryTextClass}`}>
                      {priceText}
                    </p>
                    <p className={`line-clamp-2 text-2xl font-extrabold leading-tight ${primaryTextClass}`}>
                      {title}
                    </p>
                    <div className="flex items-end justify-between gap-3">
                      <p className={`truncate text-sm font-semibold ${secondaryTextClass}`}>
                        {item.year} | {mileageFormat.format(item.mileage)} km | {fuelLabel}
                      </p>
                      <p className={`text-xs ${mutedTextClass}`}>{currency.format(item.price)}</p>
                    </div>
                  </div>

                  <p
                    className={`absolute inset-x-4 bottom-7 text-center text-[0.45rem] leading-tight ${mutedTextClass}`}
                    style={{ opacity: 0.7 }}
                  >
                    {DISCLAIMER_TEXT}
                  </p>

                  <div
                    className={`absolute inset-x-0 bottom-0 flex h-7 items-center justify-center gap-2 px-3 text-[0.6rem] font-semibold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                    style={{ backgroundColor: gradientColor }}
                  >
                    <span>Visítenos {instagramHandle}</span>
                    <span>•</span>
                    <span>Link in Bio</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <Edit3 size={13} />
                    Título
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Precio / Cuota</label>
                  <input
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Identidad de Marca</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex h-12 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      <img src={logoSrc} alt="Logo actual" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLogoSrc(DEFAULT_LOGO_SRC)}
                        className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                      >
                        <RotateCcw size={12} />
                        Usar Logo Predeterminado
                      </button>
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                      >
                        <ImageUp size={12} />
                        Subir Nuevo Logo
                      </button>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Instagram</label>
                  <input
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@drivetime"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Formato</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormat(option.id)}
                        className={`rounded-xl border px-2 py-2 text-[0.75rem] font-medium transition-colors ${
                          format === option.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Color del Degradado</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <input
                      type="color"
                      value={gradientColor}
                      onChange={(e) => setGradientColor(e.target.value)}
                      aria-label="Color del degradado"
                      className="h-9 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    />
                    <span className="text-sm font-medium text-slate-900">{gradientColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Intensidad del Degradado</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setGradientIntensity((v) => Math.max(GRADIENT_INTENSITY_MIN, v - GRADIENT_INTENSITY_STEP))
                      }
                      disabled={gradientIntensity <= GRADIENT_INTENSITY_MIN}
                      aria-label="Disminuir intensidad"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="flex-1 text-center text-sm font-medium text-slate-900">
                      {gradientIntensity}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGradientIntensity((v) => Math.min(GRADIENT_INTENSITY_MAX, v + GRADIENT_INTENSITY_STEP))
                      }
                      disabled={gradientIntensity >= GRADIENT_INTENSITY_MAX}
                      aria-label="Aumentar intensidad"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Posición del Logo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LOGO_POSITION_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setLogoPosition(option.id)}
                        className={`rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
                          logoPosition === option.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-600">Fotos del vehículo</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((image, index) => (
                      <button
                        key={image.src + index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                          index === selectedImageIndex
                            ? "border-indigo-500"
                            : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} />
                  {isGenerating ? "Generando..." : "Descargar Imagen Final"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
