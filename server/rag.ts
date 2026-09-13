import type { RetrievedChunk, Source } from '../src/types.js';

const STOP = new Set('a o as os um uma de da do das dos e em no na nos nas para por com que se ao aos como sua seu suas seus deve ser'.split(' '));

export function tokenize(text: string): string[] {
  return text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));
}

export function chunkCorpus(sources: Source[], chunkSize = 500): Source[] {
  return sources.flatMap(source => {
    const sentences = source.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [source.text];
    const chunks: Source[] = [];
    let current = '';
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > chunkSize) {
        chunks.push({ ...source, id: `${source.id}#${chunks.length + 1}`, text: current.trim() });
        current = '';
      }
      current += `${sentence.trim()} `;
    }
    if (current.trim()) chunks.push({ ...source, id: `${source.id}#${chunks.length + 1}`, text: current.trim() });
    return chunks;
  });
}

export function retrieve(query: string, sources: Source[], topK = 3, chunkSize = 500): RetrievedChunk[] {
  const docs = chunkCorpus(sources, chunkSize);
  const queryTerms = tokenize(query);
  const documentFrequency = new Map<string, number>();
  docs.forEach(doc => new Set(tokenize(doc.text)).forEach(t => documentFrequency.set(t, (documentFrequency.get(t) ?? 0) + 1)));
  const avgLength = docs.reduce((sum, d) => sum + tokenize(d.text).length, 0) / Math.max(docs.length, 1);
  const k1 = 1.5, b = 0.75;
  return docs.map(doc => {
    const tokens = tokenize(`${doc.title} ${doc.section} ${doc.text}`);
    const freq = new Map<string, number>();
    tokens.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1));
    const score = queryTerms.reduce((sum, term) => {
      const tf = freq.get(term) ?? 0;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      return sum + idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * tokens.length / Math.max(avgLength, 1)));
    }, 0);
    return { sourceId: doc.id, title: doc.title, section: doc.section, text: doc.text, score, rank: 0 };
  }).sort((a, b) => b.score - a.score).slice(0, topK).map((item, i) => ({ ...item, rank: i + 1 }));
}
