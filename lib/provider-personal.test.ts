import { expect, it, vi } from 'vitest';
import { generateDraft, claudeSchema } from './ai-provider';
import { exampleDraft } from './assistant';
const input={mode:'food' as const,description:'Make that 200g of banana',consent:true as const,facts:[],history:[{role:'user' as const,content:'150g banana'},{role:'assistant' as const,content:'Banana: 150 grams'}]};
it('sends bounded conversation history to OpenAI with only the personal key',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(exampleDraft('food'))}]}]}));await generateDraft(input,fetcher,{provider:'openai',key:'unit-personal-key'});expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer unit-personal-key');const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.input).toHaveLength(3);expect(body.store).toBe(false);expect(JSON.stringify(body)).not.toContain('unit-personal-key');});
it('uses Anthropic Messages and validates the structured response locally',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(exampleDraft('food'))}]}));expect(await generateDraft(input,fetcher,{provider:'anthropic',key:'unit-personal-key'})).toEqual(exampleDraft('food'));expect(fetcher.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');expect(fetcher.mock.calls[0][1].headers['x-api-key']).toBe('unit-personal-key');const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.messages).toHaveLength(3);expect(body.output_config.format.type).toBe('json_schema');expect(body.max_tokens).toBe(2500);});
it.each(['refusal','max_tokens'])('rejects %s without retrying or saving partial output',async reason=>{const fetcher=vi.fn().mockResolvedValue(Response.json({stop_reason:reason,content:[{type:'text',text:'{}'}]}));await expect(generateDraft(input,fetcher,{provider:'anthropic',key:'unit-personal-key'})).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);});
it('removes unsupported Claude schema bounds without weakening local validation',()=>{expect(claudeSchema({type:'object',additionalProperties:false,properties:{amount:{type:'number',minimum:1,maximum:10}}})).toEqual({type:'object',additionalProperties:false,properties:{amount:{type:'number'}}});});

it.each(['food', 'workout', 'meals', 'review'] as const)('uses economical models and deliberate effort for %s without paid tools or retries', async mode => {
 for (const provider of ['openai', 'anthropic'] as const) {
  const draft = exampleDraft(mode);
  const envelope = provider === 'openai' ? {status:'completed', output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft)}]}]} : {stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(draft)}]};
  const fetcher = vi.fn().mockResolvedValue(Response.json(envelope));
  await generateDraft({...input, mode}, fetcher, {provider,key:'unit-personal-key'});
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe(provider === 'openai' ? 'gpt-6-luna' : 'claude-haiku-5-5');
  if (provider === 'openai') expect(body.reasoning.effort).toBe(mode === 'food' ? 'none' : 'low');
  else { expect(body.thinking.type).toBe(mode === 'food' ? 'disabled' : 'adaptive'); expect(body.output_config.effort).toBe('low'); }
  const prompt = provider === 'openai' ? body.instructions : body.system;
  expect(prompt.includes('dumbbell-bench-press')).toBe(mode === 'workout');
  expect(body).not.toHaveProperty('tools'); expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
