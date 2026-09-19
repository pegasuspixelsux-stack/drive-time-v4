"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Edit3, ImageUp, Minus, Plus, RotateCcw, X } from "lucide-react";
import type { InventoryItem } from "@/lib/dashboard-data";
import { carDetails, type CarDetailImage } from "@/data/car-details";

type LogoPosition = "left" | "center" | "right";
type PostFormat = "square" | "feed" | "story";

const LOGO_POSITION_OPTIONS: { id: LogoPosition; label: string }[] = [
  { id: "left", label: "Izquierda" },
  { id: "center", label: "Centro" },
  { id: "right", label: "Derecha" },
];

const FORMAT_OPTIONS: {
  id: PostFormat;
  label: string;
  width: number;
  height: number;
  aspectClass: string;
}[] = [
  { id: "square", label: "Cuadrado", width: 1080, height: 1080, aspectClass: "aspect-square" },
  { id: "feed", label: "Feed 4:5", width: 1080, height: 1350, aspectClass: "aspect-[4/5]" },
  { id: "story", label: "Historia 9:16", width: 1080, height: 1920, aspectClass: "aspect-[9/16]" },
];

// Dealers pick their own brand color for the gradient instead of a fixed dark/light choice.
// Text and stripe contrast then follow automatically from that color's luminance.
const DEFAULT_GRADIENT_COLOR = "#000000";

const GRADIENT_INTENSITY_MIN = 40;
const GRADIENT_INTENSITY_MAX = 100;
const GRADIENT_INTENSITY_STEP = 10;
const GRADIENT_INTENSITY_DEFAULT = 100;

