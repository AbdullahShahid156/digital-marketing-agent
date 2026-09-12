import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { loadProject, saveProject } from '../core/state.js';
import { Orchestrator, type ExecutionLogEntry } from '../core/orchestrator.js';
import { getNextRunnableTasks, areDependenciesMet, updateTaskState } from '../core/task-manager.js';
import { TaskExecutor } from '../core/task-executor.js';
import { logger } from '../core/logger.js';
import { runSecurityAudit, getSecurityScore, hasCriticalSecurityIssues } from '../modules/security/auditor.js';
import type { Project, Task, AgentMode } from '../types/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(join(import.meta.dirname, 'public')));

// WebSocket clients
const clients = new Set<WebSocket>();

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  logger.info('WebServer', 'Client connected');

  try {
    const project = loadProject();
    ws.send(JSON.stringify({ type: 'state', data: project }));
  } catch {
    ws.send(JSON.stringify({ type: 'state', data: null }));
  }

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// API Routes

app.get('/api/state', (_req, res) => {
  try {
    const project = loadProject();
    res.json({ success: true, data: project });
  } catch {
    res.json({ success: true, data: null });
  }
});

app.get('/api/tasks', (_req, res) => {
  try {
    const project = loadProject();
    res.json({ success: true, data: project.tasks });
  } catch {
    res.json({ success: true, data: [] });
  }
});

app.get('/api/evidence', (_req, res) => {
  try {
    const project = loadProject();
    res.json({ success: true, data: project.evidence });
  } catch {
    res.json({ success: true, data: [] });
  }
});

app.get('/api/requirements', (_req, res) => {
  try {
    const project = loadProject();
    res.json({ success: true, data: project.requirements });
  } catch {
    res.json({ success: true, data: [] });
  }
});

app.get('/api/reports', (_req, res) => {
  try {
    const reportDir = join(process.cwd(), 'evidence', 'reports');
    if (!existsSync(reportDir)) {
      return res.json({ success: true, data: [] });
    }
    const files = readdirSync(reportDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
    const reports = files.map(f => {
      const content = readFileSync(join(reportDir, f), 'utf-8');
      return { name: f, content };
    });
    res.json({ success: true, data: reports });
  } catch {
    res.json({ success: true, data: [] });
  }
});

app.get('/api/security', (_req, res) => {
  try {
    const checks = runSecurityAudit(process.cwd());
    const score = getSecurityScore(checks);
    const hasCritical = hasCriticalSecurityIssues(checks);
    res.json({ success: true, data: { checks, score, hasCritical } });
  } catch {
    res.json({ success: true, data: null });
  }
});

// Run agent - REAL execution
let isRunning = false;
let currentAbortController: AbortController | null = null;

app.post('/api/run', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ success: false, error: 'Agent already running' });
  }

  const { section = 'ALL', mode = 'DEMO_MODE' } = req.body || {};
  isRunning = true;
  currentAbortController = new AbortController();

  broadcast({ type: 'agent:start', data: { section, mode } });

  try {
    const orchestrator = new Orchestrator();
    const project = await orchestrator.initialize();

    // Load requirements and build task graph
    const requirements = orchestrator.loadRequirements(section);
    const tasks = orchestrator.buildTaskGraph(requirements);

    broadcast({ type: 'agent:progress', data: { message: `Loaded ${requirements.length} requirements, created ${tasks.length} tasks` } });

    // Run security audit
    const securityChecks = runSecurityAudit(process.cwd());
    const securityScore = getSecurityScore(securityChecks);
    const hasCritical = hasCriticalSecurityIssues(securityChecks);

    if (hasCritical) {
      broadcast({ type: 'agent:progress', data: { message: `Security score: ${securityScore}/100 - Critical issues found` } });
    } else {
      broadcast({ type: 'agent:progress', data: { message: `Security audit passed: ${securityScore}/100` } });
    }

    // Create task executor
    const taskExecutor = new TaskExecutor({ mode: mode as AgentMode });

    // Broadcast initial state
    broadcast({ type: 'state', data: project });

    // Execute tasks in dependency order
    const maxIterations = tasks.length * 5;
    let iteration = 0;
    let completedCount = 0;
    let failedCount = 0;
    let actionRequiredCount = 0;

    while (iteration < maxIterations) {
      iteration++;
      const runnableTasks = getNextRunnableTasks(project);

      if (runnableTasks.length === 0) {
        const pendingTasks = project.tasks.filter(t => t.state === 'PENDING');
        const inProgressTasks = project.tasks.filter(t => t.state === 'IN_PROGRESS');

        if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
          break;
        }

        // Mark stuck tasks as failed
        if (inProgressTasks.length > 0) {
          for (const t of inProgressTasks) {
            updateTaskState(project, t.id, 'FAILED');
            failedCount++;
            broadcast({ type: 'task:complete', data: { taskId: t.id, title: t.title, status: 'FAILED' } });
          }
          continue;
        }

        // Mark blocked tasks
        for (const t of pendingTasks) {
          if (!areDependenciesMet(project, t)) {
            updateTaskState(project, t.id, 'BLOCKED');
            broadcast({ type: 'task:complete', data: { taskId: t.id, title: t.title, status: 'BLOCKED' } });
          }
        }
        break;
      }

      for (const task of runnableTasks) {
        if (currentAbortController?.signal.aborted) {
          broadcast({ type: 'agent:cancelled', data: {} });
          break;
        }

        const taskIndex = project.tasks.indexOf(task) + 1;
        broadcast({ type: 'task:start', data: { taskId: task.id, title: task.title, index: taskIndex, total: tasks.length } });

        try {
          const result = await taskExecutor.executeTask(project, task);

          if (result.state === 'ACTION_REQUIRED') {
            actionRequiredCount++;
            broadcast({ type: 'task:complete', data: { taskId: task.id, title: task.title, status: 'ACTION_REQUIRED', error: result.error } });
          } else if (result.success) {
            completedCount++;
            broadcast({ type: 'task:complete', data: { taskId: task.id, title: task.title, status: 'SUCCESS' } });
          } else {
            failedCount++;
            broadcast({ type: 'task:complete', data: { taskId: task.id, title: task.title, status: 'FAILED', error: result.error } });
          }
        } catch (err) {
          failedCount++;
          broadcast({ type: 'task:complete', data: { taskId: task.id, title: task.title, status: 'FAILED', error: String(err) } });
        }

        // Save state after each task
        saveProject(project, `web_execute_task_${task.id}`);

        // Broadcast updated state
        broadcast({ type: 'state', data: project });
      }
    }

    broadcast({ type: 'agent:complete', data: { success: true, completed: completedCount, failed: failedCount, actionRequired: actionRequiredCount } });
    res.json({ success: true });

  } catch (err) {
    logger.error('WebServer', `Execution failed: ${err}`);
    broadcast({ type: 'agent:error', data: { error: String(err) } });
    res.status(500).json({ success: false, error: String(err) });
  } finally {
    isRunning = false;
    currentAbortController = null;
  }
});

