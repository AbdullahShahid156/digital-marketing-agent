import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';
import { getConfig, type AgentConfig } from './config.js';
import type { BrowserPageState, BrowserElement } from '../types/index.js';

const PROFILES_DIR = join(process.cwd(), 'browser-profiles');
const EVIDENCE_DIR = join(process.cwd(), 'evidence');

export interface BrowserManagerOptions {
  headless?: boolean;
  profileName?: string;
  slowMo?: number;
  maxRetries?: number;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private pages: Map<string, Page> = new Map();
  private profileName: string;
  private headless: boolean;
  private slowMo: number;
  private config: AgentConfig;
  private maxRetries: number;
  private retryCount: number = 0;
  private lastActivity: Date = new Date();

  constructor(options: BrowserManagerOptions = {}) {
    this.config = getConfig();
    this.profileName = options.profileName || this.config.browser.profileName;
    this.headless = options.headless ?? this.config.browser.headless;
    this.slowMo = options.slowMo ?? this.config.browser.slowMo;
    this.maxRetries = options.maxRetries ?? 3;
  }

  async launch(): Promise<void> {
    if (this.browser?.isConnected()) return;

    try {
      this.context = await chromium.launchPersistentContext(
        join(PROFILES_DIR, this.profileName),
        {
          headless: this.headless,
          slowMo: this.slowMo,
          viewport: this.config.browser.viewport,
          locale: this.config.browser.locale,
          timezoneId: this.config.browser.timezone,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-accelerated-2d-canvas',
            '--disable-accelerated-video-decode',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
          ],
        },
      );
    } catch (err) {
      logger.warn('BrowserManager', `Persistent context failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      logger.warn('BrowserManager', 'Falling back to regular launch');
      const browser = await chromium.launch({
        headless: this.headless,
        slowMo: this.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-video-decode',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
        ],
      });
      this.context = await browser.newContext({
        viewport: this.config.browser.viewport,
        locale: this.config.browser.locale,
        timezoneId: this.config.browser.timezone,
      });
      this.browser = browser;
    }

    this.page = this.context.pages()[0] || await this.context.newPage();
    if (!this.browser) this.browser = this.context.browser();

    // Track the main page
    this.pages.set('main', this.page);
    this.retryCount = 0;
    this.lastActivity = new Date();

    logger.info('BrowserManager', `Browser launched (profile: ${this.profileName})`);
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
    } catch (err) {
      logger.warn('BrowserManager', `Error closing context: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    this.context = null;
    this.page = null;
    this.browser = null;
    this.pages.clear();
    logger.info('BrowserManager', 'Browser closed');
  }

  async reconnect(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      throw new Error(`Browser reconnection failed after ${this.maxRetries} attempts`);
    }

    this.retryCount++;
    logger.warn('BrowserManager', `Attempting reconnection (attempt ${this.retryCount}/${this.maxRetries})`);

    await this.close();
    await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
    await this.launch();
  }

  isHealthy(): boolean {
    if (!this.browser || !this.page) return false;
    try {
      return this.browser.isConnected();
    } catch {
      return false;
    }
  }

  getLastActivity(): Date {
    return this.lastActivity;
  }

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  async ensureHealthy(): Promise<void> {
    if (!this.isHealthy()) {
      logger.warn('BrowserManager', 'Browser is not healthy, attempting reconnection');
      await this.reconnect();
    }
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
    return this.page !== null && this.browser?.isConnected() === true;
  }

  // Multi-page support
  async newPage(name: string): Promise<Page> {
    if (!this.context) throw new Error('Browser not launched. Call launch() first.');
    const page = await this.context.newPage();
    this.pages.set(name, page);
    logger.info('BrowserManager', `Created new page: ${name}`);
    return page;
  }

  async switchToPage(name: string): Promise<void> {
    const page = this.pages.get(name);
    if (!page) throw new Error(`Page "${name}" not found`);
    this.page = page;
    this.updateActivity();
    logger.info('BrowserManager', `Switched to page: ${name}`);
  }

  async closePage(name: string): Promise<void> {
    const page = this.pages.get(name);
    if (page && page !== this.page) {
      await page.close();
      this.pages.delete(name);
      logger.info('BrowserManager', `Closed page: ${name}`);
    }
  }

