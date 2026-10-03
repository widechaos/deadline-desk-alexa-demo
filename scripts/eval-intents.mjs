import { writeFile, mkdir } from "node:fs/promises";
const orders = [
  {
    id: "a",
    merchant: "Demo",
    item: "Headphones",
    amount: 129,
    currency: "USD",
    delivered: "2026-09-05",
    days: 30,
    receipt: "Delivered on 2026-09-05",
    policy: "30 days from delivery",
    status: "open",
  },
];
const cases = [
  ["Which of my purchases should I deal with before the others?", "triage"],
  ["Is anything about to expire?", "triage"],
  ["Show the basis for that return date", "explain"],
  ["Can you walk me through the calculation?", "explain"],
  ["What do I need to pack?", "prepare"],
  ["Give me the steps to send it back", "prepare"],
  ["Write a polite return request", "draft"],
  ["Can you compose an email asking the shop to take this back?", "draft"],
  ["Put the cutoff in my calendar", "calendar"],
  ["Set an alert so I do not miss it", "calendar"],
  ["The shop took the headphones back today", "complete"],
  ["I have finished the return, update the case", "complete"],
  ["What is 17 times 32?", "clarify"],
  ["Who won the World Cup?", "clarify"],
  ["帮我看看哪个快到期了", "triage"],
  ["告诉我这个退货日期的依据", "explain"],
  ["给我一个退货准备清单", "prepare"],
  ["我已经退了，帮我记一下", "complete"],
  ["Book a flight for me", "clarify"],
  ["I want to return it, but have not yet", "prepare"],
];
const results = [];
for (const [message, expected] of cases) {
  const r = await fetch("http://127.0.0.1:4176/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      orders,
      selectedId: "a",
      today: "2026-10-02",
    }),
  });
  const j = await r.json();
  results.push({
    message,
    expected,
    actual: j.intent,
    pass: j.intent === expected,
    error: j.error,
  });
}
await mkdir("evidence", { recursive: true });
await writeFile(
  "evidence/intent-eval-4b.json",
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      passed: results.filter((r) => r.pass).length,
      total: results.length,
      failures: results.filter((r) => !r.pass),
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
