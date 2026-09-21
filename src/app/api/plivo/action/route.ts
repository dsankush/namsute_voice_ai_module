import { NextRequest, NextResponse } from "next/server";
import { getPlivoConfig } from "@/lib/plivo/plivoClient";
import {
  getPlivoSession,
  getOrCreatePlivoSession,
  decodeStatelessToken,
  encodeStatelessToken,
} from "@/lib/plivo/plivoSessionStore";
import { buildSpeechPromptXml, buildFarewellXml, buildErrorXml, getSarvamMediaUrl } from "@/lib/plivo/plivoXmlBuilder";
import { processChatTurn } from "@/app/api/ai-demo/chat/route";
import { transcribeSpeech } from "@/app/api/ai-demo/speech/route";
import { buildAutomobileWebhookPayload } from "@/automobile/automobileWebhook";

async function parsePlivoActionParams(req: NextRequest) {
  const url = new URL(req.url);
  const queryCallUuid = url.searchParams.get("callUuid") || "";
  const queryToken = url.searchParams.get("token") || "";

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

  const callUuid = body.CallUUID || body.call_uuid || queryCallUuid || `call_${Date.now()}`;
  const speech = body.Speech || body.speech || "";
  const recordUrl = body.RecordUrl || body.record_url || "";

  return { callUuid, speech, recordUrl, token: queryToken };
}

export async function POST(req: NextRequest) {
  try {
    const config = getPlivoConfig();
    const appUrl = config?.appUrl || "https://namsute-voice-ai-module.vercel.app";
    const { callUuid, speech, recordUrl, token } = await parsePlivoActionParams(req);

    // 1. Resolve Session State (in-memory or restored from query token)
    let session = getPlivoSession(callUuid);
    if (!session) {
      const restored = decodeStatelessToken(token);
      session = getOrCreatePlivoSession(callUuid, restored || undefined);
    }

    // 2. Extract Caller Speech
    let userText = speech.trim();

    // Fallback: If Plivo didn't provide speech text directly, but provided a recording URL, transcribe via Sarvam
    if (!userText && recordUrl) {
      try {
        const audioRes = await fetch(recordUrl);
        if (audioRes.ok) {
          const arrayBuffer = await audioRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString("base64");
          const sttResult = await transcribeSpeech(base64Audio);
          if (sttResult.transcript) {
            userText = sttResult.transcript.trim();
          }
        }
      } catch (recErr) {
        console.warn("[Plivo Recording Transcription Warning]:", recErr);
      }
    }

    // If still no speech detected, prompt the user again gently
    if (!userText) {
      const retryText =
        session.industryId === "automobile"
          ? "I didn't quite hear you. How can Apex Motors assist you today?"
          : "I'm sorry, I couldn't hear that clearly. Could you please repeat?";

      const nextToken = encodeStatelessToken(session);
      const actionUrl = `${appUrl}/api/plivo/action?callUuid=${encodeURIComponent(callUuid)}&token=${encodeURIComponent(nextToken)}`;
      const retryAudioUrl = getSarvamMediaUrl(appUrl, retryText, session.speaker, "en-IN");

      const xml = buildSpeechPromptXml({
        audioUrl: retryAudioUrl,
        fallbackText: retryText,
        actionUrl,
        speechEndTimeout: 2,
        executionTimeout: 15,
        language: "en-IN",
      });

      return new NextResponse(xml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    // 3. Append User Message to History
    session.history.push({
      speaker: "user",
      text: userText,
    });

    // 4. Process Turn via Central Unified Brain
    const turnResult = await processChatTurn({
      industryId: session.industryId,
      messages: session.history,
      userMessage: userText,
      currentExtracted: session.currentExtracted,
    });

    const {
      finalReply,
      finalSpokenText,
      finalLangCode,
      finalExtracted,
      finalIsComplete,
      finalCallEnded,
      toneHint,
    } = turnResult;

    // Update Session State
    session.currentExtracted = { ...session.currentExtracted, ...finalExtracted };
    session.history.push({
      speaker: "ai",
      text: finalReply,
      language: finalLangCode,
    });
    session.lastSpokenText = finalSpokenText || finalReply;
    session.isComplete = finalIsComplete;

    // 5. Speech text
    const speechText = finalSpokenText || finalReply;
    const plivoLang = finalLangCode === "hi-IN" ? "hi-IN" : "en-IN";

    // 6. Check Completion & Webhook Dispatch
    const isFinished = finalIsComplete || finalCallEnded;

    if (finalIsComplete) {
      // Trigger Webhook Dispatch asynchronously
      try {
        const refId = session.currentExtracted.appointment_id || session.currentExtracted.reference_id || `PLV-${Math.floor(10000 + Math.random() * 90000)}`;
        let webhookPayload: any;

        if (session.industryId === "automobile") {
          webhookPayload = buildAutomobileWebhookPayload({
            intent: session.currentExtracted.intent || "SERVICE_BOOKING",
            extracted: session.currentExtracted,
            transcript: session.history.map((m) => `[${m.speaker.toUpperCase()}]: ${m.text}`),
            referenceId: refId,
            source: "plivo_cellular_call",
          });
        } else {
          webhookPayload = {
            event: "clinic.appointment.booked",
            industry: { id: "doctors-clinics", name: "Doctors & Clinics" },
            lead: session.currentExtracted,
            transcript: session.history.map((m) => `[${m.speaker.toUpperCase()}]: ${m.text}`),
            channel: "plivo_cellular_call",
            timestamp: new Date().toISOString(),
          };
        }

        // Send to configured webhook endpoint
        const targetWebhook = process.env.AUTOMOBILE_WEBHOOK_URL || process.env.AI_DEMO_WEBHOOK_URL;
        if (targetWebhook && targetWebhook.startsWith("http")) {
          fetch(targetWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookPayload),
          }).catch((err) => console.warn("[Plivo Webhook Async Warning]:", err));
        }
      } catch (hookErr) {
        console.warn("[Plivo Webhook Error]:", hookErr);
      }
    }

    // 7. Shape Plivo XML Response
    if (isFinished) {
      const farewellAudioUrl = getSarvamMediaUrl(appUrl, finalReply, session.speaker, finalLangCode, "confirmed");
      const farewellXml = buildFarewellXml({
        audioUrl: farewellAudioUrl,
        farewellText: finalReply,
        language: plivoLang,
      });
      return new NextResponse(farewellXml, {
        status: 200,
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    const nextToken = encodeStatelessToken(session);
    const actionUrl = `${appUrl}/api/plivo/action?callUuid=${encodeURIComponent(callUuid)}&token=${encodeURIComponent(nextToken)}`;
    const replyAudioUrl = getSarvamMediaUrl(appUrl, speechText, session.speaker, finalLangCode, toneHint);

    const xml = buildSpeechPromptXml({
      audioUrl: replyAudioUrl,
      fallbackText: speechText,
      actionUrl,
      speechEndTimeout: 2,
      executionTimeout: 15,
      language: plivoLang,
    });

    return new NextResponse(xml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("[Plivo Action Error]:", error);
    const errorXml = buildErrorXml();
    return new NextResponse(errorXml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}
