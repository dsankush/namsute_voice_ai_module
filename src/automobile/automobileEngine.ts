import { AutomobileIntent, AutomobileLang } from "./automobileTypes";
import { AUTOMOBILE_BRAND_NAME, AUTOMOBILE_TEMPLATES, fillAutomobileTemplate } from "./automobileTemplates";
import { matchAutomobileFaq } from "./automobileFaq";
import { VEHICLE_CATALOG, matchVehicleModel, recommendVehicles } from "./automobileVehicleData";
import { DEALERSHIP_CENTERS, DEFAULT_DEALER, matchDealership } from "./automobileDealerData";
import { getJobCardStatus, getServiceEstimate, getRoadsideAssistanceInfo } from "./automobileServiceTools";
import { detectAutomobileIntent } from "./automobileIntents";
import { extractAutomobileEntities, AutomobileExtractedEntities } from "./automobileEntities";
import { getCurrentAutomobileStep, generateAutomobileActionId } from "./automobileFlowSteps";
import { isAutomobileActionGenuinelyComplete } from "./automobileBookingGuard";
import { callOpenAI, callOpenAIStreaming, sanitizeLlmField } from "@/lib/openaiClient";
import { resolveDayAndHour, resolveAbsoluteSlotString, extractDateOnlyMention } from "@/lib/dateEngine";
import { ChatTurnResult } from "@/lib/clinicEngine";

export interface ProcessAutomobileTurnParams {
  messages: any[];
  userMessage: string;
  currentExtracted: Record<string, any>;
  detectedLang: string;
  sarvamLanguageCode?: string;
  sttLanguageProbability?: number | null;
  onEarlyReplyText?: (replyText: string, langCode: string) => void;
}

