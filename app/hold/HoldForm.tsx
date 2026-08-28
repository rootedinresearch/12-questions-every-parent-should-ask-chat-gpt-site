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
  "Tadpole 6:1": "This is the 1st of 3 survival levels where we start to build the independent backfloat and gentle jump into the pool so babies and toddlers learn to save themselves if they ever fall into water.",
  "Swimboree 4:1": "This is the 2nd of 3 survival levels where we continue building the independent backfloat and jump into the pool, but also start working on rolling over if they fall face-first into the water. We also transition students to work directly with our instructors so parents can step out of the water in the next level.",
  "Seahorse 4:1": "This is the 3rd of 3 survival levels where we combine the first two levels' skills into one full movement: jumping into the pool, rolling over to float, then swimming or climbing out to safety. This is a much smaller class size (4:1) with the parent out of the water. Once they turn 3 or master these skills, they graduate to Starfish or Minnow.",
  "Starfish 4:1": "This is the 1st of 3 survival levels for kids over 3 where we conquer water hesitation, teach relaxed breath control, and build the independent backfloat so your child has the foundation to stay safe around water.",
  "Minnow 4:1": "This is the 2nd of 3 survival levels where we lock in the 20-second independent backfloat, teach unassisted rollovers when submerged, and introduce flutter kicks and elementary backstroke to move through the water.",
  "Turtle 1 4:1": "This is the 3rd of 3 survival levels where we combine all survival skills into one continuous sequence: jump in, roll onto the back, float for 20+ seconds, and swim to safety using elementary strokes and freestyle. Mastering this makes your child a certified 'Safer Swimmer' ready for stroke development.",
  "Turtle 2 6:1": "This is the 1st of 4 stroke development levels where we transition from survival to technical swimming. This level serves as swim team prep, focusing on perfecting high-elbow freestyle and backstroke with proper rotary side-breathing techniques.",
  "Shark 1": "This is the 2nd of 4 stroke development levels and continues swim team prep. Now that freestyle and backstroke are mastered, we introduce the breaststroke (pull-breathe-kick-glide) and butterfly (dolphin kick and arm recovery).",
  "Shark 2": "This is the 3rd of 4 stroke development levels and the final stage of swim team prep. We refine all four competitive strokes (Freestyle, Backstroke, Breaststroke, Butterfly) and introduce flip turns, open turns, and streamlined starts.",
  "Barracuda": "This is our pre-swim team program divided into three progressive tiers. It functions like a competitive swim team practice where we focus on advanced distance, speed, pace clock intervals, and IM transitions to prepare swimmers to try out for any club or school team.",
  "Young Adult 1": "Beginner survival level for teens. Focuses on water comfort, independent back floating, and core safety fundamentals.",
  "Young Adult 2": "Moves from survival basics into stroke mechanics, building continuous freestyle, backstroke, and aerobic stamina.",
  "Young Adult 3": "Advanced teen level refining all four strokes, starts, turns, and endurance for fitness or competitive teams.",
  "Adult 1": "Beginner survival level for adults. Focuses on conquering hesitation, breath control, and independent back floating in a supportive setting.",
  "Adult 2": "Transitions from survival into stroke development, focusing on continuous freestyle and backstroke for fitness and leisure.",
  "Adult 3": "Advanced adult swimming for stroke refinement, flip turns, endurance lap swimming, and triathlon training.",
  "Dolphin": "This is our specialized program for swimmers with auxiliary or sensory needs. We focus on water acclimation and survival skills at the student's own pace. Offered as a private or semi-private lesson to ensure the highest safety and progress."
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

interface UnifiedHeroQuestion {
  title: string;
  subtitle: string;
  isComplete: boolean;
  stepNum: number;
  totalSteps: number;
  activeKey: keyof Swimmer | "complete";
  swimmerKeys: Record<string, keyof Swimmer | "complete">;
}

