# British Swim School — Project Memory & Knowledge Source

## 1. Core Architecture & Design Rules
- **Unified Container Alignment Across All Screen Sizes**:
  - The Header (`.answers-header`), Hero Content (`.hold-hero-content`), and Main Content (`.hold-content`) **MUST ALL share the exact same container constraints**: `width: 100%; max-width: 1080px; margin: 0 auto; box-sizing: border-box;`.
  - **CRITICAL - Left Alignment in Hero**: The hero banner background spans `width: 100%`, but the text container `.hold-hero-content` inside it has `text-align: left; max-width: 1080px; margin: 0 auto;` so the hero title aligns flush with the left border of the white card directly below it on desktop, ultrawide, tablet, and mobile.
  - **CRITICAL - Responsive Grid without Inline Overrides**: The 2-column quote calculator (`.quote-calculator-container`) uses CSS grid (`grid-template-columns: 1.12fr 0.88fr; gap: 24px`) on desktop and cleanly stacks to 1 column (`display: flex; flex-direction: column`) on tablets/mobile (`max-width: 960px`). Never use hardcoded inline `gridTemplateColumns` styles in TSX.
  - **CRITICAL**: Never add `padding: ... calc((100vw - X)/2)` to an element that already has `max-width` and `margin: 0 auto`. Doing so causes severe offset/squishing on window resize.
  - No sidebar / options card on the hold page (it was removed to keep the focus purely on the quote and schedule finder).

---

## 2. Step-by-Step Flow & Button Labels
- **Step 1: Instant Quote Calculator**
  - "How many swim lessons per week?" frequency selector formatted as 1 horizontal row per swimmer.
  - **Adaptive/Special Needs (Dolphin)**: Options are **Semi-Private (1x/wk)** ($249.99/mo) and **Private (1x/wk)** ($499.99/mo). Displayed in the tuition summary as a single, clear weekly lesson line item (*"Adaptive Private Lesson (1x/wk)"* or *"Adaptive Semi-Private Lesson (1x/wk)"*) without misleading multi-class split labels.
  - **Unlimited Swim 4-Item Breakdown**: When Unlimited Swim is selected, the shopping cart summary breaks down transparently into 4 distinct line items:
    1. **Class 1 Tuition** (Foundation Slot)
    2. **Class 2 Tuition** (2x/wk standard bundled rate with 2x/wk discount deducted)
    3. **Unlimited Add-On** (The difference between Unlimited and 2x/wk, e.g. $200.00)
    4. **Registration Fee** (Annual registration fee)
  - 2-box price breakdown:
    1. **Ongoing Monthly Subscription** (Displayed first)
    2. **Total Due Today** (Tuition + $50 Enrollment Fee, displayed second)
  - Discounted pricing displayed with the exact discount amount deducted.
  - Primary CTA Button: Big 3D Red Button labeled **"View Lesson Times"** (logs lead to Google Sheet).

