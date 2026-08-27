"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, useMemo, Fragment } from "react";

const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUCakByl8j40MxtKBkAqR5VT9zUbvE0-WK7Jltd47RN_MO9cIEipEXTWpW5fLQ2wqk3Q/exec";

// Toggle setting: set to true to enforce required fields in production; false to bypass for testing
const ENFORCE_REQUIRED_FIELDS = false;

const SCHOOL_SMS = "+18179735455";
const SCHOOL_EMAIL = "goswimarlsgpra@britishswimschool.com";

export const LOCATION_DAYS: Record<string, string[]> = {
  arlington: ["Tuesday", "Friday"],
  mansfield: ["Thursday", "Friday", "Saturday"],
  grandPrairie: ["Monday", "Wednesday", "Saturday"]
};

export const LOCATION_SCHEDULES: Record<string, { day: string; hours: string }[]> = {
  arlington: [
    { day: "Tuesday", hours: "4:00 PM – 8:00 PM" },
    { day: "Friday", hours: "4:00 PM – 8:00 PM" }
  ],
  mansfield: [
    { day: "Thursday", hours: "4:00 PM – 8:00 PM" },
    { day: "Friday", hours: "4:00 PM – 8:00 PM" },
    { day: "Saturday", hours: "8:30 AM – 1:00 PM" }
  ],
  grandPrairie: [
    { day: "Monday", hours: "4:00 PM – 8:00 PM" },
    { day: "Wednesday", hours: "4:00 PM – 8:00 PM" },
    { day: "Saturday", hours: "8:30 AM – 1:00 PM" }
  ]
};

interface JackrabbitClass {
  id: number;
  name: string;
  category1: string;
  category2: string;
  category3: string;
  location_code: string;
  location_name?: string;
  location?: string;
  meeting_days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
  start_time: string;
  end_time: string;
  openings: {
    calculated_openings: number;
  };
  online_reg_link: string;
  waitlist: boolean;
  room?: string;
  instructors?: string[];
}

const AGE_GROUPS = [
  { id: "under3", label: "Under 3 years old", detail: "Parent & Me" },
  { id: "child", label: "Kids 3-12 years", detail: "Child lessons" },
  { id: "youngAdult", label: "Teens", detail: "Young Adult" },
  { id: "adult", label: "Adults", detail: "Adult lessons" },
  { id: "dolphin", label: "Adaptive/Special Needs", detail: "Dolphin" },
] as const;

const LOCATIONS = [
  { id: "arlington", name: "Arlington", detail: "LA Fitness on Little Road", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/arlington-la-fitness-little-road/" },
  { id: "mansfield", name: "Mansfield", detail: "24 Hour Fitness on Walnut Creek", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/mansfield-24-hour-fitness/" },
  { id: "grandPrairie", name: "Grand Prairie", detail: "LA Fitness on I-20", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/grand-prairie-la-fitness/" },
] as const;

type AgeGroup = typeof AGE_GROUPS[number]["id"];
type Answer = "" | "yes" | "no";
type Swimmer = {
  id: string;
  ageGroup: AgeGroup;
  firstName: string;
  dob: string;
  gender: string;
  placementMode: "" | "known" | "assessment";
  selectedLevel: string;
  adaptive: Answer;
  firstProgram: Answer;
  comfortable: Answer;
  separateCaregiver: Answer;
  waitTurn: Answer;
  floatUnassisted: Answer;
  jumpRollFloat: Answer;
  swimFreestyleBackstroke: Answer;
  faceInWater: Answer;
  swimTenYardsSideBreath: Answer;
  treadMinute: Answer;
  location: string;
  preferredSchedule: string;
  dobMessage?: string;
  pace: "foundation" | "standard" | "unlimited" | "dolphin_semi" | "dolphin_private";
};

function formatDob(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + "-" + digits.slice(3);
  return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
}

function smartFormatDob(value: string) {
  const clean = value.trim();
  if (!clean) return "";

  if (/^\d{1,2}$/.test(clean)) {
    const age = parseInt(clean, 10);
    const birthYear = new Date().getFullYear() - age;
    return "01/01/" + birthYear;
  }

  if (/^\d{4}$/.test(clean)) {
    return "01/01/" + clean;
  }

  const parts = clean.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    let [mStr, dStr, yStr] = parts;
    if (mStr.length === 4) {
      [yStr, mStr, dStr] = [mStr, dStr, yStr];
    }
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    let year = parseInt(yStr, 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) return value;

    if (year < 100) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      year += currentCentury;
      if (year > currentYear) {
        year -= 100;
      }
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const yyyy = String(year);
    return mm + "/" + dd + "/" + yyyy;
  }

  return value;
}

function getAgeGroupFromDob(dobString: string): AgeGroup | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dobString);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }

  if (age < 3) return "under3";
  if (age < 13) return "child";
  if (age < 18) return "youngAdult";
  return "adult";
}

function validDob(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return month >= 1 && month <= 12 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date <= new Date();
}

const BEGINNER_LEVELS = ["Tadpole", "Starfish", "Young Adult 1", "Adult 1"];

function getRatio(level: string): string | null {
  const match = (level || "").match(/\b(\d+:\d+)\b/);
  return match ? match[1] : null;
}

function getLevelDisplay(level: string) {
  if (BEGINNER_LEVELS.includes(level)) {
    return level + " (Beginners)";
  }
  return level;
}

const LEVELS: Record<AgeGroup, string[]> = {
  under3: ["Tadpole 6:1", "Swimboree 4:1", "Seahorse 4:1", "Dolphin"],
  child: ["Starfish 4:1", "Minnow 4:1", "Turtle 1 4:1", "Turtle 2 6:1", "Shark 1", "Shark 2", "Barracuda", "Dolphin"],
  youngAdult: ["Young Adult 1", "Young Adult 2", "Young Adult 3", "Dolphin"],
  adult: ["Adult 1", "Adult 2", "Adult 3", "Dolphin"],
  dolphin: ["Dolphin"]
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  "Tadpole 6:1": "Parent & Me water acclimation and gentle submersions.",
  "Swimboree 4:1": "Building water trust, back floating, and independent paddle.",
  "Seahorse 4:1": "Independent survival floating and rollovers in the water.",
  "Starfish 4:1": "Building water confidence, breath control, and independent back float.",
  "Minnow 4:1": "Independent back float, survival rollover, and beginner safety skills.",
  "Turtle 1 4:1": "Streamlined push-glides, backstroke kick, and survival rollovers.",
  "Turtle 2 6:1": "Propulsion development, freestyle arm recovery, and side breathing.",
  "Shark 1": "Refined freestyle, backstroke, and introduction to breaststroke.",
  "Shark 2": "Butterfly introduction, endurance, and flip turns.",
  "Barracuda": "Advanced four-stroke mastery and pre-swim team conditioning.",
  "Young Adult 1": "Teen water safety, breath control, and unassisted floating.",
  "Young Adult 2": "Teen stroke development and freestyle endurance.",
  "Young Adult 3": "Advanced teen stroke mastery and conditioning.",
  "Adult 1": "Adult water comfort, floating, and breath management.",
  "Adult 2": "Adult stroke mechanics, rhythmic breathing, and endurance.",
  "Adult 3": "Advanced adult technique, multi-stroke proficiency, and fitness.",
  "Dolphin": "Personalized adaptive lessons tailored to special needs."
};

interface QuestionDef {
  key: keyof Swimmer;
  text: string;
  stepNum: number;
  totalSteps: number;
}

function isUnder24Months(swimmer: Swimmer): boolean {
  if (swimmer.dob && validDob(swimmer.dob)) {
    const [m, d, y] = swimmer.dob.split("/").map(Number);
    const birth = new Date(y, m - 1, d);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;
    return months < 24;
  }
  return false;
}

