import { test, expect, devices } from "@playwright/test";

const URL = "http://127.0.0.1:4173/recorrido.html";

test("desktop: no console errors and map renders", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await expect(page.locator("#map .story-map")).toBeVisible();
  await expect(page.locator("#chapter-count")).toHaveText(/0\/6|01\/06|1\/6/);
  await expect(page.locator(".audio-panel")).toHaveCount(0);
  await expect(page.locator(".mobile-sheet")).toHaveCount(0);

  // overview must come BEFORE closing in DOM order
  const overviewIdx = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll("main > section"));
    return {
      overview: sections.findIndex((s) => s.id === "overview"),
      closing: sections.findIndex((s) => s.id === "closing"),
    };
  });
  expect(overviewIdx.overview).toBeLessThan(overviewIdx.closing);

  // CSP without unsafe-inline
  const csp = await page.evaluate(() =>
    document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content"),
  );
  expect(csp).not.toContain("'unsafe-inline'");

  if (errors.length) console.log("ERRORS:", errors);
  expect(errors).toEqual([]);
});

test("mobile (Pixel 5): map sticky, scroll updates active step", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await expect(page.locator("#map .story-map")).toBeVisible();

  const mapPos = await page.locator(".map-stage").evaluate((el) => getComputedStyle(el).position);
  expect(mapPos).toBe("sticky");

  // No per-step snapshots remain
  await expect(page.locator(".story-mobile-map")).toHaveCount(0);

  // Scroll to second step and check active state propagates
  await page.evaluate(() => {
    const el = document.getElementById("step-2");
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(600);
  await expect(page.locator("#chapter-count")).toContainText("2");

  if (errors.length) console.log("ERRORS:", errors);
  expect(errors).toEqual([]);
});