const FUEL_TYPE_LABELS: Record<string, string> = {
  Gasoline: "Nafta",
  Hybrid: "Híbrido",
  Electric: "Eléctrico",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const mileageFormat = new Intl.NumberFormat("en-US");

const PAYMENT_APR = 6.9;
const PAYMENT_TERM_MONTHS = 60;
const PAYMENT_DOWN_RATE = 0.3;

function estimateMonthlyPayment(price: number) {
  const principal = price * (1 - PAYMENT_DOWN_RATE);
  const monthlyRate = PAYMENT_APR / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, PAYMENT_TERM_MONTHS);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function defaultTitle(item: InventoryItem) {
  return `${item.make} ${item.model}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Whether a color reads as "dark" (needs light text/overlay on top of it), using the
// standard perceptual-luminance weighting rather than a plain RGB average.
function isColorDark([r, g, b]: [number, number, number]): boolean {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function defaultPriceText(item: InventoryItem) {
  return `${currency.format(estimateMonthlyPayment(item.price))}/mes`;
}

const PADDING = 56;

// The dealership's brand mark, pulled from the global system configuration. Staff can
// override it per-graphic (see "Identidad de Marca") without touching this default.
const DEFAULT_LOGO_SRC = "/drivetime-logo.svg";
const LOGO_MAX_WIDTH = 220;
const LOGO_MAX_HEIGHT = 64;

const FOOTER_STRIPE_HEIGHT = 64;

// The dealership's Instagram handle for the stripe's "Visítenos" line. Staff can override it
// per-graphic (see "Instagram" in the edit pane) the same way they can override the logo.
const DEFAULT_INSTAGRAM_HANDLE = "@drivetime";

const DISCLAIMER_TEXT =
  "Pago calculado con 30% de seña, 6.9% de interés en 60 cuotas sujeto a aprobación de crédito.";

// The single vertical stride that governs every gap AND every multi-line block in the
// bottom text stack (title / specs+pricing / disclaimer), for all three presets. Title
// lines use a 2x multiple of it; every other stride -- the gap between rows and the gap
// between a stacked pricing line and its total-price line -- is exactly 1x. This is what
// keeps the grid mathematically consistent instead of each row inventing its own spacing.
const LINE_HEIGHT = 16;
const TITLE_LINE_HEIGHT = LINE_HEIGHT * 2;
const ASCENT_FALLBACK = 24;
const DESCENT_FALLBACK = 14;

const TITLE_FONT = "800 58px system-ui, sans-serif";
const SPECS_FONT = "600 32px system-ui, sans-serif";
const PAYMENT_FONT = "700 46px system-ui, sans-serif";
const TOTAL_PRICE_FONT = "500 26px system-ui, sans-serif";
const DISCLAIMER_FONT = "400 16px system-ui, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Fits an image within a box, preserving aspect ratio (equivalent to object-fit: contain).
function fitContain(naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}

// Draws the brand logo fit-contain within LOGO_MAX_WIDTH x LOGO_MAX_HEIGHT, anchored at
// (x, y) — y is the box's TOP edge, x is the left/right/center anchor per `align`.
function drawLogo(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  x: number,
  y: number,
  align: LogoPosition,
): { width: number; height: number } {
  const box = fitContain(logoImg.width, logoImg.height, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
  const drawX = align === "right" ? x - box.width : align === "center" ? x - box.width / 2 : x;
  ctx.drawImage(logoImg, drawX, y, box.width, box.height);
  return box;
}

// A solid opaque band pinned to the true canvas bottom, drawn dead last so it always sits
// on top of the image/gradient/content. Every bottom-anchored element positions itself
// against `contentBottom` (canvasHeight - FOOTER_STRIPE_HEIGHT), not the raw canvas height,
// so nothing is ever drawn underneath this stripe in the first place. Filled with the
// dealer's own picked brand color (not a fixed black/white) so the stripe reads as part of
// the same brand gradient as the overlay above it. Carries both the dealer tagline (built
// from the editable Instagram handle) and "Link in Bio" -- plain reference text, not a
// clickable link, since this is a flattened PNG -- centered together as one line.
function drawFooterStripe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stripeColor: string,
  isDark: boolean,
  instagramHandle: string,
) {
  ctx.fillStyle = stripeColor;
  ctx.fillRect(0, height - FOOTER_STRIPE_HEIGHT, width, FOOTER_STRIPE_HEIGHT);

  const textColor = isDark ? "#ffffff" : "#0f172a";
  const stripeCenterY = height - FOOTER_STRIPE_HEIGHT / 2 + 1;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`Visítenos ${instagramHandle}   •   Link in Bio`, width / 2, stripeCenterY);
}

/**
 * The bottom text block, built bottom-up (disclaimer → specs/total price → title → monthly
 * payment) so every row's position is derived from the ACTUAL measured edge of the row below
 * it — never from a static Y value that a sibling separately "compensates" for — so wrapping
 * text can never silently desync two unrelated rows. Every gap is exactly one LINE_HEIGHT;
 * the title's wrapped-line stride is exactly two. The brand logo is always drawn independently
 * at the top of the canvas (see the caller's logoPosition handling), entirely decoupled from
 * this block's height.
 */
function drawBottomBlock(
  ctx: CanvasRenderingContext2D,
  {
    width,
    contentBottom,
    title,
    item,
    priceText,
    primaryColor,
    secondaryColor,
    disclaimerColor,
  }: {
    width: number;
    contentBottom: number;
    title: string;
    item: InventoryItem;
    priceText: string;
    primaryColor: string;
    secondaryColor: string;
    disclaimerColor: string;
  },
) {
  const maxTextWidth = width - PADDING * 2;
  ctx.textBaseline = "alphabetic";

  // Row D (bottom-most): the disclaimer, centered, sitting LINE_HEIGHT above the stripe.
  ctx.font = DISCLAIMER_FONT;
  const disclaimerLines = wrapText(ctx, DISCLAIMER_TEXT, maxTextWidth).slice(0, 2);
  const disclaimerLastBaselineY = contentBottom - LINE_HEIGHT;
  const disclaimerStartY = disclaimerLastBaselineY - (disclaimerLines.length - 1) * LINE_HEIGHT;
  const disclaimerAscent =
    ctx.measureText(disclaimerLines[0] ?? "").actualBoundingBoxAscent || ASCENT_FALLBACK;
  const disclaimerTopY = disclaimerStartY - disclaimerAscent;

  // Row C: specs (left) + total cash price (right), sitting LINE_HEIGHT above the
  // disclaimer's top edge. Both share one baseline, so the row's vertical footprint is
  // governed by whichever of the two fonts actually has the bigger ascent/descent --
  // measured, not assumed.
  const totalPriceText = currency.format(item.price);
  ctx.font = TOTAL_PRICE_FONT;
  const totalPriceMetrics = ctx.measureText(totalPriceText);
  const fuelLabel = FUEL_TYPE_LABELS[item.fuelType] ?? item.fuelType;
  const leftSegments = [String(item.year), `${mileageFormat.format(item.mileage)} km`, fuelLabel];
  ctx.font = SPECS_FONT;
  const specsMetrics = ctx.measureText(leftSegments[0]);

  const row3Descent =
    Math.max(specsMetrics.actualBoundingBoxDescent || 0, totalPriceMetrics.actualBoundingBoxDescent || 0) ||
    DESCENT_FALLBACK;
  const row3Ascent =
    Math.max(specsMetrics.actualBoundingBoxAscent || 0, totalPriceMetrics.actualBoundingBoxAscent || 0) ||
    ASCENT_FALLBACK;
  const row3BaselineY = disclaimerTopY - LINE_HEIGHT - row3Descent;
  const row3TopY = row3BaselineY - row3Ascent;

  // Row B: title, sitting LINE_HEIGHT above row C's top edge, wrapping up to 2 lines at
  // TITLE_LINE_HEIGHT (2x) stride.
  ctx.font = TITLE_FONT;
  const titleLines = wrapText(ctx, title, maxTextWidth).slice(0, 2);
  const titleLastLineDescent =
    ctx.measureText(titleLines[titleLines.length - 1] ?? "").actualBoundingBoxDescent || DESCENT_FALLBACK;
  const titleLastBaselineY = row3TopY - LINE_HEIGHT - titleLastLineDescent;
  const titleStartY = titleLastBaselineY - (titleLines.length - 1) * TITLE_LINE_HEIGHT;
  const titleTopY =
    titleStartY - (ctx.measureText(titleLines[0] ?? "").actualBoundingBoxAscent || ASCENT_FALLBACK);

  // Row A (topmost): the monthly payment, called out above the heading, sitting LINE_HEIGHT
  // above the title's top edge.
  ctx.font = PAYMENT_FONT;
  const paymentDescent = ctx.measureText(priceText).actualBoundingBoxDescent || DESCENT_FALLBACK;
  const paymentBaselineY = titleTopY - LINE_HEIGHT - paymentDescent;

  // --- draw row A: payment ---
  ctx.font = PAYMENT_FONT;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = "right";
  ctx.fillText(priceText, width - PADDING, paymentBaselineY);

  // --- draw row B: title ---
  ctx.font = TITLE_FONT;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = "left";
  titleLines.forEach((line, i) => {
    ctx.fillText(line, PADDING, titleStartY + i * TITLE_LINE_HEIGHT);
  });

  // --- draw row C: specs (left) + total cash price (right) ---
  ctx.font = SPECS_FONT;
  ctx.fillStyle = secondaryColor;
  ctx.textAlign = "left";
  let cursorX = PADDING;
  leftSegments.forEach((segment, index) => {
    const text = index < leftSegments.length - 1 ? `${segment}  |  ` : segment;
    ctx.fillText(text, cursorX, row3BaselineY);
    cursorX += ctx.measureText(text).width;
  });

  ctx.font = TOTAL_PRICE_FONT;
  ctx.fillStyle = secondaryColor;
  ctx.textAlign = "right";
  ctx.fillText(totalPriceText, width - PADDING, row3BaselineY);

  // --- draw row D: disclaimer, centered ---
  ctx.font = DISCLAIMER_FONT;
  ctx.fillStyle = disclaimerColor;
  ctx.textAlign = "center";
  disclaimerLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, disclaimerStartY + i * LINE_HEIGHT);
  });
}

async function generateInstagramGraphic({
  imageSrc,
  logoSrc,
  title,
  priceText,
  logoPosition,
  format,
  gradientColor,
  gradientIntensity,
  instagramHandle,
  item,
}: {
  imageSrc: string;
  logoSrc: string;
  title: string;
  priceText: string;
  logoPosition: LogoPosition;
  format: PostFormat;
  gradientColor: string;
  gradientIntensity: number;
  instagramHandle: string;
  item: InventoryItem;
}): Promise<Blob> {
  const { width, height } = FORMAT_OPTIONS.find((f) => f.id === format) ?? FORMAT_OPTIONS[0];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo");

  const [img, logoImg] = await Promise.all([loadImage(imageSrc), loadImage(logoSrc)]);

  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  const [r, g, b] = hexToRgb(gradientColor);
  const isDark = isColorDark([r, g, b]);
  const gradTop = height * 0.45;
  const gradientRgb = `${r}, ${g}, ${b}`;
  const gradientAlpha = gradientIntensity / 100;
  const gradient = ctx.createLinearGradient(0, gradTop, 0, height);
  gradient.addColorStop(0, `rgba(${gradientRgb}, 0)`);
  gradient.addColorStop(1, `rgba(${gradientRgb}, ${gradientAlpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, gradTop, width, height - gradTop);

  const primaryColor = isDark ? "#ffffff" : "#0f172a";
  const secondaryColor = isDark ? "#e2e8f0" : "#334155";
  const disclaimerColor = isDark ? "rgba(226, 232, 240, 0.65)" : "rgba(51, 65, 85, 0.65)";

  // Every bottom-anchored element positions itself against contentBottom, not the raw canvas
  // height, leaving a clear FOOTER_STRIPE_HEIGHT band for the stripe drawn at the very end --
  // nothing above ever needs to know the stripe exists.
  const contentBottom = height - FOOTER_STRIPE_HEIGHT;

  // The logo is drawn independently at the top of the canvas, decoupled from the bottom
  // block's height. Its horizontal position (left / center / right) is the only layout
  // choice the dealer makes -- everything else in the bottom block is fixed.
  const logoX =
    logoPosition === "left" ? PADDING : logoPosition === "right" ? width - PADDING : width / 2;
  drawLogo(ctx, logoImg, logoX, PADDING, logoPosition);

  drawBottomBlock(ctx, {
    width,
    contentBottom,
    title,
    item,
    priceText,
    primaryColor,
    secondaryColor,
    disclaimerColor,
  });

  drawFooterStripe(ctx, width, height, gradientColor, isDark, instagramHandle);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen"));
    }, "image/png");
  });
}

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
