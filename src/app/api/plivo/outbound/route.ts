import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import { triggerOutboundCall } from "@/lib/plivo/plivoClient";

export async function POST(req: NextRequest) {
  try {
    const clientKey = getClientKey(req);
    // Limit outbound calls to 5 per minute per IP to prevent telecom toll fraud / abuse
    const { allowed } = checkRateLimit(`plivo_outbound:${clientKey}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many call attempts. Please wait a minute before requesting another call." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { phoneNumber, industryId = "automobile", speaker = "ritu" } = body;

    if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const result = await triggerOutboundCall({
      to: phoneNumber.trim(),
      industryId,
      speaker,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, code: result.error },
        { status: result.error === "PLIVO_NOT_CONFIGURED" ? 503 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      requestUuid: result.requestUuid,
    });
  } catch (error: any) {
    console.error("[Plivo Outbound Route Error]:", error);
    return NextResponse.json(
      { error: "Internal server error triggering phone call." },
      { status: 500 }
    );
  }
}
