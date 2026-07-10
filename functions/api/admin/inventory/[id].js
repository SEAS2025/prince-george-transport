import { isAdmin } from "../../../_lib/auth.js";
import { getInventory, saveInventory } from "../../../_lib/inventory.js";

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const authed = await isAdmin(request, env);
  if (!authed) return json({ error: "Unauthorized." }, 401);

  const id = params.id;
  if (!id) return json({ error: "Missing item id." }, 400);

  const items = await getInventory(env);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return json({ error: "Item not found." }, 404);

  const saved = await saveInventory(env, next);
  return json({ ok: true, items: saved });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