  getPageNames(): string[] {
    return Array.from(this.pages.keys());
  }

  async navigate(url: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.browser.timeout });
    this.updateActivity();
    logger.info('BrowserManager', `Navigated to: ${url}`);
  }

  async getCurrentState(): Promise<BrowserPageState> {
    await this.ensureHealthy();
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

    this.updateActivity();
    return { url, title, visibleText: visibleText.slice(0, 5000), elements: elements.slice(0, 200) };
  }

  async screenshot(filename: string): Promise<string> {
    await this.ensureHealthy();
    const dir = join(EVIDENCE_DIR, 'q1');
    const dir2 = join(EVIDENCE_DIR, 'q2');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(dir2)) mkdirSync(dir2, { recursive: true });

    let saveDir = EVIDENCE_DIR;
    if (filename.startsWith('q2-') || filename.startsWith('Q2-')) {
      saveDir = dir2;
    } else if (filename.startsWith('q1-') || filename.startsWith('Q1-')) {
      saveDir = dir;
    }

    const path = join(saveDir, filename);
    const page = this.getPage();
    await page.screenshot({ path, fullPage: true });
    this.updateActivity();
    logger.info('BrowserManager', `Screenshot saved: ${path}`);
    return path;
  }

  async click(selector: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.click(selector, { timeout: this.config.browser.timeout });
    this.updateActivity();
    logger.info('BrowserManager', `Clicked: ${selector}`);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.fill(selector, value, { timeout: this.config.browser.timeout });
    this.updateActivity();
    logger.info('BrowserManager', `Filled: ${selector}`);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.selectOption(selector, value, { timeout: this.config.browser.timeout });
    this.updateActivity();
    logger.info('BrowserManager', `Selected: ${selector} = ${value}`);
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.waitForSelector(selector, { timeout: timeout || this.config.browser.timeout });
    this.updateActivity();
  }

  async getTextContent(selector: string): Promise<string | null> {
    await this.ensureHealthy();
    const page = this.getPage();
    this.updateActivity();
    return page.textContent(selector);
  }

  async isVisible(selector: string): Promise<boolean> {
    await this.ensureHealthy();
    const page = this.getPage();
    this.updateActivity();
    return page.isVisible(selector);
  }

  async waitForNavigation(timeout?: number): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.waitForLoadState('domcontentloaded', { timeout: timeout || 15000 });
    this.updateActivity();
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click(selector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    this.updateActivity();
  }

  async getPageContent(): Promise<string> {
    await this.ensureHealthy();
    const page = this.getPage();
    this.updateActivity();
    return page.content();
  }

  async scroll(selector?: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    if (selector) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      logger.info('BrowserManager', `Scrolled to: ${selector}`);
    } else {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      logger.info('BrowserManager', 'Scrolled down one viewport');
    }
    this.updateActivity();
  }

  async hover(selector: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.hover(selector, { timeout: 10000 });
    this.updateActivity();
    logger.info('BrowserManager', `Hovered: ${selector}`);
  }

  async pressKey(key: string): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.keyboard.press(key);
    this.updateActivity();
    logger.info('BrowserManager', `Key pressed: ${key}`);
  }

  async evaluate(expression: string): Promise<unknown> {
    await this.ensureHealthy();
    const page = this.getPage();
    const result = await page.evaluate(expression);
    this.updateActivity();
    logger.info('BrowserManager', `Evaluated expression`);
    return result;
  }

  async waitForTimeout(ms: number): Promise<void> {
    await this.ensureHealthy();
    const page = this.getPage();
    await page.waitForTimeout(ms);
    logger.debug('BrowserManager', `Waited ${ms}ms`);
  }
}

let globalManager: BrowserManager | null = null;

export function getBrowserManager(options?: BrowserManagerOptions): BrowserManager {
  if (!globalManager || !globalManager.isLaunched()) {
    globalManager = new BrowserManager(options);
  } else if (options) {
    logger.debug('BrowserManager', 'Browser already launched, ignoring new options');
  }
  return globalManager;
}

export function setBrowserManager(manager: BrowserManager): void {
  globalManager = manager;
}
