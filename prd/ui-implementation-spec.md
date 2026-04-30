# UI Implementation Specification

## Summary
Replicate the visible screenshot as a standalone marketing page in the existing frontend stack. The source of truth is the screenshot only. Reproduce the same section order, hierarchy, spacing relationships, and card density without inventing missing sections such as footer expansions, testimonials, pricing, FAQ, or CRM navigation.

## Repo Alignment
- Framework: `React 18`
- Language: `TypeScript`
- Styling: `Tailwind CSS`, with small CSS variables only where a screenshot-driven value is more readable than a utility chain
- Shared font: `Urbanist`
- Icon style: simple rounded line icons similar to current `lucide-react` usage

## Page Structure
Use a single page wrapper with five visible content bands in this order:

```html
<main>
  <section id="hero">...</section>
  <section id="process">...</section>
  <section id="problems">...</section>
  <section id="features">...</section>
  <section id="fixes">...</section>
</main>
```

The implementation should stay decision-complete around these component boundaries:
- `RoofEstimatorPromoLanding`
- `HeroSection`
- `SectionHeader`
- `PrimaryCtaButton`
- `SecondaryCtaButton`
- `FeatureCard`
- `ProblemCard`
- `MetricBenefitPill`

## Design Tokens
All values below are screenshot-derived estimates. Confidence labels are included because the source is a static image, not a design file.

### Colors
| Token | Value | Confidence | Usage |
| --- | --- | --- | --- |
| `--page-bg` | `#F5FAFF` | High | Main page background |
| `--hero-bg` | `#F2F8FE` | High | Hero band background |
| `--surface` | `#FFFFFF` | High | Cards and CTA surfaces |
| `--surface-soft` | `#EDF5FC` | High | Process, feature, and fix tiles |
| `--surface-soft-2` | `#EAF4FB` | Medium | Alternate tile fill / mockup backing |
| `--primary` | `#23C4C7` | Medium | Brand accent text, icons, badge numerals |
| `--primary-dark` | `#14A7B3` | Medium | Primary button depth / darker accent |
| `--accent-sky` | `#88DDF5` | Medium | Illustration glow and soft highlight |
| `--text-strong` | `#35516B` | High | Headings |
| `--text-body` | `#6D829C` | High | Body copy |
| `--text-muted` | `#8FA4B8` | Medium | Small support text |
| `--border-soft` | `rgba(161, 184, 209, 0.28)` | Medium | Card and mockup edges |
| `--success` | `#1BB89D` | Medium | Check/benefit icon accents |
| `--warning` | `#F3B23C` | Medium | Secondary decorative accent |

### Typography
| Role | Size | Weight | Line Height | Confidence |
| --- | --- | --- | --- | --- |
| Hero title | `52-58px` desktop, `34-40px` mobile | `800` | `1.08` | Medium |
| Section title | `34-40px` desktop, `28-32px` mobile | `700-800` | `1.18` | High |
| Hero body | `18px` desktop, `16px` mobile | `400-500` | `1.6` | High |
| Card title | `20-22px` | `700` | `1.25` | High |
| Card body | `14-15px` | `500` | `1.55` | High |
| Micro label / pill | `12-13px` | `600-700` | `1.3` | High |

### Spacing
| Token | Value | Confidence |
| --- | --- | --- |
| Page max width | `1200px` | High |
| Desktop side padding | `24px` | High |
| Tablet side padding | `20px` | High |
| Mobile side padding | `16px` | High |
| Section vertical padding | `64px` desktop, `48px` mobile | High |
| Card internal padding | `20-24px` | Medium |
| Card gap in rows | `16px` desktop, `12px` mobile | High |
| Section heading bottom margin | `28-36px` | High |

