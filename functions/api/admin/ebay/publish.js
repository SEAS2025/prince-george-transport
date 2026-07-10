import { isAdmin } from "../../../_lib/auth.js";
import { getInventory } from "../../../_lib/inventory.js";
import { publishInventoryItem } from "../../../_lib/ebay.js";
import { saveEbayListing } from "../../../_lib/ebay-store.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const items = await getInventory(env);
  const targetIds = body.itemIds || (body.itemId ? [body.itemId] : items.map((i) => i.id));

  const results = [];
  for (const id of targetIds) {
    const item = items.find((i) => i.id === id);
    if (!item) {
      results.push({ id, ok: false, error: "Item not found" });
      continue;
    }
    try {
      const listing = await publishInventoryItem(env, item);
      await saveEbayListing(env, id, listing);
      results.push({ id, ok: true, name: item.name, ...listing });
    } catch (e) {
      results.push({ id, ok: false, name: item.name, error: e.message });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return json({ ok: failed === 0, published: ok, failed, results });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
