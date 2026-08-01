import { getPublicInventory } from "../_lib/public-inventory.js";

export async function onRequestGet(context) {
  const items = await getPublicInventory(context.env);
  return json({ items });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30",
    },
  });
}
