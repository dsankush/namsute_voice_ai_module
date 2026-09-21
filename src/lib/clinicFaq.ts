import { ClinicLang, CLINIC_KB, DOCTOR_ROSTER, CLINIC_OPEN_DAYS, CLINIC_OPEN_HOUR, CLINIC_CLOSE_HOUR, fillTemplate, formatHourRange, formatDaysList } from "@/data/clinicTemplates";

// ─── Clinic knowledge-base FAQ matching (deterministic) ─────────────────────
// Keyword rules are English/Hinglish for now — the strongest coverage, since
// that's the majority of real questions seen so far. A question in another
// supported language that doesn't match falls through to the existing GPT
// path below, which already answers correctly from the same knowledge base
// text, just without the guaranteed-identical-wording property. Known,
// acceptable gap for this first pass, not a regression.
export function matchClinicFaq(text: string, lang: ClinicLang): string | null {
  const t = text.toLowerCase();
  const kb = CLINIC_KB[lang];

  if (/\b(fee|fees|cost|price|charge|charges|kitna|paisa|rupaye)\b/i.test(t)) return kb.consultationFee;
  if (/\b(lab|blood test|x-?ray|ecg|pathology|diagnostic)\b/i.test(t)) return kb.labServices;
  if (/\b(where|location|address|parking|floor)\b/i.test(t)) return kb.location;
  if (/\b(payment|pay|cash|card|upi|insurance|tpa)\b/i.test(t)) return kb.paymentMethods;
  if (/\b(specialt(y|ies)|department|departments|which doctors?)\b/i.test(t)) return kb.specialtyList;
  // These two facts already existed in CLINIC_KB but nothing ever matched
  // against them — every "what's your emergency number" / "what are your
  // hours" question was silently falling through to a GPT call for
  // information the system already had on hand, verbatim, for free.
  if (/\b(emergency|helpline|112|urgent\s*care|emergency\s*(number|contact))\b/i.test(t)) return kb.emergencyContact;
  if (/\b(hours|timing|timings|open|opening|close|closing|kab\s*khul|kitne\s*baje)\b/i.test(t)) {
    return fillTemplate(kb.operatingHours, {
      days: formatDaysList(CLINIC_OPEN_DAYS, lang),
      hours: formatHourRange(CLINIC_OPEN_HOUR, CLINIC_CLOSE_HOUR),
    });
  }

  // Doctor-specific lookup: "who handles cardiology" / "cardiology doctor"
  for (const entry of Object.values(DOCTOR_ROSTER)) {
    const key = entry.specialtyEn.toLowerCase();
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(t) && /\b(who|doctor|available|timing|hours|when)\b/i.test(t)) {
      return fillTemplate(kb.doctorInfo, {
        doctor: entry.doctor,
        specialty: entry.specialtyEn,
        days: formatDaysList(entry.days, lang),
        hours: formatHourRange(entry.startHour, entry.endHour),
      });
    }
  }
  return null;
}
