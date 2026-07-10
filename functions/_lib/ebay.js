// eBay Sell API client — OAuth + Inventory API.

import {
  getEbayTokens,
  saveEbayTokens,
  getEbayConfig,
  saveEbayConfig,
} from "./ebay-store.js";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

export function ebayEnv(env) {
  const sandbox = env.EBAY_ENV === "sandbox";
  return {
    sandbox,
    apiHost: sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com",
    authHost: sandbox ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com",
    clientId: env.EBAY_CLIENT_ID,
    clientSecret: env.EBAY_CLIENT_SECRET,
    ruName: env.EBAY_RUNAME,
    marketplaceId: env.EBAY_MARKETPLACE_ID || "EBAY_US",
    categoryId: env.EBAY_DEFAULT_CATEGORY_ID || "117042", // Medical & Mobility
    locationKey: env.EBAY_MERCHANT_LOCATION_KEY || "pgt-blythewood",
  };
}

export function ebayConfigured(env) {
  const cfg = ebayEnv(env);
  return !!(cfg.clientId && cfg.clientSecret && cfg.ruName);
}

function basicAuth(clientId, clientSecret) {
  return "Basic " + btoa(`${clientId}:${clientSecret}`);
}

export async function buildAuthUrl(env, state) {
  const cfg = ebayEnv(env);
  if (!cfg.clientId || !cfg.ruName) throw new Error("eBay app not configured");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: cfg.ruName,
    scope: SCOPES,
    state,
  });
  return `${cfg.authHost}/oauth2/authorize?${params}`;
}

export async function exchangeCode(env, code) {
  const cfg = ebayEnv(env);
  const res = await fetch(`${cfg.apiHost}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(cfg.clientId, cfg.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.ruName,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "eBay token exchange failed");
  }

  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
    scope: data.scope || SCOPES,
    connected_at: new Date().toISOString(),
  };
  await saveEbayTokens(env, tokens);
  return tokens;
}

export async function getAccessToken(env) {
  const cfg = ebayEnv(env);
  const tokens = await getEbayTokens(env);
  if (!tokens?.refresh_token) throw new Error("eBay not connected. Connect your seller account in Admin.");

  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  const res = await fetch(`${cfg.apiHost}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(cfg.clientId, cfg.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || SCOPES,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "eBay token refresh failed");
  }

  const updated = {
    ...tokens,
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
  };
  if (data.refresh_token) updated.refresh_token = data.refresh_token;
  await saveEbayTokens(env, updated);
  return updated.access_token;
}

