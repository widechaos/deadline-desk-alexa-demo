import { deadline, remaining, validateOrder, calendar } from "/logic.mjs";
const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
const relative = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const samples = [
  {
    id: "demo-headphones",
    merchant: "Northline Audio (fictional)",
    item: "Studio headphones",
    amount: 129,
    currency: "USD",
    delivered: relative(-27),
    days: 30,
    receipt: `SYNTHETIC RECEIPT · NA-1042\nStudio headphones · USD 129\nDelivery: ${relative(-27)}`,
    policy:
      "SYNTHETIC POLICY\nReturns accepted within 30 days after delivery. Item must be undamaged, with all accessories and original packaging. Return shipping may be charged. This demo uses delivery + 30 calendar days as the deadline.",
    status: "open",
  },
  {
    id: "demo-lamp",
    merchant: "Form & Field (fictional)",
    item: "Desk lamp",
    amount: 68,
    currency: "USD",
    delivered: relative(-5),
    days: 14,
    receipt: `SYNTHETIC RECEIPT · FF-209\nDesk lamp · USD 68\nDelivery: ${relative(-5)}`,
    policy:
      "SYNTHETIC POLICY\nReturns accepted within 14 days after delivery. Original packaging and proof of purchase required. Used or damaged goods may be excluded. Delivery + 14 calendar days is the demo deadline.",
    status: "open",
  },
  {
    id: "demo-shoes",
    merchant: "Everyday Goods (fictional)",
    item: "Trail shoes",
    amount: 94,
    currency: "USD",
    delivered: relative(-12),
    days: 30,
    receipt: `SYNTHETIC RECEIPT · EG-312\nTrail shoes · USD 94\nDelivery: ${relative(-12)}`,
    policy:
      "SYNTHETIC POLICY\nUnworn shoes can be returned within 30 days after delivery. Tags and box required. Final-sale items excluded. Delivery + 30 calendar days is the demo deadline.",
    status: "open",
  },
];
let orders,
  selectedId,
  busy = false,
  pendingId,
  lastFocus;
