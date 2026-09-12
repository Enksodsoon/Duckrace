import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const enabled = ['1', 'true', 'yes'].includes(String(process.env.PERFORMANCE_EVIDENCE || '').toLowerCase());
const evidenceRoot = path.join(process.cwd(), 'docs', 'evidence');
const screenshotRoot = path.join(evidenceRoot, 'performance');
const stages = [
  ['forest-lake', 'Forest Lake'],
  ['mountain-river', 'Mountain River'],
  ['lotus-pond', 'Lotus Pond'],
  ['sunset-marsh', 'Sunset Marsh'],
  ['village-canal', 'Village Canal'],
];
const entrants = Array.from({ length: 100 }, (_, index) => `Performance Duck ${String(index + 1).padStart(3, '0')}`).join('\n');
const evidence = {
  schemaVersion: 1,
  generatedAt: null,
  qualification: {
    desktop: 'Chromium on the measured host at a 1440x900 viewport.',
    mobile: '390x844 viewport emulation on the same desktop browser and GPU; this is not physical-mobile evidence.',
    targetsAreAssertions: false,
  },
  environment: null,
  summary: null,
  runs: [],
};

test.skip(!enabled, 'Set PERFORMANCE_EVIDENCE=1 to run the ten real-time 30-second races.');
test.describe.configure({ mode: 'serial', timeout: 12 * 60_000 });

async function installGraphicsCapture(page) {
  await page.evaluate(() => {
    const samples = [];
    let previousAt = null;
    const observer = new MutationObserver(() => {
      const scene = document.querySelector('.scene-layer');
      if (scene?.dataset.phase !== 'racing') return;
      const raw = document.documentElement.dataset.graphicsMetrics;
      if (!raw) return;
      let metrics;
      try { metrics = JSON.parse(raw); } catch { return; }
      if (metrics.duckCount !== 100 || !Number.isFinite(metrics.fps)) return;
      const capturedAt = performance.now();
      if (previousAt === null) {
        // This first interval can overlap asset readiness or countdown.
        previousAt = capturedAt;
        return;
      }
      const observedIntervalSeconds = (capturedAt - previousAt) / 1000;
      previousAt = capturedAt;
      if (!(metrics.sampleSeconds > 0) || !(metrics.sampleFrames > 0)) return;
      samples.push({
        ...metrics,
        capturedAtMs: capturedAt,
        observedIntervalSeconds,
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-graphics-metrics'],
    });
    window.__duckPerformanceCapture = { observer, samples };
  });
}

async function finishGraphicsCapture(page) {
  return page.evaluate(() => {
    const capture = window.__duckPerformanceCapture;
    capture?.observer.disconnect();
    const samples = capture?.samples || [];
    delete window.__duckPerformanceCapture;
    return samples;
  });
}

async function runStage(page, profile, stageId, stageName) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Race', exact: true }).first().click();
  await page.getByLabel('Race entries', { exact: true }).fill(entrants);
  await page.getByLabel('Race duration', { exact: true }).selectOption('30');
  await page.getByRole('button', { name: 'Stages', exact: true }).first().click();
  await page.getByRole('button', { name: new RegExp(stageName) }).click();
  await page.getByRole('button', { name: 'Continue to Race', exact: true }).click();

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('duck-race-randomizer:v3'));
    return { quality: state.settings.quality, mixedBreeds: state.settings.mixedBreeds };
  })).toEqual({ quality: 'auto', mixedBreeds: true });

  await installGraphicsCapture(page);
  await page.getByRole('button', { name: 'Start Race', exact: true }).click();
  const scene = page.locator('.scene-layer');
  await expect(scene).toHaveAttribute('data-phase', 'racing', { timeout: 180_000 });
  const racingStartedAt = Date.now();

  await page.waitForTimeout(15_000);
  await expect(scene).toHaveAttribute('data-phase', 'racing');
  await page.screenshot({
    path: path.join(screenshotRoot, `${profile.id}-${stageId}.png`),
    fullPage: false,
  });

  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible({ timeout: 120_000 });
  const racingWallSeconds = (Date.now() - racingStartedAt) / 1000;
  await expect(scene).toHaveAttribute('data-winner-progress', '100');
  await expect(page.locator('.result-list li')).toHaveCount(100);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history.length)).toBeGreaterThan(0);

  const [samples, record] = await Promise.all([
    finishGraphicsCapture(page),
    page.evaluate(() => JSON.parse(localStorage.getItem('duck-race-randomizer:v3')).history[0].record),
  ]);
  expect(record.participants).toHaveLength(100);
  expect(record.order).toHaveLength(100);
  expect(record.appearances).toHaveLength(100);
  expect(new Set(record.appearances.map(appearance => appearance.breed)).size).toBe(5);
  expect(record.durationMs).toBe(30_000);
  expect(record.stage).toBe(stageId);
  expect(samples.length).toBeGreaterThanOrEqual(8);

  const sampleSeconds = samples.reduce((sum, sample) => sum + sample.sampleSeconds, 0);
  const sampleFrames = samples.reduce((sum, sample) => sum + sample.sampleFrames, 0);
  evidence.runs.push({
    profile: profile.id,
    viewport: profile.viewport,
    physicalMobile: false,
    stage: { id: stageId, name: stageName },
    configuredDurationSeconds: 30,
    entrantCount: record.participants.length,
    breedCount: new Set(record.appearances.map(appearance => appearance.breed)).size,
    graphicsSetting: 'auto',
    renderedQualities: [...new Set(samples.map(sample => sample.quality))],
    gpu: samples.find(sample => sample.gpu)?.gpu || 'unavailable',
    racingWallSeconds,
    sampleSeconds,
    sampleFrames,
    weightedFps: sampleFrames / sampleSeconds,
    minFps: Math.min(...samples.map(sample => sample.fps)),
    samples,
    screenshot: path.relative(process.cwd(), path.join(screenshotRoot, `${profile.id}-${stageId}.png`)).replaceAll('\\', '/'),
  });
}

for (const profile of [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'mobile-viewport', viewport: { width: 390, height: 844 } },
]) {
  test(`${profile.id}: 100 entrants across all five stages`, async ({ page, browser }) => {
    fs.mkdirSync(screenshotRoot, { recursive: true });
    await page.setViewportSize(profile.viewport);
    if (!evidence.environment) {
      const cpus = os.cpus();
      evidence.environment = {
        browser: { name: 'chromium', version: browser.version() },
        node: process.version,
        platform: process.platform,
        os: { platform: os.platform(), release: os.release(), arch: os.arch() },
        cpu: { model: cpus[0]?.model || 'unavailable', logicalCount: cpus.length },
        ramBytes: os.totalmem(),
      };
    }
    for (const [stageId, stageName] of stages) {
      await test.step(`${stageName} real-time race`, () => runStage(page, profile, stageId, stageName));
    }
  });
}

test.afterAll(() => {
  if (!enabled) return;
  const sampleSeconds = evidence.runs.reduce((sum, run) => sum + run.sampleSeconds, 0);
  const sampleFrames = evidence.runs.reduce((sum, run) => sum + run.sampleFrames, 0);
  evidence.generatedAt = new Date().toISOString();
  evidence.summary = {
    runCount: evidence.runs.length,
    sampleSeconds,
    sampleFrames,
    weightedFps: sampleSeconds ? sampleFrames / sampleSeconds : null,
    minFps: evidence.runs.length ? Math.min(...evidence.runs.map(run => run.minFps)) : null,
    gpu: [...new Set(evidence.runs.map(run => run.gpu))],
  };
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(path.join(evidenceRoot, 'performance-latest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
});
