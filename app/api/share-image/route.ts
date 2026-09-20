import { NextRequest, NextResponse } from "next/server";
import { isAllowedImageUrl } from "@/lib/image-hosts";

// Firebase Storage (and most remote image hosts) don't send
// Access-Control-Allow-Origin, so loading a listing photo straight into a
// <canvas> for the Instagram graphic taints it and canvas.toBlob() throws.
// This route re-serves an allow-listed image from our own origin so the
// browser treats it as same-origin and the canvas stays exportable.
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src || !isAllowedImageUrl(src)) {
    return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
  }

  const upstream = await fetch(src);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
