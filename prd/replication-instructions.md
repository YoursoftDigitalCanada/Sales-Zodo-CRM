# AI Agent Replication Instructions

## Objective
Build a new standalone marketing page that matches the visible screenshot as closely as possible using this repo's frontend conventions. The page should feel like a focused AI roof estimator promo page, not a full generic landing page.

## Non-Negotiables
- Recreate only the visible screenshot content.
- Use `React + TypeScript + Tailwind`.
- Use `Urbanist` as the page font.
- Keep the page light, airy, rounded, and teal/cyan-led.
- Preserve the exact section order and card counts.
- Do not add testimonials, pricing, FAQ, footer expansions, sticky nav, or extra product sections.

## Recommended File Shape
Create a new page component and keep it modular:
- `frontend/src/pages/RoofEstimatorPromoLanding.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/SectionHeader.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/PrimaryCtaButton.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/SecondaryCtaButton.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/FeatureCard.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/ProblemCard.tsx`
- `frontend/src/components/marketing/roof-estimator-promo/MetricBenefitPill.tsx`

Keep the implementation grouped by behavior, not by screenshot fragments.

## Build Order
1. Create the page wrapper and root CSS variables.
2. Implement the hero section with correct copy hierarchy and CTA styling.
3. Implement the hero collage as layered cards with soft shadows and minimal overlap.
4. Implement the process section with exactly four cards and four benefit labels.
5. Implement the problems section with exactly three cards.
6. Implement the features strip with exactly three wide cards.
7. Implement the fixes strip with exactly three compact tiles.
8. Add responsive behavior for `1280`, `1024`, `768`, and `390`.
9. Add only subtle hover/focus states.

## Layout Rules
- Max content width: `1200px`
- Horizontal padding:
  - desktop `24px`
  - tablet `20px`
  - mobile `16px`
- Section spacing:
  - desktop `64px+`
  - mobile `48px`
- Use centered containers throughout.
- Do not let cards become overly tall on mobile; keep copy concise and artwork scaled down.

## Section-by-Section Rules

### Hero
- Left side must visually dominate with the headline.
- Accent only the words `Roofing Estimates`.
- Keep the paragraph short and lighter than the title.
- CTA row:
  - primary first
  - secondary second
- Right side must communicate:
  - roof image
  - smaller floating image card
  - pricing/measurement summary card
  - soft cyan glow/background blobs

### Process
- Use a centered section header.
- Cards must read as a guided sequence.
- Number badges should be visible but small.
- Benefit text below each card should remain compact.

### Problems
- Title must emphasize `Manually?` in accent color.
- Cards should feel cautionary but still friendly.
- Avoid harsh red alarms or warning banners.

### Features
- Cards should feel more product-UI-driven than illustration-driven.
- One badge is acceptable on the first feature card only.

### Fixes
- Keep it compact and confidence-building.
- The title should lead with `ZODO` in accent color.
- Each tile needs:
  - icon
  - heading
  - one short description

## Styling Conventions
- Prefer Tailwind utilities.
- Use CSS variables for screenshot-derived colors and shadows.
- Use rounded corners generously.
- Use soft borders instead of heavy outlines.
- Use shallow, cool-toned shadows instead of dramatic dark shadows.

## Allowed Assumptions
- Standard CTA hover states.
- Standard focus rings.
- Slight card lift on hover.
- Hero collage overlap ratios may be approximated if the screenshot is ambiguous.

## Forbidden Assumptions
- No animated counters.
- No scrolling anchors if they are not visually needed.
- No carousel behavior.
- No modal video player for `Watch Demo`.
- No additional content below the fixes strip.

## Validation Steps
Before considering the page done:
1. Compare section count and order against the screenshot.
2. Confirm these counts:
   - hero `1`
   - process cards `4`
   - problem cards `3`
   - feature cards `3`
   - fix tiles `3`
3. Confirm title emphasis matches:
   - `Roofing Estimates`
   - `AI Roof Estimator`
   - `Manually?`
   - `Roofing Business`
   - `ZODO`
4. Confirm mobile layout keeps content order and CTA clarity.
5. Confirm no extra sections were invented.

## Common Pitfalls To Avoid
- Making the page too dark or saturated.
- Using full-width giant cards with excessive vertical whitespace.
- Turning the hero collage into a single flat image.
- Replacing the mini-product visuals with generic placeholders.
- Adding unrelated landing page sections because the screenshot “looks incomplete”.

## Acceptance Standard
The implementation is correct when another reviewer can look at the screenshot and the built page and immediately recognize:
- the same five-section rhythm
- the same teal/cyan + white + slate palette
- the same soft rounded card system
- the same hero headline and CTA emphasis
- the same card counts and section hierarchy
