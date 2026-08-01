import { getInventory, saveInventory, normalizeItem, slugify } from "../_lib/inventory.js";
import { timingSafeEqual } from "../_lib/auth.js";
import { saveCaptureImage, newCaptureId } from "../_lib/capture-queue.js";

// Owner-only, PIN-protected editor for vehicle mileage + engine notes.
// Uses a dedicated FLEET_PIN secret (separate from the full admin PIN) so the
// owner can update fleet details without access to the rest of the admin.

function fleetPin(env) {
  return env.FLEET_PIN || null;
}

function publicVehicle(v) {
  return {
    id: v.id,
    name: v.name,
    price: v.price,
    condition: v.condition,
    mileage: v.mileage ?? null,
    engineNotes: v.engineNotes || "",
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const pin = fleetPin(env);
  if (!pin) return json({ error: "Fleet editor is not configured yet." }, 500);
  if (!body.pin || !timingSafeEqual(String(body.pin), String(pin))) {
    return json({ error: "Incorrect PIN." }, 401);
  }

  const items = await getInventory(env);

  // Create a brand-new listing (vehicle or product), optionally with photos.
  if (body.create) {
    return await handleCreate(env, items, body.create);
  }

  // No updates: this is a login / load request.
  if (!Array.isArray(body.updates)) {
    const vehicles = items.filter((i) => i.category === "vehicles").map(publicVehicle);
    return json({ ok: true, vehicles });
  }

  const byId = new Map(body.updates.map((u) => [String(u.id), u]));
  let changed = 0;
  for (const item of items) {
    if (item.category !== "vehicles") continue;
    const u = byId.get(item.id);
    if (!u) continue;
    if ("mileage" in u) {
      const m = u.mileage === "" || u.mileage === null || u.mileage === undefined ? null : Number(u.mileage);
      item.mileage = Number.isFinite(m) && m >= 0 ? Math.round(m) : null;
    }
    if ("engineNotes" in u) {
      item.engineNotes = String(u.engineNotes || "").trim();
    }
    changed++;
  }

  const saved = await saveInventory(env, items);
  const vehicles = saved.filter((i) => i.category === "vehicles").map(publicVehicle);
  return json({ ok: true, changed, vehicles });
}

async function handleCreate(env, items, create) {
  const name = String(create.name || "").trim();
  if (!name) return json({ error: "Name is required." }, 400);

  const validCategories = ["vehicles", "supplies", "radios"];
  const category = validCategories.includes(create.category) ? create.category : "supplies";

  // Store any uploaded photos in KV; first is the main image, rest are extras.
  const images = Array.isArray(create.images) ? create.images.slice(0, 8) : [];
  const imageUrls = [];
  for (const img of images) {
    if (!img || !img.base64) continue;
    const bytes = base64ToArrayBuffer(img.base64);
    if (!bytes || bytes.byteLength < 100) continue;
    if (bytes.byteLength > 6 * 1024 * 1024) {
      return json({ error: "Each photo must be under 6 MB." }, 400);
    }
    const id = newCaptureId();
    await saveCaptureImage(env, id, bytes, img.mimeType || "image/jpeg");
    imageUrls.push(`/api/capture-image/${id}`);
  }

  const baseId = slugify(name) || newCaptureId();
  let id = baseId;
  let n = 2;
  while (items.some((i) => i.id === id)) {
    id = `${baseId}-${n++}`;
  }

  const item = normalizeItem({
    id,
    name,
    category,
    condition: create.condition || (category === "vehicles" ? "Used" : "Used"),
    brand: create.brand || "",
    price: create.price,
    quantity: create.quantity,
    description: create.description || "",
    serialNumber: create.serialNumber || "",
    imageUrl: imageUrls[0] || "",
    extraImageUrls: imageUrls.slice(1),
    acceptOffers: create.acceptOffers === true || (category === "vehicles" && create.acceptOffers !== false),
    mileage: category === "vehicles" ? create.mileage : null,
    engineNotes: category === "vehicles" ? create.engineNotes : "",
  });
  if (!item) return json({ error: "Could not create listing." }, 400);

  items.unshift(item);
  await saveInventory(env, items);

  return json({ ok: true, item });
}

function base64ToArrayBuffer(b64) {
  const raw = String(b64).replace(/^data:[^;]+;base64,/, "");
  const bin = atob(raw);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
