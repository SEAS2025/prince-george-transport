import { getInventory, saveInventory } from "./inventory.js";
import { publishInventoryItem, ebayConfigured } from "./ebay.js";
import { getEbayTokens, getEbayListings, saveEbayListing } from "./ebay-store.js";

export async function publishItemBatch(env, itemIds, { skipPublished = true } = {}) {
  let items = await getInventory(env);
  const ebayMap = await getEbayListings(env);
  const results = [];

  for (const id of itemIds) {
    const item = items.find((i) => i.id === id);
    if (!item) {
      results.push({ id, ok: false, error: "Item not found" });
      continue;
    }

    const existingUrl = item.ebayListingUrl || ebayMap[id]?.listingUrl || "";
    if (skipPublished && existingUrl) {
      results.push({
        id,
        ok: true,
        skipped: true,
        name: item.name,
        listingUrl: existingUrl,
        message: "Already listed on eBay",
      });
      continue;
    }

    try {
      const listing = await publishInventoryItem(env, item);
      await saveEbayListing(env, id, listing);

      if (listing.listingUrl) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ebayListingUrl: listing.listingUrl };
        }
      }

      results.push({ id, ok: true, name: item.name, ...listing });
    } catch (e) {
      results.push({ id, ok: false, name: item.name, error: e.message });
    }
  }

  if (results.some((r) => r.ok && !r.skipped && r.listingUrl)) {
    await saveInventory(env, items);
  }

  const published = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;

  return {
    ok: failed === 0,
    published,
    skipped,
    failed,
    results,
  };
}

export async function publishQueuedItems(env, options = {}) {
  const items = await getInventory(env);
  const queued = items.filter((i) => i.ebayQueued && !i.ebayListingUrl);
  const ids = queued.map((i) => i.id);
  if (!ids.length) {
    return { ok: true, published: 0, skipped: 0, failed: 0, results: [], message: "No queued items" };
  }
  return publishItemBatch(env, ids, options);
}

export async function publishRadios(env, options = {}) {
  const items = await getInventory(env);
  const radioIds = items.filter((i) => i.category === "radios").map((i) => i.id);
  return publishItemBatch(env, radioIds, options);
}

export async function getEbayPublishReadiness(env) {
  const tokens = await getEbayTokens(env);
  return {
    secretsConfigured: ebayConfigured(env),
    sellerConnected: !!tokens?.refresh_token,
    ready: ebayConfigured(env) && !!tokens?.refresh_token,
  };
}
