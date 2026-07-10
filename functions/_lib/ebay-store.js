// eBay OAuth token storage in KV.

export const EBAY_TOKENS_KEY = "ebay:tokens:v1";
export const EBAY_CONFIG_KEY = "ebay:config:v1";
export const EBAY_LISTINGS_KEY = "ebay:listings:v1";

export async function getEbayTokens(env) {
  if (!env.INVENTORY) return null;
  const raw = await env.INVENTORY.get(EBAY_TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveEbayTokens(env, tokens) {
  if (!env.INVENTORY) throw new Error("Storage not configured");
  await env.INVENTORY.put(EBAY_TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearEbayTokens(env) {
  if (!env.INVENTORY) return;
  await env.INVENTORY.delete(EBAY_TOKENS_KEY);
}

export async function getEbayConfig(env) {
  if (!env.INVENTORY) return {};
  const raw = await env.INVENTORY.get(EBAY_CONFIG_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveEbayConfig(env, config) {
  if (!env.INVENTORY) throw new Error("Storage not configured");
  const existing = await getEbayConfig(env);
  await env.INVENTORY.put(EBAY_CONFIG_KEY, JSON.stringify({ ...existing, ...config }));
}

export async function getEbayListings(env) {
  if (!env.INVENTORY) return {};
  const raw = await env.INVENTORY.get(EBAY_LISTINGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveEbayListing(env, itemId, data) {
  const map = await getEbayListings(env);
  map[itemId] = { ...data, updatedAt: new Date().toISOString() };
  await env.INVENTORY.put(EBAY_LISTINGS_KEY, JSON.stringify(map));
}
