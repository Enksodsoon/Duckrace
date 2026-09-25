import { test, expect } from '@playwright/test';

async function openSetup(page) {
  await page.goto('/');
  await page.locator('.home-menu').getByRole('button', { name: 'Play Race', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();
}

test.describe('Exhaustive UI Button & Service Journey Audit', () => {
  test('exercises every navigation link, home menu buttons, and drawer', async ({ page }) => {
    await page.goto('/');

    // Home screen buttons
    await expect(page.getByRole('heading', { name: 'Duck Race' })).toBeVisible();
    await page.locator('.home-menu').getByRole('button', { name: 'Play Race', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();

    // Brand logo navigates to home
    await page.getByRole('button', { name: 'Duck Race', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Duck Race' })).toBeVisible();

    // Home button: Duck Garage
    await page.locator('.home-menu').getByRole('button', { name: 'Duck Garage', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Duck Garage' })).toBeVisible();

    // Top navigation menu
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Stages', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select Stage' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Results', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Mobile menu toggle button (resize to mobile viewport so hamburger becomes visible)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(page.locator('.nav.open')).toBeVisible();
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    await expect(page.locator('.nav.open')).not.toBeVisible();
  });

  test('exercises all Setup Screen buttons, number generator, presets, and seed tools', async ({ page }) => {
    await openSetup(page);

    // Advanced options disclosure
    await page.getByText('Advanced options', { exact: true }).click();

    // Test Clear button
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByLabel('Race entries')).toHaveValue('');

    // Test Number Generator
    await page.getByLabel('Number start').fill('101');
    await page.getByLabel('Number end').fill('105');
    await page.getByLabel('Number prefix').fill('Quack ');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByLabel('Race entries')).toHaveValue('Quack 101\nQuack 102\nQuack 103\nQuack 104\nQuack 105');

    // Test Sample button
    await page.getByRole('button', { name: 'Sample', exact: true }).click();
    await expect(page.getByLabel('Race entries')).toContainText('Group 1');

    // Test Randomize Seed button
    const seedInput = page.getByLabel('Race seed');
    await seedInput.fill('');
    await page.getByRole('button', { name: 'Randomize seed', exact: true }).click();
    const generatedSeed = await seedInput.inputValue();
    expect(generatedSeed.length).toBeGreaterThan(0);

    // Test Elimination Quick Buttons
    await page.getByRole('button', { name: 'No elimination', exact: true }).click();
    const chips = page.locator('.place-chips input[type="checkbox"]');
    for (const chip of await chips.all()) {
      await expect(chip).not.toBeChecked();
    }
    await page.getByRole('button', { name: 'Eliminate 1st only', exact: true }).click();
    await expect(chips.first()).toBeChecked();

    // Test Toggles
    const dedupeToggle = page.getByRole('switch', { name: 'Remove duplicates' });
    await dedupeToggle.uncheck();
    await expect(dedupeToggle).not.toBeChecked();
    await dedupeToggle.check();
    await expect(dedupeToggle).toBeChecked();

    const shuffleToggle = page.getByRole('switch', { name: 'Shuffle presentation' });
    await shuffleToggle.uncheck();
    await expect(shuffleToggle).not.toBeChecked();
    await shuffleToggle.check();
    await expect(shuffleToggle).toBeChecked();

    // Test Stage dock navigation
    await page.getByRole('button', { name: 'Change Stage', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select Stage' })).toBeVisible();
  });

  test('exercises all Duck Garage breeds, accessories, and toggles', async ({ page }) => {
    await page.goto('/');
    await page.locator('.home-menu').getByRole('button', { name: 'Duck Garage', exact: true }).click();

    // Click every breed
    const breeds = ['Mallard', 'White Pekin', 'Khaki Campbell', 'Mandarin', 'Runner'];
    for (const breed of breeds) {
      await page.getByRole('button', { name: breed, exact: true }).click();
      await expect(page.locator('.garage-preview-label h2')).toHaveText(breed);
    }

    // Click every accessory
    const accessories = ['None', 'Explorer Hat', 'Aviator Glasses', 'Bow Tie', 'Race Medal', 'Luck Charm', 'Duck Badge'];
    for (const acc of accessories) {
      const accBtn = page.locator('.accessory-grid button', { hasText: acc });
      await accBtn.click();
      await expect(accBtn).toHaveAttribute('aria-pressed', 'true');
    }

    // Toggles
    const mixBreeds = page.getByRole('switch', { name: 'Mix breeds across entries' });
    await mixBreeds.uncheck();
    await expect(mixBreeds).not.toBeChecked();
    await mixBreeds.check();
    await expect(mixBreeds).toBeChecked();

    const rotateLooks = page.getByRole('switch', { name: 'Rotate looks each round' });
    await rotateLooks.check();
    await expect(rotateLooks).toBeChecked();

    // Done button returns to setup
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();
  });

  test('exercises all Stages selection cards and return button', async ({ page }) => {
    await page.goto('/');
    await page.locator('.home-menu').getByRole('button', { name: 'Stages', exact: true }).click();

    const stageNames = ['Forest Lake', 'Mountain River', 'Lotus Pond', 'Sunset Marsh', 'Village Canal'];
    for (const name of stageNames) {
      const card = page.locator('.stage-card', { hasText: name });
      await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
    }

    // Continue to Race button
    await page.getByRole('button', { name: 'Continue to Race', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();
  });

  test('exercises Settings tabs, audio testing, audience links, and storage reset flow', async ({ page }) => {
    await page.goto('/');
    await page.locator('.home-menu').getByRole('button', { name: 'Settings', exact: true }).click();

    // Tab navigation
    const tabs = ['graphics', 'audio', 'race', 'about'];
    for (const tab of tabs) {
      await page.locator(`#settings-tab-${tab}`).click();
      await expect(page.locator(`#settings-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
    }

    // Audio tab: test sound button
    await page.locator('#settings-tab-audio').click();
    await page.getByRole('button', { name: 'Test sound', exact: true }).click();

    // Race tab: audience mode button & link copy
    await page.locator('#settings-tab-race').click();
    await page.getByRole('button', { name: 'Copy share link', exact: true }).click();
    await expect(page.locator('.notice')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss notice' }).click();

    // About tab: storage reset cancellation & execution
    await page.locator('#settings-tab-about').click();
    await page.getByRole('button', { name: 'Clear saved browser data', exact: true }).click();
    await expect(page.getByText('Clear entries, settings, and race history in this browser?')).toBeVisible();
    await page.getByRole('button', { name: 'Keep session', exact: true }).click();
    await expect(page.getByText('Clear entries, settings, and race history in this browser?')).not.toBeVisible();

    await page.getByRole('button', { name: 'Clear saved browser data', exact: true }).click();
    await page.getByRole('button', { name: 'Clear saved session', exact: true }).click();
    await expect(page.locator('.notice')).toContainText('Saved session cleared');

    // Done button returns to home
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Duck Race' })).toBeVisible();
  });

  test('exercises live race toolbar controls: sound toggle, camera switch, and cancellation', async ({ page }) => {
    await openSetup(page);
    await page.getByLabel('Race duration').selectOption('30');
    await page.getByRole('button', { name: 'Start Race', exact: true }).click();

    // Toolbar sound toggle button
    const soundButton = page.getByRole('button', { name: /Sound on|Sound off/ });
    await expect(soundButton).toBeVisible({ timeout: 20000 });
    const initialText = await soundButton.textContent();
    await soundButton.click();
    const toggledText = await soundButton.textContent();
    expect(toggledText).not.toBe(initialText);

    // Camera switch
    const cameraSelect = page.getByLabel('Race camera', { exact: true });
    await cameraSelect.selectOption('overview');
    await expect(cameraSelect).toHaveValue('overview');

    // Cancel race returns to setup
    await page.getByRole('button', { name: 'Cancel race', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();
  });

  test('exercises Results screen: replay, undo elimination, and export downloads', async ({ page }) => {
    await openSetup(page);
    await page.getByLabel('Race entries').fill('Ace\nBravo\nCharlie');
    await page.getByLabel('Elimination rule').selectOption('first');
    await page.getByRole('button', { name: 'Instant Pick', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible();

    // Export CSV
    const csvPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Results CSV', exact: true }).click();
    const csvDownload = await csvPromise;
    expect(csvDownload.suggestedFilename()).toBe('results.csv');

    // Export XLS
    const xlsPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Results XLS', exact: true }).click();
    const xlsDownload = await xlsPromise;
    expect(xlsDownload.suggestedFilename()).toBe('results.xls');

    // Undo Elimination button
    await expect(page.getByRole('button', { name: 'Undo Elimination', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Undo Elimination', exact: true }).click();
    await expect(page.locator('.notice')).toContainText('Elimination undone');

    // Replay button
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(page.getByLabel('Live race')).toBeVisible({ timeout: 15000 });
    const cancelOrExit = page.getByRole('button', { name: /Cancel race|Exit/ });
    await expect(cancelOrExit).toBeVisible();
    await cancelOrExit.click();
    await expect(page.getByRole('heading', { name: 'Race Setup' })).toBeVisible();
  });
});
