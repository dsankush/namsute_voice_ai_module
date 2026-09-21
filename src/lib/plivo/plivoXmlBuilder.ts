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
 * Builds Plivo XML that plays the AI response (via <Play> or <Speak>)
 * and captures caller speech via <GetInput inputType="speech">.
 */
export function buildSpeechPromptXml(params: BuildSpeechPromptXmlParams): string {
  const {
    audioUrl,
    fallbackText,
    actionUrl,
    speechEndTimeout = 1.2,
    executionTimeout = 12,
    language = "en-IN",
  } = params;

  let playbackElement = "";
  if (audioUrl) {
    playbackElement = `<Play>${escapeXml(audioUrl)}</Play>`;
  } else if (fallbackText) {
    playbackElement = `<Speak language="${escapeXml(language)}">${escapeXml(fallbackText)}</Speak>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput action="${escapeXml(actionUrl)}" method="POST" inputType="speech" executionTimeout="${executionTimeout}" speechEndTimeout="${speechEndTimeout}" language="${escapeXml(language)}">
    ${playbackElement}
  </GetInput>
  <Speak language="${escapeXml(language)}">We did not receive any input. Please say that again.</Speak>
  <GetInput action="${escapeXml(actionUrl)}" method="POST" inputType="speech" executionTimeout="8" speechEndTimeout="${speechEndTimeout}" language="${escapeXml(language)}"/>
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
  const { audioUrl, farewellText = "Thank you for calling. Goodbye!", language = "en-IN" } = params;

  let playbackElement = "";
  if (audioUrl) {
    playbackElement = `<Play>${escapeXml(audioUrl)}</Play>`;
  } else {
    playbackElement = `<Speak language="${escapeXml(language)}">${escapeXml(farewellText)}</Speak>`;
  }

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
  <Speak language="en-IN">${escapeXml(message)}</Speak>
  <Hangup/>
</Response>`.trim();
}
