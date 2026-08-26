# British Swim School — Student Tuition, Discounts & Billing Calculator Specification

This document provides a complete technical and mathematical blueprint for AI agents and developers to replicate the **Student Tuition, Discounts, and Billing Calculator** logic for British Swim School families.

---

## 1. Core Pricing Tiers & Swimmer Categories

Tuition is billed on a monthly subscription basis based on student age/level category and selected weekly lesson frequency (Pace).

### A. Monthly Tuition Rates Table

| Age / Category | Foundation Pace (1x/week) | Standard Pace (2x/week) | Unlimited Pace (Unlimited) |
| :--- | :--- | :--- | :--- |
| **Under 3 Years Old** *(Tadpole, Swimboree, Seahorse)* | **$114.99** / mo | **$159.99** / mo | **$199.99** / mo |
| **Kids 3–12, Teens & Pre-Swim Team** *(Starfish, Minnow, Turtle 1, Turtle 2, Shark 1, Shark 2, Barracuda, Young Adult)* | **$139.99** / mo | **$199.99** / mo | **$249.99** / mo |
| **Adults** *(Adult Level 1, 2, 3)* | **$159.99** / mo | **$249.99** / mo | **$299.99** / mo |
| **Special Needs / Adaptive (Dolphin)** | **Semi-Private:** $249.99 / mo | **Private:** $499.99 / mo | N/A |

*Note: All prices are fully configurable in app settings, but defaults follow the matrix above.*

---

## 2. Multi-Swimmer Sibling Discount Rules

When a family enrolls multiple swimmers, discounts are determined by identifying the primary swimmer:

1. **Primary Swimmer Identification**:
   - Calculate the un-discounted tuition for each swimmer in the family.
   - The swimmer with the **highest tuition amount** is designated as the **Primary Swimmer**.
   - If multiple swimmers share the same highest tuition rate, the first swimmer in order is selected as Primary.

2. **Sibling Discount Application**:
   - **Primary Swimmer**: Receives **0% Sibling Discount** (pays 100% of applicable tuition).
   - **Secondary Swimmers (2nd, 3rd, 4th+ Swimmers)**: Receive a **10% Sibling Discount** applied to all class tuitions for that swimmer.

---

## 3. Multi-Class / Pace Bundle Discount Rules

When a swimmer enrolls in multiple classes per week (e.g., Standard 2x/week or Unlimited):

1. **Foundation Pace (1x/week)**:
   - Class 1 = Full Base Tier Foundation Tuition (minus 10% Sibling Discount if secondary swimmer).

2. **Standard Pace (2x/week Bundle)**:
   - Standard Pace provides a bundled rate for 2 weekly lessons.
   - **Bundle Discount Calculation**:
     $$\text{Bundle Discount} = (2 \times \text{Foundation Base Rate}) - \text{Standard Pace Rate}$$
   - **Class 1 Tuition**:
     $$\text{Class 1 Final} = \text{Foundation Base Rate} - \text{Sibling Discount (if applicable)}$$
   - **Class 2 Tuition**:
     $$\text{Class 2 Original} = \text{Foundation Base Rate}$$
     $$\text{Class 2 Discount} = \text{Bundle Discount} + \left((\text{Foundation Base Rate} - \text{Bundle Discount}) \times 10\%\text{ Sibling Discount (if applicable)}\right)$$
     $$\text{Class 2 Final} = \text{Class 2 Original} - \text{Class 2 Discount}$$

3. **Unlimited Pace**:
   - Class 1 = Foundation Base Rate.
   - Class 2 (Unlimited Surcharge) = $(\text{Unlimited Rate} - \text{Foundation Rate})$.
   - 10% Sibling discount applies to both Class 1 and Class 2 if secondary swimmer.

---

## 4. Annual Enrollment / Registration Fee (First Month Only)

Every enrolled student is charged an annual registration fee that covers swim caps, swim bag, and annual swim insurance.

### Rules & Family Cap Calculation:
- **Individual Fee**: **$49.99** per student (or $39.99 configurable).
- **Family Maximum Cap**: **$59.99** maximum total registration fee per family.
- **Sequential Fee Accumulation Algorithm**:
  - Maintain `accumulatedEnrollmentFee = 0`.
  - For each swimmer in the family:
    $$\text{Remaining Cap} = \max(0, \text{Family Max} - \text{accumulatedEnrollmentFee})$$
    $$\text{Swimmer Registration Fee} = \min(\text{Individual Fee}, \text{Remaining Cap})$$
    $$\text{accumulatedEnrollmentFee} \gets \accumulatedEnrollmentFee + \text{Swimmer Registration Fee}$$
    $$\text{Discounted / Waived Portion} = \text{Individual Fee} - \text{Swimmer Registration Fee}$$

### Example (Family of 3 Swimmers @ $49.99 fee / $59.99 max cap):
- **Swimmer 1**: Pays **$49.99** (Accumulated: $49.99, Remaining Cap: $10.00).
- **Swimmer 2**: Pays $\min(\$49.99, \$10.00) =$ **$10.00** (Accumulated: $59.99, Discount: $39.99 "Cap Limit Part").
- **Swimmer 3**: Pays **$0.00** (Family Cap Met, Discount: $49.99 "Family Cap Met").
- **Total Registration Fees Charged to Family**: **$59.99**.

---

## 5. First Month Total vs. 2nd & Beyond Months Summary

