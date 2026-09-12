import { test, expect } from '@playwright/test';

test('graphics quality changes recover one renderer and settings tabs support keyboard navigation', async ({ page }) => {
  // Hosted Linux uses SwiftShader. Three complete quality transitions exceeded
  // 180s there despite passing each assertion; keep the same GPU-path coverage.
  test.setTimeout(process.env.CI ? 360000 : 60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const graphics = page.getByRole('tab', { name: 'Graphics', exact: true });
  await graphics.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Audio', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'settings-tab-audio');
  await page.keyboard.press('Home');
  await expect(graphics).toBeFocused();
  // Force the reflected-water path, then release/recreate its render target.
  for (const quality of ['high', 'low', 'medium']) {
    await page.getByLabel('Graphics quality', { exact: true }).selectOption(quality);
    await expect(page.locator('.scene-layer')).toHaveAttribute('data-scene-state', 'ready', { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.getByRole('switch', { name: /^Reduced motion/ }).check();
  await page.getByRole('button', { name: 'Play Race', exact: true }).first().click();
  await page.getByLabel('Race entries').fill('Reflection A\nReflection B');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  expect(errors).toEqual([]);
});
