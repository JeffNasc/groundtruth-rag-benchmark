export type Method = 'direct' | 'rag';
export interface Source { id: string; title: string; section: string; text: string; }
export interface RetrievedChunk { sourceId: string; title: string; section: string; text: string; score: number; rank: number; }
export interface Metrics { latencyMs: number; inputTokens: number; outputTokens: number; costUsd: number; sourceAdherence: number; answerCoverage: number; citationPrecision: number; groundedClaims: number; }
export interface Result { method: Method; answer: string; metrics: Metrics; retrieved: RetrievedChunk[]; model: string; }
export interface BenchmarkRun { id: string; createdAt: string; question: string; expectedAnswer?: string; config: BenchmarkConfig; direct: Result; rag: Result; }
export interface BenchmarkConfig { provider: 'demo' | 'openai'; model: string; topK: number; temperature: number; chunkSize: number; }
export interface Summary { totalRuns: number; averages: Record<Method, Metrics>; wins: { rag: number; direct: number; ties: number }; }
