import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";

const MAX_AUDIO_BASE64_LENGTH = 3_500_000; // ~2.6MB raw audio — generous for a single short utterance

// In-memory LRU cache for frequent TTS outputs (instant <50ms audio delivery)
const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 150;

// Clean and normalize text specifically for natural human pronunciation in Sarvam AI
export function normalizeSpeechText(text: string, isHindiContext = false): string {
  if (!text) return "";

  let cleaned = text;

  // Check if text is Hindi/Hinglish
  const hasHindiKeywords = isHindiContext || /\b(baje|subah|shaam|dopahar|kal|aaj|aapka|aapki|aapke|shukriya|dhanyawad|kripya|hai|hain|chahiye|mil|sakte|hoga|karein|karwana|badhiya|theek|rupaye)\b/i.test(text);

  if (hasHindiKeywords) {
    // Convert compound times to natural Hindi phonetics
    cleaned = cleaned
      .replace(/\b10:30\s*(?:AM|am|baje)?\b/gi, "saadhe dus baje")
      .replace(/\b11:30\s*(?:AM|am|baje)?\b/gi, "saadhe gyarah baje")
      .replace(/\b11:45\s*(?:AM|am|baje)?\b/gi, "paune baarah baje")
      .replace(/\b12:30\s*(?:PM|pm|baje)?\b/gi, "saadhe baarah baje")
      .replace(/\b1:30\s*(?:PM|pm|baje)?\b/gi, "dedh baje")
      .replace(/\b2:30\s*(?:PM|pm|baje)?\b/gi, "dhaai baje")
      .replace(/\b3:30\s*(?:PM|pm|baje)?\b/gi, "saadhe teen baje")
      .replace(/\b4:30\s*(?:PM|pm|baje)?\b/gi, "saadhe chaar baje")
      .replace(/\b5:30\s*(?:PM|pm|baje)?\b/gi, "saadhe paanch baje")
      // Convert single hour times (e.g. 10 baje -> dus baje, 9 AM -> nau baje)
      .replace(/\b10(?::00)?\s*(?:AM|am|baje)\b/gi, "dus baje")
      .replace(/\b11(?::00)?\s*(?:AM|am|baje)\b/gi, "gyarah baje")
      .replace(/\b12(?::00)?\s*(?:PM|pm|baje)\b/gi, "baarah baje")
      .replace(/\b1(?::00)?\s*(?:PM|pm|baje)\b/gi, "ek baje")
      .replace(/\b2(?::00)?\s*(?:PM|pm|baje)\b/gi, "do baje")
      .replace(/\b3(?::00)?\s*(?:PM|pm|baje)\b/gi, "teen baje")
      .replace(/\b4(?::00)?\s*(?:PM|pm|baje)\b/gi, "chaar baje")
      .replace(/\b5(?::00)?\s*(?:PM|pm|baje)\b/gi, "paanch baje")
      .replace(/\b6(?::00)?\s*(?:PM|pm|baje)\b/gi, "chhe baje")
      .replace(/\b7(?::00)?\s*(?:PM|pm|baje)\b/gi, "saat baje")
      .replace(/\b8(?::00)?\s*(?:PM|pm|baje)\b/gi, "aath baje")
      .replace(/\b9(?::00)?\s*(?:AM|am|baje)\b/gi, "nau baje")
      // Common business amounts
      .replace(/₹\s*600|\b600\s*rupaye\b/gi, "chhe sau rupaye")
      .replace(/₹\s*500|\b500\s*rupaye\b/gi, "paanch sau rupaye")
      .replace(/₹\s*1000|\b1000\s*rupaye\b/gi, "ek hazaar rupaye")
      .replace(/\b1\.5\s*(?:Cr|crore)\b/gi, "dedh crore")
      .replace(/\b10\s*digit\b/gi, "dus digit")
      .replace(/\b10-digit\b/gi, "dus digit")
      .replace(/#14\b/gi, "number chaudah");
  }

  return cleaned
    // Expand titles & abbreviations with phonetic spacing
    .replace(/\bDr\.\s*/gi, "Doctor ")
    .replace(/\bDr\b/gi, "Doctor")
    .replace(/\bOPD\b/gi, "O P D")
    .replace(/\bENT\b/gi, "E N T")
    .replace(/\bEMR\b/gi, "E M R")
    .replace(/\bCRM\b/gi, "C R M")
    .replace(/\bERP\b/gi, "E R P")
    .replace(/\bTPA\b/gi, "T P A")
    .replace(/\bGST\b/gi, "G S T")
    .replace(/\bITR\b/gi, "I T R")
    .replace(/\bBHK\b/gi, "B H K")
    .replace(/\bJEE\b/gi, "J E E")
    .replace(/\bNEET\b/gi, "N E E T")
    .replace(/\bCA\b/gi, "C A")
    .replace(/\bDOB\b/gi, "Date of Birth")
    .replace(/₹\s*(\d+)/g, "$1 rupees")
    .replace(/#(\d+)/g, "number $1")
    .replace(/\b(\d+)\s*Cr\b/gi, "$1 crore")
    .replace(/\bNo\.\s*/gi, "Number ")
    .replace(/\b10-digit\b/gi, "ten digit")
    // English time pronunciation
    .replace(/10:30\s*AM/gi, "10:30 A M")
    .replace(/11:45\s*AM/gi, "11:45 A M")
    .replace(/4:30\s*PM/gi, "4:30 P M")
    .replace(/2:30\s*PM/gi, "2:30 P M")
    .replace(/11:00\s*AM/gi, "11:00 A M")
    .replace(/3:00\s*PM/gi, "3:00 P M")
    .replace(/11:30\s*AM/gi, "11:30 A M")
    .replace(/10:00\s*AM/gi, "10:00 A M")
    // Remove markdown symbols and bullets
    .replace(/[*#_~`[\]()•|]/g, " ")
    // Clean multiple spaces
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

// Script-aware language detector:
// - Devanagari script -> 'hi-IN'
// - Latin alphabet (English or Hinglish) -> 'en-IN' (reads with natural Indian accent)
// - Regional scripts -> 'ta-IN', 'bn-IN', 'te-IN', etc.
export function detectAppropriateLanguage(text: string, requestedLang = "en-IN"): string {
  // Danda/double-danda (।/॥, U+0964/U+0965) excluded — pan-Indic punctuation
  // shared across Bengali/Gujarati/Odia/Punjabi/etc, not Hindi-exclusive.
  // See the matching note in chat/route.ts detectLanguage() for the bug this fixes.
  if (/[\u0900-\u0963\u0966-\u097F]/.test(text)) return "hi-IN"; // Hindi / Marathi in Devanagari
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN"; // Punjabi
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati

  // For Latin text (English, Hinglish romanized), en-IN provides natural fluid Indian speech
  return "en-IN";
}

// Only pass Whisper an explicit language hint when the caller manually forced
// a specific language (via the UI toggle) rather than "auto" — an explicit
// hint helps short/ambiguous utterances in a known language, but forcing it
// on "auto" mode is exactly the bug that broke language switching.
// This previously only covered hi-IN/en-IN, which are exactly the two
// languages Whisper is already most confident about — the lower-resource
// languages (Punjabi especially) that most needed an explicit hint to avoid
// being misheard as Hindi had no way to get one at all.
const SUPPORTED_LANGUAGE_CODES = new Set([
  "en-IN", "hi-IN", "ta-IN", "te-IN", "bn-IN", "ml-IN", "kn-IN", "pa-IN", "gu-IN", "or-IN",
]);
function speechLangIsExplicit(languageCode: string): boolean {
  return SUPPORTED_LANGUAGE_CODES.has(languageCode);
}

function whisperLangCode(bcp47: string): string {
  return bcp47.split("-")[0].toLowerCase();
}

// Whisper's verbose_json response returns a full language name (e.g. "hindi",
// "english", "tamil"), not a BCP-47 code — map back to what the rest of the
// pipeline (chat route, TTS) expects.
const WHISPER_LANGUAGE_TO_BCP47: Record<string, string> = {
  english: "en-IN",
  hindi: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  bengali: "bn-IN",
  malayalam: "ml-IN",
  kannada: "kn-IN",
  punjabi: "pa-IN",
  gujarati: "gu-IN",
  odia: "or-IN",
  marathi: "hi-IN", // closest supported TTS voice
};

export function whisperToBcp47(whisperLanguage?: string): string {
  if (!whisperLanguage) return "en-IN";
  return WHISPER_LANGUAGE_TO_BCP47[whisperLanguage.toLowerCase()] || "en-IN";
}

// bulbul:v3 only takes `pace` and `temperature` as expressiveness knobs (no
// pitch/loudness on v3 — those are v2-only per Sarvam's API docs). Temperature
// controls "randomness and expressiveness"; lower = flatter/steadier delivery,
// higher = more natural variation. These presets fake an emotional register by
// varying speed + expressiveness together for each conversational moment.
export type SpeechTone = "neutral" | "greeting" | "empathetic" | "confirmed" | "urgent";

const TONE_PRESETS: Record<SpeechTone, { pace: number; temperature: number }> = {
  neutral: { pace: 1.1, temperature: 0.6 },      // default informational asks — current baseline
  greeting: { pace: 1.0, temperature: 0.65 },    // warm, unhurried opener
  empathetic: { pace: 0.92, temperature: 0.5 },  // apologies / rejections (out-of-hours, doctor mismatch) — calmer, steadier
  confirmed: { pace: 1.05, temperature: 0.8 },   // booking confirmed — upbeat, more expressive
  urgent: { pace: 0.85, temperature: 0.4 },      // emergency triage — slow, clear, steady (not "excited")
};

/**
 * Server-side helper to generate Sarvam AI TTS Audio directly in a single pass.
 * Returns Base64 WAV string or null on failure.
 */
export async function generateSarvamTTS(
  text: string,
  speaker = "ritu",
  requestedLang = "en-IN",
  tone: SpeechTone = "neutral"
): Promise<{ audioBase64: string | null; detectedLang: string }> {
  if (!text || text.trim() === "") {
    return { audioBase64: null, detectedLang: "en-IN" };
  }

  // Sentence-aware truncation. This cap used to be 200 chars, which silently
  // cut off any longer reply mid-sentence — including fixed safety strings
  // like the emergency-triage message (~280 chars), which is a real problem
  // when it's the one that's supposed to tell the caller to call 112.
  // normalizeSpeechText() already caps input at 600 chars, so align with that
  // instead of re-truncating more aggressively on top of it.
  const rawNormalized = normalizeSpeechText(text);
  const MAX_TTS_CHARS = 600;
  let cleanSpeechText = rawNormalized;
  if (rawNormalized.length > MAX_TTS_CHARS) {
    // Try to break at the last sentence boundary (. ! ?) within the cap
    const breakPoint = rawNormalized.slice(0, MAX_TTS_CHARS).search(/[.!?][^.!?]*$/);
    cleanSpeechText = breakPoint > 60
      ? rawNormalized.slice(0, breakPoint + 1).trim()
      : rawNormalized.slice(0, MAX_TTS_CHARS).trim();
  }
  const targetLang = detectAppropriateLanguage(text, requestedLang);
  const chosenSpeaker = speaker || "ritu";
  const { pace, temperature } = TONE_PRESETS[tone] || TONE_PRESETS.neutral;
  const cacheKey = `${chosenSpeaker}_${targetLang}_${tone}_${cleanSpeechText}`;

  // Check in-memory cache
  if (audioCache.has(cacheKey)) {
    return {
      audioBase64: audioCache.get(cacheKey) || null,
      detectedLang: targetLang,
    };
  }

  const sarvamKey = process.env.SARVAM_API_KEY?.trim() || "";
  if (!sarvamKey) {
    return { audioBase64: null, detectedLang: targetLang };
  }

  try {
    const controller = new AbortController();
    // 3.8s hard timeout — if Sarvam doesn't respond in time, fall through to browser TTS
    const timeout = setTimeout(() => controller.abort(), 3800);

    const v3Res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        inputs: [cleanSpeechText],
        target_language_code: targetLang,
        speaker: chosenSpeaker,
        model: "bulbul:v3",
        pace,                    // Tone-dependent speed (see TONE_PRESETS)
        temperature,             // Tone-dependent expressiveness (v3-only knob)
        speech_sample_rate: 8000, // 8kHz vs 22kHz → ~60% smaller file → faster transfer
        enable_preprocessing: true,
      }),
    });

    clearTimeout(timeout);

    if (v3Res.ok) {
      const data = await v3Res.json();
      if (data.audios && data.audios[0]) {
        const base64Audio = data.audios[0];
        // Store in cache
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, base64Audio);
        return { audioBase64: base64Audio, detectedLang: targetLang };
      }
    }
  } catch (err) {
    console.warn("[Sarvam TTS server generation warn]:", err);
  }

  return { audioBase64: null, detectedLang: targetLang };
}

