import { VehicleModel } from "./automobileTypes";

export const VEHICLE_CATALOG: Record<string, VehicleModel> = {
  creta: {
    id: "creta",
    brand: "Hyundai",
    model: "Creta",
    bodyType: "SUV",
    priceMinLakh: 11.0,
    priceMaxLakh: 20.15,
    fuelTypes: ["Petrol", "Diesel"],
    transmissionTypes: ["Manual", "Automatic", "DCT", "CVT"],
    seatingCapacity: 5,
    keyFeatures: [
      "Panoramic Sunroof",
      "Level 2 ADAS (19 Safety Features)",
      "Dual 10.25-inch Touchscreen & Digital Cluster",
      "Ventilated Front Seats",
      "Bose 8-Speaker Premium Sound",
    ],
    mileageOrRange: "17.4 - 21.8 km/l",
    availableColors: ["Abyss Black", "Atlas White", "Ranger Khaki", "Titan Grey", "Robust Emerald Pearl"],
    warranty: "3 Years / Unlimited km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  nexon: {
    id: "nexon",
    brand: "Tata",
    model: "Nexon",
    bodyType: "Compact SUV",
    priceMinLakh: 8.0,
    priceMaxLakh: 15.8,
    fuelTypes: ["Petrol", "Diesel", "CNG"],
    transmissionTypes: ["Manual", "AMT", "DCT"],
    seatingCapacity: 5,
    keyFeatures: [
      "5-Star Global NCAP & Bharat NCAP Safety",
      "10.25-inch Floating Touchscreen",
      "360-Degree Surround Camera",
      "Ventilated Leatherette Seats",
      "Wireless Android Auto & Apple CarPlay",
    ],
    mileageOrRange: "17.0 - 24.0 km/l",
    availableColors: ["Fearless Purple", "Creative Ocean", "Pure Grey", "Daytona Grey", "Pristine White"],
    warranty: "3 Years / 1,00,000 km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  "nexon-ev": {
    id: "nexon-ev",
    brand: "Tata",
    model: "Nexon EV",
    bodyType: "EV",
    priceMinLakh: 14.49,
    priceMaxLakh: 19.49,
    fuelTypes: ["Electric"],
    transmissionTypes: ["Automatic"],
    seatingCapacity: 5,
    keyFeatures: [
      "465 km ARAI Certified Range (Long Range 40.5 kWh)",
      "Vehicle-to-Vehicle (V2V) & V2L Charging",
      "Paddle Shifters for Multi-Mode Regenerative Braking",
      "Smart Digital Shifter with Display",
    ],
    mileageOrRange: "465 km single charge range",
    availableColors: ["Empowered Oxide", "Intensi Teal", "Pristine White", "Daytona Grey"],
    warranty: "8 Years / 1,60,000 km Battery Warranty",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  brezza: {
    id: "brezza",
    brand: "Maruti Suzuki",
    model: "Brezza",
    bodyType: "Compact SUV",
    priceMinLakh: 8.34,
    priceMaxLakh: 14.14,
    fuelTypes: ["Petrol", "CNG"],
    transmissionTypes: ["Manual", "Automatic"],
    seatingCapacity: 5,
    keyFeatures: [
      "Head-Up Display (HUD)",
      "Electric Sunroof",
      "SmartPlay Pro+ 9-inch Display",
      "Wireless Phone Charger",
      "Surround Sense Audio by Arkamys",
    ],
    mileageOrRange: "19.8 - 25.5 km/l (CNG)",
    availableColors: ["Pearl Arctic White", "Splendid Silver", "Magma Grey", "Sizzling Red", "Brave Khaki"],
    warranty: "2 Years / 40,000 km (Extendable to 5 Years)",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  xuv700: {
    id: "xuv700",
    brand: "Mahindra",
    model: "XUV700",
    bodyType: "SUV",
    priceMinLakh: 13.99,
    priceMaxLakh: 26.99,
    fuelTypes: ["Petrol", "Diesel"],
    transmissionTypes: ["Manual", "Automatic"],
    seatingCapacity: 7,
    keyFeatures: [
      "Dual 10.25-inch Superscreen Cockpit",
      "Level 2 ADAS Safety Suite",
      "Sony 12-Speaker 3D Immersive Audio",
      "Skyroof (Panoramic Sunroof)",
      "All-Wheel Drive (AWD) Option",
    ],
    mileageOrRange: "13.0 - 17.0 km/l",
    availableColors: ["Midnight Black", "Everest White", "Dazzling Silver", "Red Rage", "Electric Blue"],
    warranty: "3 Years / 1,00,000 km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  thar: {
    id: "thar",
    brand: "Mahindra",
    model: "Thar",
    bodyType: "SUV",
    priceMinLakh: 11.35,
    priceMaxLakh: 17.6,
    fuelTypes: ["Petrol", "Diesel"],
    transmissionTypes: ["Manual", "Automatic"],
    seatingCapacity: 4,
    keyFeatures: [
      "Authentic 4x4 with Shift-on-Fly Low Ratio Transfer Case",
      "Mechanical Locking Rear Differential",
      "Water-Resistant Dashboard & Draining Floor Mats",
      "Roll Cage & ESP with Rollover Mitigation",
    ],
    mileageOrRange: "12.0 - 15.2 km/l",
    availableColors: ["Napoli Black", "Red Rage", "Aquamarine", "Stealth Black", "Deep Grey"],
    warranty: "3 Years / 1,00,000 km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  city: {
    id: "city",
    brand: "Honda",
    model: "City",
    bodyType: "Sedan",
    priceMinLakh: 11.82,
    priceMaxLakh: 16.35,
    fuelTypes: ["Petrol"],
    transmissionTypes: ["Manual", "CVT"],
    seatingCapacity: 5,
    keyFeatures: [
      "Honda SENSING ADAS (Camera-based)",
      "Legendary 1.5L i-VTEC High-Revving Engine",
      "Spacious Executive Rear Legroom",
      "Electric Sunroof & LaneWatch Camera",
    ],
    mileageOrRange: "17.8 - 18.4 km/l",
    availableColors: ["Obsidian Blue Pearl", "Radiant Red", "Platinum White", "Golden Brown", "Lunar Silver"],
    warranty: "3 Years / Unlimited km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
  swift: {
    id: "swift",
    brand: "Maruti Suzuki",
    model: "Swift",
    bodyType: "Hatchback",
    priceMinLakh: 6.49,
    priceMaxLakh: 9.6,
    fuelTypes: ["Petrol", "CNG"],
    transmissionTypes: ["Manual", "AMT"],
    seatingCapacity: 5,
    keyFeatures: [
      "All-New Z-Series 1.2L 3-Cylinder Ultra-Efficient Engine",
      "6 Airbags Standard Across All Variants",
      "9-inch SmartPlay Pro+ Touchscreen",
      "Wireless Charger & Rear AC Vents",
    ],
    mileageOrRange: "24.8 - 25.75 km/l",
    availableColors: ["Luster Blue", "Novel Orange", "Sizzling Red", "Pearl Arctic White", "Magma Grey"],
    warranty: "2 Years / 40,000 km",
    testDriveAvailable: true,
    bookingAvailable: true,
  },
};

/**
 * Normalizes model names from user speech to standard catalog key
 */
export function matchVehicleModel(input: string): VehicleModel | null {
  if (!input) return null;
  const lower = input.toLowerCase();

  if (/creta|क्रेटा/i.test(lower)) return VEHICLE_CATALOG.creta;
  if (/nexon\s*ev|नेक्सन\s*ईवी/i.test(lower)) return VEHICLE_CATALOG["nexon-ev"];
  if (/nexon|नेक्सन/i.test(lower)) return VEHICLE_CATALOG.nexon;
  if (/brezza|vitara|ब्रीजा|ब्रेज़ा/i.test(lower)) return VEHICLE_CATALOG.brezza;
  if (/xuv\s*700|xuv|700|एक्सयूवी/i.test(lower)) return VEHICLE_CATALOG.xuv700;
  if (/thar|थार/i.test(lower)) return VEHICLE_CATALOG.thar;
  if (/city|honda\s*city|सिटी/i.test(lower)) return VEHICLE_CATALOG.city;
  if (/swift|स्विफ्ट/i.test(lower)) return VEHICLE_CATALOG.swift;

  return null;
}

/**
 * Recommends vehicles from catalog matching budget, body type, or fuel preferences
 */
export function recommendVehicles(criteria: {
  maxBudgetLakh?: number;
  minBudgetLakh?: number;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
}): VehicleModel[] {
  return Object.values(VEHICLE_CATALOG).filter((v) => {
    if (criteria.maxBudgetLakh && v.priceMinLakh > criteria.maxBudgetLakh) return false;
    if (criteria.minBudgetLakh && v.priceMaxLakh < criteria.minBudgetLakh) return false;
    if (criteria.bodyType && !v.bodyType.toLowerCase().includes(criteria.bodyType.toLowerCase())) return false;
    if (criteria.fuelType && !v.fuelTypes.some((f) => f.toLowerCase() === criteria.fuelType?.toLowerCase())) return false;
    if (criteria.transmission && !v.transmissionTypes.some((t) => t.toLowerCase() === criteria.transmission?.toLowerCase())) return false;
    return true;
  });
}
