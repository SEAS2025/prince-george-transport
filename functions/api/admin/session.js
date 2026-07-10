import { isAdmin } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const authed = await isAdmin(context.request, context.env);
  return json({ authed });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
