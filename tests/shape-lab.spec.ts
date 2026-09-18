import { expect, test, type Locator, type Page } from "@playwright/test";

const SOLIDS = [
  { kind: "rectangularPrism", surfaceArea: "94", volume: "60" },
  { kind: "cube", surfaceArea: "24", volume: "8" },
  { kind: "triangularPrism", surfaceArea: "72", volume: "30" },
  { kind: "squarePyramid", surfaceArea: "96", volume: "48" },
  { kind: "cylinder", surfaceArea: "20π", volume: "12π" },
  { kind: "cone", surfaceArea: "24π", volume: "12π" },
  { kind: "sphere", surfaceArea: "36π", volume: "36π" },
] as const;

async function totals(page: Page) {
  return {
    surfaceArea: await page.getByTestId("surface-total").innerText(),
    volume: await page.getByTestId("volume-total").innerText(),
  };
}

/** A face of the solid, as drawn: any one of the polygons that make it up. */
function face(page: Page, surfaceId: string): Locator {
  return page
    .getByTestId("solid-view")
    .locator(`polygon[data-target="surface:${surfaceId}"]`)
    .first();
}

/**
 * Point at a face, off to one side of its middle. A face's badge sits at its
 * centre, so pointing at the centre would be pointing at the badge instead.
 */
async function pointAtFace(page: Page, surfaceId: string, click = false) {
  const target = face(page, surfaceId);
  const box = await target.boundingBox();
  const position = {
    x: (box?.width ?? 20) * 0.25,
    y: (box?.height ?? 20) * 0.5,
  };
  await (click ? target.click({ position }) : target.hover({ position }));
}

/** An edge of the solid that carries the given length. */
function edge(page: Page, measure: string): Locator {
  return page
    .getByTestId("solid-view")
    .locator(`line[data-target="measure:${measure}"]`)
    .first();
}

/**
 * Point at an edge. A vertical edge is a zero-width line, so its own middle has
 * to be worked out and the mouse driven there directly.
 */
async function pointAtEdge(page: Page, measure: string, click = false) {
  const at = await edge(page, measure).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.move(at.x, at.y);
  if (click) await page.mouse.click(at.x, at.y);
}

/** Move the pointer well away from the shape. */
async function pointAway(page: Page) {
  await page.getByTestId("shape-rectangularPrism").hover();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Clicks and keystrokes are dropped until the page is live, which takes a
  // moment against a dev server building modules on demand.
  await expect(page.locator("[data-ready=true]")).toBeAttached();
});

test("shows the exact surface area and volume of every solid", async ({
  page,
}) => {
  for (const solid of SOLIDS) {
    await page.getByTestId(`shape-${solid.kind}`).click();
    await expect(page.getByTestId("surface-total")).toContainText(
      solid.surfaceArea,
    );
    await expect(page.getByTestId("volume-total")).toContainText(solid.volume);
  }
});

test("reports derived measurements as calculated, not editable", async ({
  page,
}) => {
  await page.getByTestId("shape-cone").click();
  await expect(page.getByTestId("derived-s")).toContainText("s = √(3² + 4²)");
  await expect(page.getByTestId("derived-s")).toContainText("5");
  await expect(page.getByTestId("input-s")).toHaveCount(0);

  await page.getByTestId("shape-triangularPrism").click();
  await expect(page.getByTestId("derived-c")).toContainText("c = √(3² + 4²)");
  await expect(page.getByTestId("input-c")).toHaveCount(0);

  await page.getByTestId("shape-squarePyramid").click();
  await expect(page.getByTestId("derived-s")).toContainText(
    "s = √(4² + (6/2)²)",
  );
  await expect(page.getByTestId("derived-s")).toContainText("5");
  await expect(page.getByTestId("input-s")).toHaveCount(0);
});

test("recalculates when a dimension changes", async ({ page }) => {
  await page.getByTestId("input-l").fill("6");
  await expect(page.getByTestId("volume-total")).toContainText("120");
  await expect(page.getByTestId("surface-total")).toContainText("148");

  await page.getByTestId("increase-w").click();
  await expect(page.getByTestId("input-w")).toHaveValue("4.1");
  await expect(page.getByTestId("volume-total")).toContainText("123");
});

