import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Race', exact: true }).first().click();
}

test('importing multiline TXT file preserves commas within entry names', async ({ page }) => {
  await setup(page);
  const textBuffer = Buffer.from('Smith, Jane\r\nDoe, John\r\nSimpleDuck');
  await page.getByLabel('Import entries', { exact: true }).setInputFiles({
    name: 'entries.txt',
    mimeType: 'text/plain',
    buffer: textBuffer,
  });
  await expect(page.getByLabel('Race entries')).toHaveValue('Smith, Jane\nDoe, John\nSimpleDuck\n');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(3);
  const names = await page.locator('.result-name').allTextContents();
  expect(names).toContain('Smith, Jane');
  expect(names).toContain('Doe, John');
  expect(names).toContain('SimpleDuck');
});

test('follow dropdown stays synchronized when clicking a duck in the live standings', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Race entries').fill('Alpha Duck\nBeta Duck\nGamma Duck');
  await page.getByLabel('Race duration').selectOption('30');
  await page.getByRole('button', { name: 'Start Race', exact: true }).click();

  // Wait for live standings to appear
  const betaButton = page.locator('.leaderboard li button', { hasText: 'Beta Duck' });
  await expect(betaButton).toBeVisible({ timeout: 25000 });
  await betaButton.click();

  // Camera mode select should switch to 'follow'
  const cameraSelect = page.getByLabel('Race camera', { exact: true });
  await expect(cameraSelect).toHaveValue('follow');

  // The follow select dropdown must now reflect the selected duck's ID
  const followSelect = page.getByLabel('Follow participant', { exact: true });
  const selectedOptionText = await followSelect.evaluate(
    (el) => el.options[el.selectedIndex]?.text
  );
  expect(selectedOptionText).toContain('Beta Duck');
});

test('elimination finishing places remain sorted in ascending order', async ({ page }) => {
  await setup(page);
  await page.getByText('Advanced options', { exact: true }).click();
  // Check 3rd place then 1st place
  const thirdCheck = page.locator('.place-chips label', { hasText: '3rd' }).locator('input');
  const firstCheck = page.locator('.place-chips label', { hasText: '1st' }).locator('input');
  await thirdCheck.check();
  await firstCheck.check();

  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();

  // The elimination note on ResultsScreen must show places in ascending order (1st, 3rd)
  const note = page.locator('.result-note');
  await expect(note).toContainText('Elimination places: 1st, 3rd');
});

test('importing exported results.csv extracts duck names instead of ranks', async ({ page }) => {
  await setup(page);
  const csvBuffer = Buffer.from('"rank","name"\r\n"1","Mallard Ace"\r\n"2","Pekin Swift"\r\n');
  await page.getByLabel('Import entries', { exact: true }).setInputFiles({
    name: 'results.csv',
    mimeType: 'text/csv',
    buffer: csvBuffer,
  });
  await expect(page.getByLabel('Race entries')).toHaveValue('Mallard Ace\nPekin Swift\n');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  const names = await page.locator('.result-name').allTextContents();
  expect(names).toContain('Mallard Ace');
  expect(names).toContain('Pekin Swift');
});

test('elimination place chips remain configurable when entries list is empty', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Race entries').fill('');
  await page.getByText('Advanced options', { exact: true }).click();
  const chips = page.locator('.place-chips label');
  await expect(chips).toHaveCount(3);
  await chips.filter({ hasText: '2nd' }).locator('input').check();
  await expect(chips.filter({ hasText: '2nd' }).locator('input')).toBeChecked();
});

test('shuffle entries and duplicate badge work properly in setup screen', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Race entries').fill('Duck A\nDuck B\nDuck A\nDuck C');
  await expect(page.locator('.duplicate-count-badge')).toBeVisible();
  await expect(page.locator('.duplicate-count-badge')).toHaveText('1 duplicates removed');

  await page.getByText('Advanced options', { exact: true }).click();
  await page.getByRole('button', { name: 'Shuffle Entries' }).click();
  const shuffledText = await page.getByLabel('Race entries').inputValue();
  expect(shuffledText).toContain('Duck A');
  expect(shuffledText).toContain('Duck B');
  expect(shuffledText).toContain('Duck C');
});

test('pause and resume controls toggle race state and resume seamlessly', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Race entries').fill('Racer 1\nRacer 2\nRacer 3');
  await page.getByLabel('Race duration').selectOption('30');
  await page.getByRole('button', { name: 'Start Race', exact: true }).click();

  // Wait for countdown to start and Pause button to be available
  const pauseBtn = page.getByRole('button', { name: 'Pause', exact: true });
  await expect(pauseBtn).toBeVisible({ timeout: 40000 });

  // Click Pause
  await pauseBtn.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Race Paused');

  // Resume via button
  await page.getByRole('button', { name: 'Resume Race', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();

  // Test spacebar pause
  await page.keyboard.press('Space');
  await expect(page.getByRole('alert')).toBeVisible();

  // Test spacebar resume
  await page.keyboard.press('Space');
  await expect(page.getByRole('alert')).not.toBeVisible();

  // Cancel or exit race to cleanly return
  const exitButton = page.getByRole('button', { name: /Cancel race|Exit/ });
  if (await exitButton.isVisible()) {
    await exitButton.click();
    await expect(page.getByRole('heading', { name: /Race Setup|Results/ })).toBeVisible();
  }
});

test('copy results button writes formatted text to clipboard or feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await setup(page);
  await page.getByLabel('Race entries').fill('Winner Duck\nSecond Duck');
  await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  const copyBtn = page.getByRole('button', { name: 'Copy Results', exact: true });
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(page.locator('.notice')).toBeVisible();
});


