# GroundTruth — RAG vs Direct LLM Benchmark

Protótipo acadêmico para comparar, sob as mesmas condições, uma resposta gerada diretamente por um LLM e uma resposta com recuperação aumentada (RAG). O sistema mede qualidade, custo computacional e rastreabilidade.

## O que já está implementado

- execução pareada Direct × RAG em paralelo;
- recuperação local BM25, sem serviço vetorial externo;
- chunking e `top-k` ajustáveis;
- modo determinístico, executável sem credenciais;
- integração opcional com a OpenAI Responses API;
- latência, tokens e custo estimado;
- aderência lexical à fonte, cobertura contra gabarito, fundamentação de afirmações e precisão de citações;
- histórico persistente das últimas 100 execuções;
- corpus demonstrativo sobre temas da BNCC;
- interface responsiva e testes automatizados.

> O corpus incluído contém **resumos autorais demonstrativos**, não transcrições oficiais. Em um estudo formal, substitua-o pelos documentos oficiais, registre versão/data e mantenha um conjunto de perguntas e gabaritos revisado por especialistas.

## Executar

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

A interface abre em `http://localhost:5173`; a API usa `http://localhost:8787`.

Para usar um modelo real, copie `.env.example` para `.env`, preencha `OPENAI_API_KEY` e carregue as variáveis antes de iniciar o processo. No PowerShell:

```powershell
$env:OPENAI_API_KEY="sua-chave"
$env:OPENAI_MODEL="gpt-4.1-mini"
npm run dev
```

Nunca salve a chave no Git.

## Verificação

```bash
npm test
npm run check
npm run build
```

## API

- `GET /api/health` — configuração e disponibilidade;
- `GET /api/corpus` — fontes indexadas;
- `POST /api/benchmark` — executa o par Direct/RAG;
- `GET /api/runs` — histórico;
- `GET /api/summary` — agregados;
- `DELETE /api/runs` — remove o histórico local.

Exemplo de corpo para execução:

```json
{
  "question": "Como a BNCC aborda cultura digital?",
  "expectedAnswer": "",
  "config": {
    "provider": "demo",
    "model": "gpt-4.1-mini",
    "topK": 3,
    "temperature": 0,
    "chunkSize": 500
  }
}
```

## Limitações metodológicas atuais

As métricas de qualidade incluídas são heurísticas lexicais e servem para prototipagem, não como prova definitiva de correção semântica. Uma pesquisa robusta deve acrescentar avaliação humana cega, métricas de recuperação com relevância anotada, repetição com múltiplas sementes, intervalos de confiança e um juiz independente com rubrica versionada. Os preços embutidos são apenas estimativas e devem ser atualizados antes de publicar resultados.
