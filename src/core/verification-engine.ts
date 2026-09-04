import type { VerificationResult } from '../types/index.js';
import { getBrowserManager } from './browser-manager.js';
import { logger } from './logger.js';

export interface VerificationCheck {
  type: 'text_visible' | 'text_not_visible' | 'url_contains' | 'url_equals' | 'element_exists' | 'element_not_exists' | 'title_contains';
  selector?: string;
  expected: string;
}

export async function verifyPageState(checks: VerificationCheck[]): Promise<VerificationResult> {
  const browser = getBrowserManager();
  const state = await browser.getCurrentState();

  const failures: string[] = [];

  for (const check of checks) {
    try {
      switch (check.type) {
        case 'text_visible': {
          if (!state.visibleText.includes(check.expected)) {
            failures.push(`Text "${check.expected}" not visible on page`);
          }
          break;
        }
        case 'text_not_visible': {
          if (state.visibleText.includes(check.expected)) {
            failures.push(`Text "${check.expected}" should not be visible but is`);
          }
          break;
        }
        case 'url_contains': {
          if (!state.url.includes(check.expected)) {
            failures.push(`URL "${state.url}" does not contain "${check.expected}"`);
          }
          break;
        }
        case 'url_equals': {
          if (state.url !== check.expected) {
            failures.push(`URL "${state.url}" does not equal "${check.expected}"`);
          }
          break;
        }
        case 'element_exists': {
          if (check.selector) {
            const visible = await browser.isVisible(check.selector);
            if (!visible) {
              failures.push(`Element "${check.selector}" not found or not visible`);
            }
          }
          break;
        }
        case 'element_not_exists': {
          if (check.selector) {
            const visible = await browser.isVisible(check.selector);
            if (visible) {
              failures.push(`Element "${check.selector}" should not exist but does`);
            }
          }
          break;
        }
        case 'title_contains': {
          if (!state.title.includes(check.expected)) {
            failures.push(`Title "${state.title}" does not contain "${check.expected}"`);
          }
          break;
        }
      }
    } catch (err) {
      failures.push(`Check "${check.type}" failed: ${String(err)}`);
    }
  }

  const passed = failures.length === 0;
  const result: VerificationResult = {
    passed,
    expected: checks.map(c => `${c.type}: ${c.expected}`).join('; '),
    observed: `URL: ${state.url} | Title: ${state.title}`,
    details: passed ? 'All checks passed' : `Failures: ${failures.join('; ')}`,
  };

  logger.info('VerificationEngine', `Verification ${passed ? 'PASSED' : 'FAILED'}: ${result.details}`);
  return result;
}

export function createTextVisibleCheck(text: string): VerificationCheck {
  return { type: 'text_visible', expected: text };
}

export function createUrlCheck(pattern: string): VerificationCheck {
  return { type: 'url_contains', expected: pattern };
}

export function createElementCheck(selector: string): VerificationCheck {
  return { type: 'element_exists', selector, expected: selector };
}
