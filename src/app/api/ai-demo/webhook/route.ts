import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import { parseSlotWithChrono } from "@/lib/dateEngine";
import { DOCTOR_ROSTER } from "@/data/clinicTemplates";
import { buildAutomobileWebhookPayload } from "@/automobile/automobileWebhook";

// Fixed destinations for confirmed clinic bookings — real, external automation
// endpoints, not the generic (currently unconfigured) AI_DEMO_WEBHOOK_URL used
// for the rest of the demo. Deliberately hardcoded here rather than accepted
// from the request body, same reasoning as the generic webhook below: never
// let a caller choose where PII gets sent. Every confirmed booking is sent to
// BOTH — the live production endpoint and the n8n test endpoint — so nothing
// depends on picking the "right" one; whichever one it needs to reach, it does.
const CLINIC_BOOKING_WEBHOOK_URLS = [
  "https://aiautomation.digicides.com/webhook/clinic_booking",
  "https://aiautomation.digicides.com/webhook-test/clinic_booking",
];

// Default recipient for the automation's own internal notification — separate
// from the caller's own mobile number, which is what the WhatsApp message goes to.
const CLINIC_NOTIFICATION_EMAIL = "dean@digicides.com";

// "9876543210" / "+91 98765 43210" / "91-9876543210" → "919876543210"
function normalizePhoneForWebhook(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

// "Thursday, 27 August 2026 10:30 AM" → "27 August 2026, 10:30 AM"
// Strips a leading weekday (the model includes one; the target format
// doesn't want it) and inserts the comma the target format expects between
// the date and the time, without assuming an exact upstream date format.
function normalizeDateTimeForWebhook(raw: string): string {
  if (!raw) return raw;
  let s = raw.trim();
  s = s.replace(/^[A-Za-z]+day,\s*/, "");
  s = s.replace(/(\d{4})\s+(?=\d{1,2}:\d{2}\s*[AaPp][Mm])/, "$1, ");
  return s;
}

// Splits a combined slot string into its date and time parts separately.
// Resolves relative phrases ("Tomorrow 11:45 AM") to absolute dates so WhatsApp templates display clean date & time.
function splitDateTimeForWebhook(raw: string): { date: string; time: string; full: string } {
  if (!raw) return { date: "", time: "", full: "" };
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const parsed = parseSlotWithChrono(raw, nowIST);
  if (parsed && parsed.hasDate) {
    const d = parsed.date;
    const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()];
    const date = `${d.getDate()} ${monthName} ${d.getFullYear()}`;
    const hour12 = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    const min = d.getMinutes().toString().padStart(2, "0");
    const time = `${hour12}:${min} ${ampm}`;
    return { date, time, full: `${date}, ${time}` };
  }
  const s = normalizeDateTimeForWebhook(raw || "");
  const timeMatch = s.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|baje))\s*$/);
  if (timeMatch && typeof timeMatch.index === "number") {
    const time = timeMatch[1].trim();
    const date = s.slice(0, timeMatch.index).replace(/,\s*$/, "").trim();
    return { date, time, full: `${date}, ${time}` };
  }
  return { date: s, time: "", full: s };
}

// "Cardiology" + name → "Cardiology appointment booking" — a short, fixed-shape
// summary for the automation/notification side, never longer than ~5 words.
function buildBookingSummary(department: string): string {
  const dept = (department || "General Consultation").trim();
  return `${dept} appointment booking`;
}

// "R. K. Sharma" → "Dr. R. K. Sharma"; "Dr Sharma" → "Dr. Sharma" (normalizes
// the period, doesn't duplicate the title if it's already there).
function normalizeDoctorNameForWebhook(raw: string): string {
  const name = (raw || "").trim();
  if (!name) return name;
  const withoutTitle = name.replace(/^Dr\.?\s*/i, "").trim();
  return `Dr. ${withoutTitle}`;
}

