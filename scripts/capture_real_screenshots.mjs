import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:5173';
const OUT_DIR = path.resolve(__dirname, '../docs/images');

const pagesToCapture = [
  {
    name: 'skyguard-banner.png',
    url: `${BASE_URL}/`,
    selector: 'section.hero, .hero-content, body',
    waitMs: 3000,
  },
  {
    name: 'dashboard-overview.png',
    url: `${BASE_URL}/overview`,
    selector: 'div.overview-container, div, main',
    waitMs: 3000,
  },
  {
    name: 'station-map.png',
    url: `${BASE_URL}/network`,
    selector: 'div.leaflet-container, .maplibregl-map, main',
    waitMs: 4000,
  },
  {
    name: 'sensor-monitoring.png',
    url: `${BASE_URL}/stations`,
    selector: 'table, .station-card, main',
    waitMs: 3000,
  },
  {
    name: 'anomaly-detection.png',
    url: `${BASE_URL}/anomalies`,
    selector: 'table, .anomaly-card, main',
    waitMs: 3000,
  },
  {
    name: 'analytics-dashboard.png',
    url: `${BASE_URL}/analytics`,
    selector: '.recharts-wrapper, main',
    waitMs: 4000,
  },
];

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 }
  });

  const page = await browser.newPage();

  for (const item of pagesToCapture) {
    const targetFile = path.join(OUT_DIR, item.name);
    console.log(`Navigating to ${item.url} -> ${item.name}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, item.waitMs));
      await page.screenshot({ path: targetFile, fullPage: false });
      console.log(`✓ Saved ${item.name}`);
    } catch (err) {
      console.error(`✗ Error capturing ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing genuine application screenshots!');
}

run().catch(console.error);
