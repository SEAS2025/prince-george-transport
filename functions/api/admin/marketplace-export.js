import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { inventoryToMarketplaceCsv } from "../../_lib/marketplace.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const items = await getInventory(env);
  const csv = inventoryToMarketplaceCsv(items);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pgt-facebook-marketplace.csv"',
      "Cache-Control": "no-store",
    },
  });
}
