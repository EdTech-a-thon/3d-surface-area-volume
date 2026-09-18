const LEGACY_HOSTNAME = "shapelab.teacher.dev";

function hostname(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Referrers usually identify the old site, while the query marker covers
 * redirects where the browser deliberately omits the referrer.
 */
export function isShapeLabReferral(
  referrer: string,
  currentUrl: string,
): boolean {
  if (hostname(referrer) === LEGACY_HOSTNAME) return true;

  try {
    return new URL(currentUrl).searchParams.get("from") === LEGACY_HOSTNAME;
  } catch {
    return false;
  }
}