try {
  orders = JSON.parse(localStorage.getItem("deadline-desk-orders")) || samples;
  orders.forEach(validateOrder);
  selectedId = localStorage.getItem("deadline-desk-selection") || orders[0].id;
} catch {
  orders = samples;
  selectedId = samples[0].id;
}
const esc = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (value) =>
  new Date(value + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const selected = () => orders.find((o) => o.id === selectedId);
function save() {
  try {
    localStorage.setItem("deadline-desk-orders", JSON.stringify(orders));
    localStorage.setItem("deadline-desk-selection", selectedId);
  } catch {
    message(
      "Device storage is unavailable. Keep this tab open; changes may not survive a reload.",
      "error",
    );
  }
}
function render() {
  $("today").textContent = date(today);
  $("count").textContent = orders.length;
  $("dueCount").textContent = orders.filter(
    (o) => o.status !== "returned" && remaining(o, today) >= 0,
  ).length;
  $("caseList").innerHTML = orders
    .map((o) => {
      const left = remaining(o, today);
      return `<button class="case ${o.id === selectedId ? "selected" : ""}" data-case="${esc(o.id)}" aria-pressed="${o.id === selectedId}"><div class="case-head"><div><h3>${esc(o.item)}</h3><p>${esc(o.merchant)}</p></div><span>${esc(o.currency)} ${o.amount.toFixed(2)}</span></div><div class="case-bottom"><span class="tag ${o.status === "returned" ? "done" : ""}">${o.status === "returned" ? "Returned" : left < 0 ? "Window expired" : left + " days left"}</span><span>${date(deadline(o))} <span aria-hidden="true">↗</span></span></div></button>`;
    })
    .join("");
  document.querySelectorAll("[data-case]").forEach(
    (btn) =>
      (btn.onclick = () => {
        selectedId = btn.dataset.case;
        save();
        render();
      }),
  );
  const o = selected();
  if (!o) return;
  $("detail").innerHTML =
    `<p class="eyebrow">${o.status === "returned" ? "COMPLETED RETURN" : "SELECTED PURCHASE"}</p><h2>${esc(o.item)}</h2><div class="deadline-box"><div><span>Reviewed return deadline</span><br><strong>${date(deadline(o))}</strong></div><span>${o.status === "returned" ? "Recorded as returned" : remaining(o, today) < 0 ? "Expired" : remaining(o, today) + " days to act"}</span></div><div class="timeline"><p><b>${date(o.delivered)}</b>Delivery date · from your reviewed receipt</p><p><b>${o.days} calendar days</b>Policy window · from your reviewed policy</p><p><b>Delivery + policy window</b>Calculation used; merchant exclusions still apply</p></div><details><summary>View receipt and policy evidence</summary><p>${esc(o.receipt)}</p><p>${esc(o.policy)}</p></details><div class="detail-actions"><button class="primary" data-tool="prepare">Prepare return</button><button data-tool="calendar">Calendar reminder</button><button id="recordReturn">${o.status === "returned" ? "Reopen case" : "Mark returned"}</button></div>`;
  document
    .querySelectorAll("[data-tool]")
    .forEach(
      (btn) =>
        (btn.onclick = () =>
          ask(
            btn.dataset.tool === "calendar"
              ? "Create a calendar reminder for this purchase"
              : "Prepare a return checklist for this purchase",
          )),
    );
  $("recordReturn").onclick = () =>
    o.status === "returned" ? reopen(o) : confirm(o);
}
function message(text, type = "assistant", action) {
  const div = document.createElement("div");
  div.className = "message " + type;
  div.textContent = text;
  $("conversation").append(div);
  if (action) {
    const actionOrder = selected();
    const button = document.createElement("button");
    button.textContent =
      action === "calendar"
        ? "Download calendar file"
        : action === "confirm"
          ? "Review and confirm return"
          : "Copy draft";
    button.onclick = () => {
      const o = actionOrder;
      if (action === "calendar")
        download(calendar(o), `${o.id}-return.ics`, "text/calendar");
      else if (action === "confirm") confirm(o);
      else
        navigator.clipboard
          .writeText(text)
          .then(() => {
            button.textContent = "Copied";
          })
          .catch(() =>
            message(
              "Copy is unavailable; select the draft text instead.",
              "error",
            ),
          );
    };
    div.append(document.createElement("br"), button);
  }
  if (type === "assistant" && "speechSynthesis" in window) {
    const listen = document.createElement("button");
    listen.className = "read-answer";
    listen.textContent = "Read aloud";
    listen.setAttribute("aria-pressed", "false");
    listen.onclick = () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      const voices = speechSynthesis.getVoices();
      utterance.voice =
        voices.find((v) => v.lang.startsWith("en") && v.localService) || null;
      utterance.onend = utterance.onerror = () => {
        listen.textContent = "Read aloud";
        listen.setAttribute("aria-pressed", "false");
      };
      listen.textContent = "Stop reading";
      listen.setAttribute("aria-pressed", "true");
      speechSynthesis.speak(utterance);
    };
    div.append(document.createElement("br"), listen);
  }
  div.scrollIntoView({ block: "nearest" });
  return div;
}
function download(content, name, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function ask(text) {
  if (busy) return;
  busy = true;
  const caseId = selectedId;
  message(text, "user");
  $("request").value = "";
  $("send").disabled = true;
  $("send").innerHTML = "Working…";
  const pending = message(
    "Understanding your request with the local model…",
    "status",
  );
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        orders,
        selectedId: caseId,
        today,
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    pending.remove();
    if (selectedId !== caseId) {
      message(
        "The selected purchase changed. Please repeat the request on the current case.",
      );
      return;
    }
    if (result.orderId) {
      selectedId = result.orderId;
      save();
      render();
    }
    message(
      result.text,
      "assistant",
      result.action === "calendar" ||
        result.action === "confirm" ||
        result.action === "draft"
        ? result.action
        : undefined,
    );
  } catch (error) {
    pending.remove();
    message(
      "The local AI could not complete this request. " + error.message,
      "error",
    );
  } finally {
    busy = false;
    $("send").disabled = false;
    $("send").innerHTML = 'Ask assistant <span aria-hidden="true">↗</span>';
  }
}
function confirm(o) {
  pendingId = o.id;
  lastFocus = document.activeElement;
  $("confirmText").textContent =
    `Record ${o.item} as returned on this device? This does not contact ${o.merchant} or confirm a refund. You can reopen the case.`;
  $("confirmDialog").showModal();
}
function reopen(o) {
  o.status = "open";
  save();
  render();
  message(`${o.item} reopened. Its original deadline is unchanged.`);
}
$("confirmReturn").onclick = () => {
  const o = orders.find((o) => o.id === pendingId);
  o.status = "returned";
  save();
  $("confirmDialog").close();
  render();
  message(
    `${o.item} recorded as returned. You can reopen it from the purchase card.`,
  );
};
$("cancelConfirm").onclick = () => $("confirmDialog").close();
$("confirmDialog").addEventListener(
  "close",
  () => lastFocus?.isConnected && lastFocus.focus(),
);
$("askForm").onsubmit = (e) => {
  e.preventDefault();
  ask($("request").value);
};
document
  .querySelectorAll("[data-prompt]")
  .forEach((btn) => (btn.onclick = () => ask(btn.dataset.prompt)));
