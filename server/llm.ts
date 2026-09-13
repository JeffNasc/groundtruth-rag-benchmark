import type { RetrievedChunk } from '../src/types.js';

export interface GenerateInput { question: string; context?: RetrievedChunk[]; model: string; temperature: number; }
export interface GenerateOutput { text: string; inputTokens: number; outputTokens: number; model: string; }

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

function demoAnswer({ question, context }: GenerateInput): GenerateOutput {
  const q = question.toLocaleLowerCase('pt-BR');
  let text: string;
  if (context?.length) {
    const main = context[0];
    const second = context[1];
    text = `Com base no corpus, ${main.text.charAt(0).toLocaleLowerCase('pt-BR')}${main.text.slice(1)} [1]`;
    if (second && second.score > 0) text += ` Além disso, ${second.text.charAt(0).toLocaleLowerCase('pt-BR')}${second.text.slice(1)} [2]`;
  } else if (q.includes('cultura digital') || q.includes('tecnolog')) {
    text = 'A cultura digital na educação envolve o uso crítico, ético e criativo de tecnologias para comunicação, aprendizagem, resolução de problemas e participação social.';
  } else if (q.includes('avalia')) {
    text = 'A avaliação formativa acompanha o processo de aprendizagem e produz evidências para ajustar o ensino e apoiar o desenvolvimento dos estudantes.';
  } else if (q.includes('equidade') || q.includes('diversidade')) {
    text = 'Equidade educacional significa reconhecer necessidades diferentes e oferecer condições adequadas para garantir o direito de aprendizagem de todos.';
  } else {
    text = 'A BNCC orienta o desenvolvimento integral dos estudantes por meio da articulação de conhecimentos, habilidades, atitudes e valores, com atenção à autonomia, cidadania e pensamento crítico.';
  }
  return { text, inputTokens: estimateTokens(question + (context?.map(c => c.text).join(' ') ?? '')), outputTokens: estimateTokens(text), model: 'demo-deterministic-v1' };
}

export async function generate(input: GenerateInput, provider: 'demo' | 'openai'): Promise<GenerateOutput> {
  if (provider === 'demo') return demoAnswer(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada. Use o modo demonstração ou configure a variável de ambiente.');
  const contextBlock = input.context?.length
    ? `\nUse exclusivamente as fontes abaixo. Cite afirmações usando [1], [2] etc. Se a resposta não estiver nas fontes, diga isso.\n\n${input.context.map(c => `[${c.rank}] ${c.title} — ${c.section}\n${c.text}`).join('\n\n')}`
    : '\nResponda com seu conhecimento interno, sem fingir que consultou fontes e sem inventar citações.';
  const body = {
    model: input.model,
    temperature: input.temperature,
    input: [
      { role: 'system', content: `Você participa de um benchmark acadêmico. Responda em português brasileiro, de forma objetiva.${contextBlock}` },
      { role: 'user', content: input.question }
    ]
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`OpenAI API (${response.status}): ${await response.text()}`);
  const data = await response.json() as any;
  const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).find((c: any) => c.type === 'output_text')?.text ?? '';
  return { text, inputTokens: data.usage?.input_tokens ?? estimateTokens(JSON.stringify(body.input)), outputTokens: data.usage?.output_tokens ?? estimateTokens(text), model: data.model ?? input.model };
}
