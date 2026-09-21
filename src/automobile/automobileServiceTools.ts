import { DealershipCenter } from "./automobileTypes";
import { DEALERSHIP_CENTERS, DEFAULT_DEALER } from "./automobileDealerData";

export interface JobCardStatusResult {
  found: boolean;
  jobCardNumber?: string;
  registrationNumber?: string;
  vehicleModel?: string;
  stage?: "Vehicle Received" | "Inspection & Diagnostics" | "Parts Replacement" | "Washing & Detailing" | "Ready for Delivery";
  estimatedCompletion?: string;
  advisorName?: string;
  advisorContact?: string;
  message: string;
}

export interface ServiceEstimateResult {
  vehicleModel: string;
  serviceType: string;
  estimatedCostRange: string;
  includes: string[];
  disclaimer: string;
}

/**
 * Clean mock adapter for DMS / Service Job Card lookup by registration number or mobile
 */
export function getJobCardStatus(identifier: string): JobCardStatusResult {
  const cleanId = (identifier || "").replace(/\s+/g, "").toUpperCase();

  if (!cleanId || cleanId.length < 4) {
    return {
      found: false,
      message: "Please share your vehicle registration number (e.g. UP16AB1234) or registered mobile to track your active service status.",
    };
  }

  // Pre-configured mock record for instant real demo responses
  if (cleanId.includes("UP16") || cleanId.includes("DL") || cleanId.includes("98765")) {
    return {
      found: true,
      jobCardNumber: `JC-2026-${cleanId.slice(-4) || "8821"}`,
      registrationNumber: cleanId.length >= 8 ? cleanId : "UP16AB1234",
      vehicleModel: "Hyundai Creta SX (O)",
      stage: "Washing & Detailing",
      estimatedCompletion: "Today by 5:30 PM",
      advisorName: "Vikram Chauhan",
      advisorContact: "+91 98110 54321",
      message: "Your vehicle is currently in the Washing & Final Detailing bay. Estimated ready time is Today by 5:30 PM. Service Advisor Vikram Chauhan is overseeing the delivery.",
    };
  }

  return {
    found: true,
    jobCardNumber: `JC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    registrationNumber: cleanId,
    vehicleModel: "Customer Vehicle",
    stage: "Inspection & Diagnostics",
    estimatedCompletion: "Tomorrow by 2:00 PM",
    advisorName: "Amit Sharma",
    advisorContact: "+91 98110 12345",
    message: "Your vehicle has been registered under active inspection. Multi-point diagnostics are in progress.",
  };
}

/**
 * Service estimate provider with structured price tiers
 */
export function getServiceEstimate(vehicleModel: string, serviceType: string): ServiceEstimateResult {
  const isSUV = /creta|xuv|thar|nexon/i.test(vehicleModel);
  const isPeriodic = /periodic|scheduled|regular|general|normal|oil/i.test(serviceType);
  const isBrake = /brake|break/i.test(serviceType);
  const isAC = /ac|cooling|air\s*con/i.test(serviceType);

  if (isBrake) {
    return {
      vehicleModel: vehicleModel || "SUV / Sedan",
      serviceType: "Brake Pad Replacement & Rotor Skimming",
      estimatedCostRange: isSUV ? "₹3,800 - ₹5,500" : "₹2,800 - ₹4,200",
      includes: ["OEM Front Brake Pads", "Caliper Pin Greasing", "Brake Fluid Top-up", "Labour & Testing"],
      disclaimer: "Final estimate confirmed after physical caliper wear measurement at the workshop.",
    };
  }

  if (isAC) {
    return {
      vehicleModel: vehicleModel || "SUV / Sedan",
      serviceType: "Comprehensive AC Service & Disinfection",
      estimatedCostRange: "₹2,400 - ₹3,600",
      includes: ["Cabin Pollen Filter Replacement", "Evaporator Foam Disinfection", "R134a Gas Top-up", "Condenser Flush"],
      disclaimer: "Major compressor or condenser coil leakage repairs quoted separately if found during pressure test.",
    };
  }

  if (isPeriodic) {
    return {
      vehicleModel: vehicleModel || "Compact SUV",
      serviceType: "Periodic Maintenance Service (PMS)",
      estimatedCostRange: isSUV ? "₹4,800 - ₹6,800" : "₹3,500 - ₹5,200",
      includes: ["Synthetic Engine Oil (5W-30)", "Oil Filter & Air Filter", "60-Point Vehicle Health Inspection", "Tyre Rotation & Brake Cleaning"],
      disclaimer: "Includes labor and consumables; additional parts replacements subject to prior customer approval.",
    };
  }

  return {
    vehicleModel: vehicleModel || "Vehicle",
    serviceType: "General Inspection & Repair",
    estimatedCostRange: "₹950 Diagnostics + Actual Parts",
    includes: ["Complete Electronic OBD Scanning", "Suspension & Underbody Check", "Detailed Digital Health Report"],
    disclaimer: "Repair estimate shared transparently via WhatsApp post-inspection before commencing work.",
  };
}

/**
 * Returns emergency Roadside Assistance protocol
 */
export function getRoadsideAssistanceInfo(): {
  hotline: string;
  responseProtocol: string;
  safetyAdvice: string;
} {
  return {
    hotline: "1800-102-9999",
    responseProtocol: "Apex 24/7 National Roadside Patrol. GPS-enabled flatbed towing dispatched within 35-45 minutes.",
    safetyAdvice: "Turn on hazard hazard/parking blinkers, move behind the safety barrier if on highway, and do not attempt DIY repairs in active traffic.",
  };
}
