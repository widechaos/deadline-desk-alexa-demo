import { mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("evidence/voice-eval", { recursive: true });
const cases = [
  ["What should I return first?", "triage"],
  ["Why is this the deadline?", "explain"],
  ["Help me prepare a return checklist.", "prepare"],
  ["Draft a message to the merchant.", "draft"],
  ["Create a calendar reminder.", "calendar"],
  ["I have already returned this purchase.", "complete"],
];
const orders = [
  {
    id: "demo",
    merchant: "Demo",
    item: "Headphones",
    amount: 129,
    currency: "USD",
    delivered: "2026-09-05",
    days: 30,
    receipt: "Delivery: 2026-09-05",
    policy: "Returns within 30 days after delivery",
    status: "open",
  },
];
const results = [];
for (let i = 0; i < cases.length; i++) {
  const [source, expected] = cases[i];
  const start = performance.now();
  const sr = await fetch("http://127.0.0.1:4176/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: await readFile(`test-fixtures/voice/${i}.wav`),
  });
  const speech = await sr.json();
  if (!sr.ok) throw new Error(speech.error);
  const ar = await fetch("http://127.0.0.1:4176/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: speech.text,
      orders,
      selectedId: "demo",
      today: "2026-10-03",
    }),
  });
  const action = await ar.json();
  results.push({
    source,
    transcript: speech.text,
    expected,
    actual: action.intent,
    pass: action.intent === expected,
    seconds: Math.round((performance.now() - start) / 100) / 10,
  });
}
await writeFile(
  "evidence/voice-eval/results.json",
  JSON.stringify(
    { synthetic: true, speaker: "Kokoro v1.0 af_sarah", results },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.pass)) process.exitCode = 1;
