/**
 * Re-process low-confidence capture queue items using Cursor Agent (local CLI).
 * Requires: CURSOR_API_KEY, ADMIN_PIN, npm install @cursor/sdk (optional devDep)
 *
 * Usage:
 *   node scripts/process-capture-cursor.mjs
 *   node scripts/process-capture-cursor.mjs cap-xxxxx
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = process.env.SITE_URL || "https://prince-george-transport.pages.dev";
const PIN = process.env.ADMIN_PIN || readDevVar("ADMIN_PIN");

function readDevVar(name) {
  const p = join(ROOT, ".dev.vars");
  if (!existsSync(p)) return "";
  const line = readFileSync(p, "utf8").split("\n").find((l) => l.startsWith(name + "="));
  return line ? line.split("=").slice(1).join("=").trim() : "";
}

async function adminFetch(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${SITE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { data, cookie: res.headers.getSetCookie?.()?.join("; ") || cookie };
}

async function login() {
  const res = await fetch(`${SITE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
    body: JSON.stringify({ pin: PIN }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("Login failed — check ADMIN_PIN");
  return cookie;
}

async function analyzeWithCursor(imageUrl, cookie) {
  let Agent;
  try {
    ({ Agent } = await import("@cursor/sdk"));
  } catch {
    throw new Error("Install @cursor/sdk: npm install -D @cursor/sdk");
  }

  if (!process.env.CURSOR_API_KEY) {
    throw new Error("Set CURSOR_API_KEY environment variable");
  }

  const prompt = `Fetch and analyze the product label image at ${SITE}${imageUrl}.

This is used ambulance/EMS fleet equipment for eBay resale by Prince George Transport (Blythewood, SC).

Return ONLY JSON:
{
  "category": "radios" or "supplies",
  "name": "...",
  "brand": "...",
  "model": "...",
  "serialNumber": "...",
  "description": "eBay-ready 2-3 paragraphs",
  "suggestedPrice": number,
  "ebayTitle": "max 80 chars",
  "ebayCategoryId": "46539 or 117042",
  "confidence": "high|medium|low"
}`;

  const result = await Agent.prompt(prompt, {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "composer-2.5" },
    local: { cwd: ROOT },
  });

  const text = result.result || result.output || "";
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Cursor did not return JSON");
  return JSON.parse(match[0]);
}

async function main() {
  const targetId = process.argv[2];
  if (!PIN) throw new Error("Set ADMIN_PIN or add to .dev.vars");

  console.log("Logging in...");
  const cookie = await login();

  const { data: queueData } = await adminFetch("/api/admin/queue", { cookie });
  let items = (queueData.queue || []).filter((i) => i.status === "ready");
  if (targetId) items = items.filter((i) => i.id === targetId);

  if (!items.length) {
    console.log("No items to process.");
    return;
  }

  for (const item of items) {
    console.log(`Processing ${item.id} (${item.name})...`);
    try {
      const analysis = await analyzeWithCursor(item.imageUrl, cookie);
      await adminFetch("/api/admin/queue", {
        method: "POST",
        cookie,
        body: {
          action: "update",
          id: item.id,
          item: {
            ...item,
            ...analysis,
            price: analysis.suggestedPrice ?? analysis.price,
            aiSource: "cursor-cli",
            confidence: analysis.confidence || "high",
          },
        },
      });
      console.log(`  Updated: ${analysis.name} — $${analysis.suggestedPrice}`);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
