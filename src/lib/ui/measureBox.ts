/**
 * Report an element's own size, in the document it actually lives in.
 *
 * Svelte's `bind:clientWidth` measures through one shared ResizeObserver, and
 * that observer belongs to the tab that created it. The floating window is a
 * second document, so a copy of the lab mounted into it can be resized without
 * the binding ever firing: the drawing keeps the viewBox it had, the SVG
 * stretches to the new shape, and every label positioned in CSS pixels lands
 * somewhere it does not belong until something else forces a re-measure.
 *
 * Observing through the element's own window fixes that, and the window's
 * resize event is kept as a second path in case the observer is unavailable.
 */
type SizeObserverConstructor = new (callback: () => void) => {
  observe(target: Element): void;
  disconnect(): void;
};

export function measureBox(
  node: HTMLElement,
  onSize: (width: number, height: number) => void,
) {
  const view = node.ownerDocument.defaultView;
  const report = () => onSize(node.clientWidth, node.clientHeight);

  report();

  const Observer = (
    view as (Window & { ResizeObserver?: SizeObserverConstructor }) | null
  )?.ResizeObserver;
  const observer = Observer ? new Observer(report) : null;
  observer?.observe(node);
  view?.addEventListener("resize", report);

  return {
    destroy() {
      observer?.disconnect();
      view?.removeEventListener("resize", report);
    },
  };
}
