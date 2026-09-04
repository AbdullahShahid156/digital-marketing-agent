import { randomUUID } from 'node:crypto';
import type { AgentAction, AgentMode, ActionResult, VerificationResult } from '../types/index.js';
import { getBrowserManager } from './browser-manager.js';
import { toolRegistry } from '../tools/registry.js';
import { verifyPageState, createTextVisibleCheck, type VerificationCheck } from './verification-engine.js';
import { ApprovalManager } from './approval-manager.js';
import { getDemoScenario, logDemoAction } from './agent-mode.js';
import { logger } from './logger.js';

export interface ActionExecutorOptions {
  mode: AgentMode;
  maxRetries?: number;
  screenshotOnError?: boolean;
}

export interface ExecutionPlan {
  actionId: string;
  steps: AgentAction[];
  verificationChecks: VerificationCheck[];
}

export class ActionExecutor {
  private mode: AgentMode;
  private maxRetries: number;
  private screenshotOnError: boolean;
  private approvalManager: ApprovalManager;
  private executionHistory: ActionResult[] = [];

  constructor(options: ActionExecutorOptions) {
    this.mode = options.mode;
    this.maxRetries = options.maxRetries ?? 3;
    this.screenshotOnError = options.screenshotOnError ?? true;
    this.approvalManager = new ApprovalManager();
  }

  getApprovalManager(): ApprovalManager {
    return this.approvalManager;
  }

  getHistory(): ActionResult[] {
    return [...this.executionHistory];
  }

  createAction(
    taskId: string,
    tool: string,
    action: string,
    parameters: Record<string, unknown>,
    expectedResult?: string,
    requiresApproval?: boolean,
  ): AgentAction {
    return {
      id: randomUUID(),
      taskId,
      tool,
      action,
      parameters,
      expectedResult,
      requiresApproval,
      mode: this.mode,
    };
  }

  async executeAction(action: AgentAction): Promise<ActionResult> {
    logger.info('ActionExecutor', `Executing: ${action.action} on ${action.tool} [${this.mode}]`);

    const approval = this.approvalManager.requestApproval(action);
    if (approval.status === 'PENDING') {
      return {
        success: false,
        actionId: action.id,
        error: `ACTION_REQUIRED: Approval needed for "${action.action}" (ID: ${approval.id})`,
      };
    }
    if (approval.status === 'DENIED') {
      return {
        success: false,
        actionId: action.id,
        error: `DENIED: Action "${action.action}" was denied`,
      };
    }

    if (this.mode === 'DEMO_MODE') {
      return this.executeDemoAction(action);
    }

    return this.executeLiveAction(action);
  }

  private async executeDemoAction(action: AgentAction): Promise<ActionResult> {
    const scenario = getDemoScenario(action.action);
    if (scenario) {
      logDemoAction(action.action, scenario.name);
      const browser = getBrowserManager();

      for (const step of scenario.steps) {
        switch (step.action) {
          case 'navigate':
            if (step.url) await browser.navigate(step.url);
            break;
          case 'observe':
            await browser.getCurrentState();
            break;
          case 'click':
            if (step.selector) await browser.click(step.selector);
            break;
          case 'fill':
            if (step.selector && step.value) await browser.fill(step.selector, step.value);
            break;
          case 'screenshot':
            if (step.value) await browser.screenshot(step.value);
            break;
        }
      }

      const state = await browser.getCurrentState();
      const result: ActionResult = {
        success: true,
        actionId: action.id,
        observedState: state,
        screenshot: state.screenshotPath,
      };
      this.executionHistory.push(result);
      return result;
    }

    const browser = getBrowserManager();
    await browser.navigate('https://example.com');
    const state = await browser.getCurrentState();
    const screenshot = await browser.screenshot(`demo-${action.action}.png`);

    const result: ActionResult = {
      success: true,
      actionId: action.id,
      observedState: state,
      screenshot,
    };
    this.executionHistory.push(result);
    return result;
  }

  private async executeLiveAction(action: AgentAction): Promise<ActionResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const browser = getBrowserManager();
        const beforeState = await browser.getCurrentState();

        const tool = toolRegistry.get(action.tool);
        if (!tool) {
          return {
            success: false,
            actionId: action.id,
            error: `Tool not found: ${action.tool}`,
          };
        }

        const toolResult = await toolRegistry.execute(action.tool, action.parameters);
        if (!toolResult.success) {
          lastError = toolResult.error || 'Tool execution failed';
          logger.warn('ActionExecutor', `Attempt ${attempt + 1} failed: ${lastError}`);
          continue;
        }

        const afterState = await browser.getCurrentState();
        const verification = await this.verifyAction(action, afterState.url, afterState.visibleText);

        let screenshot: string | undefined;
        try {
          screenshot = await browser.screenshot(`live-${action.action}-${Date.now()}.png`);
        } catch {
          // screenshot failure is non-fatal
        }

        const result: ActionResult = {
          success: verification?.passed ?? true,
          actionId: action.id,
          observedState: afterState,
          verification: verification || undefined,
          screenshot,
        };

        this.executionHistory.push(result);
        return result;
      } catch (err) {
        lastError = String(err);
        logger.warn('ActionExecutor', `Attempt ${attempt + 1} error: ${lastError}`);

        if (this.screenshotOnError) {
          try {
            const browser = getBrowserManager();
            await browser.screenshot(`error-${action.action}-${Date.now()}.png`);
          } catch {
            // ignore
          }
        }
      }
    }

    const failResult: ActionResult = {
      success: false,
      actionId: action.id,
      error: `Failed after ${this.maxRetries} attempts: ${lastError}`,
    };
    this.executionHistory.push(failResult);
    return failResult;
  }

  private async verifyAction(action: AgentAction, url: string, visibleText: string): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];

    if (action.expectedResult) {
      checks.push(createTextVisibleCheck(action.expectedResult));
    }

    if (checks.length === 0) {
      return { passed: true, expected: 'no verification', observed: `URL: ${url}`, details: 'No checks to run' };
    }

    return verifyPageState(checks);
  }
}
