/**
 * Presentation helpers: measurement labels and rounded decimals.
 *
 * The unit selector only changes the wording of the label. It never converts a
 * quantity, which is why "3 cm" and "3 in" produce the same numbers.
 */
export type UnitKey = "units" | "cm" | "m" | "in";

export interface UnitLabels {
  readonly key: UnitKey;
  /** Name shown in the selector. */
  readonly name: string;
  readonly linear: string;
  readonly area: string;
  readonly volume: string;
}

export const UNITS: Record<UnitKey, UnitLabels> = {
  units: {
    key: "units",
    name: "Generic units",
    linear: "units",
    area: "square units",
    volume: "cubic units",
  },
  cm: {
    key: "cm",
    name: "Centimetres",
    linear: "cm",
    area: "cm²",
    volume: "cm³",
  },
  m: { key: "m", name: "Metres", linear: "m", area: "m²", volume: "m³" },
  in: { key: "in", name: "Inches", linear: "in", area: "in²", volume: "in³" },
};

export const UNIT_ORDER: readonly UnitKey[] = ["units", "cm", "m", "in"];

/** Rounded decimals stay short so they never crowd the exact answer. */
export const DECIMAL_PLACES = 1;
/** The longer form, revealed on hover for anyone who wants the detail. */
export const DETAIL_DECIMAL_PLACES = 5;

export interface ApproximateValue {
  /** The rounded number as text, without an approximation sign. */
  readonly text: string;
  /** True when rounding actually lost information. */
  readonly rounded: boolean;
}

export function formatApproximate(
  value: number,
  places = DECIMAL_PLACES,
): ApproximateValue {
  if (!Number.isFinite(value)) return { text: "—", rounded: false };
  const text = value.toFixed(places);
  const rounded =
    Math.abs(Number(text) - value) >
    Number.EPSILON * Math.max(1, Math.abs(value)) * 8;
  return { text, rounded };
}

/** "≈ 37.70" or "37.70" depending on whether the display is rounded. */
export function approximateText(
  value: number,
  places = DECIMAL_PLACES,
): string {
  const { text, rounded } = formatApproximate(value, places);
  return rounded ? `≈ ${text}` : text;
}
