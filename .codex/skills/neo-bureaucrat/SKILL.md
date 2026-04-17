---
name: neo-bureaucrat
description: Editorial Windows 95/98 workstation design system ("The Neo-Bureaucrat") for project UI and frontend visual work. Use for tactile bevels, overlapping desktop windows, asymmetric layouts, and technical-editorial presentation instead of generic modern web styling.
license: MIT
metadata:
  author: project-local
---

# Neo-Bureaucrat Design System

## Use This Skill When
- The task involves frontend UI, layout, styling, or component-system work.
- The interface should feel like a premium Windows 95/98 workstation rather than generic retro nostalgia.
- You need guidance for teal desktop canvases, industrial grey panels, bevel depth, title bars, taskbars, dialogs, and overlapping windows.
- The user wants a deliberate anti-template look with strong editorial typography and rigid OS-like structure.

## Creative North Star
- Treat the 1990s desktop metaphor as a layout engine, not a joke.
- Aim for a "technical editorial" mood: rigid industrial surfaces plus premium typography.
- Break the modern app-shell look through aggressive component layering and asymmetric window placement.
- Favor focus, tactile interaction, and low-resolution precision over softness or generic polish.

## Non-Negotiables
- Use `0px` radius everywhere unless a file already establishes a different rule that must be preserved.
- Do not use standard flat 1px section borders to create structure.
- Do not use fluid typography; use fixed type steps only.
- Do not center-align everything; keep layouts left-heavy and utility-first.
- Do not default to Material-style shadows; use bevels plus a single ambient lift for the active window.
- Do not flatten the interface into cards-on-background. Build a desktop, then windows, then wells inside windows.

## Foundations

### Color Roles
- Desktop canvas: `#008080`
- Window frame / raised shell surface: `#e3e2e2`
- Command accent / active title bar: `#474eb7`
- Deep command ink: `#00006e`
- Highlight bevel edge: `#ffffff`
- Shadow bevel edge: use a muted grey from the existing palette, not pure black
- Ghost border when absolutely necessary: `outline-variant` at roughly `20%` opacity

### Surface Model
- Base layer is the teal desktop.
- Raised windows and panels sit on top using the highest neutral surface.
- Inputs, lists, and wells sink inward using a lighter or lower surface tier.
- Structural separation comes from tonal shifts, inset/outset bevels, and spacing, not hard divider lines.

### CSS Token Baseline
Define core tokens before styling components. Keep names semantic.

```css
:root {
  --desktop-surface: #008080;
  --surface-frame: #e3e2e2;
  --surface-panel: #d4d0c8;
  --surface-well: #f3f3f3;
  --command-accent: #474eb7;
  --command-accent-deep: #00006e;
  --text-strong: #111111;
  --text-muted: #404040;
  --bevel-light: #ffffff;
  --bevel-shadow: #7f7f7f;
  --ghost-border: rgb(0 0 0 / 0.2);
  --active-window-lift: 0 20px 50px rgba(0, 0, 0, 0.15);
  --glass-surface: rgb(227 226 226 / 0.72);
}
```

If the current codebase already defines equivalent tokens, map to the existing names instead of duplicating them.

### No-Line Rule
Never reach for a plain border as the first structural tool. Prefer:
1. Tonal shifts between nested surfaces.
2. Raised or sunken bevel geometry.
3. Spacing blocks with clear vertical rhythm.

### Glass And Gradient Rule
- Floating system dialogs may use a semi-transparent neutral surface with `backdrop-filter: blur(8px)`.
- High-impact command buttons may use a subtle linear gradient from `primary` to a lighter companion tone.
- Keep these effects restrained. The interface should still read as OS hardware, not glossy mobile UI.

## Typography

### Font Pairing
- Display and headlines: `Space Grotesk`
- Body, labels, metadata, helper copy: `Work Sans`

### Fixed Type Scale
Use a locked scale such as `12 / 14 / 16 / 20 / 24 / 32`. Do not use `clamp()` or viewport-driven resizing for primary UI text.

### Hierarchy Rules
- Overscale primary headers when needed so they feel like editorial headlines straining against the OS grid.
- Keep window chrome and controls smaller, tighter, and more mechanical than the content headlines.
- Use uppercase sparingly for command surfaces, button labels, and compact system metadata.

## Depth And Geometry

### Raised Bevel
Use for buttons, active windows, and top-level panels.

