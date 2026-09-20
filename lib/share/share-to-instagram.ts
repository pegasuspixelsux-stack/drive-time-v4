import type { Car } from "@/data/cars";
import {
  DEFAULT_GRADIENT_COLOR,
  DEFAULT_INSTAGRAM_HANDLE,
  DEFAULT_LOGO_SRC,
  defaultPriceText,
  defaultTitle,
  generateInstagramGraphic,
  GRADIENT_INTENSITY_DEFAULT,
  slugify,
} from "@/lib/share/instagram-graphic";

export type ShareCarOutcome = "shared" | "downloaded" | "cancelled";

// One-click "Share to Instagram" for a listing card: composite the same branded
// story graphic the dashboard's Instagram Post Generator produces (car photo,
// bottom gradient, price/spec text, logo, footer stripe), then hand it off so the
// visitor finishes and posts it themselves in their own Instagram account.
//
// There's no official web API to reach into a visitor's Instagram app and drop an
// image straight into a Story/post draft — that capability is only exposed to
// native iOS/Android apps. The closest honest equivalent on the open web:
//   - Phone: the OS-native Share sheet (Web Share API), so the visitor picks
//     Instagram from their own installed apps and lands in its normal share flow.
//   - Desktop: no native share target exists for Instagram, so we download the
//     image and open instagram.com in a new tab for a manual upload.
export async function shareCarToInstagram(item: Car): Promise<ShareCarOutcome> {
  const blob = await generateInstagramGraphic({
    imageSrc: item.image,
    logoSrc: DEFAULT_LOGO_SRC,
    title: defaultTitle(item),
    priceText: defaultPriceText(item),
    logoPosition: "right",
    format: "story",
    gradientColor: DEFAULT_GRADIENT_COLOR,
    gradientIntensity: GRADIENT_INTENSITY_DEFAULT,
    instagramHandle: DEFAULT_INSTAGRAM_HANDLE,
    item,
  });

  const filename = `${slugify(`${item.year}-${item.make}-${item.model}`)}-drivetime.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const canUseShareSheet =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canUseShareSheet) {
    try {
      await navigator.share({
        files: [file],
        title: `${item.make} ${item.model}`,
        text: `${item.make} ${item.model} — ${defaultPriceText(item)} en DriveTime`,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Any other share-sheet failure falls through to the download fallback below.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  return "downloaded";
}
