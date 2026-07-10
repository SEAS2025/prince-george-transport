import { timingSafeEqual, mintAdminCookie } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const pin = env.ADMIN_PIN;
  if (!pin) return json({ error: "Admin PIN not configured on server." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const submitted = String(body.pin || "");
  if (!submitted || !timingSafeEqual(submitted, pin)) {
    return json({ error: "Incorrect PIN." }, 401);
  }

  let cookie;
  try {
    cookie = await mintAdminCookie(env);
  } catch {
    return json({ error: "Admin auth not configured." }, 503);
  }

  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}

function json(obj, status, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