async function ebayFetch(env, path, { method = "GET", body, headers = {} } = {}) {
  const cfg = ebayEnv(env);
  const token = await getAccessToken(env);
  const res = await fetch(`${cfg.apiHost}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data.errors?.[0]?.message || data.error_description || data.message || text || `eBay API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function ensureMerchantLocation(env) {
  const cfg = ebayEnv(env);
  const stored = await getEbayConfig(env);
  if (stored.merchantLocationKey) return stored.merchantLocationKey;

  try {
    await ebayFetch(env, `/sell/inventory/v1/location/${cfg.locationKey}`, {
      method: "PUT",
      body: {
        location: {
          address: {
            addressLine1: "200 Louthian Way",
            city: "Blythewood",
            stateOrProvince: "SC",
            postalCode: "29016",
            country: "US",
          },
        },
        locationTypes: ["WAREHOUSE"],
        merchantLocationStatus: "ENABLED",
        name: "Prince George Transport",
      },
    });
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }

  await saveEbayConfig(env, { merchantLocationKey: cfg.locationKey });
  return cfg.locationKey;
}

export async function ensureBusinessPolicies(env) {
  const stored = await getEbayConfig(env);
  if (stored.paymentPolicyId && stored.fulfillmentPolicyId && stored.returnPolicyId) {
    return stored;
  }

  // Opt in to business policies program
  try {
    await ebayFetch(env, "/sell/account/v1/program/opt_in", {
      method: "POST",
      body: { programType: "SELLING_POLICY_MANAGEMENT" },
    });
  } catch (e) {
    if (!/already opted/i.test(e.message)) {
      // Some accounts are already opted in — continue
    }
  }

  const [payments, fulfillments, returns] = await Promise.all([
    ebayFetch(env, "/sell/account/v1/payment_policy?marketplace_id=EBAY_US"),
    ebayFetch(env, "/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US"),
    ebayFetch(env, "/sell/account/v1/return_policy?marketplace_id=EBAY_US"),
  ]);

  const paymentPolicyId = payments.paymentPolicies?.[0]?.paymentPolicyId;
  const fulfillmentPolicyId = fulfillments.fulfillmentPolicies?.[0]?.fulfillmentPolicyId;
  const returnPolicyId = returns.returnPolicies?.[0]?.returnPolicyId;

  if (!paymentPolicyId || !fulfillmentPolicyId || !returnPolicyId) {
    throw new Error(
      "eBay business policies missing. Create Payment, Shipping, and Return policies in eBay Seller Hub → Business Policies, then retry."
    );
  }

  const config = { paymentPolicyId, fulfillmentPolicyId, returnPolicyId };
  await saveEbayConfig(env, config);
  return { ...(await getEbayConfig(env)), ...config };
}

function mapCondition(condition) {
  const c = String(condition || "Used").toLowerCase();
  if (c.includes("new")) return "NEW";
  if (c.includes("refurb")) return "SELLER_REFURBISHED";
  return "USED_EXCELLENT";
}

function buildDescription(item) {
  const lines = [
    item.description || "",
    "",
    "Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).",
    "Pickup available in Blythewood, SC. Call (803) 231-9420 with questions.",
    "",
    "https://prince-george-transport.pages.dev/supplies.html",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function publishInventoryItem(env, item) {
  if (!item.price || item.price <= 0) {
    throw new Error(`${item.name}: price required to list on eBay`);
  }

  const cfg = ebayEnv(env);
  const policies = await ensureBusinessPolicies(env);
  const locationKey = await ensureMerchantLocation(env);
  const sku = item.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);

  const inventoryBody = {
    availability: { shipToLocationAvailability: { quantity: 1 } },
    condition: mapCondition(item.condition),
    product: {
      title: item.name.slice(0, 80),
      description: buildDescription(item),
      aspects: {
        Brand: ["Unbranded"],
        "Item Type": [item.category === "radios" ? "Two-Way Radio" : "Medical Equipment"],
      },
    },
  };

  if (item.imageUrl && item.imageUrl.startsWith("https://")) {
    inventoryBody.product.imageUrls = [item.imageUrl];
  }

  await ebayFetch(env, `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    body: inventoryBody,
  });

  const offer = await ebayFetch(env, "/sell/inventory/v1/offer", {
    method: "POST",
    body: {
      sku,
      marketplaceId: cfg.marketplaceId,
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: cfg.categoryId,
      merchantLocationKey: locationKey,
      listingDescription: buildDescription(item),
      listingPolicies: {
        paymentPolicyId: policies.paymentPolicyId,
        fulfillmentPolicyId: policies.fulfillmentPolicyId,
        returnPolicyId: policies.returnPolicyId,
      },
      pricingSummary: {
        price: { value: String(item.price), currency: "USD" },
      },
    },
  });

  const offerId = offer.offerId;
  if (!offerId) throw new Error("eBay did not return an offer ID");

  const published = await ebayFetch(env, `/sell/inventory/v1/offer/${offerId}/publish`, {
    method: "POST",
  });

  return {
    sku,
    offerId,
    listingId: published.listingId,
    listingUrl: published.listingId
      ? `https://www.ebay.com/itm/${published.listingId}`
      : null,
  };
}

export async function getEbayStatus(env) {
  const tokens = await getEbayTokens(env);
  const config = await getEbayConfig(env);
  return {
    configured: ebayConfigured(env),
    connected: !!tokens?.refresh_token,
    connectedAt: tokens?.connected_at || null,
    env: env.EBAY_ENV || "production",
    policiesReady: !!(config.paymentPolicyId && config.fulfillmentPolicyId && config.returnPolicyId),
    categoryId: ebayEnv(env).categoryId,
  };
}
