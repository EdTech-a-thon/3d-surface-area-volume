# Shape Lab — product requirements

Status: implemented. This document remains the specification of record; see
[Current implementation state](#current-implementation-state).

## Purpose

Help a sixth-grade math teacher demonstrate how a solid's dimensions relate to its surface area and volume. The primary experience is a teacher controlling the app on a projected screen, not independent student practice.

The originating teacher request was for a rotating 3D shape app with editable length, width, and height. Follow-up discovery expanded the scope below.

## Confirmed decisions

| Area | Decision |
| --- | --- |
| Primary use | Teacher-led classroom demonstration |
| Solids | Rectangular prism, cube, right-triangular prism, square pyramid, cylinder, cone, sphere |
| Manipulation | Rotatable 3D solids with editable relevant dimensions |
| Calculation | Live formulas, substituted dimensions, and final results |
| Answer reveal | Hide final numerical results only; formulas and substituted dimensions remain visible |
| Surface explanation | Highlight individual faces or curved surfaces and relate them to the surface-area calculation |
| Nets | Toggle between a solid and its accurately scaled flat net, not animated unfolding or side-by-side views |
| Triangular prism | Right-triangle base; enter both perpendicular legs and prism length |
| π | Show exact π expressions and an approximate decimal using calculator π, not 3.14 |
| Volume visualization | Unit-cube fills and cross-sectional layer animations are not part of the selected launch scope |
| Textbook workflow | Let the teacher float the interactive lab above a textbook in another tab |

## Proposed defaults

These are implementation recommendations, not separately confirmed requirements.

- All solids are closed. Surface area means total external area, including bases.
- Dimension inputs accept 0.1–20 inclusive in increments of 0.1. Reject invalid entries rather than silently changing them.
- Select cm, m, inches, or generic units. The selector changes the measurement label, not the physical-unit conversion; make this behavior explicit.
- Length uses linear units, surface area square units, and volume cubic units.
- Decimal answers display up to two decimal places. Use an approximation sign when the displayed value is rounded.
- Start rotation paused. Support pointer/touch dragging, keyboard rotation, optional auto-rotation, and reset view. Honor reduced-motion preferences.
- Keep each shape's last valid dimensions while switching shapes during the current session; no persistence across reloads is required.
- Start with answers visible. Preserve the teacher's answer-visibility choice when changing shapes, dimensions, or views.
- Surface highlighting works through labeled controls, not only hover or color.
- Use a desktop/projector-first layout that remains usable on tablets and narrow screens.
- No accounts, student data, backend, saved lessons, quizzes, or sharing workflows.
- Working name: Shape Lab.

## Essential interactions

### Choose and resize a solid

1. Select one of seven solids.
2. Show only its relevant independent dimensions, with labels on the solid.
3. Edit a number or use a range control.
4. Update the solid's proportions, net, and calculations from the same validated geometry.
5. Identify derived measurements such as a cone's slant height as calculated, not independently editable.

### Rotate the solid

- Drag in the 3D view to change orientation.
- Provide keyboard-accessible rotation and reset controls.
- Allow the teacher to start and stop continuous rotation.
- Rotation changes the view only, not dimensions or calculated quantities.

### Explain surface area

- Every surface is named and carries its own formula.
- Pointing at a surface, or at an edge, measures it in place: the surface's formula, substitution and area, or the edge's length. Clicking keeps the measurement on screen until it is clicked again.
- A measurement is also reachable without a pointer: each surface has a focusable badge on the solid, and each dimension has a focusable symbol in the dimension bar.
- Use matching names and secondary visual cues across the solid, net, and measurement so meaning does not depend on color.
- Total surface area counts each external surface exactly once.

### Switch to a net

- Toggle to a flat, proportionally accurate net for the five developable solids.
- Preserve dimensions and surface identity across views.
- A cylinder's lateral surface is a rectangle of dimensions 2πr by h.
- A cone's lateral surface is a sector, not a triangle. Its radius is the cone's slant height and its arc length equals the base circumference.
- A sphere cannot have an exact flat net without distortion. Explain this explicitly; do not display a misleading net. Its 3D view and calculations remain available.
- Auto-rotation does not run while showing a net.

### Float over a textbook

- A `Float` control opens the complete interactive lab in a browser-managed, always-on-top window so the teacher can switch to a textbook tab without losing the lab.
- Keep the current solid, dimensions, view, and answer state when entering or leaving the floating window.
- Leave a clear explanation and return control in the original tab while the lab is floating.
- Disable the control with an accessible explanation when the browser does not support Document Picture-in-Picture.

### Hide and reveal answers

- An eye control beside the totals hides the final numerical surface-area and volume results.
- General formulas and substitutions remain available for student discussion: per surface in its measurement, and for the totals behind the `fx` control beside them.
- While hidden, neither the exact nor approximate final result is exposed in tooltips, accessible labels, or alternate views.
- Avoid completed numerical face-area subtotals while answers are hidden; surface names and unevaluated expressions remain available.
- Revealing answers displays the current geometry's results, not stale values.

## Acceptance examples

- A 3 × 4 × 5 rectangular prism has surface area 94 square units and volume 60 cubic units.
- A cube with side 2 has surface area 24 square units and volume 8 cubic units.
- A right-triangular prism with legs 3 and 4 and prism length 5 has a hypotenuse of 5, surface area 72 square units, and volume 30 cubic units.
- A square pyramid with base side 6 and perpendicular height 4 has slant height 5, surface area 96 square units, and volume 48 cubic units.
- A cylinder with radius 2 and height 3 has surface area 20π square units and volume 12π cubic units.
- A cone with radius 3 and perpendicular height 4 has slant height 5, surface area 24π square units, and volume 12π cubic units.
- A sphere with radius 3 has surface area 36π square units and volume 36π cubic units; no exact net is offered.
- Entering an empty, zero, negative, out-of-range, or nonfinite dimension never produces a malformed solid or NaN result. Show an input error and retain the last valid geometry.
- Changing shape or view while answers are hidden does not reveal a final result.
- Floating the lab, changing a dimension there, and returning it to the tab preserves the changed geometry and results.
- Every essential action can be performed without a mouse.

## Implementation constraints

Follow the workspace and project AGENTS.md files: Bun, TypeScript, SvelteKit, Tailwind CSS, ESLint, and a blank Prettier configuration. Prefer accessible DOM/SVG presentation where practical. Start local development servers only through the workspace's scripts/agent-dev.mjs allocator.

## Current implementation state

Built as a single prerendered SvelteKit page.

- `src/lib/domain/` holds the pure model: exact rational/radical/π arithmetic
  (`rational.ts`, `exact.ts`), the seven picker solids and their surface decomposition
  (`solids.ts`), 3D meshes and measurable edges (`geometry3d.ts`), net layouts
  (`nets.ts`), input validation (`validation.ts`), and unit labels
  (`format.ts`). None of it imports Svelte, and it is covered by
  `src/lib/domain/*.test.ts`.
- `src/lib/state/lab.svelte.ts` keeps geometry, input drafts, and presentation
  state separate, as described in [domain-model.md](domain-model.md). What is
  being measured is a hovered or pinned _target_: one surface, or one length
  that every edge carrying it responds to.
- `src/lib/components/` renders the solid and the net as accessible SVG. The
  shape fills the screen; four small panels float over it — the solid picker
  top left, the view, unit, and floating-window controls top right, the
  dimensions bottom left, and the two totals bottom right. `ShapeLab.svelte`
  mounts the same stateful experience in the page or in a Document
  Picture-in-Picture window.
- `tests/shape-lab.spec.ts` covers the browser behaviour listed in the domain
  model's verification section.

Run it with the workspace allocator, never a bare `bun run dev`:

```sh
./scripts/agent-dev.mjs 3d-surface-area-volume --no-pocketbase
```

Checks: `bun run test` (model), `bun run check` (types), `bun run lint`,
`bun run format:check`, and `BASE_URL=<allocated url> bun run test:e2e`
against a running server.

See [domain-model.md](domain-model.md) for geometry, formulas, and state rules.
