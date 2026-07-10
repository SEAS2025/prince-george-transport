import { isAdmin } from "../../../_lib/auth.js";
import { clearEbayTokens } from "../../../_lib/ebay-store.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  await clearEbayTokens(env);
  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
