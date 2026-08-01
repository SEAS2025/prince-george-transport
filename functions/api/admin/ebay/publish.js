import { isAdmin } from "../../../_lib/auth.js";
import { getInventory } from "../../../_lib/inventory.js";
import { publishItemBatch } from "../../../_lib/ebay-publish-batch.js";

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
  const result = await publishItemBatch(env, targetIds);
  return json(result);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
