// PIN-based admin session cookies (HMAC-SHA256).

export const ADMIN_COOKIE = "pgtadmin";
export const SESSION_TTL_SEC = 12 * 60 * 60; // 12 hours

function b64urlEncode(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(secret, payload) {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return body + "." + b64urlEncode(sig);
}

export async function verifyToken(secret, token) {
  if (!token || token.indexOf(".") < 0) return null;
  const [body, sig] = token.split(".");
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(body)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const p of header.split(/;\s*/)) {
    const idx = p.indexOf("=");
    if (idx > -1 && p.slice(0, idx) === name) return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export function buildSetCookie(name, value, maxAgeSec) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ].join("; ");
}

export function signingSecret(env) {
  return env.ADMIN_SIGNING_SECRET || env.ADMIN_PIN || null;
}

export async function isAdmin(request, env) {
  const secret = signingSecret(env);
  if (!secret) return false;
  const token = readCookie(request, ADMIN_COOKIE);
  const payload = await verifyToken(secret, token);
  return payload?.role === "admin";
}

export async function mintAdminCookie(env) {
  const secret = signingSecret(env);
  if (!secret) throw new Error("Admin auth not configured");
  const value = await signToken(secret, {
    role: "admin",
    exp: Date.now() + SESSION_TTL_SEC * 1000,
  });
  return buildSetCookie(ADMIN_COOKIE, value, SESSION_TTL_SEC);
}

export function clearAdminCookie() {
  return buildSetCookie(ADMIN_COOKIE, "", 0);
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
