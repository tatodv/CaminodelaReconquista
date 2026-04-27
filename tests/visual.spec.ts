import { test, expect, devices } from "@playwright/test";

test("protagonists section is visible and renders portraits", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/recorrido.html", { waitUntil: "networkidle" });

  const section = page.locator("#protagonistas");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await expect(section.locator("h2")).toHaveText(/rostros de la Reconquista/i);

  const portraits = section.locator(".portrait img");
  await expect(portraits).toHaveCount(6);

  // Each portrait image must actually load (naturalWidth > 0)
  const sizes = await portraits.evaluateAll((imgs) =>
    imgs.map((i) => ({ src: (i as HTMLImageElement).currentSrc, w: (i as HTMLImageElement).naturalWidth })),
  );
  console.log("portraits:", sizes);
  for (const s of sizes) {
    expect(s.w).toBeGreaterThan(0);
  }

  await page.screenshot({ path: "test-results/protagonists-mobile.png", fullPage: false });
});
