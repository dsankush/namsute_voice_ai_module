import { NextRequest, NextResponse } from "next/server";
import { generateSarvamTTS } from "@/app/api/ai-demo/speech/route";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const textParam = searchParams.get("t") || searchParams.get("text");
  const speaker = searchParams.get("s") || searchParams.get("speaker") || "ritu";
  const lang = searchParams.get("l") || searchParams.get("lang") || "en-IN";
  const tone = (searchParams.get("tone") || "neutral") as any;

  if (!textParam || textParam.trim().length === 0) {
    return new NextResponse("Missing text parameter", { status: 400 });
  }

  let text = textParam;
  try {
    // Decode base64url if passed
    if (!textParam.includes(" ") && textParam.length >= 16) {
      const decoded = Buffer.from(textParam, "base64url").toString("utf-8");
      if (decoded && decoded.trim().length > 0) {
        text = decoded;
      }
    }
  } catch {
    text = textParam;
  }

  try {
    const tts = await generateSarvamTTS(text.trim(), speaker, lang, tone);
    if (!tts.audioBase64) {
      return new NextResponse("Failed to synthesize audio", { status: 502 });
    }

    const buffer = Buffer.from(tts.audioBase64, "base64");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Plivo Media Synthesize Error]:", error);
    return new NextResponse("Internal server error generating audio", { status: 500 });
  }
}

