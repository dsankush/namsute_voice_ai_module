import { IndustryFlow, FlowStep } from "@/data/industryFlows";
import {
  ClinicLang,
  CLINIC_SUPPORTED_LANGS,
  CLINIC_TEMPLATES,
  DOCTOR_ROSTER,
  CLINIC_OPEN_DAYS,
  CLINIC_OPEN_HOUR,
  CLINIC_CLOSE_HOUR,
  fillTemplate,
  formatHourRange,
  formatDaysList,
} from "@/data/clinicTemplates";
import { getCurrentStep, generateActionId } from "@/lib/flowSteps";
import { matchClinicFaq } from "@/lib/clinicFaq";
import { resolveDayAndHour, resolveAbsoluteSlotString, extractDateOnlyMention } from "@/lib/dateEngine";
import { isBookingGenuinelyComplete } from "@/lib/bookingGuard";

// A turn "resolved with confidence" by one of the deterministic interceptors/
// fast-paths below — the shape every one of them returns instead of mutating
// shared outer-scope variables, so each is a pure function of its inputs.
// Fields left unset by a given resolver take route.ts's existing defaults
// (finalIsComplete: false, finalCallEnded: false, finalSpokenText: "") —
// every resolver below still sets each field explicitly to match exactly
// what the original inline code held at that point, rather than relying on
// that implicit default.
export interface ChatTurnResult {
  finalReply: string;
  finalSpokenText: string;
  finalStep: string;
  finalExtracted: Record<string, any>;
  finalIsComplete: boolean;
  responseSource: string;
  toneHint: "neutral" | "greeting" | "empathetic" | "confirmed" | "urgent";
  finalCallEnded: boolean;
}

// ── Farewell Interceptor ─────────────────────────────────────────────────────
// Caller signals they're done (bye/goodbye/hang up/end call) at ANY point in
// the conversation — not just after a completed booking. Deliberately narrow
// (no "that's all"/"nothing else") to avoid misfiring on routine replies
// during intake or FAQ answers. Not clinic-only — every industry gets a
// generic sign-off; only the clinic case sources its line from
// CLINIC_TEMPLATES for the exact wording tested this session.
export function checkFarewell(params: {
  userMessage: string;
  industryId: string;
  detectedLang: string;
  isHindi: boolean;
  currentExtracted: Record<string, any>;
}): ChatTurnResult | null {
  const { userMessage, industryId, detectedLang, isHindi, currentExtracted } = params;

  const isFarewell = /\b(bye+|good\s*bye|hang\s*up|end\s*(the\s*)?call|alvida)\b/i.test(userMessage);
  if (!isFarewell) return null;

  const finalReply =
    industryId === "doctors-clinics" && CLINIC_SUPPORTED_LANGS.includes(detectedLang as ClinicLang)
      ? CLINIC_TEMPLATES[detectedLang as ClinicLang].farewell
      : isHindi
        ? "कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!"
        : "Thank you for calling. Have a great day!";

  return {
    finalReply,
    finalSpokenText: "",
    finalStep: "call_ended",
    finalExtracted: { ...currentExtracted, summary: finalReply.slice(0, 80) },
    finalIsComplete: false,
    responseSource: industryId === "doctors-clinics" ? "clinic-template" : "state-machine-dynamic",
    toneHint: "greeting",
    finalCallEnded: true,
  };
}

