---
name: Academic Excellence System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#454652'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#767683'
  outline-variant: '#c6c5d3'
  surface-tint: '#4957ae'
  primary: '#10207a'
  on-primary: '#ffffff'
  primary-container: '#2b3990'
  on-primary-container: '#9ca9ff'
  inverse-primary: '#bbc3ff'
  secondary: '#bb0013'
  on-secondary: '#ffffff'
  secondary-container: '#e71520'
  on-secondary-container: '#fffbff'
  tertiary: '#003415'
  on-tertiary: '#ffffff'
  tertiary-container: '#004d22'
  on-tertiary-container: '#3ec66d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bbc3ff'
  on-primary-fixed: '#000e5e'
  on-primary-fixed-variant: '#303e95'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000d'
  tertiary-fixed: '#78fc9c'
  tertiary-fixed-dim: '#5adf82'
  on-tertiary-fixed: '#00210b'
  on-tertiary-fixed-variant: '#005225'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is built for **Muktir Shiksha College of Education & Pharmacy**, targeting prospective students, current scholars, and faculty. The personality is **aspirational, authoritative, and vibrantly academic**. It balances the historical prestige of an educational institution with the modern infrastructure required for contemporary pharmacy and education studies.

The visual style follows a **Corporate / Modern** aesthetic with a sophisticated editorial edge. It utilizes generous whitespace to convey a sense of campus openness, paired with high-quality photography of modern labs and student life. The interface avoids cold institutional patterns in favor of warm, student-focused layouts that emphasize growth and opportunity.

## Colors

The color palette is derived directly from the institutional seal, ensuring brand continuity while optimizing for digital legibility.

*   **Primary (Navy):** Used for navigation, headers, and primary buttons. It represents stability and professional trust.
*   **Secondary (Red):** Used sparingly for urgent calls to action (e.g., "Apply Now") and important status indicators.
*   **Tertiary (Green):** Representing pharmacy and growth, used for success states and sustainability initiatives.
*   **Accent (Yellow):** Employed for highlighting key information, student testimonials, and important deadlines.
*   **Neutrals:** A range of cool greys and off-whites provide a clean backdrop for academic content, keeping the focus on imagery and data.

## Typography

The typography strategy creates a "Prestige Meets Modernity" hierarchy. **Playfair Display** provides a classic, scholarly feel for large headlines, evoking the weight of a degree or official publication. 

**Plus Jakarta Sans** is used for all body text and functional UI elements. Its soft, open terminals and modern geometric construction make it approachable for a younger student audience, ensuring high readability for dense course descriptions and application forms. Headlines should maintain a tight letter-spacing to appear more professional, while labels use slight tracking for clarity.

## Layout & Spacing

This design system employs a **Fluid Grid** model to accommodate the varied information density of an academic portal. 

*   **Desktop:** 12-column grid with 24px gutters. Content is often contained within an 1140px or 1280px max-width container to maintain readability.
*   **Tablet:** 8-column grid with 16px gutters.
*   **Mobile:** 4-column grid with 16px margins. 

The spacing rhythm follows an 8px base scale. Use `lg` and `xl` spacing to separate major content sections like "Campus Gallery" or "Featured Courses," allowing the design to breathe and appear premium rather than cluttered.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

*   **Surfaces:** The background uses a very light neutral-grey. Content cards sit on pure white surfaces to create a crisp "paper" feel.
*   **Shadows:** Use extremely soft, diffused shadows with a subtle primary-color tint (Navy) to lift elements off the page without appearing "gamified."
*   **Interaction:** Interactive elements like course cards use a slight lift on hover (increased shadow spread) to provide tactile feedback to prospective students.
*   **Dividers:** Use thin, low-contrast lines (Neutral 200) to separate logical sections within forms or lists without breaking the visual flow.

## Shapes

The shape language is **Rounded**, favoring a friendly and inclusive atmosphere. 

*   **Standard Cards/Inputs:** 0.5rem (8px) radius provides a balanced, modern look.
*   **Primary CTA Buttons:** Utilize `rounded-lg` (16px) or full pill-shaping to stand out and invite interaction.
*   **Visual Accents:** The starburst pattern from the logo can be used as a subtle background watermark or a decorative element in image crops to reinforce brand identity.

## Components

### Buttons & Navigation
*   **Primary Action:** Navy background with white text, bold weight. High-contrast and easily identifiable.
*   **Secondary Action:** Outlined buttons with 2px borders using the Navy or Red primary colors.

### Course Grids & Cards
*   Cards include a high-resolution image at the top, followed by a category chip (Education vs. Pharmacy), the degree title in Playfair Display, and a "Learn More" link.
*   The cards should have a subtle 1px border and a soft ambient shadow.

### Admission Timelines
*   A vertical or horizontal track using the Accent (Yellow) for current status and Primary (Navy) for completed steps. 
*   Icons should be used to represent key milestones (Application, Interview, Selection).

### Student Testimonials
*   Large-format quotes in Playfair Display, utilizing the Accent color for the opening quotation marks.
*   Circular student avatars with a 3px Tertiary (Green) or Primary (Navy) border.

### Campus Galleries
*   Asymmetric masonry grids to showcase modern infrastructure. Images should have the standard 8px rounded corners to maintain the system's softness.

### Input Fields
*   Clearly labeled with Plus Jakarta Sans. 
*   Active states are indicated by a 2px Primary (Navy) bottom-border or full-border focus ring.