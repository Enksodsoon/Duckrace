import { test, expect } from "@playwright/test";

test("a failed duck download can be retried without losing the entry pool", async ({ page }) => {
  let blocked = true;
  await page.route(/\/ducks\/.*\.glb$/, (route) =>
    blocked ? route.abort("failed") : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("3D view unavailable");
  await page.getByRole("button", { name: "Use randomizer", exact: true }).click();
  await page.getByLabel("Race entries").fill("Recovery Maple\nRecovery River");
  blocked = false;
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator(".scene-layer")).toHaveAttribute("data-scene-state", "ready", {
    timeout: 45_000,
  });
  await expect(page.getByLabel("Race entries")).toHaveValue("Recovery Maple\nRecovery River");
  await page.getByRole("button", { name: "Instant Pick", exact: true }).click();
  await expect(page.locator(".result-list li")).toHaveCount(2);
});

test("WebGL context recovery retains the saved result", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".scene-layer")).toHaveAttribute("data-scene-state", "ready", {
    timeout: 45_000,
  });
  await page.getByRole("button", { name: "Play Race", exact: true }).first().click();
  await page.getByRole("button", { name: "Instant Pick", exact: true }).click();
  const names = await page.locator(".result-name").allTextContents();
  const supported = await page.locator("canvas").evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  test.skip(!supported, "Browser does not expose the WebGL context-loss testing extension.");
  await expect(page.getByRole("alert")).toContainText("3D view unavailable");
  await page.getByRole("button", { name: "Retry 3D", exact: true }).click();
  await expect(page.locator(".scene-layer")).toHaveAttribute("data-scene-state", "ready", {
    timeout: 45_000,
  });
  expect(await page.locator(".result-name").allTextContents()).toEqual(names);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("duck-race-randomizer:v3")).history.length,
    ),
  ).toBe(1);
});
