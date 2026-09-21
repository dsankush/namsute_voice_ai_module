import * as chrono from "chrono-node";

// ─── Date/time understanding: chrono-node, not hand-rolled regex ────────────
// Every regex list of day-words is a finite guess at how someone might phrase
// a date — "day after tomorrow" broke because it wasn't on the list; the next
// miss would just be a different phrase. chrono-node actually parses date
// grammar (relative phrases, weekdays, explicit dates, "in N days", times)
// instead of matching a fixed vocabulary, so it covers far more real phrasing
// without us hand-maintaining it. Two things chrono-node does NOT handle on
// its own, worked around below: (1) it only understands English — Hindi/
// Hinglish day-time words are translated first; (2) its own casual-English
// parser resolves "day after tomorrow" to only +1 day (a known limitation),
// so that phrase is translated to "in 2 days" specifically, which it parses
// correctly.
//
// Industry-agnostic — any vertical with scheduling can reuse this as-is.
const HINGLISH_DATE_WORDS: [RegExp, string][] = [
  [/\bparso\b|परसों/gi, "in 2 days"],
  [/\bday after tomorrow\b/gi, "in 2 days"],
  [/\bkal\b|कल/gi, "tomorrow"], // "kal" also means "yesterday" in Hindi, but a booking is always forward-looking
  [/\baaj\b|आज/gi, "today"],
  [/\bsubah\b|सुबह/gi, "morning"],
  [/\bshaam\b|शाम/gi, "evening"],
  [/\bdopahar\b|दोपहर/gi, "afternoon"],
  [/\bbaje\b|बजे/gi, "o'clock"],
  [/सोमवार/gi, "Monday"],
  [/मंगलवार/gi, "Tuesday"],
  [/बुधवार/gi, "Wednesday"],
  [/गुरुवार|बृहस्पतिवार/gi, "Thursday"],
  [/शुक्रवार/gi, "Friday"],
  [/शनिवार/gi, "Saturday"],
  [/रविवार/gi, "Sunday"],
];

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function normalizeForChrono(text: string): string {
  let out = text || "";
  out = out.replace(/[०-९]/g, (ch) => DEVANAGARI_DIGITS[ch] || ch);
  for (const [pattern, replacement] of HINGLISH_DATE_WORDS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export interface ParsedSlot {
  date: Date;
  hasDate: boolean; // a real day (weekday, relative, or explicit) was actually specified
  hasTime: boolean; // a real hour was actually specified
}

// Parses a slot phrase into a real Date via chrono-node, plus flags for
// whether a date and a time were actually stated (vs. chrono silently
// defaulting to "now" for whichever part wasn't mentioned) — those flags are
// what let the caller tell "caller gave a date but no time yet" apart from
// "caller gave a complete slot", which a plain Date alone can't distinguish.
export function parseSlotWithChrono(rawText: string, nowIST: Date): ParsedSlot | null {
  const normalized = normalizeForChrono(rawText);
  const results = chrono.parse(normalized, nowIST, { forwardDate: true });
  if (!results.length) return null;
  const result = results[0];
  let date = result.start.date();
  let hasDate = result.start.isCertain("day") || result.start.isCertain("weekday");
  // chrono's own casual-English grammar has a false-positive of its own:
  // filler phrases like "hold on a second" / "give me a minute" / "wait a
  // sec" parse as a DURATION ("a second") and come back with isCertain('hour')
  // = true, resolved to right now — completely unrelated to picking an
  // appointment time. The one thing a genuine time mention always has that a
  // vague duration filler doesn't is either a digit (4pm, 10:30) or the words
  // noon/midnight — gate on that so "a second" can't be read as a real time.
  const matchedText = result.text || "";
  const hasTime = result.start.isCertain("hour") && /\d|\bnoon\b|\bmidnight\b/i.test(matchedText);

  // chrono's English parser doesn't recognize a bare ordinal day-of-month
  // with no month name ("the 29th", "on the 5th") as a date component at
  // all — it silently falls back to "today" for the date part. Cover that
  // specific, common gap deterministically: if chrono found no date but the
  // text has a bare "Nth" and no month word, resolve it ourselves (this
  // month, or next month if that day-of-month has already passed).
  if (!hasDate) {
    const ordinalMatch = normalized.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/i);
    const hasMonthWord = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(normalized);
    if (ordinalMatch && !hasMonthWord) {
      const dayOfMonth = parseInt(ordinalMatch[1], 10);
      if (dayOfMonth >= 1 && dayOfMonth <= 31) {
        const candidate = new Date(nowIST.getFullYear(), nowIST.getMonth(), dayOfMonth, date.getHours(), date.getMinutes(), 0, 0);
        const todayMidnight = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
        if (candidate.getTime() < todayMidnight.getTime()) {
          candidate.setMonth(candidate.getMonth() + 1);
        }
        date = candidate;
        hasDate = true;
      }
    }
  }

  return { date, hasDate, hasTime };
}

// ─── Deterministic day/hour resolution for slot validation ──────────────────
// Returns null (never blocks the flow) when chrono can't confidently resolve
// BOTH a day and a time — caller falls through to the existing GPT-based
// resolution unchanged in that case.
export function resolveDayAndHour(rawSlotText: string, nowIST: Date): { dayOfWeek: number; hour: number } | null {
  const parsed = parseSlotWithChrono(rawSlotText, nowIST);
  if (!parsed || !parsed.hasDate || !parsed.hasTime) return null;
  return { dayOfWeek: parsed.date.getDay(), hour: parsed.date.getHours() };
}

// Turns a relative slot phrase ("tomorrow 11am", "kal 4 baje", "day after
// tomorrow at 4pm") into an absolute calendar date-time string ("28 August
// 2026, 11:00 AM") — this is what actually gets stored as the slot and sent
// to a booking webhook. Without this, the literal relative words were what
// ended up in the record, which is meaningless once read outside the
// conversation it was said in. Returns null (never blocks the flow) when it
// can't confidently resolve both a day AND a time — callers fall back to the
// original raw text in that case.
export function resolveAbsoluteSlotString(rawSlotText: string, nowIST: Date): string | null {
  const parsed = parseSlotWithChrono(rawSlotText, nowIST);
  if (!parsed || !parsed.hasDate || !parsed.hasTime) return null;
  const dateStr = parsed.date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = parsed.date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr}, ${timeStr}`;
}

// Caller mentioned a day/date ("tomorrow", "kal", "day after tomorrow",
// "Sunday", "29th") with NO time attached — without this the slot step just
// silently stayed unfilled and re-asked the same generic question. Returns a
// clean human-readable label ("Saturday, 29 August") built from the actually
// resolved date, rather than echoing back whatever raw words the caller used.
export function extractDateOnlyMention(text: string, nowIST: Date): string | null {
  const parsed = parseSlotWithChrono(text, nowIST);
  if (!parsed || !parsed.hasDate || parsed.hasTime) return null; // must have a date but NOT already have a time
  return parsed.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}
