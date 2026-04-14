import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const DEFAULT_PATHS = ['/', '/stream', '/articles', '/reading'];
const HOST = 'http://127.0.0.1:8787';
const OUTPUT_DIR = join(process.cwd(), 'tmp', 'lighthouse');
const API_READY_MARKER = 'Ready on http://localhost:8788';
const WEB_READY_MARKER = 'Ready on http://localhost:8787';

function waitForReady(child, readyMarker, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for process to start: ${readyMarker}`));
    }, timeoutMs);

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes(readyMarker)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', (chunk) => process.stderr.write(chunk.toString()));
    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Preview server exited before becoming ready (code ${code ?? 'unknown'}).`));
    });
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${code ?? 'unknown'}.`));
    });
  });
}

async function run() {
  const requestedPaths = process.argv.slice(2);
  const paths = requestedPaths.length > 0 ? requestedPaths : DEFAULT_PATHS;
  const chromePath = chromium.executablePath();

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const apiPreview = spawn('npm', ['run', 'dev', '--workspace=apps/api', '--', '--port', '8788'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const preview = spawn('npm', ['run', 'preview:worker', '--workspace=apps/web'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CI: '1',
    },
  });

  const cleanup = () => {
    if (!apiPreview.killed) {
      apiPreview.kill('SIGTERM');
    }
    if (!preview.killed) {
      preview.kill('SIGTERM');
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });

  try {
    await waitForReady(apiPreview, API_READY_MARKER);
    await waitForReady(preview, WEB_READY_MARKER);

    const summary = [];

    for (const path of paths) {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const slug = normalizedPath === '/' ? 'home' : normalizedPath.slice(1).replace(/[/?=&]+/g, '-');
      const outputBase = join(OUTPUT_DIR, slug);

      await runCommand(
        'npx',
        [
          'lighthouse',
          `${HOST}${normalizedPath}`,
          '--quiet',
          '--chrome-path',
          chromePath,
          '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
          '--preset=desktop',
          '--output=json',
          '--output=html',
          `--output-path=${outputBase}`,
        ],
        { cwd: process.cwd(), env: process.env }
      );

      const report = JSON.parse(await readFile(`${outputBase}.report.json`, 'utf8'));
      const categories = report.categories;
      const audits = report.audits;

      summary.push({
        path: normalizedPath,
        performance: Math.round((categories.performance.score ?? 0) * 100),
        accessibility: Math.round((categories.accessibility.score ?? 0) * 100),
        bestPractices: Math.round((categories['best-practices'].score ?? 0) * 100),
        seo: Math.round((categories.seo.score ?? 0) * 100),
        fcp: audits['first-contentful-paint']?.displayValue ?? 'n/a',
        lcp: audits['largest-contentful-paint']?.displayValue ?? 'n/a',
        tbt: audits['total-blocking-time']?.displayValue ?? 'n/a',
        cls: audits['cumulative-layout-shift']?.displayValue ?? 'n/a',
        speedIndex: audits['speed-index']?.displayValue ?? 'n/a',
      });
    }

    console.log('\nLighthouse summary');
    console.table(summary);
    console.log(`Reports written to ${OUTPUT_DIR}`);
  } finally {
    cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
