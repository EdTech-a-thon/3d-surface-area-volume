export interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

export interface DocumentPictureInPictureController {
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPictureController;
};

export function documentPictureInPicture(
  sourceWindow: Window,
): DocumentPictureInPictureController | null {
  return (
    (sourceWindow as WindowWithDocumentPictureInPicture)
      .documentPictureInPicture ?? null
  );
}

/**
 * A Document Picture-in-Picture window starts with an empty document. Copy each
 * stylesheet into it before mounting the app so the floating version looks exactly
 * like the version in the tab. Cross-origin sheets do not expose their rules, so
 * those are linked by their absolute URL instead.
 */
export function copyStyles(source: Document, target: Document): void {
  for (const sheet of source.styleSheets) {
    try {
      const style = target.createElement("style");
      style.textContent = Array.from(
        sheet.cssRules,
        (rule) => rule.cssText,
      ).join("\n");
      target.head.append(style);
    } catch {
      if (!sheet.href) continue;
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      target.head.append(link);
    }
  }
}
