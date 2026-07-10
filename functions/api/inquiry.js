// Inquiry form handler — sends notification via Resend.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const item = String(body.item || "General Inquiry").trim();
  const message = String(body.message || "").trim();

  if (!name) return json({ error: "Name is required." }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "Please enter a valid email address." }, 400);

  const ownerEmail = env.OWNER_EMAIL || env.EMAIL_REPLY_TO;
  const html = `
    <h2>New inquiry — Prince George Transport</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    <p><strong>Phone:</strong> ${esc(phone || "—")}</p>
    <p><strong>Interest:</strong> ${esc(item)}</p>
    <p><strong>Message:</strong></p>
    <p>${esc(message || "—").replace(/\n/g, "<br>")}</p>
  `;

  if (env.RESEND_API_KEY && ownerEmail) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || "Prince George Transport <onboarding@resend.dev>",
        to: [ownerEmail],
        reply_to: email,
        subject: `PGT Inquiry: ${item} — ${name}`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Could not send inquiry. Please call (803) 231-9420." }, 503);
    }
  }

  return json({ ok: true });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
