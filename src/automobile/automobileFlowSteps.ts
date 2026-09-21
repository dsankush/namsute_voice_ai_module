import { AutomobileIntent } from "./automobileTypes";
import { AUTOMOBILE_TEMPLATES } from "./automobileTemplates";

export interface AutomobileFlowStep {
  id: string;
  field: string;
  askEnglish: string;
  askHindi: string;
}

export function getAutomobileFlowSteps(intent: AutomobileIntent): AutomobileFlowStep[] {
  const en = AUTOMOBILE_TEMPLATES["en-IN"];
  const hi = AUTOMOBILE_TEMPLATES["hi-IN"];

  // 1. Existing Vehicle Owner Service Flow
  if (
    intent === "SERVICE_BOOKING" ||
    intent === "PERIODIC_SERVICE" ||
    intent === "REPAIR_REQUEST" ||
    intent === "PICKUP_DROP_REQUEST"
  ) {
    return [
      { id: "vehicle", field: "vehicleModel", askEnglish: en.askVehicle, askHindi: hi.askVehicle },
      { id: "regNo", field: "registrationNumber", askEnglish: en.askRegNumber.replace("{name}", "there"), askHindi: hi.askRegNumber.replace("{name} जी", "") },
      { id: "serviceType", field: "serviceType", askEnglish: en.askServiceType.replace("{vehicle}", "vehicle"), askHindi: hi.askServiceType.replace("{vehicle}", "गाड़ी") },
      { id: "dealer", field: "dealerLocation", askEnglish: en.askDealer, askHindi: hi.askDealer },
      { id: "slot", field: "slot", askEnglish: en.askSlot, askHindi: hi.askSlot },
      { id: "name", field: "name", askEnglish: en.askName, askHindi: hi.askName },
      { id: "mobile", field: "mobile", askEnglish: en.askMobile.replace("{name}", "there"), askHindi: hi.askMobile.replace("{name} जी", "") },
    ];
  }

  // 2. Test Drive Flow
  if (intent === "TEST_DRIVE") {
    return [
      { id: "vehicle", field: "vehicleModel", askEnglish: en.askVehicle, askHindi: hi.askVehicle },
      { id: "dealer", field: "dealerLocation", askEnglish: en.askDealer, askHindi: hi.askDealer },
      { id: "slot", field: "slot", askEnglish: en.askSlot, askHindi: hi.askSlot },
      { id: "name", field: "name", askEnglish: en.askName, askHindi: hi.askName },
      { id: "mobile", field: "mobile", askEnglish: en.askMobile.replace("{name}", "there"), askHindi: hi.askMobile.replace("{name} जी", "") },
    ];
  }

  // 3. New Car Sales / Lead Qualification Flow
  return [
    { id: "vehicle", field: "vehicleModel", askEnglish: en.askVehicle, askHindi: hi.askVehicle },
    { id: "dealer", field: "dealerLocation", askEnglish: en.askDealer, askHindi: hi.askDealer },
    { id: "name", field: "name", askEnglish: en.askName, askHindi: hi.askName },
    { id: "mobile", field: "mobile", askEnglish: en.askMobile.replace("{name}", "there"), askHindi: hi.askMobile.replace("{name} जी", "") },
  ];
}

export function getCurrentAutomobileStep(
  intent: AutomobileIntent,
  fields: Record<string, any>
): { step: AutomobileFlowStep | null; isReadyToConfirm: boolean } {
  const steps = getAutomobileFlowSteps(intent);
  const nextUnfilled = steps.find((s) => !fields[s.field]);
  return {
    step: nextUnfilled || null,
    isReadyToConfirm: !nextUnfilled,
  };
}

export function generateAutomobileActionId(intent: AutomobileIntent): string {
  const prefix =
    intent === "SERVICE_BOOKING" || intent === "PERIODIC_SERVICE" || intent === "REPAIR_REQUEST"
      ? "SB"
      : intent === "TEST_DRIVE"
      ? "TD"
      : intent === "ROADSIDE_ASSISTANCE"
      ? "RSA"
      : "LEAD";
  const num = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}-${num}`;
}