// ── Instant Emergency Medical Guardrail Interceptor ──────────────────────────
// The bare word "emergency" alone used to trigger this unconditionally — so
// "what's your emergency contact number?" (a plain FAQ question) got
// hijacked into the medical-triage response instead of actually being
// answered. Excluded first: an informational question ABOUT the emergency
// desk (contact/number/hours) is never itself an emergency. Clinic-only —
// call site gates on industryId === "doctors-clinics" and !finalCallEnded
// (i.e. only when checkFarewell above returned null).
export function checkClinicEmergency(params: {
  userMessage: string;
  isHindi: boolean;
  name: string;
  mobile: string;
  dob: string;
  currentExtracted: Record<string, any>;
}): ChatTurnResult | null {
  const { userMessage, isHindi, name, mobile, dob, currentExtracted } = params;

  const isAskingAboutEmergencyDesk = /\b(emergency\s*(contact|number|helpline|hours|timing)|what.{0,20}emergency|emergency.{0,20}(contact|number))\b/i.test(userMessage);
  const isEmergency = !isAskingAboutEmergencyDesk &&
    /\b(emergency|severe chest pain|chest pain|difficulty breathing|shortness of breath|unconscious|heavy bleeding|bleeding heavily|heart attack|stroke|serious accident|severe allergic|dil ka daura|saans lene|chhati mein dard|behosh)\b/i.test(userMessage);
  if (!isEmergency) return null;

  const finalReply = isHindi
    ? `Yeh urgent medical emergency lag rahi hai. Kripya turant 112 par call karein ya nearest emergency department jayein. Clinic ka emergency unit 24 ghante open hai.`
    : `This sounds like it may require urgent medical attention. Our emergency services are available 24 hours a day. If this is a life-threatening emergency, please call 112 or go to the nearest emergency department immediately.`;
  const finalSpokenText = isHindi
    ? `यह अर्जेंट मेडिकल इमरजेंसी लग रही है। कृपया तुरंत 112 पर कॉल करें या नजदीकी इमरजेंसी विभाग जाएं।`
    : "";

  return {
    finalReply,
    finalSpokenText,
    finalStep: "emergency_triage",
    finalExtracted: {
      name: name || currentExtracted.name || "Emergency Patient",
      mobile: mobile || currentExtracted.mobile || "",
      dob: dob || currentExtracted.dob || "",
      department: "Emergency Care (24/7)",
      doctor: "On-Duty Emergency Triage Officer",
      slot: "Immediate Triage",
      intent: "CRITICAL EMERGENCY TRIAGE",
      appointment_id: "EMERGENCY-911",
      confirmed: true,
    },
    finalIsComplete: true,
    responseSource: "state-machine-dynamic",
    toneHint: "urgent",
    finalCallEnded: false,
  };
}

