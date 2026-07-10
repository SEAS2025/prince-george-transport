import { verifyToken } from "../../../_lib/auth.js";
import { exchangeCode, ebayConfigured } from "../../../_lib/ebay.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const siteUrl = env.SITE_URL || url.origin;
  const adminUrl = `${siteUrl}/admin.html`;

  if (error) {
    return redirect(`${adminUrl}?ebay=error&msg=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirect(`${adminUrl}?ebay=error&msg=${encodeURIComponent("Missing authorization code")}`);
  }

  if (!ebayConfigured(env)) {
    return redirect(`${adminUrl}?ebay=error&msg=${encodeURIComponent("eBay app not configured")}`);
  }

  const secret = env.ADMIN_SIGNING_SECRET || env.ADMIN_PIN;
  const payload = await verifyToken(secret, state);
  if (!payload || payload.purpose !== "ebay_oauth") {
    return redirect(`${adminUrl}?ebay=error&msg=${encodeURIComponent("Invalid OAuth state")}`);
  }

  try {
    await exchangeCode(env, code);
    return redirect(`${adminUrl}?ebay=connected`);
  } catch (e) {
    return redirect(`${adminUrl}?ebay=error&msg=${encodeURIComponent(e.message)}`);
  }
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
