import { isAdmin } from "../../_lib/auth.js";
import { getInventory, normalizeItem, saveInventory } from "../../_lib/inventory.js";
import { filterSellableItems, salesRestrictionReason } from "../../_lib/sales-policy.js";

const QUEUE_KEY = "capture:queue:v1";

async function readQueue(env) {
  if (!env.INVENTORY) return { pending: [], approved: [] };
  const raw = await env.INVENTORY.get(QUEUE_KEY);
  if (!raw) return { pending: [], approved: [] };
  try {
    const data = JSON.parse(raw);
    return {
      pending: Array.isArray(data.pending) ? data.pending : [],
      approved: Array.isArray(data.approved) ? data.approved : [],
    };
  } catch {
    return { pending: [], approved: [] };
  }
}

async function writeQueue(env, queue) {
  if (!env.INVENTORY) throw new Error("Storage not configured");
  await env.INVENTORY.put(QUEUE_KEY, JSON.stringify(queue));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  const { pending, approved } = await readQueue(env);
  return json({
    queue: pending,
    approved: approved.slice(0, 50),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = body.action || "update";
  const id = body.id;
  const item = body.item || {};
  const queue = await readQueue(env);

  if (action === "update") {
    if (!id) return json({ error: "id required" }, 400);
    const idx = queue.pending.findIndex((i) => i.id === id);
    const next = { ...(idx >= 0 ? queue.pending[idx] : {}), ...item, id, status: "pending" };
    if (idx >= 0) queue.pending[idx] = next;
    else queue.pending.unshift(next);
    await writeQueue(env, queue);
    return json({ ok: true, item: next });
  }

  if (action === "approve") {
    if (!id) return json({ error: "id required" }, 400);
    const source =
      item?.name
        ? item
        : queue.pending.find((i) => i.id === id) || queue.approved.find((i) => i.id === id);
    if (!source) return json({ error: "Queue item not found" }, 404);

    const blocked = salesRestrictionReason(source);
    if (blocked) return json({ error: `Blocked by sales policy: ${blocked}` }, 400);

    const normalized = normalizeItem({
      ...source,
      ebayQueued: true,
      captureId: source.captureId || source.id || "",
    });
    if (!normalized) return json({ error: "Name is required." }, 400);

    const inventory = await getInventory(env, { applyPolicy: false });
    const { sellable } = filterSellableItems(inventory);
    const nextInv = sellable.filter((i) => i.id !== normalized.id);
    nextInv.unshift(normalized);
    await saveInventory(env, nextInv);

    queue.pending = queue.pending.filter((i) => i.id !== id);
    queue.approved = [{ ...normalized, status: "approved" }, ...queue.approved.filter((i) => i.id !== id)].slice(0, 100);
    await writeQueue(env, queue);
    return json({ ok: true, item: normalized });
  }

  if (action === "discard") {
    queue.pending = queue.pending.filter((i) => i.id !== id);
    await writeQueue(env, queue);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
