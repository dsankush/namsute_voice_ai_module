import { AutomobileIntent } from "./automobileTypes";
import { DEALERSHIP_CENTERS, matchDealership } from "./automobileDealerData";
import { resolveDayAndHour } from "@/lib/dateEngine";
import { isValidIndianMobile } from "@/lib/entities";

export function isAutomobileActionGenuinelyComplete(
  intent: AutomobileIntent,
  fields: {
    name?: string;
    mobile?: string;
    vehicleModel?: string;
    registrationNumber?: string;
    dealerId?: string;
    dealerLocation?: string;
    serviceType?: string;
    slot?: string;
  },
  nowIST: Date
): boolean {
  const name = (fields.name || "").trim();
  const mobile = (fields.mobile || "").trim();
  const vehicle = (fields.vehicleModel || "").trim();

  // Basic customer contact verification required for all actionable leads
  if (!name || name.length < 2 || name.length > 80) return false;
  if (!isValidIndianMobile(mobile)) return false;
  if (!vehicle) return false;

  // 1. Service Booking Validations
  if (
    intent === "SERVICE_BOOKING" ||
    intent === "PERIODIC_SERVICE" ||
    intent === "REPAIR_REQUEST" ||
    intent === "PICKUP_DROP_REQUEST"
  ) {
    if (!fields.serviceType) return false;
    if (!fields.slot) return false;

    // Check operating hours of workshop
    const dealer = matchDealership(fields.dealerLocation || fields.dealerId || "") || DEALERSHIP_CENTERS.gurgaon;
    const resolved = resolveDayAndHour(fields.slot, nowIST);
    if (resolved) {
      const withinDays = dealer.openDays.includes(resolved.dayOfWeek);
      const withinHours = resolved.hour >= dealer.openHour && resolved.hour < dealer.closeHour;
      if (!withinDays || !withinHours) return false;
    }

    return true;
  }

  // 2. Test Drive Booking Validations
  if (intent === "TEST_DRIVE") {
    if (!fields.slot) return false;
    const dealer = matchDealership(fields.dealerLocation || fields.dealerId || "") || DEALERSHIP_CENTERS.gurgaon;
    const resolved = resolveDayAndHour(fields.slot, nowIST);
    if (resolved) {
      const withinDays = dealer.openDays.includes(resolved.dayOfWeek);
      const withinHours = resolved.hour >= dealer.openHour && resolved.hour < dealer.closeHour;
      if (!withinDays || !withinHours) return false;
    }
    return true;
  }

  // 3. New Car Sales Lead (Qualified)
  if (intent === "NEW_CAR_ENQUIRY" || intent === "USED_CAR_BUY" || intent === "USED_CAR_SELL") {
    return true;
  }

  return true;
}
