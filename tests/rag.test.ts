import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { corpus } from '../server/corpus.js';
import { chunkCorpus, retrieve, tokenize } from '../server/rag.js';
import { evaluate } from '../server/evaluation.js';

describe('pipeline de recuperação', () => {
  it('normaliza português e remove stopwords', () => {
    const result = tokenize('A avaliação é crítica para a educação.');
    ['avaliacao', 'critica', 'educacao'].forEach(term => assert.ok(result.includes(term)));
  });
  it('recupera cultura digital para pergunta sobre tecnologias', () => {
    const [first] = retrieve('Como usar tecnologias digitais de maneira crítica e ética?', corpus, 3, 500);
    assert.ok(first.sourceId.includes('cultura-digital'));
  });
  it('mantém chunks dentro do limite aproximado por sentença', () => {
    const chunks = chunkCorpus(corpus, 250);
    assert.ok(chunks.length > corpus.length);
    assert.ok(chunks.every(c => c.text.length < 500));
  });
});

describe('avaliação', () => {
  it('reconhece citações válidas e resposta fundamentada', () => {
    const retrieved = retrieve('O que é cultura digital?', corpus, 2, 500);
    const answer = `${retrieved[0].text} [1]`;
    const result = evaluate(answer, retrieved);
    assert.equal(result.citationPrecision, 1);
    assert.ok(result.sourceAdherence > .9);
    assert.ok(result.groundedClaims > .8);
  });
  it('penaliza citações inexistentes', () => {
    const retrieved = retrieve('avaliação', corpus, 1, 500);
    assert.equal(evaluate('Uma afirmação qualquer e sem apoio adequado [4].', retrieved).citationPrecision, 0);
  });
});
