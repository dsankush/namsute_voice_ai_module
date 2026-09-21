// ─── Smart Language Detection (Unicode Script + Hinglish Heuristic) ─────────
// Industry-agnostic — used across every vertical, not just clinic.

// Scripts this app has no support for at all — Arabic/Urdu, Hebrew, CJK,
// Cyrillic, Thai, Greek. Text matching these is treated as a likely STT
// hallucination, never as a legitimate language switch.
export function hasUnsupportedScript(text: string): boolean {
  return /[؀-ۿ֐-׿一-鿿぀-ヿ가-힯Ѐ-ӿ฀-๿Ͱ-Ͽ]/.test(text);
}

const HINGLISH_GRAMMAR = /\b(mera|meri|mere|mujhe|hamara|humein|aapka|aapki|aapke|kripya|shukriya|dhanyawad|namaste|theek|achha|bilkul|haan|nahin|nahi|batao|bataiye|chahiye|karein|karunga|milega|milenge|ayenge|hoga|hogi|subah|shaam|dopahar|baje|kal|aaj|parso|umar|saal|takleef|dard|bukhar|khansi|dawai|ilaaj|dikhana|dijiye|dejiye|karwana|seedha|thoda|bahut|zyada|abhi|jaldi|phir|warna|toh|yahan|wahan|kab|kitna|kaunsa|kaise|kahan|kidhar|kyunki|isliye|samajh|pata|boliye|suniye|rukiye|aaiye)\b/i;

// Does this text carry ANY independent evidence of what language it's in —
// a non-Latin script character, or a matched Hinglish keyword? Pure digits,
// punctuation, or a bare number ("9876543210") carry no signal either way.
// detectLanguage() returns "en-IN" both when text is genuinely English AND
// when it has no signal at all — those two cases are NOT the same thing, and
// conflating them was the bug: a caller mid-Hindi-conversation who answers
// "9876543210" (giving their phone number) would have that pure-digit
// non-signal wrongly treated as counter-evidence against the STT's correct
// hi-IN claim, flipping the reply to English on one of the most common turn
// types in the entire app.
export function hasConcreteLanguageSignal(text: string): boolean {
  if (/[ऀ-ൿ઀-૿]/.test(text)) return true; // any Indic script
  return HINGLISH_GRAMMAR.test(text);
}

