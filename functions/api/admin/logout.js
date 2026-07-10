import { clearAdminCookie } from "../../_lib/auth.js";

export async function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
}

function json(obj, status, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
