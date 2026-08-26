# Sibling Class Coordinator: Handoff & Technical Overview

This document provides a comprehensive technical guide and handoff for the **Sibling Class Coordinator Engine**. This tool allows coordinators and families to effortlessly coordinate schedules for multiple swimmers, finding either identical/overlapping timings or back-to-back lessons on the same day at the **same physical location**.

---

## 📍 Key Architecture & Location Matching

To ensure a seamless pool experience for parents, siblings must always be scheduled at the same physical branch. The engine automatically enforces this condition:

1. **Strict Branch Scoping (`${loc}|${day}`)**:
   Class availability is grouped by combinations of `loc` and `day`. Swimmers will never be matched across different physical locations even if class times overlap.
2. **Standardized Pool/Location Identifiers**:
   Internal API location codes are mapped to clear, user-facing physical pool IDs for reliable registration:
   - `arl` / `laflitt` $\rightarrow$ **`LAFLITT`** *(Arlington - Little Rd)*
   - `gp` / `lafgp` $\rightarrow$ **`LAFGP`** *(S. Grand Prairie)*
   - `man` / `man24h` $\rightarrow$ **`MAN24H`** *(Mansfield - 24 Hour Fitness)*

---

## 🎯 Class Level Filtering & Resolution Mechanism

To prevent overwhelming network payloads and ensure high matching precision, the system processes class levels across both backend API optimization and frontend backtracking state managers.

### 1. Server-Side Pre-Filtering (`Cat1` Param)
The API layer leverages the Jackrabbit Openings database server-side query filters to retrieve only relevant class types.
* **Upstream Optimization**: Instead of fetching all active location openings, the app aggregates the unique levels currently configured in the user's Swimmer Bank (e.g., `['Tadpole', 'Minnow']`).
* **Jackrabbit Routing Query**:
  ```
  /api/jackrabbit?locationCode=LAFLITT&levels=Tadpole,Minnow
  ```
  On the custom full-stack backend (`server.ts`), this is mapped to Jackrabbit's Category 1 parameters:
  ```typescript
  const catParam = levelsArr.map(l => encodeURIComponent(l)).join('|');
  const targetUrl = `${baseUrl}?OrgID=${orgId}&Loc=${locationCode}&Cat1=${catParam}&sort=Days,Times&showcols=${cols}`;
  ```
  This restricts the returned list strictly to classes that matching students qualify for.

### 2. Live Client-Side Parsing & Level Assignment
Once retrieved, each class name string is scraped and automatically filtered by name attributes inside `FamilyCoordinatorPage.tsx` and `SmsBypassView.tsx` where matches are built:
```typescript
const relevantClasses = localClasses.filter(c => {
  const isLevelNeeded = localSwimmers.some(s => s.level === c.level);
  const isLocationSelected = selectedLocations.includes(c.locationCode);
  return isLevelNeeded && isLocationSelected;
});
```
Classes whose titles map to the student's active level are grouped per student. Combos are evaluated using a recursive backtrack solver, measuring gaps between session start times to classify sibling options.

---

## 📋 Comprehensive Class Levels Mapping Table

The following table maps the **Internal Level Code Keys** used inside the source file settings against the actual names seen in the wild (on the public portals, administrative tables, and class search URLs) to keep coordination seamless.

| Internal Code Key (System Level) | Public & Administrative Sheet Names | Age Track / Group category | Parent In Water? |
| :--- | :--- | :--- | :--- |
| **`Tadpole`** | `Tadpole (Arlington) Tuesdays`, `Tadpole`, `Tadpole-` | Infants & Toddlers (Under 3) | **Yes** (Ratio 6) |
| **`Swimboree`** | `Swimboree (Arlington) ...`, `Swimboree` | Infants & Toddlers (Under 3) | **Yes** (Ratio 6) |
| **`Seahorse`** | `Seahorse (Arlington) ...`, `Seahorse` | Infants & Toddlers (Under 3) | **No** (Ratio 4) |
| **`Starfish`** | `Starfish (Arlington) ...`, `Starfish` | Kids (3-12 yrs) Beginner | **No** (Ratio 4) |
| **`Minnow`** | `Minnow (Arlington) ...`, `Minnow` | Kids (3-12) Some Experience | **No** (Ratio 4) |
| **`Turtle 1`** | `Turtle 1 (Arlington) ...`, `Turtle 1-` | Kids (3-12) Some Experience | **No** (Ratio 4) |
| **`Turtle 2`** | `Turtle 2 (Arlington) ...`, `Turtle 2` | Kids (3-12) Swim Team Prep | **No** (Ratio 4) |
| **`Shark 1`** | `Shark 1 (Arlington) ...`, `Shark 1` | Kids (3-12) Swim Team Prep | **No** (Ratio 4) |
| **`Shark 2`** | `Shark 2 (Arlington) ...`, `Shark 2` | Kids (3-12) Swim Team Prep | **No** (Ratio 4) |
| **`Barracuda 1`** | `Barracuda 1 - (Arlington) ...`, `Barracuda` | Advanced / Pre-Swim Team | **No** (Ratio 6) |
| **`Barracuda 2`** | `Barracuda 2 - ...` | Advanced / Pre-Swim Team | **No** (Ratio 6) |
| **`Barracuda 3`** | `Barracuda 3 - ...` | Advanced / Pre-Swim Team | **No** (Ratio 6) |
| **`Dolphin`** | `Dolphin (Arlington) ...`, `Dolphin` | Adaptive / Auxiliary Needs | **No** (Ratio 1 - Private) |
| **`Young Adult 1`** | `Young Adult 1 (Arlington) ...` | Teens (13-18 yrs) | **No** (Ratio 3) |
| **`Adult Level 1`** | `Adult 1 (Arlington) ...`, `Adult 1` | Adults (18+ yrs) Beginner | **No** (Ratio 3) |
| **`Adult Level 2`** | `Adult 2 (Arlington) ...`, `Adult 2` | Adults (18+ yrs) Intermediate | **No** (Ratio 3) |
| **`Adult Level 3`** | `Adult 3` | Adults (18+ yrs) Advanced | **No** (Ratio 3) |