export interface TranscribeSpeechResult {
  success: boolean;
  source: string;
  transcript?: string;
  detectedLanguageCode?: string;
  languageProbability?: number | null;
  noSpeechScore?: number;
  message?: string;
}

// ─── Speech to Text — Sarvam Saaras (primary) → OpenAI Whisper (fallback) ────
// Pure function, no HTTP — assumes audioBase64 is already a validated,
// size-bounded string (the POST handler below checks that before calling
// this). Extracted out so the Plivo phone-call routes can transcribe a
// downloaded call recording through the exact same provider chain, instead
// of duplicating it or making a self-HTTP call.
export async function transcribeSpeech(audioBase64: string, languageCode = "en-IN"): Promise<TranscribeSpeechResult> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const buffer = Buffer.from(audioBase64, "base64");

  // Sarvam's Saaras model is purpose-built for Indian languages and
  // Hindi-English code-mixing — meaningfully more accurate than Whisper's
  // generic global model for exactly the lower-resource languages
  // (Punjabi, Odia, etc.) that were getting misheard as Hindi. It also
  // returns proper BCP-47 codes directly, matching what the rest of this
  // app already expects, instead of needing a name→code mapping table.
  const sarvamKey = process.env.SARVAM_API_KEY?.trim() || "";
  if (sarvamKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const formData = new FormData();
      const audioBlob = new Blob([buffer], { type: "audio/webm" });
      formData.append("file", audioBlob, "speech.webm");
      formData.append("model", "saaras:v3");
      // Explicit language hint when the caller manually forced one (helps
      // accuracy most for the languages that need it most); otherwise let
      // Sarvam auto-detect, same "auto" contract used with Whisper.
      formData.append("language_code", languageCode && speechLangIsExplicit(languageCode) ? languageCode : "unknown");

      let sarvamRes: Response;
      try {
        sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
          method: "POST",
          headers: { "api-subscription-key": sarvamKey },
          signal: controller.signal,
          body: formData,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (sarvamRes.ok) {
        const data = await sarvamRes.json();
        const transcript = (data.transcript || "").trim();

        if (!transcript) {
          return {
            success: false,
            source: "sarvam-saaras",
            message: "No genuine speech detected (likely background noise).",
          };
        }

        return {
          success: true,
          source: "sarvam-saaras",
          transcript,
          detectedLanguageCode: data.language_code || "en-IN",
          languageProbability: typeof data.language_probability === "number" ? data.language_probability : null,
        };
      }
      console.warn("[Sarvam STT non-OK response]:", sarvamRes.status, await sarvamRes.text().catch(() => ""));
    } catch (e) {
      console.warn("[Sarvam STT warn — falling back to Whisper]:", e);
    }
  }

  // Sarvam unavailable/failed/no key — fall back to Whisper.
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const formData = new FormData();
      const audioBlob = new Blob([buffer], { type: "audio/webm" });
      formData.append("file", audioBlob, "speech.webm");
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("prompt", "Indian English, Hindi, Hinglish, Tamil, Telugu, Bengali, and other Indian regional languages. Customer appointment intake conversation.");
      // NOTE: no forced `language` param — Whisper's own detection is more reliable
      // than guessing hi/en up front, and forcing it wrong actively corrupts
      // transcripts in every other supported language.
      if (languageCode && speechLangIsExplicit(languageCode)) {
        formData.append("language", whisperLangCode(languageCode));
      }

      let whisperRes: Response;
      try {
        whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          signal: controller.signal,
          body: formData,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (whisperRes.ok) {
        const data = await whisperRes.json();
        const transcript = (data.text || "").trim();

        // Whisper transcribes SOMETHING for almost any audio — including
        // background noise, another conversation in the room, a TV, etc.
        // — and can even hallucinate plausible-looking text from pure
        // noise. verbose_json's per-segment no_speech_prob is the model's
        // own confidence that a segment contains no real speech at all;
        // averaging it across segments (weighted by duration, since a
        // short noise blip shouldn't be swamped by one long clear
        // segment) is a far more reliable signal than anything client-side
        // amplitude detection can provide. Reject low-confidence audio
        // here rather than letting it masquerade as something the caller
        // actually said.
        const segments: Array<{ no_speech_prob?: number; avg_logprob?: number; start?: number; end?: number }> = data.segments || [];
        let noSpeechScore = 0;
        if (segments.length > 0) {
          let totalDuration = 0;
          let weightedNoSpeech = 0;
          for (const seg of segments) {
            const duration = Math.max((seg.end ?? 0) - (seg.start ?? 0), 0.01);
            weightedNoSpeech += (seg.no_speech_prob ?? 0) * duration;
            totalDuration += duration;
          }
          noSpeechScore = totalDuration > 0 ? weightedNoSpeech / totalDuration : 0;
        }

        const NO_SPEECH_THRESHOLD = 0.6;
        if (!transcript || noSpeechScore > NO_SPEECH_THRESHOLD) {
          return {
            success: false,
            source: "openai-whisper",
            message: "No genuine speech detected (likely background noise).",
            noSpeechScore,
          };
        }

        const detectedLanguageCode = whisperToBcp47(data.language);
        return {
          success: true,
          source: "openai-whisper",
          transcript,
          detectedLanguageCode,
          noSpeechScore,
        };
      }
    } catch (e) {
      console.warn("Whisper STT fallback:", e);
    }
  }

  return {
    success: false,
    source: "fallback",
    message: "STT processing unavailable.",
  };
}

