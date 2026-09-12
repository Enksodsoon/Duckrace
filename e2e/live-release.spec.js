import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const liveQaUrl = String(process.env.LIVE_QA_URL || '').trim();
const requestedLabel = String(process.env.LIVE_QA_LABEL || 'preview').trim().toLowerCase();
const label = requestedLabel === 'production' ? 'production' : 'preview';
const evidenceRoot = path.join(process.cwd(), 'docs', 'evidence', 'live');
const screenshotPath = path.join(evidenceRoot, `${label}-results.png`);
const reportPath = path.join(evidenceRoot, `${label}-latest.json`);
const syntheticNames = ['QA Cedar', 'QA, Comma', 'QA River', 'QA Summit'];
const syntheticCsv = `entry\n${syntheticNames.map(name => `"${name.replaceAll('"', '""')}"`).join('\n')}`;

test.skip(!liveQaUrl, 'Set LIVE_QA_URL to opt in to preview or production qualification.');
test.use({ viewport: { width: 1440, height: 900 } });

function isSameOriginAsset(rawUrl, origin) {
  try {
    const url = new URL(rawUrl);
    return url.origin === origin && (
      url.pathname.startsWith('/assets/') ||
      ['/release.json', '/sw.js', '/manifest.webmanifest', '/icon.svg'].includes(url.pathname)
    );
  } catch {
    return false;
  }
}

