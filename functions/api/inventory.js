import { getInventory } from "../_lib/inventory.js";

export async function onRequestGet(context) {
  const items = await getInventory(context.env);
  return json({ items });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