test("rejects invalid dimensions and keeps the last valid geometry", async ({
  page,
}) => {
  const before = await totals(page);

  for (const invalid of ["", "0", "-2", "100000.1", "abc", "2.25"]) {
    await page.getByTestId("input-l").fill(invalid);
    await expect(page.getByTestId("error-l")).toBeVisible();
    await expect(page.getByTestId("solid-view")).toBeVisible();
    expect(await totals(page)).toEqual(before);
    await expect(page.getByTestId("surface-total")).not.toContainText("NaN");
  }

  await page.getByTestId("input-l").fill("3");
  await expect(page.getByTestId("error-l")).toHaveCount(0);
  expect(await totals(page)).toEqual(before);
});

test("switches between the solid and its net, and explains the sphere", async ({
  page,
}) => {
  await page.getByTestId("shape-cylinder").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("solid-view")).toHaveCount(0);
  // Dimensions and results survive the view change.
  await expect(page.getByTestId("input-r")).toHaveValue("2");
  await expect(page.getByTestId("surface-total")).toContainText("20π");

  await page.getByTestId("view-solid").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  await page.getByTestId("shape-sphere").click();
  await expect(page.getByTestId("view-net")).toBeDisabled();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  // The reason the Net tab is greyed out is always in the document, for anyone
  // reading it through the tab, but it is only laid out on screen for someone
  // pointing at the tab and asking.
  const reason = page.getByTestId("no-net-reason");
  await expect(reason).toContainText("no flat net");
  expect((await reason.boundingBox())?.width).toBeLessThan(10);
  await page.getByTestId("view-net").hover({ force: true });
  await expect
    .poll(async () => (await reason.boundingBox())?.width)
    .toBeGreaterThan(100);
});

/** Where an element sits on the page, which is comparable across the views. */
function placeOf(locator: Locator) {
  return locator.first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height];
  });
}

/**
 * Watch the fold for the two frames at its very ends, from inside the page.
 * Reading them afterwards would always be a frame or two late, and it is
 * precisely the first and last frames that have to line up with the views
 * either side of them.
 */
async function watchFoldEnds(page: Page, surfaceId: string) {
  await page.evaluate((id) => {
    const ends: Record<string, number[]> = {};
    (window as unknown as { __foldEnds: typeof ends }).__foldEnds = ends;
    const tick = () => {
      const fold = document.querySelector("[data-testid=fold-view]");
      const shut = fold?.getAttribute("data-closedness");
      const piece = fold?.querySelector(`polygon[data-surface="${id}"]`);
      if (piece && (shut === "1.000" || shut === "0.000")) {
        const box = piece.getBoundingClientRect();
        ends[shut] = [box.x, box.y, box.width, box.height];
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, surfaceId);

  return async () =>
    page.evaluate(
      () =>
        (window as unknown as { __foldEnds: Record<string, number[]> })
          .__foldEnds,
    );
}

function agreeWithin(a: number[], b: number[], slack: number) {
  a.forEach((value, index) => expect(value).toBeCloseTo(b[index], slack));
}

test("folds the solid out into its net and back, from the pose it was left in", async ({
  page,
}) => {
  await page.getByTestId("shape-cube").click();

  // Turn the cube well away from its home view, so a fold that ignored the
  // current pose would be obvious.
  await page.getByTestId("solid-view").focus();
  for (let press = 0; press < 4; press += 1)
    await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");

  const ends = await watchFoldEnds(page, "cube:front");
  const standing = await placeOf(face(page, "cube:front"));

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("fold-view")).toBeAttached();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  const flat = await placeOf(
    page
      .getByTestId("net-view")
      .locator('g[data-target="surface:cube:front"] polygon'),
  );

  // Folding back up leaves the solid exactly as it was found.
  await page.getByTestId("view-solid").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  agreeWithin(await placeOf(face(page, "cube:front")), standing, 1);

  // The fold starts on the solid and finishes on the net, to the pixel, so
  // neither handover moves anything on screen.
  const frames = await ends();
  agreeWithin(frames["1.000"], standing, 1);
  agreeWithin(frames["0.000"], flat, 1);
});

test("goes straight to the net when motion is not wanted", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-ready=true]")).toBeAttached();

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  await context.close();
});

test("switches straight over for a shape whose net does not fold up", async ({
  page,
}) => {
  // The logo tile is laid out as loose parts on a workbench rather than as one
  // joined sheet, so there is no fold to show and it simply changes view.
  await page.getByTestId("brand-toggle").click();
  await expect(page.getByTestId("input-m")).toHaveValue("4");

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
});

