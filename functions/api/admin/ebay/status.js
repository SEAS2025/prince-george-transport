import { isAdmin } from "../../../_lib/auth.js";
import { getEbayStatus } from "../../../_lib/ebay.js";
import { getEbayListings } from "../../../_lib/ebay-store.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  const status = await getEbayStatus(env);
  const listings = await getEbayListings(env);
  return json({ ...status, listings });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
