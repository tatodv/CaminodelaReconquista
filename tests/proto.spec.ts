import { test, devices } from "@playwright/test";

test("protagonists diagnostics", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/recorrido.html", { waitUntil: "networkidle" });
  await page.locator("#protagonistas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  const stats = await page.evaluate(() => {
    const sec = document.getElementById("protagonistas")!;
    const r = sec.getBoundingClientRect();
    const cs = getComputedStyle(sec);
    const portraits = Array.from(sec.querySelectorAll(".portrait")).map((el) => {
      const pr = el.getBoundingClientRect();
      const frame = el.querySelector(".portrait__frame") as HTMLElement | null;
      const fr = frame?.getBoundingClientRect();
      return {
        portraitH: pr.height,
        portraitW: pr.width,
        frameH: fr?.height,
        frameW: fr?.width,
      };
    });
    return {
      sectionTop: r.top + window.scrollY,
      sectionH: r.height,
      sectionW: r.width,
      contentVisibility: cs.contentVisibility,
      containIntrinsicSize: cs.containIntrinsicSize,
      pageH: document.documentElement.scrollHeight,
      portraits,
    };
  });
  console.log(JSON.stringify(stats, null, 2));

  await page.screenshot({ path: "test-results/proto-viewport.png" });
});
