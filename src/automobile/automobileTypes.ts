export type AutomobileIntent =
  | "NEW_CAR_ENQUIRY"
  | "TEST_DRIVE"
  | "SERVICE_BOOKING"
  | "PERIODIC_SERVICE"
  | "REPAIR_REQUEST"
  | "SERVICE_STATUS"
  | "SERVICE_DUE_ENQUIRY"
  | "SERVICE_ESTIMATE"
  | "PICKUP_DROP_REQUEST"
  | "ROADSIDE_ASSISTANCE"
  | "ACCIDENT_ASSISTANCE"
  | "USED_CAR_BUY"
  | "USED_CAR_SELL"
  | "FINANCE_ENQUIRY"
  | "INSURANCE_ENQUIRY"
  | "DEALER_INQUIRY"
  | "HUMAN_HANDOFF"
  | "GENERAL_INQUIRY";

export type AutomobileLang =
  | "en-IN"
  | "hi-IN"
  | "ta-IN"
  | "te-IN"
  | "bn-IN"
  | "ml-IN"
  | "kn-IN"
  | "pa-IN"
  | "gu-IN"
  | "or-IN";

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  bodyType: "SUV" | "Compact SUV" | "Sedan" | "Hatchback" | "EV" | "MPV";
  priceMinLakh: number;
  priceMaxLakh: number;
  fuelTypes: ("Petrol" | "Diesel" | "CNG" | "Electric")[];
  transmissionTypes: ("Manual" | "Automatic" | "AMT" | "CVT" | "DCT")[];
  seatingCapacity: number;
  keyFeatures: string[];
  mileageOrRange: string;
  availableColors: string[];
  warranty: string;
  testDriveAvailable: boolean;
  bookingAvailable: boolean;
}

export interface DealershipCenter {
  id: string;
  name: string;
  city: string;
  location: string;
  address: string;
  phone: string;
  hasShowroom: boolean;
  hasServiceCenter: boolean;
  openDays: number[]; // 0=Sun, 1=Mon .. 6=Sat
  openHour: number;   // 24hr format, e.g. 9
  closeHour: number;  // 24hr format, e.g. 19
  testDriveSlots: string[];
  serviceSlots: string[];
}

export interface AutomobileServiceBooking {
  bookingId?: string;
  customerName?: string;
  customerMobile?: string;
  registrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVariant?: string;
  fuelType?: string;
  serviceType?: string;
  issueDescription?: string;
  dealerId?: string;
  dealerName?: string;
  dealerLocation?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  pickupDropRequired?: boolean;
  pickupAddress?: string;
  priority?: "normal" | "urgent" | "emergency";
  confirmed?: boolean;
  status?: "PENDING" | "CONFIRMED" | "EMERGENCY_ROADSIDE" | "CANCELLED";
  source?: "voice" | "chat";
  createdAt?: string;
}

export interface AutomobileLead {
  leadId?: string;
  customerName?: string;
  customerMobile?: string;
  intent: AutomobileIntent;
  vehicleModel?: string;
  variant?: string;
  budget?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  purchaseTimeline?: string;
  dealerId?: string;
  dealerName?: string;
  testDriveDate?: string;
  testDriveTime?: string;
  financeRequired?: boolean;
  exchangeRequired?: boolean;
  currentVehicle?: string;
  confirmed?: boolean;
  referenceId?: string;
  summary?: string;
}

export interface AutomobileTemplateBank {
  greeting: string;
  askName: string;
  askMobile: string;
  askVehicle: string;
  askRegNumber: string;
  askServiceType: string;
  askDealer: string;
  askSlot: string;
  askTime: string;
  askPurchaseTimeline: string;
  outOfHours: string;
  serviceConfirmation: string;
  testDriveConfirmation: string;
  salesLeadConfirmation: string;
  bookingConfirmed: string;
  roadsideAssistanceAlert: string;
  jobCardStatusFound: string;
  serviceEstimateProvided: string;
  humanHandoff: string;
  couldNotUnderstand: string;
  farewell: string;
  alreadyConfirmed: string;
}

export interface AutomobileKnowledgeBank {
  showroomHours: string;
  serviceCenterHours: string;
  locationDetails: string;
  testDrivePolicy: string;
  periodicServiceInfo: string;
  roadsideAssistanceContact: string;
  warrantyPolicy: string;
  financeAndEmi: string;
  insuranceRenewal: string;
}