export async function processAutomobileTurn(params: ProcessAutomobileTurnParams): Promise<ChatTurnResult> {
  const {
    messages = [],
    userMessage = "",
    currentExtracted = {},
    detectedLang = "en-IN",
    onEarlyReplyText,
  } = params;

  const lang = (AUTOMOBILE_TEMPLATES[detectedLang as AutomobileLang] ? detectedLang : "en-IN") as AutomobileLang;
  const tpl = AUTOMOBILE_TEMPLATES[lang];
  const isHindi = lang === "hi-IN";
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || "";

  // 1. Detect Intent & Extract Entities
  const currentIntent = currentExtracted.intent || "GENERAL_INQUIRY";
  const intent = detectAutomobileIntent(userMessage, currentIntent);
  const extracted = extractAutomobileEntities(userMessage, currentExtracted);

  const name = extracted.name || currentExtracted.name || "";
  const mobile = extracted.mobile || currentExtracted.mobile || "";
  const vehicle = extracted.vehicleModel || currentExtracted.vehicleModel || "";
  const regNo = extracted.registrationNumber || currentExtracted.registrationNumber || "";
  const dealer = extracted.dealerLocation || currentExtracted.dealerLocation || DEFAULT_DEALER.location;
  const serviceType = extracted.serviceType || currentExtracted.serviceType || "Periodic Maintenance Service (PMS)";
  const slot = extracted.slot || currentExtracted.slot || "";
  const resolvedSlot = slot ? (resolveAbsoluteSlotString(slot, nowIST) || slot) : slot;

  const currentVars = {
    name: name || (isHindi ? "वैल्यूड कस्टमर" : "there"),
    mobile,
    vehicle: vehicle || (isHindi ? "आपकी गाड़ी" : "your vehicle"),
    regNo: regNo || (isHindi ? "रजिस्ट्रेशन" : "Registration"),
    dealer,
    slot: resolvedSlot,
    date: resolvedSlot.split(",")[0] || "Upcoming",
    time: resolvedSlot.split(",")[1]?.trim() || "11:00 AM",
    serviceType,
    id: "",
  };

  // ── Interceptor -1: Farewell Check ──────────────────────────────────────
  const isFarewell = /\b(bye+|good\s*bye|hang\s*up|end\s*(the\s*)?call|alvida)\b/i.test(userMessage);
  if (isFarewell) {
    const finalReply = tpl.farewell;
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "call_ended",
      finalExtracted: { ...currentExtracted, summary: finalReply.slice(0, 80) },
      finalIsComplete: false,
      responseSource: "automobile-template",
      toneHint: "greeting",
      finalCallEnded: true,
    };
  }

  // ── Interceptor 0: Roadside Assistance / Emergency ──────────────────────
  if (intent === "ROADSIDE_ASSISTANCE" || intent === "ACCIDENT_ASSISTANCE") {
    const rsa = getRoadsideAssistanceInfo();
    const actionId = generateAutomobileActionId("ROADSIDE_ASSISTANCE");
    const finalReply = isHindi
      ? `यह इमरजेंसी ब्रेकडाउन लग रहा है। कृपया गाड़ी को सुरक्षित स्थान पर पार्क करें और हैजर्ड लाइट ऑन करें। हमारी 24/7 रोडसाइड असिस्टेंस हेल्पलाइन 1800-102-9999 है। इमरजेंसी डिस्पैच टिकट #${actionId} दर्ज कर लिया गया है।`
      : `This sounds like an urgent roadside situation. Please stay safe with hazard blinkers on. Our 24/7 Roadside Patrol helpline is ${rsa.hotline}. An emergency dispatch ticket #${actionId} has been created.`;
    const finalSpokenText = isHindi
      ? `यह इमरजेंसी ब्रेकडाउन लग रहा है। 24/7 हेल्पलाइन 1800-102-9999 पर कॉल करें। टिकट #${actionId} दर्ज हो गया है।`
      : "";

    return {
      finalReply,
      finalSpokenText,
      finalStep: "emergency_roadside",
      finalExtracted: {
        ...currentExtracted,
        name: name || "Emergency Caller",
        mobile,
        vehicleModel: vehicle || "Stranded Vehicle",
        registrationNumber: regNo,
        intent: "ROADSIDE_ASSISTANCE",
        appointment_id: actionId,
        confirmed: true,
        summary: finalReply.slice(0, 80),
      },
      finalIsComplete: true,
      responseSource: "automobile-deterministic",
      toneHint: "urgent",
      finalCallEnded: false,
    };
  }

  // ── Interceptor 1: Service Status & Job Card Track ─────────────────────
  if (intent === "SERVICE_STATUS") {
    const statusResult = getJobCardStatus(regNo || mobile || userMessage);
    const finalReply = isHindi
      ? `${regNo || "गाड़ी"} का स्टेटस: वर्तमान स्टेज - ${statusResult.stage || "जांच जारी"}। तैयार होने का अनुमानित समय: ${statusResult.estimatedCompletion || "आज शाम 5:30"}। सर्विस एडवाइजर: ${statusResult.advisorName} (${statusResult.advisorContact})।`
      : statusResult.message;
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "inquiry_resolution",
      finalExtracted: {
        ...currentExtracted,
        intent: "SERVICE_STATUS",
        registrationNumber: regNo || statusResult.registrationNumber,
        summary: finalReply.slice(0, 80),
      },
      finalIsComplete: false,
      responseSource: "automobile-deterministic",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // ── Interceptor 2: Deterministic FAQ Matching ──────────────────────────
  const faqAnswer = matchAutomobileFaq(userMessage, lang);

  // ── Interceptor 3: Already Confirmed Booking ───────────────────────────
  if (currentExtracted?.confirmed) {
    const closing = fillAutomobileTemplate(tpl.alreadyConfirmed, { id: currentExtracted.appointment_id || "" });
    const finalReply = faqAnswer ? `${faqAnswer} ${closing}` : closing;
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "confirmation_complete",
      finalExtracted: currentExtracted,
      finalIsComplete: true,
      responseSource: "automobile-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // ── Interceptor 4: Automobile Fast Path for Routine Steps ───────────────
  const { step: currentStep, isReadyToConfirm } = getCurrentAutomobileStep(intent, {
    name,
    mobile,
    vehicleModel: vehicle,
    registrationNumber: regNo,
    dealerLocation: dealer,
    serviceType,
    slot: resolvedSlot,
  });

  // Date-only mentioned on slot step
  const dateOnlyMention =
    currentStep?.id === "slot" && !resolvedSlot && !faqAnswer
      ? extractDateOnlyMention(userMessage, nowIST)
      : null;
  if (dateOnlyMention) {
    const finalReply = fillAutomobileTemplate(tpl.askTime, { ...currentVars, date: dateOnlyMention });
    return {
      finalReply,
      finalSpokenText: "",
      finalStep: "intake_slot",
      finalExtracted: {
        ...currentExtracted,
        name,
        mobile,
        vehicleModel: vehicle,
        registrationNumber: regNo,
        dealerLocation: dealer,
        intent,
        summary: finalReply.slice(0, 80),
        pendingDate: dateOnlyMention,
      },
      finalIsComplete: false,
      responseSource: "automobile-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // Confirmation handling
  if (isReadyToConfirm) {
    const negative =
      /\b(no|nope|nahi|nahin|galat|wrong|incorrect|not\s+(correct|right)|change|badal|badlo)\b/i.test(userMessage) ||
      /नहीं|गलत/.test(userMessage);
    const affirmative = !negative && /\b(yes|yeah|yep|correct|confirm|book\s*it|okay|ok|haan|theek|sahi|bilkul)\b/i.test(userMessage);

    if (affirmative) {
      const genuinelyComplete = isAutomobileActionGenuinelyComplete(
        intent,
        { name, mobile, vehicleModel: vehicle, registrationNumber: regNo, dealerLocation: dealer, serviceType, slot: resolvedSlot },
        nowIST
      );

      if (!genuinelyComplete) {
        const finalReply = fillAutomobileTemplate(tpl.askMobile, { name });
        return {
          finalReply,
          finalSpokenText: "",
          finalStep: "intake_contact",
          finalExtracted: {
            ...currentExtracted,
            name,
            mobile: "",
            vehicleModel: vehicle,
            summary: finalReply.slice(0, 80),
          },
          finalIsComplete: false,
          responseSource: "automobile-template",
          toneHint: "empathetic",
          finalCallEnded: false,
        };
      }

      const generatedId = generateAutomobileActionId(intent);
      const finalReply = fillAutomobileTemplate(tpl.bookingConfirmed, { id: generatedId });
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "confirmation_complete",
        finalExtracted: {
          ...currentExtracted,
          name,
          mobile,
          vehicleModel: vehicle,
          registrationNumber: regNo,
          dealerLocation: dealer,
          serviceType,
          slot: resolvedSlot,
          intent,
          appointment_id: generatedId,
          confirmed: true,
          appointment_status: "CONFIRMED",
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete: true,
        responseSource: "automobile-template",
        toneHint: "confirmed",
        finalCallEnded: false,
      };
    } else if (!negative) {
      // Formulate confirmation summary line
      const summaryLine =
        intent === "TEST_DRIVE"
          ? fillAutomobileTemplate(tpl.testDriveConfirmation, currentVars)
          : intent === "NEW_CAR_ENQUIRY"
          ? fillAutomobileTemplate(tpl.salesLeadConfirmation, currentVars)
          : fillAutomobileTemplate(tpl.serviceConfirmation, currentVars);
      const finalReply = faqAnswer ? `${faqAnswer} ${summaryLine}` : summaryLine;
      return {
        finalReply,
        finalSpokenText: "",
        finalStep: "confirmation_summary",
        finalExtracted: {
          ...currentExtracted,
          name,
          mobile,
          vehicleModel: vehicle,
          registrationNumber: regNo,
          dealerLocation: dealer,
          serviceType,
          slot: resolvedSlot,
          intent,
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete: false,
        responseSource: "automobile-template",
        toneHint: "neutral",
        finalCallEnded: false,
      };
    }
  }

  // ── Interceptor 5: Direct Fast-Path Turn Advance ───────────────────────
  if (currentStep && !faqAnswer) {
    const askTemplates: Record<string, string> = {
      vehicle: tpl.askVehicle,
      regNo: tpl.askRegNumber,
      serviceType: tpl.askServiceType,
      dealer: tpl.askDealer,
      slot: tpl.askSlot,
      name: tpl.askName,
      mobile: tpl.askMobile,
    };
    const askLine = fillAutomobileTemplate(askTemplates[currentStep.id] || tpl.couldNotUnderstand, currentVars);
    return {
      finalReply: askLine,
      finalSpokenText: "",
      finalStep: `intake_${currentStep.id}`,
      finalExtracted: {
        ...currentExtracted,
        name,
        mobile,
        vehicleModel: vehicle,
        registrationNumber: regNo,
        dealerLocation: dealer,
        serviceType,
        slot: resolvedSlot,
        intent,
        summary: askLine.slice(0, 80),
      },
      finalIsComplete: false,
      responseSource: "automobile-template",
      toneHint: "neutral",
      finalCallEnded: false,
    };
  }

  // ── Step 6: Generative Turn with Structured Automobile Guidance ────────
  if (openaiKey) {
    try {
      const todayStr = nowIST.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const tomorrowIST = new Date(nowIST); tomorrowIST.setDate(tomorrowIST.getDate() + 1);
      const tomorrowStr = tomorrowIST.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const fieldStatus = [
        `- Customer Name: "${name ? name + ' (COLLECTED)' : 'NOT PROVIDED'}"`,
        `- Mobile: "${mobile ? mobile + ' (COLLECTED)' : 'NOT PROVIDED'}"`,
        `- Vehicle Model: "${vehicle ? vehicle + ' (COLLECTED)' : 'NOT PROVIDED'}"`,
        `- Registration Number: "${regNo ? regNo + ' (COLLECTED)' : 'NOT PROVIDED'}"`,
        `- Dealership: "${dealer ? dealer + ' (COLLECTED)' : 'NOT PROVIDED'}"`,
        `- Service Type / Intent: "${serviceType || intent}"`,
        `- Preferred Slot: "${resolvedSlot || 'NOT PROVIDED'}"`,
      ].join("\n");

      const systemPrompt = `You are the expert AI Voice & Chat Receptionist for "${AUTOMOBILE_BRAND_NAME}", a premier multi-brand automotive dealership & authorized service network.
Your goal is to handle new car sales inquiries, test drives, periodic services, repair issues, and owner support with polite, natural Indian conversational professionalism.

## VERIFIED VEHICLE CATALOG (DO NOT INVENT CAR SPECS OUTSIDE THIS):
- Hyundai Creta (SUV, ₹11.0 - ₹20.15 Lakh, Petrol/Diesel, Manual/Automatic, 17-21 km/l, Panoramic Sunroof, ADAS)
- Tata Nexon (Compact SUV, ₹8.0 - ₹15.8 Lakh, Petrol/Diesel/CNG, 5-Star NCAP, 360 Camera)
- Tata Nexon EV (Electric SUV, ₹14.49 - ₹19.49 Lakh, 465 km single-charge range)
- Maruti Brezza (Compact SUV, ₹8.34 - ₹14.14 Lakh, Petrol/CNG, 19.8-25.5 km/l, Sunroof, HUD)
- Mahindra XUV700 (7-Seater Luxury SUV, ₹13.99 - ₹26.99 Lakh, ADAS, Panoramic Skyroof, AWD)
- Mahindra Thar (4x4 Offroad SUV, ₹11.35 - ₹17.6 Lakh, Hardtop/Soft-top)
- Honda City (Executive Sedan, ₹11.82 - ₹16.35 Lakh, 1.5L i-VTEC, ADAS)
- Maruti Swift (Hatchback, ₹6.49 - ₹9.6 Lakh, 25.75 km/l high mileage)

## DEALERSHIPS & SERVICE CENTERS:
- Gurgaon: Golf Course Road (Showroom & Service Workshop, Mon-Sat 9:30 AM - 7:30 PM)
- Noida: Sector 63 (Showroom & Service Workshop, Mon-Sat 9:30 AM - 7:30 PM)
- South Delhi: Okhla Phase 3 (Showroom & Workshop, Mon-Sat 9:00 AM - 7:00 PM)
- West Delhi: Moti Nagar (Express Workshop, Mon-Sat 9:00 AM - 6:30 PM)
- Sunday Closed for all service centers. Emergency 24/7 Roadside Hotline: 1800-102-9999.

## REAL-TIME CALENDAR:
- TODAY is: ${todayStr}
- TOMORROW is: ${tomorrowStr}

## CURRENT INTAKE STATUS:
${fieldStatus}

## INSTRUCTIONS:
- Detected Language: ${detectedLang}
- Keep spoken response to MAX 20 WORDS. Concise, warm, natural spoken sentence.
- Never invent vehicle prices, delivery dates, or loan approval numbers.
- Answer user query naturally, then smoothly ask for the next missing field.

## JSON RESPONSE SCHEMA (Reply ONLY in this JSON):
{
  "reply": "Max 20-word spoken sentence in user's language",
  "spokenDevanagari": "Only for Hindi — write in natural Devanagari script for studio voice; blank for other languages",
  "languageCode": "${detectedLang}",
  "step": "intake_vehicle | intake_service | intake_dealer | intake_slot | confirmation_summary | confirmation_complete | emergency_roadside",
  "extracted": {
    "name": "",
    "mobile": "",
    "vehicleModel": "",
    "registrationNumber": "",
    "dealerLocation": "",
    "serviceType": "",
    "slot": ""
  },
  "isComplete": false
}`;

      const openaiMessages: { role: "user" | "assistant"; content: string }[] = [];
      for (const msg of messages) {
        openaiMessages.push({
          role: msg.speaker === "ai" ? "assistant" : "user",
          content: msg.text || "",
        });
      }
      if (openaiMessages.length === 0 || openaiMessages[openaiMessages.length - 1].role !== "user") {
        openaiMessages.push({ role: "user", content: userMessage });
      } else {
        openaiMessages[openaiMessages.length - 1].content = userMessage;
      }

      let parsed: Record<string, any>;
      if (onEarlyReplyText) {
        try {
          parsed = await callOpenAIStreaming(systemPrompt, openaiMessages, openaiKey, (replyText) => {
            onEarlyReplyText(replyText, detectedLang);
          });
        } catch {
          parsed = await callOpenAI(systemPrompt, openaiMessages, openaiKey);
        }
      } else {
        parsed = await callOpenAI(systemPrompt, openaiMessages, openaiKey);
      }

      const finalReply = parsed.reply || "";
      const finalSpokenText = parsed.spokenDevanagari || "";
      let finalIsComplete = parsed.isComplete || false;

      // Extract sanitized fields
      const resName = sanitizeLlmField(parsed.extracted?.name) || name;
      const resMobile = sanitizeLlmField(parsed.extracted?.mobile) || mobile;
      const resVehicle = sanitizeLlmField(parsed.extracted?.vehicleModel) || vehicle;
      const resRegNo = sanitizeLlmField(parsed.extracted?.registrationNumber) || regNo;
      const resDealer = sanitizeLlmField(parsed.extracted?.dealerLocation) || dealer;
      const resSlot = sanitizeLlmField(parsed.extracted?.slot) || resolvedSlot;

      // Deterministic validation gate
      if (finalIsComplete) {
        const genuinelyComplete = isAutomobileActionGenuinelyComplete(
          intent,
          { name: resName, mobile: resMobile, vehicleModel: resVehicle, registrationNumber: resRegNo, dealerLocation: resDealer, slot: resSlot },
          nowIST
        );
        if (!genuinelyComplete) {
          finalIsComplete = false;
        }
      }

      const generatedId = finalIsComplete ? generateAutomobileActionId(intent) : null;

      return {
        finalReply,
        finalSpokenText,
        finalStep: parsed.step || "intake_vehicle",
        finalExtracted: {
          ...currentExtracted,
          name: resName,
          mobile: resMobile,
          vehicleModel: resVehicle,
          registrationNumber: resRegNo,
          dealerLocation: resDealer,
          slot: resSlot,
          intent,
          appointment_id: generatedId || currentExtracted.appointment_id || "",
          confirmed: finalIsComplete,
          appointment_status: finalIsComplete ? "CONFIRMED" : "IN_PROGRESS",
          summary: finalReply.slice(0, 80),
        },
        finalIsComplete,
        responseSource: "openai-automobile-gpt4o-mini",
        toneHint: finalIsComplete ? "confirmed" : "neutral",
        finalCallEnded: false,
      };
    } catch (llmErr) {
      console.warn("[Automobile LLM fallback]:", llmErr);
    }
  }

  // Fallback if LLM unavailable
  const fallbackId = generateAutomobileActionId(intent);
  const fallbackReply = isHindi
    ? `धन्यवाद! आपकी ${vehicle || "गाड़ी"} की सेवा के लिए ${AUTOMOBILE_BRAND_NAME} की टीम आपसे जल्द संपर्क करेगी।`
    : `Thank you! Our ${AUTOMOBILE_BRAND_NAME} representative will connect with you shortly for your ${vehicle || "vehicle"} request.`;

  return {
    finalReply: fallbackReply,
    finalSpokenText: "",
    finalStep: "inquiry_resolution",
    finalExtracted: {
      ...currentExtracted,
      name,
      mobile,
      vehicleModel: vehicle,
      registrationNumber: regNo,
      dealerLocation: dealer,
      serviceType,
      slot: resolvedSlot,
      intent,
      summary: fallbackReply.slice(0, 80),
    },
    finalIsComplete: false,
    responseSource: "automobile-deterministic-fallback",
    toneHint: "neutral",
    finalCallEnded: false,
  };
}