// Cancel running agent
app.post('/api/cancel', (_req, res) => {
  if (!isRunning) {
    return res.json({ success: true, message: 'No agent running' });
  }
  currentAbortController?.abort();
  res.json({ success: true, message: 'Cancellation requested' });
});

// Execute single task
app.post('/api/task/:taskId/execute', async (req, res) => {
  const { taskId } = req.params;

  try {
    const project = loadProject();
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    broadcast({ type: 'task:start', data: { taskId: task.id, title: task.title } });

    const mode = (req.body?.mode || 'DEMO_MODE') as AgentMode;
    const taskExecutor = new TaskExecutor({ mode });
    const result = await taskExecutor.executeTask(project, task);

    const status = result.state === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : result.success ? 'SUCCESS' : 'FAILED';
    broadcast({ type: 'task:complete', data: { taskId: task.id, title: task.title, status, error: result.error } });
    broadcast({ type: 'state', data: project });

    saveProject(project, `web_execute_task_${task.id}`);
    res.json({ success: true, status });
  } catch (err) {
    broadcast({ type: 'task:complete', data: { taskId, status: 'FAILED', error: String(err) } });
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Approve task (for ACTION_REQUIRED tasks)
app.post('/api/task/:taskId/approve', (req, res) => {
  const { taskId } = req.params;
  try {
    const project = loadProject();
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.state !== 'ACTION_REQUIRED') return res.status(400).json({ success: false, error: 'Task is not in ACTION_REQUIRED state' });

    updateTaskState(project, taskId, 'PENDING');
    saveProject(project, `web_approve_task_${taskId}`);
    broadcast({ type: 'state', data: project });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// SPA catch-all
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(import.meta.dirname, 'public', 'index.html'));
});

export function startWebServer() {
  server.listen(PORT, () => {
    console.log(`\n  Agent Dashboard: http://localhost:${PORT}\n`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWebServer();
}
