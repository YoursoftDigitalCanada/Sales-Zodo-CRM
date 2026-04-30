# UI Replication Quick Start

## Overview
This package documents a single-screen, screenshot-driven marketing page for ZODO's AI roof estimator. The goal is not to redesign the page, but to give another AI agent enough structure, tokens, and guardrails to reproduce the visible interface with high visual fidelity in this repo's existing React + TypeScript + Tailwind setup.

The screenshot shows a focused landing page made of five visible content bands:
1. Hero with split layout, dual CTAs, and a layered product mockup.
2. Four-step process row with small benefit callouts.
3. Three-card pain-point row.
4. Three-card feature strip.
5. Three-tile solution strip.

## Screenshots Analyzed
- Total screenshots: `1`
- Multi-state analysis required: `No`
- Common patterns identified: `5`
- Unique visual sections: `5`
- Core reusable components: `6`

## Repo Fit
- Frontend stack: `React 18 + TypeScript + Tailwind CSS + Vite`
- Existing font family: `Urbanist`
- Existing marketing palette already leans teal/cyan + slate, so the replica can live comfortably beside current branding.
- This documentation assumes a future standalone page component, not a rewrite of [`LandingPage.tsx`](/Users/lucifer/Your-soft-digital-CRM/frontend/src/pages/LandingPage.tsx).

## Key Metrics
- Major sections identified: `5`
- Reusable primitives identified: `6`
- Distinct card variants: `4`
- CTA variants: `2`
- Estimated unique colors documented: `12`
- Typography tiers documented: `6`
- Breakpoints documented: `4`

## Implementation Priority
1. Build the overall page shell and section rhythm.
2. Recreate the hero copy block and CTA styling.
3. Recreate the hero product collage/mockup cluster.
4. Build the four-step process cards and benefit row.
5. Build the three-card pain-point row.
6. Build the three-card feature strip.
7. Build the compact three-tile "ZODO Fixes That" row.
8. Add hover/focus states and responsive stacking behavior.

## Recommended Page Shape
- Recommended page component name: `RoofEstimatorPromoLanding`
- Recommended route shape: a standalone marketing page route outside the authenticated CRM shell
- Recommended internal section components:
  - `HeroSection`
  - `ProcessCardsSection`
  - `ProblemsSection`
  - `FeaturesSection`
  - `FixesSection`

## Setup Commands
```bash
cd frontend
npm install
npm run dev
```

## Screenshot-Derived Design Summary
- Visual tone: soft, airy, trustworthy, product-led.
- Dominant colors: pale blue canvas, white cards, teal/cyan accents, slate-blue text.
- Layout style: centered desktop-first marketing composition with rounded cards and shallow shadows.
- Motion level: minimal and restrained.
- Scope rule: do not invent extra sections beyond what is visible in the screenshot.

## Confidence Notes
- High confidence: section order, card counts, CTA placement, typography hierarchy, rounded visual language.
- Medium confidence: exact pixel spacing, exact hex values, exact illustration proportions.
- Low confidence: any behavior not visible in the screenshot. Only standard hover/focus states should be assumed.
