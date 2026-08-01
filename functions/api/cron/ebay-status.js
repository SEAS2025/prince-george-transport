import { getEbayPublishReadiness } from "../../_lib/ebay-publish-batch.js";
import { getEbayListings } from "../../_lib/ebay-store.js";
import { getPublicInventory } from "../../_lib/public-inventory.js";

function cronAuthorized(request, env) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("X-Cron-Secret")?.trim();
  return header === secret;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!cronAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const readiness = await getEbayPublishReadiness(env);
  const items = await getPublicInventory(env);
  const ebayMap = await getEbayListings(env);

  const radios = items.filter((i) => i.category === "radios");
  const listed = radios.filter((i) => i.ebayListingUrl || ebayMap[i.id]?.listingUrl);

  let nextStep = "ready_to_publish";
  if (!readiness.secretsConfigured) nextStep = "add_ebay_api_secrets";
  else if (!readiness.sellerConnected) nextStep = "connect_ebay_seller_account";
  else if (listed.length >= radios.length) nextStep = "all_radios_listed";

  return json({
    readiness,
    radios: { total: radios.length, listed: listed.length, pending: radios.length - listed.length },
    nextStep,
    adminUrl: "https://prince-george-transport.pages.dev/admin.html",
    connectUrl: "https://prince-george-transport.pages.dev/admin.html#ebay-connect",
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
