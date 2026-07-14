import { isAdmin } from "../../_lib/auth.js";
import { getInventory, saveInventory, normalizeItem } from "../../_lib/inventory.js";
import { SALES_POLICY_SUMMARY, salesRestrictionReason } from "../../_lib/sales-policy.js";

export async function onRequest(context) {
  const { request, env } = context;
  const authed = await isAdmin(request, env);
  if (!authed) return json({ error: "Unauthorized. Enter your PIN." }, 401);

  if (request.method === "GET") {
    const items = await getInventory(env);
    return json({ items, salesPolicy: SALES_POLICY_SUMMARY });
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    const items = await getInventory(env);
    const item = normalizeItem(body);
    if (!item) return json({ error: "Name is required." }, 400);

    const blocked = salesRestrictionReason(item);
    if (blocked) return json({ error: `Blocked by sales policy: ${blocked}` }, 400);

    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);

    const saved = await saveInventory(env, items);
    return json({ ok: true, item, items: saved });
  }

  if (request.method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }

    if (!Array.isArray(body.items)) return json({ error: "Expected { items: [...] }" }, 400);
    const saved = await saveInventory(env, body.items);
    return json({ ok: true, items: saved });
  }

  return json({ error: "Method not allowed." }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
