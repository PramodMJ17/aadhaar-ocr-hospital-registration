# Design System Specification: Clinical Precision & Human Warmth

## 1. Overview & Creative North Star: "The Digital Clinician"

This design system moves away from the sterile, cluttered aesthetic of traditional hospital software. Our Creative North Star is **"The Digital Clinician"**—an interface that feels as authoritative as a medical professional but as approachable as a high-end wellness retreat. 

We break the "template" look by rejecting rigid, boxy grids in favor of **intentional asymmetry** and **tonal depth**. The registration process for 'PESU IMSR – Aadhaar OCR Registration' must feel like a guided, premium service. We use high-contrast typography scales (the authoritative Manrope paired with the functional Inter) and "breathable" layouts to reduce user anxiety during the sensitive OCR and data entry process.

---

## 2. Colors: Tonal Atmosphere

We utilize a sophisticated palette where color is used to define space, not just decoration.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a clean, sophisticated break without the visual noise of a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create "nested" depth:
- **Base Layer:** `surface` (#f7f9fc) for the overall canvas.
- **Section Layer:** `surface-container-low` (#f2f4f7) for large content areas.
- **Action/Information Layer:** `surface-container-lowest` (#ffffff) for high-priority cards or input zones.

### The "Glass & Gradient" Rule
To elevate the experience, use **Glassmorphism** for floating elements (like fixed headers or mobile action bars). Use semi-transparent `surface` colors with a 12px to 20px backdrop-blur. 
*   **Signature Textures:** Apply a subtle linear gradient from `primary` (#00478d) to `primary-container` (#005eb8) on main action buttons to give them a "jewel-like" depth that feels more premium than a flat fill.

---

## 3. Typography: Editorial Authority

We use a dual-font strategy to balance medical authority with data readability.

*   **Display & Headlines (Manrope):** Used for large headers and step titles. Its wide apertures and geometric forms feel modern and confident.
    *   *Headline-LG:* 2rem (32px) — Use for main page titles like "Verify Aadhaar Details."
*   **Body & Labels (Inter):** Used for all functional data. Inter is optimized for the high legibility required for medical records and OCR results.
    *   *Body-MD:* 0.875rem (14px) — The workhorse for form fields and patient data.
    *   *Label-MD:* 0.75rem (12px) — All caps or bold for field headers to ensure they are distinct from user input.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often "dirty." In this system, we achieve hierarchy through light and layers.

*   **The Layering Principle:** Place a `surface-container-lowest` card (Pure White) on a `surface-container-low` background. This creates a soft, natural "lift" that mimics fine paper without needing a shadow.
*   **Ambient Shadows:** For floating elements (e.g., a modal or a primary action card), use an extra-diffused shadow: `box-shadow: 0 12px 32px rgba(25, 28, 30, 0.06);`. The shadow color is a tinted version of `on-surface` (#191c1e) to feel natural.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#c2c6d4) at **20% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** Use `surface_variant` at 70% opacity with a `blur(10px)` for step indicators to let the medical brand colors bleed through softly.

---

## 5. Components: Precision Elements

### Cards & Registration Modules
*   **Style:** Roundedness `xl` (1.5rem / 24px) for outer containers, `lg` (1rem / 16px) for inner modules.
*   **Rule:** Forbid divider lines. Use vertical white space (32px or 48px) to separate the OCR scan preview from the editable form fields.

### Buttons (The "Confidence" Set)
*   **Primary:** Gradient fill (`primary` to `primary-container`), white text, `xl` roundedness. High-confidence actions like "Confirm Identity."
*   **Secondary:** `surface-container-high` background with `on-primary-fixed-variant` text. Used for "Edit" or "Scan Again."
*   **Tertiary:** No background, `primary` text. Used for "Cancel" or "View Privacy Policy."

### Input Fields (The "OCR Ready" Input)
*   **Idle:** `surface-container-highest` background, no border, `md` roundedness.
*   **Focus:** 2px solid `primary`.
*   **Error:** `error-container` background with `on-error-container` text. Avoid the "red box" trope; use a soft red wash over the whole field.

### Step Indicators
*   Use a "Progressive Blur" track. Completed steps use `secondary` (#006e1c) for health/success. Current steps use a high-contrast `primary` pill.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme white space. If a form feels "tight," double the padding.
*   **Do** use `secondary` (#006e1c) for all "Success" states and "Verified" checkmarks to reinforce the feeling of health.
*   **Do** use `manrope` for numbers. In a medical context, numbers (Aadhaar ID, Date of Birth) are primary data.

### Don't:
*   **Don't** use black (#000000). Use `on-surface` (#191c1e) for a softer, more professional contrast.
*   **Don't** use standard "Warning Yellow." Use `tertiary` (#3b4952) for neutral warnings or pending states to maintain the high-end editorial feel.
*   **Don't** use 90-degree corners. Everything in a hospital should feel safe and "soft"—stick strictly to the `roundedness-lg` and `roundedness-xl` tokens.