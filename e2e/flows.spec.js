import { test, expect } from '@playwright/test';
async function setup(page) { await page.goto('/'); await page.getByRole('button', { name: 'Play Race', exact: true }).first().click(); }
async function advance(page) { await page.getByText('Advanced options', { exact: true }).click(); }
const entries = page => page.getByLabel('Race entries', { exact: true });

test('tournament elimination removes exact winner and undo restores list', async ({ page }) => {
  await setup(page); await entries(page).fill('Ant\nBee\nCat\nDog');
  await page.getByLabel('Elimination rule').selectOption('first');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo Elimination', exact: true }).click();
  await page.getByRole('button', { name: 'Race Again' }).click();
  await expect(entries(page)).toHaveValue('Ant\nBee\nCat\nDog');
});
test('exports entries and complete results', async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page); await entries(page).fill('Ant\nBee'); await advance(page);
  const txt = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export TXT', exact: true }).click(); expect((await txt).suggestedFilename()).toBe('entries.txt');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  const csv = page.waitForEvent('download'); await page.getByRole('button', { name: 'Results CSV', exact: true }).click(); expect((await csv).suggestedFilename()).toBe('results.csv');
});
test('100 entrants resolve complete ranking, 101 are rejected without truncation', async ({ page }) => {
  await setup(page); const names = n => Array.from({ length: n }, (_, i) => `Duck ${i + 1}`).join('\n');
  await entries(page).fill(names(101)); await expect(page.getByRole('button', { name: 'Instant Pick', exact: true })).toBeDisabled(); await expect(entries(page)).toHaveValue(names(101));
  await entries(page).fill(names(100)); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); await expect(page.locator('.result-list li')).toHaveCount(100);
});
test('same seed repeats results with different cosmetic and stage choices', async ({ page }) => {
  test.setTimeout(180_000);
  await setup(page); await entries(page).fill('A\nB\nC\nD\nE\nF'); await advance(page); await page.getByLabel('Race seed', { exact: true }).fill('race42');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); const first = await page.locator('.result-name').allTextContents();
  await page.getByRole('button', { name: 'Duck Garage', exact: true }).first().click(); await page.getByRole('button', { name: 'Mandarin', exact: true }).click(); await page.getByRole('button', { name: 'Bow Tie', exact: true }).click(); await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Stages', exact: true }).first().click(); await page.getByRole('button', { name: /Sunset Marsh/ }).click(); await page.getByRole('button', { name: 'Continue to Race' }).click();
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); expect(await page.locator('.result-name').allTextContents()).toEqual(first);
});
test('timed replay does not draw, eliminate or add history again', async ({ page }) => {
  await setup(page); await entries(page).fill('Ant\nBee\nCat'); await page.getByLabel('Race duration').selectOption('3'); await page.getByLabel('Elimination rule').selectOption('first'); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')));
  await page.getByRole('button', { name: 'Replay', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible({ timeout: 15000 });
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3'))); expect(after.history).toEqual(before.history); expect(after.settings.entriesText).toBe(before.settings.entriesText);
});
test('cancel countdown produces no result and preserves entries', async ({ page }) => {
  await setup(page); await entries(page).fill('A\nB'); await page.getByRole('button', { name: 'Start Race', exact: true }).click(); await page.getByRole('button', { name: 'Cancel race' }).click();
  await expect(entries(page)).toHaveValue('A\nB'); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history.length)).toBe(0);
});
test('duplicate occurrences and filtered-out entries survive correct elimination', async ({ page }) => {
  await setup(page); await entries(page).fill('Same\nHidden\nSame'); await page.getByRole('switch', { name: 'Remove duplicates' }).uncheck(); await page.getByLabel('Elimination rule').selectOption('first'); await advance(page); await page.getByLabel('Filter active entries').fill('Same'); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await page.getByRole('button', { name: 'Race Again' }).click(); const text = await entries(page).inputValue(); expect(text.split('\n').filter(x => x === 'Same')).toHaveLength(1); expect(text).toContain('Hidden');
});
test('CSV import roundtrip retains comma inside name and excludes header', async ({ page }) => {
  await setup(page); await page.getByLabel('Import entries', { exact: true }).setInputFiles({ name: 'entries.csv', mimeType: 'text/csv', buffer: Buffer.from('entry\r\n"Smith, Jane"\r\n"Bee"') }); await expect(entries(page)).toHaveValue('Smith, Jane\nBee\n'); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); expect(await page.locator('.result-name').allTextContents()).toContain('Smith, Jane');
});
test.describe('mobile', () => { test.use({ viewport: { width: 390, height: 844 } });
  test('every screen has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Play Race', 'Duck Garage', 'Stages', 'Results', 'Settings']) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click(); await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: 'test-results/mobile-settings.png', fullPage: true });
  });
});
