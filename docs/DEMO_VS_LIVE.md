# DEMO_MODE vs LIVE_MODE

## DEMO_MODE

- Uses `https://example.com` as a controlled test page
- Simulates Facebook/LinkedIn workflows on example.com
- Never touches real Facebook or LinkedIn
- Never publishes, sends, or spends money
- Safe for development and testing
- Screenshots are real but from example.com

### When to Use
- Development and testing
- Verifying the execution pipeline works
- Demonstrating the agent architecture

## LIVE_MODE

- Executes real browser workflows on target platforms
- Requires user to be logged in (persistent browser profile)
- Takes real screenshots from Facebook/LinkedIn
- Can perform real actions (with approval gates)

### When to Use
- Actual assignment execution
- Creating real Facebook pages
- Running real LinkedIn campaigns

## Switching Modes

```typescript
const executor = new ActionExecutor({ mode: 'DEMO_MODE' }); // or 'LIVE_MODE'
```

## Safety

Both modes enforce:
- Approval required for high-risk actions
- No credential storage
- No automated CAPTCHA bypass
- Evidence capture for all verified actions
- Task state persistence across restarts