export async function POST(req: Request) {
  try {
    const clientKey = getClientKey(req);
    // TTS/STT is billed per call — 60 requests/min per client is generous for a live
    // conversation (roughly one every second) while blocking scripted abuse.
    const { allowed } = checkRateLimit(`speech:${clientKey}`, 60, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const {
      action = "tts",
      text = "",
      languageCode = "en-IN",
      speaker = "ritu",
      audioBase64 = "",
      tone = "neutral",
    } = body;

    // ── 1. Text to Speech via Sarvam bulbul:v3 ──────────────────────────────────
    if (action === "tts") {
      if (!text || text.trim() === "") {
        return NextResponse.json({ error: "Text is required for TTS" }, { status: 400 });
      }

      const { audioBase64: generatedAudio, detectedLang } = await generateSarvamTTS(
        text,
        speaker,
        languageCode,
        tone
      );

      if (generatedAudio) {
        return NextResponse.json({
          success: true,
          source: "sarvam-bulbul-v3",
          speaker,
          detectedLang,
          audioBase64: generatedAudio,
        });
      }

      // If Sarvam is unavailable, fallback to browser speech synthesis
      return NextResponse.json({
        success: false,
        source: "fallback",
        message: "Fallback to browser audio.",
      });
    }

    // ── 2. Speech to Text ────────────────────────────────────────────────────
    if (action === "stt") {
      if (!audioBase64) {
        return NextResponse.json({ error: "Audio base64 is required for STT" }, { status: 400 });
      }
      if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
        return NextResponse.json({ error: "Audio payload too large" }, { status: 413 });
      }

      const result = await transcribeSpeech(audioBase64, languageCode);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Speech route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
