import { NextRequest, NextResponse } from "next/server";
import { getPlivoSession, deletePlivoSession } from "@/lib/plivo/plivoSessionStore";

export async function POST(req: NextRequest) {
  try {
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

    const callUuid = body.CallUUID || body.call_uuid || "";
    const duration = body.Duration || body.duration || "0";
    const billDuration = body.BillDuration || body.bill_duration || "0";
    const hangupCause = body.HangupCause || body.hangup_cause || "NORMAL_CLEARING";

    if (callUuid) {
      const session = getPlivoSession(callUuid);
      if (session) {
        const elapsedSecs = Math.round((Date.now() - session.startTime) / 1000);
        console.log(`[Plivo Call Ended]: CallUUID: ${callUuid}, Duration: ${duration || elapsedSecs}s, BillDuration: ${billDuration}s, Cause: ${hangupCause}, Turns: ${session.history.length}`);
        deletePlivoSession(callUuid);
      }
    }

    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    console.warn("[Plivo Hangup Error]:", err);
    return new NextResponse("OK", { status: 200 });
  }
}