When quoting a family, clear separation must be made between their **First Month Payment (Due Today)** and their **Ongoing Monthly Subscription**:

### A. First Month Total Due Today Formula
$$\text{Total Monthly Tuition} = \sum (\text{Final Monthly Tuition for All Swimmers \& Classes})$$
$$\text{Total Registration Fees} = \sum (\text{Final Registration Fee per Swimmer, Capped at \$59.99})$$
$$\mathbf{\text{First Month Payment (Due Today)}} = \text{Total Monthly Tuition} + \text{Total Registration Fees}$$

### B. 2nd Month & Beyond Recurring Tuition Formula
$$\mathbf{\text{Ongoing Monthly Tuition (Month 2+)}} = \text{Total Monthly Tuition}$$
*(The annual registration fee is a one-time charge and drops off starting in Month 2).*

### C. Standard Preformatted Parent Pitch Text
```text
Your first payment on the day you enroll is $[First_Month_Total]. This includes your first month's tuition of $[Total_Monthly_Tuition] plus a one-time annual enrollment fee of $[Total_Registration_Fees].

Your ongoing monthly tuition will be $[Total_Monthly_Tuition] starting in your second month.
```

---

## 6. Onboarding Trial & Recurring Sunday Billing Cycle Algorithm

1. **Introductory Trial Sessions**:
   - Initial enrollment includes 4 classes per weekly session frequency selected (e.g. 1 class/week = 4 trial sessions; 2 classes/week = 8 trial sessions).
   - Two-class money-back guarantee allows cancellation before the 3rd lesson date.

2. **First Recurring Bill Sunday Calculation**:
   - Identify the last chronological introductory trial class session date (`lastIntroSession`).
   - Find the next Sunday immediately following `lastIntroSession`:
     $$\text{firstBillSunday} = \text{nextSunday}(\text{lastIntroSession})$$

3. **5th Sunday Override Rule**:
   - Determine which Sunday of the month `firstBillSunday` falls on (1st, 2nd, 3rd, 4th, or 5th Sunday).
   - **Rule**: If `firstBillSunday` is the **5th Sunday** of a month, override the billing date to the **25th of the prior month**.
   - Otherwise, recurring billing recurs on that ordinal Sunday of each month (e.g., "1st Sunday of each month").

---

## 7. Cancellation & Final Proration Calculation Logic

When a family submits a notice to cancel or pause their subscription, strict proration rules apply.

### A. Notice Period Duration
- **Standard Requirement**: **30-day written notice**.
- **31-Day Class Day Adjustment Rule**: If the 30th day falls on a scheduled lesson day, extend the notice period to **31 days** so the student is permitted to attend and swim on their final lesson day.
- **Unhappy Parent Waiver (Goodwill Override)**: If active, waives the 30-day requirement to end lessons immediately at the end of the current paid billing cycle.

### B. Final Proration Calculation Formula

To calculate the final prorated tuition charge when the notice period extends into the next billing cycle:

1. **Determine Single Lesson Rate**:
   - Standard month consists of 4 weeks per class.
   - For a student attending $N$ classes per week (`classesPerWeek`):
     $$\text{Lesson Rate} = \frac{\text{Monthly Tuition}}{4 \times \text{classesPerWeek}}$$
   - *Example*: For a monthly tuition of $159.99 with 1 class/week:
     $$\text{Lesson Rate} = \frac{\$159.99}{4} = \$39.9975 \text{ per lesson}$$

2. **Count Remaining Prorated Lessons**:
   - Count the number of scheduled class days ($R$) that fall inside the **next billing cycle** on or before the `lastLessonDate` (end of notice period).

3. **Calculate Prorated Tuition**:
   $$\text{Prorated Tuition} = \min\left(\text{Monthly Tuition},\; R \times \text{Lesson Rate}\right)$$
   $$\mathbf{\text{Prorated Tuition}} = \frac{1}{4} \times \text{Monthly Tuition} \times \left(\frac{R}{\text{classesPerWeek}}\right)$$

4. **Pause Subscription Fee**:
   - If the action is **Pause** (instead of complete cancellation):
     $$\text{Pause Fee} = \$10.00 / \text{month}$$
     $$\mathbf{\text{Total Final Draft}} = \text{Prorated Tuition} + \$10.00$$
   - If the action is **Cancel**:
     $$\mathbf{\text{Total Final Draft}} = \text{Prorated Tuition}$$

5. **Unhappy Parent Waiver (Goodwill) Override Output**:
   - Next cycle prorated tuition = **$0.00**.
   - Lessons end on the last day of the current paid billing cycle.

---

## 8. Summary Checklist for AI Replicators

When implementing this logic in code:
- [ ] Parse swimmer ages/categories to assign base pricing tiers.
- [ ] Sort swimmers by base price descending to select the **Primary Swimmer**.
- [ ] Apply **10% Sibling Discount** to all non-primary swimmers.
- [ ] Apply **2x Bundle Discount** for Standard pace (2 classes/week).
- [ ] Calculate cumulative **Annual Registration Fee** with individual $49.99 fee and **$59.99 Family Cap**.
- [ ] Separate outputs into **First Month Total Due Today** and **2nd Month & Beyond Recurring Tuition**.
- [ ] Apply **5th Sunday Override Rule** (shift to 25th of prior month) for recurring billing cycles.
- [ ] Calculate cancellation proration as $\frac{1}{4} \times \text{Monthly Tuition} \times \text{Lessons Remaining}$ plus optional $10 Pause Fee.