// Should a non-English STT language claim (e.g. Sarvam saying "hi-IN") be
// trusted for this turn's text? "No concrete signal" (hasConcreteLanguageSignal
// above) was being treated as "trust the STT claim unconditionally" — correct
// for a truly signal-free string like a phone number ("9876543210" sounds the
// same regardless of spoken language, so there's nothing to disagree with).
// But a bare Latin-alphabet word ("Ankush") ALSO has no Hindi grammar/script
// markers, so it fell into that same bucket — even though plain Latin letters
// with no digits and no Hindi vocabulary is actually mild evidence FOR
// English, not a signal vacuum. A single ambiguous name on the very first
// turn (no established conversation language yet to anchor against) was
// enough to silently flip an entire call into the wrong language with zero
// counter-evidence ever required. Latin-alphabetic text now needs the STT to
// be at least moderately confident before a non-English claim is trusted;
// genuinely signal-free text (digits, punctuation, empty) still defers to
// the STT claim outright, exactly as before.
export function isSttLanguageClaimPlausible(params: {
  sarvamLanguageCode: string;
  textBasedLang: string;
  userMessage: string;
  sttLanguageProbability: number | null;
}): boolean {
  const { sarvamLanguageCode, textBasedLang, userMessage, sttLanguageProbability } = params;

  if (!sarvamLanguageCode) return true;

  // Real, independent evidence in the TRANSCRIBED TEXT ITSELF always wins,
  // checked before any special-casing on the claimed language value —
  // including "en-IN". This used to short-circuit "claims en-IN → always
  // trust it" before ever looking at the text, on the assumption an English
  // claim is inherently safe. Proven false: Sarvam can transcribe genuinely,
  // correctly Hindi audio ("मेरा नाम अंकुश है", real Devanagari, real
  // grammar) while separately mislabeling its own language_code as "en-IN" —
  // the transcription itself is fine, only the metadata is wrong. If real
  // script/grammar evidence disagrees with the claim in EITHER direction,
  // the text wins over the label.
  if (hasConcreteLanguageSignal(userMessage)) return sarvamLanguageCode === textBasedLang;

  if (sarvamLanguageCode === "en-IN" || sarvamLanguageCode === textBasedLang) return true;
  // (A "hi-IN" claim matching a "hi-IN" textBasedLang is already covered by
  // the block above — detectLanguage() and hasConcreteLanguageSignal() share
  // the same Devanagari-script/Hinglish-grammar detection, so textBasedLang
  // can never be "hi-IN" without having already returned at the signal check.)

  const isPlainLatinText = /[a-z]/i.test(userMessage) && !/\d/.test(userMessage);
  if (isPlainLatinText) {
    const wordCount = userMessage.trim().split(/\s+/).filter(Boolean).length;
    // STT confidence calibration on very short audio (a 1-3 word reply — a
    // bare name is the textbook case) is a well-documented ASR weak spot: the
    // model can report HIGH confidence for a wrong guess simply because
    // there's so little audio to be uncertain about. A probability threshold
    // alone can't fix that — no threshold is safe against a confidently
    // wrong short claim. So short plain-Latin replies never take a non-
    // English STT claim at all, regardless of stated confidence; only actual
    // textual evidence (Devanagari script, Hinglish grammar — already
    // excluded above) can move them. Longer utterances give the model more
    // to actually be confident about, so a real confidence bar still applies.
    if (wordCount <= 3) return false;
    const MIN_CONFIDENCE_FOR_NONENGLISH_ON_LATIN_TEXT = 0.6;
    return typeof sttLanguageProbability === "number" && sttLanguageProbability >= MIN_CONFIDENCE_FOR_NONENGLISH_ON_LATIN_TEXT;
  }

  return true; // genuinely no signal either way (digits, punctuation, empty) — trust the STT claim
}

// Returns BCP-47 language codes for all major Indian languages
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) return "en-IN";

  // ── Step 1: Definitive Unicode script detection ──
  // U+0964 (।) and U+0965 (॥) — the danda/double-danda sentence
  // punctuation — are excluded below. They are pan-Indic: shared by Bengali,
  // Gujarati, Odia, Punjabi and others, not exclusive to Hindi. Matching on
  // them alone was misdetecting genuine Bengali/other-language sentences as
  // Hindi purely because the sentence ended in that punctuation mark —
  // nothing to do with the actual letters. This broke language stickiness
  // at the root.
  if (/[\u0900-\u0963\u0966-\u097F]/.test(text)) return "hi-IN";   // Devanagari letters/vowel signs -> Hindi/Marathi
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";   // Tamil
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";   // Bengali
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";   // Telugu
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN";   // Punjabi/Gurmukhi
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN";   // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";   // Kannada
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN";   // Gujarati
  if (/[\u0B00-\u0B7F]/.test(text)) return "or-IN";   // Odia
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN";   // Punjabi

  // ── Step 2: Hinglish romanized detection (Hindi spoken in English letters) ──
  // Only match unambiguous grammatical Hindi words — NOT single-letter or ultra-short common words
  if (HINGLISH_GRAMMAR.test(text)) return "hi-IN";

  // ── Step 2b: Unsupported script → treat as noisy/garbled STT, not a real language switch ──
  // Whisper occasionally hallucinates text in a completely unrelated script
  // from unclear or noisy audio (a documented failure mode, not specific to
  // this app). None of Arabic/Urdu, Hebrew, CJK, Cyrillic, Thai, or Greek are
  // supported languages here — if any of them show up, it's far more likely
  // to be a transcription artifact than the user actually speaking that
  // language, so it must NOT be allowed to drive a language switch.
  if (hasUnsupportedScript(text)) return "en-IN";

  // ── Step 3: Default to Indian English ──
  return "en-IN";
}

