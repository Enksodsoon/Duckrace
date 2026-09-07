import { test, expect } from '@playwright/test';

test('tournament elimination removes the winner, undo restores entries', async ({ page }) => {
  await page.goto('/');
  const entries = page.getByPlaceholder('One entry per line, or use commas');
  await entries.fill('Ant\nBee\nCat\nDog');
  // Default rule is "Eliminate 1st only".
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  const afterPick = await entries.inputValue();
  expect(afterPick.split('\n')).toHaveLength(3);
  await page.getByRole('button', { name: 'Undo last elimination round', exact: true }).click();
  await expect(entries).toHaveValue('Ant\nBee\nCat\nDog');
});

test('exports download entries and results files', async ({ page }) => {
  await page.goto('/');
  const entries = page.getByPlaceholder('One entry per line, or use commas');
  await entries.fill('Ant\nBee');
  const txtDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export TXT' }).click();
  expect((await txtDownload).suggestedFilename()).toBe('entries.txt');

  await expect(page.getByRole('button', { name: 'Results CSV' })).toBeDisabled();
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Results CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toBe('results.csv');
});

test('large roster of 16 racers still resolves a winner', async ({ page }) => {
  await page.goto('/');
  const names = Array.from({ length: 16 }, (_, i) => `Duck ${i + 1}`).join('\n');
  await page.getByPlaceholder('One entry per line, or use commas').fill(names);
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  const shell = page.getByLabel('Real 3D duck race track');
  await expect(shell).toHaveAttribute('data-racing', 'false');
  await expect(shell).toHaveAttribute('data-winner-progress', '100');
  await expect(page.getByText('No podium yet.')).toBeHidden();
});

test('same seed repeats the same podium', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('One entry per line, or use commas').fill('A\nB\nC\nD\nE\nF');
  await page.getByRole('button', { name: 'No elimination' }).click();
  await page.getByLabel('Race seed').fill('race42');
  const status = page.getByRole('status');
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  await expect(status).toContainText('Winner');
  const first = await status.innerText();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Pick', exact: true }).click();
  await expect(status).toHaveText(first);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('layout has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Real 3D duck race track').waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
