import { isAdmin, signToken } from "../../../_lib/auth.js";
import { buildAuthUrl, ebayConfigured } from "../../../_lib/ebay.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (!ebayConfigured(env)) {
    return json({
      error: "eBay app not configured. Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_RUNAME secrets.",
      setupUrl: "https://developer.ebay.com/my/keys",
    }, 503);
  }

  const secret = env.ADMIN_SIGNING_SECRET || env.ADMIN_PIN;
  const state = await signToken(secret, {
    purpose: "ebay_oauth",
    exp: Date.now() + 10 * 60 * 1000,
  });

  const url = await buildAuthUrl(env, state);
  return json({ url });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
