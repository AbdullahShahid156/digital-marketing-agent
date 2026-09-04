# Approval Flow

## Overview

The ApprovalManager gates high-risk actions to prevent accidental execution.

## Risk Levels

| Risk | Auto-Approve? | Examples |
|------|--------------|----------|
| LOW | Yes | browser_observe, browser_navigate |
| MEDIUM | Yes | browser_click, browser_fill |
| HIGH | No | publish_campaign, send_outreach |
| EXTERNAL | No | launch_ad, spend_budget, post_content |

## Flow

```
Action Created
    ↓
ApprovalManager.requestApproval(action)
    ↓
┌─ LOW/MEDIUM → Auto-APPROVED → Execute
│
└─ HIGH/EXTERNAL → PENDING → User Approval Required
    ↓
    ├─ APPROVED → Execute
    └─ DENIED → Skip action, log denial
```

## Usage

```typescript
const executor = new ActionExecutor({ mode: 'LIVE_MODE' });
const approvalMgr = executor.getApprovalManager();

// Check pending approvals
const pending = approvalMgr.getPending();

// Approve
approvalMgr.approve(requestId);

// Deny
approvalMgr.deny(requestId);
```

## Integration with ActionExecutor

When `executeAction()` is called:
1. Action is submitted to ApprovalManager
2. If PENDING: returns `{ success: false, error: "ACTION_REQUIRED: ..." }`
3. If DENIED: returns `{ success: false, error: "DENIED: ..." }`
4. If APPROVED: proceeds with execution
