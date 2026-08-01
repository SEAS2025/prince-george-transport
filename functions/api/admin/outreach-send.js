import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { EMT_LEADS } from "../../_lib/emt-leads.js";
import { outreachEmailTemplate } from "../../_lib/marketplace.js";

/**
 * Send school outreach emails via Resend.
 * Requires RESEND_API_KEY + OWNER_EMAIL/EMAIL_FROM with a verified domain
 * (onboarding@resend.dev cannot cold-email schools).
 *
 * Body: { leadIds?: string[], dryRun?: boolean }
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!env.RESEND_API_KEY) {
    return json(
      {
        error:
          "RESEND_API_KEY not configured. Set a Resend key and verify a sending domain (e.g. info@princegeorgetransport.com). onboarding@resend.dev cannot email schools.",
        setup: "npx wrangler pages secret put RESEND_API_KEY --project-name=prince-george-transport",
      },
      503
    );
  }

  const from = env.EMAIL_FROM || "";
  if (!from || /onboarding@resend\.dev/i.test(from)) {
    return json(
      {
        error:
          "Set EMAIL_FROM to an address on your verified Resend domain before cold outreach (not onboarding@resend.dev).",
      },
      503
    );
  }

  const items = await getInventory(env);
  const wanted = Array.isArray(body.leadIds) && body.leadIds.length
    ? EMT_LEADS.filter((l) => body.leadIds.includes(l.id))
    : EMT_LEADS.filter((l) => l.email);

  const results = [];
  for (const lead of wanted) {
    const to = [lead.email, lead.altEmail].filter(Boolean);
    if (!to.length) {
      results.push({ id: lead.id, ok: false, error: "No email", phone: lead.phone });
      continue;
    }

    const raw = outreachEmailTemplate(lead, items);
    const { subject, text } = splitSubject(raw);
    const html = `<pre style="font-family:Georgia,serif;font-size:15px;white-space:pre-wrap">${esc(text)}</pre>` +
      `<p><a href="https://prince-george-transport.pages.dev/supplies">View supplies inventory</a></p>`;

    if (body.dryRun) {
      results.push({ id: lead.id, ok: true, dryRun: true, to, subject });
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          reply_to: env.EMAIL_REPLY_TO || "info@princegeorgetransport.com",
          subject,
          text,
          html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        results.push({ id: lead.id, ok: false, to, error: data.message || `Resend ${res.status}` });
      } else {
        results.push({ id: lead.id, ok: true, to, subject, emailId: data.id });
      }
    } catch (e) {
      results.push({ id: lead.id, ok: false, to, error: e.message });
    }
  }

  return json({
    ok: results.every((r) => r.ok),
    sent: results.filter((r) => r.ok && !r.dryRun).length,
    results,
  });
}

function splitSubject(raw) {
  const m = String(raw).match(/^Subject:\s*(.+)\n\n([\s\S]*)$/);
  if (m) return { subject: m[1].trim(), text: m[2].trim() };
  return { subject: "Surplus EMS training equipment — Prince George Transport", text: String(raw) };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
