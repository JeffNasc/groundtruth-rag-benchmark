import { tokenize } from './rag.js';
import type { Metrics, RetrievedChunk } from '../src/types.js';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const overlap = (a: string[], b: string[]) => {
  const target = new Set(b); const unique = [...new Set(a)];
  return unique.length ? unique.filter(x => target.has(x)).length / unique.length : 0;
};

export function evaluate(answer: string, retrieved: RetrievedChunk[], expectedAnswer = ''): Pick<Metrics, 'sourceAdherence' | 'answerCoverage' | 'citationPrecision' | 'groundedClaims'> {
  const context = retrieved.map(r => r.text).join(' ');
  const answerTerms = tokenize(answer);
  const sourceAdherence = retrieved.length ? overlap(answerTerms, tokenize(context)) : 0;
  const answerCoverage = expectedAnswer ? overlap(tokenize(expectedAnswer), answerTerms) : sourceAdherence;
  const citations = [...answer.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
  const valid = citations.filter(n => n >= 1 && n <= retrieved.length).length;
  const citationPrecision = citations.length ? valid / citations.length : 0;
  const claims = answer.split(/[.!?]+/).map(s => s.trim()).filter(s => tokenize(s).length >= 4);
  const groundedClaims = retrieved.length && claims.length ? claims.filter(c => overlap(tokenize(c), tokenize(context)) >= 0.45).length / claims.length : 0;
  return { sourceAdherence: clamp(sourceAdherence), answerCoverage: clamp(answerCoverage), citationPrecision, groundedClaims };
}