test('synthetic release workflow preserves result, replay, and entry pool', async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000);
  const target = new URL(liveQaUrl);
  expect(['http:', 'https:']).toContain(target.protocol);
  fs.mkdirSync(evidenceRoot, { recursive: true });

  const consoleErrors = [];
  const pageErrors = [];
  const networkAssetFailures = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('requestfailed', request => {
    if (isSameOriginAsset(request.url(), target.origin)) {
      networkAssetFailures.push({
        kind: 'requestfailed',
        url: request.url(),
        error: request.failure()?.errorText || 'unknown request failure',
      });
    }
  });
  page.on('response', response => {
    if (response.status() >= 400 && isSameOriginAsset(response.url(), target.origin)) {
      networkAssetFailures.push({
        kind: 'http',
        url: response.url(),
        status: response.status(),
      });
    }
  });

  const report = {
    schemaVersion: 1,
    label,
    url: target.origin + target.pathname,
    startedAt: new Date().toISOString(),
    completedAt: null,
    browser: { name: browser.browserType().name(), version: browser.version() },
    viewport: { width: 1440, height: 900 },
    dataPolicy: 'Disposable synthetic entries only; no real people or browser data.',
    release: null,
    configuration: null,
    results: null,
    resultsCsv: null,
    replay: null,
    retainedEntries: null,
    screenshot: path.relative(process.cwd(), screenshotPath).replaceAll('\\', '/'),
    diagnostics: null,
    failure: null,
  };

  try {
    const navigation = await page.goto(target.href, { waitUntil: 'domcontentloaded' });
    expect(navigation?.ok()).toBe(true);
    expect(new URL(page.url()).origin).toBe(target.origin);
    report.url = new URL(page.url()).origin + new URL(page.url()).pathname;

    const release = await page.evaluate(async () => {
      const releaseUrl = new URL('/release.json', window.location.href);
      if (releaseUrl.origin !== window.location.origin) throw new Error('release.json must be same-origin');
      const response = await fetch(releaseUrl, { cache: 'no-store' });
      return {
        url: response.url,
        status: response.status,
        body: await response.json(),
      };
    });
    expect(release.status).toBe(200);
    expect(new URL(release.url).origin).toBe(target.origin);
    expect(release.body).toEqual(expect.objectContaining({
      assets: expect.any(String),
      shell: expect.any(String),
      commit: expect.any(String),
    }));
    report.release = release;

    await page.getByRole('main').getByRole('button', { name: 'Play Race', exact: true }).click();
    await page.getByLabel('Import entries', { exact: true }).setInputFiles({
      name: 'synthetic-live-qa.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(syntheticCsv),
    });
    await expect(page.getByLabel('Race entries', { exact: true }))
      .toHaveValue(`${syntheticNames.join('\n')}\n`);
    await page.getByLabel('Race duration', { exact: true }).selectOption('3');
    await page.getByLabel('Elimination rule', { exact: true }).selectOption('none');

    const navigationBar = page.getByRole('navigation', { name: 'Main navigation' });
    await navigationBar.getByRole('button', { name: 'Duck Garage', exact: true }).click();
    await page.getByRole('button', { name: 'Mandarin', exact: true }).click();
    await page.getByRole('button', { name: 'Bow Tie', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Mix breeds across entries' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    await navigationBar.getByRole('button', { name: 'Stages', exact: true }).click();
    await page.getByRole('button', { name: /Mountain River/ }).click();
    await page.getByRole('button', { name: 'Continue to Race', exact: true }).click();

    await page.getByRole('button', { name: 'Start Race', exact: true }).click();
    const scene = page.locator('.scene-layer');
    await expect(scene).toHaveAttribute('data-phase', 'racing', { timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Results', exact: true }))
      .toBeVisible({ timeout: 30_000 });
    await expect(scene).toHaveAttribute('data-winner-progress', '100');
    await expect(page.locator('.result-list li')).toHaveCount(4);
    const firstResults = await page.locator('.result-name').allTextContents();
    expect([...firstResults].sort()).toEqual([...syntheticNames].sort());
    await expect(page.getByText('No elimination this round', { exact: true })).toBeVisible();

    await expect.poll(() => page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('duck-race-randomizer:v3'));
      return state.history.length;
    })).toBe(1);
    const initialState = await page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')));
    const record = initialState.history[0].record;
    expect(record.participants).toHaveLength(4);
    expect(record.order).toHaveLength(4);
    expect(record.appearances.every(appearance => appearance.breed === 'mandarin')).toBe(true);
    expect(record.appearances.every(appearance => appearance.accessory === 'bow')).toBe(true);
    expect(record.stage).toBe('mountain-river');
    expect(record.durationMs).toBe(3000);
    expect(record.eliminationPlaces).toEqual([]);
    report.configuration = {
      participantCount: record.participants.length,
      breed: 'mandarin',
      accessory: 'bow',
      mixedBreeds: false,
      stage: record.stage,
      durationMs: record.durationMs,
      eliminationPlaces: record.eliminationPlaces,
    };
    report.results = firstResults;

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Results CSV', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('results.csv');
    const downloadedCsvPath = testInfo.outputPath(`${label}-results.csv`);
    await download.saveAs(downloadedCsvPath);
    const downloadedCsv = fs.readFileSync(downloadedCsvPath, 'utf8');
    expect(downloadedCsv.trim().split(/\r?\n/)).toHaveLength(5);
    expect(downloadedCsv).toContain('"rank","name"');
    expect(downloadedCsv).toContain('"QA, Comma"');
    for (const name of firstResults) expect(downloadedCsv).toContain(`"${name}"`);
    report.resultsCsv = { filename: download.suggestedFilename(), contents: downloadedCsv };

    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(scene).toHaveAttribute('data-phase', 'racing', { timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Results', exact: true }))
      .toBeVisible({ timeout: 30_000 });
    const replayResults = await page.locator('.result-name').allTextContents();
    expect(replayResults).toEqual(firstResults);
    const replayState = await page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')));
    expect(replayState.history).toEqual(initialState.history);
    expect(replayState.history[0].record.order).toEqual(record.order);
    expect(replayState.history[0].eliminatedIds).toEqual([]);
    report.replay = {
      results: replayResults,
      matchesOriginal: true,
      historyBefore: initialState.history,
      historyAfter: replayState.history,
    };

    await page.getByRole('button', { name: 'Race Again', exact: true }).click();
    const retainedEntries = await page.getByLabel('Race entries', { exact: true }).inputValue();
    expect(retainedEntries).toBe(`${syntheticNames.join('\n')}\n`);
    report.retainedEntries = syntheticNames;

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(networkAssetFailures).toEqual([]);
  } catch (error) {
    report.failure = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    throw error;
  } finally {
    report.completedAt = new Date().toISOString();
    report.diagnostics = { consoleErrors, pageErrors, networkAssetFailures };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
});
