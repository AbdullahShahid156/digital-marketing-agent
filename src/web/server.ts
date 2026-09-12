import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { loadProject } from '../core/state.js';
import { Orchestrator } from '../core/orchestrator.js';
import { logger } from '../core/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(join(import.meta.dirname, 'public')));

// Store active connections
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

  // Send current state on connect
  try {
    const project = loadProject();
    ws.send(JSON.stringify({ type: 'state', data: project }));
  } catch {
    ws.send(JSON.stringify({ type: 'state', data: null }));
  }

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebServer', 'Client disconnected');
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
    const project = loadProject();
    const security = (project as any).security || null;
    res.json({ success: true, data: security });
  } catch {
    res.json({ success: true, data: null });
  }
});

// Run agent
let isRunning = false;

app.post('/api/run', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ success: false, error: 'Agent already running' });
  }

  const { section = 'ALL', mode = 'DEMO_MODE' } = req.body || {};
  isRunning = true;
  broadcast({ type: 'agent:start', data: { section, mode } });

  try {
    const orchestrator = new Orchestrator();
    await orchestrator.initialize();
    orchestrator.loadRequirements(section);
    orchestrator.buildTaskGraph(orchestrator['requirements']);

    // Execute tasks with broadcasting
    const project = loadProject();
    for (const task of project.tasks) {
      if (task.status === 'PENDING' || task.status === 'FAILED') {
        broadcast({ type: 'task:start', data: { taskId: task.id, title: task.title } });

        try {
          // Simulate task execution for demo
          await new Promise(r => setTimeout(r, 500));
          broadcast({ type: 'task:complete', data: { taskId: task.id, status: 'SUCCESS' } });
        } catch (err) {
          broadcast({ type: 'task:complete', data: { taskId: task.id, status: 'FAILED' } });
        }
      }
    }

    broadcast({ type: 'agent:complete', data: { success: true } });
    res.json({ success: true });
  } catch (err) {
    broadcast({ type: 'agent:error', data: { error: String(err) } });
    res.status(500).json({ success: false, error: String(err) });
  } finally {
    isRunning = false;
  }
});

app.post('/api/task/:taskId/execute', async (req, res) => {
  const { taskId } = req.params;
  broadcast({ type: 'task:start', data: { taskId } });

  try {
    await new Promise(r => setTimeout(r, 1000));
    broadcast({ type: 'task:complete', data: { taskId, status: 'SUCCESS' } });
    res.json({ success: true });
  } catch (err) {
    broadcast({ type: 'task:complete', data: { taskId, status: 'FAILED' } });
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Catch-all for SPA
app.get('*', (_req, res) => {
  res.sendFile(join(import.meta.dirname, 'public', 'index.html'));
});

export function startWebServer() {
  server.listen(PORT, () => {
    logger.info('WebServer', `Server running at http://localhost:${PORT}`);
    console.log(`\n  Agent Dashboard: http://localhost:${PORT}\n`);
  });
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebServer();
}
