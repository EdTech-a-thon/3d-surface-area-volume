/**
 * Splitting maths text so a square root can be drawn with a vinculum.
 *
 * The exact answers arrive as plain text such as `√2`, `2√3π` or
 * `√(3² + 4²)`. A bare `√` in front of a long radicand is ambiguous — √3121
 * could be read as √3 · 121 — so the view draws the bar a textbook uses. This
 * module only decides which characters live under that bar; the drawing is in
 * MathText.svelte, and in the tspans the net labels use.
 */
export type MathSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "radical"; readonly radicand: string };

const RADICAL = "√";

/** The parenthesised group at `open`, without its brackets, or null. */
function bracketed(
  text: string,
  open: number,
): { body: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

/**
 * The number at `start`. Only digits go under the bar when there are no
 * brackets, because `2√3π` means 2 · √3 · π: the π is outside the root.
 */
function number(
  text: string,
  start: number,
): { body: string; end: number } | null {
  const match = /^\d+(?:\.\d+)?/.exec(text.slice(start));
  if (!match) return null;
  return { body: match[0], end: start + match[0].length };
}

/**
 * Plain runs and radicals, in order. A `√` whose radicand cannot be identified
 * stays in the plain text, so nothing is ever lost from the original string.
 */
export function splitMath(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let plain = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] !== RADICAL) {
      plain += text[i];
      i += 1;
      continue;
    }
    const radicand =
      text[i + 1] === "(" ? bracketed(text, i + 1) : number(text, i + 1);
    if (!radicand) {
      plain += text[i];
      i += 1;
      continue;
    }
    if (plain) segments.push({ kind: "text", text: plain });
    plain = "";
    segments.push({ kind: "radical", radicand: radicand.body });
    i = radicand.end;
  }

  if (plain) segments.push({ kind: "text", text: plain });
  return segments;
}

/** True when `text` has at least one root worth drawing a bar over. */
export function hasRadical(text: string): boolean {
  return splitMath(text).some((segment) => segment.kind === "radical");
}
