import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deadline,
  remaining,
  nextOrder,
  calendar,
  actionFor,
  validateOrder,
} from "../logic.mjs";
const order = {
  id: "test",
  merchant: "Demo",
  item: "Lamp",
  amount: 68,
  currency: "USD",
  delivered: "2026-09-28",
  days: 14,
  receipt: "Receipt",
  policy: "Policy",
  status: "open",
};
test("deadline crosses month, leap year and DST without local timezone drift", () => {
  assert.equal(deadline(order), "2026-10-12");
  assert.equal(
    deadline({ ...order, delivered: "2024-02-28", days: 2 }),
    "2024-03-01",
  );
  assert.equal(
    deadline({ ...order, delivered: "2026-03-07", days: 3 }),
    "2026-03-10",
  );
});
test("invalid dates and unsupported windows never become deadlines", () => {
  assert.throws(() => deadline({ ...order, delivered: "2026-02-30" }));
  assert.throws(() => deadline({ ...order, days: -1 }));
  assert.throws(() => validateOrder({ ...order, amount: -1 }));
});
test("triage excludes completed and expired cases; boundary day still open", () => {
  assert.equal(remaining(order, "2026-10-12"), 0);
  assert.equal(
    nextOrder(
      [
        { ...order, status: "returned" },
        { ...order, id: "expired", days: 1 },
        order,
      ],
      "2026-10-02",
    ).id,
    "test",
  );
});
test("calendar event is all-day with exclusive end and unique case ID", () => {
  const ics = calendar(order);
  assert.match(ics, /DTSTART;VALUE=DATE:20261012/);
  assert.match(ics, /DTEND;VALUE=DATE:20261013/);
  assert.match(ics, /UID:test@deadline-desk.local/);
  assert.match(ics, /TRIGGER:-P2D/);
});
test("expired draft requests an exception and complete requires confirmation", () => {
  assert.match(
    actionFor("draft", order, [order], "2026-10-20").text,
    /exception/,
  );
  assert.equal(
    actionFor("complete", order, [order], "2026-10-02").action,
    "confirm",
  );
  assert.equal(order.status, "open");
});
