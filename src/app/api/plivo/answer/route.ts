import { NextRequest, NextResponse } from "next/server";
import { getPlivoConfig } from "@/lib/plivo/plivoClient";
import { getOrCreatePlivoSession, encodeStatelessToken } from "@/lib/plivo/plivoSessionStore";
import { buildSpeechPromptXml, buildErrorXml } from "@/lib/plivo/plivoXmlBuilder";
import { AUTOMOBILE_TEMPLATES } from "@/automobile/automobileTemplates";
import { CLINIC_TEMPLATES } from "@/data/clinicTemplates";

async function parsePlivoParams(req: NextRequest) {
  const url = new URL(req.url);
  const queryIndustry = url.searchParams.get("industry") || "automobile";
  const querySpeaker = url.searchParams.get("speaker") || "ritu";

  let body: Record<string, string> = {};
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        body[key] = val.toString();
      });
    } else if (contentType.includes("application/json")) {
      body = await req.json();
    }
  } catch {
    // Ignore body parsing errors
  }

  const callUuid = body.CallUUID || body.call_uuid || `call_${Date.now()}`;
  const fromNumber = body.From || body.from || "";
  const industryId = queryIndustry || body.industry || "automobile";
  const speaker = querySpeaker || body.speaker || "ritu";

  return { callUuid, fromNumber, industryId, speaker };
}

export async function POST(req: NextRequest) {
  return handleAnswer(req);
}

export async function GET(req: NextRequest) {
  return handleAnswer(req);
}

async function handleAnswer(req: NextRequest) {
  try {
    const config = getPlivoConfig();
    const appUrl = config?.appUrl || "https://namsute-voice-ai-module.vercel.app";
    const { callUuid, fromNumber, industryId, speaker } = await parsePlivoParams(req);

    // Initial greeting template
    const greetingText =
      industryId === "automobile"
        ? AUTOMOBILE_TEMPLATES["en-IN"].greeting
        : CLINIC_TEMPLATES["en-IN"].greeting;

    // Create call session
    const session = getOrCreatePlivoSession(callUuid, {
      industryId,
      speaker,
      callerPhone: fromNumber,
      history: [{ speaker: "ai", text: greetingText, language: "en-IN" }],
      currentExtracted: fromNumber ? { mobile: fromNumber } : {},
      lastSpokenText: greetingText,
    });

    const token = encodeStatelessToken(session);
    const actionUrl = `${appUrl}/api/plivo/action?callUuid=${encodeURIComponent(callUuid)}&token=${encodeURIComponent(token)}`;

    // Deliver instant carrier-grade Polly TTS prompt XML without 404 media risks
    const xml = buildSpeechPromptXml({
      fallbackText: greetingText,
      actionUrl,
      speechEndTimeout: 2,
      executionTimeout: 15,
      language: "en-IN",
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[Plivo Answer Error]:", error);
    const errorXml = buildErrorXml();
    return new NextResponse(errorXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
