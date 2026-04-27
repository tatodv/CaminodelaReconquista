import { test, devices } from "@playwright/test";

test("full page mobile screenshot", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/recorrido.html", { waitUntil: "networkidle" });
  await page.screenshot({ path: "test-results/recorrido-mobile-full.png", fullPage: true });
});
