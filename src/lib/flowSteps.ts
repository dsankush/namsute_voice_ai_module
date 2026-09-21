import { IndustryFlow, FlowStep } from "@/data/industryFlows";
import { CLINIC_TEMPLATES } from "@/data/clinicTemplates";

// ─── Deterministic Intake FSM ────────────────────────────────────────────────
// Code decides which step is active — never the model. The model's only job
// per turn is to extract the field(s) for the CURRENT step and phrase the
// fixed ask in the right language. This replaced a design where the model was
// handed the entire flow + full clinic knowledge base every turn and asked to
// freely decide "what step are we on", which was unreliable outside the one
// vertical (doctors-clinics) whose instructions were actually hardcoded in —
// every other industry was silently running through clinic-shaped prompt text.
export function getFlowSteps(industry: IndustryFlow): FlowStep[] {
  if (industry.steps && industry.steps.length > 0) return industry.steps;

  // doctors-clinics sources its ask text from CLINIC_TEMPLATES — the SAME
  // bank the deterministic fast path uses — instead of a separate hardcoded
  // copy here. Two places defining "the same" question is exactly what
  // caused this to drift out of sync: this generic version was missing the
  // department options list that CLINIC_TEMPLATES had, so any turn that fell
  // through to GPT (deterministic extraction failed) asked a worse, options-
  // free question than the templated fast path did. Single source of truth
  // now — whichever path answers, the question is identical.
  if (industry.id === "doctors-clinics") {
    const en = CLINIC_TEMPLATES["en-IN"];
    return [
      { id: "name", field: "name", askEnglish: en.couldNotUnderstand, askHindi: CLINIC_TEMPLATES["hi-IN"].couldNotUnderstand },
      { id: "mobile", field: "mobile", askEnglish: en.askMobile.replace("{name}", "there"), askHindi: CLINIC_TEMPLATES["hi-IN"].askMobile },
      { id: "dob", field: "dob", askEnglish: en.askDob.replace("{name}", "there"), askHindi: CLINIC_TEMPLATES["hi-IN"].askDob },
      { id: "department", field: "department", askEnglish: en.askDepartment, askHindi: CLINIC_TEMPLATES["hi-IN"].askDepartment },
      { id: "slot", field: "slot", askEnglish: en.askSlot, askHindi: CLINIC_TEMPLATES["hi-IN"].askSlot },
    ];
  }

  const steps: FlowStep[] = [
    { id: "name", field: "name", askEnglish: "May I know your name?", askHindi: "Kripya apna naam bataiye?" },
    { id: "mobile", field: "mobile", askEnglish: "Could you please provide your 10-digit mobile number?", askHindi: "Kripya apna 10-digit mobile number bataiye?" },
  ];
  if (industry.requiresDob) {
    steps.push({ id: "dob", field: "dob", askEnglish: "Could you please share your date of birth or age?", askHindi: "Kripya apni date of birth ya umar bataiye?" });
  }
  steps.push({ id: "department", field: "department", askEnglish: `How can I help you today at ${industry.brandName}?`, askHindi: `Main aapki ${industry.brandName} mein kaise madad kar sakta hoon?` });
  steps.push({ id: "slot", field: "slot", askEnglish: "When would you like to schedule this?", askHindi: "Aap kab schedule karna chahenge?" });
  return steps;
}

export function getCurrentStep(industry: IndustryFlow, fields: Record<string, string>): { step: FlowStep | null; isReadyToConfirm: boolean } {
  const steps = getFlowSteps(industry);
  const nextUnfilled = steps.find((s) => !fields[s.field]);
  return { step: nextUnfilled || null, isReadyToConfirm: !nextUnfilled };
}

// Generate a reference ID in the same shape as the industry's own template
// (e.g. "ABC-88421", "MAT-409") instead of the model inventing or reusing a
// hardcoded placeholder — this was previously hardcoded to "ABC-88421" for
// every industry regardless of vertical.
export function generateActionId(industry: IndustryFlow): { idField: string; idValue: string } {
  const idEntry = Object.entries(industry.systemActionPayloadTemplate).find(([k]) => k.endsWith("_id"));
  const idField = idEntry?.[0] || "reference_id";
  const templateValue = idEntry?.[1] || `${industry.id.slice(0, 3).toUpperCase()}-0000`;
  const prefix = templateValue.split("-")[0] || industry.id.slice(0, 3).toUpperCase();
  const suffix = Math.floor(10000 + Math.random() * 89999);
  return { idField, idValue: `${prefix}-${suffix}` };
}
