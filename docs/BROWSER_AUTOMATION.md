# Browser Automation

## Setup

Playwright is used for browser automation. Chromium is the primary browser.

```bash
npm install playwright
npx playwright install chromium
```

## BrowserManager

The `BrowserManager` class provides:

### Launch
```typescript
const browser = new BrowserManager({ headless: true, profileName: 'my-profile' });
await browser.launch();
```

### Navigate
```typescript
await browser.navigate('https://facebook.com');
```

### Observe Page State
```typescript
const state = await browser.getCurrentState();
// state.url, state.title, state.visibleText, state.elements[]
```

### Interact
```typescript
await browser.click('button:has-text("Submit")');
await browser.fill('input[name="email"]', 'user@example.com');
await browser.selectOption('select#country', 'Pakistan');
```

### Evidence Capture
```typescript
const path = await browser.screenshot('facebook-page-created.png');
```

### Close
```typescript
await browser.close();
```

## Tool Registry Integration

Browser tools are registered via `registerBrowserTools()` and accessible through the standard tool registry:

```typescript
import { toolRegistry } from './tools/index.js';
const result = await toolRegistry.execute('browser_navigate', { url: 'https://example.com' });
```

## Persistent Sessions

Browser profiles persist login state across sessions:
- Profiles stored in `browser-profiles/<profileName>/`
- User manually logs in once, session persists
- Agent continues with authenticated session

## Platform Rules

- Never automate around CAPTCHA or security protections
- Never store credentials in code
- High-risk actions require approval (ACTION_REQUIRED)
- Screenshots are captured automatically for evidence
