export interface PlivoConfig {
  authId: string;
  authToken: string;
  phoneNumber: string;
  appUrl: string;
}

export function getPlivoConfig(): PlivoConfig | null {
  const authId = process.env.PLIVO_AUTH_ID?.trim();
  const authToken = process.env.PLIVO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.PLIVO_PHONE_NUMBER?.trim() || "";
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://namsute-voice-ai-module.vercel.app"
  ).replace(/\/+$/, "");

  if (!authId || !authToken) {
    return null;
  }

  return {
    authId,
    authToken,
    phoneNumber,
    appUrl,
  };
}

export function isPlivoConfigured(): boolean {
  return getPlivoConfig() !== null;
}

/**
 * Standardizes raw phone input to E.164 format.
 * Defaults to Indian (+91) if 10 digits are provided.
 */
export function formatE164Phone(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // 10 digits without country code -> assumed India (+91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // 11 digits starting with 0 -> Indian national format (09876543210 -> +919876543210)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `+91${cleaned.slice(1)}`;
  }

  // 12 digits starting with 91 -> (+91...)
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

export interface TriggerOutboundCallParams {
  to: string;
  from?: string;
  industryId?: string;
  speaker?: string;
}

export interface TriggerOutboundCallResult {
  success: boolean;
  message: string;
  requestUuid?: string;
  error?: string;
}

/**
 * Triggers an outbound call using Plivo's REST API.
 * Docs: https://www.plivo.com/docs/voice/api/call#make-a-call
 */
export async function triggerOutboundCall(
  params: TriggerOutboundCallParams
): Promise<TriggerOutboundCallResult> {
  const config = getPlivoConfig();
  if (!config) {
    return {
      success: false,
      message: "Plivo credentials (PLIVO_AUTH_ID / PLIVO_AUTH_TOKEN) are not configured.",
      error: "PLIVO_NOT_CONFIGURED",
    };
  }

  const fromNumber = params.from || config.phoneNumber;
  if (!fromNumber) {
    return {
      success: false,
      message: "Plivo sender phone number (PLIVO_PHONE_NUMBER) is missing.",
      error: "SENDER_NUMBER_MISSING",
    };
  }

  const targetNumber = formatE164Phone(params.to);
  if (!targetNumber || targetNumber.length < 10) {
    return {
      success: false,
      message: "Invalid destination phone number. Please enter a valid 10-digit or E.164 number.",
      error: "INVALID_PHONE_NUMBER",
    };
  }

  const industry = params.industryId || "automobile";
  const speaker = params.speaker || "ritu";
  const answerUrl = `${config.appUrl}/api/plivo/answer?industry=${encodeURIComponent(industry)}&speaker=${encodeURIComponent(speaker)}`;
  const hangupUrl = `${config.appUrl}/api/plivo/hangup`;

  const authHeader = `Basic ${Buffer.from(`${config.authId}:${config.authToken}`).toString("base64")}`;
  const plivoEndpoint = `https://api.plivo.com/v1/Account/${config.authId}/Call/`;

  try {
    const response = await fetch(plivoEndpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "Namuste-AI-Telephony/1.0",
      },
      body: JSON.stringify({
        from: fromNumber,
        to: targetNumber,
        answer_url: answerUrl,
        answer_method: "POST",
        hangup_url: hangupUrl,
        hangup_method: "POST",
        // Ring for 35 seconds before timing out
        ring_timeout: 35,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data.error || data.message || `Plivo error (${response.status})`;
      console.error("[Plivo Outbound Call Error]:", response.status, data);
      return {
        success: false,
        message: errMsg,
        error: errMsg,
      };
    }

    console.log("[Plivo Outbound Call Initiated]:", data);
    return {
      success: true,
      message: "Call initiated successfully. Your phone should ring shortly!",
      requestUuid: data.request_uuid,
    };
  } catch (err: any) {
    console.error("[Plivo Network Error]:", err);
    return {
      success: false,
      message: err.message || "Failed to connect to Plivo Voice API.",
      error: err.message,
    };
  }
}