function getUnifiedHeroQuestion(swimmers: Swimmer[]): UnifiedHeroQuestion {
  const pending = swimmers.filter(s => !isPlacementComplete(s) && s.ageGroup !== "dolphin");
  if (pending.length === 0) {
    return {
      title: "Placement Levels Complete!",
      subtitle: "Review your starting level estimates below or proceed to choose your preferred location & days.",
      isComplete: true,
      stepNum: 0,
      totalSteps: 0,
      activeKey: "complete",
      swimmerKeys: {}
    };
  }

  // Precedence list of screening stages
  const STAGE_ORDER: Array<{
    key: keyof Swimmer;
    collectiveTitle: string;
    stepNum: number;
    totalSteps: number;
  }> = [
    { key: "adaptive", collectiveTitle: "Do any swimmers need a modified or adaptive lesson?", stepNum: 1, totalSteps: 6 },
    { key: "firstProgram", collectiveTitle: "Is this their first time in structured swim lessons?", stepNum: 2, totalSteps: 6 },
    { key: "comfortable", collectiveTitle: "Are they comfortable in the water and able to submerge their head?", stepNum: 3, totalSteps: 6 },
    { key: "floatUnassisted", collectiveTitle: "Can they float on their back unassisted without a life vest?", stepNum: 4, totalSteps: 6 },
    { key: "separateCaregiver", collectiveTitle: "Can they separate from parent/caregiver and work directly with instructors?", stepNum: 4, totalSteps: 6 },
    { key: "faceInWater", collectiveTitle: "Can they put their face in the water and hold their breath?", stepNum: 4, totalSteps: 6 },
    { key: "jumpRollFloat", collectiveTitle: "Are they able to jump in, roll over and float without assistance?", stepNum: 5, totalSteps: 6 },
    { key: "swimTenYardsSideBreath", collectiveTitle: "Can they swim 10 yards of freestyle and backstroke with face in water & side breath?", stepNum: 5, totalSteps: 6 },
    { key: "treadMinute", collectiveTitle: "Can they tread water for 1 minute?", stepNum: 5, totalSteps: 6 },
    { key: "waitTurn", collectiveTitle: "Can they sit on the edge of the pool and wait independently for their turn?", stepNum: 5, totalSteps: 6 },
    { key: "swimFreestyleBackstroke", collectiveTitle: "Can they swim freestyle and backstroke with their arms out of the water?", stepNum: 6, totalSteps: 6 },
  ];

  // Find active stage: first stage where at least one pending swimmer has it as their current question
  let activeStage = STAGE_ORDER[0];
  let found = false;

  for (const stage of STAGE_ORDER) {
    const hasPendingSwimmerForStage = pending.some(s => {
      const q = getNextQuestion(s);
      return q && q.key === stage.key;
    });
    if (hasPendingSwimmerForStage) {
      activeStage = stage;
      found = true;
      break;
    }
  }

  if (!found) {
    const firstPendingQ = getNextQuestion(pending[0]);
    if (firstPendingQ) {
      const matchingStage = STAGE_ORDER.find(st => st.key === firstPendingQ.key);
      if (matchingStage) activeStage = matchingStage;
    }
  }

  const activeKey = activeStage.key;

  // Build map of what question key each pending swimmer is answering in this round
  const swimmerKeys: Record<string, keyof Swimmer> = {};
  pending.forEach(s => {
    const nextQ = getNextQuestion(s);
    if (nextQ && nextQ.key === activeKey) {
      swimmerKeys[s.id] = activeKey;
    } else if (s[activeKey] !== undefined && s[activeKey] !== "") {
      swimmerKeys[s.id] = activeKey;
    } else if (nextQ) {
      swimmerKeys[s.id] = nextQ.key;
    }
  });

  const swimmersOnActive = pending.filter(s => swimmerKeys[s.id] === activeKey);
  const singlePending = swimmersOnActive.length === 1 || pending.length === 1;
  const rawName = singlePending && pending[0]?.firstName ? pending[0].firstName.trim() : "";

  let title = activeStage.collectiveTitle;
  let subtitle = singlePending && rawName ? `Answering for ${rawName}:` : "Select Yes or No for each swimmer below:";

  if (singlePending && rawName) {
    const singleQ = getNextQuestion(pending[0]);
    if (singleQ) {
      title = singleQ.text;
    }
  }

  return {
    title,
    subtitle,
    isComplete: false,
    stepNum: activeStage.stepNum,
    totalSteps: activeStage.totalSteps,
    activeKey,
    swimmerKeys
  };
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

function formatMinutesTo12h(totalMinutes: number): string {
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, "0");
  return h + ":" + mm + " " + ampm;
}