test("floats over other tabs and returns with its state", async ({
  page,
  context,
}) => {
  const floatButton = page.getByTestId("toggle-float");
  await expect(floatButton).toBeEnabled();
  await page.getByTestId("shape-cube").click();

  const floatingPagePromise = context.waitForEvent("page");
  await floatButton.click();
  const floatingPage = await floatingPagePromise;

  await expect(page.getByTestId("floating-placeholder")).toBeVisible();
  await expect(floatingPage.getByTestId("solid-view")).toBeVisible();
  await expect(floatingPage.getByTestId("surface-total")).toContainText("24");

  // The floating copy is a fully interactive Svelte root, not a static image.
  await floatingPage.getByTestId("input-s").fill("3");
  await expect(floatingPage.getByTestId("surface-total")).toContainText("54");

  // It offers no way back of its own: that is the browser's own back-to-tab
  // button, which returns the viewer to the tab and not just the lab.
  await expect(floatingPage.getByTestId("toggle-float")).toHaveCount(0);

  // Closing the floating window, however it is closed, brings the lab home.
  await floatingPage.close();
  await expect(page.getByTestId("floating-placeholder")).toHaveCount(0);
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("54");

  // The tab it left behind can also call it back.
  const reopenedPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const reopenedPage = await reopenedPagePromise;
  await reopenedPage.getByTestId("solid-view").waitFor();
  await page.getByTestId("return-to-tab").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("54");
});

test("stops auto-rotation when a net is shown", async ({ page }) => {
  await page.getByTestId("toggle-spin").click();
  await expect(page.getByTestId("toggle-spin")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("toggle-spin")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByTestId("toggle-spin")).toBeDisabled();
});

test("measures a face while the pointer is on it", async ({ page }) => {
  const badge = page.getByTestId("surface-front");
  await expect(badge).toHaveText("F");

  await pointAtFace(page, "rectangularPrism:front");
  await expect(badge).toContainText("Front face");
  await expect(badge).toContainText("= 15");
  // The working belongs to the formula toggle, not to the face.
  await expect(badge).not.toContainText("l × h");

  // Letting go of the face puts the measurement away again.
  await pointAway(page);
  await expect(badge).toHaveText("F");

  // With formulas switched on, the same face shows its working too.
  await page.getByTestId("toggle-formulas").click();
  await pointAtFace(page, "rectangularPrism:front");
  await expect(badge).toContainText("l × h");
  await expect(badge).toContainText("3 × 5 = 15");
});

test("keeps a measurement on screen once its face is clicked", async ({
  page,
}) => {
  const badge = page.getByTestId("surface-top");
  await pointAtFace(page, "rectangularPrism:top", true);
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  await pointAway(page);
  await expect(badge).toContainText("= 12");

  // The same surface stays highlighted in the net, and comes back when the
  // solid does.
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await page.getByTestId("view-solid").click();
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  // Clicking again puts it away, and changing solid clears everything.
  await pointAtFace(page, "rectangularPrism:top", true);
  await pointAway(page);
  await expect(badge).toHaveText("T");

  await pointAtFace(page, "rectangularPrism:front", true);
  await page.getByTestId("shape-cube").click();
  await pointAway(page);
  await expect(page.getByTestId("surface-front")).toHaveText("F");
});

test("measures an edge on hover and pins it on click", async ({ page }) => {
  const label = page.getByTestId("measure-label");
  await expect(label).toHaveCount(0);

  // Pointing is enough to read a length, and letting go puts it away.
  await pointAtEdge(page, "w");
  await expect(label).toHaveText(/w = 4 units/);
  await pointAway(page);
  await expect(label).toHaveCount(0);

  // Clicking makes it stay.
  await pointAtEdge(page, "h", true);
  await pointAway(page);
  await expect(label).toHaveText(/h = 5 units/);

  // A pinned length still tracks the dimension it measures.
  await page.getByTestId("input-h").fill("7");
  await expect(label).toHaveText(/h = 7 units/);

  // Clicking the label lets the length go; it lingers only while pointed at.
  await label.click();
  await expect(label).toHaveAttribute("aria-pressed", "false");
  await pointAway(page);
  await expect(label).toHaveCount(0);
});

test("shows a derived length with its working", async ({ page }) => {
  await page.getByTestId("shape-cone").click();
  await pointAtEdge(page, "s");
  const label = page.getByTestId("measure-label");
  await expect(label).toContainText("s = √(3² + 4²)");
  await expect(label).toContainText("s = 5 units");
});

