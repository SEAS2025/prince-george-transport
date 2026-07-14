import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import {
  EBAY_ARMED_DRAFT_KEY,
  assertDraftAllowed,
  buildEbayDraft,
  buildEbayDraftQueue,
} from "../../_lib/ebay-drafts.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  const items = await getInventory(env);
  const queue = buildEbayDraftQueue(items);
  return json({ count: queue.length, queue });
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

  const itemId = body.itemId || body.id;
  if (!itemId) return json({ error: "itemId required." }, 400);

  const items = await getInventory(env);
  const item = items.find((i) => i.id === itemId);
  if (!item) return json({ error: "Item not found." }, 404);

  try {
    assertDraftAllowed(item);
  } catch (e) {
    return json({ error: e.message }, e.status || 400);
  }

  if (item.price == null || Number(item.price) <= 0) {
    return json({ error: "Price required before arming an eBay draft." }, 400);
  }

  const draft = buildEbayDraft(item);
  if (env.INVENTORY) {
    await env.INVENTORY.put(
      EBAY_ARMED_DRAFT_KEY,
      JSON.stringify({ ...draft, armedAt: new Date().toISOString() })
    );
  }

  return json({ ok: true, draft });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