function getNextQuestion(swimmer: Swimmer): QuestionDef | null {
  if (swimmer.ageGroup === "dolphin") return null;

  const under24m = isUnder24Months(swimmer);
  const rawName = swimmer.firstName ? swimmer.firstName.trim() : "";
  const name = rawName || "the swimmer";
  const namePossessive = rawName ? `${rawName}'s` : "the swimmer's";

  // --- Q0: Adaptive / Modified Screening Question ---
  if (!swimmer.adaptive) {
    const total = swimmer.ageGroup === "child" ? 6 : (swimmer.ageGroup === "under3" ? (under24m ? 3 : 5) : 5);
    return {
      key: "adaptive",
      text: `Does ${name} need a modified or adaptive lesson?`,
      stepNum: 1,
      totalSteps: total
    };
  }
  if (swimmer.adaptive === "yes") return null; // -> Dolphin (Requests Private or Semi-Private)

  // --- Child (3-24 Months) Workflow ---
  if (swimmer.ageGroup === "under3" && under24m) {
    if (!swimmer.firstProgram) {
      return {
        key: "firstProgram",
        text: `Is this ${namePossessive} first time in swim lessons?`,
        stepNum: 2,
        totalSteps: 3
      };
    }
    if (!swimmer.comfortable) {
      return {
        key: "comfortable",
        text: `Is ${name} comfortable in the water and can they fully submerge their head?`,
        stepNum: 3,
        totalSteps: 3
      };
    }
    return null; // NO -> Tadpole 6:1, YES -> Swimboree 4:1
  }

  // --- Child (24-36 Months) Workflow ---
  if (swimmer.ageGroup === "under3") {
    if (!swimmer.firstProgram) {
      return {
        key: "firstProgram",
        text: `Is this ${namePossessive} first time in swim lessons?`,
        stepNum: 2,
        totalSteps: 5
      };
    }
    if (swimmer.firstProgram === "yes") return null; // -> Tadpole 6:1

    if (!swimmer.comfortable) {
      return {
        key: "comfortable",
        text: `Is ${name} comfortable in the water and can they fully submerge their head?`,
        stepNum: 3,
        totalSteps: 5
      };
    }
    if (swimmer.comfortable === "no") return null; // -> Tadpole 6:1

    if (!swimmer.separateCaregiver) {
      return {
        key: "separateCaregiver",
        text: `Can ${name} separate from parent/caregiver and work directly with our instructors?`,
        stepNum: 4,
        totalSteps: 5
      };
    }
    if (swimmer.separateCaregiver === "no") return null; // -> Swimboree 4:1

    if (!swimmer.waitTurn) {
      return {
        key: "waitTurn",
        text: `Can ${name} sit on the edge of the pool and wait independently for their turn?`,
        stepNum: 5,
        totalSteps: 5
      };
    }
    return null; // NO -> Swimboree 4:1, YES -> Seahorse 4:1
  }

  // --- Child (3-12 Years) Workflow ---
  if (swimmer.ageGroup === "child") {
    if (!swimmer.firstProgram) {
      return {
        key: "firstProgram",
        text: `Is this ${namePossessive} first time in swim lessons?`,
        stepNum: 2,
        totalSteps: 6
      };
    }
    if (swimmer.firstProgram === "yes") return null; // -> Starfish 4:1

    if (!swimmer.comfortable) {
      return {
        key: "comfortable",
        text: `Is ${name} comfortable in the water and fully able to submerge their head?`,
        stepNum: 3,
        totalSteps: 6
      };
    }
    if (swimmer.comfortable === "no") return null; // -> Starfish 4:1

    if (!swimmer.floatUnassisted) {
      return {
        key: "floatUnassisted",
        text: `Is ${name} able to float on their back unassisted without a life vest?`,
        stepNum: 4,
        totalSteps: 6
      };
    }
    if (swimmer.floatUnassisted === "no") return null; // -> Starfish 4:1

    if (!swimmer.jumpRollFloat) {
      return {
        key: "jumpRollFloat",
        text: `Is ${name} able to jump in, roll over and float without assistance?`,
        stepNum: 5,
        totalSteps: 6
      };
    }
    if (swimmer.jumpRollFloat === "no") return null; // -> Minnow 4:1

    if (!swimmer.swimFreestyleBackstroke) {
      return {
        key: "swimFreestyleBackstroke",
        text: `Can ${name} swim freestyle and backstroke with their arms out of the water?`,
        stepNum: 6,
        totalSteps: 6
      };
    }
    return null; // NO -> Turtle 1 4:1, YES -> Turtle 2 6:1
  }

  // --- Young Adult (13-17) Workflow ---
  if (swimmer.ageGroup === "youngAdult") {
    if (!swimmer.firstProgram) {
      return {
        key: "firstProgram",
        text: `Is this ${namePossessive} first time in swim lessons?`,
        stepNum: 2,
        totalSteps: 5
      };
    }
    if (swimmer.firstProgram === "yes") return null; // -> Young Adult 1

    if (!swimmer.comfortable) {
      return {
        key: "comfortable",
        text: `Is ${name} comfortable in the water and can they float on their back by themselves?`,
        stepNum: 3,
        totalSteps: 5
      };
    }
    if (swimmer.comfortable === "no") return null; // -> Young Adult 1

    if (!swimmer.faceInWater) {
      return {
        key: "faceInWater",
        text: `Can ${name} put their face in the water and hold their breath?`,
        stepNum: 4,
        totalSteps: 5
      };
    }
    if (swimmer.faceInWater === "no") return null; // -> Young Adult 1

    if (!swimmer.swimTenYardsSideBreath) {
      return {
        key: "swimTenYardsSideBreath",
        text: `Can ${name} swim 10 yards of freestyle and backstroke with their face in the water and utilizing a side breath?`,
        stepNum: 5,
        totalSteps: 5
      };
    }
    return null; // NO -> Young Adult 2, YES -> Young Adult 3
  }

  // --- Adult (18+) Workflow ---
  if (swimmer.ageGroup === "adult") {
    if (!swimmer.firstProgram) {
      return {
        key: "firstProgram",
        text: rawName ? `Has ${rawName} had structured swim lessons before?` : "Have you had swim lessons before?",
        stepNum: 2,
        totalSteps: 5
      };
    }
    if (swimmer.firstProgram === "no") return null; // If NO (first time) -> Adult 1

    if (!swimmer.floatUnassisted) {
      return {
        key: "floatUnassisted",
        text: rawName ? `Can ${rawName} float on their back for 20 seconds?` : "Can you float on your back by yourself for 20 seconds?",
        stepNum: 3,
        totalSteps: 5
      };
    }
    if (swimmer.floatUnassisted === "no") return null; // -> Adult 1

    if (!swimmer.treadMinute) {
      return {
        key: "treadMinute",
        text: rawName ? `Can ${rawName} tread water for 1 minute?` : "Can you tread water for 1 minute?",
        stepNum: 4,
        totalSteps: 5
      };
    }
    if (swimmer.treadMinute === "no") return null; // -> Adult 2

    if (!swimmer.swimFreestyleBackstroke) {
      return {
        key: "swimFreestyleBackstroke",
        text: rawName ? `Can ${rawName} swim freestyle and backstroke with arms out of the water?` : "Can you swim the freestyle and backstroke with your arms out of the water?",
        stepNum: 5,
        totalSteps: 5
      };
    }
    return null; // NO -> Adult 2, YES -> Adult 3
  }

  return null;
}

function startingLevel(swimmer: Swimmer): string {
  if (swimmer.placementMode === "known" && swimmer.selectedLevel) {
    return swimmer.selectedLevel;
  }
  if (swimmer.adaptive === "yes" || swimmer.ageGroup === "dolphin") return "Dolphin";

  const under24m = isUnder24Months(swimmer);

  // Child (3-24 Months)
  if (swimmer.ageGroup === "under3" && under24m) {
    if (swimmer.comfortable === "no") return "Tadpole 6:1";
    if (swimmer.comfortable === "yes") return "Swimboree 4:1";
    return "";
  }

  // Child (24-36 Months)
  if (swimmer.ageGroup === "under3") {
    if (swimmer.firstProgram === "yes") return "Tadpole 6:1";
    if (swimmer.comfortable === "no") return "Tadpole 6:1";
    if (swimmer.separateCaregiver === "no") return "Swimboree 4:1";
    if (swimmer.waitTurn === "no") return "Swimboree 4:1";
    if (swimmer.waitTurn === "yes") return "Seahorse 4:1";
    return "";
  }

  // Child (3-12 Years)
  if (swimmer.ageGroup === "child") {
    if (swimmer.firstProgram === "yes") return "Starfish 4:1";
    if (swimmer.comfortable === "no") return "Starfish 4:1";
    if (swimmer.floatUnassisted === "no") return "Starfish 4:1";
    if (swimmer.jumpRollFloat === "no") return "Minnow 4:1";
    if (swimmer.swimFreestyleBackstroke === "no") return "Turtle 1 4:1";
    if (swimmer.swimFreestyleBackstroke === "yes") return "Turtle 2 6:1";
    return "";
  }

  // Young Adult (13-17 Years)
  if (swimmer.ageGroup === "youngAdult") {
    if (swimmer.firstProgram === "yes") return "Young Adult 1";
    if (swimmer.comfortable === "no") return "Young Adult 1";
    if (swimmer.faceInWater === "no") return "Young Adult 1";
    if (swimmer.swimTenYardsSideBreath === "no") return "Young Adult 2";
    if (swimmer.swimTenYardsSideBreath === "yes") return "Young Adult 3";
    return "";
  }

  // Adult (18+ Years)
  if (swimmer.ageGroup === "adult") {
    if (swimmer.firstProgram === "no") return "Adult 1";
    if (swimmer.floatUnassisted === "no") return "Adult 1";
    if (swimmer.treadMinute === "no") return "Adult 2";
    if (swimmer.swimFreestyleBackstroke === "no") return "Adult 2";
    if (swimmer.swimFreestyleBackstroke === "yes") return "Adult 3";
    return "";
  }

  return "";
}

function isPlacementComplete(swimmer: Swimmer): boolean {
  if (swimmer.ageGroup === "dolphin") return true;
  if (swimmer.placementMode === "known") return !!swimmer.selectedLevel;
  return getNextQuestion(swimmer) === null && !!startingLevel(swimmer);
}

interface SwimmerPricing {
  swimmerId: string;
  name: string;
  ageGroup: AgeGroup;
  pace: "foundation" | "standard" | "unlimited" | "dolphin_semi" | "dolphin_private";
  baseRate: number;
  class1Base: number;
  class2Base: number;
  class2BundleDiscount: number;
  class2BundledRate: number;
  unlimitedAddonRate: number;
  class1Final: number;
  class2Final: number;
  unlimitedAddonFinal: number;
  siblingDiscount: number;
  finalRate: number;
  registrationFee: number;
  isPrimary: boolean;
  registrationDiscount: number;
}

function calculatePricing(swimmersList: { id: string; firstName: string; ageGroup: AgeGroup; pace: Swimmer["pace"] }[]) {
  const rates = swimmersList.map(s => {
    let baseRate = 0;
    const pace = s.pace || "foundation";
    let class1Base = 0;
    let class2Base = 0;
    let class2BundleDiscount = 0;
    let class2BundledRate = 0;
    let unlimitedAddonRate = 0;
    
    if (s.ageGroup === "dolphin") {
      if (pace === "dolphin_private") {
        baseRate = 499.99;
        class1Base = 499.99;
        class2Base = 0;
        class2BundledRate = 0;
        class2BundleDiscount = 0;
        unlimitedAddonRate = 0;
      } else {
        baseRate = 249.99;
        class1Base = 249.99;
        class2Base = 0;
        class2BundledRate = 0;
        class2BundleDiscount = 0;
        unlimitedAddonRate = 0;
      }
    } else {
      let foundationRate = 139.99;
      let standardRate = 249.99;
      let unlimitedRate = 449.99;

      if (s.ageGroup === "under3") {
        foundationRate = 114.99;
        standardRate = 199.99;
        unlimitedRate = 399.99;
      } else if (s.ageGroup === "adult") {
        foundationRate = 159.99;
        standardRate = 299.99;
        unlimitedRate = 499.99;
      }

      if (pace === "standard") {
        baseRate = standardRate;
        class1Base = foundationRate;
        class2Base = foundationRate; // Original 1-class rate
        class2BundledRate = parseFloat((standardRate - foundationRate).toFixed(2));
        class2BundleDiscount = parseFloat((foundationRate - class2BundledRate).toFixed(2));
        unlimitedAddonRate = 0;
      } else if (pace === "unlimited") {
        baseRate = unlimitedRate;
        class1Base = foundationRate;
        class2Base = foundationRate; // Standard 2x/wk class rate
        class2BundledRate = parseFloat((standardRate - foundationRate).toFixed(2));
        class2BundleDiscount = parseFloat((foundationRate - class2BundledRate).toFixed(2));
        unlimitedAddonRate = parseFloat((unlimitedRate - standardRate).toFixed(2)); // Difference between Unlimited and 2x/wk ($200.00)
      } else {
        baseRate = foundationRate;
        class1Base = foundationRate;
        class2Base = 0;
        class2BundledRate = 0;
        class2BundleDiscount = 0;
        unlimitedAddonRate = 0;
      }
    }

    return {
      swimmerId: s.id,
      name: s.firstName || "Swimmer",
      ageGroup: s.ageGroup,
      pace: pace as Swimmer["pace"],
      baseRate,
      class1Base,
      class2Base,
      class2BundleDiscount,
      class2BundledRate,
      unlimitedAddonRate,
      class1Final: class1Base,
      class2Final: class2BundledRate,
      unlimitedAddonFinal: unlimitedAddonRate,
      siblingDiscount: 0,
      finalRate: baseRate,
      registrationFee: 49.99,
      registrationDiscount: 0,
      isPrimary: false
    };
  });

  const sorted = [...rates].sort((a, b) => b.baseRate - a.baseRate);

  sorted.forEach((item, idx) => {
    if (idx === 0) {
      item.isPrimary = true;
    } else {
      // 10% sibling discount
      item.siblingDiscount = parseFloat((item.baseRate * 0.10).toFixed(2));
      item.finalRate = parseFloat((item.baseRate - item.siblingDiscount).toFixed(2));
      
      // Breakdown rates sibling discount
      item.class1Final = parseFloat((item.class1Base * 0.90).toFixed(2));
      if (item.class2BundledRate > 0) {
        item.class2Final = parseFloat((item.class2BundledRate * 0.90).toFixed(2));
      }
      if (item.unlimitedAddonRate > 0) {
        item.unlimitedAddonFinal = parseFloat((item.unlimitedAddonRate * 0.90).toFixed(2));
      }
    }
  });

  let accumulatedEnrollmentFee = 0;
  const individualFee = 49.99;
  const familyMax = 59.99;

  sorted.forEach(item => {
    const remainingCap = Math.max(0, familyMax - accumulatedEnrollmentFee);
    const fee = Math.min(individualFee, remainingCap);
    item.registrationFee = fee;
    item.registrationDiscount = parseFloat((individualFee - fee).toFixed(2));
    accumulatedEnrollmentFee += fee;
  });

  const totalTuition = sorted.reduce((sum, item) => sum + item.finalRate, 0);
  const totalRegistrationFees = sorted.reduce((sum, item) => sum + item.registrationFee, 0);
  const firstMonthTotal = totalTuition + totalRegistrationFees;

  const items = swimmersList.map(s => sorted.find(item => item.swimmerId === s.id)!);

  return {
    items,
    totalTuition,
    totalRegistrationFees,
    firstMonthTotal
  };
}

