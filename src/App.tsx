import { useEffect, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Check, ChevronDown, Clock3, Database, FlaskConical, Gauge, History, Info, Layers3, Play, RotateCcw, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import type { BenchmarkConfig, BenchmarkRun, Metrics, RetrievedChunk, Source, Summary } from './types';

const questions = [
  'Como a BNCC define o uso responsável das tecnologias digitais?',
  'Qual é o papel da avaliação formativa no processo de aprendizagem?',
  'Como equidade e igualdade educacional se diferenciam?',
  'O que caracteriza o pensamento científico, crítico e criativo?'
];
const defaultConfig: BenchmarkConfig = { provider: 'demo', model: 'gpt-4.1-mini', topK: 3, temperature: 0, chunkSize: 500 };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const ms = (n: number) => n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`;
const money = (n: number) => n ? `$${n.toFixed(5)}` : '—';

function Metric({ label, direct, rag, format = String, higher = false }: { label: string; direct: number; rag: number; format?: (n: number) => string; higher?: boolean }) {
  const winner = Math.abs(direct - rag) < .0001 ? null : (higher ? (direct > rag ? 'direct' : 'rag') : (direct < rag ? 'direct' : 'rag'));
  return <div className="metric-row"><span>{label}</span><strong className={winner === 'direct' ? 'winner direct-text' : ''}>{format(direct)}</strong><strong className={winner === 'rag' ? 'winner rag-text' : ''}>{format(rag)}</strong></div>;
}

function ScoreRing({ value, color }: { value: number; color: string }) {
  const deg = Math.round(value * 360);
  return <div className="score-ring" style={{ background: `conic-gradient(${color} ${deg}deg, var(--line) 0deg)` }}><div>{pct(value)}</div></div>;
}

function AnswerCard({ title, subtitle, result, accent }: { title: string; subtitle: string; result: BenchmarkRun['direct']; accent: 'direct' | 'rag' }) {
  return <article className={`answer-card ${accent}`}>
    <div className="answer-head"><div className="method-icon">{accent === 'rag' ? <Layers3 size={19}/> : <Sparkles size={19}/>}</div><div><h3>{title}</h3><p>{subtitle}</p></div><span className="model-tag">{result.model}</span></div>
    <div className="answer-body">{result.answer}</div>
    <div className="score-strip">
      <div><ScoreRing value={result.metrics.answerCoverage} color={accent === 'rag' ? '#5ee1a0' : '#a78bfa'}/><span>Cobertura</span></div>
      <div><ScoreRing value={result.metrics.sourceAdherence} color={accent === 'rag' ? '#5ee1a0' : '#a78bfa'}/><span>Aderência</span></div>
      <div><ScoreRing value={result.metrics.groundedClaims} color={accent === 'rag' ? '#5ee1a0' : '#a78bfa'}/><span>Fundamentação</span></div>
    </div>
  </article>;
}

function Sources({ chunks }: { chunks: RetrievedChunk[] }) {
  return <div className="sources"><h3><BookOpen size={18}/> Evidências recuperadas</h3>{chunks.map(c => <details key={c.sourceId} className="source" open={c.rank === 1}>
    <summary><span className="rank">{c.rank}</span><span><strong>{c.title}</strong><small>{c.section}</small></span><span className="relevance">{c.score.toFixed(2)}</span><ChevronDown size={16}/></summary>
    <p>{c.text}</p>
  </details>)}</div>;
}

export default function App() {
  const [question, setQuestion] = useState(questions[0]);
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [config, setConfig] = useState(defaultConfig);
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [corpus, setCorpus] = useState<Source[]>([]);
  const [tab, setTab] = useState<'experiment' | 'history' | 'corpus'>('experiment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openaiConfigured, setOpenaiConfigured] = useState(false);

  const refresh = async () => {
    const [r, s, c, h] = await Promise.all([fetch('/api/runs'), fetch('/api/summary'), fetch('/api/corpus'), fetch('/api/health')]);
    setRuns(await r.json()); setSummary(await s.json()); setCorpus(await c.json()); setOpenaiConfigured((await h.json()).openaiConfigured);
  };
  useEffect(() => { refresh().catch(() => setError('Não foi possível conectar à API.')); }, []);
  const execute = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, expectedAnswer, config }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setRun(data); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao executar.'); } finally { setLoading(false); }
  };
  const clear = async () => { await fetch('/api/runs', { method: 'DELETE' }); setRun(null); await refresh(); };

  return <div className="app">
    <header><a className="brand"><span><ShieldCheck size={23}/></span><div>GroundTruth<small>RAG BENCHMARK LAB</small></div></a><nav>
      <button className={tab === 'experiment' ? 'active' : ''} onClick={() => setTab('experiment')}><FlaskConical size={16}/> Experimento</button>
      <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History size={16}/> Histórico</button>
      <button className={tab === 'corpus' ? 'active' : ''} onClick={() => setTab('corpus')}><Database size={16}/> Corpus</button>
    </nav><div className="status"><i className={openaiConfigured ? 'online' : ''}/>{openaiConfigured ? 'OpenAI pronta' : 'Modo local'}</div></header>

    {tab === 'experiment' && <main>
      <section className="hero"><div className="eyebrow"><Activity size={14}/> BENCHMARK PAREADO</div><h1>RAG melhora a resposta<br/>ou apenas <em>adiciona custo?</em></h1><p>Compare geração direta e recuperação aumentada sob as mesmas condições. Meça qualidade, latência, tokens e rastreabilidade.</p></section>
      <section className="control-panel">
        <div className="control-main"><label>Pergunta de pesquisa</label><textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}/><div className="quick">{questions.map((q, i) => <button key={q} onClick={() => setQuestion(q)}>Q{i + 1}</button>)}</div>
          <details className="expected"><summary>Adicionar resposta de referência (recomendado para avaliação)</summary><textarea placeholder="Gabarito humano opcional para medir cobertura..." value={expectedAnswer} onChange={e => setExpectedAnswer(e.target.value)} rows={2}/></details>
        </div>
        <div className="config"><div><label>Motor</label><select value={config.provider} onChange={e => setConfig({ ...config, provider: e.target.value as BenchmarkConfig['provider'] })}><option value="demo">Demo determinístico</option><option value="openai" disabled={!openaiConfigured}>OpenAI API {!openaiConfigured ? '(sem chave)' : ''}</option></select></div>
          <div><label>Modelo</label><select value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })}><option>gpt-4.1-mini</option><option>gpt-4.1</option><option>gpt-4o-mini</option><option>gpt-4o</option></select></div>
          <div className="two"><label>Top K <b>{config.topK}</b><input type="range" min="1" max="6" value={config.topK} onChange={e => setConfig({ ...config, topK: +e.target.value })}/></label><label>Chunk <b>{config.chunkSize}</b><input type="range" min="200" max="1000" step="100" value={config.chunkSize} onChange={e => setConfig({ ...config, chunkSize: +e.target.value })}/></label></div>
          <button className="run" onClick={execute} disabled={loading || question.trim().length < 5}>{loading ? <><span className="spinner"/> Executando pares…</> : <><Play size={17} fill="currentColor"/> Executar benchmark</>}</button>
        </div>
      </section>
      {error && <div className="error"><Info size={18}/>{error}</div>}
      {!run && !loading && <section className="empty"><div><FlaskConical size={32}/></div><h2>Pronto para o primeiro experimento</h2><p>As duas abordagens serão executadas em paralelo com os mesmos parâmetros.</p></section>}
      {loading && <section className="loading"><div className="scan"/><p>Consultando o modelo direto e o pipeline RAG…</p></section>}
      {run && !loading && <>
        <div className="section-title"><div><span>RESULTADO MAIS RECENTE</span><h2>Comparação lado a lado</h2></div><time>{new Date(run.createdAt).toLocaleString('pt-BR')}</time></div>
        <section className="answers"><AnswerCard title="Geração direta" subtitle="Conhecimento paramétrico do modelo" result={run.direct} accent="direct"/><AnswerCard title="RAG" subtitle={`${run.rag.retrieved.length} trechos recuperados do corpus`} result={run.rag} accent="rag"/></section>
        <section className="analysis-grid"><div className="metrics card"><h3><Gauge size={18}/> Métricas comparativas</h3><div className="metric-head"><span/><b>DIRETO</b><b>RAG</b></div>
          <Metric label="Latência" direct={run.direct.metrics.latencyMs} rag={run.rag.metrics.latencyMs} format={ms}/><Metric label="Tokens de entrada" direct={run.direct.metrics.inputTokens} rag={run.rag.metrics.inputTokens}/><Metric label="Tokens de saída" direct={run.direct.metrics.outputTokens} rag={run.rag.metrics.outputTokens}/><Metric label="Custo estimado" direct={run.direct.metrics.costUsd} rag={run.rag.metrics.costUsd} format={money}/><Metric label="Cobertura" direct={run.direct.metrics.answerCoverage} rag={run.rag.metrics.answerCoverage} format={pct} higher/><Metric label="Aderência à fonte" direct={run.direct.metrics.sourceAdherence} rag={run.rag.metrics.sourceAdherence} format={pct} higher/><Metric label="Precisão das citações" direct={run.direct.metrics.citationPrecision} rag={run.rag.metrics.citationPrecision} format={pct} higher/>
        </div><div className="chart card"><h3><Activity size={18}/> Qualidade observada</h3><div className="chart-legend"><span><i className="direct-dot"/>Direto</span><span><i className="rag-dot"/>RAG</span></div>{([
          ['Cobertura', run.direct.metrics.answerCoverage, run.rag.metrics.answerCoverage],
          ['Aderência', run.direct.metrics.sourceAdherence, run.rag.metrics.sourceAdherence],
          ['Fundamentação', run.direct.metrics.groundedClaims, run.rag.metrics.groundedClaims]
        ] as [string, number, number][]).map(([label, direct, rag]) => <div className="chart-row" key={label}><span>{label}</span><div><i className="direct-bar" style={{width:`${direct * 100}%`}}><b>{pct(direct)}</b></i></div><div><i className="rag-bar" style={{width:`${rag * 100}%`}}><b>{pct(rag)}</b></i></div></div>)}</div></section>
        <Sources chunks={run.rag.retrieved}/>
      </>}
    </main>}

    {tab === 'history' && <main><section className="page-title"><div><span>REPRODUTIBILIDADE</span><h1>Histórico de execuções</h1><p>Até 100 experimentos são persistidos localmente.</p></div>{runs.length > 0 && <button className="ghost danger" onClick={clear}><RotateCcw size={15}/> Limpar histórico</button>}</section>
      {!runs.length ? <section className="empty"><History size={32}/><h2>Nenhuma execução ainda</h2></section> : <div className="run-list">{runs.map(r => <button key={r.id} onClick={() => { setRun(r); setTab('experiment'); }}><div className="run-date">{new Date(r.createdAt).toLocaleDateString('pt-BR')}<small>{new Date(r.createdAt).toLocaleTimeString('pt-BR')}</small></div><div><strong>{r.question}</strong><span>{r.config.provider} · {r.config.model} · top {r.config.topK}</span></div><div className="mini-scores"><span>Direto <b>{pct(r.direct.metrics.answerCoverage)}</b></span><span>RAG <b>{pct(r.rag.metrics.answerCoverage)}</b></span></div><ArrowRight size={17}/></button>)}</div>}
    </main>}

    {tab === 'corpus' && <main><section className="page-title"><div><span>BASE DE CONHECIMENTO</span><h1>Corpus demonstrativo</h1><p>{corpus.length} documentos autorais inspirados nos temas da BNCC. Para pesquisa formal, substitua pelos textos oficiais.</p></div><div className="corpus-count"><Database size={20}/><b>{corpus.length}</b> fontes</div></section><div className="corpus-grid">{corpus.map((doc, i) => <article key={doc.id}><span>DOC {String(i+1).padStart(2,'0')}</span><h3>{doc.title}</h3><small>{doc.section}</small><p>{doc.text}</p><footer><Check size={14}/> Indexado por BM25</footer></article>)}</div></main>}
    <footer className="footer"><span>GroundTruth Lab · protótipo acadêmico</span><span><Zap size={13}/> Execução local e reproduzível</span></footer>
  </div>;
}
