import { getBrowserManager } from '../core/browser-manager.js';
import { createTool, toolRegistry, type Tool } from './registry.js';
import { logger } from '../core/logger.js';

export function createBrowserTools(): Tool[] {
  return [
    createTool(
      'browser_navigate',
      'Navigate to a URL in the browser',
      'browser',
      [
        { name: 'url', type: 'string', description: 'URL to navigate to', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.navigate(params.url as string);
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_click',
      'Click an element on the page',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the element', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.click(params.selector as string);
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_fill',
      'Fill a form field with text',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the input', required: true },
        { name: 'value', type: 'string', description: 'Text to fill', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.fill(params.selector as string, params.value as string);
        return { success: true, data: { filled: true }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_select',
      'Select an option from a dropdown',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the select element', required: true },
        { name: 'value', type: 'string', description: 'Option value to select', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.selectOption(params.selector as string, params.value as string);
        return { success: true, data: { selected: true }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_screenshot',
      'Take a screenshot of the current page',
      'browser',
      [
        { name: 'filename', type: 'string', description: 'Filename for the screenshot', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        const path = await browser.screenshot(params.filename as string);
        return { success: true, data: { screenshotPath: path }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_observe',
      'Observe the current page state (URL, title, visible text, elements)',
      'browser',
      [],
      async () => {
        const browser = getBrowserManager();
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_get_text',
      'Get text content of an element',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the element', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        const text = await browser.getTextContent(params.selector as string);
        return { success: true, data: { text }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_is_visible',
      'Check if an element is visible',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the element', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        const visible = await browser.isVisible(params.selector as string);
        return { success: true, data: { visible }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_wait_navigation',
      'Wait for navigation to complete',
      'browser',
      [],
      async () => {
        const browser = getBrowserManager();
        await browser.waitForNavigation();
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_upload',
      'Upload a file to a file input',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the file input', required: true },
        { name: 'filePath', type: 'string', description: 'Path to the file to upload', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.uploadFile(params.selector as string, params.filePath as string);
        return { success: true, data: { uploaded: true }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_scroll',
      'Scroll to an element or scroll down one viewport',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector to scroll to (optional, scrolls down if omitted)', required: false },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.scroll(params.selector as string | undefined);
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_hover',
      'Hover over an element on the page',
      'browser',
      [
        { name: 'selector', type: 'string', description: 'CSS selector for the element', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.hover(params.selector as string);
        const state = await browser.getCurrentState();
        return { success: true, data: state, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_press_key',
      'Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.)',
      'browser',
      [
        { name: 'key', type: 'string', description: 'Key to press (e.g., Enter, Tab, Escape, ArrowDown)', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.pressKey(params.key as string);
        return { success: true, data: { key: params.key }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_evaluate',
      'Execute JavaScript on the page and return the result',
      'browser',
      [
        { name: 'expression', type: 'string', description: 'JavaScript expression to evaluate', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        const result = await browser.evaluate(params.expression as string);
        return { success: true, data: { result }, timestamp: new Date() };
      }
    ),

    createTool(
      'browser_wait',
      'Wait for a specified time in milliseconds',
      'browser',
      [
        { name: 'ms', type: 'number', description: 'Milliseconds to wait', required: true },
      ],
      async (params) => {
        const browser = getBrowserManager();
        await browser.waitForTimeout(params.ms as number);
        return { success: true, data: { waited: params.ms }, timestamp: new Date() };
      }
    ),
  ];
}

export function registerBrowserTools(): void {
  const tools = createBrowserTools();
  for (const tool of tools) {
    try {
      toolRegistry.register(tool);
    } catch {
      // already registered
    }
  }
  logger.info('BrowserTools', `Registered ${tools.length} browser tools`);
}