function formatTime12h(timeStr: string): string {
  if (!timeStr) return "";
  if (!timeStr.includes(":")) {
    const totalMin = parseInt(timeStr, 10);
    if (!isNaN(totalMin)) return formatMinutesTo12h(totalMin);
    return timeStr;
  }
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
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
  matchedClasses: { swimmerName: string; level: string; classObj: JackrabbitClass }[],
  locCode: string,
  family?: { firstName: string; lastName: string; email: string; phone: string; smsConsent: boolean },
  referral?: { source: string; friendName: string; other: string },
  allSwimmers?: Swimmer[],
  comments?: string
): string {
  const finalLoc = (locCode === "LAFGP" || locCode === "gp") ? "LAFGP" : ((locCode === "LAFLITT" || locCode === "arl") ? "LAFLITT" : "MAN24H");
  
  const baseUrl = "https://app.jackrabbitclass.com/reg.asp";
  const params = new URLSearchParams();
  params.set("id", "553758");
  params.set("loc", finalLoc);

  // Extract valid Jackrabbit class IDs
  const classIds = matchedClasses
    .map(c => c.classObj.id)
    .filter(id => id && String(id).length > 4);

  if (classIds.length > 0) {
    // Primary class ID parameter
    params.set("preLoadClassID", String(classIds[0]));
    params.set("ClassID", String(classIds[0]));
  }

  // Pre-populate Parent / Primary Caregiver details
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

  // Pre-populate EVERY Swimmer and Sibling (S1, S2, S3, S4, etc.)
  const swimmersToPopulate = (allSwimmers && allSwimmers.length > 0)
    ? allSwimmers
    : matchedClasses.map((mc, idx) => ({
        id: `swimmer_${idx + 1}`,
        firstName: mc.swimmerName,
        dob: "",
        gender: "",
        ageGroup: "child" as const,
        placementMode: "assessment",
        selectedLevel: mc.level,
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
        location: locCode,
        preferredSchedule: "",
        pace: "foundation"
      }));

  swimmersToPopulate.forEach((swimmer, idx) => {
    const prefix = `S${idx + 1}`;
    const fallbackName = `Swimmer ${idx + 1}`;
    const name = swimmer.firstName?.trim() || fallbackName;
    params.set(`${prefix}FName`, name);
    params.set(`${prefix}LName`, family?.lastName?.trim() || "Family");
    if (swimmer.gender) {
      const g = swimmer.gender.trim();
      params.set(`${prefix}Gender`, g.toLowerCase().startsWith("f") ? "Female" : (g.toLowerCase().startsWith("m") ? "Male" : g));
    }
    if (swimmer.dob) {
      params.set(`${prefix}BDate`, smartFormatDob(swimmer.dob).trim());
    }
    if (swimmer.adaptive === "yes" || swimmer.ageGroup === "dolphin") {
      params.set(`${prefix}SpecNeeds`, "Y");
    }

    // Attach specific class ID to each sibling (S1ClassID, S2ClassID, S3ClassID, S1preLoadClassID, S2preLoadClassID...)
    const matchedCls = matchedClasses[idx];
    if (matchedCls && matchedCls.classObj && matchedCls.classObj.id) {
      const cId = String(matchedCls.classObj.id);
      params.set(`${prefix}ClassID`, cId);
      params.set(`${prefix}preLoadClassID`, cId);
      params.set(`preLoadClassID${idx + 1}`, cId);
      params.set(`ClassID${idx + 1}`, cId);
    }
  });

  // Build explicit comments outlining each swimmer's coordinated level, day, and time
  const classBreakdown = matchedClasses.map((mc, idx) => {
    const sName = mc.swimmerName || `Swimmer ${idx + 1}`;
    const time = formatTime12h(mc.classObj.start_time);
    const cleanLevel = mc.level.replace(/\s*\d+:\d+$/, "");
    return `${sName}: ${cleanLevel} at ${time} (Class #${mc.classObj.id})`;
  }).join(" | ");

  const combinedComments = [
    comments,
    `Coordinated Classes: ${classBreakdown}`
  ].filter(Boolean).join(" -- ");

  params.set("Comments", combinedComments.slice(0, 480));

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
    if (!levelsValid) {
      return setMessage("Please answer all placement questions to identify the starting level for each swimmer before proceeding.");
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

  const [expandedNearbyIndex, setExpandedNearbyIndex] = useState<number | null>(null);

  interface CoordinatedMatch {
    type: "same-time" | "back-to-back" | "same-day" | "individual";
    day: string;
    timeLabel: string;
    locationName: string;
    locationCode: string;
    classes: { swimmerName: string; level: string; classObj: JackrabbitClass }[];
    score: number;
  }

  function findMatchesForLocationList(
    targetLocIds: string[],
    daysRestrict: string[],
    strictDays: boolean
  ): CoordinatedMatch[] {
    if (openings.length === 0 || swimmers.length === 0) return [];

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
      
      const matchedClasses = openings.filter(c => {
        const levelMatch = matchClassLevel(c, swimmerLevel);
        const locId = getLocationIdFromCode(c.location_code);
        if (!locId || !targetLocIds.includes(locId)) return false;

        if (strictDays && daysRestrict.length > 0) {
          const locDaysForThisLoc = daysRestrict
            .filter(item => item.startsWith(locId + ":"))
            .map(item => item.split(":")[1].toLowerCase());

          if (locDaysForThisLoc.length > 0) {
            const m = c.meeting_days || {};
            const daysMap: Record<string, boolean> = {
              monday: m.mon,
              tuesday: m.tue,
              wednesday: m.wed,
              thursday: m.thu,
              friday: m.fri,
              saturday: m.sat,
              sunday: m.sun
            };
            if (!locDaysForThisLoc.some(d => daysMap[d])) return false;
          }
        }
        
        const name = (c.name || "").toLowerCase();
        const room = (c.room || "").toLowerCase();
        const isPlaceholder = room.includes("future") || room.includes("hold") || room.includes("run") || name.includes("future") || name.includes("available for any lesson") || name.includes("manager on duty") || name.includes("staff meeting") || name.includes("convenience fee");
        const hasOpenings = getOpeningsCount(c) >= 1;
        
        return levelMatch && !isPlaceholder && hasOpenings;
      });

      return {
        swimmer,
        defaultName: swimmer.firstName ? swimmer.firstName.trim() : ("Swimmer " + (idx + 1)),
        matchedClasses
      };
    });

    const dayWeight = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
    const matches: CoordinatedMatch[] = [];

    if (swimmers.length === 1) {
      const { swimmer, defaultName, matchedClasses } = swimmersWithFilteredClasses[0];
      matchedClasses.forEach(c => {
        const days = Object.keys(c.meeting_days).filter(k => c.meeting_days[k as keyof typeof c.meeting_days]);
        const locId = getLocationIdFromCode(c.location_code);
        const locObj = LOCATIONS.find(l => l.id === locId);
        const friendlyLocName = locObj ? `${locObj.name} (${locObj.detail})` : (c.location || "");

        days.forEach(d => {
          matches.push({
            type: "individual",
            day: dayLabels[d] || d,
            timeLabel: formatTime12h(c.start_time),
            locationName: friendlyLocName,
            locationCode: c.location_code,
            classes: [{ swimmerName: defaultName, level: startingLevel(swimmer), classObj: c }],
            score: 10
          });
        });
      });
    } else {
      targetLocIds.forEach(locId => {
        const locObj = LOCATIONS.find(l => l.id === locId);
        const friendlyLocName = locObj ? `${locObj.name} (${locObj.detail})` : locId;
        const targetLocCode = locId === "grandPrairie" ? "LAFGP" : (locId === "arlington" ? "LAFLITT" : "MAN24H");

        daysOfWeek.forEach(dayKey => {
          const swimmerClassesAtSlot = swimmersWithFilteredClasses.map(s => {
            return {
              swimmer: s.swimmer,
              defaultName: s.defaultName,
              classes: s.matchedClasses.filter(c => c.location_code === targetLocCode && c.meeting_days[dayKey as keyof typeof c.meeting_days])
            };
          });

          if (swimmers.length === 2) {
            const s1 = swimmerClassesAtSlot[0];
            const s2 = swimmerClassesAtSlot[1];

            s1.classes.forEach(c1 => {
              s2.classes.forEach(c2 => {
                if (c1.id === c2.id && getOpeningsCount(c1) < 2) return;

                const t1 = parseTimeToMinutes(c1.start_time);
                const t2 = parseTimeToMinutes(c2.start_time);
                
                if (t1 === t2) {
                  matches.push({
                    type: "same-time",
                    day: dayLabels[dayKey],
                    timeLabel: formatTime12h(c1.start_time),
                    locationName: friendlyLocName,
                    locationCode: targetLocCode,
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
                    locationName: friendlyLocName,
                    locationCode: targetLocCode,
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
          } else if (swimmers.length >= 3) {
            const s1 = swimmerClassesAtSlot[0];
            const s2 = swimmerClassesAtSlot[1];
            const s3 = swimmerClassesAtSlot[2];

            s1.classes.forEach(c1 => {
              s2.classes.forEach(c2 => {
                s3.classes.forEach(c3 => {
                  const t1 = parseTimeToMinutes(c1.start_time);
                  const t2 = parseTimeToMinutes(c2.start_time);
                  const t3 = parseTimeToMinutes(c3.start_time);
                  
                  const times = [t1, t2, t3];
                  const uniqueTimes = Array.from(new Set(times)).sort((a, b) => a - b);
                  const isContiguous30Min = uniqueTimes.every((t, i) => i === 0 || t - uniqueTimes[i - 1] === 30);

                  if (uniqueTimes.length === 1) {
                    matches.push({
                      type: "same-time",
                      day: dayLabels[dayKey],
                      timeLabel: formatTime12h(c1.start_time),
                      locationName: friendlyLocName,
                      locationCode: targetLocCode,
                      classes: [
                        { swimmerName: s1.defaultName, level: startingLevel(s1.swimmer), classObj: c1 },
                        { swimmerName: s2.defaultName, level: startingLevel(s2.swimmer), classObj: c2 },
                        { swimmerName: s3.defaultName, level: startingLevel(s3.swimmer), classObj: c3 }
                      ],
                      score: 120
                    });
                  } else if (isContiguous30Min && (uniqueTimes.length === 2 || uniqueTimes.length === 3)) {
                    // Contiguous 30-minute lessons with no gaps between them
                    const sortedClassEntries = [
                      { swimmerName: s1.defaultName, level: startingLevel(s1.swimmer), classObj: c1, time: t1 },
                      { swimmerName: s2.defaultName, level: startingLevel(s2.swimmer), classObj: c2, time: t2 },
                      { swimmerName: s3.defaultName, level: startingLevel(s3.swimmer), classObj: c3, time: t3 }
                    ].sort((a, b) => a.time - b.time).map(({ swimmerName, level, classObj }) => ({ swimmerName, level, classObj }));

                    const timeRangeStr = uniqueTimes.length === 2
                      ? `${formatMinutesTo12h(uniqueTimes[0])} & ${formatMinutesTo12h(uniqueTimes[1])}`
                      : `${formatMinutesTo12h(uniqueTimes[0])} – ${formatMinutesTo12h(uniqueTimes[uniqueTimes.length - 1])}`;

                    matches.push({
                      type: "back-to-back",
                      day: dayLabels[dayKey],
                      timeLabel: timeRangeStr,
                      locationName: friendlyLocName,
                      locationCode: targetLocCode,
                      classes: sortedClassEntries,
                      score: 60
                    });
                  }
                });
              });
            });
          }
        });
      });
    }

    // Deduplicate
    const slotMap = new Map<string, CoordinatedMatch>();
    matches.forEach(m => {
      const slotKey = `${m.locationName}|${m.day}|${m.timeLabel}|${m.type}`;
      const totalOpenings = m.classes.reduce((sum, c) => sum + getOpeningsCount(c.classObj), 0);
      const existing = slotMap.get(slotKey);
      if (!existing || totalOpenings > existing.classes.reduce((sum, c) => sum + getOpeningsCount(c.classObj), 0)) {
        slotMap.set(slotKey, m);
      }
    });

    return Array.from(slotMap.values()).sort((a, b) => {
      const dayA = dayWeight[a.day as keyof typeof dayWeight] || 0;
      const dayB = dayWeight[b.day as keyof typeof dayWeight] || 0;
      if (dayA !== dayB) return dayA - dayB;
      const timeA = parseTimeToMinutes(a.classes[0].classObj.start_time);
      const timeB = parseTimeToMinutes(b.classes[0].classObj.start_time);
      if (timeA !== timeB) return timeA - timeB;
      return b.score - a.score;
    });
  }

  const primaryMatches = useMemo<CoordinatedMatch[]>(() => {
    const selected = familyLocationsArray.length > 0 ? familyLocationsArray : ["mansfield", "arlington", "grandPrairie"];
    return findMatchesForLocationList(selected, familySelectedLocationDays, true).slice(0, 10);
  }, [swimmers, openings, familyLocationsArray, familySelectedLocationDays]);

  const nearbyMatches = useMemo<CoordinatedMatch[]>(() => {
    if (familyLocationsArray.length === 0) return [];
    const otherLocIds = LOCATIONS.map(l => l.id).filter(id => !familyLocationsArray.includes(id));
    if (otherLocIds.length === 0) return [];
    return findMatchesForLocationList(otherLocIds, [], false).slice(0, 8);
  }, [swimmers, openings, familyLocationsArray]);

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
          { num: 2, label: "Swimmers" },
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

      {/* Simplified Persistent Shopping Cart & Live Pricing Bar */}
      {swimmers.length > 0 && (
        <div
          className="persistent-cart-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #102774 0%, #001f5c 100%)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '14px',
            margin: '14px 0 18px',
            boxShadow: '0 4px 14px rgba(16, 39, 116, 0.12)',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: '#ffffff'
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <span
              style={{
                background: '#e51d3b',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '900',
                padding: '3px 9px',
                borderRadius: '99px',
                letterSpacing: '0.04em'
              }}
            >
              {swimmers.length} {swimmers.length === 1 ? 'CLASS' : 'CLASSES'}
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <strong style={{ fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>
                ${quotePricing.totalTuition.toFixed(2)}
              </strong>
              <span style={{ fontSize: '11.5px', color: '#93c5fd', fontWeight: '700' }}>/mo</span>
            </div>
            <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '750' }}>
              ${quotePricing.firstMonthTotal.toFixed(2)} due today
            </span>
          </div>
        </div>
      )}

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
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)', marginBottom: '16px' }}>Tuition &amp; Enrollment Summary</h3>
            
            <div className="quote-table-wrapper">
              <table className="quote-table">
                <thead>
                  <tr>
                    <th className="quote-th quote-th-item">Line Item</th>
                    <th className="quote-th quote-th-orig">Original</th>
                    <th className="quote-th quote-th-disc">Discounts</th>
                    <th className="quote-th quote-th-final">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {quotePricing.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="quote-td-empty">
                        No swimmers selected
                      </td>
                    </tr>
                  ) : quotePricing.items.map((item, idx) => {
                    const isDolphin = item.ageGroup === "dolphin";
                    const isStandard = item.pace === "standard";
                    const isUnlimited = item.pace === "unlimited";
                    const isPrivate = item.pace === "dolphin_private";

                    return (
                      <Fragment key={item.swimmerId}>
                        <tr className="quote-group-row">
                          <td colSpan={4} className="quote-breakdown-hdr">
                            <span className="quote-hdr-bullet">●</span> {AGE_GROUPS.find(g => g.id === item.ageGroup)?.label || ("Swimmer " + (idx + 1))} — Tuition Breakdown
                          </td>
                        </tr>
                        {isDolphin ? (
                          <tr className="quote-item-row">
                            <td className="quote-td quote-td-item">
                              <strong className="quote-item-title">
                                {isPrivate ? "Adaptive Private (1x/wk)" : "Adaptive Semi-Private (1x/wk)"}
                              </strong>
                              <span className="quote-item-sub">
                                {isPrivate ? "1-on-1 adaptive lesson" : "Small group adaptive"}
                              </span>
                            </td>
                            <td className="quote-td quote-td-orig">${item.baseRate.toFixed(2)}</td>
                            <td className="quote-td quote-td-disc">
                              {item.siblingDiscount > 0 ? (
                                <span className="quote-discount-badge badge-sibling">
                                  Sibling (10%): -${item.siblingDiscount.toFixed(2)}
                                </span>
                              ) : "-"}
                            </td>
                            <td className="quote-td quote-td-final">${item.finalRate.toFixed(2)}</td>
                          </tr>
                        ) : (
                          <>
                            <tr className="quote-item-row">
                              <td className="quote-td quote-td-item">
                                <strong className="quote-item-title">Class 1 Tuition</strong>
                                <span className="quote-item-sub">Foundation Slot</span>
                              </td>
                              <td className="quote-td quote-td-orig">${item.class1Base.toFixed(2)}</td>
                              <td className="quote-td quote-td-disc">
                                {item.siblingDiscount > 0 ? (
                                  <span className="quote-discount-badge badge-sibling">
                                    Sibling (10%): -${(item.class1Base * 0.1).toFixed(2)}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="quote-td quote-td-final">${item.class1Final.toFixed(2)}</td>
                            </tr>

                            {(isStandard || isUnlimited) && (
                              <tr className="quote-item-row">
                                <td className="quote-td quote-td-item">
                                  <strong className="quote-item-title">Class 2 Tuition</strong>
                                  <span className="quote-item-sub">Bundle slot (Standard pace)</span>
                                </td>
                                <td className="quote-td quote-td-orig">${item.class2Base.toFixed(2)}</td>
                                <td className="quote-td quote-td-disc">
                                  <div className="quote-disc-stack">
                                    {item.class2BundleDiscount > 0 && (
                                      <span className="quote-discount-badge badge-bundle">
                                        2x/wk Bundle: -${item.class2BundleDiscount.toFixed(2)}
                                      </span>
                                    )}
                                    {item.siblingDiscount > 0 && item.class2BundledRate > 0 && (
                                      <span className="quote-discount-badge badge-sibling">
                                        Sibling (10%): -${(item.class2BundledRate * 0.1).toFixed(2)}
                                      </span>
                                    )}
                                    {item.class2BundleDiscount === 0 && item.siblingDiscount === 0 && "-"}
                                  </div>
                                </td>
                                <td className="quote-td quote-td-final">${item.class2Final.toFixed(2)}</td>
                              </tr>
                            )}

                            {isUnlimited && (
                              <tr className="quote-item-row">
                                <td className="quote-td quote-td-item">
                                  <strong className="quote-item-title">Unlimited Add-On</strong>
                                  <span className="quote-item-sub">Unlimited swimming</span>
                                </td>
                                <td className="quote-td quote-td-orig">${item.unlimitedAddonRate.toFixed(2)}</td>
                                <td className="quote-td quote-td-disc">
                                  {item.siblingDiscount > 0 ? (
                                    <span className="quote-discount-badge badge-sibling">
                                      Sibling (10%): -${(item.unlimitedAddonRate * 0.1).toFixed(2)}
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="quote-td quote-td-final">${item.unlimitedAddonFinal.toFixed(2)}</td>
                              </tr>
                            )}
                          </>
                        )}

                        <tr className="quote-item-row">
                          <td className="quote-td quote-td-item">
                            <strong className="quote-item-title">Registration Fee</strong>
                            <span className="quote-item-sub">Annual signup fee</span>
                          </td>
                          <td className="quote-td quote-td-orig">$49.99</td>
                          <td className="quote-td quote-td-disc">
                            {item.registrationDiscount > 0 ? (
                              <span className="quote-discount-badge badge-cap">
                                Sibling: -${item.registrationDiscount.toFixed(2)}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="quote-td quote-td-final">${item.registrationFee.toFixed(2)}</td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2-Box Summary: Ongoing Monthly Subscription (First) & Total Due Today (Second) */}
            <div className="quote-summary-boxes">
              <div className="quote-summary-box monthly-box">
                <span className="quote-summary-label blue-label">
                  Ongoing Monthly
                </span>
                <strong className="quote-summary-amount navy-amount">
                  ${quotePricing.totalTuition.toFixed(2)}<span className="quote-summary-per">/mo</span>
                </strong>
                <span className="quote-summary-sub">
                  Tuition starting month 2
                </span>
              </div>

              <div className="quote-summary-box today-box">
                <span className="quote-summary-label red-label">
                  Total Due Today
                </span>
                <strong className="quote-summary-amount red-amount">
                  ${quotePricing.firstMonthTotal.toFixed(2)}
                </strong>
                <span className="quote-summary-sub">
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
          <div className="form-section-heading"><span>1</span><div><p>Parent or guardian</p><h2>Primary Caregiver/Parent</h2></div></div>
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
            <label className="checkbox-consent" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                style={{ marginTop: '3px', flexShrink: 0, width: '18px', height: '18px', cursor: 'pointer' }}
                className={showValidationErrors && !family.smsConsent ? "invalid-field" : ""}
                checked={family.smsConsent}
                onChange={(event) => setFamily({ ...family, smsConsent: event.target.checked })}
                type="checkbox"
                required={ENFORCE_REQUIRED_FIELDS}
              />
              <span style={{ fontSize: '13px', lineHeight: '1.45', color: 'var(--ink)' }}>
                I consent to receive text messages from British Swim School at the mobile number provided above for scheduling and lesson coordination.
              </span>
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

      {step === 3 && (() => {
        const heroQ = getUnifiedHeroQuestion(swimmers);
        const allComplete = swimmers.every(s => isPlacementComplete(s));

        return (
          <>
            <div className="form-section-heading">
              <span>3</span>
              <div>
                <p>Placement levels</p>
                <h2>{allComplete ? "Placement Complete" : "Let's find the right starting level"}</h2>
              </div>
            </div>

            {/* Unified Question Hero Card with key-based slide animation */}
            <div
              key={heroQ.activeKey}
              className="unified-question-card question-slide-animate"
              style={{
                background: '#ffffff',
                border: '1.5px solid #dce4f0',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 6px 20px rgba(16, 39, 116, 0.05)',
                marginTop: '20px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Visual Breadcrumb Progress Stepper through the Questions */}
              {!allComplete && (
                <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    {Array.from({ length: heroQ.totalSteps }, (_, i) => {
                      const sNum = i + 1;
                      const isPast = sNum < heroQ.stepNum;
                      const isCurrent = sNum === heroQ.stepNum;
                      return (
                        <Fragment key={sNum}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <div
                              style={{
                                width: isCurrent ? '28px' : '24px',
                                height: isCurrent ? '28px' : '24px',
                                borderRadius: '50%',
                                background: isCurrent ? '#102774' : (isPast ? '#16a34a' : '#f1f5f9'),
                                color: isCurrent || isPast ? '#ffffff' : '#94a3b8',
                                border: isCurrent ? '2px solid #3b82f6' : (isPast ? 'none' : '1.5px solid #cbd5e1'),
                                fontSize: isCurrent ? '11px' : '10px',
                                fontWeight: '900',
                                display: 'grid',
                                placeItems: 'center',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(16, 39, 116, 0.12)' : 'none',
                                transition: 'all 0.25s ease'
                              }}
                            >
                              {isPast ? '✓' : sNum}
                            </div>
                          </div>
                          {sNum < heroQ.totalSteps && (
                            <div
                              style={{
                                flex: 1,
                                height: '3px',
                                borderRadius: '99px',
                                background: sNum < heroQ.stepNum ? '#16a34a' : '#e2e8f0',
                                transition: 'all 0.25s ease'
                              }}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="question-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  className="question-pill-tag"
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: 'var(--blue)',
                    background: '#e0e7ff',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {allComplete ? "Complete" : `Question ${heroQ.stepNum} of ${heroQ.totalSteps}`}
                </span>
                <span
                  className="question-step-count"
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {allComplete ? "All Levels Placed" : "Placement Assessment"}
                </span>
              </div>

              <h3
                className="unified-question-title"
                style={{
                  margin: '10px 0 6px',
                  fontSize: 'clamp(17px, 2.8vw, 22px)',
                  fontWeight: '850',
                  color: 'var(--navy)',
                  lineHeight: '1.3'
                }}
              >
                {heroQ.title}
              </h3>
              {heroQ.subtitle && (
                <p
                  className="unified-question-subtitle"
                  style={{
                    margin: '0 0 20px',
                    fontSize: '13px',
                    color: 'var(--muted)',
                    fontWeight: '600'
                  }}
                >
                  {heroQ.subtitle}
                </p>
              )}

              {/* Swimmer Rows List */}
              <div className="unified-swimmer-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {swimmers.map((swimmer, index) => {
                  const isComplete = isPlacementComplete(swimmer);
                  const level = startingLevel(swimmer);
                  const swimmerName = swimmer.firstName ? swimmer.firstName.trim() : ("Swimmer " + (index + 1));
                  const isDolphin = swimmer.ageGroup === "dolphin";
                  const currentKey: keyof Swimmer | "complete" = heroQ.swimmerKeys[swimmer.id] || heroQ.activeKey;
                  const isKeyForSwimmer = currentKey !== "complete";
                  const currentAnswer = isKeyForSwimmer ? swimmer[currentKey as keyof Swimmer] : "";

                  return (
                    <div
                      key={swimmer.id}
                      className={"unified-swimmer-row " + (isComplete ? "row-complete" : "row-active")}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 18px',
                        border: isComplete ? '1.5px solid #86efac' : (currentAnswer ? '1.5px solid #cbd5e1' : '1.5px solid #e2e8f0'),
                        borderRadius: '16px',
                        background: isComplete ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' : '#f8fafc',
                        gap: '14px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div className="unified-swimmer-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <span
                          className="unified-swimmer-badge"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'var(--navy)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '800',
                            display: 'grid',
                            placeItems: 'center',
                            flex: '0 0 auto'
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="unified-swimmer-info" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <strong
                            className="unified-swimmer-name"
                            style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: '800',
                              color: 'var(--navy)',
                              lineHeight: '1.2'
                            }}
                          >
                            {swimmerName}
                          </strong>
                          <span
                            className="unified-swimmer-age"
                            style={{
                              display: 'block',
                              fontSize: '11px',
                              color: 'var(--muted)',
                              fontWeight: '600',
                              marginTop: '2px'
                            }}
                          >
                            {AGE_GROUPS.find(g => g.id === swimmer.ageGroup)?.label}
                          </span>
                        </div>
                      </div>

                      <div className="unified-swimmer-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
                        {isDolphin ? (
                          <div className="unified-level-pill-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className="unified-level-pill dolphin-pill"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '99px',
                                background: '#eff6ff',
                                border: '1.5px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: '12px',
                                fontWeight: '900'
                              }}
                            >
                              Adaptive Curriculum
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--navy)' }}>Dolphin</span>
                          </div>
                        ) : isComplete ? (
                          <div className="unified-level-pill-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className="unified-level-pill"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '99px',
                                background: '#dcfce7',
                                border: '1.5px solid #86efac',
                                color: '#15803d',
                                fontSize: '12px',
                                fontWeight: '900',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ✓ {getLevelDisplay(level)}
                            </span>
                            {getRatio(level) && (
                              <span
                                className="unified-ratio-tag"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: '#eef6ff',
                                  border: '1px solid #d0e4ff',
                                  color: '#0056b3',
                                  fontSize: '10px',
                                  fontWeight: '750',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Ratio {getRatio(level)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="unified-reanswer-btn"
                              onClick={() => resetSwimmerQuestions(swimmer.id)}
                              style={{
                                background: 'transparent',
                                border: '0',
                                color: 'var(--muted)',
                                fontSize: '11px',
                                fontWeight: '700',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: '4px 6px'
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        ) : isKeyForSwimmer ? (
                          <div className="unified-action-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="unified-btn-pair" style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className={"unified-choice-btn choice-yes " + (currentAnswer === "yes" ? "selected" : "")}
                                onClick={() => handleQuestionAnswer(swimmer.id, currentKey as keyof Swimmer, "yes")}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 18px',
                                  borderRadius: '12px',
                                  border: currentAnswer === "yes" ? '1.5px solid #15803d' : '1.5px solid #cbd5e1',
                                  background: currentAnswer === "yes" ? '#16a34a' : '#ffffff',
                                  color: currentAnswer === "yes" ? '#ffffff' : 'var(--navy)',
                                  fontSize: '13px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  boxShadow: currentAnswer === "yes" ? '0 4px 12px rgba(22, 163, 74, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                  transform: currentAnswer === "yes" ? 'scale(1.02)' : 'scale(1)'
                                }}
                              >
                                <span className="btn-icon" style={{ fontSize: '13px', fontWeight: '900' }}>✓</span>
                                <span>Yes</span>
                              </button>
                              <button
                                type="button"
                                className={"unified-choice-btn choice-no " + (currentAnswer === "no" ? "selected" : "")}
                                onClick={() => handleQuestionAnswer(swimmer.id, currentKey as keyof Swimmer, "no")}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '10px 18px',
                                  borderRadius: '12px',
                                  border: currentAnswer === "no" ? '1.5px solid #b91c1c' : '1.5px solid #cbd5e1',
                                  background: currentAnswer === "no" ? '#dc2626' : '#ffffff',
                                  color: currentAnswer === "no" ? '#ffffff' : 'var(--navy)',
                                  fontSize: '13px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  boxShadow: currentAnswer === "no" ? '0 4px 12px rgba(220, 38, 38, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                                  transform: currentAnswer === "no" ? 'scale(1.02)' : 'scale(1)'
                                }}
                              >
                                <span className="btn-icon" style={{ fontSize: '13px', fontWeight: '900' }}>✕</span>
                                <span>No</span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* When all swimmers are complete, display itemized level descriptions */}
              {allComplete && (
                <div className="all-placed-summary-grid">
                  {swimmers.map((swimmer, index) => {
                    const level = startingLevel(swimmer);
                    const swimmerName = swimmer.firstName ? swimmer.firstName.trim() : ("Swimmer " + (index + 1));
                    return (
                      <div key={swimmer.id} className="placed-swimmer-detail-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className="swimmer-col-badge" style={{ width: '22px', height: '22px', fontSize: '10px' }}>{index + 1}</span>
                          <strong style={{ fontSize: '13px', color: 'var(--navy)' }}>{swimmerName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>— {getLevelDisplay(level)}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 6px', lineHeight: '1.4' }}>
                          {LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS["Dolphin"]}
                        </p>
                        {getRatio(level) && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#0056b3' }}>
                            Student to instructor ratio: {getRatio(level)} max
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {message && <p className="form-error" role="alert">{message}</p>}

            <div className="wizard-actions" style={{ marginTop: '28px', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
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
                    padding: '14px 28px',
                    borderRadius: '99px',
                    background: '#cbd5e1',
                    color: '#475569',
                    border: '1px solid #94a3b8',
                    fontWeight: '800',
                    fontSize: '14.5px',
                    cursor: 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{levelsValid ? "Continue to Location & Days" : "Complete Placement to Continue"}</span>
                  <svg width={levelsValid ? "18" : "15"} height={levelsValid ? "18" : "15"} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={levelsValid ? "2.4" : "2.2"} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
                    <path d="M6 12L10 8L6 4" />
                  </svg>
                </button>
              </div>
              {!levelsValid && (
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
                  * Starting level is required for each swimmer before choosing locations &amp; schedule
                </span>
              )}
            </div>
          </>
        );
      })()}

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
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              How did you hear about us?
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {REFERRAL_OPTIONS.map((opt) => {
                const isSelected = referral.source === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setReferral(prev => ({ ...prev, source: prev.source === opt ? "" : opt }))}
                    className={"select-pill-btn " + (isSelected ? "selected" : "")}
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      textAlign: 'center',
                      lineHeight: '1.3'
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {referral.source === "Referral" && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
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

            {referral.source === "Other Online Source" && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>
                  Please specify source (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nextdoor, Yelp, Blog, etc."
                  value={referral.other}
                  onChange={(event) => setReferral({ ...referral, other: event.target.value })}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '850', color: 'var(--navy)' }}>Class Openings Found</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Coordinated times matching your selected location &amp; schedule preferences:
                </p>
              </div>
            </div>

            {loadingOpenings ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Searching live pool schedules...</p>
            ) : primaryMatches.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 20px',
                marginTop: '10px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--navy)', fontWeight: '700', marginBottom: '4px' }}>
                  {swimmers.length > 1
                    ? "No exact coordinated times found for your selected primary days."
                    : "No direct matching openings found for the selected primary schedule."}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>
                  Our team will help coordinate availability for your 2-class trial. Request scheduling assistance above or check nearby locations below!
                </p>
              </div>
            ) : (
              <div className="matches-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {primaryMatches.map((match, idx) => (
                  <article className="match-card" key={idx} style={{ padding: '18px 20px' }}>
                    <div className="match-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="match-title" style={{ fontSize: '16px', fontWeight: '850', color: 'var(--navy)' }}>
                            {match.day}s at {match.timeLabel}
                          </span>
                          {match.type === "same-time" && <span className="match-badge badge-same-time">Same Time</span>}
                          {match.type === "back-to-back" && <span className="match-badge badge-back-to-back">Back-to-Back</span>}
                          {match.type === "same-day" && <span className="match-badge badge-same-day">Same Day</span>}
                        </div>
                        <div className="match-location" style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: '600', marginTop: '2px' }}>
                          {match.locationName}
                        </div>
                      </div>

                      {/* Top Right Book Trial Button */}
                      <a
                        className="register-btn"
                        href={getPreciseRegisterUrl(
                          match.classes,
                          match.classes[0].classObj.location_code,
                          family,
                          referral,
                          swimmers,
                          buildEnrollmentSynopsis(swimmers, quotePricing, familyLocationsArray, familySelectedLocationDays, familyScheduleNote, referral)
                        )}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '8px 18px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          borderRadius: '99px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(229, 29, 59, 0.25)'
                        }}
                      >
                        Book 2-Class Trial ↗
                      </a>
                    </div>

                    <div className="match-classes" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {match.classes.map((cls, cIdx) => {
                        const openingsCount = getOpeningsCount(cls.classObj);
                        return (
                          <div
                            className="match-class-item"
                            key={cIdx}
                            style={{
                              background: '#f8fafc',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid #edf2f7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  background: '#102774',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: '850',
                                  padding: '4px 9px',
                                  borderRadius: '7px',
                                  letterSpacing: '0.02em',
                                  flexShrink: 0
                                }}
                              >
                                {formatTime12h(cls.classObj.start_time)}
                              </span>
                              <span className="class-info-line" style={{ fontSize: '13.5px', color: 'var(--navy)' }}>
                                <strong style={{ color: 'var(--navy)' }}>{cls.swimmerName}</strong>: {cls.level.replace(/\s*\d+:\d+$/, "")} with Instructor {getInstructorName(cls.classObj)}
                              </span>
                            </div>

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
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Other Nearby Locations Section */}
            {nearbyMatches.length > 0 && (
              <div className="nearby-locations-section" style={{ marginTop: '28px', paddingTop: '22px', borderTop: '2px dashed #e2e8f0' }}>
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--blue)', background: '#eff6ff', padding: '4px 10px', borderRadius: '99px' }}>
                    Alternate Options
                  </span>
                  <h3 style={{ fontSize: '17px', fontWeight: '850', color: 'var(--navy)', margin: '8px 0 3px' }}>
                    Other Nearby Locations
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                    Looking for different days or times? Coordinated openings at other DFW British Swim School pools:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {nearbyMatches.map((match, idx) => {
                    const isExpanded = expandedNearbyIndex === idx;
                    return (
                      <article
                        className="match-card"
                        key={`nearby-${idx}`}
                        style={{
                          background: isExpanded ? '#ffffff' : '#f8fafc',
                          borderColor: isExpanded ? 'var(--blue)' : '#e2e8f0',
                          padding: '14px 18px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '14.5px', color: 'var(--navy)' }}>
                                {match.day}s at {match.timeLabel}
                              </strong>
                              {match.type === "same-time" && <span className="match-badge badge-same-time" style={{ fontSize: '10px', padding: '2px 7px' }}>Same Time</span>}
                              {match.type === "back-to-back" && <span className="match-badge badge-back-to-back" style={{ fontSize: '10px', padding: '2px 7px' }}>Back-to-Back</span>}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: '600', marginTop: '2px' }}>
                              📍 {match.locationName}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedNearbyIndex(isExpanded ? null : idx)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #cbd5e1',
                                borderRadius: '99px',
                                padding: '6px 12px',
                                fontSize: '11.5px',
                                fontWeight: '750',
                                color: 'var(--navy)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{isExpanded ? 'Hide Classes ▲' : 'View Classes ▼'}</span>
                            </button>

                            <a
                              className="register-btn"
                              href={getPreciseRegisterUrl(
                                match.classes,
                                match.classes[0].classObj.location_code,
                                family,
                                referral,
                                swimmers,
                                buildEnrollmentSynopsis(swimmers, quotePricing, familyLocationsArray, familySelectedLocationDays, familyScheduleNote, referral)
                              )}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '6px 14px',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                borderRadius: '99px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Book 2-Class Trial ↗
                            </a>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="match-classes" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {match.classes.map((cls, cIdx) => {
                              const openingsCount = getOpeningsCount(cls.classObj);
                              return (
                                <div
                                  className="match-class-item"
                                  key={cIdx}
                                  style={{
                                    background: '#ffffff',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #edf2f7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        background: '#102774',
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: '850',
                                        padding: '3px 7px',
                                        borderRadius: '6px',
                                        flexShrink: 0
                                      }}
                                    >
                                      {formatTime12h(cls.classObj.start_time)}
                                    </span>
                                    <span className="class-info-line" style={{ fontSize: '12.5px', color: 'var(--navy)' }}>
                                      <strong>{cls.swimmerName}</strong>: {cls.level.replace(/\s*\d+:\d+$/, "")} with Instructor {getInstructorName(cls.classObj)}
                                    </span>
                                  </div>

                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: openingsCount === 1 ? '#d97706' : '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      background: openingsCount === 1 ? '#d97706' : '#16a34a'
                                    }} />
                                    {openingsCount} {openingsCount === 1 ? 'opening available' : 'openings available'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
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

      <div className="hold-card-footer" style={{ justifyContent: 'space-between', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <div className="footer-links">
          <Link href="/guide" className="footer-guide-link">12 Questions Every Parent Should Ask &rarr;</Link>
        </div>
        <div className="footer-links">
          <Link href="/answers" className="footer-guide-link">FAQs, Makeups, and Trial Details &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