### Radius and Shadow
| Token | Value | Confidence | Usage |
| --- | --- | --- | --- |
| `--radius-xl` | `24px` | High | Main tiles and illustration cards |
| `--radius-lg` | `18px` | High | Buttons, inner panels |
| `--radius-md` | `12px` | High | Pills, badges, inner chips |
| `--shadow-soft` | `0 10px 30px rgba(83, 122, 162, 0.12)` | Medium | Main card elevation |
| `--shadow-hover` | `0 18px 36px rgba(83, 122, 162, 0.18)` | Medium | Hover state |
| `--shadow-mockup` | `0 16px 40px rgba(93, 136, 177, 0.18)` | Medium | Hero product collage |

## Section Blueprint

### 1. Hero Section
Structure:
- Two-column layout at desktop.
- Left column contains:
  - Large multi-line headline: "Create Roofing Estimates in Seconds with AI"
  - One short support paragraph
  - Two CTAs on a single row at desktop, stacked on narrow mobile
- Right column contains a layered collage:
  - Large roof/house hero image
  - Smaller floating image card
  - White pricing/measurement summary card
  - Subtle cyan blobs/glows behind composition

Layout rules:
- Desktop grid: approximately `1fr 1.08fr`
- Vertical alignment: centered
- Minimum desktop hero height target: `460-520px`
- Title emphasis: accent color only on `"Roofing Estimates"`
- CTA order:
  - Primary: `Create Free Estimate`
  - Secondary: `Watch Demo`

Suggested Tailwind layout:
```tsx
<section className="relative overflow-hidden bg-[var(--hero-bg)]">
  <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:py-20">
```

### 2. Process Section
Title:
- `AI Roof Estimator` accent word in teal
- `That Works Like a Pro` in dark slate

Content:
- Four equal-width step cards in a single desktop row
- Each card includes:
  - Circular number badge
  - Short step title
  - Simple product/illustration panel
  - One compact benefit below the card row

Step titles:
1. `Upload a Roof Photo`
2. `AI Detects the Roof`
3. `Get Accurate Measurements`
4. `Auto-Generate Clear Estimates`

Benefit row:
- Small icon + short line below each card
- Use lightweight inline row, not pill chips

### 3. Problems Section
Title:
- `Still Measuring Roofs` in dark slate
- `Manually?` in teal

Content:
- Three equal problem cards
- Each card has:
  - Large illustration block at top
  - Bold problem headline
  - Short two-line supporting explanation

Problem headlines:
- `Slow & Inaccurate`
- `Losing to Faster Competitors?`
- `Unbilled Extra Work?`

Card tone:
- Slightly more serious than process cards
- Same rounded geometry, same soft fill, no alarming red theme

### 4. Features Strip
Title:
- `Powerful Features to Boost Your Roofing Business`
- Accent only on `Roofing Business`

Content:
- Three wide cards in one row on desktop
- Cards represent:
  - `AI Roof Estimator`
  - `Visual Job Pipeline`
  - `Auto Invoice Builder`

Card rules:
- Wider and more interface-like than the process cards
- Include miniature UI preview blocks rather than illustration-only tiles
- Allow one feature badge on the first card

### 5. Fixes Strip
Title:
- `ZODO` accent word in teal
- `Fixes That` in dark slate

Content:
- Three compact tiles in one row
- Each tile includes left icon, bold heading, and one short line of explanation

Tile titles:
- `AI Estimation`
- `Auto Invoices`
- `Job Tracking`

This section should read like a closing reassurance strip, not a full feature section.

## Semantic HTML Blueprint
Use semantic wrappers even though the design is marketing-first:

```html
<main aria-label="AI roof estimator landing page">
  <section aria-labelledby="hero-heading">...</section>
  <section aria-labelledby="process-heading">...</section>
  <section aria-labelledby="problems-heading">...</section>
  <section aria-labelledby="features-heading">...</section>
  <section aria-labelledby="fixes-heading">...</section>
</main>
```

For rows of cards:
- Use `<ul>` / `<li>` if the content is naturally list-like
- Use `<article>` inside cards with distinct heading/body structure

## Tailwind and Styling Rules
- Prefer Tailwind for layout, spacing, radius, shadows, typography, and responsive stacking.
- Use CSS variables for screenshot-driven colors and shadow values:

```css
:root {
  --page-bg: #F5FAFF;
  --hero-bg: #F2F8FE;
  --surface: #FFFFFF;
  --surface-soft: #EDF5FC;
  --primary: #23C4C7;
  --primary-dark: #14A7B3;
  --text-strong: #35516B;
  --text-body: #6D829C;
  --border-soft: rgba(161, 184, 209, 0.28);
  --shadow-soft: 0 10px 30px rgba(83, 122, 162, 0.12);
}
```

- Keep cards mostly `bg-white` or `bg-[var(--surface-soft)]`.
- Use `Urbanist` via the existing Tailwind `font-sans`.
- Avoid heavy gradients except for soft hero glow accents and possibly the primary CTA.
- Avoid dark mode, glassmorphism, or animated background textures not shown in the screenshot.

## Responsive Rules

### `1280px+`
- Preserve full five-band layout.
- Hero stays in two columns.
- Process, problems, features, and fixes all stay in single rows.

### `1024px`
- Hero may remain two columns with slightly reduced artwork scale.
- Four-step process grid may become `2 x 2` only if card width becomes cramped.
- Three-card rows can remain single row if readable.

### `768px`
- Hero stacks vertically: copy first, collage second.
- Process cards become `2 x 2`.
- Problems become single column or `2 + 1`.
- Features and fixes become one-column stacks with consistent spacing.

### `390px`
- All sections become single-column.
- CTA buttons stack vertically with full width.
- Section titles wrap naturally and stay centered.
- Hero mockup cluster may simplify by reducing overlap depth, but must retain the idea of layered product cards.

## Interactions
Only implement interactions that are strongly inferable:
- Primary CTA hover:
  - slightly darker teal or slightly stronger shadow
- Secondary CTA hover:
  - subtle border darkening and surface tint
- Card hover:
  - translate up `2-4px`
  - shadow increase from `--shadow-soft` to `--shadow-hover`
- Focus states:
  - visible outline or ring using primary accent

Do not invent:
- carousels
- tab switching
- animated counters
- autoplay demos
- sticky navigation
- hidden drawers

## Accessibility Requirements
- Color contrast target: text must meet readable contrast against white and soft-blue fills.
- Decorative hero collage images should have empty alt text if purely decorative.
- CTA labels must remain text-first and unambiguous.
- Headings must follow a proper outline:
  - one `h1`
  - section `h2`s
  - card titles as `h3`s when semantically useful
- Keyboard users must be able to tab through CTAs in logical order.

## Public Implementation Contracts
These are the expected props and responsibilities for the future page implementation:

### `SectionHeader`
- Props:
  - `title: string`
  - `accentText?: string`
  - `subtitle?: string`
  - `align?: "center" | "left"`

### `FeatureCard`
- Props:
  - `title: string`
  - `description?: string`
  - `badge?: string`
  - `previewType: "illustration" | "mini-ui"`

### `ProblemCard`
- Props:
  - `title: string`
  - `description: string`
  - `illustrationTone?: "cyan" | "teal" | "blue"`

### `MetricBenefitPill`
- Props:
  - `icon?: ReactNode`
  - `label: string`

### `PrimaryCtaButton`
- Props:
  - `label: string`
  - `href?: string`
  - `onClick?: () => void`

### `SecondaryCtaButton`
- Props:
  - `label: string`
  - `href?: string`
  - `icon?: ReactNode`

## Validation Checklist
- Exactly five visible bands are present.
- Exactly four cards exist in the process section.
- Exactly three cards exist in the problems section.
- Exactly three feature cards exist in the features strip.
- Exactly three compact tiles exist in the fixes strip.
- Accent color usage stays concentrated on keywords, icons, number badges, and main CTA emphasis.
- The page remains airy and uncluttered.

## Do Not Invent
- No navbar beyond a minimal shell if the future route requires one.
- No footer content beyond what is needed by the app shell.
- No extra sections such as testimonials, pricing, FAQ, logos, or integrations.
- No additional CTA copy not shown in the screenshot.
- No alternate card counts.
