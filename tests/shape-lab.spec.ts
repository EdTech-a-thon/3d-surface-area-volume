import { expect, test, type Locator, type Page } from "@playwright/test";

const SOLIDS = [
  { kind: "rectangularPrism", surfaceArea: "94", volume: "60" },
  { kind: "cube", surfaceArea: "24", volume: "8" },
  { kind: "triangularPrism", surfaceArea: "72", volume: "30" },
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

  for (const invalid of ["", "0", "-2", "20.1", "abc", "2.25"]) {
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
  await expect(page.getByTestId("net-note")).toContainText("2πr");
  // Dimensions and results survive the view change.
  await expect(page.getByTestId("input-r")).toHaveValue("2");
  await expect(page.getByTestId("surface-total")).toContainText("20π");

  await page.getByTestId("view-solid").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  await page.getByTestId("shape-sphere").click();
  await expect(page.getByTestId("view-net")).toBeDisabled();
  await expect(page.getByTestId("no-net-reason")).toContainText("no flat net");
  await expect(page.getByTestId("solid-view")).toBeVisible();
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
  await expect(badge).toContainText("l × h");
  await expect(badge).toContainText("3 × 5 = 15");

  // Letting go of the face puts the measurement away again.
  await pointAway(page);
  await expect(badge).toHaveText("F");
});

test("keeps a measurement on screen once its face is clicked", async ({
  page,
}) => {
  const badge = page.getByTestId("surface-top");
  await pointAtFace(page, "rectangularPrism:top", true);
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  await pointAway(page);
  await expect(badge).toContainText("3 × 4 = 12");

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
  await expect(page.getByTestId("surface-side")).toContainText("πrs");

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
