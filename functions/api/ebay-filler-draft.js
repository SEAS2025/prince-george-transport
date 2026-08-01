/**
 * Public CORS endpoint so the Tampermonkey userscript on ebay.com
 * can pull the draft last armed from Admin → eBay Form Filler.
 * Payload is listing copy already shown on the public supplies page.
 */
import { EBAY_FILLER_DRAFT_KEY } from "../_lib/ebay-export.js";

export async function onRequestGet(context) {
  const { env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.INVENTORY) {
    return new Response(JSON.stringify({ draft: null, error: "KV not configured." }), {
      status: 200,
      headers,
    });
  }

  let draft = null;
  try {
    const raw = await env.INVENTORY.get(EBAY_FILLER_DRAFT_KEY);
    draft = raw ? JSON.parse(raw) : null;
  } catch {
    draft = null;
  }

  return new Response(JSON.stringify({ draft }), { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
