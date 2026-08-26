# British Swim School — User Design Preferences & UI/UX Style Guide

This document summarizes the exact UI/UX design preferences, visual hierarchy patterns, color palettes, component structures, and craftsmanship principles established across the **British Swim School Operations Suite**.

---

## 🎨 1. Brand Identity & Color Palette

The design aesthetic blends official British Swim School corporate brand colors with a high-contrast, clean slate neutral scheme for maximum readability during fast-paced phone and deck operations.

### Core Color Tokens

| Palette Token | Color Code | Tailwind Standard | Application / Context |
| :--- | :--- | :--- | :--- |
| **BSS Deep Navy** | `#00205B` | `bg-[#00205B]`, `text-[#00205B]` | Header banners, primary card headings, primary swimmer badges, dark action buttons |
| **BSS Royal Blue** | `#132EA8` | `bg-[#132EA8]`, `text-[#132EA8]` | Active navigation tabs, primary CTA buttons, selected state toggles, trial session badges, link highlights |
| **BSS Crimson Red** | `#DC001F` / `#E21836` | `bg-[#DC001F]`, `text-[#E21836]` | Primary pricing callouts, urgency badges, 5th Sunday bill date warnings, plan badges |
| **Emerald Green** | `#10B981` / `#059669` | `bg-emerald-500`, `text-emerald-700` | Active cart badges, audit checkmarks, completed checkout states, attended class toggles |
| **Amber Gold** | `#F59E0B` / `#D97706` | `bg-amber-500`, `text-amber-800` | Discount tags, pause fee banners, default swimmer name warnings |
| **Royal Violet** | `#7C3AED` | `bg-[#7C3AED]`, `text-[#7C3AED]` | Last day of lesson tags, notice period conclusion markers |
| **Canvas Off-White** | `#F8FAFC` | `bg-slate-50` | Section backgrounds, calendar month backings, secondary input tiles |
| **Hairline Border** | `#E2E8F0` | `border-slate-200` | Card boundaries, divider lines, structured audit grids |
| **Muted Slate Text** | `#64748B` | `text-slate-500` | Eyebrow labels, subtitles, line-through original prices |

---

## ♿ 2. Accessibility & WCAG 2.0 Compliance

The user interface strictly adheres to **WCAG 2.0 Level AA** accessibility standards:

1. **High Contrast Ratios**:
   - All text meets or exceeds the WCAG 4.5:1 contrast requirement for normal text and 3:1 for large text.
   - Deep Navy (`#00205B`) and Dark Slate (`#0F172A`) are paired with light backgrounds (`#FFFFFF`, `#F8FAFC`).
2. **Keyboard Focus States**:
   - All interactive controls feature high-visibility focus indicators (`focus:outline-none focus:ring-2 focus:ring-[#132EA8] focus:ring-offset-2`).
3. **Screen Reader Accessibility**:
   - Icon-only buttons and controls include `aria-label` attributes.
   - Form fields use semantic labels and structural fieldsets.

---

## 🔘 3. Interaction & Input Preferences

1. **Buttons Over Drop-Downs**:
   - Prefer **segmented button groups, pill toggle grids, and button cards** over native `<select>` drop-down menus whenever options are 5 or fewer.
   - Allows staff to see all options at a glance and select choices with a single click during fast-paced customer calls.

2. **Plus (+) and Minus (-) Stepper Controls**:
   - Use dedicated **Plus (`+`) and Minus (`-`) button steppers** for numerical inputs (swimmer count, age, class frequency, gap minutes) instead of standard numeric text inputs or drop-downs.
   - Steppers feature touch-friendly target sizes (min 40px/44px) with subtle hover and active feedback states.

3. **One-Click Copy Buttons**:
   - Every generated pitch, SMS text, email response, registration link, and calculation statement **must feature a dedicated one-click Copy button**.
   - Eliminates the need for users to manually drag-select text and right-click to copy.
   - Displays clear, instant visual confirmation (`Copied!` badge in green/blue) for 2000ms upon clicking.

---

## 📐 4. Layout Structure & Sleek Card Architecture

1. **Clean Cards & Modern Aesthetics**:
   - Features sleek white and light slate cards defined by 1px hairline borders (`border-slate-200` or `border-slate-100`).
   - Uses soft, high-quality depth shadows (`shadow-xl` or `shadow-2xl` on main containers, `shadow-sm` on inner cards).
   - Generous negative space padding (`p-6` to `p-8` on containers, `p-4` to `p-5` on cards) to avoid visual clutter.

2. **Mathematical Corner Radius Scaling**:
   - Container corner radii scale down logically relative to padding:
     $$\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$$
   - **Main Containers**: `rounded-[2.5rem]` or `rounded-[2rem]`.
   - **Inner Cards**: `rounded-3xl` or `rounded-2xl`.
   - **Buttons & Pills**: `rounded-xl` or `rounded-full`.

3. **Header Banner Architecture**:
   - Banners use solid `#00205B` Deep Navy with rounded top corners (`rounded-t-[2rem]`).
   - Includes icon pill, uppercase title, subtext, and plan/status badges.

---

## ⚡ 5. Interactive UI & Micro-Interaction Summary

1. **Persona Identity Switcher**:
   - Persistent top-right toggle bar allowing staff to switch active identity (**Greg**, **Melissa**, **Elisa**, **Emery**).
   - Selection updates persona badges, signature strings, and AI generation prompts automatically.

2. **Personalization Interception Modals**:
   - When default swimmer names (`Swimmer 1`, `Swimmer 2`) are present during pitch copying, a dark backdrop modal (`bg-slate-950/80 backdrop-blur-md`) opens prompting staff to enter real student names before completing the copy.

3. **In-Cart Line-Item Transparency Tables**:
   - Audit breakdown tables with fixed column widths, itemized discounts, capped fee accumulation, and clear separation between **First Month Due Today** and **Ongoing Month 2+ Tuition**.

4. **Visual Calendar Day Grids**:
   - Interactive calendar grids with color-coded dot indicators for start dates, trial lessons, bill Sundays, notice periods, and final draft dates.

---

## 🚫 6. Anti-Slop Visual Rules

- **No Hero Marketing Headers**: Never display promotional splash screens or decorative landing heroes. Present functional tools immediately upon load.
- **No Purple-Blue AI Gradients or Glassmorphism Overuse**: Avoid generic multi-color gradients or overly blurry glass effects. Use solid navy, royal blue, and crisp white/slate cards with 1px borders.
- **No Hyphenated or Wrapped Control Labels**: Badges, pills, tabs, and buttons must stay on a single line (`nowrap`).
- **Tactile Hover & Active States**: All interactive elements incorporate hover color shifts (`hover:bg-blue-700`), active scale compression (`active:scale-95`), and crisp focus rings (`focus:outline-none`).

