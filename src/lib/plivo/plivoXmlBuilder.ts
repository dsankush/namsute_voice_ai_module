export interface BuildSpeechPromptXmlParams {
  audioUrl?: string;
  fallbackText?: string;
  actionUrl: string;
  speechEndTimeout?: number;
  executionTimeout?: number;
  language?: string;
}

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  return (unsafe || "").replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Constructs a stateless streaming media URL that generates Sarvam neural audio on demand.
 */
export function getSarvamMediaUrl(
  appUrl: string,
  text: string,
  speaker = "ritu",
  lang = "en-IN",
  tone = "neutral"
): string {
  const base64Text = Buffer.from(text.trim()).toString("base64url");
  return `${appUrl}/api/plivo/media?t=${base64Text}&s=${encodeURIComponent(speaker)}&l=${encodeURIComponent(lang)}&tone=${encodeURIComponent(tone)}`;
}

function getPollyVoice(language: string): string {
  if (language === "hi-IN") return "Polly.Aditi";
  if (language.startsWith("en")) return "Polly.Aditi";
  return "Polly.Aditi";
}

/**
 * Builds Plivo XML that plays the AI response (using Sarvam AI neural audio via <Play>)
 * and captures caller speech via <GetInput inputType="speech">.
 */
export function buildSpeechPromptXml(params: BuildSpeechPromptXmlParams): string {
  const {
    audioUrl,
    fallbackText = "Hello! How can I assist you today?",
    actionUrl,
    speechEndTimeout = 2,
    executionTimeout = 15,
    language = "en-IN",
  } = params;

  // Plivo requires speechEndTimeout to be between 2 and 10 seconds
  const validSpeechEnd = Math.max(2, Math.min(10, speechEndTimeout));
  const validExec = Math.max(5, Math.min(60, executionTimeout));
  const voice = getPollyVoice(language);

  // Play high-fidelity Sarvam AI audio via <Play>, falling back to native Polly TTS
  const playbackElement = audioUrl
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Speak voice="${voice}" language="${escapeXml(language)}">${escapeXml(fallbackText)}</Speak>`;

  // Localized no-input fallback so Polly never fails on language mismatch
  const noInputText = language === "hi-IN"
    ? "मुझे कोई आवाज़ नहीं सुनाई दी। कृपया दोबारा बोलें।"
    : "I did not hear any response. Could you please say that again?";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput action="${escapeXml(actionUrl)}" method="POST" inputType="speech" executionTimeout="${validExec}" speechEndTimeout="${validSpeechEnd}" language="${escapeXml(language)}">
    ${playbackElement}
  </GetInput>
  <Speak voice="${voice}" language="${escapeXml(language)}">${escapeXml(noInputText)}</Speak>
  <GetInput action="${escapeXml(actionUrl)}" method="POST" inputType="speech" executionTimeout="10" speechEndTimeout="${validSpeechEnd}" language="${escapeXml(language)}"/>
</Response>`.trim();
}

export interface BuildFarewellXmlParams {
  audioUrl?: string;
  farewellText?: string;
  language?: string;
}

/**
 * Builds Plivo XML that plays a final farewell/confirmation message and hangs up.
 */
export function buildFarewellXml(params: BuildFarewellXmlParams): string {
  const { audioUrl, farewellText = "Thank you for calling. Have a great day! Goodbye.", language = "en-IN" } = params;
  const voice = getPollyVoice(language);

  const playbackElement = audioUrl
    ? `<Play>${escapeXml(audioUrl)}</Play>`
    : `<Speak voice="${voice}" language="${escapeXml(language)}">${escapeXml(farewellText)}</Speak>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playbackElement}
  <Hangup/>
</Response>`.trim();
}

/**
 * Builds Plivo XML that plays an error message and hangs up.
 */
export function buildErrorXml(message = "An error occurred while processing your call. Please call back shortly."): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="Polly.Aditi" language="en-IN">${escapeXml(message)}</Speak>
  <Hangup/>
</Response>`.trim();
}
