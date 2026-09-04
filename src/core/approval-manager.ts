import type { AgentAction, ApprovalRequest, ApprovalRisk } from '../types/index.js';
import { logger } from './logger.js';

const HIGH_RISK_ACTIONS: string[] = [
  'publish_campaign',
  'send_outreach',
  'launch_ad',
  'spend_budget',
  'post_content',
];

function determineRisk(tool: string, action: string): ApprovalRisk {
  if (HIGH_RISK_ACTIONS.includes(action)) return 'EXTERNAL';
  if (tool === 'facebook' || tool === 'meta') return 'MEDIUM';
  if (tool === 'linkedin') return 'MEDIUM';
  return 'LOW';
}

export class ApprovalManager {
  private pending: Map<string, ApprovalRequest> = new Map();
  private resolved: ApprovalRequest[] = [];

  requestApproval(action: AgentAction): ApprovalRequest {
    const risk = action.approvalRisk || determineRisk(action.tool, action.action);
    const needsApproval = action.requiresApproval || risk === 'EXTERNAL' || risk === 'HIGH';

    const request: ApprovalRequest = {
      id: `APR-${Date.now()}`,
      actionId: action.id,
      taskId: action.taskId,
      tool: action.tool,
      action: action.action,
      risk,
      reason: `Action "${action.action}" on ${action.tool} requires approval (risk: ${risk})`,
      status: needsApproval ? 'PENDING' : 'APPROVED',
      requestedAt: new Date(),
    };

    if (needsApproval) {
      this.pending.set(request.id, request);
      logger.warn('ApprovalManager', `APPROVAL REQUIRED: ${request.reason}`);
    } else {
      request.resolvedAt = new Date();
      this.resolved.push(request);
      logger.info('ApprovalManager', `Auto-approved: ${action.action}`);
    }

    return request;
  }

  approve(requestId: string): ApprovalRequest | null {
    const request = this.pending.get(requestId);
    if (!request) return null;
    request.status = 'APPROVED';
    request.resolvedAt = new Date();
    this.pending.delete(requestId);
    this.resolved.push(request);
    logger.info('ApprovalManager', `Approved: ${request.action}`);
    return request;
  }

  deny(requestId: string): ApprovalRequest | null {
    const request = this.pending.get(requestId);
    if (!request) return null;
    request.status = 'DENIED';
    request.resolvedAt = new Date();
    this.pending.delete(requestId);
    this.resolved.push(request);
    logger.warn('ApprovalManager', `Denied: ${request.action}`);
    return request;
  }

  getPending(): ApprovalRequest[] {
    return Array.from(this.pending.values());
  }

  getResolved(): ApprovalRequest[] {
    return [...this.resolved];
  }

  isApproved(requestId: string): boolean {
    const request = this.pending.get(requestId) || this.resolved.find(r => r.id === requestId);
    return request?.status === 'APPROVED';
  }
}

export function needsApproval(tool: string, action: string): boolean {
  const risk = determineRisk(tool, action);
  return risk === 'EXTERNAL' || risk === 'HIGH';
}
