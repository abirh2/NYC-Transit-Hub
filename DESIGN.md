---
name: NYC Transit Hub
description: A calm, rider-first operational interface for fast NYC transit decisions.
colors:
  transit-blue: "#0039A6"
  transit-green: "#00933C"
  transit-yellow: "#FCCC0A"
  transit-orange: "#FF6319"
  transit-red: "#EE352E"
  transit-gray: "#808183"
  app-dark: "#0a0a0a"
  panel-dark: "#161616"
  app-light: "#f5f5f5"
  panel-light: "#ffffff"
  focus-dark: "#4f83ff"
typography:
  page-title:
    fontFamily: "var(--font-sans)"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.333
  section-title:
    fontFamily: "var(--font-sans)"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-sans)"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  numeric:
    fontFamily: "var(--font-mono)"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  pill: "9999px"
spacing:
  page-mobile: "1rem"
  page-desktop: "2rem"
  section-mobile: "1.5rem"
  section-desktop: "2.5rem"
  card-mobile: "1rem"
  card-desktop: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.transit-blue}"
    textColor: "{colors.panel-light}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  surface-panel-dark:
    backgroundColor: "{colors.panel-dark}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-mobile}"
  surface-panel-light:
    backgroundColor: "{colors.panel-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-mobile}"
---

# Design System: NYC Transit Hub

## Overview

**Creative North Star: "The Rider Control Panel"**

NYC Transit Hub is a calm, utilitarian interface for decisions made while walking, waiting, or changing plans. It uses operational clarity rather than decoration: route identity, direction, destination, time, and disruption state carry the visual weight.

The system is dense but not crowded. Strong headings and restrained panel borders establish hierarchy; saturated color is reserved for route identity, primary action, status, and focus. Dark and light themes express the same hierarchy without changing semantic meaning.

**Key Characteristics:**

- Rider decisions appear before analytics or implementation metadata.
- Plain language and honest unavailable states replace optimistic inference.
- Route and status meaning always includes text, never color alone.
- Mobile targets support one-handed use; desktop preserves the same reading order.

## Colors

The palette combines quiet neutral surfaces with rare, functional MTA color.

### Primary

- **Transit Blue:** Primary actions, selected navigation, and intentional emphasis.

### Secondary

- **Service Green, Yellow, Orange, and Red:** Normal, advisory, delay, and severe states respectively. Always pair these colors with readable labels.

### Neutral

- **Night App and Night Panel:** Default dark-theme canvas and contained surface.
- **Day App and Day Panel:** Light-theme canvas and contained surface.
- **Transit Gray:** Unavailable states and low-priority operational context.
- **Focus Blue:** The visible focus ring on dark surfaces; light mode resolves focus through the selected-state color.

**The Functional Color Rule.** Saturated color communicates route identity, action, selection, focus, or service state; it is not ambient decoration.

## Typography

**Display Font:** System sans through `--font-sans`
**Body Font:** System sans through `--font-sans`
**Label/Mono Font:** System monospace through `--font-mono`

**Character:** Direct, compact, and highly legible. Weight and spacing establish priority while realtime values use tabular numerals for stable scanning.

### Hierarchy

- **Page title:** Bold and compact; one per page.
- **Section title:** Semibold and descriptive; establishes the scanning path.
- **Body:** Plain rider language with secondary copy softened, not miniaturized.
- **Numeric:** Semibold monospace with tabular figures for arrivals, durations, and counts.

**The ETA Rule.** A rider-critical time is visually stronger than its supporting destination or location, and digits do not shift as time updates.

## Layout

Use a 1rem mobile page gutter and 2rem desktop gutter. Sections follow a 1.5rem mobile rhythm and 2.5rem desktop rhythm. Mobile is a single semantic reading order; desktop may place that sequence into two columns only when keyboard, screen-reader, and visual traversal remain aligned. Persistent mobile navigation reserves safe-area clearance and every touch target is at least 44px.

## Elevation & Depth

Depth is mostly tonal and structural. Panel surfaces use subtle borders with no shadow; elevated and floating surfaces introduce the existing medium and large shadow tokens. Use floating depth for overlays and controls, not ordinary content cards.

**The Flat-by-Default Rule.** Ordinary information panels remain flat; elevation signals interaction context or overlay priority.

## Shapes

Panels and major controls use gently curved 0.75rem corners. Smaller controls may use 0.5rem or 0.25rem corners. Status chips and transit bullets use full pill geometry. Borders remain thin and low contrast so they organize without competing with route markers.

## Components

### Buttons

- **Primary:** Solid Transit Blue, white text, strong label, and a 0.75rem radius.
- **Hover / Focus:** Use modest opacity or surface-state change and the shared two-pixel focus ring; never remove the outline.
- **Secondary:** Quiet surface treatment with a clear border or sufficient tonal contrast.

### Chips

- **Style:** Compact pill with a semantic background and explicit label.
- **State:** Yellow and gray use dark text; saturated green, orange, red, blue, and stale gray use white text.

### Cards / Containers

- **Corner Style:** Gently curved (0.75rem).
- **Background:** Theme-aware panel, elevated, or floating surface.
- **Shadow Strategy:** None for panels; tokenized shadows only for elevated/floating contexts.
- **Border:** Subtle at panel/elevated levels and stronger for floating surfaces.
- **Internal Padding:** 1rem mobile, increasing to 1.5rem where desktop density permits.

### Navigation

Desktop uses a persistent grouped sidebar with a restrained selected surface. Mobile uses five fixed, 44px-minimum destinations and a More drawer. Active state includes text/icon treatment and `aria-current`, not color alone.

### Departure Row

Show mode/route identity first, destination and rider-facing direction second, and a strong tabular ETA at the trailing edge. The entire compact row links to the exact trip.

## Do's and Don'ts

### Do:

- **Do** lead each surface with the next rider decision.
- **Do** keep exact trip identity and station-complex context through navigation.
- **Do** show loading, stale, partial, empty, and unavailable states honestly.
- **Do** preserve identical semantic and focus order across breakpoints.

### Don't:

- **Don't** label feed health as rider-facing service status.
- **Don't** fabricate reliability, crowding, commute, or recommendation claims.
- **Don't** use color as the only carrier of route or disruption meaning.
- **Don't** let decorative maps, empty setup cards, or analytics displace immediate transit choices.
