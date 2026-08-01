import { publishItemBatch, getEbayPublishReadiness } from "../../_lib/ebay-publish-batch.js";
import { getInventory } from "../../_lib/inventory.js";
import { getEbayListings } from "../../_lib/ebay-store.js";

function cronAuthorized(request, env) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("X-Cron-Secret")?.trim();
  return header === secret;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!cronAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const readiness = await getEbayPublishReadiness(env);

  if (!readiness.secretsConfigured) {
    return json({
      ok: false,
      skipped: true,
      reason: "eBay API secrets not configured (EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RUNAME).",
      readiness,
    });
  }

  if (!readiness.sellerConnected) {
    return json({
      ok: false,
      skipped: true,
      reason: "eBay seller not connected. Open Admin → Marketing → Connect eBay Account once.",
      readiness,
    });
  }

  const items = await getInventory(env);
  const ebayMap = await getEbayListings(env);
  const toPublish = items.filter(
    (i) =>
      !i.ebayListingUrl &&
      !ebayMap[i.id]?.listingUrl &&
      (i.ebayQueued || i.category === "radios")
  );
  const ids = [...new Set(toPublish.map((i) => i.id))];
  const result = ids.length
    ? await publishItemBatch(env, ids)
    : { ok: true, published: 0, skipped: 0, failed: 0, results: [], message: "Nothing to publish" };

  return json({
    ...result,
    readiness,
    message: result.published
      ? `Published ${result.published} listing(s) to eBay.`
      : result.skipped
        ? "All listings already on eBay."
        : "No listings published.",
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