test("hides final answers without hiding the formulas, and keeps the choice", async ({
  page,
}) => {
  await page.getByTestId("toggle-formulas").click();
  await page.getByTestId("toggle-answers").click();

  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
  await expect(page.getByTestId("volume-total-hidden")).toBeVisible();

  // A face still shows its working, but not its result.
  await pointAtFace(page, "rectangularPrism:front");
  await expect(page.getByTestId("surface-front")).toContainText("3 × 5 = ?");

  // Formulas and substitutions stay on screen for discussion.
  await expect(page.getByTestId("surface-formula")).toContainText(
    "SA = 2(lw + lh + wh)",
  );
  await expect(page.getByTestId("surface-substitution")).toContainText(
    "2(3 × 4 + 3 × 5 + 4 × 5)",
  );
  await expect(page.getByTestId("volume-substitution")).toContainText(
    "3 × 4 × 5",
  );

  // No evaluated result in the rendered text, nor in anything a screen reader
  // or tooltip would announce. Drawing coordinates are excluded on purpose:
  // they are geometry, not a readable answer.
  const leaked = await page.evaluate(() => {
    const secrets = ["94", "60", "15"];
    const announced = [
      "title",
      "alt",
      "placeholder",
      "aria-label",
      "aria-description",
      "aria-valuetext",
      "aria-roledescription",
    ];
    const spoken: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      for (const name of announced) {
        const value = element.getAttribute(name);
        if (value) spoken.push(value);
      }
    }
    return {
      inText: secrets.filter((secret) =>
        document.body.innerText.includes(secret),
      ),
      inAnnouncedText: secrets.filter((secret) =>
        spoken.some((value) => value.includes(secret)),
      ),
    };
  });
  expect(leaked.inText).toEqual([]);
  expect(leaked.inAnnouncedText).toEqual([]);

  // The choice survives a view change and a shape change.
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
  await page.getByTestId("shape-cube").click();
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();

  // Revealing shows the current geometry, not the shape we started on.
  await page.getByTestId("toggle-answers").click();
  await expect(page.getByTestId("surface-total")).toContainText("24");
  await expect(page.getByTestId("volume-total")).toContainText("8");
});

test("rotates with the keyboard without changing any calculated value", async ({
  page,
}) => {
  const view = page.getByTestId("solid-view");
  // The drawn outlines are what rotation changes; attribute order in the
  // markup is not meaningful.
  const outlines = () =>
    view
      .locator("polygon")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("points")));

  const before = await outlines();
  const numbers = await totals(page);

  await view.focus();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");

  await expect.poll(async () => await outlines()).not.toEqual(before);
  expect(await totals(page)).toEqual(numbers);

  await page.getByTestId("reset-view").click();
  await expect.poll(async () => await outlines()).toEqual(before);
});

test("relabels units without converting the numbers", async ({ page }) => {
  await expect(page.getByTestId("surface-total")).toContainText("square units");
  await page.getByTestId("unit-select").selectOption("cm");
  await expect(page.getByTestId("surface-total")).toContainText("94");
  await expect(page.getByTestId("surface-total")).toContainText("cm²");
  await expect(page.getByTestId("volume-total")).toContainText("cm³");
});

test("supports every essential action from the keyboard alone", async ({
  page,
}) => {
  await page.getByTestId("shape-cone").press("Enter");
  await expect(page.getByTestId("surface-total")).toContainText("24π");

  await page.getByTestId("input-r").fill("6");
  await expect(page.getByTestId("volume-total")).toContainText("48π");

  // A face, measured from its badge rather than by pointing at it.
  await page.getByTestId("surface-side").press("Enter");
  await expect(page.getByTestId("surface-side")).toContainText("Curved side");

  // A length, measured from the dimension bar rather than from the shape.
  await page.getByTestId("measure-h").press("Enter");
  await expect(page.getByTestId("measure-label")).toHaveText(/h = 4 units/);

  await page.getByTestId("view-net").press("Enter");
  await expect(page.getByTestId("net-view")).toBeVisible();

  await page.getByTestId("toggle-answers").press("Enter");
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
});