---

## ⚡ Matching Logic Configurations

The sibling coordinator processes available lessons and categorizes them into three distinct slot arrangements depending on swimmer volume and slot overlaps:

```
                  ┌─────────────────────────────────┐
                  │   Groups Filtered Web Openings  │
                  │   by Location & Day Combination │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                   /───────────────────────────────\
                  <  Are 2 or More Swimmers Built?  >
                   \───────────────────────────────/
                                   │
                  ┌────────────────┴────────────────┐
               YES│                                 │NO
                  ▼                                 ▼
         /─────────────────\               ┌────────────────┐
        < Overlaps Found?  >               │  Single Slot   │
         \─────────────────/               │  Fallback Mode │
          │               │                └────────────────┘
       YES│             NO│
          ▼               ▼
  ┌───────────────┐ ┌───────────────┐
  │ Same Time     │ │ Single Slot   │
  │ / Back-to-Back│ │ Standard List │
  └───────────────┘ └───────────────┘
```

### 1. Same-Time Matches (Coordinated Options)
* **Rule**: Matches two or more classes that share the exact **Day**, **Time**, and **Location Key**, but serve the required skill levels of the selected swimmers.
* **Score**: `100` points (highest priority in UI presentation).
* **UI Indicator**: Green Badge (`SAME TIME`).

### 2. Back-to-Back Matches (Coordinated Options)
* **Rule**: Detects pairs of lessons occurring at the same branch with an interval of exactly `30 minutes` (assuming standard lesson durations), allowing a parent to drop off or watch siblings sequentially.
* **Score**: `50` points.
* **UI Indicator**: Blue Badge (`BACK-TO-BACK`).

### 3. Single-Slot Matches (Fallback Mode)
* **Rule**: Served when a group has only **1 swimmer configured**, or when **no identical/neighboring overlap slots are available** for the chosen criteria.
* **Score**: `10` points.
* **Design**: Standardized, clean list representation showing individual options without cross-level alignment constraints.

---

## 🔗 Live Booking Link Resolver

Registration links are compiled dynamically to match Jackrabbit Class portals with zero margin for error. 

### Accurate Class ID Extraction (`server.ts`)
Instead of assuming simple array indexes, class parser indexes extract distinct dynamic identification tags from Jackrabbit redirect tables:
```typescript
const linkMatch = registerLink.match(/[?&preLoadClassID|ClassID|xID|classid|preloadclassid]=([^&]+)/i);
const id = linkMatch ? linkMatch[2] : Math.random().toString(36).substr(2, 9);
```

### Dynamic Parameters Injection (`FamilyCoordinatorPage.tsx`)
```typescript
export function getPreciseRegisterUrl(cls: any, level: string, locCode: string, dir: any) {
  const basePreload = "https://app.jackrabbitclass.com/regv2/regga.aspx?id=553758";
  const finalLoc = locCode === "LAFGP" ? "LAFGP" : (locCode === "LAFLITT" ? "LAFLITT" : "MAN24H");
  
  if (cls.id && cls.id.length > 5) {
    return `${basePreload}&preLoadClassID=${cls.id}&loc=${finalLoc}`;
  }
  // Fallback pattern matching
  return `${basePreload}&loc=${finalLoc}`;
}
```

---

## 🎨 Visual Elements & UX Adjustments

* **Verified Staff/Instructor Labeling**:
  Filters out internal administrative shifts (like "Deck Ambassador" or "Manager on Duty") from standard lessons. If a class list names "Staff" or general placeholders, it displays beautifully structured as **Staff**, rather than parsing it as `"Coach Staff"`.
* **High Contrast Action Buttons**: 
  Quick action links take the parent directly to the live billing check out forms pre-filled with the target location, pre-loaded classes, and level details.
* **Intuitive Filters**: 
  Allows real-time micro-toggle filtering by Arlington, Mansfield, or Grand Prairie, completely updating matching cards.