function matchClassLevel(classObj: JackrabbitClass, swimmerLevel: string): boolean {
  const cat1 = (classObj.category1 || "").toLowerCase();
  const name = (classObj.name || "").toLowerCase();
  const baseTarget = (swimmerLevel || "").toLowerCase().replace(/\s*\d+:\d+$/, "").trim();

  if (!baseTarget) return true;

  if (cat1.includes(baseTarget) || name.includes(baseTarget)) return true;

  if (baseTarget.startsWith("turtle 1") && (cat1.includes("turtle 1") || name.includes("turtle 1") || cat1.includes("turtle1") || name.includes("turtle1"))) return true;
  if (baseTarget.startsWith("turtle 2") && (cat1.includes("turtle 2") || name.includes("turtle 2") || cat1.includes("turtle2") || name.includes("turtle2"))) return true;
  if (baseTarget.startsWith("shark 1") && (cat1.includes("shark 1") || name.includes("shark 1") || cat1.includes("shark1") || name.includes("shark1"))) return true;
  if (baseTarget.startsWith("shark 2") && (cat1.includes("shark 2") || name.includes("shark 2") || cat1.includes("shark2") || name.includes("shark2"))) return true;

  if (baseTarget === "adult 1" && (cat1.includes("adult level 1") || cat1.includes("adult 1") || name.includes("adult 1") || name.includes("adult level 1"))) return true;
  if (baseTarget === "adult 2" && (cat1.includes("adult level 2") || cat1.includes("adult 2") || name.includes("adult 2") || name.includes("adult level 2"))) return true;
  if (baseTarget === "adult 3" && (cat1.includes("adult level 3") || cat1.includes("adult 3") || name.includes("adult 3") || name.includes("adult level 3"))) return true;

  if (baseTarget.includes("young adult")) {
    if (baseTarget.includes("1") && (cat1.includes("young adult 1") || name.includes("young adult 1") || cat1.includes("young adult level 1"))) return true;
    if (baseTarget.includes("2") && (cat1.includes("young adult 2") || name.includes("young adult 2") || cat1.includes("young adult level 2"))) return true;
    if (baseTarget.includes("3") && (cat1.includes("young adult 3") || name.includes("young adult 3") || cat1.includes("young adult level 3"))) return true;
    if (cat1.includes("young adult") || name.includes("young adult")) return true;
  }

  if (baseTarget === "dolphin" && (cat1.includes("dolphin") || name.includes("dolphin") || cat1.includes("adaptive") || name.includes("adaptive"))) return true;

  return false;
}

function getLocationIdFromCode(classLocCode: string): string {
  const code = (classLocCode || "").toLowerCase();
  if (code === "laflitt" || code === "arl") return "arlington";
  if (code === "lafgp" || code === "gp") return "grandPrairie";
  if (code === "man24h" || code === "man") return "mansfield";
  return "";
}

function matchLocation(classLocCode: string, selectedLocs: string[]): boolean {
  const locId = getLocationIdFromCode(classLocCode);
  return Boolean(locId && selectedLocs.includes(locId));
}

function matchDaysAndLocation(classObj: JackrabbitClass, selectedLocs: string[], selectedLocDays: string[]): boolean {
  const locId = getLocationIdFromCode(classObj.location_code);
  if (!locId || !selectedLocs.includes(locId)) return false;

  // Filter selected days specific to this location
  const locDaysForThisLoc = selectedLocDays
    .filter(item => item.startsWith(locId + ":"))
    .map(item => item.split(":")[1].toLowerCase());

  // If the user selected this location but didn't restrict to specific days, match any day for this location
  if (locDaysForThisLoc.length === 0) return true;

  const m = classObj.meeting_days || {};
  const daysMap: Record<string, boolean> = {
    monday: m.mon,
    tuesday: m.tue,
    wednesday: m.wed,
    thursday: m.thu,
    friday: m.fri,
    saturday: m.sat,
    sunday: m.sun
  };

  return locDaysForThisLoc.some(d => daysMap[d]);
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, "0");
  return h + ":" + mm + " " + ampm;
}

function getInstructorName(classObj: JackrabbitClass): string {
  if (classObj.instructors && classObj.instructors.length > 0) {
    const inst = classObj.instructors.join(", ");
    return inst.toLowerCase().includes("staff") ? "Staff" : inst;
  }
  if (classObj.room && classObj.room.startsWith("_")) {
    return classObj.room.substring(1);
  }
  return "Staff";
}

function getOpeningsCount(classObj: JackrabbitClass): number {
  if (classObj.openings && typeof classObj.openings.calculated_openings === "number") {
    return classObj.openings.calculated_openings;
  }
  return 0;
}

const REFERRAL_OPTIONS = [
  "Email",
  "Event/Sponsorship",
  "Google/Search",
  "Mail Advertising",
  "News/Press",
  "Other Online Source",
  "Rackcard/Flyer",
  "Referral",
  "Signage",
  "Social Media"
];

function buildEnrollmentSynopsis(
  swimmers: Swimmer[],
  quotePricing: ReturnType<typeof calculatePricing>,
  familyLocationsArray: string[],
  familySelectedLocationDays: string[],
  familyScheduleNote: string,
  referral: { source: string; friendName: string; other: string }
): string {
  const parts: string[] = [];
  parts.push(`Quote: ${swimmers.length} swimmer(s) | Tuition: $${quotePricing.totalTuition.toFixed(2)}/mo | Due Today: $${quotePricing.firstMonthTotal.toFixed(2)}`);
  
  swimmers.forEach((s, idx) => {
    const level = startingLevel(s) || (s.ageGroup === "dolphin" ? "Dolphin" : "TBD");
    const pace = s.ageGroup === "dolphin"
      ? (s.pace === "dolphin_private" ? "Private" : "Semi-Private")
      : (s.pace === "unlimited" ? "Unlimited" : (s.pace === "standard" ? "2x/wk" : "1x/wk"));
    parts.push(`S${idx + 1}: ${s.firstName || "Swimmer"} (${level}, ${pace})`);
  });

  if (familyLocationsArray.length > 0) {
    const locNames = familyLocationsArray.map(id => LOCATIONS.find(l => l.id === id)?.name.replace("British Swim School at ", "") || id).join(", ");
    parts.push(`Locs: ${locNames}`);
  }
  if (familySelectedLocationDays.length > 0) {
    const daysOnly = Array.from(new Set(familySelectedLocationDays.map(d => d.split(":")[1] || d))).join(", ");
    parts.push(`Days: ${daysOnly}`);
  }
  if (familyScheduleNote) {
    parts.push(`Notes: ${familyScheduleNote}`);
  }
  if (referral.source) {
    const ref = [referral.source, referral.friendName].filter(Boolean).join(": ");
    parts.push(`Ref: ${ref}`);
  }
  return parts.join(" | ");
}

function getPreciseRegisterUrl(
  cls: JackrabbitClass,
  level: string,
  locCode: string,
  family?: { firstName: string; lastName: string; email: string; phone: string; smsConsent: boolean },
  referral?: { source: string; friendName: string; other: string },
  primarySwimmerName?: string,
  allSwimmers?: Swimmer[],
  comments?: string
): string {
  const finalLoc = (locCode === "LAFGP" || locCode === "gp") ? "LAFGP" : ((locCode === "LAFLITT" || locCode === "arl") ? "LAFLITT" : "MAN24H");
  
  const baseUrl = "https://app.jackrabbitclass.com/reg.asp";
  const params = new URLSearchParams();
  params.set("id", "553758");
  if (cls.id && String(cls.id).length > 4) {
    params.set("preLoadClassID", String(cls.id));
  }
  params.set("loc", finalLoc);

  if (family) {
    if (family.firstName) params.set("MFName", family.firstName.trim());
    if (family.lastName) params.set("MLName", family.lastName.trim());
    if (family.email) {
      params.set("MEmail", family.email.trim());
      params.set("ConfirmMEmail", family.email.trim());
    }
    if (family.phone) params.set("MCPhone", family.phone.trim());
    params.set("MCSmsOptIn", family.smsConsent ? "Y" : "N");
  }

  if (referral && referral.source) {
    params.set("FamSource", referral.source);
    const refDetail = [referral.friendName, referral.other].filter(Boolean).join(" - ");
    if (refDetail) params.set("ReferralName", refDetail);
  }

  if (comments) {
    params.set("Comments", comments.slice(0, 450));
  }

  if (allSwimmers && allSwimmers.length > 0) {
    // Sort so the swimmer associated with this class is Swimmer 1 (S1)
    const targetSwimmer = allSwimmers.find(s => s.firstName === primarySwimmerName) || allSwimmers[0];
    const otherSwimmers = allSwimmers.filter(s => s !== targetSwimmer);
    const orderedSwimmers = [targetSwimmer, ...otherSwimmers];

    orderedSwimmers.forEach((swimmer, idx) => {
      const prefix = `S${idx + 1}`;
      if (swimmer.firstName) params.set(`${prefix}FName`, swimmer.firstName.trim());
      if (family?.lastName) params.set(`${prefix}LName`, family.lastName.trim());
      if (swimmer.gender) {
        const g = swimmer.gender.trim();
        params.set(`${prefix}Gender`, g.toLowerCase().startsWith("f") ? "Female" : (g.toLowerCase().startsWith("m") ? "Male" : g));
      }
      if (swimmer.dob) {
        params.set(`${prefix}BDate`, swimmer.dob.trim());
      }
      if (swimmer.adaptive === "yes") {
        params.set(`${prefix}SpecNeeds`, "Y");
      }
    });
  }

  return `${baseUrl}?${params.toString()}`;
}

