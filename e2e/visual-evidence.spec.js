import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Opt-in art/visual acceptance run. Screenshots are evidence, never an FPS claim.
test.skip(!process.env.VISUAL_EVIDENCE, "Run with VISUAL_EVIDENCE=1 after the final art build.");
test.use({ viewport: { width: 1440, height: 900 } });
test("capture complete desktop and mobile screen evidence", async ({ page }) => {
  test.setTimeout(900_000);
  const folder = "docs/evidence/local";
  await mkdir(folder, { recursive: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const ready = async () => {
    await expect(page.locator(".scene-layer")).toHaveAttribute("data-scene-state", "ready", {
      timeout: 60_000,
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  const capture = async (name) => {
    await ready();
    await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
  };
  await page.goto(process.env.QA_BASE_URL || "/");
  await capture("home-desktop");
  await page.getByRole("button", { name: "Play Race", exact: true }).first().click();
  await page
    .getByLabel("Race entries", { exact: true })
    .fill("Maple\nWillow\nRiver\nSnow\nPebble\nCobalt");
  await capture("setup-desktop");
  await page.getByRole("button", { name: "Duck Garage", exact: true }).first().click();
  for (const breed of ["Mallard", "White Pekin", "Khaki Campbell", "Mandarin", "Runner"]) {
    await page.getByRole("button", { name: breed, exact: true }).click();
    await capture(`breed-${breed.toLowerCase().replaceAll(" ", "-")}`);
  }
  await page.getByRole("button", { name: "Mallard", exact: true }).click();
  await page.getByRole("button", { name: "Explorer Hat", exact: true }).click();
  await capture("garage-desktop");
  await page.getByRole("button", { name: "Stages", exact: true }).first().click();
  await capture("stages-desktop");
  for (const stage of [
    "Forest Lake",
    "Mountain River",
    "Lotus Pond",
    "Sunset Marsh",
    "Village Canal",
  ]) {
    await page.getByRole("button", { name: new RegExp(stage) }).click();
    await capture(`stage-${stage.toLowerCase().replaceAll(" ", "-")}`);
  }
  await page.getByRole("button", { name: /Forest Lake/ }).click();
  await page.getByRole("button", { name: "Continue to Race" }).click();
  await page.getByLabel("Race duration").selectOption("10");
  await page.getByRole("button", { name: "Start Race", exact: true }).click();
  await expect(page.locator(".scene-layer")).toHaveAttribute("data-phase", "racing", {
    timeout: 60_000,
  });
  await capture("race-desktop");
  await expect(page.getByRole("heading", { name: "Results", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await capture("results-desktop");
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await capture("settings-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [screen, button] of [
    ["home", "Home"],
    ["setup", "Play Race"],
    ["garage", "Duck Garage"],
    ["stages", "Stages"],
    ["results", "Results"],
    ["settings", "Settings"],
  ]) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation").getByRole("button", { name: button, exact: true }).click();
    await capture(`${screen}-mobile`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test("capture stage thumbnails directly from the 3D scene", async ({ page }) => {
  test.skip(
    !process.env.CAPTURE_STAGE_ASSETS,
    "Only author thumbnails from the local development scene.",
  );
  test.setTimeout(240_000);
  await mkdir("public/assets/stages", { recursive: true });
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto("http://127.0.0.1:5173/scripts/qa/scene-preview.html");
  await page.getByLabel("Quality", { exact: true }).selectOption("low");
  await page.getByLabel("Screen", { exact: true }).selectOption("stages");
  for (const stage of [
    "forest-lake",
    "mountain-river",
    "lotus-pond",
    "sunset-marsh",
    "village-canal",
  ]) {
    await page.getByLabel("Stage", { exact: true }).selectOption(stage);
    await expect(page.locator("output")).toContainText(`"stage":"${stage}"`, { timeout: 60_000 });
    const style = await page.addStyleTag({ content: "nav,output{visibility:hidden!important}" });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.screenshot({ path: `public/assets/stages/${stage}.png` });
    await style.evaluate((element) => element.remove());
  }
});
