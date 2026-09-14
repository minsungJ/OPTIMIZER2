/**
 * Server entry point for AION 2 OPTIMIZER
 * Full-stack Express + Vite application
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AionAgentOrchestrator } from './server/orchestrator.js';
import { repository } from './server/repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const orchestrator = new AionAgentOrchestrator(repository);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'AION 2 OPTIMIZER' });
  });

  // Main Chat API
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, conversation = [] } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: '메시지를 입력해주세요.' });
        return;
      }

      const result = await orchestrator.handleMessage({
        userMessage: message.trim(),
        conversation,
        repository,
      });

      res.json(result);
    } catch (err: any) {
      console.error('Chat endpoint error:', err);
      res.status(500).json({
        error: '요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: err?.message,
      });
    }
  });

  // State inspection API
  app.get('/api/state', (req, res) => {
    try {
      const masterState = repository.getMasterState();
      const characters = repository.getCharacters();
      const recentEvents = repository.getEvents(undefined, 10);
      const recentLedger = repository.getLedger(undefined, 10);
      const latestDecision = repository.getLatestDecision();

      res.json({
        masterState,
        characters,
        recentEvents,
        recentLedger,
        latestDecision,
      });
    } catch (err: any) {
      res.status(500).json({ error: '상태 조회 실패' });
    }
  });

  // Reset database state
  app.post('/api/reset', (req, res) => {
    try {
      repository.resetState();
      res.json({ status: 'success', message: '데이터가 초기 상태로 초기화되었습니다.' });
    } catch (err: any) {
      res.status(500).json({ error: '초기화 실패' });
    }
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AION 2 OPTIMIZER] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
