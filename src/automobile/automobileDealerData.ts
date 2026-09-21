import { DealershipCenter } from "./automobileTypes";

export const DEALERSHIP_CENTERS: Record<string, DealershipCenter> = {
  gurgaon: {
    id: "gurgaon",
    name: "Apex Auto World — Gurgaon",
    city: "Gurgaon",
    location: "Golf Course Road",
    address: "Plot 42, Sector 54, Golf Course Road, Gurgaon, Haryana 122002",
    phone: "+91 124 489 0000",
    hasShowroom: true,
    hasServiceCenter: true,
    openDays: [1, 2, 3, 4, 5, 6], // Mon-Sat, Sunday closed
    openHour: 9,                  // 9:30 AM
    closeHour: 19,                // 7:30 PM
    testDriveSlots: ["10:30 AM", "12:00 PM", "2:30 PM", "4:30 PM", "6:00 PM"],
    serviceSlots: ["9:30 AM", "11:00 AM", "12:30 PM", "2:00 PM", "3:30 PM", "5:00 PM"],
  },
  noida: {
    id: "noida",
    name: "Apex Auto Hub — Noida",
    city: "Noida",
    location: "Sector 63",
    address: "A-18, Sector 63, Near Electronic City Metro, Noida, UP 201301",
    phone: "+91 120 498 0000",
    hasShowroom: true,
    hasServiceCenter: true,
    openDays: [1, 2, 3, 4, 5, 6],
    openHour: 9,
    closeHour: 19,
    testDriveSlots: ["10:00 AM", "11:30 AM", "2:00 PM", "4:00 PM", "5:30 PM"],
    serviceSlots: ["9:30 AM", "11:00 AM", "1:00 PM", "2:30 PM", "4:00 PM"],
  },
  south_delhi: {
    id: "south_delhi",
    name: "Apex Motors — South Delhi",
    city: "Delhi",
    location: "Okhla Phase 3",
    address: "B-22, Okhla Industrial Area Phase 3, New Delhi 110020",
    phone: "+91 11 4100 0000",
    hasShowroom: true,
    hasServiceCenter: true,
    openDays: [1, 2, 3, 4, 5, 6],
    openHour: 9,
    closeHour: 19,
    testDriveSlots: ["10:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"],
    serviceSlots: ["9:30 AM", "11:00 AM", "12:30 PM", "2:00 PM", "4:00 PM"],
  },
  west_delhi: {
    id: "west_delhi",
    name: "Apex Express Workshop — West Delhi",
    city: "Delhi",
    location: "Moti Nagar",
    address: "C-14, Rama Road, Moti Nagar Industrial Area, New Delhi 110015",
    phone: "+91 11 4200 0000",
    hasShowroom: false,
    hasServiceCenter: true,
    openDays: [1, 2, 3, 4, 5, 6],
    openHour: 9,
    closeHour: 18,
    testDriveSlots: [],
    serviceSlots: ["9:30 AM", "11:00 AM", "1:00 PM", "3:00 PM", "4:30 PM"],
  },
};

export const DEFAULT_DEALER = DEALERSHIP_CENTERS.gurgaon;

export function matchDealership(input: string): DealershipCenter | null {
  if (!input) return null;
  const lower = input.toLowerCase();

  if (/gurgaon|gurugram|golf\s*course|गुड़गांव|गुरुग्राम/i.test(lower)) return DEALERSHIP_CENTERS.gurgaon;
  if (/noida|sector\s*63|नोएडा/i.test(lower)) return DEALERSHIP_CENTERS.noida;
  if (/south\s*delhi|okhla|साउथ\s*दिल्ली|ओखला/i.test(lower)) return DEALERSHIP_CENTERS.south_delhi;
  if (/west\s*delhi|moti\s*nagar|rama\s*road|वेस्ट\s*दिल्ली|मोती\s*नगर/i.test(lower)) return DEALERSHIP_CENTERS.west_delhi;
  if (/delhi|दिल्ली/i.test(lower)) return DEALERSHIP_CENTERS.south_delhi;

  return null;
}
