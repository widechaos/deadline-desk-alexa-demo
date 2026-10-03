import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyExtraction } from "../extract.mjs";
const receipt =
  "Merchant: Example Shop\nItem: Lamp\nDelivery: 2026-09-28\nTotal: USD 68";
const policy = "Returns within 14 days after delivery. Unused items only.";
const candidate = {
  merchant: "Example Shop",
  item: "Lamp",
  amount: 68,
  currency: "USD",
  delivered: "2026-09-28",
  days: 14,
  delivery_quote: "Delivery: 2026-09-28",
  window_quote: "Returns within 14 days after delivery.",
};
test("exact evidence supports a candidate, never bypasses human review", () => {
  const result = verifyExtraction(candidate, receipt, policy);
  assert.equal(result.fields.delivered, "2026-09-28");
  assert.equal(result.fields.days, 14);
  assert.equal(result.reviewRequired, true);
});
test("fabricated quote or date cannot be accepted", () => {
  assert.equal(
    verifyExtraction({ ...candidate, delivered: "2026-09-29" }, receipt, policy)
      .fields.delivered,
    undefined,
  );
  assert.equal(
    verifyExtraction(
      {
        ...candidate,
        window_quote: "Returns within 14 days after delivery, guaranteed.",
      },
      receipt,
      policy,
    ).fields.days,
    undefined,
  );
});
test("purchase date and conflicting policy windows require review", () => {
  assert.equal(
    verifyExtraction(
      { ...candidate, delivery_quote: "Purchased: 2026-09-28" },
      receipt,
      policy,
    ).fields.delivered,
    undefined,
  );
  assert.equal(
    verifyExtraction(candidate, receipt, policy + " Electronics: 7 days.")
      .fields.days,
    undefined,
  );
});
