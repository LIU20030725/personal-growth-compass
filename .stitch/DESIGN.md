---
name: GoldQuest Finance Command Hall
colors:
  background: "#f8f9fa"
  surface: "#ffffff"
  surface-low: "#f3f4f5"
  surface-mid: "#edeeef"
  surface-high: "#e7e8e9"
  surface-variant: "#e1e3e4"
  ink: "#191c1d"
  muted: "#4d4732"
  outline: "#7e775f"
  outline-soft: "#d0c6ab"
  gold: "#ffd700"
  gold-dark: "#705d00"
  emerald: "#006c49"
  emerald-light: "#6cf8bb"
  ruby: "#b91a24"
  ruby-light: "#ffceca"
typography:
  display-lg:
    fontFamily: Bebas Neue
    fontSize: 72px
    fontWeight: "400"
    lineHeight: "0.95"
  display-xl:
    fontFamily: Bebas Neue
    fontSize: 108px
    fontWeight: "400"
    lineHeight: "0.92"
  headline-lg:
    fontFamily: Bebas Neue
    fontSize: 34px
    fontWeight: "400"
    lineHeight: "1"
  body-md:
    fontFamily: Bricolage Grotesque
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
  label-bold:
    fontFamily: Bricolage Grotesque
    fontSize: 14px
    fontWeight: "800"
    lineHeight: "1"
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  unit: 4px
  gutter: 20px
  panel: 24px
  section: 48px
  container-max: 1200px
---

# Design System: GoldQuest Finance Command Hall

## 1. Visual Theme & Atmosphere

GoldQuest Finance is a bright management-RPG dashboard for practical personal finance. It should feel like a command hall for a life-management game: readable, tactical, and reward-oriented, with game language used to clarify real financial behavior rather than obscure it.

The visual language is a hard-outline report system with RPG character-panel accents. White paper surfaces, black structural borders, offset hard shadows, gold command buttons, and emerald/ruby financial states create a controlled "adventure ledger" mood. The interface should remain functional first: numbers, accounts, cash flow, and next actions must be easier to scan than decorative game details.

## 2. Color Palette & Roles

### Primary Foundation

- Bright Parchment Background `#f8f9fa`: page canvas and fixed header base.
- White Ledger Surface `#ffffff`: main cards, sheets, data panels, and modal surfaces.
- Low Paper Surface `#f3f4f5`: list rows, secondary buttons, and quiet content containers.
- Mid Paper Surface `#edeeef`: sidebar character panels and account icon wells.
- High Paper Surface `#e7e8e9`: dense sidebar stat panels.
- Ledger Variant `#e1e3e4`: XP bar tracks, hover backgrounds, empty month cards.

### Accent & Interactive

- Quest Gold `#ffd700`: primary command buttons, selected states, hero badges, and positive quest moments.
- Antique Gold Ink `#705d00`: gold text, gold icons, and gold state outlines.
- Hard Ink `#191c1d`: primary text, hard card borders, and offset shadows.
- Warm Outline `#7e775f`: secondary icon and divider emphasis.
- Soft Outline `#d0c6ab`: sidebar borders, list borders, and inactive boundaries.

### Typography & Text Hierarchy

- Primary text uses Hard Ink `#191c1d`.
- Secondary text uses Muted Warm Brown `#4d4732`.
- Labels are often uppercase or heavy-weight to create a report-HUD feeling.
- Large financial values use display typography and tabular numeric behavior where possible.

### Functional States

- Emerald `#006c49`: income, balance growth, account inflow, and safe score states.
- Emerald Light `#6cf8bb`: positive state background and score-card fill.
- Ruby `#b91a24`: expense, risk, negative months, destructive actions, and form errors.
- Ruby Light `#ffceca`: risk state background and negative month cells.
- Chart accents: Mint `#34d399`, Sky `#60a5fa`, Amber `#fbbf24`, Rose `#fb7185`.

## 3. Typography Rules

### Hierarchy & Weights

The system uses two Google fonts. `Bebas Neue` handles the brand, hero titles, section headers, and large monetary display values. It gives the UI an editorial poster and command-board tone. `Bricolage Grotesque` handles body copy, buttons, labels, and dense card content; it keeps the interface friendly and less corporate.

Hero labels and section titles are compact and high-contrast. The main net-worth number can scale to about 108px on desktop, while card totals sit around 26-38px. Body copy stays at 16px with generous line-height for explanations, and labels use 800 weight for quick scanning.

### Spacing Principles

