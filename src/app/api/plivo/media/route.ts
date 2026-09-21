import { NextRequest, NextResponse } from "next/server";
import { getPlivoMedia } from "@/lib/plivo/plivoMediaStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing audio id", { status: 400 });
  }

  const media = getPlivoMedia(id);
  if (!media) {
    return new NextResponse("Audio clip not found or expired", { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.buffer), {
    status: 200,
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": media.buffer.length.toString(),
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