```css
box-shadow:
  inset 2px 2px 0 var(--bevel-light),
  inset -2px -2px 0 var(--bevel-shadow);
```

### Sunken Bevel
Use for inputs, lists, code wells, and embedded content areas.

```css
box-shadow:
  inset 2px 2px 0 var(--bevel-shadow),
  inset -2px -2px 0 var(--bevel-light);
```

### Active Window Lift
- Only the active or focused window gets `var(--active-window-lift)`.
- Background windows stay visually flatter so focus reads immediately.

## Layout Rules
- Build the page as a desktop field first, not a centered landing card.
- Allow windows and panels to overlap when that improves the workstation illusion.
- Prefer asymmetric layouts over perfectly balanced marketing-page symmetry.
- Use left-heavy alignment, visible title bars, and taskbar anchoring to maintain the OS feel.
- Use 32x32 pixel-art icons with a limited palette.
- Preserve hard edges and pixel-locked spacing.

## Component Guidance

### Buttons
- Primary buttons must look raised and command-like.
- Use the command accent for high-priority actions.
- Secondary buttons use neutral raised surfaces.
- Labels should read like commands: compact, uppercase when appropriate, visually centered inside the button.
- On `:active`, invert the bevel from raised to sunken and offset the content `1px` down/right.

### Windows
- Windows are the primary layout primitive.
- Title bars use a solid command accent fill.
- Controls are three square buttons aligned to the right: `_`, `□`, `×`.
- Window body uses raised neutral framing with inner wells for content.
- Only the active window gets the ambient lift shadow.

### Inputs
- Inputs must be sunken into the panel.
- Use the lightest neutral well surface inside raised shells.
- On focus, shift to the accent color and add a 1px dotted focus ring inside the field.
- Keep labels left-aligned and adjacent, not floating.

### Lists And Cards
- Do not use dividers between items.
- Separate rows with alternating surface tones or consistent vertical spacing.
- When cards are necessary, they should still read like OS panels or file boxes, not SaaS tiles.

### Dialogs
- Standard dialogs follow the window model.
- Floating or urgent dialogs may use the glass rule, but keep bevel controls and title-bar structure intact.
- Modal buttons should maintain tactile press behavior.

## Interaction Rules
- Pointer interactions should feel physical. Pressed states must visibly depress.
- Keyboard access is mandatory. Every actionable control needs a visible focus treatment.
- When building pointer assets or cursors, prefer low-resolution arrow and hand shapes over default modern cursors when practical.
- Dragging, stacking, and z-index shifts should reinforce the illusion of a real workspace.

## Content Tone
- Keep copy concise, direct, and operational.
- Prefer system-like wording, status labels, and command phrasing.
- Avoid playful irony unless the product content explicitly needs it.
- Favor labels that sound like tools, files, warnings, and workflow states.

## Do
- Use semantic tokens rather than scattering raw hex values.
- Keep the desktop teal visible as a real canvas.
- Push contrast through typography scale and surface hierarchy.
- Use bevels to communicate state changes.
- Let the content feel slightly too large for the window when editorial emphasis is useful.

## Do Not
- Do not round corners.
- Do not use soft cards on a blank white page.
- Do not separate every block with thin grey borders.
- Do not use generic purple gradients or startup-template hero sections.
- Do not flatten hover, focus, and active into nearly identical states.

## Implementation Workflow
1. Restate the feature in one line using the Neo-Bureaucrat framing.
2. Define or map the semantic color, surface, and depth tokens first.
3. Build desktop, taskbar, and window-shell primitives before polishing inner content.
4. Apply component rules for buttons, inputs, lists, and dialogs.
5. Verify keyboard focus, pressed states, active-window emphasis, and spacing rhythm.
6. Compare the result against the "no-line", "no-radius", and "left-heavy" rules before shipping.

## QA Checklist
- Desktop canvas is visibly teal and not fully hidden by white content blocks.
- Primary structure is created by surfaces and bevels, not flat divider lines.
- Active window is obvious through title-bar emphasis and ambient lift.
- Buttons visibly depress on press.
- Inputs read as sunken wells and show an internal focus treatment.
- Typography uses fixed steps and the correct font roles.
- Layout reads as an operating environment, not a marketing template.
- Window and panel edges remain square.
- Lists and grouped content avoid standard divider-line patterns.
- Focus states are keyboard-visible and testable.