test("gives the shape the screen, with one panel in each corner", async ({
  page,
}) => {
  const stage = page.getByTestId("solid-view").boundingBox();
  const viewport = page.viewportSize();
  const box = await stage;
  // The drawing is the page, not a pane inside it.
  expect(box?.width).toBeGreaterThan((viewport?.width ?? 0) * 0.95);
  expect(box?.height).toBeGreaterThan((viewport?.height ?? 0) * 0.9);

  await expect(page.getByTestId("shape-cube")).toBeVisible();
  await expect(page.getByTestId("input-l")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toBeVisible();
  await expect(page.getByTestId("view-net")).toBeVisible();
});

test("stays usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("shape-cylinder")).toBeVisible();
  await expect(page.getByTestId("input-l")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("94");

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("takes typed sizes far past the slider, while the slider stays bounded", async ({
  page,
}) => {
  await page.getByTestId("input-l").fill("2500");
  await expect(page.getByTestId("error-l")).toHaveCount(0);
  // 2500 × the other two default dimensions.
  await expect(page.getByTestId("volume-total")).toContainText("50000");

  const range = page.getByTestId("range-l");
  await expect(range).toHaveAttribute("max", "20");
  // The handle rests at the top of the slider's own range until it is dragged.
  await expect(range).toHaveValue("20");

  await page.getByTestId("decrease-l").click();
  await expect(page.getByTestId("input-l")).toHaveValue("2499.9");
});

test("keeps rounded decimals short, with the detail a hover away", async ({
  page,
}) => {
  await page.getByTestId("shape-cylinder").click();
  const approx = page.getByTestId("surface-total-approx");

  // Only the visible form counts: the other is display:none until hovered.
  await expect(approx).toHaveText("≈ 62.8", { useInnerText: true });
  await approx.hover();
  await expect(approx).toHaveText("≈ 62.83185", { useInnerText: true });
});

test("folds the footer into a chip that stays clear of the controls", async ({
  page,
}) => {
  const toggle = page.getByTestId("brand-toggle");
  const panel = page.getByTestId("brand-panel");

  // Folded up, it is a logo and nothing else. The links stay in the document
  // for the keyboard, so what says they are folded is the screen-reader-only
  // box they sit in, not their absence.
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect((await panel.boundingBox())!.width).toBeLessThan(10);

  // Pointing at it is enough; a click is only there for touch.
  await toggle.hover();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toContainText("Built by teacher.dev");
  expect((await panel.boundingBox())!.width).toBeGreaterThan(100);
});

test("keeps the brand chip out of the way on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const chip = await page.getByTestId("brand-toggle").boundingBox();
  const first = await page.getByTestId("shape-rectangularPrism").boundingBox();
  const lastOnRow = await page
    .getByTestId("shape-triangularPrism")
    .boundingBox();
  const view = await page.getByTestId("view-solid").boundingBox();

  // The top edge is the tightest row on a phone. The mark leads the row, and
  // what follows it still has to clear the view controls opposite.
  expect(chip!.x + chip!.width).toBeLessThanOrEqual(first!.x);
  expect(lastOnRow!.x + lastOnRow!.width).toBeLessThan(view!.x);
});

test("keeps the logo out of the shape picker, and behind the mark", async ({
  page,
}) => {
  // It is not one of the six on offer.
  await expect(page.getByTestId("shape-logoSlab")).toHaveCount(0);

  await page.getByTestId("brand-toggle").click();

  // The top radius is 1, the bottom radius is 1 + 1.5, and the 2-high
  // bevel has a 2.5-long outside edge. The analytic totals stay exact.
  await expect(page.getByTestId("surface-total")).toContainText("128");
  await expect(page.getByTestId("surface-total")).toContainText("16π");
  await expect(page.getByTestId("volume-total")).toContainText("88");
  await expect(page.getByTestId("volume-total")).toContainText("6.5π");

  // It is a solid like any other: it has a net and its own dimensions, while
  // the slanted edge t is correctly derived rather than entered independently.
  await expect(page.getByTestId("input-m")).toHaveValue("4");
  await expect(page.getByTestId("input-r")).toHaveValue("1");
  await expect(page.getByTestId("input-b")).toHaveValue("1.5");
  await expect(page.getByTestId("input-h")).toHaveValue("2");
  await expect(page.getByTestId("derived-t")).toContainText("2.5");
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
});

test("reaches the about and privacy pages from the chip", async ({ page }) => {
  await page.getByTestId("brand-toggle").hover();
  await page.getByTestId("brand-about").click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "About", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /support@teacher\.dev/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByText("does not collect personal information"),
  ).toBeVisible();

  await page.getByTestId("back-to-lab").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
});
