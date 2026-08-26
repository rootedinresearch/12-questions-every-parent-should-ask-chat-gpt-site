"use client";

import Link from "next/link";

import { FormEvent, useMemo, useState, useEffect } from "react";

/* ------------------------------------------------------------------ *
 * Paste your Apps Script /exec URL here. Leave "" to disable logging
 * entirely — the SMS handoff still works without it.
 * ------------------------------------------------------------------ */
const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUCakByl8j40MxtKBkAqR5VT9zUbvE0-WK7Jltd47RN_MO9cIEipEXTWpW5fLQ2wqk3Q/exec";

const SCHOOL_SMS = "+18179735455";
const SCHOOL_EMAIL = "goswimarlsgpra@britishswimschool.com";
const MAX_SMS_LENGTH = 600;

const AGE_GROUPS = [
  { id: "under3", label: "Under 3", detail: "Parent & Me" },
  { id: "child", label: "Ages 3–12", detail: "Child lessons" },
  { id: "youngAdult", label: "Ages 13–18", detail: "Young Adult" },
  { id: "adult", label: "Ages 18+", detail: "Adult lessons" },
] as const;

const LOCATIONS = [
  { id: "arlington", name: "Arlington", detail: "LA Fitness · Little Road", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/arlington-la-fitness-little-road/" },
  { id: "mansfield", name: "Mansfield", detail: "24 Hour Fitness · Walnut Creek", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/mansfield-24-hour-fitness/" },
  { id: "grandPrairie", name: "Grand Prairie", detail: "LA Fitness · I-20", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/grand-prairie-la-fitness/" },
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
};

const initialCounts: Record<AgeGroup, number> = { under3: 0, child: 0, youngAdult: 0, adult: 0 };

function formatDob(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function smartFormatDob(value: string) {
  const clean = value.trim();
  if (!clean) return "";

  // Age input (e.g. 5, 12, 3)
  if (/^\d{1,2}$/.test(clean)) {
    const age = parseInt(clean, 10);
    const birthYear = new Date().getFullYear() - age;
    return `01/01/${birthYear}`;
  }

  // 4-digit birth year (e.g. 2018)
  if (/^\d{4}$/.test(clean)) {
    return `01/01/${clean}`;
  }

  // Parse dates with any separator
  const parts = clean.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    let [mStr, dStr, yStr] = parts;
    // YYYY-MM-DD format
    if (mStr.length === 4) {
      [yStr, mStr, dStr] = [mStr, dStr, yStr];
    }
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    let year = parseInt(yStr, 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) return value;

    // Expand 2-digit years
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
    return `${mm}/${dd}/${yyyy}`;
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

const LEVELS: Record<AgeGroup, string[]> = {
  under3: ["Tadpole", "Swimboree", "Seahorse", "Dolphin"],
  child: ["Starfish", "Minnow", "Turtle 1", "Turtle 2", "Shark 1", "Shark 2", "Barracuda", "Dolphin"],
  youngAdult: ["Starfish", "Minnow", "Young Adult 1", "Young Adult 2", "Young Adult 3", "Dolphin"],
  adult: ["Adult 1", "Adult 2", "Adult 3", "Dolphin"],
};

function assessmentResult(swimmer: Swimmer): string | null {
  if (swimmer.adaptive === "yes") return "Dolphin";
  if (swimmer.adaptive !== "no") return null;

  if (swimmer.ageGroup === "adult") {
    if (!swimmer.comfortable) return null;
    if (swimmer.comfortable === "no") return "Adult 1";
    if (!swimmer.treadMinute) return null;
    if (swimmer.treadMinute === "no") return "Adult 2";
    if (!swimmer.fourStrokes) return null;
    return swimmer.fourStrokes === "yes" ? "Adult 3" : "Adult 2";
  }

  if (!swimmer.firstProgram || !swimmer.comfortable) return null;
  if (swimmer.comfortable === "no") return swimmer.ageGroup === "under3" ? "Tadpole" : "Starfish";
  if (!swimmer.floatUnassisted) return null;

  if (swimmer.ageGroup === "under3") {
    if (swimmer.floatUnassisted === "no") return "Swimboree";
    if (!swimmer.jumpRollFloat) return null;
    return "Seahorse";
  }

  if (swimmer.floatUnassisted === "no") return "Minnow";
  if (!swimmer.glideRecover) return null;
  if (swimmer.glideRecover === "no") return swimmer.ageGroup === "youngAdult" ? "Young Adult 1" : "Turtle 1";
  if (!swimmer.swimTenYards) return null;
  if (swimmer.swimTenYards === "no") return swimmer.ageGroup === "youngAdult" ? "Young Adult 1" : "Turtle 1";
  if (!swimmer.armsOut) return null;
  if (swimmer.ageGroup === "youngAdult") return swimmer.armsOut === "yes" ? "Young Adult 3" : "Young Adult 2";
  return swimmer.armsOut === "yes" ? "Shark 1" : "Turtle 2";
}

function startingLevel(swimmer: Swimmer) {
  return swimmer.selectedLevel || assessmentResult(swimmer) || "Level not selected";
}

function answerComplete(swimmer: Swimmer) {
  return swimmer.placementMode === "known" ? Boolean(swimmer.selectedLevel) : swimmer.placementMode === "assessment" && Boolean(assessmentResult(swimmer));
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

function Choice({ value, onChange, label }: { value: Answer; onChange: (value: Answer) => void; label: string }) {
  return <div className="yes-no" role="group" aria-label={label}>
    <button type="button" className={value === "yes" ? "selected" : ""} onClick={() => onChange("yes")} aria-pressed={value === "yes"}>Yes</button>
    <button type="button" className={value === "no" ? "selected" : ""} onClick={() => onChange("no")} aria-pressed={value === "no"}>No</button>
  </div>;
}

export default function HoldForm() {
  const [step, setStep] = useState(1);
  const [counts, setCounts] = useState(initialCounts);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);

  const handleDobBlur = (swimmerId: string, rawValue: string) => {
    const formatted = smartFormatDob(rawValue);
    const detectedGroup = getAgeGroupFromDob(formatted);
    const swimmer = swimmers.find((s) => s.id === swimmerId);
    if (!swimmer) return;

    const patch: Partial<Swimmer> = { dob: formatted };

    if (detectedGroup && detectedGroup !== swimmer.ageGroup) {
      patch.ageGroup = detectedGroup;
      const oldGroupLabel = AGE_GROUPS.find((g) => g.id === swimmer.ageGroup)?.label || swimmer.ageGroup;
      const newGroupLabel = AGE_GROUPS.find((g) => g.id === detectedGroup)?.label || detectedGroup;
      patch.dobMessage = `Note: DOB auto-aligned ${swimmer.firstName || "swimmer"} from ${oldGroupLabel} to ${newGroupLabel}.`;
      patch.selectedLevel = "";
      patch.placementMode = "";
    } else {
      patch.dobMessage = "";
    }

    updateSwimmer(swimmerId, patch);
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
  const current = swimmers[activeSwimmer];

  useEffect(() => {
    if (step > 1) {
      document.documentElement.classList.add("wizard-active-steps");
    } else {
      document.documentElement.classList.remove("wizard-active-steps");
    }
    return () => {
      document.documentElement.classList.remove("wizard-active-steps");
    };
  }, [step]);

  const profileValid = useMemo(() => swimmers.length > 0 && swimmers.every((swimmer) => swimmer.firstName.trim() && validDob(swimmer.dob) && swimmer.gender) && family.firstName.trim() && family.lastName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(family.email) && family.phone.replace(/\D/g, "").length >= 10 && family.smsConsent, [swimmers, family]);
  const classValid = swimmers.length > 0 && swimmers.every((swimmer) => swimmer.location) && referral.source && (referral.source !== "Friend or referral" || referral.friendName.trim());

  function changeCount(group: AgeGroup, change: number) {
    const amount = Math.max(0, Math.min(6, counts[group] + change));
    const nextCounts = { ...counts, [group]: amount };
    if (Object.values(nextCounts).reduce((sum, value) => sum + value, 0) > 8) {
      setMessage("You can add up to 8 swimmers in one request.");
      return;
    }
    setCounts(nextCounts);
    setSwimmers((previous) => {
      const next: Swimmer[] = [];
      AGE_GROUPS.forEach((ageGroup) => {
        for (let index = 0; index < nextCounts[ageGroup.id]; index += 1) {
          next.push(previous.find((swimmer) => swimmer.id === `${ageGroup.id}-${index + 1}`) || { id: `${ageGroup.id}-${index + 1}`, ageGroup: ageGroup.id, firstName: "", dob: "", gender: "", placementMode: "", selectedLevel: "", adaptive: "", firstProgram: "", comfortable: "", floatUnassisted: "", jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "", treadMinute: "", fourStrokes: "", location: "", preferredSchedule: "" });
        }
      });
      return next;
    });
    setMessage("");
  }

  function updateSwimmer(id: string, patch: Partial<Swimmer>) {
    setSwimmers((previous) => previous.map((swimmer) => swimmer.id === id ? { ...swimmer, ...patch } : swimmer));
  }

  function chooseLevelPath(value: string) {
    if (!current) return;
    if (value === "__assessment__") {
      updateSwimmer(current.id, { placementMode: "assessment", selectedLevel: "", adaptive: "", firstProgram: "", comfortable: "", floatUnassisted: "", jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "", treadMinute: "", fourStrokes: "" });
    } else {
      updateSwimmer(current.id, { placementMode: value ? "known" : "", selectedLevel: value });
    }
    setMessage("");
  }

  function answerAssessment(patch: Partial<Swimmer>) {
    if (!current) return;
    const next = { ...current, ...patch };
    const result = assessmentResult(next);
    updateSwimmer(current.id, { ...patch, selectedLevel: result || "" });
    setMessage("");
  }

  function goToLevels() {
    setShowValidationErrors(true);
    if (!profileValid) return setMessage("Please complete the family and swimmer information, including a valid MM/DD/YYYY date of birth.");
    setMessage("");
    setActiveSwimmer(0);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advanceLevel() {
    if (!current || !answerComplete(current)) return setMessage("Please answer the level question shown for this swimmer.");
    setMessage("");
    if (activeSwimmer < swimmers.length - 1) setActiveSwimmer((value) => value + 1);
    else { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function goToReview() {
    if (!classValid) return setMessage("Choose a preferred pool for each swimmer and tell us how you heard about us.");
    setMessage("");
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildMessage() {
    const lines: string[] = [`Class help — ${family.firstName} ${family.lastName}`];
    swimmers.forEach((swimmer) => {
      const pool = LOCATIONS.find((location) => location.id === swimmer.location)?.name || "";
      lines.push(`${swimmer.firstName} (${swimmer.dob}) · ${startingLevel(swimmer)} · ${pool}${swimmer.preferredSchedule ? ` · ${swimmer.preferredSchedule}` : ""}`);
    });
    lines.push(`${family.phone} · ${family.email}`);
    const via = referral.friendName ? `${referral.source} (${referral.friendName})` : referral.other ? `${referral.source} (${referral.other})` : referral.source;
    lines.push(`Heard about us: ${via}`);
    const text = lines.join("\n");
    return text.length > MAX_SMS_LENGTH ? `${text.slice(0, MAX_SMS_LENGTH - 1)}…` : text;
  }

  function logLead(text: string) {
    if (!LEAD_ENDPOINT) return;
    const payload = JSON.stringify({
      submittedAt: new Date().toISOString(),
      message: text,
      family,
      referral,
      swimmers: swimmers.map((swimmer) => ({
        firstName: swimmer.firstName,
        dob: swimmer.dob,
        gender: swimmer.gender,
        ageGroup: swimmer.ageGroup,
        estimatedLevel: startingLevel(swimmer),
        placementMode: swimmer.placementMode,
        location: LOCATIONS.find((location) => location.id === swimmer.location)?.name || swimmer.location,
        preferredSchedule: swimmer.preferredSchedule,
      })),
    });
    try {
      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(LEAD_ENDPOINT, blob)) return;
    } catch {
      /* fall through to fetch */
    }
    fetch(LEAD_ENDPOINT, { method: "POST", mode: "no-cors", keepalive: true, headers: { "content-type": "text/plain;charset=utf-8" }, body: payload }).catch(() => {});
  }

  function openComposer(text: string) {
    window.location.href = `sms:${SCHOOL_SMS}?&body=${encodeURIComponent(text)}`;
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setMessage("Copy is unavailable in this browser. Select the message above to copy it manually.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 4) return;
    const company = String(new FormData(event.currentTarget).get("company") || "");
    if (company) { setHandedOff(true); return; }

    const text = buildMessage();
    const mobile = isMobileDevice();
    setComposed(text);
    setOnMobile(mobile);
    setMessage("");
    logLead(text);
    setHandedOff(true);
    if (mobile) openComposer(text);
  }

  if (handedOff) return <div className="hold-success" role="status">
    <span aria-hidden="true">✓</span>
    <h2>{onMobile ? "Your text is ready to send." : "Here is your message."}</h2>
    <p>{onMobile
      ? "We opened your messaging app with everything filled in — swimmers, estimated levels, and pool preferences. Hit send and our local team will reply with the class times that fit."
      : "Copy this and text it to 817-973-5455, or email it to us. Our local team will reply with the class times that fit."}</p>

    <pre className="composed-message" aria-label="Your message">{composed}</pre>

    <div className="handoff-actions">
      {onMobile && <button type="button" className="handoff-primary" onClick={() => openComposer(composed)}>Open the text again</button>}
      <button type="button" className="handoff-secondary" onClick={copyMessage}>{copied ? "Copied ✓" : "Copy message"}</button>
      <a className="handoff-secondary" href={`mailto:${SCHOOL_EMAIL}?subject=${encodeURIComponent("Help finding the right swim class")}&body=${encodeURIComponent(composed)}`}>Email it instead</a>
    </div>

    <div className="handoff-schedules">
      <p>Or browse class times yourself:</p>
      {LOCATIONS.map((location) => <a key={location.id} href={location.href} target="_blank" rel="noreferrer">{location.name} <span aria-hidden="true">→</span></a>)}
    </div>

    {message && <p className="form-error" role="alert">{message}</p>}
    <Link className="handoff-pricing" href="/answers">Review pricing and trial details →</Link>
  </div>;

  return <form className="hold-form wizard-form" onSubmit={submit}>
    <div className="wizard-progress" aria-label={`Step ${step} of 4`}>
      {["Family & swimmers", "Starting levels", "Pool & referral", "Review"].map((label, index) => <span key={label} className={step === index + 1 ? "current" : step > index + 1 ? "complete" : ""}><b>{step > index + 1 ? "✓" : index + 1}</b><small>{label}</small></span>)}
    </div>

    {step === 1 && <>
      <div className="form-section-heading"><span>1</span><div><p>First question</p><h2>How many swimmers are joining us?</h2></div></div>
      <p className="wizard-intro">Use the plus and minus buttons. We will create one profile for every swimmer.</p>
      <div className="swimmer-counters">
        {AGE_GROUPS.map((group) => <article key={group.id}><div><strong>{group.label}</strong><small>{group.detail}</small></div><div className="counter-control"><button type="button" onClick={() => changeCount(group.id, -1)} disabled={counts[group.id] === 0} aria-label={`Remove one ${group.label} swimmer`}>−</button><output aria-live="polite">{counts[group.id]}</output><button type="button" onClick={() => changeCount(group.id, 1)} aria-label={`Add one ${group.label} swimmer`}>+</button></div></article>)}
      </div>
      {swimmers.length === 0 && <p className="counter-prompt">Tap a blue <strong>+</strong> above to add your first swimmer.</p>}

      {swimmers.length > 0 && <>
        <div className="form-section-heading swimmer-heading"><span>2</span><div><p>Parent or guardian</p><h2>Who should we contact?</h2></div></div>
        <div className="form-grid two-column">
          <label>First name<input className={showValidationErrors && !family.firstName.trim() ? "invalid-field" : ""} value={family.firstName} onChange={(event) => setFamily({ ...family, firstName: event.target.value })} autoComplete="given-name" required /></label>
          <label>Last name<input className={showValidationErrors && !family.lastName.trim() ? "invalid-field" : ""} value={family.lastName} onChange={(event) => setFamily({ ...family, lastName: event.target.value })} autoComplete="family-name" required /></label>
          <label>Email address<input className={showValidationErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(family.email) ? "invalid-field" : ""} value={family.email} onChange={(event) => setFamily({ ...family, email: event.target.value })} type="email" autoComplete="email" required /></label>
          <label>Mobile phone<input className={showValidationErrors && family.phone.replace(/\D/g, "").length < 10 ? "invalid-field" : ""} value={family.phone} onChange={(event) => setFamily({ ...family, phone: event.target.value })} type="tel" autoComplete="tel" inputMode="tel" required /></label>
        </div>
        <div className="form-section-heading swimmer-heading"><span>3</span><div><p>Swimmer profiles</p><h2>Tell us who will be swimming.</h2></div></div>
        <div className="swimmer-profile-list">
          {swimmers.map((swimmer, index) => <article key={swimmer.id}>
            <header><span>{index + 1}</span><div><strong>Swimmer {index + 1}</strong><small>{AGE_GROUPS.find((group) => group.id === swimmer.ageGroup)?.label}</small></div></header>
            <div className="form-grid three-column">
              <label>First name<input className={showValidationErrors && !swimmer.firstName.trim() ? "invalid-field" : ""} value={swimmer.firstName} onChange={(event) => updateSwimmer(swimmer.id, { firstName: event.target.value })} required /></label>
              <label>Date of birth<span className="dob-input"><input className={((showValidationErrors && !swimmer.dob) || (swimmer.dob && !validDob(swimmer.dob))) ? "invalid-field" : ""} value={swimmer.dob} onChange={(event) => updateSwimmer(swimmer.id, { dob: formatDob(event.target.value) })} onBlur={(event) => handleDobBlur(swimmer.id, event.target.value)} inputMode="numeric" autoComplete="bday" placeholder="MM/DD/YYYY" maxLength={10} required />
              {swimmer.dobMessage && <p className="dob-warning-text" style={{ gridColumn: 'span 3', margin: '4px 0 0', color: 'var(--red)', fontSize: '10px', fontWeight: '800' }}>{swimmer.dobMessage}</p>}</span></label>
              <label>Gender<select className={showValidationErrors && !swimmer.gender ? "invalid-field" : ""} value={swimmer.gender} onChange={(event) => updateSwimmer(swimmer.id, { gender: event.target.value })} required><option value="" disabled>Select one</option><option>Female</option><option>Male</option><option>Nonbinary</option><option>Prefer not to say</option></select></label>
            </div>
          </article>)}
        </div>
        <label className="sms-consent"><input className={showValidationErrors && !family.smsConsent ? "invalid-field" : ""} checked={family.smsConsent} onChange={(event) => setFamily({ ...family, smsConsent: event.target.checked })} type="checkbox" required /><span>I agree to receive text messages from British Swim School about level placement and available class times. Message and data rates may apply. Reply STOP to opt out.</span></label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <button type="button" className="wizard-next" onClick={goToLevels}>Choose starting levels →</button>
      </>}
    </>}

    {step === 2 && current && <>
      <div className="swimmer-step-header"><span>Swimmer {activeSwimmer + 1} of {swimmers.length}</span><div>{swimmers.map((swimmer, index) => <i key={swimmer.id} className={index <= activeSwimmer ? "active" : ""} />)}</div></div>
      <div className="form-section-heading"><span>{activeSwimmer + 1}</span><div><p>{AGE_GROUPS.find((group) => group.id === current.ageGroup)?.label}</p><h2>{current.firstName}’s starting-level estimate</h2></div></div>
      <p className="wizard-intro">Choose a level if you already know it. If you are not sure, we will guide you through a short assessment and fill in the recommendation automatically.</p>
      <label className="level-select-label">Starting level
        <select className="level-select" value={current.placementMode === "assessment" && !current.selectedLevel ? "__assessment__" : current.selectedLevel} onChange={(event) => chooseLevelPath(event.target.value)}>
          <option value="">Choose a known level or get help</option>
          <option value="__assessment__">I’m not sure — help me choose</option>
          <optgroup label="Known level">{LEVELS[current.ageGroup].map((level) => <option key={level} value={level}>{level}</option>)}</optgroup>
        </select>
      </label>
      {current.placementMode === "assessment" && <div className="level-questions">
        <article><div><span>Assessment question 1</span><h3>Would adaptive or special-needs lessons be the best fit for {current.firstName}?</h3></div><Choice label="Adaptive or special-needs lessons" value={current.adaptive} onChange={(value) => answerAssessment({ adaptive: value, firstProgram: "", comfortable: "", floatUnassisted: "", jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "", treadMinute: "", fourStrokes: "" })} /></article>
        {current.adaptive === "no" && current.ageGroup !== "adult" && <article><div><span>Experience</span><h3>Is this {current.firstName}’s first time in a swim program?</h3><p>This helps our team prepare and does not change the recommendation.</p></div><Choice label="First time in a swim program" value={current.firstProgram} onChange={(value) => answerAssessment({ firstProgram: value })} /></article>}
        {current.adaptive === "no" && (current.ageGroup === "adult" || current.firstProgram) && <article><div><span>Water comfort</span><h3>{current.ageGroup === "adult" ? `Are you comfortable in the water?` : `Is ${current.firstName} comfortable in the water and able to fully submerge their head?`}</h3></div><Choice label="Comfortable in the water" value={current.comfortable} onChange={(value) => answerAssessment({ comfortable: value, floatUnassisted: "", jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "", treadMinute: "", fourStrokes: "" })} /></article>}
        {current.adaptive === "no" && current.ageGroup !== "adult" && current.comfortable === "yes" && <article><div><span>Independent float</span><h3>Can {current.firstName} float unassisted, without swim aids or support?</h3></div><Choice label="Float unassisted" value={current.floatUnassisted} onChange={(value) => answerAssessment({ floatUnassisted: value, jumpRollFloat: "", glideRecover: "", swimTenYards: "", armsOut: "" })} /></article>}
        {current.ageGroup === "under3" && current.floatUnassisted === "yes" && <article><div><span>Survival sequence</span><h3>Can {current.firstName} jump in, roll over, and float without assistance?</h3></div><Choice label="Jump roll and float" value={current.jumpRollFloat} onChange={(value) => answerAssessment({ jumpRollFloat: value })} /></article>}
        {(current.ageGroup === "child" || current.ageGroup === "youngAdult") && current.floatUnassisted === "yes" && <article><div><span>Glide and recover</span><h3>Can {current.firstName} glide and stand up from a front and back floating position?</h3></div><Choice label="Glide and recover" value={current.glideRecover} onChange={(value) => answerAssessment({ glideRecover: value, swimTenYards: "", armsOut: "" })} /></article>}
        {(current.ageGroup === "child" || current.ageGroup === "youngAdult") && current.glideRecover === "yes" && <article><div><span>Ten-yard swim</span><h3>Can {current.firstName} swim 10 yards of freestyle and backstroke with face in the water and a side breath?</h3></div><Choice label="Swim ten yards" value={current.swimTenYards} onChange={(value) => answerAssessment({ swimTenYards: value, armsOut: "" })} /></article>}
        {(current.ageGroup === "child" || current.ageGroup === "youngAdult") && current.swimTenYards === "yes" && <article><div><span>Stroke technique</span><h3>Can {current.firstName} swim freestyle and backstroke with their arms recovering out of the water?</h3></div><Choice label="Arms out of the water" value={current.armsOut} onChange={(value) => answerAssessment({ armsOut: value })} /></article>}
        {current.ageGroup === "adult" && current.comfortable === "yes" && <article><div><span>Water safety</span><h3>Can you tread water for one minute?</h3></div><Choice label="Tread water for one minute" value={current.treadMinute} onChange={(value) => answerAssessment({ treadMinute: value, fourStrokes: "" })} /></article>}
        {current.ageGroup === "adult" && current.treadMinute === "yes" && <article><div><span>Stroke knowledge</span><h3>Are you familiar with all four competitive strokes?</h3></div><Choice label="Familiar with all four strokes" value={current.fourStrokes} onChange={(value) => answerAssessment({ fourStrokes: value })} /></article>}
      </div>}
      {answerComplete(current) && <div className="level-result"><span>{current.placementMode === "assessment" ? "Recommended starting level" : "Selected starting level"}</span><strong>{startingLevel(current)}</strong><p>This level now appears in the dropdown above. It is a starting estimate; we assess every swimmer during the first lesson and make any adjustment needed.</p></div>}
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="wizard-actions"><button type="button" className="wizard-back" onClick={() => activeSwimmer > 0 ? setActiveSwimmer((value) => value - 1) : setStep(1)}>← Back</button><button type="button" className="wizard-next" onClick={advanceLevel}>{activeSwimmer < swimmers.length - 1 ? `Continue to ${swimmers[activeSwimmer + 1].firstName} →` : "Choose pools & class preferences →"}</button></div>
    </>}

    {step === 3 && <>
      <div className="form-section-heading"><span>3</span><div><p>Class preferences</p><h2>Where would each swimmer like to learn?</h2></div></div>
      <p className="wizard-intro">Choose a pool for each swimmer. We will match the estimated level with current openings and send you the class times that fit.</p>
      <div className="class-preference-list">
        {swimmers.map((swimmer) => <article key={swimmer.id}><header><div><strong>{swimmer.firstName}</strong><small>{startingLevel(swimmer)}</small></div><span>Starting level</span></header><div className="pool-choices">{LOCATIONS.map((location) => <label key={location.id} className={swimmer.location === location.id ? "selected" : ""}><input type="radio" name={`location-${swimmer.id}`} value={location.id} checked={swimmer.location === location.id} onChange={() => updateSwimmer(swimmer.id, { location: location.id })} /><strong>{location.name}</strong><small>{location.detail}</small></label>)}</div><label className="schedule-note">Best days or times <span>optional</span><input value={swimmer.preferredSchedule} onChange={(event) => updateSwimmer(swimmer.id, { preferredSchedule: event.target.value })} placeholder="Example: Tuesday after 5:00 PM or Saturday mornings" /></label>{swimmer.location && <p className="availability-note"><span>Live class match</span>Our team will confirm openings for {startingLevel(swimmer)} at {LOCATIONS.find((location) => location.id === swimmer.location)?.name}. <a href={LOCATIONS.find((location) => location.id === swimmer.location)?.href} target="_blank" rel="noreferrer">View the current public schedule →</a></p>}</article>)}
      </div>
      <div className="referral-section"><p>One last question</p><h2>How did you hear about us?</h2><div className="referral-options">{["Google search", "School or PTA", "Friend or referral", "Driving by or signs", "Social media", "Other"].map((source) => <label key={source} className={referral.source === source ? "selected" : ""}><input type="radio" name="referral" checked={referral.source === source} onChange={() => setReferral({ source, friendName: "", other: "" })} />{source}</label>)}</div>{referral.source === "Friend or referral" && <label className="conditional-field">Friend’s name <span>We will make sure they receive their extra lesson.</span><input value={referral.friendName} onChange={(event) => setReferral({ ...referral, friendName: event.target.value })} required /></label>}{referral.source === "Other" && <label className="conditional-field">Tell us where <input value={referral.other} onChange={(event) => setReferral({ ...referral, other: event.target.value })} /></label>}</div>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="wizard-actions"><button type="button" className="wizard-back" onClick={() => { setStep(2); setActiveSwimmer(swimmers.length - 1); }}>← Back</button><button type="button" className="wizard-next" onClick={goToReview}>Review my details →</button></div>
    </>}

    {step === 4 && <>
      <div className="form-section-heading"><span>4</span><div><p>Review</p><h2>Everything we need to help your family.</h2></div></div>
      <div className="review-family"><strong>{family.firstName} {family.lastName}</strong><span>{family.email} · {family.phone}</span></div>
      <div className="review-swimmers">{swimmers.map((swimmer) => <article key={swimmer.id}><header><div><strong>{swimmer.firstName}</strong><small>{swimmer.dob} · {swimmer.gender}</small></div><b>{startingLevel(swimmer)}</b></header><p>{LOCATIONS.find((location) => location.id === swimmer.location)?.name}{swimmer.preferredSchedule ? ` · ${swimmer.preferredSchedule}` : ""}</p></article>)}</div>
      <div className="review-referral"><span>How you heard about us</span><strong>{referral.source}{referral.friendName ? ` · Referred by ${referral.friendName}` : referral.other ? ` · ${referral.other}` : ""}</strong></div>
      <div className="assessment-disclaimer"><strong>Placement note</strong><p>These levels are estimates based on your answers. Every swimmer receives an assessment during the first lesson. If another level is a better fit, we will make the adjustment.</p></div>
      <label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="wizard-actions"><button type="button" className="wizard-back" onClick={() => setStep(3)}>← Make changes</button><button type="submit" className="wizard-next">Text us these details →</button></div>
      <p className="form-reassurance">We will open a text message with everything filled in · Nothing sends until you tap send · No credit card, no charge</p>
    </>}
  </form>;
}