$("add").onclick = () => $("purchaseDialog").showModal();
$("cancelPurchase").onclick = () => $("purchaseDialog").close();
$("workspace").onclick = () => $("main").scrollIntoView();
$("purchaseForm").onsubmit = (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const o = {
    ...data,
    id: crypto.randomUUID(),
    days: Number(data.days),
    amount: Number(data.amount),
    status: "open",
  };
  try {
    validateOrder(o);
    if (orders.length >= 25)
      throw new Error("This prototype supports up to 25 purchases.");
    orders.push(o);
    selectedId = o.id;
    save();
    render();
    $("purchaseDialog").close();
    e.target.reset();
    $("formError").textContent = "";
  } catch (error) {
    $("formError").textContent = error.message;
  }
};
let recorder, stream, recordingTimer;
async function transcribeAudio(blob) {
  $("voiceStatus").textContent = "Transcribing locally…";
  $("voice").disabled = true;
  $("demoVoice").disabled = true;
  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": blob.type || "application/octet-stream" },
      body: blob,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    $("request").value = result.text;
    $("request").focus();
    $("voiceStatus").textContent =
      "Whisper transcript ready. Review it, then press Ask assistant.";
  } catch (error) {
    $("voiceStatus").textContent = error.message;
  } finally {
    $("voice").disabled = false;
    $("demoVoice").disabled = false;
  }
}
$("voice").onclick = async () => {
  if (recorder?.state === "recording") {
    recorder.stop();
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      clearTimeout(recordingTimer);
      stream.getTracks().forEach((t) => t.stop());
      $("voice").classList.remove("listening");
      $("voice").setAttribute("aria-label", "Start voice input");
      transcribeAudio(new Blob(chunks, { type: recorder.mimeType }));
    };
    recorder.start();
    $("voice").classList.add("listening");
    $("voice").setAttribute("aria-label", "Stop voice input");
    $("voiceStatus").textContent =
      "Recording on this device. Press the microphone to stop; maximum 30 seconds.";
    recordingTimer = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 30000);
  } catch (error) {
    stream?.getTracks().forEach((t) => t.stop());
    $("voiceStatus").textContent =
      "Microphone unavailable. Type instead or try the labeled demo recording.";
  }
};
$("demoVoice").onclick = async () => {
  const response = await fetch("/demo-request.wav");
  await transcribeAudio(await response.blob());
};
window.addEventListener("pagehide", () => {
  if (recorder?.state === "recording") recorder.stop();
  stream?.getTracks().forEach((t) => t.stop());
  window.speechSynthesis?.cancel();
});
fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    $("modelState").textContent = h.ready ? h.model : h.model + " · offline";
  })
  .catch(() => {
    $("modelState").textContent = "Local model offline";
  });
render();
save();

$("extractFields").onclick = async () => {
  const form = $("purchaseForm");
  const btn = $("extractFields");
  btn.disabled = true;
  btn.textContent = "Reading evidence…";
  $("extractionEvidence").textContent = "";
  try {
    const r = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt: form.elements.receipt.value,
        policy: form.elements.policy.value,
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    for (const name of [
      "merchant",
      "item",
      "delivered",
      "days",
      "amount",
      "currency",
    ])
      form.elements.namedItem(name).value = "";
    for (const [key, value] of Object.entries(j.fields))
      form.elements.namedItem(key).value = value;
    $("extractionEvidence").textContent = [
      j.evidence.delivery ? "Delivery evidence: " + j.evidence.delivery : "",
      j.evidence.window ? "Window evidence: " + j.evidence.window : "",
      ...j.warnings,
      "Review every field and policy exclusion before saving.",
    ]
      .filter(Boolean)
      .join("\n");
    $("formError").textContent = "";
  } catch (error) {
    $("formError").textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Suggest fields from text";
  }
};
