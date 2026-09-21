import { AutomobileIntent } from "./automobileTypes";

export function detectAutomobileIntent(text: string, currentIntent?: string): AutomobileIntent {
  const lower = (text || "").toLowerCase();

  // 1. Emergency Roadside Assistance (Highest priority)
  if (
    /\b(breakdown|band\s*ho\s*gayi|accident|towing|stuck|stranded|smoke|fire|engine.*overheat|overheating|won'?t\s*start|start\s*nahi|puncture|flat\s*tyre|battery\s*dead|jump\s*start|roadside|highway\s*par)\b/i.test(lower) ||
    /ब्रेकडाउन|एक्सीडेंट|टोइंग|बंद\s*हो\s*गई|गाड़ी\s*खराब/i.test(text)
  ) {
    return "ROADSIDE_ASSISTANCE";
  }

  // 2. Human Escalation / Advisor Request
  if (
    /\b(human|person|executive|advisor|manager|agent|talk\s*to\s*(someone|person|advisor)|connect|transfer|baat\s*karni\s*hai)\b/i.test(lower) &&
    !/\b(test\s*drive|book)\b/i.test(lower)
  ) {
    return "HUMAN_HANDOFF";
  }

  // 3. Service Status / Job Card Inquiry
  if (
    /\b(job\s*card|service\s*status|status|car\s*ready|delivery\s*time|kab\s*milegi|ready\s*kab\s*hogi|kahan\s*tak\s*pahunchi)\b/i.test(lower) ||
    /जॉब\s*कार्ड|स्टेटस|गाड़ी\s*कब\s*मिलेगी/i.test(text)
  ) {
    return "SERVICE_STATUS";
  }

  // 4. Test Drive Request
  if (
    /\b(test\s*drive|test\s*ride|drive\s*karni|chala\s*ke\s*dekhna|drive\s*karke)\b/i.test(lower) ||
    /टेस्ट\s*ड्राइव/i.test(text)
  ) {
    return "TEST_DRIVE";
  }

  // 5. Mechanical Problem / Repair Request
  if (
    /\b(brake|ac|cooling|clutch|noise|awaaz|vibration|pickup|warning\s*light|check\s*engine|oil\s*leak|alignment|dent|scratch|bumper)\b/i.test(lower) ||
    /आवाज़|कूलिंग|ब्रेक|एसी|खराबी/i.test(text)
  ) {
    return "REPAIR_REQUEST";
  }

  // 6. Service Booking / Maintenance
  if (
    /\b(service|servicing|periodic|maintenance|oil\s*change|inspection|first\s*service|second\s*service|third\s*service)\b/i.test(lower) ||
    /सर्विस|सर्विसिंग|मेंटेनेंस/i.test(text)
  ) {
    return "SERVICE_BOOKING";
  }

  // 7. Used Car / Exchange
  if (
    /\b(exchange|sell\s*(my)?\s*car|purani\s*gaadi|second\s*hand|used\s*car|bechni|badal)\b/i.test(lower) ||
    /पुरानी\s*कार|एक्सचेंज|बेचनी/i.test(text)
  ) {
    return lower.includes("sell") || lower.includes("bechni") ? "USED_CAR_SELL" : "USED_CAR_BUY";
  }

  // 8. Finance / Loan / EMI
  if (
    /\b(finance|loan|emi|interest|down\s*payment|kist|byaj)\b/i.test(lower) ||
    /लोन|ईएमआई|फाइनेंस/i.test(text)
  ) {
    return "FINANCE_ENQUIRY";
  }

  // 9. Insurance
  if (
    /\b(insurance|bima|renew|claim|cashless)\b/i.test(lower) ||
    /इंश्योरेंस|बीमा/i.test(text)
  ) {
    return "INSURANCE_ENQUIRY";
  }

  // 10. Showroom / Dealer Location
  if (
    /\b(showroom|dealer|location|address|where|timings?|hours?)\b/i.test(lower)
  ) {
    return "DEALER_INQUIRY";
  }

  // 11. New Car Purchase / Inquiry
  if (
    /\b(buy|car|suv|sedan|hatchback|ev|price|budget|creta|nexon|brezza|xuv|thar|swift|city|automatic|diesel|petrol|lakh)\b/i.test(lower) ||
    /कार|गाड़ी|खरीदनी|कीमत|प्राइस/i.test(text)
  ) {
    return "NEW_CAR_ENQUIRY";
  }

  return (currentIntent as AutomobileIntent) || "GENERAL_INQUIRY";
}
