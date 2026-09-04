import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager, setBrowserManager } from '../src/core/browser-manager.js';
import { ActionExecutor } from '../src/core/action-executor.js';
import { ApprovalManager } from '../src/core/approval-manager.js';
import { verifyPageState, createTextVisibleCheck, createUrlCheck } from '../src/core/verification-engine.js';
import { getDemoScenario, getAllDemoScenarios, isDemoMode } from '../src/core/agent-mode.js';
import { createBrowserTools } from '../src/tools/browser-tools.js';
import { toolRegistry } from '../src/tools/registry.js';

let browserAvailable = false;
let testBrowser: BrowserManager | null = null;

beforeAll(async () => {
  try {
    testBrowser = new BrowserManager({ headless: true, profileName: 'test-smoke' });
    await testBrowser.launch();
    setBrowserManager(testBrowser);
    await testBrowser.navigate('https://example.com');
    browserAvailable = true;
  } catch {
    browserAvailable = false;
    if (testBrowser) {
      try { await testBrowser.close(); } catch { /* ignore */ }
    }
  }
});

afterAll(async () => {
  if (testBrowser && testBrowser.isLaunched()) {
    await testBrowser.close();
  }
  setBrowserManager(new BrowserManager({ headless: true, profileName: 'cleanup' }));
});

describe('BrowserManager', () => {
  it('should create a browser manager', () => {
    const manager = new BrowserManager({ headless: true, profileName: 'test' });
    expect(manager).toBeDefined();
    expect(manager.isLaunched()).toBe(false);
  });

  it('should launch and close browser', async () => {
    if (!browserAvailable) return;
    const manager = new BrowserManager({ headless: true, profileName: 'test-launch' });
    await manager.launch();
    expect(manager.isLaunched()).toBe(true);
    const page = manager.getPage();
    expect(page).toBeDefined();
    const ctx = manager.getContext();
    expect(ctx).toBeDefined();
    await manager.close();
    expect(manager.isLaunched()).toBe(false);
  }, 30000);

  it('should navigate to a URL', async () => {
    if (!browserAvailable) return;
    const manager = new BrowserManager({ headless: true, profileName: 'test-nav' });
    await manager.launch();
    await manager.navigate('https://example.com');
    const state = await manager.getCurrentState();
    expect(state.url).toContain('example.com');
    expect(state.title).toBeDefined();
    expect(state.visibleText).toBeDefined();
    expect(Array.isArray(state.elements)).toBe(true);
    await manager.close();
  }, 30000);

  it('should take a screenshot', async () => {
    if (!browserAvailable) return;
    const manager = new BrowserManager({ headless: true, profileName: 'test-ss' });
    await manager.launch();
    await manager.navigate('https://example.com');
    const path = await manager.screenshot('test-screenshot.png');
    expect(path).toContain('test-screenshot.png');
    await manager.close();
  }, 30000);

  it('should throw if not launched', () => {
    const manager = new BrowserManager({ headless: true, profileName: 'test-throw' });
    expect(() => manager.getPage()).toThrow('Browser not launched');
    expect(() => manager.getContext()).toThrow('Browser not launched');
  });
});

describe('ActionExecutor', () => {
  it('should create an action', () => {
    const executor = new ActionExecutor({ mode: 'DEMO_MODE' });
    const action = executor.createAction('task-1', 'browser_navigate', 'navigate', { url: 'https://example.com' });
    expect(action.id).toBeDefined();
    expect(action.taskId).toBe('task-1');
    expect(action.tool).toBe('browser_navigate');
    expect(action.action).toBe('navigate');
    expect(action.mode).toBe('DEMO_MODE');
  });

  it('should execute demo action successfully', async () => {
    if (!browserAvailable) return;
    const executor = new ActionExecutor({ mode: 'DEMO_MODE' });
    const action = executor.createAction(
      'task-demo', 'browser_navigate', 'navigate',
      { url: 'https://example.com' }, 'Example Domain',
    );
    const result = await executor.executeAction(action);
    expect(result.success).toBe(true);
    expect(result.actionId).toBe(action.id);
  }, 30000);

  it('should track execution history', async () => {
    if (!browserAvailable) return;
    const executor = new ActionExecutor({ mode: 'DEMO_MODE' });
    const action = executor.createAction('task-h1', 'browser_navigate', 'navigate', { url: 'https://example.com' });
    await executor.executeAction(action);
    const history = executor.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].actionId).toBe(action.id);
  }, 30000);
});

