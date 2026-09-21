import { NextResponse } from "next/server";
import { getPlivoConfig } from "@/lib/plivo/plivoClient";

export async function GET() {
  const config = getPlivoConfig();

  return NextResponse.json({
    configured: !!config,
    authIdConfigured: !!process.env.PLIVO_AUTH_ID,
    authTokenConfigured: !!process.env.PLIVO_AUTH_TOKEN,
    phoneNumber: config?.phoneNumber || "",
    appUrl: config?.appUrl || "https://namsute-voice-ai-module.vercel.app",
    inboundAnswerUrl: `${config?.appUrl || "https://namsute-voice-ai-module.vercel.app"}/api/plivo/answer`,
  });
}