// ── Clinic Deterministic Fast Path (Level 1 hybrid) ──────────────────────────
// For doctors-clinics, in a supported language: routine turns are resolved
// entirely from predefined templates + structured data — no GPT call,
// guaranteed identical wording every time. Returns null (never blocks the
// flow) the instant it isn't confident — the caller's message didn't advance
// the current step, and didn't match a known FAQ. The proven GPT path in
// route.ts runs exactly as before whenever this returns null — additive,
// never a replacement.
export function runClinicFastPath(params: {
  userMessage: string;
  detectedLang: string;
  currentStep: FlowStep | null;
  isReadyToConfirm: boolean;
  name: string;
  mobile: string;
  dob: string;
  dept: string;
  slot: string;
  currentExtracted: Record<string, any>;
  extracted: Record<string, string>;
  industry: IndustryFlow;
}): ChatTurnResult | null {
  const { userMessage, detectedLang, currentStep, isReadyToConfirm, name, mobile, dob, dept, slot, currentExtracted, extracted, industry } = params;

  if (!CLINIC_SUPPORTED_LANGS.includes(detectedLang as ClinicLang)) return null;

  const lang = detectedLang as ClinicLang;
  const tpl = CLINIC_TEMPLATES[lang];
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const doctorForDept = DOCTOR_ROSTER[dept]?.doctor || currentExtracted.doctor || "";
  // Resolve "tomorrow 11am" etc. to an absolute calendar date-time — this is
  // what gets shown back to the caller, stored in extracted.slot, and
  // ultimately sent to the n8n webhook. Falls back to the raw text when it
  // can't confidently resolve (e.g. an explicit date GPT already normalized
  // upstream).
  const resolvedSlot = slot ? (resolveAbsoluteSlotString(slot, nowIST) || slot) : slot;
  const vars = { name, mobile, department: dept, doctor: doctorForDept, date_time: resolvedSlot };
  const faqAnswer = matchClinicFaq(userMessage, lang);

  // ── Already confirmed — stop here, never re-enter confirm logic ──────────
  // Every field stays filled forever once a booking is confirmed, which
  // means isReadyToConfirm never goes back to false — with no check here,
  // ANY later turn that isn't an exact "yes" (a thank-you, an unrelated
  // question, small talk) fell all the way through to the isReadyToConfirm
  // branch below and got treated as an ambiguous confirmation-step reply,
  // handing the turn to GPT to "confirm" an already-confirmed booking again
  // — the actual cause of "please verify your details again" repeating
  // after a real confirmation. Still answers a real FAQ question if one
  // matches; otherwise gives one clear, terminal acknowledgment.
  if (currentExtracted?.confirmed) {
    const closing = fillTemplate(tpl.alreadyConfirmed, { id: currentExtracted.appointment_id || "" });
    const finalReply = faqAnswer ? `${faqAnswer} ${closing}` : closing;
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "confirmation_complete",
      finalExtracted: currentExtracted,
      finalIsComplete: true,
      responseSource: "clinic-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // Caller gave a day/date but no time ("tomorrow", "kal", "Sunday") while
  // we're on the slot step — acknowledge the date and ask specifically for
  // the time, instead of silently re-asking the generic "when would you
  // like to schedule this" question again.
  const dateOnlyMention =
    currentStep?.id === "slot" && !extracted.confirmedSlot && !slot && !faqAnswer
      ? extractDateOnlyMention(userMessage, nowIST)
      : null;
  if (dateOnlyMention) {
    const finalReply = fillTemplate(tpl.askTime, { ...vars, date: dateOnlyMention });
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "intake_name_mobile",
      finalExtracted: {
        name, mobile, dob, department: dept, doctor: doctorForDept, slot: "",
        intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
        summary: finalReply.slice(0, 80),
        pendingDate: dateOnlyMention,
      },
      finalIsComplete: false,
      responseSource: "clinic-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // Check if slot was provided either this turn or in a previous turn
  const effectiveSlot = slot || currentExtracted.slot || currentExtracted.pendingSlot || "";
  const resolvedEffectiveSlot = effectiveSlot ? (resolveAbsoluteSlotString(effectiveSlot, nowIST) || effectiveSlot) : "";

  // Hard gate: a slot is validated against clinic AND
  // doctor hours before it's allowed to count as "filled" — independent of
  // whatever step logic follows. An invalid slot never gets accepted.
  if (effectiveSlot && dept) {
    const resolved = resolveDayAndHour(effectiveSlot, nowIST);
    if (resolved) {
      // A department's own roster entry (when one exists) is the authoritative
      // hours window — e.g. the diagnostic lab opens at 7 AM for fasting tests,
      // narrower general clinic hours would wrongly reject a legitimate early
      // booking. General clinic hours are only the fallback for a department
      // with no roster entry.
      const doctorEntry = DOCTOR_ROSTER[dept];
      const clinicOk = doctorEntry
        ? doctorEntry.days.includes(resolved.dayOfWeek) && resolved.hour >= doctorEntry.startHour && resolved.hour < doctorEntry.endHour
        : CLINIC_OPEN_DAYS.includes(resolved.dayOfWeek) && resolved.hour >= CLINIC_OPEN_HOUR && resolved.hour < CLINIC_CLOSE_HOUR;

      let finalReply = "";
      if (!clinicOk && !doctorEntry) {
        finalReply = tpl.outOfHours;
      } else if (!clinicOk && doctorEntry) {
        finalReply = fillTemplate(tpl.doctorDayMismatch, {
          doctor: doctorEntry.doctor,
          days: formatDaysList(doctorEntry.days, lang),
          hours: formatHourRange(doctorEntry.startHour, doctorEntry.endHour),
        });
      }
      if (finalReply) {
        return {
          finalReply,
          finalSpokenText: "",
          finalStep: "inquiry_resolution",
          finalExtracted: {
            name, mobile, dob, department: dept, doctor: doctorForDept, slot: "",
            intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
            summary: finalReply.slice(0, 80),
            pendingSlot: "",
          },
          finalIsComplete: false,
          responseSource: "clinic-template",
          toneHint: "empathetic",
          finalCallEnded: false,
        };
      }
    }
  }

  // Caller gave a slot before selecting department (e.g. "Kal subah 10:30 AM ka appointment chahiye")
  if (currentStep?.id === "department" && effectiveSlot) {
    const slotDisplay = resolvedEffectiveSlot || effectiveSlot;
    const finalReply = lang === "hi-IN"
      ? `ठीक है, ${slotDisplay} का समय नोट कर लिया है। कृपया बताइए आप किस डिपार्टमेंट या डॉक्टर के लिए अपॉइंटमेंट लेना चाहते हैं? हमारे पास Dermatology, Cardiology, Orthopedics, ENT, Pediatrics, General Medicine, Ophthalmology, Dental Care और Diagnostics & Pathology हैं।`
      : `Got it, ${slotDisplay}. Which department or doctor would you like to consult? We have Dermatology, Cardiology, Orthopedics, ENT, Pediatrics, General Medicine, Ophthalmology, Dental Care, and Diagnostics & Pathology.`;
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "intake_name_mobile",
      finalExtracted: {
        name, mobile, dob, department: "", doctor: "", slot: slotDisplay,
        intent: currentExtracted.intent || "Clinic Consultation",
        summary: finalReply.slice(0, 80),
        pendingSlot: slotDisplay,
      },
      finalIsComplete: false,
      responseSource: "clinic-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  const { step: stepBeforeThisTurn } = getCurrentStep(industry, {
    name: currentExtracted.name || "",
    mobile: currentExtracted.mobile || "",
    dob: currentExtracted.dob || "",
    department: currentExtracted.department || "",
    slot: currentExtracted.slot || "",
  });
  const advancedThisTurn = stepBeforeThisTurn?.id !== currentStep?.id || isReadyToConfirm;

  if (!(advancedThisTurn || faqAnswer)) {
    // If caller specifically answered "doctor appointment" / "doctor" / "specialty", list the specialties
    const lowerMsg = userMessage.toLowerCase();
    const isAskingForDoctor =
      currentStep?.id === "department" &&
      (/\b(doctor|dr|specialty|speciality|appointment|consultation|milna|dikhana)\b/i.test(lowerMsg) ||
       /डॉक्टर|अपॉइंटमेंट|स्पेशलिटी|दिखाना|मिलना|परामर्श/.test(userMessage));
    if (isAskingForDoctor && !dept) {
      const finalReply = lang === "hi-IN"
        ? "जी बिल्कुल! डॉक्टर अपॉइंटमेंट के लिए हमारे पास डेंटल केयर, जनरल मेडिसिन, डर्मेटोलॉजी, कार्डियोलॉजी, ऑर्थोपेडिक्स, ईएनटी, पीडियाट्रिक्स, ऑप्थल्मोलॉजी और डायग्नोस्टिक्स एंड पैथोलॉजी उपलब्ध हैं। आप किस स्पेशलिटी या डॉक्टर के लिए अपॉइंटमेंट लेना चाहेंगे?"
        : "Sure! For a doctor appointment, we have Dental Care, General Medicine, Dermatology, Cardiology, Orthopedics, ENT, Pediatrics, Ophthalmology, and Diagnostics & Pathology. Which specialty or doctor would you like to consult?";
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "intake_name_mobile",
        finalExtracted: {
          name, mobile, dob, department: "", doctor: "", slot: resolvedSlot,
          intent: currentExtracted.intent || "Doctor Appointment",
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete: false,
        responseSource: "clinic-template",
        toneHint: "neutral",
        finalCallEnded: false,
      };
    }
    // Caller described symptoms or complex phrasing — fall through to LLM (OpenAI)
    // so the model can understand symptoms like "mere dant mai drd h" -> Dental Care
    return null;
  }

  if (isReadyToConfirm) {
    // Checked BEFORE affirmative, and wins if both match — a real correction
    // very often contains a confirmation-adjacent word too ("no that's not
    // right, please confirm for the 29th"). The old order checked
    // affirmative first, so "confirm" in that sentence alone was enough to
    // lock in the ORIGINAL (wrong) slot as confirmed, completely ignoring
    // the "not right" right before it. "no"/"wrong"/"not right"/"change"
    // across all 10 languages — also wires up CLINIC_TEMPLATES.correction,
    // which previously existed but was never actually called from anywhere.
    const negative =
      /\b(no|nope|nahi|nahin|galat|wrong|incorrect|not\s+(correct|right)|isn'?t\s+right|change|badal|badlo)\b/i.test(userMessage) ||
      /नहीं|गलत|இல்லை|தவறு|లేదు|తప్పు|না|ভুল|ഇല്ല|തെറ്റ്|ಇಲ್ಲ|ತಪ್ಪು|ਨਹੀਂ|ਗਲਤ|ના|ખોટું|ନା|ଭୁଲ/.test(userMessage);
    const affirmative = !negative && /\b(yes|yeah|yep|correct|confirm|book\s*it|okay|ok|haan|theek|sahi|சரி|ஆம்|అవును|హా|হ্যাঁ|ঠিক|ਹਾਂ|ਠੀਕ|હા|બરાબર|ହଁ|ଠିକ)\b/i.test(userMessage);
    // Did this turn's raw text actually re-extract a NEW value for any
    // field vs. what was already in the confirmation summary? If so, treat
    // it as a correction WITH the new value already supplied — only a bare
    // rejection with nothing new needs the dedicated "what would you like
    // to change?" prompt.
    const fieldsChangedThisTurn =
      (!!extracted.department && extracted.department !== currentExtracted.department) ||
      (!!extracted.mobile && extracted.mobile !== currentExtracted.mobile) ||
      (!!extracted.dob && extracted.dob !== currentExtracted.dob) ||
      (!!(extracted.confirmedSlot || extracted.slotRequested) && resolvedSlot !== currentExtracted.slot);

    if (affirmative) {
      // This path — the deterministic template confirm — handles the
      // MAJORITY of real confirmations, and until now had zero correctness
      // validation before confirming: it only ever checked that each field
      // was non-empty, never that a mobile number was actually shaped like
      // one. Verified live: a real STT mis-transcription (a dropped digit)
      // produced a plausible-looking but invalid 9-digit number that sailed
      // straight through to a confirmed booking with no way to ever reach
      // the caller. Slot/hours are already validated earlier in this
      // function; this specifically catches what nothing before it did.
      const genuinelyComplete = isBookingGenuinelyComplete(
        industry, industry.id,
        { name, mobile, dob, department: dept, slot: resolvedSlot },
        nowIST
      );
      if (!genuinelyComplete) {
        const finalReply = fillTemplate(tpl.askMobile, { name });
        return {
          finalReply,
          finalSpokenText: "",
          finalStep: "intake_name_mobile",
          finalExtracted: {
            name, mobile: "", dob, department: dept, doctor: doctorForDept, slot: resolvedSlot,
            intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
            summary: finalReply.slice(0, 80),
          },
          finalIsComplete: false,
          responseSource: "clinic-template",
          toneHint: "empathetic",
          finalCallEnded: false,
        };
      }

      const generated = generateActionId(industry);
      const finalReply = fillTemplate(tpl.confirmed, { id: generated.idValue });
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "confirmation_complete",
        finalExtracted: {
          name, mobile, dob, department: dept, doctor: doctorForDept, slot: resolvedSlot,
          intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
          appointment_id: generated.idValue,
          confirmed: true,
          appointment_status: "CONFIRMED",
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete: true,
        responseSource: "clinic-template",
        toneHint: "confirmed",
        finalCallEnded: false,
      };
    } else if (negative && !fieldsChangedThisTurn) {
      // Plain "no" with nothing new said — ask what to change instead of
      // parroting back the exact same confirmation line, which just looked
      // broken/unresponsive to a caller who clearly rejected it.
      //
      // But this template can only ever ask the SAME question — it has no
      // way to actually understand whatever the caller says next. If that
      // next reply also doesn't restate one of the tracked fields (a
      // language-switch request, a rephrased rejection this regex doesn't
      // recognize, anything free-form), this branch fired again and repeated
      // the identical line forever with no escape. Once already asked this
      // turn's-ago, hand off to GPT instead of asking a second time — GPT
      // can actually parse open-ended phrasing this can't.
      if (currentExtracted.correctionAsked) {
        return null;
      }
      const finalReply = faqAnswer ? `${faqAnswer} ${tpl.correction}` : tpl.correction;
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "confirmation_summary",
        finalExtracted: {
          name, mobile, dob, department: dept, doctor: doctorForDept, slot: resolvedSlot,
          intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
          summary: finalReply.slice(0, 80),
          correctionAsked: true,
        },
        finalIsComplete: false,
        responseSource: "clinic-template",
        toneHint: "empathetic",
        finalCallEnded: false,
      };
    } else if (fieldsChangedThisTurn || faqAnswer) {
      // A correction with the new value already given ("no, make it 3pm
      // instead"), a bare restated value with no yes/no word at all, or a
      // matched FAQ question — all deterministically answerable by
      // rebuilding the confirmation line.
      const confirmationLine = fillTemplate(tpl.confirmation, vars);
      const finalReply = faqAnswer ? `${faqAnswer} ${confirmationLine}` : confirmationLine;
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "confirmation_summary",
        finalExtracted: {
          name, mobile, dob, department: dept, doctor: doctorForDept, slot: resolvedSlot,
          intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete: false,
        responseSource: "clinic-template",
        toneHint: "neutral",
        finalCallEnded: false,
      };
    }
    // else: genuinely ambiguous — no yes/no signal, nothing new extracted,
    // no FAQ match. Rather than keep guessing with more keyword lists, or
    // blindly re-showing the identical confirmation line (unhelpful for
    // anything off-script), return null here so this turn falls through to
    // the GPT section, which actually understands free-form phrasing.
    // isBookingGenuinelyComplete() still gates whether GPT is allowed to
    // actually confirm anything from this turn.
    return null;
  } else if (currentStep) {
    const askTemplates: Record<string, string> = {
      name: tpl.couldNotUnderstand,
      mobile: tpl.askMobile,
      dob: tpl.askDob,
      department: tpl.askDepartment,
      slot: dept
        ? (lang === "hi-IN"
            ? `${name ? name + " जी, " : ""}${dept}${doctorForDept ? " (" + doctorForDept + ")" : ""} के लिए आप कब अपॉइंटमेंट लेना चाहेंगे? हम सोमवार से शनिवार, सुबह 9 बजे से शाम 7 बजे तक खुले हैं।`
            : `${name ? name + ", " : ""}what day and time would work best for your ${dept}${doctorForDept ? " with " + doctorForDept : ""} appointment? We're open Monday to Saturday, 9 AM to 7 PM.`)
        : tpl.askSlot,
    };
    const askLine = fillTemplate(askTemplates[currentStep.id] || tpl.couldNotUnderstand, vars);
    // The "name" step's ask IS tpl.couldNotUnderstand (there's no dedicated
    // ask-for-name text — the greeting already asks for it, so this only
    // fires if a name somehow still wasn't provided). Appending it after a
    // real FAQ answer reads as "here's your answer... sorry, I didn't
    // understand you" — nonsensical right after actually answering. Every
    // other step's ask line is a genuine next question, so it's still worth
    // pairing with the FAQ answer there.
    const askLineIsPlaceholder = currentStep.id === "name";
    const finalReply = faqAnswer && !askLineIsPlaceholder ? `${faqAnswer} ${askLine}` : (faqAnswer || askLine);
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "intake_name_mobile",
      finalExtracted: {
        name, mobile, dob, department: dept, doctor: doctorForDept, slot: resolvedSlot,
        intent: currentExtracted.intent || (dept ? `${dept} Consultation` : ""),
        summary: finalReply.slice(0, 80),
      },
      finalIsComplete: false,
      responseSource: "clinic-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  return null;
}
