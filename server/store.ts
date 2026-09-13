import fs from 'node:fs/promises';
import path from 'node:path';
import type { BenchmarkRun } from '../src/types.js';

const dataDir = path.resolve('data');
const filePath = path.join(dataDir, 'runs.json');

export async function loadRuns(): Promise<BenchmarkRun[]> {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return []; }
}
export async function saveRun(run: BenchmarkRun) {
  await fs.mkdir(dataDir, { recursive: true });
  const runs = await loadRuns();
  runs.unshift(run);
  await fs.writeFile(filePath, JSON.stringify(runs.slice(0, 100), null, 2), 'utf8');
}
export async function clearRuns() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, '[]', 'utf8');
}
