import express, { Request, Response } from 'express';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    app_version: process.env.APP_VERSION,
  });
});

app.post('/api/agent/task', async (req: Request, res: Response) => {
  const { taskId } = req.body;
  console.log(`[Agent] Received task: ${taskId}`);
  res.status(202).json({ message: 'Task received', taskId });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