// ─── Explicit language-switch requests ─────────────────────────────────────
// Everything above is PASSIVE detection — inferring the language from what
// the caller is already saying. That leaves no way for a caller who
// explicitly ASKS to switch ("please speak in Hindi", "hindi mein baat
// karo") to be understood as a request rather than just more content to
// route: with no dedicated handler, that message fell through the same
// keyword paths as everything else and could be misread entirely (e.g. as a
// booking correction, if it happened to land on the confirmation step).
const LANGUAGE_NAME_TRIGGERS: { code: string; pattern: RegExp }[] = [
  { code: "hi-IN", pattern: /hindi|हिंदी|हिन्दी/i },
  { code: "ta-IN", pattern: /tamil|தமிழ்/i },
  { code: "te-IN", pattern: /telugu|తెలుగు/i },
  { code: "bn-IN", pattern: /bengali|bangla|বাংলা/i },
  { code: "ml-IN", pattern: /malayalam|മലയാളം/i },
  { code: "kn-IN", pattern: /kannada|ಕನ್ನಡ/i },
  { code: "pa-IN", pattern: /punjabi|ਪੰਜਾਬੀ/i },
  { code: "gu-IN", pattern: /gujarati|ગુજરાતી/i },
  { code: "or-IN", pattern: /\bodia\b|\boriya\b|ଓଡ଼ିଆ/i },
  { code: "en-IN", pattern: /english|angrezi|angreji/i },
];

// A phrase shaped like "speak/talk/reply in ___", "switch/change to ___", or
// the Hindi/Hinglish "___ mein baat karo/bolo" pattern — checked BEFORE
// looking for which language name it names, so a language name mentioned for
// an unrelated reason (a caller saying "I only know Hindi" as an aside,
// without asking for a switch) doesn't misfire.
const LANGUAGE_SWITCH_PHRASE = /\b(speak|talk|reply|respond|continue|switch|change)\b[\s\w]{0,20}\b(in|to)\b|\b(mein|mai|me)\s+(baat|bol|bolo|bolna|bataiye|kaho|karo)|में\s*(बात|बोलो|बोलिए|बोलना)/i;

// Returns the BCP-47 code the caller explicitly asked to switch to, or null
// if this message isn't a language-switch request at all. Callers should let
// this override BOTH the normal per-turn detection and language stickiness —
// an explicit ask should always win, never get anchored away by whatever
// language the conversation happened to be in already.
export function detectExplicitLanguageSwitchRequest(text: string): string | null {
  if (!text || !LANGUAGE_SWITCH_PHRASE.test(text)) return null;
  for (const { code, pattern } of LANGUAGE_NAME_TRIGGERS) {
    if (pattern.test(text)) return code;
  }
  return null;
}

// ─── Language Stickiness ──────────────────────────────────────────────────
// Bengali speakers reported the AI randomly flipping to Hindi or English
// mid-conversation while they kept speaking Bengali the whole time. Root
// cause: language was decided fresh, independently, every single turn, with
// no memory of what language the conversation was actually being held in —
// so one short, phonetically ambiguous utterance with lower STT confidence
// (a one-word "yes", a name that sounds similar across languages) was enough
// to flip the whole conversation. Anchor to the language the conversation
// has actually been happening in, and only let it change with real evidence.
export function establishedLanguageFromHistory(messages: { speaker: string; text: string; language?: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].speaker === "ai") {
      // Prefer the language this turn was actually generated in — the
      // frontend stores it verbatim from the response that produced this
      // message. Falling back to detectLanguage() only for older/preset
      // history that predates this field (or a genuine gap). This matters
      // because re-deriving from TEXT alone is lossy for GPT's romanized
      // Hindi replies: they vary in phrasing and often use common words
      // ("hai", "hain", "kar", "mein") that aren't on the fixed Hinglish
      // keyword list detectLanguage() matches against, so a real Hindi
      // reply could get silently misread as English — breaking stickiness
      // for the very next turn, which is what made language switching feel
      // unreliable.
      const stored = messages[i].language;
      if (stored) return stored;
      return detectLanguage(messages[i].text);
    }
  }
  return "en-IN"; // no AI turn yet — first message of the call, nothing to anchor to
}
