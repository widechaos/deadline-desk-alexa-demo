export const DAY = 86400000;
export function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use YYYY-MM-DD dates.");
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value)
    throw new Error("Invalid calendar date.");
  return date;
}
export function deadline(order) {
  if (!Number.isInteger(order.days) || order.days < 1 || order.days > 365)
    throw new Error("Return window must be 1–365 days.");
  return new Date(+isoDate(order.delivered) + order.days * DAY)
    .toISOString()
    .slice(0, 10);
}
export function remaining(
  order,
  today = new Date().toISOString().slice(0, 10),
) {
  return Math.round((+isoDate(deadline(order)) - +isoDate(today)) / DAY);
}
export function validateOrder(order) {
  for (const key of ["merchant", "item", "receipt", "policy"])
    if (
      typeof order[key] !== "string" ||
      !order[key].trim() ||
      order[key].length > 8000
    )
      throw new Error("Complete all receipt and policy fields.");
  deadline(order);
  if (!Number.isFinite(order.amount) || order.amount <= 0)
    throw new Error("Amount must be positive.");
  if (!/^[A-Z]{3}$/.test(order.currency))
    throw new Error("Use a three-letter currency code.");
  return order;
}
export function nextOrder(orders, today) {
  return orders
    .filter((o) => o.status !== "returned" && remaining(o, today) >= 0)
    .sort((a, b) => deadline(a).localeCompare(deadline(b)))[0];
}
const escapeICS = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function calendar(order) {
  const day = deadline(order).replaceAll("-", "");
  const next = new Date(+isoDate(deadline(order)) + DAY)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deadline Desk//Return reminder//EN",
    "BEGIN:VEVENT",
    `UID:${order.id}@deadline-desk.local`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${escapeICS("Return " + order.item)}`,
    `DESCRIPTION:${escapeICS("Return deadline based on your reviewed policy. " + order.merchant + ". Bring receipt and original packaging.")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P2D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Return deadline in two days",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function actionFor(intent, order, orders, today) {
  if (intent === "triage") {
    const next = nextOrder(orders, today);
    return {
      text: next
        ? `${next.item} is next: ${remaining(next, today)} days left, until ${deadline(next)}. Select it to review the evidence or prepare a return.`
        : "No open return deadlines remain. Expired purchases and completed returns stay in your case list.",
      orderId: next?.id,
    };
  }
  if (!order)
    return {
      text: "Select a purchase first so I can use its receipt and policy.",
    };
  const left = remaining(order, today);
  const evidence = `Receipt: delivered ${order.delivered}. Reviewed policy: ${order.days} days from delivery. Calculated deadline: ${deadline(order)}. Exceptions are not inferred; confirm eligibility with the merchant.`;
  switch (intent) {
    case "explain":
      return { text: evidence };
    case "prepare":
      return {
        text:
          left < 0
            ? "This return window has expired. I can draft a request for an exception; I cannot promise the merchant will accept it."
            : `Return checklist for ${order.item}:\n1. Check the item meets the policy conditions below.\n2. Keep the receipt and order reference.\n3. Pack the item and included accessories.\n4. Contact ${order.merchant} before ${deadline(order)}.`,
        action: "checklist",
      };
    case "draft":
      return {
        text: `Subject: Return request — ${order.item}\n\nHello ${order.merchant},\nI would like to request a return for ${order.item}, delivered on ${order.delivered}. ${left < 0 ? "I understand the reviewed return window has passed. Could you consider an exception?" : `My reviewed policy gives a deadline of ${deadline(order)}. Please confirm eligibility and provide the next steps.`}\nI have kept the receipt. Please let me know about any fees or required packaging.\nThank you.\n\nDraft only. Add your order reference and check it before sending.`,
        action: "draft",
      };
    case "calendar":
      return {
        text: `Ready to download a calendar reminder for ${deadline(order)}, with an alert two days beforehand. Your calendar app must import and enable the alert.`,
        action: "calendar",
      };
    case "complete":
      return {
        text: `Mark ${order.item} as returned? This records your update; it does not request a refund or verify one.`,
        action: "confirm",
      };
    default:
      return {
        text: "I can prioritize purchases, explain a deadline, prepare a checklist, draft a request, create a calendar reminder, or record a completed return. Which would help?",
      };
  }
}
