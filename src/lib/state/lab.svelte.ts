/**
 * Geometric Solids presentation state.
 *
 * Geometry state (solid kind and its last valid dimensions) is kept apart from
 * input drafts and from presentation state. Rotating, highlighting, relabelling
 * units or hiding answers can never change a calculated quantity.
 */
import { type Exact, exactRational } from "$lib/domain/exact";
import { type UnitKey } from "$lib/domain/format";
import { buildEdges, buildMesh } from "$lib/domain/geometry3d";
import { buildNet } from "$lib/domain/nets";
import { fromTenths } from "$lib/domain/rational";
import { SOLIDS, buildSolid, defaultDimensions } from "$lib/domain/solids";
import type { Dimensions, SolidKind } from "$lib/domain/types";
import { dimensionToDraft, parseDimension } from "$lib/domain/validation";
import { surfaceHue } from "$lib/ui/colors";

export type ViewMode = "solid" | "net";

/**
 * What the pointer is on, or what has been pinned. A surface target names one
 * external surface; a measure target names a length — every edge that carries
 * that length responds together.
 */
export type Target = `surface:${string}` | `measure:${string}`;

export function surfaceTarget(surfaceId: string): Target {
  return `surface:${surfaceId}`;
}

export function measureTarget(key: string): Target {
  return `measure:${key}`;
}

/** A length the solid can show: an independent dimension or a derived one. */
export interface Measure {
  readonly key: string;
  readonly label: string;
  readonly exact: Exact;
  /** Present only for derived lengths, which are worth showing the working for. */
  readonly substitution?: string;
}

/** A three-quarter view that shows three faces of a prism at once. */
const HOME_YAW = -0.62;
const HOME_PITCH = 0.42;

function draftsFor(
  kind: SolidKind,
  dimensions: Dimensions,
): Record<string, string> {
  return Object.fromEntries(
    SOLIDS[kind].dimensions.map((spec) => [
      spec.key,
      dimensionToDraft(dimensions[spec.key]),
    ]),
  );
}

export class LabState {
  // Geometry state.
  kind = $state<SolidKind>("rectangularPrism");
  dimensionsByKind = $state<Record<SolidKind, Dimensions>>(defaultDimensions());

  // Input draft state.
  drafts = $state<Record<string, string>>(
    draftsFor("rectangularPrism", defaultDimensions().rectangularPrism),
  );
  errors = $state<Record<string, string | null>>({});

  // Presentation state.
  view = $state<ViewMode>("solid");
  yaw = $state(HOME_YAW);
  pitch = $state(HOME_PITCH);
  autoRotate = $state(false);
  /** What the pointer or keyboard focus is on right now. */
  hovered = $state<Target | null>(null);
  /** Targets the teacher has clicked, which stay labelled until clicked again. */
  pinned = $state<Target[]>([]);
  unit = $state<UnitKey>("units");
  answersVisible = $state(true);
  showFormulas = $state(false);

  definition = $derived(SOLIDS[this.kind]);
  dimensions = $derived(this.dimensionsByKind[this.kind]);
  model = $derived(buildSolid(this.kind, this.dimensionsByKind[this.kind]));
  mesh = $derived(buildMesh(this.kind, this.dimensionsByKind[this.kind]));
  net = $derived(buildNet(this.kind, this.dimensionsByKind[this.kind]));
  /** Measurement lines follow the view, so a radius is never hidden behind the solid. */
  edges = $derived(
    buildEdges(
      this.kind,
      this.dimensionsByKind[this.kind],
      this.yaw,
      this.pitch,
    ),
  );

  /** Every length this solid can report, keyed by its symbol. */
  measures = $derived.by<Record<string, Measure>>(() => {
    const all: Record<string, Measure> = {};
    for (const spec of this.definition.dimensions) {
      all[spec.key] = {
        key: spec.key,
        label: spec.label,
        exact: exactRational(fromTenths(this.dimensions[spec.key])),
      };
    }
    for (const derived of this.model.derived) {
      all[derived.key] = {
        key: derived.key,
        label: derived.label,
        exact: derived.exact,
        substitution: derived.substitution,
      };
    }
    return all;
  });

  /** Each surface of the current solid gets its own hue, in listed order. */
  huesBySurfaceId = $derived(
    Object.fromEntries(
      this.model.surfaces.map((surface, index) => [
        surface.id,
        surfaceHue(index),
      ]),
    ) as Record<string, number>,
  );

  /** The hue a surface should be drawn in, or null while it is not selected. */
  hueFor(surfaceId: string): number | null {
    return this.isActive(surfaceTarget(surfaceId))
      ? (this.huesBySurfaceId[surfaceId] ?? surfaceHue(0))
      : null;
  }

  isActive(target: Target): boolean {
    return this.hovered === target || this.pinned.includes(target);
  }

  isPinned(target: Target): boolean {
    return this.pinned.includes(target);
  }

  selectKind(kind: SolidKind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.drafts = draftsFor(kind, this.dimensionsByKind[kind]);
    this.errors = {};
    // Targets belong to one solid kind, so nothing pinned here still applies.
    this.pinned = [];
    this.hovered = null;
    this.resetView();
    if (!SOLIDS[kind].hasNet) this.view = "solid";
  }

  setView(view: ViewMode) {
    if (view === "net" && !this.definition.hasNet) return;
    this.view = view;
    // A net is flat; spinning it would be meaningless.
    if (view === "net") this.autoRotate = false;
  }

  /** Apply a draft. Invalid drafts record an error and leave geometry untouched. */
  setDraft(key: string, raw: string) {
    this.drafts = { ...this.drafts, [key]: raw };
    const parsed = parseDimension(raw);
    if (!parsed.ok) {
      this.errors = { ...this.errors, [key]: parsed.message };
      return;
    }
    this.errors = { ...this.errors, [key]: null };
    this.dimensionsByKind = {
      ...this.dimensionsByKind,
      [this.kind]: { ...this.dimensionsByKind[this.kind], [key]: parsed.value },
    };
  }

  /** Step a dimension by whole increments, keeping it inside the valid range. */
  nudgeDimension(key: string, delta: number) {
    const current = this.dimensionsByKind[this.kind][key];
    const next = Math.round((current + delta) * 10) / 10;
    this.setDraft(key, dimensionToDraft(next));
  }

  resetView() {
    this.yaw = HOME_YAW;
    this.pitch = HOME_PITCH;
  }

  rotateBy(deltaYaw: number, deltaPitch: number) {
    this.yaw += deltaYaw;
    // Clamping the pitch keeps the solid from tumbling upside down.
    this.pitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.pitch + deltaPitch),
    );
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }

  hover(target: Target | null) {
    this.hovered = target;
  }

  /** Clear the hover only if it is still the one this element set. */
  unhover(target: Target) {
    if (this.hovered === target) this.hovered = null;
  }

  togglePin(target: Target) {
    this.pinned = this.pinned.includes(target)
      ? this.pinned.filter((pin) => pin !== target)
      : [...this.pinned, target];
  }

  clearPins() {
    this.pinned = [];
  }

  toggleAnswers() {
    this.answersVisible = !this.answersVisible;
  }
}
