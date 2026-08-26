# British Swim School — UI/UX Design System Specification

This document provides a comprehensive design system specification for replicating the visual design, color palette, typography hierarchy, component structures, and layout patterns of the British Swim School application.

---

## 1. Brand Color Palette

The application uses a high-contrast, premium color scheme anchored by official British Swim School brand colors and refined slate neutrals.

| Color Name | HEX Code | Tailwind Representation | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **BSS Deep Navy** | `#00205B` | `bg-[#00205B]`, `text-[#00205B]` | Primary headers, main container banners, primary swimmer badges, dark action buttons |
| **BSS Royal Blue** | `#132EA8` | `bg-[#132EA8]`, `text-[#132EA8]` | Selected state toggles, active tabs, link highlights, trial session indicators, copy buttons |
| **BSS Crimson Red** | `#DC001F` / `#E21836` | `bg-[#DC001F]`, `text-[#E21836]` | Primary pricing callouts, urgency badges, 5th Sunday override alerts, draft date markers |
| **Emerald Green** | `#10B981` / `#059669` | `bg-emerald-500`, `text-emerald-700` | Completed checkout states, audit success, active cart badges, attended classes |
| **Amber Gold** | `#F59E0B` / `#D97706` | `bg-amber-500`, `text-amber-800` | Discount tag highlights, pause fee banners, lookahead proration notices |
| **Royal Violet** | `#7C3AED` | `bg-[#7C3AED]`, `text-[#7C3AED]` | Last day of lessons marker, notice period conclusion tags |
| **Canvas Off-White** | `#F8FAFC` | `bg-slate-50` | Section background fills, calendar month tiles, secondary input backings |
| **Card Border Slate** | `#E2E8F0` | `border-slate-200` | Card borders, divider lines, structured table grids |
| **Muted Slate Text** | `#64748B` | `text-slate-500` | Subtitles, label eyebrows, secondary metadata |

---

## 2. Typography & Hierarchy System

The typography relies on standard system sans-serif fonts paired with strong uppercase tracking and bold weight variations.

### A. Typographic Scale & Styles

1. **Page Title / Main Banner Heading**:
   - `text-2xl` to `text-3xl`, `font-black`, `uppercase`, `tracking-tight`, `text-[#00205B]`.
   - Accompanied by emoji or icon pill and uppercase subtitle (`text-[9px] font-bold uppercase tracking-widest text-slate-400`).

2. **Section Subheadings & Eyebrows**:
   - `text-[10px]` or `text-xs`, `font-black`, `uppercase`, `tracking-widest`, `text-[#00205B]` or `text-slate-400`.

3. **Card Titles & Line Items**:
   - `text-xs` to `text-sm`, `font-extrabold` or `font-black`, `text-slate-800`.

4. **Micro-Typography (Audit Tables & Badges)**:
   - `text-[8px]` to `text-[9.5px]`, `font-black` or `font-extrabold`, `uppercase`, `tracking-wider`.
   - Original prices displayed with line-through muted text: `line-through text-slate-400 font-bold`.

---

## 3. Container & Card Layout Rules

### A. Nested Border Radius Rule
To achieve clean optical alignment, inner containers must mathematically scale down their corner radii:
$$\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$$

- **Outer App / Page Containers**: `rounded-[2.5rem]` or `rounded-[2rem]`, `p-8` or `p-6`, `border border-slate-200`, `shadow-2xl` or `shadow-xl`.
- **Inner Section Cards**: `rounded-2xl` or `rounded-3xl`, `p-4` or `p-5`, `border border-slate-100` / `border-slate-200`, `bg-slate-50/50`.
- **Micro Cards & Input Items**: `rounded-xl`, `p-2.5` or `p-3`, `border border-slate-200`.

---

## 4. Component Patterns

### A. Navigation Banners & Header Bars
- Solid `#00205B` Navy header background with `p-5` padding and rounded top corners (`rounded-t-[2rem]`).
- Left side: Icon in green or red rounded box (`p-1.5 bg-emerald-500 rounded-lg text-white`), uppercase title, and subtext.
- Right side: Red plan badge (`bg-[#E21836] text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest`).

