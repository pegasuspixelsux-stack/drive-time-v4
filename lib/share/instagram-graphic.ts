import type { Car } from "@/data/cars";
import { isAllowedImageUrl } from "@/lib/image-hosts";

export type LogoPosition = "left" | "center" | "right";
export type PostFormat = "square" | "feed" | "story";

export const FORMAT_OPTIONS: {
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
export const DEFAULT_GRADIENT_COLOR = "#000000";

export const GRADIENT_INTENSITY_MIN = 40;
export const GRADIENT_INTENSITY_MAX = 100;
export const GRADIENT_INTENSITY_STEP = 10;
export const GRADIENT_INTENSITY_DEFAULT = 100;

export const FUEL_TYPE_LABELS: Record<string, string> = {
  Gasoline: "Nafta",
  Hybrid: "Híbrido",
  Electric: "Eléctrico",
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const mileageFormat = new Intl.NumberFormat("en-US");

export const PAYMENT_APR = 6.9;
export const PAYMENT_TERM_MONTHS = 60;
export const PAYMENT_DOWN_RATE = 0.3;

export function estimateMonthlyPayment(price: number) {
  const principal = price * (1 - PAYMENT_DOWN_RATE);
  const monthlyRate = PAYMENT_APR / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, PAYMENT_TERM_MONTHS);
  return (principal * (monthlyRate * factor)) / (factor - 1);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function defaultTitle(item: Car) {
  return `${item.make} ${item.model}`;
}

export function defaultPriceText(item: Car) {
  return `${currency.format(estimateMonthlyPayment(item.price))}/mes`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Whether a color reads as "dark" (needs light text/overlay on top of it), using the
// standard perceptual-luminance weighting rather than a plain RGB average.
export function isColorDark([r, g, b]: [number, number, number]): boolean {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const PADDING = 56;

// The dealership's brand mark, pulled from the global system configuration. Staff can
// override it per-graphic (see "Identidad de Marca") without touching this default.
export const DEFAULT_LOGO_SRC = "/drivetime-logo.svg";
export const LOGO_MAX_WIDTH = 220;
export const LOGO_MAX_HEIGHT = 64;

export const FOOTER_STRIPE_HEIGHT = 64;

// The dealership's Instagram handle for the stripe's "Visítenos" line. Staff can override it
// per-graphic (see "Instagram" in the edit pane) the same way they can override the logo.
export const DEFAULT_INSTAGRAM_HANDLE = "@drivetime";

export const DISCLAIMER_TEXT =
  "Pago calculado con 30% de seña, 6.9% de interés en 60 cuotas sujeto a aprobación de crédito.";

// The single vertical stride that governs every gap AND every multi-line block in the
// bottom text stack (title / specs+pricing / disclaimer), for all three presets. Title
// lines use a 2x multiple of it; every other stride -- the gap between rows and the gap
// between a stacked pricing line and its total-price line -- is exactly 1x. This is what
// keeps the grid mathematically consistent instead of each row inventing its own spacing.
export const LINE_HEIGHT = 16;
export const TITLE_LINE_HEIGHT = LINE_HEIGHT * 2;
export const ASCENT_FALLBACK = 24;
export const DESCENT_FALLBACK = 14;

export const TITLE_FONT = "800 58px system-ui, sans-serif";
export const SPECS_FONT = "600 32px system-ui, sans-serif";
export const PAYMENT_FONT = "700 46px system-ui, sans-serif";
export const TOTAL_PRICE_FONT = "500 26px system-ui, sans-serif";
export const DISCLAIMER_FONT = "400 16px system-ui, sans-serif";

// Firebase Storage (and most remote image hosts) don't send
// Access-Control-Allow-Origin, so loading a listing photo straight into the canvas
// would taint it and canvas.toBlob() would throw. Route allow-listed remote images
// through our same-origin proxy; local paths and data: URLs (an uploaded logo) are
// already safe and pass through untouched.
export function resolveShareableImageSrc(src: string): string {
  if (src.startsWith("data:") || src.startsWith("/")) return src;
  if (isAllowedImageUrl(src)) {
    return `/api/share-image?src=${encodeURIComponent(src)}`;
  }
  return src;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = resolveShareableImageSrc(src);
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
    item: Car;
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

export async function generateInstagramGraphic({
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
  item: Car;
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
