import { test, expect } from '@playwright/test';
async function setup(page) { await page.goto('/'); await page.getByRole('button', { name: 'Play Race', exact: true }).first().click(); }
test('loads home title and exactly one 3D renderer', async ({ page }) => { await page.goto('/'); await expect(page).toHaveTitle(/Duck Race Randomizer/); await expect(page.getByLabel('Real 3D duck race track')).toBeVisible(); await expect(page.locator('canvas')).toHaveCount(1); await page.screenshot({ path: 'test-results/home.png' }); });
test('overlay route displays one scene and hides navigation', async ({ page }) => { await page.goto('/?view=overlay'); await expect(page.getByRole('heading', { name: 'Audience Mode' })).toBeVisible(); await expect(page.getByRole('navigation')).toHaveCount(0); await expect(page.getByLabel('Real 3D duck race track')).toHaveCount(1); });
test('manual entries persist across reload', async ({ page }) => { await setup(page); await page.getByLabel('Race entries').fill('Alpha\nBeta\nGamma'); await page.reload(); await page.getByRole('button', { name: 'Play Race', exact: true }).first().click(); await expect(page.getByLabel('Race entries')).toHaveValue('Alpha\nBeta\nGamma'); });
test('number generator creates sequence and bounds large input', async ({ page }) => { await setup(page); await page.getByText('Advanced options', { exact: true }).click(); await page.getByPlaceholder('Start', { exact: true }).fill('1'); await page.getByPlaceholder('End', { exact: true }).fill('4'); await page.getByPlaceholder('Prefix', { exact: true }).fill('Duck '); await page.getByRole('button', { name: 'Generate', exact: true }).click(); await expect(page.getByLabel('Race entries')).toHaveValue('Duck 1\nDuck 2\nDuck 3\nDuck 4'); await page.getByPlaceholder('End', { exact: true }).fill('10000000000'); await page.getByRole('button', { name: 'Generate', exact: true }).click(); await expect(page.getByText('Use whole numbers defining no more than 100 entries.')).toBeVisible(); });
test('timed race finishes even after clock advances across suspended interval', async ({ page }) => { await setup(page); await page.getByLabel('Race duration').selectOption('3'); await page.getByRole('button', { name: 'Start Race', exact: true }).click(); await expect(page.getByLabel('Real 3D duck race track')).toHaveAttribute('data-racing', 'true'); await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible({ timeout: 30000 }); await expect(page.getByLabel('Real 3D duck race track')).toHaveAttribute('data-winner-progress', '100'); await expect(page.locator('.result-list li')).toHaveCount(6); });
test('app shell and entries work offline after service worker activates', async ({ page, context }) => { await setup(page); await page.getByLabel('Race entries').fill('Saved A\nSaved B'); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Duck Race', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Play Race', exact: true }).first().click(); await expect(page.getByLabel('Race entries')).toHaveValue('Saved A\nSaved B'); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); await expect(page.locator('.result-list li')).toHaveCount(2); });
test('WebGL failure preserves randomizer workflow', async ({ page }) => { await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : get.call(this, type, ...args); }; }); await setup(page); await page.getByRole('button', { name: 'Instant Pick', exact: true }).click(); await expect(page.locator('.result-list li')).toHaveCount(6); });

test('offline upgrade uses current shell when a previous release cache exists', async ({ page, context }) => {
  await page.route('**/cache-fixture', route => route.fulfill({ contentType: 'text/html', body: '<title>Cache fixture</title>' }));
  await page.goto('/cache-fixture');
  await page.evaluate(async () => {
    const old = await caches.open('duck-race-v1');
    await old.put('/index.html', new Response('<h1>Obsolete release fixture</h1>', { headers: { 'Content-Type': 'text/html' } }));
    localStorage.setItem('duck-race-randomizer:v2', JSON.stringify({ entriesText: 'Retained A\nRetained B' }));
  });
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Duck Race', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play Race', exact: true }).first().click();
  await expect(page.getByLabel('Race entries')).toHaveValue('Retained A\nRetained B');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
});