### B. In-Cart Audit & Line-Item Transparency Tables
- Compact table with `table-fixed w-full border-collapse`.
- Header row: `bg-slate-100 border-b border-slate-200 text-[8px] font-black uppercase text-slate-500`.
- Sub-header row per swimmer: `bg-[#00205B]/5 border-y border-slate-150 py-0.5 px-2`.
- Data rows:
  - Line item title & detail: `text-[9px] font-extrabold text-slate-700` and `text-[7.5px] text-slate-400 font-bold`.
  - Original price: `text-right text-slate-400 font-bold line-through`.
  - Discount pills: `bg-amber-50 text-amber-700 border border-amber-100 text-[7px] font-extrabold px-1 py-0.2 rounded`.
  - Final price: `text-right font-black text-slate-800`.

### C. Preformatted Copy Blocks
- Light slate backing container (`bg-slate-50 border border-slate-200 rounded-[2rem] p-6`).
- Header flex row with section title and copy button (`bg-[#132EA8] hover:bg-[#0f2485] text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest`).
- Inner statement display box (`bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-medium font-sans leading-relaxed whitespace-pre-wrap shadow-inner h-[180px] overflow-y-auto`).

### D. Interactive Calendar Grids
- Month container: `bg-white rounded-3xl border border-slate-150 p-5 shadow-sm`.
- 7-column weekday header grid: `text-[9px] font-black text-slate-400 uppercase`.
- Tile states:
  - **Selected Start**: `bg-[#132EA8] text-white shadow-md font-black` + white dot badge.
  - **Trial Session**: `bg-blue-50 text-[#132EA8] border border-[#132EA8]/40` + blue dot badge.
  - **First Bill Sunday**: `bg-[#E21836]/10 text-[#E21836] border-2 border-dashed border-[#E21836] font-black` + "Bill" text pill.
  - **Notice Date**: `bg-[#00205B] text-white font-black` + "Note" text pill.
  - **Last Lesson Date**: `bg-[#7C3AED] text-white font-black` + "Last" text pill.
  - **Final Draft Date**: `bg-[#E21836] text-white font-black` + "Draft" text pill.
  - **Sunday Inactive**: `bg-red-50/50 text-red-200 cursor-not-allowed opacity-40`.

### E. Personalization Modal Dialogs
- Backdrop: `fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4`.
- Modal Card: `bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-5`.
- Header: Amber icon badge (`w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400`), uppercase title, close button (`✕`).
- Swimmer Input Row: `bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3`, level badge, dark input field (`bg-slate-900 border border-slate-700 text-white font-bold`).
- Action Buttons: Primary `#132EA8` blue button (`bg-[#132EA8] text-white font-black text-xs uppercase rounded-xl`) + Secondary dark button (`bg-slate-800 text-slate-300 font-black text-xs uppercase rounded-xl`).

---

## 5. Strict Anti-Slop Visual Rules

To maintain high visual quality:
1. **No Unsolicited Hero Banners**: Do not insert artificial marketing splash screens or hero images. Display the functional interface immediately.
2. **No Purple-Blue AI Gradients or Glassmorphism Overuse**: Stick to structured solid backgrounds (`#00205B`, `#132EA8`, `bg-slate-50`) with clean 1px hairline borders (`border-slate-200`).
3. **Control Labels Must Remain on Single Lines**: Buttons, pills, chips, tabs, and badges must strictly enforce `white-space: nowrap` and single-line labels.
4. **Touch & Click Feedback**: All interactive buttons incorporate hover color transitions (`hover:bg-blue-700`), active scale compressions (`active:scale-95`), and crisp focus rings (`focus:outline-none focus:ring-2`).
5. **Legibility & Contrast**: Maintain WCAG AA compliance with dark text (`#00205B`, `#0F172A`) on light backgrounds (`bg-white`, `bg-slate-50`).
