import { isAdmin } from "../../_lib/auth.js";
import { salesRestrictionReason } from "../../_lib/sales-policy.js";

const QUEUE_KEY = "capture:queue:v1";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64) return json({ error: "imageBase64 required." }, 400);

  // Persist a manual-review stub. Full vision AI may be configured in production via CAPTURE_AI_URL.
  const id = `capture-${Date.now().toString(36)}`;
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${String(imageBase64).replace(/^data:[^;]+;base64,/, "")}`;

  let aiItem = null;
  if (env.CAPTURE_AI_URL) {
    try {
      const res = await fetch(env.CAPTURE_AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.CAPTURE_AI_KEY ? { Authorization: `Bearer ${env.CAPTURE_AI_KEY}` } : {}),
        },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.item) aiItem = data.item;
    } catch {
      /* fall through to manual stub */
    }
  }

  const item = {
    id,
    name: aiItem?.name || "Unidentified surplus item — edit before approve",
    category: aiItem?.category || "supplies",
    brand: aiItem?.brand || "",
    model: aiItem?.model || "",
    serialNumber: aiItem?.serialNumber || "",
    price: aiItem?.price ?? null,
    ebayTitle: aiItem?.ebayTitle || "",
    description: aiItem?.description || "Captured via /capture — review label details before listing.",
    imageUrl: aiItem?.imageUrl || dataUrl,
    condition: "Used",
    quantity: 1,
    ebayQueued: false,
    captureId: id,
    confidence: aiItem?.confidence || "low",
    aiSource: aiItem ? "remote" : "manual",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const blocked = salesRestrictionReason(item);
  if (blocked) {
    return json({ error: `Blocked by sales policy: ${blocked}` }, 400);
  }

  if (env.INVENTORY) {
    const raw = await env.INVENTORY.get(QUEUE_KEY);
    let queue = { pending: [], approved: [] };
    try {
      queue = raw ? JSON.parse(raw) : queue;
    } catch {
      /* keep empty */
    }
    queue.pending = [item, ...(queue.pending || [])].slice(0, 100);
    await env.INVENTORY.put(QUEUE_KEY, JSON.stringify(queue));
  }

  return json({ item });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