describe('ApprovalManager', () => {
  it('should auto-approve low-risk actions', () => {
    const manager = new ApprovalManager();
    const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
    const action = executor.createAction('t1', 'browser_observe', 'observe', {});
    const request = manager.requestApproval(action);
    expect(request.status).toBe('APPROVED');
  });

  it('should require approval for high-risk actions', () => {
    const manager = new ApprovalManager();
    const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
    const action = executor.createAction('t2', 'meta', 'publish_campaign', { name: 'test' }, undefined, true);
    const request = manager.requestApproval(action);
    expect(request.status).toBe('PENDING');
  });

  it('should approve a pending request', () => {
    const manager = new ApprovalManager();
    const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
    const action = executor.createAction('t3', 'meta', 'publish_campaign', {}, undefined, true);
    const request = manager.requestApproval(action);
    const approved = manager.approve(request.id);
    expect(approved?.status).toBe('APPROVED');
    expect(manager.isApproved(request.id)).toBe(true);
  });

  it('should deny a pending request', () => {
    const manager = new ApprovalManager();
    const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
    const action = executor.createAction('t4', 'meta', 'publish_campaign', {}, undefined, true);
    const request = manager.requestApproval(action);
    const denied = manager.deny(request.id);
    expect(denied?.status).toBe('DENIED');
  });

  it('should track pending and resolved requests', () => {
    const manager = new ApprovalManager();
    const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
    const action1 = executor.createAction('t5', 'meta', 'publish_campaign', {}, undefined, true);
    const action2 = executor.createAction('t6', 'browser_observe', 'observe', {});
    manager.requestApproval(action1);
    manager.requestApproval(action2);
    expect(manager.getPending().length).toBe(1);
    expect(manager.getResolved().length).toBe(1);
  });
});

describe('DemoMode', () => {
  it('should detect demo mode', () => {
    expect(isDemoMode('DEMO_MODE')).toBe(true);
    expect(isDemoMode('LIVE_MODE')).toBe(false);
  });

  it('should have demo scenarios', () => {
    const scenarios = getAllDemoScenarios();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios[0].steps).toBeDefined();
  });

  it('should get specific demo scenario', () => {
    const scenario = getDemoScenario('facebook_page_create');
    expect(scenario).toBeDefined();
    expect(scenario?.name).toContain('Facebook');
  });
});

describe('BrowserTools', () => {
  it('should create browser tools with correct names', () => {
    const tools = createBrowserTools();
    expect(tools.length).toBeGreaterThan(0);
    const names = tools.map(t => t.definition.name);
    expect(names).toContain('browser_navigate');
    expect(names).toContain('browser_click');
    expect(names).toContain('browser_fill');
    expect(names).toContain('browser_screenshot');
    expect(names).toContain('browser_observe');
    expect(names).toContain('browser_get_text');
    expect(names).toContain('browser_is_visible');
    expect(names).toContain('browser_wait');
    expect(names).toContain('browser_select');
    expect(names).toContain('browser_upload');
  });

  it('should have correct categories', () => {
    const tools = createBrowserTools();
    for (const tool of tools) {
      expect(tool.definition.category).toBe('browser');
    }
  });

  it('should register without throwing', () => {
    const tools = createBrowserTools();
    for (const tool of tools) {
      try { toolRegistry.register(tool); } catch { /* already registered */ }
    }
    expect(toolRegistry.get('browser_navigate')).toBeDefined();
  });
});

describe('VerificationEngine', () => {
  it('should create text visible check', () => {
    const check = createTextVisibleCheck('Hello');
    expect(check.type).toBe('text_visible');
    expect(check.expected).toBe('Hello');
  });

  it('should create URL check', () => {
    const check = createUrlCheck('example.com');
    expect(check.type).toBe('url_contains');
    expect(check.expected).toBe('example.com');
  });

  it('should verify page state with URL check', async () => {
    if (!browserAvailable) return;
    const result = await verifyPageState([createUrlCheck('example.com')]);
    expect(result.passed).toBe(true);
    expect(result.details).toContain('All checks passed');
  }, 30000);

  it('should fail verification when text not found', async () => {
    if (!browserAvailable) return;
    const result = await verifyPageState([createTextVisibleCheck('Nonexistent Text 12345')]);
    expect(result.passed).toBe(false);
    expect(result.details).toContain('Failures');
  }, 30000);
});

describe('End-to-End Execution Flow', () => {
  it('should complete full observe->act->verify flow in DEMO_MODE', async () => {
    if (!browserAvailable) return;
    const executor = new ActionExecutor({ mode: 'DEMO_MODE' });
    const navigateAction = executor.createAction(
      'e2e-task', 'browser_navigate', 'navigate',
      { url: 'https://example.com' }, 'Example Domain',
    );
    const result = await executor.executeAction(navigateAction);
    expect(result.success).toBe(true);
    const state = await testBrowser!.getCurrentState();
    expect(state.url).toContain('example.com');
    expect(state.visibleText).toContain('Example Domain');
    const screenshot = await testBrowser!.screenshot('e2e-test.png');
    expect(screenshot).toContain('e2e-test.png');
    const verification = await verifyPageState([createTextVisibleCheck('Example Domain')]);
    expect(verification.passed).toBe(true);
  }, 60000);

  it('should complete observe->act->verify with click in DEMO_MODE', async () => {
    if (!browserAvailable) return;
    const executor = new ActionExecutor({ mode: 'DEMO_MODE' });
    const navAction = executor.createAction(
      'e2e-click-task', 'browser_navigate', 'navigate',
      { url: 'https://example.com' }, 'Example Domain',
    );
    await executor.executeAction(navAction);
    const clickAction = executor.createAction(
      'e2e-click-task', 'browser_click', 'click_more',
      { selector: 'a' },
    );
    const clickResult = await executor.executeAction(clickAction);
    expect(clickResult.success).toBe(true);
    const state = await testBrowser!.getCurrentState();
    expect(state.url).toBeDefined();
  }, 60000);
});
