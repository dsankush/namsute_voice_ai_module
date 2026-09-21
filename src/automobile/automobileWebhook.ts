import { AutomobileIntent, AutomobileServiceBooking } from "./automobileTypes";

export interface AutomobileWebhookPayload {
  event:
    | "SERVICE_BOOKING_CREATED"
    | "TEST_DRIVE_BOOKED"
    | "AUTOMOBILE_LEAD_CREATED"
    | "ROADSIDE_ASSISTANCE_REQUESTED"
    | "HUMAN_HANDOFF_REQUESTED";
  industry: "automobile";
  lead: {
    name: string;
    mobile: string;
    intent: AutomobileIntent;
    vehicleModel?: string;
    registrationNumber?: string;
    serviceType?: string;
    issueDescription?: string;
    dealerName?: string;
    dealerLocation?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    slotFull?: string;
    budgetLakh?: number;
    fuelType?: string;
    transmission?: string;
    referenceId?: string;
  };
  transcript: string[];
  source: string;
  timestamp: string;
}

export function buildAutomobileWebhookPayload(params: {
  intent: AutomobileIntent;
  extracted: Record<string, any>;
  transcript: string[];
  referenceId: string;
  source?: string;
}): AutomobileWebhookPayload {
  const { intent, extracted, transcript, referenceId, source = "web_voice_call" } = params;

  let event: AutomobileWebhookPayload["event"] = "AUTOMOBILE_LEAD_CREATED";
  if (intent === "SERVICE_BOOKING" || intent === "PERIODIC_SERVICE" || intent === "REPAIR_REQUEST") {
    event = "SERVICE_BOOKING_CREATED";
  } else if (intent === "TEST_DRIVE") {
    event = "TEST_DRIVE_BOOKED";
  } else if (intent === "ROADSIDE_ASSISTANCE") {
    event = "ROADSIDE_ASSISTANCE_REQUESTED";
  } else if (intent === "HUMAN_HANDOFF") {
    event = "HUMAN_HANDOFF_REQUESTED";
  }

  return {
    event,
    industry: "automobile",
    lead: {
      name: extracted.name || "Customer",
      mobile: extracted.mobile || "",
      intent,
      vehicleModel: extracted.vehicleModel,
      registrationNumber: extracted.registrationNumber,
      serviceType: extracted.serviceType,
      issueDescription: extracted.issueDescription,
      dealerName: extracted.dealerName || "Apex Motors",
      dealerLocation: extracted.dealerLocation || "Delhi NCR",
      slotFull: extracted.slot,
      budgetLakh: extracted.budgetLakh,
      fuelType: extracted.fuelType,
      transmission: extracted.transmission,
      referenceId,
    },
    transcript,
    source,
    timestamp: new Date().toISOString(),
  };
}