- **Step 2: Swimmer Profiles & Contact Info**
  - Parent contact fields (First Name, Last Name, Email, Phone).
  - Swimmer profiles with **Gender** strictly selected as **Female** or **Male** (matching Jackrabbit's live dropdown).
  - `ENFORCE_REQUIRED_FIELDS` constant flag at top of `HoldForm.tsx` (set to `false` for rapid testing, can be toggled to `true` for production).

- **Step 3: Starting Level Placement (Decision Tree Workflow)**
  - Documented in `md files/swim_assessment_workflow.md`.
  - Swimmers displayed in clean columns side-by-side with progressive interactive questions.
  - **Subquestions Removed**: Questions display clean, direct prompts without redundant subtitles/subquestions.
  - **Assessment Navigation**: The previous questions button is labeled **"← Back"**.
  - **Dynamic Next Step Button**: The *"Choose Location & Days"* button stays subtle and compact while questions are being answered, and automatically expands into a **large, prominent 3D red button** as soon as all swimmer levels have been identified.
  - **Personalized Student Name**: Every question dynamically incorporates the swimmer's first name (e.g., *"Does Marco need a modified or adaptive lesson?"*, *"Is this Marco's first time in swim lessons?"*, *"Can Marco float on his back...?"*), falling back to "the swimmer" if omitted.
  - **Ratio Context Banner (Assessment-Only)**: In Step 3 placement result cards, any level with a ratio displays: `"Student to instructor ratio of 4:1 max in this level."` (or 6:1 max). This note is strictly scoped to the assessment and omitted from the class coordination page in Step 5.
  - **Q0 (All Age Groups)**: *Does [Swimmer Name] need a modified or adaptive lesson?*
    - If **YES** -> **Result: Dolphin** (Requests Private Lesson or Semi-Private Lesson).
    - If **NO** -> Proceeds to their age group workflow below:
  - **Child (3–24 Months)**:
    - Q1: First time in Swim lessons? -> Proceed to Q2
    - Q2: Are they comfortable in water & can fully submerge head? -> NO: `Tadpole 6:1`, YES: `Swimboree 4:1`
  - **Child (24–36 Months)**:
    - Q1: First time in Swim lessons? -> YES: `Tadpole 6:1`, NO: Proceed to Q2
    - Q2: Comfortable in water & can fully submerge head? -> NO: `Tadpole 6:1`, YES: Proceed to Q3
    - Q3: Can separate from parent/caregiver & work with instructors? -> NO: `Swimboree 4:1`, YES: Proceed to Q4
    - Q4: Can sit on edge of pool & wait independently for turn? -> NO: `Swimboree 4:1`, YES: `Seahorse 4:1`
  - **Child (3–12 Years)**:
    - Q1: First time in Swim lessons? -> YES: `Starfish 4:1`, NO: Proceed to Q2
    - Q2: Comfortable in water & fully able to submerge head? -> NO: `Starfish 4:1`, YES: Proceed to Q3
    - Q3: Able to float on back unassisted without life vest? -> NO: `Starfish 4:1`, YES: Proceed to Q4
    - Q4: Able to jump in, roll over & float without assistance? -> NO: `Starfish 4:1`, YES: Proceed to Q5
    - Q5: Can swim freestyle & backstroke with arms out of water? -> NO: `Minnow 4:1`, YES: `Turtle 1 4:1` or `Turtle 2 6:1`
  - **Young Adult (13–17 Years)**:
    - Q1: First time in Swim lessons? -> YES: `Young Adult 1`, NO: Proceed to Q2
    - Q2: Comfortable in water & can float on back? -> NO: `Young Adult 1`, YES: Proceed to Q3
    - Q3: Can put face in water & hold breath? -> NO: `Young Adult 1`, YES: Proceed to Q4
    - Q4: Can swim 10 yards freestyle/backstroke with side breathing? -> NO: `Young Adult 2`, YES: `Young Adult 3`
  - **Adult (18+ Years)**:
    - Q1: Had structured swim lessons before? -> NO: `Adult 1`, YES: Proceed to Q2
    - Q2: Can you float on back by yourself for 20 seconds? -> NO: `Adult 1`, YES: Proceed to Q3
    - Q3: Can you tread water for 1 minute? -> NO: `Adult 2`, YES: Proceed to Q4
    - Q4: Can you swim freestyle & backstroke with arms out of water? -> NO: `Adult 2`, YES: `Adult 3`

- **Step 4: Pool Locations & Preferred Days (Family Scope)**
  - Locations and days are asked **once for the whole family** (assuming all swimmers in a family share location/days).
  - **No Checkbox Requirement**: Families simply select day pills under each location, which automatically highlights and includes that location.
  - Operating hours displayed under each day:
    - **Arlington** (LA Fitness Little Rd): Tuesday (4:00 PM – 8:00 PM), Friday (4:00 PM – 8:00 PM)
    - **Mansfield** (24 Hour Fitness): Thursday (4:00 PM – 8:00 PM), Friday (4:00 PM – 8:00 PM), Saturday (8:30 AM – 1:00 PM)
    - **Grand Prairie** (LA Fitness I-20): Monday (4:00 PM – 8:00 PM), Wednesday (4:00 PM – 8:00 PM), Saturday (8:30 AM – 1:00 PM)
  - **Location-Day Independence**: Days are stored with composite keys `${locationId}:${day}` so selecting Friday in Arlington never highlights Friday in Mansfield, and Saturday in Mansfield is independent from Grand Prairie.

- **Step 5: Review & Class Openings Found**
  - **Referral Dropdown Exclusively in Step 5**: Includes the exact 10 live options (`Email`, `Event/Sponsorship`, `Google/Search`, `Mail Advertising`, `News/Press`, `Other Online Source`, `Rackcard/Flyer`, `Referral`, `Signage`, `Social Media`).
  - **Primary CTA Button**: Placed at the top, styled as a big 3D Red Button labeled **"Request Scheduling Assistance"**.
  - **Clean Direct Layout**: Transitions directly into the live "Class Openings Found" section.
  - No duplicate submit button at the bottom (only the `< Back` button remains at the bottom).
  - **Live Class Openings**: Fetched from `/api/openings` (parsed via `data.rows || data.classes || []`).
  - **Strict Openings Availability & Placeholder Filter**:
    - Only classes with `calculated_openings >= 1` per student are matched and displayed.
    - Placeholder, future shift, unassigned rooms (`future`, `hold`, `run`, `manager on duty`, `staff meeting`, `convenience fee`) are strictly excluded.
    - Sibling coordination only includes **Same Time** (`t1 === t2`) or **Back-to-Back** (`|t1 - t2| === 30min`). Loose same-day matches are omitted.
  - **Chronological & Day-of-Week Grouping**: Openings are ordered strictly by day of the week (Monday &rarr; Tuesday &rarr; Wednesday &rarr; Thursday &rarr; Friday &rarr; Saturday &rarr; Sunday), then chronologically by start time.
  - **Live Openings Indicator Badge**: Each class row prominently displays real-time capacity (e.g. `🟢 2 openings available` or `🟠 1 opening available`).
  - **No Coordinated Openings Fallback Notice**: If no matching coordinated sibling times exist with current live openings, a clean notice displays: *"No coordinated sibling times found for the selected criteria. Our team will help coordinate availability for their 2-class trial. Request scheduling assistance above and we will contact you with custom options."*
  - Matched classes are rendered as cards (`.match-card`) with header badges (`Same Time`, `Back-to-Back`) and **one single primary button** per card labeled **"Book 2-Class Trial ↗"** at the card footer for the full family session.
  - **Strict Slot-Level Deduplication**: Deduplicated by unique `locationName + day + timeLabel + type` so each time slot (e.g. Saturdays at 12:00 PM) only ever appears once, automatically picking the instructor option with the highest available capacity.
  - **Automatic Full Registration Pre-Fill**: Clicking *"Book 2-Class Trial ↗"* automatically forwards all parent and swimmer info via URL query parameters into Jackrabbit's live registration form:
    - Parent info: `MFName`, `MLName`, `MEmail`, `ConfirmMEmail`, `MCPhone`, `MCSmsOptIn`
    - Referral: `FamSource`, `ReferralName`
    - Swimmers: `S1FName`, `S1LName`, `S1Gender` (`Female`/`Male`), `S1BDate`, `S1SpecNeeds`, `S2FName`, `S2LName`, etc.
    - Class: `preLoadClassID` (points to the first class ID), `loc` (e.g. `LAFLITT`, `MAN24H`, `LAFGP`)
    - **Comments / Synopsis**: Compact single-string synopsis in `Comments` parameter containing total swimmer count, ongoing monthly tuition, initial payment due today with fees, assessed levels, frequencies, location/day preferences, notes, and referral info (preventing ASP query string overflow).

- **Success / Confirmation Screen (`handedOff = true`)**
  - Green checkmark confirmation banner ("We Received Your Request!").
  - Office text button (`817-973-5455`) & email button (`goswimarlsgpra@britishswimschool.com`).
  - Google Business & Google Maps cards for Arlington, Mansfield, and Grand Prairie locations.
  - Link to the official British Swim School location website.

---

## 3. Brand & Footer Guidelines
- British Swim School logo in header linking to `/`.
- Direct call link in header: `817-973-5455`.
- Footer does NOT contain "Locally owned by Greg & Melissa Hladik".
- Footer features a link to `/answers` ("Pricing, flexibility & trial details →").
