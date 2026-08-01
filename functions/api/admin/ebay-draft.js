import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { ebayDraft, EBAY_FILLER_DRAFT_KEY } from "../../_lib/ebay-export.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return json({ error: "Unauthorized." }, 401);
  }

  const items = await getInventory(env);
  const siteUrl = env.SITE_URL || "https://prince-george-transport.pages.dev";
  const queue = items
    .filter((i) => i.price != null && i.category !== "vehicles" && !i.ebayListingUrl)
    .map((i) => ebayDraft(i, siteUrl));

  let active = null;
  try {
    active = env.INVENTORY ? JSON.parse(await env.INVENTORY.get(EBAY_FILLER_DRAFT_KEY)) : null;
  } catch {
    active = null;
  }

  return json({ queue, active, count: queue.length });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.INVENTORY) {
    return json({ error: "KV not configured." }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const itemId = body.itemId;
  if (!itemId) return json({ error: "itemId required." }, 400);

  const items = await getInventory(env);
  const item = items.find((i) => i.id === itemId);
  if (!item) return json({ error: "Item not found." }, 404);

  const siteUrl = env.SITE_URL || "https://prince-george-transport.pages.dev";
  const draft = { ...ebayDraft(item, siteUrl), setAt: new Date().toISOString() };
  await env.INVENTORY.put(EBAY_FILLER_DRAFT_KEY, JSON.stringify(draft), {
    expirationTtl: 60 * 60 * 6,
  });

  return json({ ok: true, draft });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
