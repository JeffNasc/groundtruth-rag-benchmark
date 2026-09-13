import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { corpus } from './corpus.js';
import { retrieve } from './rag.js';
import { generate } from './llm.js';
import { evaluate } from './evaluation.js';
import { clearRuns, loadRuns, saveRun } from './store.js';
import type { BenchmarkConfig, BenchmarkRun, Metrics, Result, Summary } from '../src/types.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
const prices: Record<string, [number, number]> = {
  'gpt-4.1-mini': [0.40, 1.60], 'gpt-4.1': [2, 8], 'gpt-4o-mini': [0.15, 0.60], 'gpt-4o': [2.50, 10]
};
const cost = (model: string, input: number, output: number) => {
  const [i, o] = prices[model] ?? [0, 0]; return (input * i + output * o) / 1_000_000;
};

app.get('/api/health', (_req, res) => res.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), corpusSize: corpus.length }));
app.get('/api/corpus', (_req, res) => res.json(corpus));
app.get('/api/runs', async (_req, res) => res.json(await loadRuns()));
app.delete('/api/runs', async (_req, res) => { await clearRuns(); res.status(204).end(); });

app.post('/api/benchmark', async (req, res) => {
  try {
    const question = String(req.body.question ?? '').trim();
    if (question.length < 5) return res.status(400).json({ error: 'Digite uma pergunta com pelo menos 5 caracteres.' });
    const config: BenchmarkConfig = {
      provider: req.body.config?.provider === 'openai' ? 'openai' : 'demo',
      model: String(req.body.config?.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini'),
      topK: Math.max(1, Math.min(6, Number(req.body.config?.topK) || 3)),
      temperature: Math.max(0, Math.min(2, Number(req.body.config?.temperature) || 0)),
      chunkSize: Math.max(180, Math.min(1500, Number(req.body.config?.chunkSize) || 500))
    };
    const expectedAnswer = String(req.body.expectedAnswer ?? '').trim();
    const retrieved = retrieve(question, corpus, config.topK, config.chunkSize);

    const execute = async (method: 'direct' | 'rag'): Promise<Result> => {
      const started = performance.now();
      const context = method === 'rag' ? retrieved : [];
      const output = await generate({ question, context, model: config.model, temperature: config.temperature }, config.provider);
      const latencyMs = Math.round(performance.now() - started);
      const metrics: Metrics = {
        latencyMs, inputTokens: output.inputTokens, outputTokens: output.outputTokens,
        costUsd: cost(config.model, output.inputTokens, output.outputTokens),
        ...evaluate(output.text, context, expectedAnswer)
      };
      return { method, answer: output.text, metrics, retrieved: context, model: output.model };
    };
    const [direct, rag] = await Promise.all([execute('direct'), execute('rag')]);
    const run: BenchmarkRun = { id: randomUUID(), createdAt: new Date().toISOString(), question, expectedAnswer, config, direct, rag };
    await saveRun(run);
    res.json(run);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro inesperado.' });
  }
});

app.get('/api/summary', async (_req, res) => {
  const runs = await loadRuns();
  const empty: Metrics = { latencyMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, sourceAdherence: 0, answerCoverage: 0, citationPrecision: 0, groundedClaims: 0 };
  const avg = (method: 'direct' | 'rag') => runs.length ? Object.fromEntries(Object.keys(empty).map(k => [k, runs.reduce((s, r) => s + Number(r[method].metrics[k as keyof Metrics]), 0) / runs.length])) as unknown as Metrics : { ...empty };
  const wins = runs.reduce((a, r) => {
    const d = r.direct.metrics.answerCoverage + r.direct.metrics.groundedClaims;
    const g = r.rag.metrics.answerCoverage + r.rag.metrics.groundedClaims;
    if (Math.abs(d - g) < .02) a.ties++; else if (g > d) a.rag++; else a.direct++; return a;
  }, { rag: 0, direct: 0, ties: 0 });
  const summary: Summary = { totalRuns: runs.length, averages: { direct: avg('direct'), rag: avg('rag') }, wins };
  res.json(summary);
});

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(dirname, '../dist');
app.use(express.static(dist));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`GroundTruth API em http://localhost:${port}`));