export async function POST(req: Request) {
  try {
    const clientKey = getClientKey(req);
    const { allowed } = checkRateLimit(`webhook:${clientKey}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    // NOTE: the destination URL is intentionally NEVER taken from the request
    // body — accepting a client-supplied webhook URL would let any caller
    // direct this server to POST lead data (including PII) to an arbitrary
    // (including internal) URL. It is server-config-only, by design.
    const webhookUrl = process.env.AI_DEMO_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;

    const payload = {
      event: "ai_demo_intake_completed",
      source: "Namuste Multi-Industry Interactive AI Demo",
      industryId: body.industryId,
      industryName: body.industryName,
      channel: body.channel || "web_voice_call",
      lead: {
        name: body.lead?.name || "Anonymous Visitor",
        mobile: body.lead?.mobile || "Not provided",
        dob: body.lead?.dob || null,
        ...body.lead?.customFields,
      },
      intent: body.intent || "General Business Inquiry",
      summary: body.summary || "Intake successfully completed",
      systemAction: body.systemAction || {},
      transcript: body.transcript || [],
      timestamp: new Date().toISOString(),
    };

    console.log("[Namuste AI Demo Webhook Intake Payload]:", JSON.stringify(payload, null, 2));

    // ── Clinic booking → fixed external automation webhook ──────────────────
    // The client's payload nests the industry id under `industry.id`, not
    // `industryId` — matching what's actually sent (see triggerWebhookDispatch
    // in AIVoiceChatbotEngine.tsx) rather than the top-level field the generic
    // payload above reads (which is always undefined for that reason).
    const industryId = body.industry?.id || body.industryId;
    let clinicWebhookDelivered: boolean | null = null;
    let clinicWebhookResults: { url: string; delivered: boolean }[] = [];
    if (industryId === "doctors-clinics") {
      const { date, time, full } = splitDateTimeForWebhook(body.lead?.confirmedSlot || "");
      const dept = body.lead?.department || "Dermatology";
      const resolvedDoctor = body.lead?.assignedDoctorOrLead && !body.lead?.assignedDoctorOrLead.toLowerCase().includes("specialist")
        ? body.lead.assignedDoctorOrLead
        : (DOCTOR_ROSTER[dept]?.doctor || "Dr. Pooja Gupta");
      const refId = body.lead?.referenceId || `SUN-${Math.floor(10000 + Math.random() * 90000)}`;

      const clinicPayload = {
        name: body.lead?.name || "Patient",
        phone_number: normalizePhoneForWebhook(body.lead?.mobile || ""),
        date_time: full || normalizeDateTimeForWebhook(body.lead?.confirmedSlot || ""),
        date: date || "Upcoming",
        time: time || "11:00 AM",
        doctor_name: normalizeDoctorNameForWebhook(resolvedDoctor),
        dob: body.lead?.dob || "",
        reference_id: refId,
        email: CLINIC_NOTIFICATION_EMAIL,
        booking_summary: buildBookingSummary(dept),
      };

      // Fire to every configured clinic endpoint in parallel — one being down
      // or slow never blocks or skips the other.
      const dispatches = await Promise.allSettled(
        CLINIC_BOOKING_WEBHOOK_URLS.map((url) =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clinicPayload),
          })
        )
      );

      clinicWebhookResults = dispatches.map((result, i) => {
        const url = CLINIC_BOOKING_WEBHOOK_URLS[i];
        if (result.status === "fulfilled") {
          console.log("[Clinic Booking Webhook]:", url, result.value.status, JSON.stringify(clinicPayload));
          return { url, delivered: result.value.ok };
        }
        console.warn("[Clinic Booking Webhook Error]:", url, result.reason);
        return { url, delivered: false };
      });
      clinicWebhookDelivered = clinicWebhookResults.some((r) => r.delivered);
    }

    // ── Automobile booking / lead → automobile webhook destination ────────────
    let automobileWebhookDelivered: boolean | null = null;
    let automobilePayload: any = null;
    if (industryId === "automobile") {
      const intent = body.lead?.intent || "SERVICE_BOOKING";
      const refId = body.lead?.referenceId || `SB-${Math.floor(10000 + Math.random() * 90000)}`;
      automobilePayload = buildAutomobileWebhookPayload({
        intent,
        extracted: {
          name: body.lead?.name,
          mobile: body.lead?.mobile,
          vehicleModel: body.lead?.vehicleModel,
          registrationNumber: body.lead?.registrationNumber,
          serviceType: body.lead?.serviceType || body.lead?.department,
          dealerLocation: body.lead?.dealerLocation || body.lead?.assignedDoctorOrLead,
          slot: body.lead?.confirmedSlot,
        },
        transcript: body.transcript || [],
        referenceId: refId,
        source: body.channel || "web_voice_call",
      });

      console.log("[Automobile AI Webhook Payload]:", JSON.stringify(automobilePayload, null, 2));

      const automobileWebhookUrl = process.env.AUTOMOBILE_WEBHOOK_URL;
      if (automobileWebhookUrl && automobileWebhookUrl.trim() !== "" && automobileWebhookUrl.startsWith("http")) {
        try {
          const autoRes = await fetch(automobileWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Namuste-Automobile-Voice-Engine/1.0",
            },
            body: JSON.stringify(automobilePayload),
          });
          automobileWebhookDelivered = autoRes.ok;
          console.log("[Automobile Webhook Dispatch]:", automobileWebhookUrl, autoRes.status);
        } catch (autoErr) {
          console.warn("[Automobile Webhook Error]:", automobileWebhookUrl, autoErr);
          automobileWebhookDelivered = false;
        }
      }
    }

    if (webhookUrl && webhookUrl.trim() !== "" && webhookUrl.startsWith("http")) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Namuste-AI-Demo-Engine/1.0",
          },
          body: JSON.stringify(payload),
        });

        return NextResponse.json({
          success: true,
          delivered: response.ok,
          status: response.status,
          webhookUrlConfigured: true,
          clinicWebhookDelivered,
          clinicWebhookResults,
          automobileWebhookDelivered,
          payload,
        });
      } catch (postError) {
        console.error("Webhook Dispatch Network Error:", postError);
        return NextResponse.json({
          success: true,
          delivered: false,
          error: "Failed to reach remote webhook destination",
          clinicWebhookDelivered,
          clinicWebhookResults,
          automobileWebhookDelivered,
          payload,
        });
      }
    }

    return NextResponse.json({
      success: true,
      delivered: false,
      webhookUrlConfigured: false,
      clinicWebhookDelivered,
      clinicWebhookResults,
      automobileWebhookDelivered,
      message: "Payload recorded locally. Webhook URL will receive data once configured.",
      payload,
    });
  } catch (error) {
    console.error("Webhook route error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
