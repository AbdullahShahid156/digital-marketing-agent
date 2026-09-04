import { randomUUID } from 'node:crypto';
import type {
  Task, Project, AgentAction, ActionResult, AgentMode,
  TaskExecutionMode, ActionPlanStep, TaskEvidenceRequirement,
  VerificationResult,
} from '../types/index.js';
import { ActionExecutor } from './action-executor.js';
import { getBrowserManager } from './browser-manager.js';
import { verifyPageState, createTextVisibleCheck, createUrlCheck } from './verification-engine.js';
import { captureEvidence } from './evidence-manager.js';
import { logger } from './logger.js';
import { updateTaskState } from './task-manager.js';
import { saveProject } from './state.js';
import { toolRegistry } from '../tools/registry.js';
import {
  createBusinessProfile,
  updateFourPs,
  updateFourAs,
  addCustomerPersona,
} from '../modules/business/analyzer.js';
import { createMarketingStrategy, generateSWOTAnalysis } from '../modules/marketing/strategy.js';
import { createFacebookCampaign, createAdSet, createAd, createLeadGenForm, createABTest, generateContentCalendar } from '../modules/meta/agent.js';
import { createLinkedInLeadGenCampaign, generateAudienceSegments, generateLinkedInContentPlan, generateOutreachMessages, generatePerformanceMetrics, findClientProspects } from '../modules/linkedin/agent.js';
import { generateContentCalendar as generateContentCalendarModule } from '../modules/content/planner.js';
import { addProspect, qualifyProspect } from '../modules/prospects/research.js';
import { createOutreachMessage } from '../modules/outreach/engine.js';
import { generateFinalReport, exportReportToMarkdown } from '../modules/reports/generator.js';
import { runQAAudit } from '../modules/qa/validator.js';
import { executeFacebookQ1Workflow } from '../modules/meta/workflows.js';

export interface TaskExecutorOptions {
  mode: AgentMode;
  maxRetries?: number;
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  state: Task['state'];
  actionResults: ActionResult[];
  evidenceCaptured: string[];
  error?: string;
}

export class TaskExecutor {
  private executor: ActionExecutor;
  private mode: AgentMode;

  constructor(options: TaskExecutorOptions) {
    this.mode = options.mode;
    this.executor = new ActionExecutor({
      mode: options.mode,
      maxRetries: options.maxRetries ?? 3,
    });
  }

  getActionExecutor(): ActionExecutor {
    return this.executor;
  }

  getMode(): AgentMode {
    return this.mode;
  }

