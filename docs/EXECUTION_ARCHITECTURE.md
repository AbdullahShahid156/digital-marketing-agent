# Execution Architecture

## Overview

The agent execution layer provides a real task execution pipeline:

```
USER TASK
    ↓
AGENT REASONING
    ↓
TASK PLAN
    ↓
SELECT TOOL
    ↓
EXECUTE ACTION
    ↓
OBSERVE RESULT
    ↓
VERIFY RESULT
    ↓
CAPTURE EVIDENCE
    ↓
UPDATE STATE
    ↓
NEXT TASK
```

## Components

### BrowserManager (`src/core/browser-manager.ts`)
- Wraps Playwright for browser automation
- Supports persistent profiles via `launchPersistentContext`
- Falls back to regular `launch()` when persistent context fails
- Provides: `navigate`, `click`, `fill`, `selectOption`, `screenshot`, `getCurrentState`
- `getCurrentState()` returns URL, title, visible text, and DOM elements

### ActionExecutor (`src/core/action-executor.ts`)
- Core execution engine that orchestrates the observe→act→verify cycle
- `createAction()` creates structured action objects
- `executeAction()` runs actions through the full pipeline
- Supports DEMO_MODE and LIVE_MODE
- Tracks execution history

### VerificationEngine (`src/core/verification-engine.ts`)
- Verifies page state after actions
- Supports: `text_visible`, `text_not_visible`, `url_contains`, `url_equals`, `element_exists`, `title_contains`
- Returns structured `VerificationResult` with pass/fail

### ApprovalManager (`src/core/approval-manager.ts`)
- Gates high-risk actions (publishing campaigns, spending money)
- Auto-approves low-risk actions (observation, navigation)
- Requires manual approval for external/risky actions
- Returns `ACTION_REQUIRED` status when approval is pending

### AgentMode (`src/core/agent-mode.ts`)
- `DEMO_MODE`: Uses example.com as test page, never touches real platforms
- `LIVE_MODE`: Executes real browser workflows on target platforms

### Browser Tools (`src/tools/browser-tools.ts`)
- 10 tools registered in the tool registry:
  - `browser_navigate`, `browser_click`, `browser_fill`, `browser_select`
  - `browser_screenshot`, `browser_observe`, `browser_get_text`
  - `browser_is_visible`, `browser_wait`, `browser_upload`

## Flow Example

```
1. Create ActionExecutor in DEMO_MODE
2. Create action: createAction(taskId, 'browser_navigate', 'navigate', {url: '...'})
3. Execute: executeAction(action) → ActionResult
4. Observe: browser.getCurrentState() → BrowserPageState
5. Verify: verifyPageState([createUrlCheck('example.com')]) → VerificationResult
6. Screenshot: browser.screenshot('evidence.png') → string
7. Evidence: captureEvidence(project, requirementId, ...) → EvidenceCapture
```

## State Persistence

All state is persisted to `data/project.json` with atomic writes and backup history.
Browser profiles are stored in `browser-profiles/` (gitignored).
Evidence screenshots are stored in `evidence/q1/` and `evidence/q2/` (gitignored).
