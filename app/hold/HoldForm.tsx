"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, useMemo, Fragment } from "react";

const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUCakByl8j40MxtKBkAqR5VT9zUbvE0-WK7Jltd47RN_MO9cIEipEXTWpW5fLQ2wqk3Q/exec";

const SCHOOL_SMS = "+18179735455";
const SCHOOL_EMAIL = "goswimarlsgpra@britishswimschool.com";

export const LOCATION_DAYS: Record<string, string[]> = {
  arlington: ["Monday", "Wednesday", "Thursday", "Saturday"],
  mansfield: ["Tuesday", "Thursday", "Friday", "Sunday"],
  grandPrairie: ["Monday", "Tuesday", "Wednesday", "Saturday"]
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
  floatUnassisted: Answer;
  jumpRollFloat: Answer;
  glideRecover: Answer;
  swimTenYards: Answer;
  armsOut: Answer;
  treadMinute: Answer;
  fourStrokes: Answer;
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

function getLevelDisplay(level: string) {
  if (BEGINNER_LEVELS.includes(level)) {
    return level + " (Beginners)";
  }
  return level;
}

const LEVELS: Record<AgeGroup, string[]> = {
  under3: ["Tadpole", "Swimboree", "Seahorse", "Dolphin"],
  child: ["Starfish", "Minnow", "Turtle 1", "Turtle 2", "Shark 1", "Shark 2", "Barracuda", "Dolphin"],
  youngAdult: ["Starfish", "Minnow", "Young Adult 1", "Young Adult 2", "Young Adult 3", "Dolphin"],
  adult: ["Adult 1", "Adult 2", "Adult 3", "Dolphin"],
  dolphin: ["Dolphin"]
};

interface SwimmerPricing {
  swimmerId: string;
  name: string;
  ageGroup: AgeGroup;
  pace: "foundation" | "standard" | "unlimited" | "dolphin_semi" | "dolphin_private";
  baseRate: number;
  class1Base: number;
  class2Base: number;
  class1Final: number;
  class2Final: number;
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
    
    if (s.ageGroup === "dolphin") {
      if (pace === "dolphin_private") {
        baseRate = 499.99;
        class1Base = 249.99;
        class2Base = 250.00;
      } else {
        baseRate = 249.99;
        class1Base = 249.99;
        class2Base = 0;
      }
    } else {
      let foundationRate = 139.99;
      let standardRate = 199.99;
      let unlimitedRate = 249.99;

      if (s.ageGroup === "under3") {
        foundationRate = 114.99;
        standardRate = 159.99;
        unlimitedRate = 199.99;
      } else if (s.ageGroup === "adult") {
        foundationRate = 159.99;
        standardRate = 249.99;
        unlimitedRate = 299.99;
      }

      if (pace === "standard") {
        baseRate = standardRate;
        class1Base = foundationRate;
        class2Base = parseFloat((standardRate - foundationRate).toFixed(2));
      } else if (pace === "unlimited") {
        baseRate = unlimitedRate;
        class1Base = foundationRate;
        class2Base = parseFloat((unlimitedRate - foundationRate).toFixed(2));
      } else {
        baseRate = foundationRate;
        class1Base = foundationRate;
        class2Base = 0;
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
      class1Final: class1Base,
      class2Final: class2Base,
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
      if (item.class2Base > 0) {
        item.class2Final = parseFloat((item.class2Base * 0.90).toFixed(2));
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
  const target = swimmerLevel.toLowerCase();

  if (cat1.includes(target) || name.includes(target)) return true;

  if (target === "adult 1" && cat1.includes("adult level 1")) return true;
  if (target === "adult 2" && cat1.includes("adult level 2")) return true;
  if (target === "adult 3" && cat1.includes("adult level 3")) return true;
  if (target === "barracuda" && (cat1.includes("barracuda") || name.includes("barracuda"))) return true;

  return false;
}

function matchLocation(classLocCode: string, selectedLocs: string[]): boolean {
  const code = (classLocCode || "").toLowerCase();
  if (code === "laflitt" || code === "arl") return selectedLocs.includes("arlington");
  if (code === "lafgp" || code === "gp") return selectedLocs.includes("grandPrairie");
  if (code === "man24h" || code === "man") return selectedLocs.includes("mansfield");
  return false;
}

function matchDays(classObj: JackrabbitClass, preferredDaysString: string): boolean {
  const pref = preferredDaysString ? preferredDaysString.split(",").map(d => d.trim().toLowerCase()).filter(Boolean) : [];
  if (pref.length === 0) return true;
  
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
  
  return pref.some(day => daysMap[day]);
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

function getPreciseRegisterUrl(cls: JackrabbitClass, level: string, locCode: string): string {
  const basePreload = "https://app.jackrabbitclass.com/regv2/regga.aspx?id=553758";
  const finalLoc = locCode === "LAFGP" || locCode === "gp" ? "LAFGP" : (locCode === "LAFLITT" || locCode === "arl" ? "LAFLITT" : "MAN24H");
  
  if (cls.id && String(cls.id).length > 4) {
    return basePreload + "&preLoadClassID=" + cls.id + "&loc=" + finalLoc;
  }
  return basePreload + "&loc=" + finalLoc;
}

export default function HoldForm() {
  const [leadId] = useState(() => "lead_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now());
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
            floatUnassisted: "",
            jumpRollFloat: "",
            glideRecover: "",
            swimTenYards: "",
            armsOut: "",
            treadMinute: "",
            fourStrokes: "",
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
  const [family, setFamily] = useState({ firstName: "", lastName: "", email: "", phone: "", smsConsent: false });
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
  }, []);

  useEffect(() => {
    if (step > 1) {
      document.documentElement.classList.add("wizard-active-steps");
    } else {
      document.documentElement.classList.remove("wizard-active-steps");
    }
    if (step === 1) {
      document.documentElement.classList.add("quote-active-step");
    } else {
      document.documentElement.classList.remove("quote-active-step");
    }
    return () => {
      document.documentElement.classList.remove("wizard-active-steps");
      document.documentElement.classList.remove("quote-active-step");
    };
  }, [step]);

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
      family,
      referral,
      swimmers: swimmers.map((swimmer) => ({
        firstName: swimmer.firstName || "Swimmer",
        dob: swimmer.dob,
        gender: swimmer.gender,
        ageGroup: swimmer.ageGroup,
        estimatedLevel: startingLevel(swimmer),
        placementMode: swimmer.placementMode,
        selectedLevel: swimmer.selectedLevel,
        location: swimmer.location,
        preferredSchedule: swimmer.preferredSchedule,
        pace: swimmer.pace
      })),
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

  function startingLevel(swimmer: Swimmer): string {
    if (swimmer.placementMode === "known" && swimmer.selectedLevel) {
      return swimmer.selectedLevel;
    }
    if (swimmer.adaptive === "yes" || swimmer.ageGroup === "dolphin") return "Dolphin";
    if (swimmer.ageGroup === "under3") {
      if (swimmer.firstProgram === "yes") return "Tadpole";
      if (swimmer.comfortable === "no") return "Tadpole";
      if (swimmer.floatUnassisted === "no") return "Swimboree";
      return "Seahorse";
    }
    if (swimmer.ageGroup === "adult") {
      if (swimmer.comfortable === "no") return "Adult 1";
      if (swimmer.floatUnassisted === "no") return "Adult 1";
      if (swimmer.glideRecover === "no") return "Adult 2";
      return "Adult 3";
    }
    if (swimmer.ageGroup === "youngAdult") {
      if (swimmer.comfortable === "no") return "Young Adult 1";
      if (swimmer.floatUnassisted === "no") return "Young Adult 1";
      if (swimmer.glideRecover === "no") return "Young Adult 2";
      return "Young Adult 3";
    }
    if (swimmer.comfortable === "no") return "Starfish";
    if (swimmer.floatUnassisted === "no") return "Starfish";
    if (swimmer.jumpRollFloat === "no") return "Minnow";
    if (swimmer.glideRecover === "no") return "Turtle 1";
    if (swimmer.swimTenYards === "no") return "Turtle 2";
    if (swimmer.armsOut === "no") return "Shark 1";
    if (swimmer.treadMinute === "no") return "Shark 2";
    return "Barracuda";
  }

  const profileValid = swimmers.every(
    (swimmer) => swimmer.firstName.trim() && swimmer.dob && validDob(swimmer.dob) && swimmer.gender
  );

  const levelsValid = swimmers.every((swimmer) => {
    if (swimmer.ageGroup === "dolphin") return true;
    if (swimmer.placementMode === "known") return !!swimmer.selectedLevel;
    if (swimmer.placementMode === "assessment") {
      if (swimmer.adaptive === "yes") return true;
      if (swimmer.adaptive === "no") {
        if (swimmer.firstProgram === "") return false;
        if (swimmer.firstProgram === "yes") return true;
        if (swimmer.comfortable === "") return false;
        if (swimmer.comfortable === "no") return true;
        if (swimmer.floatUnassisted === "") return false;
        if (swimmer.floatUnassisted === "no") return true;
        if (swimmer.ageGroup === "under3") return true;
        if (swimmer.glideRecover === "") return false;
        if (swimmer.glideRecover === "no") return true;
        if (swimmer.ageGroup === "adult" || swimmer.ageGroup === "youngAdult") return true;
        if (swimmer.jumpRollFloat === "") return false;
        if (swimmer.jumpRollFloat === "no") return true;
        if (swimmer.swimTenYards === "") return false;
        if (swimmer.swimTenYards === "no") return true;
        if (swimmer.armsOut === "") return false;
        if (swimmer.armsOut === "no") return true;
        if (swimmer.treadMinute === "") return false;
        if (swimmer.treadMinute === "no") return true;
        return swimmer.fourStrokes !== "";
      }
    }
    return false;
  });

  const classValid = swimmers.every((swimmer) => swimmer.location);

  function goToContact() {
    setStep(2);
    logLead("Step 1 Completed: Instant Family Quote Generated");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToLevels() {
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

    setMessage("");
    setActiveSwimmer(0);
    setStep(3);
    logLead("Step 2 Completed: Profiles & Contact Info Entered");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPools() {
    if (!levelsValid) return setMessage("Please complete the starting level questions for all swimmers.");
    setMessage("");
    setStep(4);
    logLead("Step 3 Completed: Placement Levels Selected");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToReview() {
    if (!classValid) return setMessage("Choose a preferred pool for each swimmer.");
    setMessage("");
    setStep(5);
    logLead("Step 4 Completed: Pool & Schedule Preferences Selected");
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    setLoadingOpenings(true);
    fetch("/api/openings")
      .then((res) => res.json())
      .then((data) => {
        const classes = Array.isArray(data) ? data : (data.classes || []);
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

    const swimmersWithFilteredClasses = swimmers.map(swimmer => {
      const swimmerLevel = startingLevel(swimmer);
      const locationsArray = swimmer.location ? swimmer.location.split(",").filter(Boolean) : [];
      
      const matchedClasses = openings.filter(c => {
        const levelMatch = matchClassLevel(c, swimmerLevel);
        const locMatch = matchLocation(c.location_code, locationsArray);
        const dayMatch = matchDays(c, swimmer.preferredSchedule);
        
        const name = (c.name || "").toLowerCase();
        const isStaffShift = name.includes("manager on duty") || name.includes("staff meeting") || name.includes("convenience fee");
        
        return levelMatch && locMatch && dayMatch && !isStaffShift;
      });

      return {
        swimmer,
        matchedClasses
      };
    });

    if (swimmers.length === 1) {
      const { swimmer, matchedClasses } = swimmersWithFilteredClasses[0];
      matchedClasses.forEach(c => {
        const days = Object.keys(c.meeting_days).filter(k => c.meeting_days[k as keyof typeof c.meeting_days]);
        days.forEach(d => {
          matches.push({
            type: "individual",
            day: dayLabels[d] || d,
            timeLabel: formatTime12h(c.start_time),
            locationName: c.location_name || c.location || "",
            classes: [{ swimmerName: swimmer.firstName, level: startingLevel(swimmer), classObj: c }],
            score: 10
          });
        });
      });
      return matches.slice(0, 15);
    }

    const locCodes = ["LAFLITT", "LAFGP", "MAN24H"];
    locCodes.forEach(locCode => {
      const locName = locCode === "LAFGP" ? "Grand Prairie" : (locCode === "LAFLITT" ? "Arlington" : "Mansfield");
      
      daysOfWeek.forEach(dayKey => {
        const swimmerClassesAtSlot = swimmersWithFilteredClasses.map(s => {
          return {
            swimmer: s.swimmer,
            classes: s.matchedClasses.filter(c => c.location_code === locCode && c.meeting_days[dayKey as keyof typeof c.meeting_days])
          };
        });

        if (swimmers.length === 2) {
          const s1 = swimmerClassesAtSlot[0];
          const s2 = swimmerClassesAtSlot[1];

          s1.classes.forEach(c1 => {
            s2.classes.forEach(c2 => {
              const t1 = parseTimeToMinutes(c1.start_time);
              const t2 = parseTimeToMinutes(c2.start_time);
              
              if (t1 === t2) {
                matches.push({
                  type: "same-time",
                  day: dayLabels[dayKey],
                  timeLabel: formatTime12h(c1.start_time),
                  locationName: locName,
                  classes: [
                    { swimmerName: s1.swimmer.firstName, level: startingLevel(s1.swimmer), classObj: c1 },
                    { swimmerName: s2.swimmer.firstName, level: startingLevel(s2.swimmer), classObj: c2 }
                  ],
                  score: 100
                });
              } else if (Math.abs(t1 - t2) === 30) {
                matches.push({
                  type: "back-to-back",
                  day: dayLabels[dayKey],
                  timeLabel: formatTime12h(c1.start_time) + " & " + formatTime12h(c2.start_time),
                  locationName: locName,
                  classes: [
                    { swimmerName: s1.swimmer.firstName, level: startingLevel(s1.swimmer), classObj: c1 },
                    { swimmerName: s2.swimmer.firstName, level: startingLevel(s2.swimmer), classObj: c2 }
                  ],
                  score: 50
                });
              }
            });
          });
        } else {
          const hasOpeningsForAll = swimmerClassesAtSlot.every(s => s.classes.length > 0);
          if (hasOpeningsForAll) {
            const combined = swimmerClassesAtSlot.map(s => ({
              swimmerName: s.swimmer.firstName,
              level: startingLevel(s.swimmer),
              classObj: s.classes[0]
            }));
            matches.push({
              type: "same-day",
              day: dayLabels[dayKey],
              timeLabel: swimmerClassesAtSlot.map(s => formatTime12h(s.classes[0].start_time)).join(", "),
              locationName: locName,
              classes: combined,
              score: 30
            });
          }
        }
      });
    });

    const dayWeight = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
    return matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dayA = dayWeight[a.day as keyof typeof dayWeight] || 0;
      const dayB = dayWeight[b.day as keyof typeof dayWeight] || 0;
      if (dayA !== dayB) return dayA - dayB;
      return a.timeLabel.localeCompare(b.timeLabel);
    }).slice(0, 15);
  }, [swimmers, openings]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profileValid || !levelsValid || !classValid) return;
    
    let text = "Requesting Class Times for " + family.firstName + " " + family.lastName + " (" + family.phone + ").\nSwimmers:\n";
    swimmers.forEach((s) => {
      text += "- " + s.firstName + " (" + s.dob + ", " + s.gender + "): Level " + startingLevel(s) + " at " + s.location.split(",").map(id => LOCATIONS.find(l => l.id === id)?.name).filter(Boolean).join(", ") + " (" + (s.preferredSchedule || "Any day") + ")\n";
    });
    text += "\nHeard from: " + referral.source;
    
    setComposed(text);
    setHandedOff(true);
    logLead("Step 5 Completed: Final Submission Logged");
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
        {["Instant Quote", "Profiles & Contact", "Placement Levels", "Pools & Days", "Review"].map((label, index) => (
          <span key={label} className={step === index + 1 ? "current" : step > index + 1 ? "complete" : ""}>
            <b>{step > index + 1 ? "✓" : index + 1}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="quote-calculator-container" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px', alignItems: 'start' }}>
          <div className="quote-left-panel" style={{ background: '#fff', border: '1px solid #dce3ef', borderRadius: '20px', padding: '24px' }}>
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

            <div style={{ marginTop: '28px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)', marginBottom: '16px' }}>Lesson Frequency (Pace)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {swimmers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', background: '#fafbfe', borderRadius: '16px', border: '1px dashed #dce3ef', fontSize: '12px' }}>
                    Use the buttons above to select your swimmers and build your tuition quote.
                  </div>
                ) : swimmers.map((swimmer, idx) => {
                  const pricingItem = quotePricing.items.find(item => item.swimmerId === swimmer.id);
                  const isPrimary = pricingItem?.isPrimary;

                  return (
                    <div key={swimmer.id} style={{ border: '1px solid #eef2ff', borderRadius: '16px', padding: '20px', background: '#fafbfe' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)' }}>Swimmer {idx + 1}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {AGE_GROUPS.find(g => g.id === swimmer.ageGroup)?.label}
                          </span>
                          {isPrimary && (
                            <span style={{ background: 'var(--navy)', color: '#fff', fontSize: '8px', fontWeight: '800', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Primary</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {swimmer.ageGroup === "dolphin" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "dolphin_private" })}
                              className={"pace-btn " + (swimmer.pace === "dolphin_private" ? "selected" : "")}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dce3ef', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', background: swimmer.pace === "dolphin_private" ? 'var(--navy)' : '#fff', color: swimmer.pace === "dolphin_private" ? '#fff' : 'var(--navy)' }}
                            >
                              Private
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "dolphin_semi" })}
                              className={"pace-btn " + (swimmer.pace === "dolphin_semi" ? "selected" : "")}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dce3ef', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', background: swimmer.pace === "dolphin_semi" ? 'var(--navy)' : '#fff', color: swimmer.pace === "dolphin_semi" ? '#fff' : 'var(--navy)' }}
                            >
                              Semi-Private
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "unlimited" })}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dce3ef', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', background: swimmer.pace === "unlimited" ? 'var(--navy)' : '#fff', color: swimmer.pace === "unlimited" ? '#fff' : 'var(--navy)' }}
                            >
                              Elite
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "standard" })}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dce3ef', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', background: swimmer.pace === "standard" ? 'var(--navy)' : '#fff', color: swimmer.pace === "standard" ? '#fff' : 'var(--navy)' }}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSwimmer(swimmer.id, { pace: "foundation" })}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #dce3ef', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', background: swimmer.pace === "foundation" ? 'var(--navy)' : '#fff', color: swimmer.pace === "foundation" ? '#fff' : 'var(--navy)' }}
                            >
                              Foundation
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

          <div className="quote-right-panel" style={{ background: '#fff', border: '1px solid #dce3ef', borderRadius: '20px', padding: '24px', position: 'sticky', top: '24px' }}>
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
                            <span style={{ color: '#c8102e', marginRight: '6px' }}>●</span> Swimmer {idx + 1} — Tuition Breakdown
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ display: 'block', color: 'var(--navy)' }}>Class 1 Tuition</strong>
                            <span style={{ color: 'var(--muted)', fontSize: '9px' }}>{class1PaceLabel}</span>
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

                        {(isStandard || isUnlimited || isPrivate) && (
                          <tr style={{ borderBottom: '1px solid #eef2ff' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ display: 'block', color: 'var(--navy)' }}>Class 2 Tuition</strong>
                              <span style={{ color: 'var(--muted)', fontSize: '9px' }}>{class2PaceLabel}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>${item.class2Base.toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {item.siblingDiscount > 0 ? (
                                <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '8px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                  Sibling (10%): -${(item.class2Base * 0.1).toFixed(2)}
                                </span>
                              ) : "-"}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--navy)' }}>${item.class2Final.toFixed(2)}</td>
                          </tr>
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

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Total Due Today</span>
              <strong style={{ fontSize: '32px', fontWeight: '900', color: '#c8102e', display: 'block', lineHeight: '1' }}>${quotePricing.firstMonthTotal.toFixed(2)}</strong>
            </div>

            <div className="tuition-description-block" style={{ fontSize: '11px', lineHeight: '1.5', color: 'var(--ink)', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #eef2ff', marginBottom: '24px' }}>
              Your first payment on the day you enroll is <strong>${quotePricing.firstMonthTotal.toFixed(2)}</strong>. This includes your first month&apos;s tuition of <strong>${quotePricing.totalTuition.toFixed(2)}</strong> plus a one-time annual enrollment fee of <strong>${quotePricing.totalRegistrationFees.toFixed(2)}</strong>.
              <br/><br/>
              Your ongoing monthly tuition will be <strong>${quotePricing.totalTuition.toFixed(2)}</strong> starting in your second month.
            </div>

            <button
              type="button"
              disabled={swimmers.length === 0}
              onClick={goToContact}
              className="wizard-next"
              style={{ width: '100%', padding: '14px', borderRadius: '99px', background: swimmers.length === 0 ? '#cbd5e1' : 'var(--blue)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '13px', cursor: swimmers.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              Continue to Spot Hold & Schedules &arr;
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="form-section-heading"><span>1</span><div><p>Parent or guardian</p><h2>Who should we contact?</h2></div></div>
          <div className="form-grid two-column">
            <label>First name<input className={showValidationErrors && !family.firstName.trim() ? "invalid-field" : ""} value={family.firstName} onChange={(event) => setFamily({ ...family, firstName: event.target.value })} autoComplete="given-name" required /></label>
            <label>Last name<input className={showValidationErrors && !family.lastName.trim() ? "invalid-field" : ""} value={family.lastName} onChange={(event) => setFamily({ ...family, lastName: event.target.value })} autoComplete="family-name" required /></label>
            <label>Email address<input className={showValidationErrors && !/\S+@\S+\.\S+/.test(family.email) ? "invalid-field" : ""} value={family.email} onChange={(event) => setFamily({ ...family, email: event.target.value })} type="email" autoComplete="email" required /></label>
            <label>Mobile phone<input className={showValidationErrors && family.phone.replace(/\D/g, "").length < 10 ? "invalid-field" : ""} value={family.phone} onChange={(event) => setFamily({ ...family, phone: formatPhone(event.target.value) })} type="tel" autoComplete="tel" inputMode="tel" required /></label>
          </div>
          
          <div className="form-section-heading swimmer-heading"><span>2</span><div><p>Swimmer profiles</p><h2>Tell us who will be swimming.</h2></div></div>
          <div className="swimmer-profile-list">
            {swimmers.map((swimmer, index) => (
              <article key={swimmer.id}>
                <header><span>{(index + 1)}</span><div><strong>{"Swimmer " + (index + 1)}</strong><small>{AGE_GROUPS.find((group) => group.id === swimmer.ageGroup)?.label}</small></div></header>
                <div className="form-grid three-column">
                  <label>First name<input className={showValidationErrors && !swimmer.firstName.trim() ? "invalid-field" : ""} value={swimmer.firstName} onChange={(event) => updateSwimmer(swimmer.id, { firstName: event.target.value })} required /></label>
                  <label>Date of Birth<input className={((showValidationErrors && !swimmer.dob) || (swimmer.dob && !validDob(swimmer.dob))) ? "invalid-field" : ""} value={swimmer.dob} onChange={(event) => updateSwimmer(swimmer.id, { dob: formatDob(event.target.value) })} onBlur={(event) => handleDobBlur(swimmer.id, event.target.value)} inputMode="numeric" autoComplete="bday" placeholder="MM/DD/YYYY" maxLength={10} required />{swimmer.dobMessage && <p className="dob-warning-text" style={{ gridColumn: 'span 3', margin: '4px 0 0', color: 'var(--red)', fontSize: '10px', fontWeight: '800' }}>{swimmer.dobMessage}</p>}</label>
                  <label>Gender
                    <select className={showValidationErrors && !swimmer.gender ? "invalid-field" : ""} value={swimmer.gender} onChange={(event) => updateSwimmer(swimmer.id, { gender: event.target.value })} required>
                      <option value="">Choose...</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>

          <div className="sms-consent-row">
            <label className="checkbox-consent">
              <input className={showValidationErrors && !family.smsConsent ? "invalid-field" : ""} checked={family.smsConsent} onChange={(event) => setFamily({ ...family, smsConsent: event.target.checked })} type="checkbox" required />
              <span>I consent to receive text messages from British Swim School at the mobile number provided above for scheduling and lesson coordination.</span>
            </label>
          </div>

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions">
            <button type="button" className="wizard-back" onClick={() => setStep(1)}>&larr; Back to Quote</button>
            <button type="button" className="wizard-next" onClick={goToLevels}>Continue to Placement Levels &arr;</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="form-section-heading"><span>3</span><div><p>Placement levels</p><h2>How comfortable is each swimmer?</h2></div></div>
          <p className="wizard-intro">We use these answers to match each swimmer with the correct skill level. Choose an option below.</p>
          <div className="swimmer-tabs">
            {swimmers.map((swimmer, index) => (
              <button key={swimmer.id} className={activeSwimmer === index ? "active" : ""} onClick={() => setActiveSwimmer(index)} type="button">
                <span>{(index + 1)}</span><strong>{swimmer.firstName || ("Swimmer " + (index + 1))}</strong>
              </button>
            ))}
          </div>

          {swimmers.map((swimmer, index) => {
            if (activeSwimmer !== index) return null;
            if (swimmer.ageGroup === "dolphin") return (
              <div key={swimmer.id} className="swimmer-placement-flow" style={{ textAlign: 'center', padding: '24px', background: '#fafbfe', border: '1px solid #eef2ff', borderRadius: '16px' }}>
                <strong style={{ color: 'var(--navy)', fontSize: '15px' }}>Dolphin Level Assigned</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Swimmers in the Adaptive/Special Needs program are automatically placed in our Dolphin curriculum.</p>
              </div>
            );
            return (
              <div key={swimmer.id} className="swimmer-placement-flow">
                <div className="placement-mode-choice">
                  <button type="button" className={swimmer.placementMode === "known" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { placementMode: "known", selectedLevel: "" })}>
                    <strong>Choose level</strong>
                    <small>I know their British Swim School level</small>
                  </button>
                  <button type="button" className={swimmer.placementMode === "assessment" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { placementMode: "assessment", adaptive: "", firstProgram: "", comfortable: "", floatUnassisted: "", jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "", treadMinute: "", fourStrokes: "" })}>
                    <strong>Estimate level</strong>
                    <small>Answer a few questions about skills</small>
                  </button>
                </div>

                {swimmer.placementMode === "known" && (
                  <div className="known-level-selector">
                    <label>
                      Select level
                      <select value={swimmer.selectedLevel} onChange={(event) => updateSwimmer(swimmer.id, { selectedLevel: event.target.value })} required>
                        <option value="">Choose...</option>
                        <optgroup label="Known level">
                          {LEVELS[swimmer.ageGroup]
                            .filter(level => level !== "Dolphin" || swimmer.adaptive === "yes")
                            .map((level) => <option key={level} value={level}>{getLevelDisplay(level)}</option>)}
                        </optgroup>
                      </select>
                    </label>
                  </div>
                )}

                {swimmer.placementMode === "assessment" && (
                  <div className="assessment-questions">
                    <label className="question-item">
                      <span>Would adaptive or special-needs lessons be the best fit?</span>
                      <div className="radio-row">
                        <button type="button" className={swimmer.adaptive === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { adaptive: "yes" })}>Yes</button>
                        <button type="button" className={swimmer.adaptive === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { adaptive: "no" })}>No</button>
                      </div>
                    </label>

                    {swimmer.adaptive === "no" && (
                      <>
                        <label className="question-item">
                          <span>{"Is this the swimmer&apos;s first structured program?"}</span>
                          <div className="radio-row">
                            <button type="button" className={swimmer.firstProgram === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { firstProgram: "yes" })}>Yes</button>
                            <button type="button" className={swimmer.firstProgram === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { firstProgram: "no" })}>No</button>
                          </div>
                        </label>

                        {swimmer.firstProgram === "no" && (
                          <label className="question-item">
                            <span>Is the swimmer comfortable putting their face in the water?</span>
                            <div className="radio-row">
                              <button type="button" className={swimmer.comfortable === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { comfortable: "yes" })}>Yes</button>
                              <button type="button" className={swimmer.comfortable === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { comfortable: "no" })}>No</button>
                            </div>
                          </label>
                        )}

                        {swimmer.comfortable === "yes" && (
                          <label className="question-item">
                            <span>Can the swimmer float on their back unassisted?</span>
                            <div className="radio-row">
                              <button type="button" className={swimmer.floatUnassisted === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { floatUnassisted: "yes" })}>Yes</button>
                              <button type="button" className={swimmer.floatUnassisted === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { floatUnassisted: "no" })}>No</button>
                            </div>
                          </label>
                        )}

                        {swimmer.floatUnassisted === "yes" && swimmer.ageGroup !== "under3" && (
                          <label className="question-item">
                            <span>Can the swimmer swim 10 yards with face in water?</span>
                            <div className="radio-row">
                              <button type="button" className={swimmer.swimTenYards === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { swimTenYards: "yes" })}>Yes</button>
                              <button type="button" className={swimmer.swimTenYards === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { swimTenYards: "no" })}>No</button>
                            </div>
                          </label>
                        )}

                        {swimmer.swimTenYards === "yes" && swimmer.ageGroup === "child" && (
                          <label className="question-item">
                            <span>Can they tread water for 1 minute?</span>
                            <div className="radio-row">
                              <button type="button" className={swimmer.treadMinute === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { treadMinute: "yes" })}>Yes</button>
                              <button type="button" className={swimmer.treadMinute === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { treadMinute: "no" })}>No</button>
                            </div>
                          </label>
                        )}

                        {swimmer.treadMinute === "yes" && swimmer.ageGroup === "child" && (
                          <label className="question-item">
                            <span>Can they swim four distinct strokes (Freestyle, Backstroke, Breaststroke, Butterfly)?</span>
                            <div className="radio-row">
                              <button type="button" className={swimmer.fourStrokes === "yes" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { fourStrokes: "yes" })}>Yes</button>
                              <button type="button" className={swimmer.fourStrokes === "no" ? "selected" : ""} onClick={() => updateSwimmer(swimmer.id, { fourStrokes: "no" })}>No</button>
                            </div>
                          </label>
                        )}
                      </>
                    )}

                    {startingLevel(swimmer) && (
                      <div className="placement-result-preview">
                        <span>Starting level estimate</span>
                        <strong>{startingLevel(swimmer)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions">
            <button type="button" className="wizard-back" onClick={() => setStep(2)}>&larr; Back</button>
            <button type="button" className="wizard-next" onClick={goToPools}>Choose Pools & Days &arr;</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="form-section-heading"><span>4</span><div><p>Pool choices</p><h2>Where would you like to swim?</h2></div></div>
          <p className="wizard-intro">Choose locations and preferred days of the week. We will find matching classes for you.</p>
          
          <div className="class-preference-list">
            {swimmers.map((swimmer) => {
              const locationsArray = swimmer.location ? swimmer.location.split(",").filter(Boolean) : [];
              const availableDaysSet = new Set();
              locationsArray.forEach((locId) => {
                const days = LOCATION_DAYS[locId] || [];
                days.forEach((day) => availableDaysSet.add(day));
              });
              const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
              const availableDays = dayOrder.filter((day) => availableDaysSet.has(day));



              const selectedNames = swimmer.location ? LOCATIONS.find(l => l.id === swimmer.location)?.name || "" : "";
              const preferredArray = swimmer.preferredSchedule ? swimmer.preferredSchedule.split(",").map(d => d.trim()).filter(Boolean) : [];

              return (
                <article key={swimmer.id}>
                  <header><div><strong>{swimmer.firstName}</strong><small>{startingLevel(swimmer)}</small></div><span>Starting level</span></header>
                  
                  <div className="pool-choices">
                    {LOCATIONS.map((location) => {
                      const isSelected = swimmer.location === location.id;
                      return (
                        <label key={location.id} className={isSelected ? "selected" : ""} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', border: '1px solid #dce3ef', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer' }}>
                          <input type="radio" name={"location_" + swimmer.id} checked={isSelected} onChange={() => updateSwimmer(swimmer.id, { location: location.id, preferredSchedule: "" })} style={{ width: '18px', height: '18px' }} />
                          <strong style={{ fontSize: '15px', color: 'var(--navy)' }}>{location.name} - {location.detail}</strong>
                        </label>
                      );
                    })}
                  </div>

                  {locationsArray.length > 0 && availableDays.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preferred Days (Select all that fit)</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {availableDays.map((day) => {
                          const isDaySelected = preferredArray.includes(day);
                          const toggleDay = () => {
                            let nextPreferred;
                            if (preferredArray.includes(day)) {
                              nextPreferred = preferredArray.filter(d => d !== day);
                            } else {
                              nextPreferred = [...preferredArray, day];
                            }
                            updateSwimmer(swimmer.id, { preferredSchedule: nextPreferred.join(", ") });
                          };
                          return (
                            <button
                              key={day}
                              type="button"
                              className={"day-button " + (isDaySelected ? "selected" : "")}
                              onClick={toggleDay}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <label className="schedule-note" style={{ marginTop: '16px' }}>Additional preferences <span>optional</span>
                    <input value={swimmer.preferredSchedule} onChange={(event) => updateSwimmer(swimmer.id, { preferredSchedule: event.target.value })} placeholder="Example: after 5:00 PM or Saturday mornings" />
                  </label>

                  {locationsArray.length > 0 && (
                    <p className="availability-note">
                      <span>Live class match</span>
                      Our team will confirm openings for {startingLevel(swimmer)} at {selectedNames}. {locationsArray.map((locId, idx) => {
                        const loc = LOCATIONS.find(l => l.id === locId);
                        if (!loc) return null;
                        return (
                          <span key={locId} style={{ display: 'inline-block', marginLeft: '6px' }}>
                            <a href={loc.href} target="_blank" rel="noreferrer">View {loc.name} schedule &rarr;</a>{idx < locationsArray.length - 1 ? ',' : ''}
                          </span>
                        );
                      })}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="form-section-heading swimmer-heading"><span>5</span><div><p>Referral</p><h2>How did you hear about us?</h2></div></div>
          <div className="form-grid two-column">
            <label>Referral source
              <select value={referral.source} onChange={(event) => setReferral({ ...referral, source: event.target.value })} required>
                <option value="">Choose...</option>
                <option value="Google Search">Google Search</option>
                <option value="Facebook/Instagram">Facebook/Instagram</option>
                <option value="Word of Mouth / Referral">Word of Mouth / Referral</option>
                <option value="Drive By / Location Signs">Drive By / Location Signs</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {referral.source === "Word of Mouth / Referral" && (
              <label>{"Referred by (friend&apos;s name)"}<input value={referral.friendName} onChange={(event) => setReferral({ ...referral, friendName: event.target.value })} placeholder={"Friend&apos;s full name"} required /></label>
            )}

            {referral.source === "Other" && (
              <label>Details<input value={referral.other} onChange={(event) => setReferral({ ...referral, other: event.target.value })} placeholder="How you found us" required /></label>
            )}
          </div>

          {message && <p className="form-error" role="alert">{message}</p>}

          <div className="wizard-actions">
            <button type="button" className="wizard-back" onClick={() => setStep(3)}>&larr; Back</button>
            <button type="button" className="wizard-next" onClick={goToReview}>Review my details &arr;</button>
          </div>
        </>
      )}

      {step === 5 && !handedOff && (
        <>
          <div className="form-section-heading"><span>5</span><div><p>Review</p><h2>Everything we need to help your family.</h2></div></div>
          
          <div className="review-family">
            <strong>{family.firstName} {family.lastName}</strong>
            <span>{family.email} · {family.phone}</span>
          </div>

          <div className="review-swimmers">
            {swimmers.map((swimmer) => (
              <article key={swimmer.id}>
                <header>
                  <div>
                    <strong>{swimmer.firstName}</strong>
                    <small>{swimmer.dob} · {swimmer.gender}</small>
                  </div>
                  <b>{startingLevel(swimmer)}</b>
                </header>
                <p>
                  {swimmer.location ? swimmer.location.split(",").map(id => LOCATIONS.find(l => l.id === id)?.name).filter(Boolean).join(", ") : "No location selected"}
                  {swimmer.preferredSchedule ? " · " + swimmer.preferredSchedule : ""}
                </p>
              </article>
            ))}
          </div>

          <div className="review-referral">
            <span>How you heard about us</span>
            <strong>{referral.source}{referral.friendName ? " · Referred by " + referral.friendName : referral.other ? " · " + referral.other : ""}</strong>
          </div>

          <div className="coordinated-section">
            <h3>Class Openings Found</h3>
            {loadingOpenings ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Searching live pool schedules...</p>
            ) : coordinatedMatches.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No direct openings found for the selected criteria. Our team will manually check other options and text you.</p>
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
                      {match.classes.map((cls, cIdx) => (
                        <div className="match-class-item" key={cIdx}>
                          <span className="class-info-line">
                            <strong>{cls.swimmerName}</strong>: {cls.level} with Coach {getInstructorName(cls.classObj)}
                          </span>
                          <a
                            className="register-btn"
                            href={getPreciseRegisterUrl(cls.classObj, cls.level, cls.classObj.location_code)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Book Class ↗
                          </a>
                        </div>
                      ))}
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

          <form onSubmit={onSubmit} style={{ marginTop: '24px' }}>
            <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
            {message && <p className="form-error" role="alert">{message}</p>}
            
            <div className="wizard-actions">
              <button type="button" className="wizard-back" onClick={() => setStep(4)}>&larr; Back</button>
              <button type="submit" className="wizard-submit">Request Call & Book Spots &arr;</button>
            </div>
          </form>
        </>
      )}

      {handedOff && (
        <div className="wizard-handoff" style={{ background: '#fff', border: '1px solid #dce3ef', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginBottom: '8px' }}>✓ Request Received!</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>We have logged your request. You can copy the request summary below to text it directly to our office.</p>
          
          <textarea
            value={composed}
            readOnly
            style={{ width: '100%', height: '140px', padding: '12px', border: '1px solid #dce3ef', borderRadius: '12px', fontSize: '12px', fontFamily: 'monospace', resize: 'none', background: '#fafbfe', marginBottom: '16px' }}
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={copyToClipboard}
              style={{ padding: '12px 24px', borderRadius: '99px', background: 'var(--navy)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
            >
              {copied ? "Copied!" : "Copy Summary"}
            </button>
            {onMobile ? (
              <a
                href={"sms:" + SCHOOL_SMS + "?body=" + encodeURIComponent(composed)}
                style={{ padding: '12px 24px', borderRadius: '99px', background: 'var(--blue)', color: '#fff', textDecoration: 'none', fontWeight: '800', fontSize: '13px' }}
              >
                Send Text Message
              </a>
            ) : (
              <a
                href={"mailto:" + SCHOOL_EMAIL + "?subject=Class Help Request&body=" + encodeURIComponent(composed)}
                style={{ padding: '12px 24px', borderRadius: '99px', background: 'var(--blue)', color: '#fff', textDecoration: 'none', fontWeight: '800', fontSize: '13px' }}
              >
                Send Email
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
