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
      'browser_wait',
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
