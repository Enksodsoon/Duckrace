import { test, expect } from '@playwright/test';

test('loads with title and 3D race shell', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Duck Race Randomizer/);
  const shell = page.getByLabel('Real 3D duck race track');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-racing', 'false');
});

test('overlay route renders the race shell standalone', async ({ page }) => {
  await page.goto('/?view=overlay');
  await expect(page.getByText('Audience Mode').first()).toBeVisible();
  // Overlay-only route hides the dashboard, so exactly one shell renders.
  await expect(page.getByLabel('Real 3D duck race track')).toHaveCount(1);
});

test('manual entries persist across reload', async ({ page }) => {
  await page.goto('/');
  const entries = page.getByPlaceholder('One entry per line, or use commas');
  await entries.fill('Alpha\nBeta\nGamma');
  await expect(entries).toHaveValue('Alpha\nBeta\nGamma');
  await page.reload();
  await expect(page.getByPlaceholder('One entry per line, or use commas')).toHaveValue(
    'Alpha\nBeta\nGamma',
  );
});

test('number generation produces a prefixed sequence', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Start').fill('1');
  await page.getByPlaceholder('End').fill('4');
  await page.getByPlaceholder('Prefix').fill('Duck ');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByPlaceholder('One entry per line, or use commas')).toHaveValue(
    'Duck 1\nDuck 2\nDuck 3\nDuck 4',
  );
});

test('instant pick shows a winner, reset clears it but keeps entries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  const shell = page.getByLabel('Real 3D duck race track');
  await expect(shell).toHaveAttribute('data-racing', 'false');
  await expect(shell).toHaveAttribute('data-winner-progress', '100');
  await expect(page.getByText('No podium yet.')).toBeHidden();
  const entriesBefore = await page
    .getByPlaceholder('One entry per line, or use commas')
    .inputValue();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText('No podium yet.')).toBeVisible();
  await expect(page.getByPlaceholder('One entry per line, or use commas')).not.toHaveValue('');
  expect(entriesBefore.length).toBeGreaterThan(0);
});

test('app shell loads offline after first visit', async ({ page, context }) => {
  await page.goto('/');
  const shell = page.getByLabel('Real 3D duck race track');
  await expect(shell).toBeVisible();
  // Wait until the service worker is active, reload once online so it takes
  // control and runtime-caches the hashed chunks, then go offline.
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.reload();
  await expect(shell).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(shell).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveTitle(/Duck Race Randomizer/);
});

test('timed race completes with the winner at 100%', async ({ page }) => {  await page.goto('/');
  await page.getByLabel('Race duration').fill('3');
  await page.getByRole('button', { name: 'Start Race' }).click();
  const shell = page.getByLabel('Real 3D duck race track');
  await expect(shell).toHaveAttribute('data-racing', 'false', { timeout: 30_000 });
  await expect(shell).toHaveAttribute('data-winner-progress', '100');
  await expect(page.getByText('1st').first()).toBeVisible();
});
