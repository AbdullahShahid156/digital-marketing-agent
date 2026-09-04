import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';
import type { BrowserPageState, BrowserElement } from '../types/index.js';

const PROFILES_DIR = join(process.cwd(), 'browser-profiles');
const EVIDENCE_DIR = join(process.cwd(), 'evidence');

export interface BrowserManagerOptions {
  headless?: boolean;
  profileName?: string;
  slowMo?: number;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private profileName: string;
  private headless: boolean;
  private slowMo: number;

  constructor(options: BrowserManagerOptions = {}) {
    this.profileName = options.profileName || 'default';
    this.headless = options.headless ?? false;
    this.slowMo = options.slowMo ?? 0;
  }

  async launch(): Promise<void> {
    if (this.browser) return;

    try {
      this.context = await chromium.launchPersistentContext(
        join(PROFILES_DIR, this.profileName),
        {
          headless: this.headless,
          slowMo: this.slowMo,
          viewport: { width: 1280, height: 720 },
          locale: 'en-US',
          timezoneId: 'Asia/Karachi',
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
      );
    } catch {
      logger.warn('BrowserManager', 'Persistent context failed, falling back to regular launch');
      const browser = await chromium.launch({
        headless: this.headless,
        slowMo: this.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });
      this.context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'Asia/Karachi',
      });
      this.browser = browser;
    }

    this.page = this.context.pages()[0] || await this.context.newPage();
    if (!this.browser) this.browser = this.context.browser();
    logger.info('BrowserManager', `Browser launched (profile: ${this.profileName})`);
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    this.context = null;
    this.page = null;
    this.browser = null;
    logger.info('BrowserManager', 'Browser closed');
  }

  getPage(): Page {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return this.page;
  }

  getContext(): BrowserContext {
    if (!this.context) throw new Error('Browser not launched. Call launch() first.');
    return this.context;
  }

  isLaunched(): boolean {
    return this.page !== null;
  }

  async navigate(url: string): Promise<void> {
    const page = this.getPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    logger.info('BrowserManager', `Navigated to: ${url}`);
  }

  async getCurrentState(): Promise<BrowserPageState> {
    const page = this.getPage();
    const url = page.url();
    const title = await page.title();
    const visibleText = await page.evaluate(() => document.body?.innerText || '');

    const elementHandles = await page.$$('body *');
    const elements: BrowserElement[] = [];
    for (const el of elementHandles) {
      try {
        const info = await el.evaluate((e) => {
          const id = e.id ? `#${e.id}` : '';
          const cls = e.className ? `.${String(e.className).split(' ').filter(Boolean).join('.')}` : '';
          const selector = `${e.tagName.toLowerCase()}${id}${cls}`;
          const attrs: Record<string, string> = {};
          const namedAttrs = e.attributes as unknown as Array<{ name: string; value: string }>;
          for (const attr of namedAttrs) {
            attrs[attr.name] = attr.value;
          }
          return {
            selector,
            text: (e as HTMLElement).innerText?.slice(0, 200) || '',
            tag: e.tagName.toLowerCase(),
            attributes: attrs,
          };
        });
        const visible = await el.isVisible();
        elements.push({ ...info, visible });
      } catch {
        // skip elements that are detached
      }
    }

    return { url, title, visibleText: visibleText.slice(0, 5000), elements: elements.slice(0, 200) };
  }

  async screenshot(filename: string): Promise<string> {
    const dir = join(EVIDENCE_DIR, 'q1');
    const dir2 = join(EVIDENCE_DIR, 'q2');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(dir2)) mkdirSync(dir2, { recursive: true });

    const path = join(EVIDENCE_DIR, filename);
    const page = this.getPage();
    await page.screenshot({ path, fullPage: true });
    logger.info('BrowserManager', `Screenshot saved: ${path}`);
    return path;
  }

  async click(selector: string): Promise<void> {
    const page = this.getPage();
    await page.click(selector, { timeout: 10000 });
    logger.info('BrowserManager', `Clicked: ${selector}`);
  }

  async fill(selector: string, value: string): Promise<void> {
    const page = this.getPage();
    await page.fill(selector, value, { timeout: 10000 });
    logger.info('BrowserManager', `Filled: ${selector}`);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    const page = this.getPage();
    await page.selectOption(selector, value, { timeout: 10000 });
    logger.info('BrowserManager', `Selected: ${selector} = ${value}`);
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    const page = this.getPage();
    await page.waitForSelector(selector, { timeout: timeout || 10000 });
  }

  async getTextContent(selector: string): Promise<string | null> {
    const page = this.getPage();
    return page.textContent(selector);
  }

  async isVisible(selector: string): Promise<boolean> {
    const page = this.getPage();
    return page.isVisible(selector);
  }

  async waitForNavigation(timeout?: number): Promise<void> {
    const page = this.getPage();
    await page.waitForLoadState('domcontentloaded', { timeout: timeout || 15000 });
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    const page = this.getPage();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click(selector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  async getPageContent(): Promise<string> {
    const page = this.getPage();
    return page.content();
  }
}

let globalManager: BrowserManager | null = null;

export function getBrowserManager(options?: BrowserManagerOptions): BrowserManager {
  if (!globalManager || !globalManager.isLaunched()) {
    globalManager = new BrowserManager(options);
  }
  return globalManager;
}

export function setBrowserManager(manager: BrowserManager): void {
  globalManager = manager;
}
