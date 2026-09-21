import { NextResponse } from "next/server";

export async function GET() {
  const sarvamKey = process.env.SARVAM_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const webhookUrl = process.env.AI_DEMO_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;

  const hasSarvam = !!(sarvamKey && sarvamKey.trim().length > 5);
  const hasOpenAI = !!(openaiKey && openaiKey.trim().length > 5);
  const hasWebhook = !!(webhookUrl && webhookUrl.trim().length > 5);

  return NextResponse.json({
    status: "ok",
    keys: {
      sarvam: {
        configured: hasSarvam,
      },
      openai: {
        configured: hasOpenAI,
      },
      webhook: {
        configured: hasWebhook,
      },
    },
  });
}
