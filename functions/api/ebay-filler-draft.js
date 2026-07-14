import { EBAY_ARMED_DRAFT_KEY } from "../_lib/ebay-drafts.js";

// Public read used by the Tampermonkey userscript on ebay.com after Admin arms a draft.
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.INVENTORY) {
    return json({ draft: null });
  }

  const raw = await env.INVENTORY.get(EBAY_ARMED_DRAFT_KEY);
  if (!raw) return json({ draft: null });

  try {
    const draft = JSON.parse(raw);
    return json({ draft }, 200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
  } catch {
    return json({ draft: null });
  }
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

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