Spacing follows a 4px base with 12px, 16px, 20px, 24px, and 48px as common steps. Dense data rows use 8-14px gaps. Main panels use 20-24px internal padding. Major dashboard modules separate with 24px vertical rhythm, while the page shell uses 48px desktop padding.

## 4. Component Stylings

### Buttons

Primary commands are gold rectangular buttons with 2px Hard Ink borders and a 4px offset Hard Ink shadow. Pressed state moves the button down/right and reduces the shadow, creating a tactile game-console feel. Secondary actions use low paper backgrounds with smaller hard shadows.

Button text is heavy, direct, and action-led. Important commands may include an English micro-label such as `NEW TRANSACTION`, but the visible command should still be understandable as a finance action.

### Cards & Ledger Panels

Main cards use white backgrounds, 2px Hard Ink borders, 4px radius, and `4px 4px 0 #191c1d` hard shadows. This card style is the core grammar for hero panels, metric cards, account cards, transaction sheets, and monthly bill panels.

Card interiors are dense but organized: icon block first, label second, large value third, helper copy last. Account cards can expand into list rows, using soft outline borders and low paper fills to preserve hierarchy.

### Navigation

Desktop uses a fixed top header and fixed left sidebar. The header carries the GoldQuest Finance brand, top navigation, and utility icons. The sidebar acts like a character status panel with level badge, title, navigation links, and hero attributes.

Active navigation uses gold surfaces or gold underlines. Hover states use Ledger Variant backgrounds and visible borders. All navigation targets need at least 44px height for touch and keyboard accessibility.

### Inputs & Forms

Forms appear as right-side sheets over a dark scrim. Inputs use native controls, 2px Hard Ink borders, 4px radius, and white surfaces. Focus states use a 3px gold outline. Segmented controls use two hard-edged cells with a gold selected state.

Errors appear near the relevant form content in Ruby text. Destructive actions use Ruby Light backgrounds with Hard Ink borders so they are visible but not visually louder than the primary save action.

### Domain-Specific Components

XP bars use 8px height, 1px Hard Ink border, a low-contrast track, and a gold/emerald/ruby fill. They represent real financial attributes such as wealth stability, saving discipline, and investment intelligence.

Monthly quest cells use dashed soft borders when empty, gold hard-shadow state for positive months, and ruby hard-shadow state for negative months. Transaction rows behave like ledger log entries with right-aligned signed currency values.

## 5. Layout Principles

### Grid & Structure

Desktop layout uses a 64px fixed header, a 256px fixed sidebar, and a centered main shell capped near 1200px. The hero panel uses a three-part grid: copy, score card, and primary action. Metric cards and account cards use three-column grids on desktop.

### Whitespace Strategy

The UI is information-dense but not cramped. Cards use consistent gaps, heavy borders, and row backgrounds to separate data. Hard shadows add depth without soft visual blur. Avoid nested decorative cards; use cards only for actual repeated data units, modal sheets, and key dashboard panels.

### Alignment & Visual Balance

Financial data is aligned for comparison. Large values use display scale and strong contrast. Account rows align labels left and amounts right. Hero content keeps explanatory copy below the large value to keep the primary financial status dominant.

### Responsive Behavior & Touch

At widths below 1100px, the sidebar disappears, the app shell becomes centered, and dashboard grids collapse from three columns to two. Below 680px, hero, metric, account, calendar, and analysis grids collapse to one column; month cells become two columns. Touch targets should stay at least 44px high and fixed UI should not cover scrollable content.

## 6. Design System Notes for Stitch Generation

### Language to Use

Use phrases like "bright RPG finance command hall", "hard-outline ledger cards", "gold quest button", "paper-like report surface", "character status sidebar", and "monthly quest track". Keep the style practical and life-oriented, not fantasy-heavy.

### Color References

Use Bright Parchment for the app background, White Ledger Surface for cards, Hard Ink for all structural lines and shadows, Quest Gold for primary action, Emerald for income/growth, and Ruby for expenses/risk.

### Component Prompts

- Create a desktop finance dashboard hero card with a large net worth value, a compact economy score card, and a hard-edged gold primary action button.
- Create a left character-status sidebar with a level badge, title, navigation links, and three XP attribute bars using gold, emerald, and ruby fills.
- Create a monthly savings quest grid where empty months use dashed paper cards, positive months use gold outline and hard shadow, and negative months use ruby outline and hard shadow.

### Incremental Iteration

When refining screens, preserve the hard-outline card system and the practical data hierarchy. Add game richness through status labels, XP bars, badges, quest progress, and tactile button states rather than decorative fantasy imagery.
