import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.describe.configure({ timeout: 120_000 });

async function openSetup(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Race', exact: true }).first().click();
}

test('empty entries cannot start and one entrant produces one complete result', async ({ page }) => {
  await openSetup(page);
  const entries = page.getByLabel('Race entries', { exact: true });
  const start = page.getByRole('button', { name: 'Start Race', exact: true });
  const instant = page.getByRole('button', { name: 'Instant Pick', exact: true });

  await entries.fill('');
  await expect(page.getByText('Add at least one entry to start.', { exact: true })).toBeVisible();
  await expect(start).toBeDisabled();
  await expect(instant).toBeDisabled();

  await entries.fill('Solo Duck');
  await expect(start).toBeEnabled();
  await expect(instant).toBeEnabled();
  await instant.click();

  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.result-name')).toHaveText('Solo Duck');
});

test('rapid repeated start and a suspended clock interval save exactly one result', async ({ page }) => {
  await openSetup(page);
  await page.getByLabel('Race entries', { exact: true }).fill('Alpha\nBeta');
  await page.getByLabel('Race duration', { exact: true }).selectOption('3');
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));

  const start = page.getByRole('button', { name: 'Start Race', exact: true });
  await start.evaluate(button => {
    button.click();
    button.click();
  });
  await expect(page.getByLabel('Real 3D duck race track')).toHaveAttribute('data-racing', 'true');
  await expect(page.locator('.scene-layer[data-phase="countdown"]')).toBeVisible();

  await page.clock.fastForward(10_000);
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history.length)).toBe(1);
});

test('race waits for delayed duck assets before countdown and saves one result', async ({ page }) => {
  test.setTimeout(150_000);
  await openSetup(page);
  await page.getByLabel('Race entries', { exact: true }).fill('Alpha\nBeta');
  await page.getByLabel('Race duration', { exact: true }).selectOption('3');
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));

  let releaseAsset;
  const assetReleased = new Promise(resolve => { releaseAsset = resolve; });
  let delayedUrl = '';
  await page.route(/\/assets\/(?:releases\/[^/]+\/)?ducks\/.*\.glb(?:\?.*)?$/, async route => {
    if (!delayedUrl) {
      delayedUrl = route.request().url();
      await assetReleased;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Start Race', exact: true }).click();
  await expect(page.locator('.scene-layer[data-phase="preparing"]')).toBeVisible();
  await expect.poll(() => delayedUrl, { timeout: 45_000 }).not.toBe('');

  await page.clock.fastForward(30_000);
  await expect(page.locator('.scene-layer[data-phase="preparing"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history.length)).toBe(0);

  releaseAsset();
  await expect(page.locator('.scene-layer[data-phase="countdown"]')).toBeVisible({ timeout: 45_000 });
  await page.clock.fastForward(10_000);

  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history.length)).toBe(1);
});

test('legacy v2 state is restored without offering deterministic replay', async ({ page }) => {
  await page.addInitScript(legacy => {
    localStorage.setItem('duck-race-randomizer:v2', JSON.stringify(legacy));
  }, {
    entriesText: 'Legacy Alpha\nLegacy Beta',
    duration: 7,
    lastResults: ['Legacy Alpha', 'Legacy Beta'],
    raceLogs: [{ summary: 'Legacy winner: Legacy Alpha', winners: ['Legacy Alpha'] }],
  });

  await openSetup(page);
  await expect(page.getByLabel('Race entries', { exact: true })).toHaveValue('Legacy Alpha\nLegacy Beta');
  await expect(page.getByText('Saved settings restored. Earlier results are retained as legacy history.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Results', exact: true }).first().click();
  await page.locator('details.history summary').click();
  const legacyRow = page.locator('.history-row');
  await expect(legacyRow).toContainText('Legacy winner: Legacy Alpha');
  await expect(legacyRow).toContainText('Legacy result — deterministic replay unavailable');
  await expect(legacyRow.getByRole('button', { name: /Replay/i })).toHaveCount(0);
});
