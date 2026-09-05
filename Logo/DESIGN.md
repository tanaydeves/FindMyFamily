---
name: Find My Family
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dada'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#414844'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#006d36'
  on-secondary: '#ffffff'
  secondary-container: '#6dfe9c'
  on-secondary-container: '#007439'
  tertiary: '#550004'
  on-tertiary: '#ffffff'
  tertiary-container: '#7e0008'
  on-tertiary-container: '#ff8074'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
  surface-card: '#FFFFFF'
  text-main: '#0D2119'
  text-muted: '#5C7168'
  border-subtle: '#E2E8F0'
  status-sms: '#F59E0B'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  distance-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 48px
  gutter: 20px
  margin-page: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system for the app is built on a foundation of **Calm Reliability**. Recognizing that the app is most likely used in high-stress, crowded environments (festivals, pilgrimages, transit hubs), the UI avoids visual noise in favor of high-legibility and functional clarity.

The visual style is **Corporate Modern with a High-Contrast edge**. It utilizes deep, grounding greens to project stability and trust, while leveraging vibrant accents for directional guidance and critical actions. The layout uses generous whitespace and large touch targets to ensure the app remains usable even when the user is moving through a crowd or using a device one-handed.

- **Primary Motif:** The Directional Arrow. It should be the most prominent visual element, rendered with high contrast against the light background.
- **Atmosphere:** Professional, dependable, and accessible.
- **Default Theme:** Light Mode (optimized for outdoor visibility and high-glare environments).

## Colors

The palette is strategically limited to ensure critical information stands out instantly.

- **Deep Green (#1B4332):** Used for primary branding, headers, and essential structural elements. It provides a serious, professional anchor for the UI.
- **Bright Green (#4ADE80):** Reserved for "the path forward." This is the color of the directional arrow and positive "success" states. Its high saturation ensures it is visible even at low screen brightness.
- **Alert Red (#DC2626):** Strictly reserved for the "I'm Lost" action and distress signals. It should contrast sharply with the rest of the green-themed UI to demand immediate attention.
- **Neutral (#F8FAF9):** A slightly cool, off-white background that reduces screen glare compared to pure #FFFFFF while maintaining high contrast for text.
- **Status Amber (#F59E0B):** Used specifically for the "SMS Fallback" banner to indicate a change in service state without signaling a total failure.

## Typography

Legibility is the highest priority. The system uses **Plus Jakarta Sans** for its modern, friendly, and highly readable letterforms. For technical labels and UI metadata, **Inter** provides a clean, neutral balance.

- **Scale:** Sizes are intentionally larger than standard mobile apps to accommodate users in motion or in direct sunlight.
- **Distance Display:** A specialized "distance-display" style is used on the Arrow screen to ensure the most critical number is readable at arm's length.
- **Hierarchy:** Strong weight differentiation (Bold vs. Regular) is used to guide the eye toward primary actions first.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous margins. 

- **One-Handed Use:** Primary buttons and critical interactive elements are placed in the "Lower Third" of the screen, within the natural reach of the thumb.
- **Touch Targets:** No interactive element should be smaller than 48x48px. 
- **The Arrow Screen:** This screen uses a "Central Focus" layout. The arrow occupies the central 60% of the viewport, with metadata (distance) immediately below it and secondary actions (distress button) at the bottom.
- **Padding:** Increased vertical padding in lists (family members, languages) prevents accidental taps in crowded environments.

## Elevation & Depth

This system uses **Tonal Layers and Low-Contrast Outlines** rather than heavy shadows to maintain clarity in bright light.

- **Surfaces:** The main background is the Neutral base. Cards and modals use a pure white surface with a subtle 1px border (#E2E8F0) to define their boundaries.
- **Z-Axis:** 
    - **Level 0 (Base):** Background.
    - **Level 1 (Cards):** Family member list items, permission cards. Use subtle borders.
    - **Level 2 (Modals/Banners):** SMS status banners and "I'm Lost" confirmation dialogs. Use a soft, diffused ambient shadow (10% opacity) to lift them above the content.
- **Interactive States:** Buttons use a solid fill; when pressed, they should shift slightly in hue or show a clear inner-glow to provide haptic and visual feedback.

## Shapes

The design uses **Rounded** geometry (8px / 0.5rem) to feel approachable and modern without being overly "bubbly."

- **Primary Buttons:** Use a standard rounded corner (8px).
- **Secondary Action Pills:** (e.g., status tags) use "rounded-xl" (24px) to differentiate them from primary buttons.
- **The Arrow:** Should have a slightly rounded tip and base to align with the rest of the UI's geometry, avoiding harsh, needle-like points that might feel aggressive.

## Components

- **Directional Arrow:** The centerpiece component. It must rotate smoothly (60fps animation). Color is Bright Green (#4ADE80). It should be accompanied by a "Distance Readout" in the `distance-display` type style.
- **Primary Action Button:** Full-width (minus margins), Deep Green (#1B4332) background with white text. Height: 56px.
- **Distress Button ("I'm Lost"):** Solid Red (#DC2626) background. Positioned at the bottom of the Arrow screen. Always triggers a confirmation dialog to prevent accidental triggers.
- **Family List Item:** Large-format card with a high-contrast name and a "Signal Strength" indicator (BLE RSSI).
- **Status Banner:** A thin, full-width strip at the top of the screen (Amber for SMS, Deep Green for Online).
- **Permission Cards:** Each permission (Location, BLE, SMS) should have a dedicated icon container with a circular background of 10% Primary Green.
- **Input Fields:** Used for naming devices. High-contrast borders (1.5px) when focused.