  async executeTask(project: Project, task: Task): Promise<TaskExecutionResult> {
    const result: TaskExecutionResult = {
      taskId: task.id,
      success: false,
      state: task.state,
      actionResults: [],
      evidenceCaptured: [],
    };

    try {
      updateTaskState(project, task.id, 'IN_PROGRESS');
      result.state = 'IN_PROGRESS';

      if (!task.executionMode) {
        task.executionMode = this.inferExecutionMode(task);
      }

      if (!task.actionPlan && task.executionMode !== 'USER_ACTION') {
        task.actionPlan = this.createActionPlan(project, task);
      }

      switch (task.executionMode) {
        case 'AUTOMATED':
          await this.executeAutomated(project, task, result);
          break;
        case 'BROWSER':
          await this.executeBrowser(project, task, result);
          break;
        case 'RESEARCH':
          await this.executeResearch(project, task, result);
          break;
        case 'CONTENT':
          await this.executeContent(project, task, result);
          break;
        case 'USER_ACTION':
          await this.executeUserAction(project, task, result);
          break;
        case 'APPROVAL_REQUIRED':
          await this.executeApprovalRequired(project, task, result);
          break;
      }

      if (result.success) {
        updateTaskState(project, task.id, 'COMPLETED');
        result.state = 'COMPLETED';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('TaskExecutor', `Task ${task.id} failed: ${errorMsg}`);
      updateTaskState(project, task.id, 'FAILED');
      result.state = 'FAILED';
      result.error = errorMsg;
    }

    saveProject(project, `execute_task_${task.id}`);
    return result;
  }

  private inferExecutionMode(task: Task): TaskExecutionMode {
    const title = task.title.toLowerCase();
    const desc = task.description.toLowerCase();

    if (title.includes('login') || title.includes('log in') || title.includes('sign in') ||
        title.includes('connect account') || title.includes('manual') ||
        desc.includes('user must') || desc.includes('requires login')) {
      return 'USER_ACTION';
    }

    if (title.includes('publish') || title.includes('launch') || title.includes('send') ||
        title.includes('post live') || title.includes('spend')) {
      return 'APPROVAL_REQUIRED';
    }

    if (title.includes('research') || title.includes('find') || title.includes('prospect') ||
        title.includes('hunt') || desc.includes('search for')) {
      return 'RESEARCH';
    }

    if (title.includes('content') || title.includes('calendar') || title.includes('copy') ||
        title.includes('hashtag') || title.includes('caption') || title.includes('post draft')) {
      return 'CONTENT';
    }

    if (title.includes('page') || title.includes('campaign') || title.includes('ad set') ||
        title.includes('ad ') || title.includes('form') || title.includes('suite') ||
        title.includes('setup') || title.includes('configure') || title.includes('profile') ||
        title.includes('company page') || title.includes('dashboard') ||
        desc.includes('browser') || desc.includes('screenshot')) {
      return 'BROWSER';
    }

    return 'AUTOMATED';
  }

  createActionPlan(project: Project, task: Task): ActionPlanStep[] {
    const section = this.getTaskSection(task);
    const title = task.title.toLowerCase();

    if (title.includes('business') && (title.includes('foundation') || title.includes('profile') || title.includes('analysis'))) {
      return this.createBusinessPlan(project, task);
    }
    if (title.includes('marketing') && (title.includes('strategy') || title.includes('plan'))) {
      return this.createMarketingPlan(project, task);
    }
    if (title.includes('facebook') && title.includes('page')) {
      return this.createFacebookPagePlan(project, task);
    }
    if (title.includes('campaign') && section === 'q1') {
      return this.createFacebookCampaignPlan(project, task);
    }
    if (title.includes('lead') && title.includes('gen')) {
      return this.createLeadGenPlan(project, task);
    }
    if (title.includes('a/b') || title.includes('ab test')) {
      return this.createABTestPlan(project, task);
    }
    if (title.includes('content') && title.includes('calendar')) {
      return this.createContentCalendarPlan(project, task);
    }
    if (title.includes('linkedin') && title.includes('profile')) {
      return this.createLinkedInProfilePlan(project, task);
    }
    if (title.includes('company') && title.includes('page')) {
      return this.createCompanyPagePlan(project, task);
    }
    if (title.includes('audience') || title.includes('segment')) {
      return this.createAudiencePlan(project, task);
    }
    if (title.includes('prospect') || title.includes('client hunting')) {
      return this.createProspectPlan(project, task);
    }
    if (title.includes('outreach')) {
      return this.createOutreachPlan(project, task);
    }
    if (title.includes('performance') || title.includes('metrics')) {
      return this.createPerformancePlan(project, task);
    }
    if (title.includes('report') || title.includes('evidence collection')) {
      return this.createReportPlan(project, task);
    }

    return [];
  }

  private createBusinessPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'business', action: 'create_profile', parameters: { taskId: task.id }, expectedResult: 'Business profile created' },
      { tool: 'business', action: 'update_4ps', parameters: { taskId: task.id } },
      { tool: 'business', action: 'update_4as', parameters: { taskId: task.id } },
      { tool: 'business', action: 'add_persona', parameters: { taskId: task.id } },
    ];
  }

  private createMarketingPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'marketing', action: 'create_strategy', parameters: { taskId: task.id }, expectedResult: 'Strategy created' },
      { tool: 'marketing', action: 'generate_swot', parameters: { taskId: task.id } },
    ];
  }

  private createFacebookPagePlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'browser', action: 'navigate', parameters: { url: 'https://www.facebook.com/pages/create' }, expectedResult: 'Create a Page' },
      { tool: 'browser', action: 'observe', parameters: {} },
      { tool: 'browser', action: 'screenshot', parameters: { filename: `${task.id}-page-create.png` } },
    ];
  }

  private createFacebookCampaignPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'meta', action: 'create_campaign', parameters: { taskId: task.id }, expectedResult: 'Campaign created' },
      { tool: 'meta', action: 'create_adset', parameters: { taskId: task.id } },
      { tool: 'meta', action: 'create_ad', parameters: { taskId: task.id } },
      { tool: 'browser', action: 'screenshot', parameters: { filename: `${task.id}-campaign.png` } },
    ];
  }

  private createLeadGenPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'meta', action: 'create_lead_form', parameters: { taskId: task.id }, expectedResult: 'Lead form created' },
      { tool: 'browser', action: 'screenshot', parameters: { filename: `${task.id}-lead-gen.png` } },
    ];
  }

  private createABTestPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'meta', action: 'create_ab_test', parameters: { taskId: task.id }, expectedResult: 'A/B test created' },
    ];
  }

  private createContentCalendarPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'content', action: 'generate_calendar', parameters: { taskId: task.id }, expectedResult: 'Calendar generated' },
    ];
  }

  private createLinkedInProfilePlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'browser', action: 'navigate', parameters: { url: 'https://www.linkedin.com/in/me/edit-headline/' }, expectedResult: 'Edit' },
      { tool: 'browser', action: 'observe', parameters: {} },
      { tool: 'browser', action: 'screenshot', parameters: { filename: `${task.id}-linkedin-profile.png` } },
    ];
  }

  private createCompanyPagePlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'browser', action: 'navigate', parameters: { url: 'https://www.linkedin.com/company/setup/new/' }, expectedResult: 'Create' },
      { tool: 'browser', action: 'observe', parameters: {} },
      { tool: 'browser', action: 'screenshot', parameters: { filename: `${task.id}-company-page.png` } },
    ];
  }

  private createAudiencePlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'linkedin', action: 'generate_segments', parameters: { taskId: task.id }, expectedResult: 'Segments generated' },
    ];
  }

  private createProspectPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'linkedin', action: 'find_prospects', parameters: { taskId: task.id }, expectedResult: 'Prospects found' },
    ];
  }

  private createOutreachPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'linkedin', action: 'generate_messages', parameters: { taskId: task.id }, expectedResult: 'Messages generated' },
    ];
  }

  private createPerformancePlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'linkedin', action: 'generate_metrics', parameters: { taskId: task.id }, expectedResult: 'Metrics generated' },
    ];
  }

  private createReportPlan(_project: Project, task: Task): ActionPlanStep[] {
    return [
      { tool: 'reports', action: 'generate', parameters: { taskId: task.id }, expectedResult: 'Report generated' },
    ];
  }

  private async executeAutomated(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    if (task.requirementId.startsWith('Q1')) {
      try {
        const workflowResult = await executeFacebookQ1Workflow(
          project,
          task.requirementId,
          task,
          this.mode,
        );

        if (workflowResult.action === 'ACTION_REQUIRED') {
          updateTaskState(project, task.id, 'ACTION_REQUIRED');
          result.state = 'ACTION_REQUIRED';
          result.error = `USER_ACTION_REQUIRED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.action === 'BLOCKED') {
          updateTaskState(project, task.id, 'BLOCKED');
          result.state = 'BLOCKED';
          result.error = `BLOCKED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.evidencePath) {
          result.evidenceCaptured.push(workflowResult.evidencePath);
        }

        result.success = workflowResult.success;
        if (!result.success) {
          result.error = workflowResult.message;
        }
        return;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('TaskExecutor', `Q1 automated workflow failed: ${errorMsg}`);
        updateTaskState(project, task.id, 'FAILED');
        result.state = 'FAILED';
        result.error = errorMsg;
        return;
      }
    }

    const steps = task.actionPlan ?? [];
    for (const step of steps) {
      const actionResult = await this.executeStep(project, task, step);
      result.actionResults.push(actionResult);
      if (!actionResult.success) {
        result.error = actionResult.error;
        return;
      }
    }
    result.success = true;
  }

  private async executeBrowser(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    if (task.requirementId.startsWith('Q1')) {
      try {
        const workflowResult = await executeFacebookQ1Workflow(
          project,
          task.requirementId,
          task,
          this.mode,
        );

        if (workflowResult.action === 'ACTION_REQUIRED') {
          updateTaskState(project, task.id, 'ACTION_REQUIRED');
          result.state = 'ACTION_REQUIRED';
          result.error = `USER_ACTION_REQUIRED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.action === 'BLOCKED') {
          updateTaskState(project, task.id, 'BLOCKED');
          result.state = 'BLOCKED';
          result.error = `BLOCKED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.evidencePath) {
          result.evidenceCaptured.push(workflowResult.evidencePath);
        }

        result.success = workflowResult.success;
        if (!result.success) {
          result.error = workflowResult.message;
        }
        return;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('TaskExecutor', `Q1 workflow failed: ${errorMsg}`);
        updateTaskState(project, task.id, 'FAILED');
        result.state = 'FAILED';
        result.error = errorMsg;
        return;
      }
    }

    const steps = task.actionPlan ?? [];
    for (const step of steps) {
      const actionResult = await this.executeStep(project, task, step);
      result.actionResults.push(actionResult);
      if (!actionResult.success) {
        result.error = actionResult.error;
        return;
      }
    }

    if (task.evidenceRequirements) {
      for (const ev of task.evidenceRequirements) {
        const screenshotPath = await this.captureTaskEvidence(project, task, ev);
        if (screenshotPath) {
          result.evidenceCaptured.push(screenshotPath);
        }
      }
    }
    result.success = true;
  }

  private async executeResearch(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    const title = task.title.toLowerCase();

    if (title.includes('prospect') || title.includes('client hunting')) {
      const prospects = findClientProspects();
      for (const prospect of prospects) {
        addProspect(project, {
          businessName: prospect.businessName,
          industry: prospect.industry,
          location: prospect.location,
          website: prospect.linkedinUrl,
          socialPresence: ['LinkedIn'],
          potentialProblems: prospect.potentialNeeds,
          recommendedServices: prospect.potentialNeeds,
          qualificationReason: `Score: ${prospect.qualificationScore}. Source: ${prospect.source}`,
          source: prospect.source,
          verificationStatus: 'UNVERIFIED',
          outreachStatus: 'NOT_CONTACTED',
        });
      }
      result.success = true;
      return;
    }

    const steps = task.actionPlan ?? [];
    for (const step of steps) {
      const actionResult = await this.executeStep(project, task, step);
      result.actionResults.push(actionResult);
      if (!actionResult.success) {
        result.error = actionResult.error;
        return;
      }
    }
    result.success = true;
  }

  private async executeContent(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    const title = task.title.toLowerCase();

    if (task.requirementId.startsWith('Q1')) {
      try {
        const workflowResult = await executeFacebookQ1Workflow(
          project,
          task.requirementId,
          task,
          this.mode,
        );

        if (workflowResult.action === 'ACTION_REQUIRED') {
          updateTaskState(project, task.id, 'ACTION_REQUIRED');
          result.state = 'ACTION_REQUIRED';
          result.error = `USER_ACTION_REQUIRED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.action === 'BLOCKED') {
          updateTaskState(project, task.id, 'BLOCKED');
          result.state = 'BLOCKED';
          result.error = `BLOCKED: ${workflowResult.message}`;
          return;
        }

        if (workflowResult.evidencePath) {
          result.evidenceCaptured.push(workflowResult.evidencePath);
        }

        result.success = workflowResult.success;
        return;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('TaskExecutor', `Q1 content workflow failed: ${errorMsg}`);
        updateTaskState(project, task.id, 'FAILED');
        result.state = 'FAILED';
        result.error = errorMsg;
        return;
      }
    }

    if (title.includes('content') && title.includes('calendar')) {
      const items = generateContentCalendar(project, 7);
      result.success = items.length > 0;
      return;
    }

    const steps = task.actionPlan ?? [];
    for (const step of steps) {
      const actionResult = await this.executeStep(project, task, step);
      result.actionResults.push(actionResult);
      if (!actionResult.success) {
        result.error = actionResult.error;
        return;
      }
    }
    result.success = true;
  }

  private async executeUserAction(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    task.userActionInstruction = this.generateUserInstruction(task);
    updateTaskState(project, task.id, 'ACTION_REQUIRED');
    result.state = 'ACTION_REQUIRED';
    result.error = `USER_ACTION_REQUIRED: ${task.userActionInstruction}`;
  }

  private async executeApprovalRequired(project: Project, task: Task, result: TaskExecutionResult): Promise<void> {
    const approvalMgr = this.executor.getApprovalManager();
    const action = this.executor.createAction(
      task.id, 'external', 'execute',
      { task: task.title },
      undefined,
      true,
    );
    const request = approvalMgr.requestApproval(action);
    if (request.status === 'PENDING') {
      updateTaskState(project, task.id, 'ACTION_REQUIRED');
      result.state = 'ACTION_REQUIRED';
      result.error = `APPROVAL_REQUIRED: Action "${task.title}" needs approval. Risk: ${request.risk}. ID: ${request.id}`;
      return;
    }

    await this.executeAutomated(project, task, result);
  }

  private async executeStep(project: Project, task: Task, step: ActionPlanStep): Promise<ActionResult> {
    const action = this.executor.createAction(
      task.id,
      step.tool,
      step.action,
      step.parameters,
      step.expectedResult,
      step.requiresApproval,
    );

    if (step.tool === 'browser') {
      return this.executor.executeAction(action);
    }

    return this.executeModuleStep(project, task, step);
  }

  private async executeModuleStep(project: Project, task: Task, step: ActionPlanStep): Promise<ActionResult> {
    const action = this.executor.createAction(
      task.id, step.tool, step.action, step.parameters, step.expectedResult,
    );

    try {
      switch (step.tool) {
        case 'business':
          return this.executeBusinessStep(project, task, step, action);
        case 'marketing':
          return this.executeMarketingStep(project, task, step, action);
        case 'meta':
          return this.executeMetaStep(project, task, step, action);
        case 'linkedin':
          return this.executeLinkedInStep(project, task, step, action);
        case 'content':
          return this.executeContentStep(project, task, step, action);
        case 'reports':
          return this.executeReportStep(project, task, step, action);
        default:
          return { success: false, actionId: action.id, error: `Unknown tool: ${step.tool}` };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, actionId: action.id, error: errorMsg };
    }
  }

  private executeBusinessStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'create_profile': {
        const profile = createBusinessProfile(
          project,
          project.name || 'Hunarmand Punjab Business',
          'Digital Marketing Services',
          'Lahore, Pakistan',
          'Full-stack digital marketing services for businesses in Pakistan',
        );
        return { success: !!profile, actionId: action.id, observedState: profile };
      }
      case 'update_4ps': {
        updateFourPs(project, {
          product: 'Digital Marketing Services including Social Media Management, SEO, PPC, Content Marketing',
          price: 'Competitive pricing starting from PKR 25,000/month',
          place: 'Online services with in-person consultations in Lahore, Karachi, Islamabad',
          promotion: 'Facebook Ads, LinkedIn Marketing, Content Marketing, Referral Program',
        });
        return { success: true, actionId: action.id };
      }
      case 'update_4as': {
        updateFourAs(project, {
          acceptability: 'Services meet market needs with customized strategies for each business',
          affordability: 'Flexible pricing tiers for startups, SMEs, and enterprises',
          accessibility: 'Online delivery with local support in major Pakistani cities',
          awareness: 'Active presence on social media, content marketing, and referral partnerships',
        });
        return { success: true, actionId: action.id };
      }
      case 'add_persona': {
        addCustomerPersona(project, {
          name: 'Business Owner',
          age: '30-50',
          gender: 'Any',
          location: 'Lahore, Karachi, Islamabad',
          interests: ['Business Growth', 'Digital Marketing', 'Social Media'],
          painPoints: ['Low online visibility', 'Poor ROI on ads', 'No social media strategy'],
          goals: ['Increase online presence', 'Generate more leads', 'Grow revenue'],
        });
        return { success: true, actionId: action.id };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown business action: ${step.action}` };
    }
  }

  private executeMarketingStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'create_strategy': {
        const strategy = createMarketingStrategy(project, {
          targetAudience: 'Small to medium businesses in Pakistan',
          valueProposition: 'Data-driven digital marketing that delivers measurable ROI',
          channels: ['Facebook', 'LinkedIn', 'Instagram', 'Google Ads', 'Email'],
          budget: 'PKR 100,000/month',
          timeline: '6 months',
          objectives: ['Increase brand awareness', 'Generate 50 leads/month', 'Achieve 3x ROAS'],
          kpis: ['Impressions', 'Click-through rate', 'Conversion rate', 'Cost per lead'],
          contentPillars: [],
          competitiveAdvantage: 'Local expertise with international standards',
        });
        return { success: !!strategy, actionId: action.id, observedState: strategy };
      }
      case 'generate_swot': {
        const swot = generateSWOTAnalysis(project);
        return { success: !!swot, actionId: action.id, observedState: swot };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown marketing action: ${step.action}` };
    }
  }

  private executeMetaStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'create_campaign': {
        const campaign = createFacebookCampaign(project, 'Hunarmand Punjab Campaign', 'LEAD_GENERATION', 'PKR 50,000');
        return { success: !!campaign, actionId: action.id, observedState: campaign };
      }
      case 'create_adset': {
        const campaign = project.campaigns[project.campaigns.length - 1];
        if (!campaign) return { success: false, actionId: action.id, error: 'No campaign found' };
        const adSet = createAdSet(project, campaign.id, 'Interest-Based Audience', 'PKR 25,000');
        return { success: !!adSet, actionId: action.id, observedState: adSet };
      }
      case 'create_ad': {
        const campaign = project.campaigns[project.campaigns.length - 1];
        if (!campaign || !campaign.adSets[0]) return { success: false, actionId: action.id, error: 'No campaign/adset found' };
        const ad = createAd(project, campaign.id, campaign.adSets[0].id, {
          name: 'Lead Ad - Version A',
          headline: 'Grow Your Business with Digital Marketing',
          primaryText: 'Expert digital marketing services to help your business reach more customers online.',
          callToAction: 'Learn More',
          creativeType: 'Image',
        });
        return { success: !!ad, actionId: action.id, observedState: ad };
      }
      case 'create_lead_form': {
        const form = createLeadGenForm(
          'Hunarmand Lead Form',
          'Get Your Free Marketing Consultation',
          'Free 30-minute strategy session',
          ['Full Name', 'Email', 'Phone', 'Business Name'],
          'Sign Up',
        );
        return { success: !!form, actionId: action.id, observedState: form };
      }
      case 'create_ab_test': {
        const test = createABTest(
          'Headline Test',
          'headline',
          'Grow Your Business Today',
          'Start Growing Your Business Now',
        );
        return { success: !!test, actionId: action.id, observedState: test };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown meta action: ${step.action}` };
    }
  }

  private executeLinkedInStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'generate_segments': {
        const segments = generateAudienceSegments();
        return { success: segments.length > 0, actionId: action.id, observedState: segments };
      }
      case 'find_prospects': {
        const prospects = findClientProspects();
        return { success: prospects.length > 0, actionId: action.id, observedState: prospects };
      }
      case 'generate_messages': {
        const messages = generateOutreachMessages('Digital Marketing');
        return { success: !!messages, actionId: action.id, observedState: messages };
      }
      case 'generate_metrics': {
        const metrics = generatePerformanceMetrics();
        return { success: metrics.length > 0, actionId: action.id, observedState: metrics };
      }
      case 'create_campaign': {
        const segments = generateAudienceSegments();
        const campaign = createLinkedInLeadGenCampaign(
          'Hunarmand LinkedIn Campaign',
          'Lead Generation',
          segments,
          'PKR 30,000',
          'Banner Image',
          'Grow your business with our digital marketing expertise',
        );
        return { success: !!campaign, actionId: action.id, observedState: campaign };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown linkedin action: ${step.action}` };
    }
  }

  private executeContentStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'generate_calendar': {
        const items = generateContentCalendarModule(project, 'Facebook', 7);
        return { success: items.length > 0, actionId: action.id, observedState: items };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown content action: ${step.action}` };
    }
  }

  private executeReportStep(project: Project, _task: Task, step: ActionPlanStep, action: AgentAction): ActionResult {
    switch (step.action) {
      case 'generate': {
        const report = generateFinalReport(project);
        const markdown = exportReportToMarkdown(report);
        return { success: true, actionId: action.id, observedState: { report, markdownLength: markdown.length } };
      }
      case 'qa_audit': {
        const qaReport = runQAAudit(project);
        return { success: true, actionId: action.id, observedState: qaReport };
      }
      default:
        return { success: false, actionId: action.id, error: `Unknown report action: ${step.action}` };
    }
  }

  private async captureTaskEvidence(
    project: Project,
    task: Task,
    ev: TaskEvidenceRequirement,
  ): Promise<string | null> {
    try {
      const browser = getBrowserManager();
      if (!browser.isLaunched()) return null;
      const capture = await captureEvidence(
        project,
        task.requirementId,
        task.id,
        randomUUID(),
        ev.title,
        ev.description,
        this.getTaskSection(task) as 'q1' | 'q2',
      );
      return capture?.screenshotPath ?? null;
    } catch {
      return null;
    }
  }

  private getTaskSection(task: Task): string {
    if (task.requirementId.startsWith('Q1')) return 'q1';
    if (task.requirementId.startsWith('Q2')) return 'q2';
    return 'general';
  }

  private generateUserInstruction(task: Task): string {
    const title = task.title.toLowerCase();

    if (title.includes('login') || title.includes('log in') || title.includes('sign in')) {
      const platform = title.includes('facebook') ? 'Facebook' :
                       title.includes('linkedin') ? 'LinkedIn' : 'the platform';
      return [
        `TASK: ${task.title}`,
        '',
        'WHY:',
        `Authenticated ${platform} session required for this step.`,
        '',
        'USER ACTION:',
        `1. Open a browser and log into ${platform}.`,
        '2. Ensure you are on the main dashboard.',
        '3. Return to the agent and confirm you are logged in.',
        '',
        'WHEN DONE:',
        'The agent will resume execution from this task.',
      ].join('\n');
    }

    if (title.includes('connect') && title.includes('account')) {
      return [
        `TASK: ${task.title}`,
        '',
        'WHY:',
        'Account connection requires manual authorization.',
        '',
        'USER ACTION:',
        '1. Follow the platform instructions to connect your account.',
        '2. Authorize the required permissions.',
        '3. Return to the agent once connection is established.',
        '',
        'WHEN DONE:',
        'The agent will resume execution.',
      ].join('\n');
    }

    return [
      `TASK: ${task.title}`,
      '',
      'WHY:',
      'This task requires manual user intervention.',
      '',
      'USER ACTION:',
      `1. Complete the following: ${task.description}`,
      '2. Return to the agent once done.',
      '',
      'WHEN DONE:',
      'The agent will resume execution from this task.',
    ].join('\n');
  }
}
