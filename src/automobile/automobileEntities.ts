import { matchVehicleModel } from "./automobileVehicleData";
import { matchDealership } from "./automobileDealerData";
import { parsePhoneNumber, isValidIndianMobile } from "@/lib/entities";
import { parseSlotWithChrono } from "@/lib/dateEngine";

export interface AutomobileExtractedEntities {
  name?: string;
  mobile?: string;
  vehicleModel?: string;
  registrationNumber?: string;
  dealerId?: string;
  dealerName?: string;
  dealerLocation?: string;
  serviceType?: string;
  issueDescription?: string;
  budgetLakh?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  slot?: string;
  purchaseTimeline?: string;
  [key: string]: any;
}

/**
 * Extracts Indian Vehicle Registration Numbers (e.g. UP16AB1234, DL 01 AB 1234, MH12DE4567)
 */
export function extractRegistrationNumber(text: string): string | null {
  if (!text) return null;
  // Match Indian registration plate pattern with or without spaces/dashes
  // State code (2 letters) + RTO code (1-2 digits) + optional series (1-3 letters) + 4 digits
  const regRegex = /\b([A-Z]{2})\s*[-]?\s*([0-9]{1,2})\s*[-]?\s*([A-Z]{1,3})\s*[-]?\s*([0-9]{4})\b/i;
  const match = text.match(regRegex);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}${match[3].toUpperCase()}${match[4]}`;
  }

  // Bare pattern match like DL9CA1234 or UP161234
  const bareRegex = /\b([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4})\b/i;
  const bareMatch = text.match(bareRegex);
  if (bareMatch) {
    return bareMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Robust entity extractor tailored for automobile conversations
 */
export function extractAutomobileEntities(
  text: string,
  current: AutomobileExtractedEntities = {}
): AutomobileExtractedEntities {
  const result: AutomobileExtractedEntities = { ...current };
  const lower = (text || "").toLowerCase();

  // 1. Mobile number
  const parsedPhone = parsePhoneNumber(text);
  if (parsedPhone && isValidIndianMobile(parsedPhone)) {
    result.mobile = parsedPhone;
  }

  // 2. Customer Name
  const nameMatch = text.match(
    /(?:my name is|i am|name is|mera naam|naam hai|this is|myself|माय नेम इस|मेरा नाम|नाम है)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)??)(?=\s*(?:hai|he|and|है|हैं|हूं|एंड|,|\.|\d|phone|mobile|number|contact|नंबर|$))/i
  );
  if (nameMatch?.[1]) {
    const n = nameMatch[1].trim();
    if (!["hello", "hi", "hey", "namaste", "car", "service", "creta", "nexon", "brezza"].includes(n.toLowerCase())) {
      result.name = n.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // Bare name if 1-2 words on name step
  if (!result.name && !current.name) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const isShortName =
      words.length >= 1 &&
      words.length <= 2 &&
      /^[a-zA-Z\u0900-\u097F]+$/.test(trimmed) &&
      !/\b(hello|hi|hey|namaste|yes|no|ok|okay|haan|service|car|suv|creta|nexon|brezza|gadi|gaadi|kal|aaj)\b/i.test(trimmed);
    if (isShortName) {
      result.name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // 3. Vehicle Registration Number
  const regNo = extractRegistrationNumber(text);
  if (regNo) {
    result.registrationNumber = regNo;
  }

  // 4. Vehicle Model from Catalog
  const matchedVehicle = matchVehicleModel(text);
  if (matchedVehicle) {
    result.vehicleModel = `${matchedVehicle.brand} ${matchedVehicle.model}`;
  }

  // 5. Dealership Location
  const matchedDealer = matchDealership(text);
  if (matchedDealer) {
    result.dealerId = matchedDealer.id;
    result.dealerName = matchedDealer.name;
    result.dealerLocation = matchedDealer.location;
  }

  // 6. Fuel Type
  if (/\b(cng)\b/i.test(lower)) result.fuelType = "CNG";
  else if (/\b(diesel)\b/i.test(lower)) result.fuelType = "Diesel";
  else if (/\b(electric|ev)\b/i.test(lower)) result.fuelType = "Electric";
  else if (/\b(petrol)\b/i.test(lower)) result.fuelType = "Petrol";

  // 7. Transmission
  if (/\b(automatic|auto|dct|cvt|amt)\b/i.test(lower)) result.transmission = "Automatic";
  else if (/\b(manual)\b/i.test(lower)) result.transmission = "Manual";

  // 8. Body Type
  if (/\b(compact\s*suv)\b/i.test(lower)) result.bodyType = "Compact SUV";
  else if (/\b(suv)\b/i.test(lower)) result.bodyType = "SUV";
  else if (/\b(sedan)\b/i.test(lower)) result.bodyType = "Sedan";
  else if (/\b(hatchback)\b/i.test(lower)) result.bodyType = "Hatchback";

  // 9. Budget extraction
  const budgetMatch = text.match(/(?:under|below|budget|around|max|tak)\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:lakh|lac|l)\b/i);
  if (budgetMatch?.[1]) {
    result.budgetLakh = parseFloat(budgetMatch[1]);
  }

  // 10. Service Type / Issue Description
  if (/\b(brake|braking|break)\b/i.test(lower)) {
    result.serviceType = "Brake Inspection & Repair";
    result.issueDescription = "Brake noise / pedal vibration reported";
  } else if (/\b(ac|cooling|cool)\b/i.test(lower)) {
    result.serviceType = "AC Inspection & Disinfection";
    result.issueDescription = "Inadequate AC cabin cooling";
  } else if (/\b(clutch)\b/i.test(lower)) {
    result.serviceType = "Clutch & Gearbox Overhaul";
    result.issueDescription = "Hard clutch pedal / shifting issue";
  } else if (/\b(oil\s*change|periodic|regular|maintenance|scheduled)\b/i.test(lower)) {
    result.serviceType = "Periodic Maintenance Service (PMS)";
  } else if (/\b(dent|scratch|paint|bumper)\b/i.test(lower)) {
    result.serviceType = "Bodyshop Dent & Paint";
  }

  // 11. Slot Date & Time Parsing
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const parsedSlot = parseSlotWithChrono(text, nowIST);
  if (parsedSlot && parsedSlot.hasDate && parsedSlot.hasTime) {
    const d = parsedSlot.date;
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    result.slot = `${dateStr}, ${timeStr}`;
  }

  return result;
}
