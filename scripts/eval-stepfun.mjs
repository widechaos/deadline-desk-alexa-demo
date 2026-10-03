import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Generated speech is a synthetic stress test, never a human usability study.
const cases = [
  ['neutral-us', 'What should I return first?', 'triage', 'Neutral conversational American English.'],
  ['urgent-uk', 'Please tell me which return needs my attention first.', 'triage', 'Urgent but intelligible British English.'],
  ['frustrated', 'Why is this the deadline? I am really frustrated.', 'explain', 'Frustrated, slightly faster American English.'],
  ['calm-indian', 'Help me prepare a return checklist.', 'prepare', 'Calm Indian English accent, natural pace.'],
  ['hesitant', 'Um, could you draft a message to the merchant?', 'draft', 'Hesitant English, with a short pause after Um.'],
  ['excited', 'Create a calendar reminder for this return!', 'calendar', 'Excited English, clear articulation.'],
  ['relieved', 'I have already returned this purchase.', 'complete', 'Relieved British English, relaxed pace.'],
  ['negation', 'I have not returned this purchase yet. Help me prepare a checklist.', 'prepare', 'Serious English. Emphasize not.'],
  ['self-correction', 'Create a reminder. Actually, no, draft a message to the merchant instead.', 'draft', 'Conversational English. Pause before Actually and emphasize instead.'],
  ['soft-voice', 'Why is this the deadline?', 'explain', 'Soft spoken English, low but audible volume.'],
  ['arabic-accent-request', 'Please draft a message to the merchant.', 'draft', 'English with a mild Arabic accent, clear and natural.'],
  ['inline-control', 'Please help me prepare a return checklist.', 'prepare', 'Reassuring English, slow and clear.'],
].map(([id, text, expected, instruction]) => ({id, text, expected, instruction}));
const root = 'evidence/stepfun-stress';
await mkdir(root, {recursive:true});
const manifest = {
  synthetic:true, model:'stepaudio-3-tts', voice:'vibrant-youth',
  endpoint:'https://api.stepfun.ai/v1/audio/speech',
  styleValidation:'Requested synthesis instructions; accent/emotion fidelity has not been independently validated.',
  cases,
};
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest,null,2));
const generate = process.argv.includes('--generate');
const evaluate = process.argv.includes('--evaluate');
if (generate) {
  if (process.env.STEPFUN_SPENDING_APPROVED !== 'yes') throw new Error('Explicit account and budget approval required.');
  const key = process.env.STEPFUN_API_KEY;
  if (!key) throw new Error('STEPFUN_API_KEY is missing.');
  let attempts=[];
  try { attempts=JSON.parse(await readFile(`${root}/attempts.json`,'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Conservatively count text plus instructions, including punctuation and spaces.
  const characters = cases.reduce((n,c)=>n+c.text.length+c.instruction.length+80,0);
  const estimatedUsd = characters / 10000 * 0.36;
  if (estimatedUsd > 0.10) throw new Error('Conservative test budget exceeded.');
  await writeFile(`${root}/budget.json`,JSON.stringify({characters,estimatedUsd,rateUsdPer10000:0.36,maxRequests:12,automaticRetries:0},null,2));
  for (const c of cases) {
    try { await readFile(`${root}/${c.id}.wav`); continue; } catch {}
    if (attempts.length >= 12) throw new Error('12-request cap reached; no more paid requests.');
    const input = c.id === 'inline-control' ? '(reassuring, pause briefly) Please help me prepare (slowly, clearly) a return checklist.' : c.text;
    attempts.push({id:c.id,startedAt:new Date().toISOString()});
    await writeFile(`${root}/attempts.json`,JSON.stringify(attempts,null,2));
    const response = await fetch(manifest.endpoint, {
      method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:manifest.model,voice:manifest.voice,input,instruction:c.instruction,language:'en',response_format:'wav',sample_rate:16000}),
      signal:AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Synthesis failed: HTTP ${response.status}; no automatic retry.`);
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.toString('ascii',0,4)!=='RIFF') throw new Error('Unexpected audio format.');
    await writeFile(`${root}/${c.id}.wav`,audio);
    console.log(`Generated synthetic clip: ${c.id}`);
  }
}
if (evaluate) {
  const orders=[{id:'demo',merchant:'Demo',item:'Headphones',amount:129,currency:'USD',delivered:'2026-09-05',days:30,receipt:'Delivery: 2026-09-05',policy:'Returns within 30 days after delivery',status:'open'}];
  const results=[];
  for (const c of cases) {
    const speechResponse=await fetch('http://127.0.0.1:4176/api/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav'},body:await readFile(`${root}/${c.id}.wav`)});
    const speech=await speechResponse.json();
    if (!speechResponse.ok) {results.push({...c,pass:false,stage:'transcription',httpStatus:speechResponse.status});continue;}
    const actionResponse=await fetch('http://127.0.0.1:4176/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:speech.text,orders,selectedId:'demo',today:'2026-10-03'})});
    const action=await actionResponse.json();
    const normalize = text => text.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
    const confirmationSafe = action.intent !== 'complete' || action.action === 'confirm';
    results.push({...c,transcript:speech.text,actual:action.intent,pass:actionResponse.ok && action.intent===c.expected && confirmationSafe,promptTextMatch:normalize(speech.text)===normalize(c.text),confirmationSafe,action});
  }
  await writeFile(`${root}/results.json`,JSON.stringify({...manifest,results},null,2));
  console.log(JSON.stringify(results.map(({id,transcript,expected,actual,pass})=>({id,transcript,expected,actual,pass})),null,2));
  if (results.some(r=>!r.pass)) process.exitCode=1;
}
if (!generate && !evaluate) console.log('Prepared 12 synthetic cases. Use --generate after budget approval, then --evaluate.');