export default function HoldForm() {
  const [leadId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("bss_hold_lead_id");
      if (stored) return stored;
      const newId = "lead_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem("bss_hold_lead_id", newId);
      return newId;
    }
    return "lead_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  });
  const [step, setStep] = useState(1);
  const [openings, setOpenings] = useState<JackrabbitClass[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(false);
  const [counts, setCounts] = useState<Record<AgeGroup, number>>({
    under3: 0,
    child: 0,
    youngAdult: 0,
    adult: 0,
    dolphin: 0
  });

  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);

  // Sync swimmers array when category counts change
  const handleCountChange = (cat: AgeGroup, delta: number) => {
    const nextCounts = { ...counts, [cat]: Math.max(0, counts[cat] + delta) };

    
    setCounts(nextCounts);

    // Rebuild swimmers array preserving existing where possible
    const nextSwimmers: Swimmer[] = [];
    let sIdx = 1;

    AGE_GROUPS.forEach(group => {
      const needed = nextCounts[group.id];
      // Try to find existing swimmers matching this category
      const existing = swimmers.filter(s => s.ageGroup === group.id);
      
      for (let i = 0; i < needed; i++) {
        if (existing[i]) {
          nextSwimmers.push({
            ...existing[i],
            id: "swimmer_" + sIdx
          });
        } else {
          nextSwimmers.push({
            id: "swimmer_" + sIdx,
            firstName: "",
            dob: "",
            gender: "",
            ageGroup: group.id,
            placementMode: "",
            selectedLevel: "",
            adaptive: group.id === "dolphin" ? "yes" : "",
            firstProgram: "",
            comfortable: "",
            separateCaregiver: "",
            waitTurn: "",
            floatUnassisted: "",
            jumpRollFloat: "",
            swimFreestyleBackstroke: "",
            faceInWater: "",
            swimTenYardsSideBreath: "",
            treadMinute: "",
            location: "",
            preferredSchedule: "",
            pace: group.id === "dolphin" ? "dolphin_semi" : "foundation"
          });
        }
        sIdx++;
      }
    });

    setSwimmers(nextSwimmers);
  };

  const [activeSwimmer, setActiveSwimmer] = useState(0);
  const [family, setFamily] = useState({ firstName: "", lastName: "", email: "", phone: "", smsConsent: true });
  const [referral, setReferral] = useState({ source: "", friendName: "", other: "" });
  const [handedOff, setHandedOff] = useState(false);
  const [composed, setComposed] = useState("");
  const [onMobile, setOnMobile] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setTimeout(() => setOnMobile(isMobile), 0);
    }
    fetch("/api/openings")
      .then((res) => res.json())
      .then((data) => {
        const classes = Array.isArray(data) ? data : (data.rows || data.classes || []);
        if (classes.length > 0) setOpenings(classes);
      })
      .catch((err) => console.error("Error preloading openings:", err));
  }, []);

  const handleDobBlur = (swimmerId: string, rawValue: string) => {
    const formatted = smartFormatDob(rawValue);
    const detectedGroup = getAgeGroupFromDob(formatted);
    const swimmer = swimmers.find((s) => s.id === swimmerId);
    if (!swimmer) return;

    const patch: Partial<Swimmer> = { dob: formatted, dobMessage: "" };

    // Dolphin is adaptive, keep dolphin category even if DOB detects something else
    if (swimmer.ageGroup !== "dolphin" && detectedGroup && detectedGroup !== swimmer.ageGroup) {
      patch.ageGroup = detectedGroup;
      const newGroupLabel = AGE_GROUPS.find((g) => g.id === detectedGroup)?.label || detectedGroup;
      patch.dobMessage = "Based on " + (swimmer.firstName || "swimmer") + "'s birth date, we changed their swim group to " + newGroupLabel + " so they see the correct lessons.";
    }

    updateSwimmer(swimmerId, patch);
  };

  const quotePricing = useMemo(() => {
    return calculatePricing(swimmers);
  }, [swimmers]);

  function logLead(text: string) {
    if (!LEAD_ENDPOINT) return;
    const payload = JSON.stringify({
      leadId,
      submittedAt: new Date().toISOString(),
      message: text,
      quotedFirstMonthTotal: quotePricing.firstMonthTotal,
      quotedOngoingTuition: quotePricing.totalTuition,
      quotedRegistrationFee: quotePricing.totalRegistrationFees,
      swimmerCount: swimmers.length,
      family,
      referral,
      swimmers: swimmers.map((swimmer) => {
        const paceLabel = swimmer.ageGroup === "dolphin"
          ? (swimmer.pace === "dolphin_private" ? "Private (1x/wk)" : "Semi-Private (1x/wk)")
          : (swimmer.pace === "unlimited" ? "Unlimited Swim" : (swimmer.pace === "standard" ? "2x per week" : "1x per week"));
        return {
          firstName: swimmer.firstName || "Swimmer",
          dob: swimmer.dob,
          gender: swimmer.gender,
          ageGroup: swimmer.ageGroup,
          estimatedLevel: startingLevel(swimmer),
          placementMode: swimmer.placementMode,
          selectedLevel: swimmer.selectedLevel,
          location: swimmer.location,
          preferredSchedule: swimmer.preferredSchedule,
          pace: swimmer.pace,
          paceLabel
        };
      }),
      quote: quotePricing
    });

    fetch(LEAD_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch((err) => console.error("Logging failed:", err));
  }

  function updateSwimmer(id: string, patch: Partial<Swimmer>) {
    setSwimmers(swimmers.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleQuestionAnswer(swimmerId: string, key: keyof Swimmer, answer: Answer) {
    const swimmer = swimmers.find(s => s.id === swimmerId);
    if (!swimmer) return;

    const patch: Partial<Swimmer> = { [key]: answer, placementMode: "assessment" };

    if (key === "adaptive") {
      patch.firstProgram = "";
      patch.comfortable = "";
      patch.separateCaregiver = "";
      patch.waitTurn = "";
      patch.floatUnassisted = "";
      patch.jumpRollFloat = "";
      patch.swimFreestyleBackstroke = "";
      patch.faceInWater = "";
      patch.swimTenYardsSideBreath = "";
      patch.treadMinute = "";
    } else if (key === "firstProgram") {
      patch.comfortable = "";
      patch.separateCaregiver = "";
      patch.waitTurn = "";
      patch.floatUnassisted = "";
      patch.jumpRollFloat = "";
      patch.swimFreestyleBackstroke = "";
      patch.faceInWater = "";
      patch.swimTenYardsSideBreath = "";
      patch.treadMinute = "";
    } else if (key === "comfortable") {
      patch.separateCaregiver = "";
      patch.waitTurn = "";
      patch.floatUnassisted = "";
      patch.jumpRollFloat = "";
      patch.swimFreestyleBackstroke = "";
      patch.faceInWater = "";
      patch.swimTenYardsSideBreath = "";
      patch.treadMinute = "";
    } else if (key === "separateCaregiver") {
      patch.waitTurn = "";
    } else if (key === "floatUnassisted") {
      patch.jumpRollFloat = "";
      patch.swimFreestyleBackstroke = "";
      patch.treadMinute = "";
    } else if (key === "faceInWater") {
      patch.swimTenYardsSideBreath = "";
    } else if (key === "jumpRollFloat") {
      patch.swimFreestyleBackstroke = "";
    } else if (key === "treadMinute") {
      patch.swimFreestyleBackstroke = "";
    }

    updateSwimmer(swimmerId, patch);
  }

  function resetSwimmerQuestions(swimmerId: string) {
    updateSwimmer(swimmerId, {
      adaptive: "",
      firstProgram: "",
      comfortable: "",
      separateCaregiver: "",
      waitTurn: "",
      floatUnassisted: "",
      jumpRollFloat: "",
      swimFreestyleBackstroke: "",
      faceInWater: "",
      swimTenYardsSideBreath: "",
      treadMinute: "",
      selectedLevel: "",
      placementMode: "assessment"
    });
  }

  const [familySelectedLocationDays, setFamilySelectedLocationDays] = useState<string[]>([]);
  const [familyLocationsArray, setFamilyLocationsArray] = useState<string[]>([]);
  const [familyScheduleNote, setFamilyScheduleNote] = useState("");

  function syncSwimmerPreferences(locs: string[], locDays: string[], note: string) {
    const locStr = locs.join(",");
    const displayDaysSummary = locDays.map(item => {
      const [locId, day] = item.split(":");
      const locName = LOCATIONS.find(l => l.id === locId)?.name || locId;
      return `${locName} ${day}`;
    }).join(", ");

    const scheduleStr = [displayDaysSummary, note.trim()].filter(Boolean).join(" · ");

    setSwimmers(prev => prev.map(s => ({
      ...s,
      location: locStr,
      preferredSchedule: scheduleStr
    })));
  }

  function toggleFamilyLocation(locId: string) {
    let nextLocs: string[];
    let nextLocDays = [...familySelectedLocationDays];

    if (familyLocationsArray.includes(locId)) {
      nextLocs = familyLocationsArray.filter(id => id !== locId);
      nextLocDays = nextLocDays.filter(item => !item.startsWith(locId + ":"));
    } else {
      nextLocs = [...familyLocationsArray, locId];
    }

    setFamilyLocationsArray(nextLocs);
    setFamilySelectedLocationDays(nextLocDays);
    syncSwimmerPreferences(nextLocs, nextLocDays, familyScheduleNote);
  }

  function toggleFamilyLocationDay(locId: string, day: string) {
    const key = `${locId}:${day}`;
    let nextLocDays: string[];
    let nextLocs = [...familyLocationsArray];

    if (!nextLocs.includes(locId)) {
      nextLocs.push(locId);
    }

    if (familySelectedLocationDays.includes(key)) {
      nextLocDays = familySelectedLocationDays.filter(k => k !== key);
    } else {
      nextLocDays = [...familySelectedLocationDays, key];
    }

    setFamilyLocationsArray(nextLocs);
    setFamilySelectedLocationDays(nextLocDays);
    syncSwimmerPreferences(nextLocs, nextLocDays, familyScheduleNote);
  }

  function isLocDaySelected(locId: string, day: string) {
    return familySelectedLocationDays.includes(`${locId}:${day}`);
  }

  function handleScheduleNoteChange(note: string) {
    setFamilyScheduleNote(note);
    syncSwimmerPreferences(familyLocationsArray, familySelectedLocationDays, note);
  }

  const profileValid = swimmers.every(
    (swimmer) => swimmer.firstName.trim() && swimmer.dob && validDob(swimmer.dob) && swimmer.gender
  );

  const levelsValid = swimmers.every(isPlacementComplete);

  const classValid = swimmers.every((swimmer) => swimmer.location);

  function goToContact() {
    setStep(2);
    logLead("Step 1: View Lesson Times Clicked (Quote Generated)");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToLevels() {
    if (ENFORCE_REQUIRED_FIELDS) {
      setShowValidationErrors(true);
      
      const errors = [];
      if (!family.firstName.trim()) errors.push("Parent First Name");
      if (!family.lastName.trim()) errors.push("Parent Last Name");
      if (!/\S+@\S+\.\S+/.test(family.email)) errors.push("Parent Email");
      if (family.phone.replace(/\D/g, "").length < 10) errors.push("Parent Mobile Phone (10 digits)");
      if (!family.smsConsent) errors.push("SMS Text Consent");

      swimmers.forEach((swimmer, index) => {
        const name = swimmer.firstName.trim() || ("Swimmer " + (index + 1));
        if (!swimmer.firstName.trim()) errors.push(name + "'s First Name");
        if (!swimmer.dob) {
          errors.push(name + "'s Date of Birth");
        } else if (!validDob(swimmer.dob)) {
          errors.push(name + "'s Date of Birth (must be valid MM/DD/YYYY)");
        }
        if (!swimmer.gender) errors.push(name + "'s Gender");
      });

      if (errors.length > 0) {
        return setMessage("Please correct the following fields: " + errors.join(", ") + ".");
      }
    }

    setMessage("");
    setActiveSwimmer(0);
    setStep(3);
    logLead("Step 2 Completed: Profiles & Contact Info Entered");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPools() {
    if (ENFORCE_REQUIRED_FIELDS && !levelsValid) {
      return setMessage("Please complete the starting level questions for all swimmers.");
    }
    setMessage("");
    setStep(4);
    logLead("Step 3 Completed: Placement Levels Selected");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToReview() {
    if (ENFORCE_REQUIRED_FIELDS && !classValid) {
      return setMessage("Choose a preferred pool for each swimmer.");
    }
    setMessage("");
    setStep(5);
    logLead("Step 4 Completed: Pool & Schedule Preferences Selected");
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    setLoadingOpenings(true);
    fetch("/api/openings")
      .then((res) => res.json())
      .then((data) => {
        const classes = Array.isArray(data) ? data : (data.rows || data.classes || []);
        setOpenings(classes);
        setLoadingOpenings(false);
      })
      .catch(() => {
        setLoadingOpenings(false);
      });
  }

  interface CoordinatedMatch {
    type: "same-time" | "back-to-back" | "same-day" | "individual";
    day: string;
    timeLabel: string;
    locationName: string;
    classes: { swimmerName: string; level: string; classObj: JackrabbitClass }[];
    score: number;
  }

  const coordinatedMatches = useMemo<CoordinatedMatch[]>(() => {
    if (openings.length === 0) return [];
    
    const matches: CoordinatedMatch[] = [];
    const daysOfWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const dayLabels: Record<string, string> = {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday"
    };

    const swimmersWithFilteredClasses = swimmers.map((swimmer, idx) => {
      const swimmerLevel = startingLevel(swimmer);
      const locationsArray = swimmer.location ? swimmer.location.split(",").filter(Boolean) : [];
      
      const matchedClasses = openings.filter(c => {
        const levelMatch = matchClassLevel(c, swimmerLevel);
        const dayLocMatch = matchDaysAndLocation(c, locationsArray, familySelectedLocationDays);
        
        const name = (c.name || "").toLowerCase();
        const room = (c.room || "").toLowerCase();
        const isPlaceholder = room.includes("future") || room.includes("hold") || room.includes("run") || name.includes("future") || name.includes("available for any lesson") || name.includes("manager on duty") || name.includes("staff meeting") || name.includes("convenience fee");
        const hasOpenings = getOpeningsCount(c) >= 1;
        
        return levelMatch && dayLocMatch && !isPlaceholder && hasOpenings;
      });

      return {
        swimmer,
        defaultName: swimmer.firstName ? swimmer.firstName.trim() : ("Swimmer " + (idx + 1)),
        matchedClasses
      };
    });

    const dayWeight = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };

    if (swimmers.length === 1) {
      const { swimmer, defaultName, matchedClasses } = swimmersWithFilteredClasses[0];
      matchedClasses.forEach(c => {
        const days = Object.keys(c.meeting_days).filter(k => c.meeting_days[k as keyof typeof c.meeting_days]);
        days.forEach(d => {
          matches.push({
            type: "individual",
            day: dayLabels[d] || d,
            timeLabel: formatTime12h(c.start_time),
            locationName: c.location_name || c.location || "",
            classes: [{ swimmerName: defaultName, level: startingLevel(swimmer), classObj: c }],
            score: 10
          });
        });
      });
      return matches.sort((a, b) => {
        const dayA = dayWeight[a.day as keyof typeof dayWeight] || 0;
        const dayB = dayWeight[b.day as keyof typeof dayWeight] || 0;
        if (dayA !== dayB) return dayA - dayB;
        const timeA = parseTimeToMinutes(a.classes[0].classObj.start_time);
        const timeB = parseTimeToMinutes(b.classes[0].classObj.start_time);
        return timeA - timeB;
      }).slice(0, 20);
    }

    const locCodes = ["LAFLITT", "LAFGP", "MAN24H"];
    locCodes.forEach(locCode => {
      const locName = locCode === "LAFGP" ? "Grand Prairie" : (locCode === "LAFLITT" ? "Arlington" : "Mansfield");
      
      daysOfWeek.forEach(dayKey => {
        const swimmerClassesAtSlot = swimmersWithFilteredClasses.map(s => {
          return {
            swimmer: s.swimmer,
            defaultName: s.defaultName,
            classes: s.matchedClasses.filter(c => c.location_code === locCode && c.meeting_days[dayKey as keyof typeof c.meeting_days])
          };
        });

        if (swimmers.length === 2) {
          const s1 = swimmerClassesAtSlot[0];
          const s2 = swimmerClassesAtSlot[1];

          s1.classes.forEach(c1 => {
            s2.classes.forEach(c2 => {
              // If both swimmers are placed into the exact same class, ensure there are at least 2 openings!
              if (c1.id === c2.id && getOpeningsCount(c1) < 2) {
                return;
              }

              const t1 = parseTimeToMinutes(c1.start_time);
              const t2 = parseTimeToMinutes(c2.start_time);
              
              if (t1 === t2) {
                matches.push({
                  type: "same-time",
                  day: dayLabels[dayKey],
                  timeLabel: formatTime12h(c1.start_time),
                  locationName: locName,
                  classes: [
                    { swimmerName: s1.defaultName, level: startingLevel(s1.swimmer), classObj: c1 },
                    { swimmerName: s2.defaultName, level: startingLevel(s2.swimmer), classObj: c2 }
                  ],
                  score: 100
                });
              } else if (Math.abs(t1 - t2) === 30) {
                matches.push({
                  type: "back-to-back",
                  day: dayLabels[dayKey],
                  timeLabel: (t1 <= t2 ? formatTime12h(c1.start_time) + " & " + formatTime12h(c2.start_time) : formatTime12h(c2.start_time) + " & " + formatTime12h(c1.start_time)),
                  locationName: locName,
                  classes: t1 <= t2 ? [
                    { swimmerName: s1.defaultName, level: startingLevel(s1.swimmer), classObj: c1 },
                    { swimmerName: s2.defaultName, level: startingLevel(s2.swimmer), classObj: c2 }
                  ] : [
                    { swimmerName: s2.defaultName, level: startingLevel(s2.swimmer), classObj: c2 },
                    { swimmerName: s1.defaultName, level: startingLevel(s1.swimmer), classObj: c1 }
                  ],
                  score: 50
                });
              }
            });
          });
        }
      });
    });

    // Slot-level deduplication: guarantees at most ONE match card per unique Location + Day + Time + Type
    const slotMap = new Map<string, CoordinatedMatch>();

    matches.forEach(m => {
      const slotKey = `${m.locationName}|${m.day}|${m.timeLabel}|${m.type}`;
      const totalOpenings = m.classes.reduce((sum, c) => sum + getOpeningsCount(c.classObj), 0);
      const existing = slotMap.get(slotKey);
      
      if (!existing) {
        slotMap.set(slotKey, m);
      } else {
        const existingOpenings = existing.classes.reduce((sum, c) => sum + getOpeningsCount(c.classObj), 0);
        if (totalOpenings > existingOpenings) {
          slotMap.set(slotKey, m);
        }
      }
    });

    const uniqueMatches = Array.from(slotMap.values());

    return uniqueMatches.sort((a, b) => {
      const dayA = dayWeight[a.day as keyof typeof dayWeight] || 0;
      const dayB = dayWeight[b.day as keyof typeof dayWeight] || 0;
      if (dayA !== dayB) return dayA - dayB;

      const getMinTime = (m: CoordinatedMatch) => {
        const times = m.classes.map(c => parseTimeToMinutes(c.classObj.start_time));
        return Math.min(...times);
      };
      const timeA = getMinTime(a);
      const timeB = getMinTime(b);
      if (timeA !== timeB) return timeA - timeB;

      if (b.score !== a.score) return b.score - a.score;
      return a.timeLabel.localeCompare(b.timeLabel);
    }).slice(0, 20);
  }, [swimmers, openings, familySelectedLocationDays]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (ENFORCE_REQUIRED_FIELDS && (!profileValid || !levelsValid || !classValid)) return;
    
    let text = "Scheduling Assistance Request for " + (family.firstName || "Parent") + " " + family.lastName + " (" + (family.phone || "No phone provided") + ").\n\n";
    text += "=== INSTANT QUOTE SUMMARY ===\n";
    text += "• Quoted Ongoing Monthly Tuition: $" + quotePricing.totalTuition.toFixed(2) + "/mo\n";
    text += "• Quoted Total Due Today: $" + quotePricing.firstMonthTotal.toFixed(2) + " (includes $" + quotePricing.totalRegistrationFees.toFixed(2) + " annual registration fee)\n\n";
    text += "=== SWIMMERS & PREFERRED LESSONS ===\n";
    swimmers.forEach((s) => {
      const paceLabel = s.ageGroup === "dolphin"
        ? (s.pace === "dolphin_private" ? "Private (1x/wk)" : "Semi-Private (1x/wk)")
        : (s.pace === "unlimited" ? "Unlimited Swim" : (s.pace === "standard" ? "2x per week" : "1x per week"));
      text += "• " + (s.firstName || "Swimmer") + " (" + (s.dob || "Age N/A") + ", " + (s.gender || "N/A") + "):\n";
      text += "  - Assessed Level: " + startingLevel(s) + "\n";
      text += "  - Preferred Frequency: " + paceLabel + "\n";
      text += "  - Location(s): " + (s.location ? s.location.split(",").map(id => LOCATIONS.find(l => l.id === id)?.name.replace("British Swim School at ", "")).filter(Boolean).join(", ") : "Any Location") + "\n";
      text += "  - Days / Note: " + (s.preferredSchedule || "Any day") + "\n";
    });
    text += "\nReferral Source: " + (referral.source || "Website") + (referral.friendName ? " (Referred by: " + referral.friendName + ")" : "");
    
    setComposed(text);
    setHandedOff(true);
    logLead("Step 5 Completed: Scheduling Assistance Requested");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(composed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="hold-form">
      <div className="wizard-progress" aria-label={"Step " + step + " of 5"}>
        {[
          { num: 1, label: "Instant Quote" },
          { num: 2, label: "Profiles" },
          { num: 3, label: "Levels" },
          { num: 4, label: "Schedule" },
          { num: 5, label: "Review" }
        ].map((s, index) => (
          <div key={s.label} className={"progress-step " + (step === index + 1 ? "current" : step > index + 1 ? "complete" : "")}>
            <span className="step-badge">{step > index + 1 ? "✓" : s.num}</span>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="quote-calculator-container">
          <div className="quote-left-panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Build Your Tuition Quote</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '24px' }}>Adjust swimmers, ages, and weekly class frequencies to instantly estimate your flat monthly subscription.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {AGE_GROUPS.map((group) => (
                <div key={group.id} className="swimmer-counter-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: '1px solid #dce3ef', borderRadius: '16px', background: '#fff' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--navy)', fontWeight: '800' }}>{group.label}</strong>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleCountChange(group.id, -1)}
                      disabled={counts[group.id] === 0}
                      style={{ width: '32px', height: '32px', border: '1px solid #dce3ef', borderRadius: '8px', background: '#fff', color: '#c8102e', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: counts[group.id] === 0 ? 'not-allowed' : 'pointer', opacity: counts[group.id] === 0 ? 0.4 : 1 }}
                    >
                      –
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)', width: '12px', textAlign: 'center' }}>{counts[group.id]}</span>
                    <button
                      type="button"
                      onClick={() => handleCountChange(group.id, 1)}
                      style={{ width: '32px', height: '32px', border: '1px solid #dce3ef', borderRadius: '8px', background: '#fff', color: '#0056b3', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '26px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '850', color: 'var(--navy)', marginBottom: '14px' }}>
                How many swim lessons per week?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {swimmers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--muted)', background: '#fafbfe', borderRadius: '16px', border: '1px dashed #dce3ef', fontSize: '12px' }}>
                    Select your swimmers above to choose lesson frequency.
                  </div>
                ) : swimmers.map((swimmer, idx) => {
                  const label = swimmers.length > 1 
                    ? `Swimmer ${idx + 1} (${AGE_GROUPS.find(g => g.id === swimmer.ageGroup)?.label})` 
                    : AGE_GROUPS.find(g => g.id === swimmer.ageGroup)?.label;

                  return (
                    <div
                      key={swimmer.id}
                      style={{
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <strong style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)' }}>
                        {label}
                      </strong>

                      <div style={{ display: 'grid', gridTemplateColumns: swimmer.ageGroup === "dolphin" ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
                        {swimmer.ageGroup === "dolphin" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "dolphin_semi" })}
                              className={"select-pill-btn " + (swimmer.pace === "dolphin_semi" ? "selected" : "")}
                              style={{ padding: '10px 8px', fontSize: '11px' }}
                            >
                              Semi-Private (1x/wk)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "dolphin_private" })}
                              className={"select-pill-btn " + (swimmer.pace === "dolphin_private" ? "selected" : "")}
                              style={{ padding: '10px 8px', fontSize: '11px' }}
                            >
                              Private (1x/wk)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "foundation" })}
                              className={"select-pill-btn " + (swimmer.pace === "foundation" ? "selected" : "")}
                              style={{ padding: '10px 8px', fontSize: '12px' }}
                            >
                              1x per week
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "standard" })}
                              className={"select-pill-btn " + (swimmer.pace === "standard" ? "selected" : "")}
                              style={{ padding: '10px 8px', fontSize: '12px' }}
                            >
                              2x per week
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "unlimited" })}
                              className={"select-pill-btn " + (swimmer.pace === "unlimited" ? "selected" : "")}
                              style={{ padding: '10px 8px', fontSize: '12px' }}
                            >
                              Unlimited Swim
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="quote-right-panel">
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)', marginBottom: '16px' }}>Tuition & Enrollment Summary</h3>
            
            <div className="quote-table-wrapper" style={{ border: '1px solid #eef2ff', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #eef2ff', color: 'var(--muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 12px' }}>Line Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Original</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Discounts</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Final</th>
                  </tr>
                </thead>
                <tbody>
                  {quotePricing.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                        No swimmers selected
                      </td>
                    </tr>
                  ) : quotePricing.items.map((item, idx) => {
                    const isDolphin = item.ageGroup === "dolphin";
                    const isStandard = item.pace === "standard";
                    const isUnlimited = item.pace === "unlimited";
                    const isPrivate = item.pace === "dolphin_private";
                    
                    const class1PaceLabel = isDolphin ? "Foundation Slot (Dolphin)" : "Foundation Slot";
                    const class2PaceLabel = isPrivate ? "Private Surcharge" : (isStandard ? "Bundle slot (Standard pace)" : "Unlimited Surcharge");

                    return (
                      <Fragment key={item.swimmerId}>
                        <tr style={{ background: '#f1f5f9' }}>
                          <td colSpan={4} style={{ padding: '6px 12px', fontWeight: '850', color: 'var(--navy)', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>
                            <span style={{ color: '#c8102e', marginRight: '6px' }}>●</span> {AGE_GROUPS.find(g => g.id === item.ageGroup)?.label || ("Swimmer " + (idx + 1))} — Tuition Breakdown
                          </td>
                        </tr>
                        {isDolphin ? (
                          <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ display: 'block', color: 'var(--navy)' }}>
                                {isPrivate ? "Adaptive Private Lesson (1x/wk)" : "Adaptive Semi-Private Lesson (1x/wk)"}
                              </strong>
                              <span style={{ color: 'var(--muted)', fontSize: '9px' }}>
                                {isPrivate ? "1-on-1 specialized adaptive lesson" : "Small group adaptive lesson (Dolphin)"}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>${item.baseRate.toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {item.siblingDiscount > 0 ? (
                                <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                  Sibling (10%): -${item.siblingDiscount.toFixed(2)}
                                </span>
                              ) : "-"}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.finalRate.toFixed(2)}</td>
                          </tr>
                        ) : (
                          <>
                            <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <strong style={{ display: 'block', color: 'var(--navy)' }}>Class 1 Tuition</strong>
                                <span style={{ color: 'var(--muted)', fontSize: '9px' }}>Foundation Slot</span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>${item.class1Base.toFixed(2)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {item.siblingDiscount > 0 ? (
                                  <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                    Sibling (10%): -${(item.class1Base * 0.1).toFixed(2)}
                                  </span>
                                ) : "-"}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.class1Final.toFixed(2)}</td>
                            </tr>

                            {(isStandard || isUnlimited) && (
                              <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <strong style={{ display: 'block', color: 'var(--navy)' }}>Class 2 Tuition</strong>
                                  <span style={{ color: 'var(--muted)', fontSize: '9px' }}>Bundle slot (Standard pace)</span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>${item.class2Base.toFixed(2)}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                                    {item.class2BundleDiscount > 0 && (
                                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        2x/wk Bundle: -${item.class2BundleDiscount.toFixed(2)}
                                      </span>
                                    )}
                                    {item.siblingDiscount > 0 && item.class2BundledRate > 0 && (
                                      <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        Sibling (10%): -${(item.class2BundledRate * 0.1).toFixed(2)}
                                      </span>
                                    )}
                                    {item.class2BundleDiscount === 0 && item.siblingDiscount === 0 && "-"}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.class2Final.toFixed(2)}</td>
                              </tr>
                            )}

                            {isUnlimited && (
                              <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <strong style={{ display: 'block', color: 'var(--navy)' }}>Unlimited Add-On</strong>
                                  <span style={{ color: 'var(--muted)', fontSize: '9px' }}>Unlimited swimming access</span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>${item.unlimitedAddonRate.toFixed(2)}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  {item.siblingDiscount > 0 ? (
                                    <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                      Sibling (10%): -${(item.unlimitedAddonRate * 0.1).toFixed(2)}
                                    </span>
                                  ) : "-"}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.unlimitedAddonFinal.toFixed(2)}</td>
                              </tr>
                            )}
                          </>
                        )}

                        <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ display: 'block', color: 'var(--navy)' }}>Registration Fee</strong>
                            <span style={{ color: 'var(--muted)', fontSize: '9px' }}>Annual signup / insurance fee</span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>$49.99</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {item.registrationDiscount > 0 ? (
                              <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                Cap Limit Part: -${item.registrationDiscount.toFixed(2)}
                              </span>
                            ) : "-"}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.registrationFee.toFixed(2)}</td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2-Box Summary: Ongoing Monthly Subscription (First) & Total Due Today (Second) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', marginTop: '16px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16, 39, 116, 0.04)'
              }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Ongoing Monthly
                </span>
                <strong style={{ fontSize: '24px', fontWeight: '900', color: 'var(--navy)', lineHeight: '1.1', display: 'block' }}>
                  ${quotePricing.totalTuition.toFixed(2)}<span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>/mo</span>
                </strong>
                <span style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Tuition starting month 2
                </span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffeef0 100%)',
                border: '1.5px solid #fecdd3',
                borderRadius: '16px',
                padding: '14px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(200, 16, 46, 0.08)'
              }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#c8102e', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Total Due Today
                </span>
                <strong style={{ fontSize: '24px', fontWeight: '900', color: '#c8102e', lineHeight: '1.1', display: 'block' }}>
                  ${quotePricing.firstMonthTotal.toFixed(2)}
                </strong>
                <span style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Tuition + Enrollment Fee
                </span>
              </div>
            </div>

            <div className="tuition-description-block" style={{ fontSize: '11px', lineHeight: '1.5', color: 'var(--ink)', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #eef2ff', marginBottom: '20px' }}>
              Your first payment on the day you enroll is <strong>${quotePricing.firstMonthTotal.toFixed(2)}</strong>. This includes your first month&apos;s tuition of <strong>${quotePricing.totalTuition.toFixed(2)}</strong> plus a one-time annual enrollment fee of <strong>${quotePricing.totalRegistrationFees.toFixed(2)}</strong>.
              <br/><br/>
              Your ongoing monthly tuition will be <strong>${quotePricing.totalTuition.toFixed(2)}</strong> starting in your second month.
            </div>

            <button
              type="button"
              disabled={swimmers.length === 0}
              onClick={goToContact}
              className="wizard-next step1-continue-btn"
              style={{
                width: '100%',
                padding: '15px 22px',
                borderRadius: '99px',
                background: swimmers.length === 0 ? '#cbd5e1' : 'linear-gradient(180deg, #e51d3b 0%, #c8102e 100%)',
                color: '#fff',
                border: swimmers.length === 0 ? 'none' : '1px solid #b30c26',
                fontWeight: '900',
                fontSize: '15px',
                letterSpacing: '0.01em',
                cursor: swimmers.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: swimmers.length === 0 ? 'none' : '0 6px 18px rgba(200, 16, 46, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span>View Lesson Times</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 12L10 8L6 4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="form-section-heading"><span>1</span><div><p>Parent or guardian</p><h2>Who should we contact?</h2></div></div>
          <div className="form-grid two-column">
            <label>First name<input className={showValidationErrors && !family.firstName.trim() ? "invalid-field" : ""} value={family.firstName} onChange={(event) => setFamily({ ...family, firstName: event.target.value })} autoComplete="given-name" required={ENFORCE_REQUIRED_FIELDS} /></label>
            <label>Last name<input className={showValidationErrors && !family.lastName.trim() ? "invalid-field" : ""} value={family.lastName} onChange={(event) => setFamily({ ...family, lastName: event.target.value })} autoComplete="family-name" required={ENFORCE_REQUIRED_FIELDS} /></label>
            <label>Email address<input className={showValidationErrors && !/\S+@\S+\.\S+/.test(family.email) ? "invalid-field" : ""} value={family.email} onChange={(event) => setFamily({ ...family, email: event.target.value })} type="email" autoComplete="email" required={ENFORCE_REQUIRED_FIELDS} /></label>
            <label>Mobile phone<input className={showValidationErrors && family.phone.replace(/\D/g, "").length < 10 ? "invalid-field" : ""} value={family.phone} onChange={(event) => setFamily({ ...family, phone: formatPhone(event.target.value) })} type="tel" autoComplete="tel" inputMode="tel" required={ENFORCE_REQUIRED_FIELDS} /></label>
          </div>
          
          <div className="form-section-heading swimmer-heading"><span>2</span><div><p>Swimmer profiles</p><h2>Tell us who will be swimming.</h2></div></div>
          <div className="swimmer-profile-list">
            {swimmers.map((swimmer, index) => (
              <article key={swimmer.id}>
                <header><span>{(index + 1)}</span><div><strong>{"Swimmer " + (index + 1)}</strong><small>{AGE_GROUPS.find((group) => group.id === swimmer.ageGroup)?.label}</small></div></header>
                <div className="form-grid three-column">
                  <label>First name<input className={showValidationErrors && !swimmer.firstName.trim() ? "invalid-field" : ""} value={swimmer.firstName} onChange={(event) => updateSwimmer(swimmer.id, { firstName: event.target.value })} required={ENFORCE_REQUIRED_FIELDS} /></label>
                  <label>Date of Birth<input className={((showValidationErrors && !swimmer.dob) || (swimmer.dob && !validDob(swimmer.dob))) ? "invalid-field" : ""} value={swimmer.dob} onChange={(event) => updateSwimmer(swimmer.id, { dob: formatDob(event.target.value) })} onBlur={(event) => handleDobBlur(swimmer.id, event.target.value)} inputMode="numeric" autoComplete="bday" placeholder="MM/DD/YYYY" maxLength={10} required={ENFORCE_REQUIRED_FIELDS} />{swimmer.dobMessage && <p className="dob-warning-text" style={{ gridColumn: 'span 3', margin: '4px 0 0', color: 'var(--red)', fontSize: '10px', fontWeight: '800' }}>{swimmer.dobMessage}</p>}</label>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '10px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gender</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {["Female", "Male"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={"select-pill-btn " + (swimmer.gender === g ? "selected" : "") + (showValidationErrors && !swimmer.gender ? " invalid-field" : "")}
                          onClick={() => updateSwimmer(swimmer.id, { gender: g })}
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="sms-consent-row" style={{ marginTop: '20px' }}>
            <label className="checkbox-consent">
              <input className={showValidationErrors && !family.smsConsent ? "invalid-field" : ""} checked={family.smsConsent} onChange={(event) => setFamily({ ...family, smsConsent: event.target.checked })} type="checkbox" required={ENFORCE_REQUIRED_FIELDS} />
              <span>I consent to receive text messages from British Swim School at the mobile number provided above for scheduling and lesson coordination.</span>
            </label>
          </div>

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions">
            <button type="button" className="wizard-back" onClick={() => setStep(1)}>&larr; Back to Quote</button>
            <button type="button" className="wizard-next" onClick={goToLevels}>
              <span>Continue to Placement Levels</span>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
                <path d="M6 12L10 8L6 4" />
              </svg>
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="form-section-heading">
            <span>3</span>
            <div>
              <p>Placement levels</p>
              <h2>How comfortable is each swimmer?</h2>
            </div>
          </div>
          <p className="wizard-intro">
            Answer the questions below to match each swimmer with the correct skill level. Questions update step-by-step as you answer.
          </p>

          <div
            className="swimmer-columns-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: swimmers.length === 1 ? '1fr' : swimmers.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'start',
              marginTop: '20px'
            }}
          >
            {swimmers.map((swimmer, index) => {
              const isComplete = isPlacementComplete(swimmer);
              const nextQ = getNextQuestion(swimmer);
              const level = startingLevel(swimmer);

              return (
                <div key={swimmer.id} className="swimmer-column-card">
                  <div className="swimmer-col-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="swimmer-col-badge">{index + 1}</span>
                      <div>
                        <strong className="swimmer-col-name">{swimmer.firstName || ("Swimmer " + (index + 1))}</strong>
                        <small className="swimmer-col-age">{AGE_GROUPS.find(g => g.id === swimmer.ageGroup)?.label}</small>
                      </div>
                    </div>
                  </div>

                  {swimmer.ageGroup === "dolphin" ? (
                    <div className="placement-result-card">
                      <span className="level-badge-tag">Adaptive Curriculum</span>
                      <h4 className="level-title">Dolphin</h4>
                      <p className="level-desc">{LEVEL_DESCRIPTIONS["Dolphin"]}</p>
                    </div>
                  ) : (
                    <div className="assessment-question-flow">
                      {nextQ ? (
                        <div className="single-question-card">
                          <div className="question-meta-row">
                            <span className="question-step-count">Step {nextQ.stepNum} of {nextQ.totalSteps}</span>
                            <span className="question-pill-tag">Question</span>
                          </div>
                          <h4 className="question-prompt-text">{nextQ.text}</h4>

                          <div className="question-button-pair">
                            <button
                              type="button"
                              className={"choice-btn choice-yes " + (swimmer[nextQ.key] === "yes" ? "selected" : "")}
                              onClick={() => handleQuestionAnswer(swimmer.id, nextQ.key, "yes")}
                            >
                              <span className="btn-icon">✓</span>
                              <span>Yes</span>
                            </button>
                            <button
                              type="button"
                              className={"choice-btn choice-no " + (swimmer[nextQ.key] === "no" ? "selected" : "")}
                              onClick={() => handleQuestionAnswer(swimmer.id, nextQ.key, "no")}
                            >
                              <span className="btn-icon">✕</span>
                              <span>No</span>
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {isComplete && (
                        <div className="placement-result-card">
                          <span className="level-badge-tag">✓ Starting Level Estimate</span>
                          <h4 className="level-title">{getLevelDisplay(level)}</h4>
                          {getRatio(level) && (
                            <div
                              className="ratio-context-banner"
                              style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#0056b3',
                                background: '#eef6ff',
                                border: '1px solid #d0e4ff',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                margin: '6px 0 10px',
                                textAlign: 'center'
                              }}
                            >
                              Student to instructor ratio of {getRatio(level)} max in this level.
                            </div>
                          )}
                          <p className="level-desc">{LEVEL_DESCRIPTIONS[level]}</p>
                          <button
                            type="button"
                            className="reanswer-btn"
                            onClick={() => resetSwimmerQuestions(swimmer.id)}
                          >
                            &larr; Back
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions" style={{ marginTop: '28px' }}>
            <button type="button" className="wizard-back" onClick={() => setStep(2)}>&larr; Back</button>
            <button
              type="button"
              className={levelsValid ? "wizard-submit" : "wizard-next"}
              onClick={goToPools}
              style={levelsValid ? {
                padding: '16px 36px',
                borderRadius: '99px',
                background: 'linear-gradient(180deg, #e51d3b 0%, #c8102e 100%)',
                color: '#fff',
                border: '1px solid #b30c26',
                fontWeight: '900',
                fontSize: '16px',
                letterSpacing: '0.01em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(200, 16, 46, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              } : {
                opacity: 0.7,
                transition: 'all 0.2s ease'
              }}
            >
              <span>Choose Location &amp; Days</span>
              <svg width={levelsValid ? "18" : "15"} height={levelsValid ? "18" : "15"} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={levelsValid ? "2.4" : "2.2"} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
                <path d="M6 12L10 8L6 4" />
              </svg>
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="form-section-heading"><span>4</span><div><p>Pool choices &amp; days</p><h2>Where &amp; when would you like to swim?</h2></div></div>
          <p className="wizard-intro">Choose your preferred location(s) and days of the week. We will find matching classes for your family.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {LOCATIONS.map((location) => {
              const isLocSelected = familyLocationsArray.includes(location.id);
              const schedules = LOCATION_SCHEDULES[location.id] || [];

              return (
                <div
                  key={location.id}
                  style={{
                    border: isLocSelected ? '2px solid var(--blue)' : '1.5px solid #dce3ef',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    background: isLocSelected ? '#f8faff' : '#fff',
                    boxShadow: isLocSelected ? '0 4px 14px rgba(19,46,171,0.08)' : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: 'var(--navy)', display: 'block' }}>
                        {location.name}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {location.detail}
                      </span>
                    </div>

                    <a
                      href={location.href}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '11px', fontWeight: '800', color: 'var(--blue)', textDecoration: 'none' }}
                    >
                      View schedule &rarr;
                    </a>
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #eef2ff' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                      Hours &amp; Days of Operation (Select preferred days):
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      {schedules.map((s) => {
                        const isDaySelected = isLocDaySelected(location.id, s.day);
                        return (
                          <button
                            key={s.day}
                            type="button"
                            onClick={() => toggleFamilyLocationDay(location.id, s.day)}
                            className={"select-pill-btn " + (isDaySelected ? "selected" : "")}
                            style={{
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '2px',
                              textAlign: 'left',
                              borderRadius: '10px'
                            }}
                          >
                            <strong style={{ fontSize: '12px' }}>{s.day}</strong>
                            <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 'normal' }}>{s.hours}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="schedule-note" style={{ marginTop: '18px' }}>
            Additional schedule preferences <span>optional</span>
            <input
              value={familyScheduleNote}
              onChange={(event) => handleScheduleNoteChange(event.target.value)}
              placeholder="Example: after 5:00 PM or Saturday mornings"
            />
          </label>

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions">
            <button type="button" className="wizard-back" onClick={() => setStep(3)}>&larr; Back</button>
            <button type="button" className="wizard-next" onClick={goToReview}>
              <span>Review my details</span>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
                <path d="M6 12L10 8L6 4" />
              </svg>
            </button>
          </div>
        </>
      )}

      {step === 5 && !handedOff && (
        <form onSubmit={onSubmit}>
          <div className="form-section-heading"><span>5</span><div><p>Review</p><h2>Everything we need to help your family.</h2></div></div>

          {/* Referral source section in Step 5 */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', margin: '20px 0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              How did you hear about us?
            </label>
            <select
              value={referral.source}
              onChange={(event) => setReferral({ ...referral, source: event.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #dce3ef',
                fontSize: '13px',
                color: 'var(--navy)',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">Select an option...</option>
              {REFERRAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {referral.source === "Referral" && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>
                  Who can we thank for referring you?
                </label>
                <input
                  type="text"
                  placeholder="Friend or family member's full name"
                  value={referral.friendName}
                  onChange={(event) => setReferral({ ...referral, friendName: event.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #dce3ef',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Big Red Button Prominently at Top */}
          <button
            type="submit"
            className="wizard-submit"
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '99px',
              background: 'linear-gradient(180deg, #e51d3b 0%, #c8102e 100%)',
              color: '#fff',
              border: '1px solid #b30c26',
              fontWeight: '900',
              fontSize: '16px',
              letterSpacing: '0.01em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(200, 16, 46, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              margin: '20px 0 24px'
            }}
          >
            <span>Request Scheduling Assistance</span>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 12L10 8L6 4" />
            </svg>
          </button>

          <div className="coordinated-section">
            <h3>Class Openings Found</h3>
            {loadingOpenings ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Searching live pool schedules...</p>
            ) : coordinatedMatches.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 20px',
                marginTop: '10px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--navy)', fontWeight: '700', marginBottom: '4px' }}>
                  {swimmers.length > 1
                    ? "No coordinated sibling times found for the selected criteria."
                    : "No direct matching openings found for the selected schedule."}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>
                  Our team will help coordinate availability for their 2-class trial. Request scheduling assistance above and we will contact you with custom options.
                </p>
              </div>
            ) : (
              <div className="matches-list">
                {coordinatedMatches.slice(0, 6).map((match, idx) => (
                  <article className="match-card" key={idx}>
                    <div className="match-header">
                      <div>
                        <span className="match-title">{match.day}s at {match.timeLabel}</span>
                        <div className="match-location">{match.locationName}</div>
                      </div>
                      {match.type === "same-time" && <span className="match-badge badge-same-time">Same Time</span>}
                      {match.type === "back-to-back" && <span className="match-badge badge-back-to-back">Back-to-Back</span>}
                      {match.type === "same-day" && <span className="match-badge badge-same-day">Same Day</span>}
                    </div>
                    <div className="match-classes">
                      {match.classes.map((cls, cIdx) => {
                        const openingsCount = getOpeningsCount(cls.classObj);
                        return (
                          <div className="match-class-item" key={cIdx}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="class-info-line">
                                <strong>{cls.swimmerName}</strong>: {cls.level.replace(/\s*\d+:\d+$/, "")} with Coach {getInstructorName(cls.classObj)}
                              </span>
                              <span style={{
                                fontSize: '11.5px',
                                fontWeight: '750',
                                color: openingsCount === 1 ? '#d97706' : '#16a34a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: openingsCount === 1 ? '#d97706' : '#16a34a'
                                }} />
                                {openingsCount} {openingsCount === 1 ? 'opening available' : 'openings available'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="match-card-footer" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <a
                        className="register-btn"
                        href={getPreciseRegisterUrl(
                          match.classes[0].classObj,
                          match.classes[0].level,
                          match.classes[0].classObj.location_code,
                          family,
                          referral,
                          match.classes[0].swimmerName,
                          swimmers,
                          buildEnrollmentSynopsis(swimmers, quotePricing, familyLocationsArray, familySelectedLocationDays, familyScheduleNote, referral)
                        )}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '9px 20px', fontSize: '12.5px' }}
                      >
                        Book 2-Class Trial ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="assessment-disclaimer">
            <strong>Placement note</strong>
            <p>These levels are estimates based on your answers. Every swimmer receives an assessment during the first lesson. If another level is a better fit, we will make the adjustment.</p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
            {message && <p className="form-error" role="alert">{message}</p>}
            
            <div className="wizard-actions">
              <button type="button" className="wizard-back" onClick={() => setStep(4)}>&larr; Back</button>
            </div>
          </div>
        </form>
      )}

      {handedOff && (
        <div className="wizard-handoff" style={{ background: '#fff', border: '1px solid #dce3ef', borderRadius: '24px', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: '900', boxShadow: '0 4px 14px rgba(22,163,74,0.18)' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--navy)', marginBottom: '8px' }}>
            We Received Your Request!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '620px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            Our local team has logged your details and will text or call you shortly to coordinate lesson schedules and answer any questions for your family.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button
              type="button"
              onClick={copyToClipboard}
              className="select-pill-btn"
              style={{ padding: '12px 22px', fontSize: '13px', borderRadius: '99px' }}
            >
              {copied ? "✓ Copied Summary" : "📋 Copy Summary"}
            </button>
            {onMobile ? (
              <a
                href={"sms:" + SCHOOL_SMS + "?body=" + encodeURIComponent(composed)}
                style={{ padding: '12px 24px', borderRadius: '99px', background: 'var(--blue)', color: '#fff', textDecoration: 'none', fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(19,46,171,0.2)' }}
              >
                💬 Text Our Office (817-973-5455)
              </a>
            ) : (
              <a
                href={"mailto:" + SCHOOL_EMAIL + "?subject=Class Scheduling Assistance Request&body=" + encodeURIComponent(composed)}
                style={{ padding: '12px 24px', borderRadius: '99px', background: 'var(--blue)', color: '#fff', textDecoration: 'none', fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(19,46,171,0.2)' }}
              >
                ✉️ Email Our Office
              </a>
            )}
          </div>

          <div style={{ borderTop: '1px solid #eef2ff', paddingTop: '28px', marginTop: '12px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)', marginBottom: '6px', textAlign: 'center' }}>
              Explore Our Pool Locations &amp; Google Reviews
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginBottom: '20px' }}>
              Find directions on Google Maps, read reviews, or view dedicated pool schedules.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                {
                  name: "Arlington Pool",
                  facility: "LA Fitness on Little Road",
                  address: "3810 S Little Rd, Arlington, TX 76016",
                  mapsUrl: "https://www.google.com/maps/search/?api=1&query=British+Swim+School+at+LA+Fitness+-+Arlington+3810+S+Little+Rd",
                  webUrl: "https://britishswimschool.com/arlington-south-grand-prairie/location/arlington-la-fitness-little-road/"
                },
                {
                  name: "Mansfield Pool",
                  facility: "24 Hour Fitness on Walnut Creek",
                  address: "980 N Walnut Creek Dr, Mansfield, TX 76063",
                  mapsUrl: "https://www.google.com/maps/search/?api=1&query=British+Swim+School+at+24+Hour+Fitness+-+Mansfield+980+N+Walnut+Creek+Dr",
                  webUrl: "https://britishswimschool.com/arlington-south-grand-prairie/location/mansfield-24-hour-fitness/"
                },
                {
                  name: "Grand Prairie Pool",
                  facility: "LA Fitness on I-20",
                  address: "2803 W Interstate 20, Grand Prairie, TX 75052",
                  mapsUrl: "https://www.google.com/maps/search/?api=1&query=British+Swim+School+at+LA+Fitness+-+South+Grand+Prairie+2803+W+Interstate+20",
                  webUrl: "https://britishswimschool.com/arlington-south-grand-prairie/location/grand-prairie-la-fitness/"
                }
              ].map((loc) => (
                <div
                  key={loc.name}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '18px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '15px', color: 'var(--navy)', display: 'block', marginBottom: '2px' }}>
                      {loc.name}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      {loc.facility}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                      📍 {loc.address}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="select-pill-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        textDecoration: 'none'
                      }}
                    >
                      📍 View on Google Maps / Reviews ↗
                    </a>
                    <a
                      href={loc.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: 'var(--blue)',
                        textAlign: 'center',
                        textDecoration: 'none',
                        padding: '4px'
                      }}
                    >
                      Pool Details &amp; Schedule ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #eef2ff' }}>
              <a
                href="https://britishswimschool.com/arlington-south-grand-prairie/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '99px',
                  background: 'var(--navy)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: '800',
                  fontSize: '13px'
                }}
              >
                🌐 Visit British Swim School Official Website ↗
              </a>
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setHandedOff(false);
                    setStep(1);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Start over with a new quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hold-card-footer" style={{ justifyContent: 'flex-end' }}>
        <div className="footer-links">
          <Link href="/answers" className="footer-guide-link">Pricing, flexibility &amp; trial details &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
