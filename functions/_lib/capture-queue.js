// Capture queue — label photos awaiting review and eBay publish.

export const CAPTURE_QUEUE_KEY = "capture:queue:v1";
export const CAPTURE_IMAGE_PREFIX = "capture:img:";

export async function getCaptureQueue(env) {
  if (!env.INVENTORY) return [];
  const raw = await env.INVENTORY.get(CAPTURE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function saveCaptureQueue(env, items) {
  if (!env.INVENTORY) throw new Error("Storage not configured");
  await env.INVENTORY.put(CAPTURE_QUEUE_KEY, JSON.stringify(items));
  return items;
}

export async function saveCaptureImage(env, id, bytes, mimeType = "image/jpeg") {
  if (!env.INVENTORY) throw new Error("Storage not configured");
  const key = CAPTURE_IMAGE_PREFIX + id;
  await env.INVENTORY.put(key, bytes);
  return `/api/admin/capture/image/${id}`;
}

export async function getCaptureImage(env, id) {
  if (!env.INVENTORY) return null;
  const bytes = await env.INVENTORY.get(CAPTURE_IMAGE_PREFIX + id, { type: "arrayBuffer" });
  if (!bytes) return null;
  return { bytes, mimeType: "image/jpeg" };
}

export function newCaptureId() {
  return "cap-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

export function normalizeCaptureItem(item) {
  if (!item?.id) return null;
  return {
    id: item.id,
    status: item.status || "ready",
    category: item.category || "supplies",
    name: String(item.name || "").trim(),
    brand: String(item.brand || "").trim(),
    model: String(item.model || "").trim(),
    serialNumber: String(item.serialNumber || "").trim(),
    condition: String(item.condition || "Used").trim(),
    description: String(item.description || "").trim(),
    price: item.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null,
    ebayTitle: String(item.ebayTitle || "").trim(),
    ebayCategoryId: String(item.ebayCategoryId || "").trim(),
    ebayQueued: item.ebayQueued !== false,
    imageUrl: String(item.imageUrl || "").trim(),
    confidence: String(item.confidence || "medium").trim(),
    aiSource: String(item.aiSource || "").trim(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function upsertCaptureItem(env, item) {
  const normalized = normalizeCaptureItem(item);
  if (!normalized) throw new Error("Invalid capture item");
  const queue = await getCaptureQueue(env);
  const idx = queue.findIndex((q) => q.id === normalized.id);
  if (idx >= 0) queue[idx] = normalized;
  else queue.unshift(normalized);
  await saveCaptureQueue(env, queue);
  return normalized;
}

export async function removeCaptureItem(env, id) {
  const queue = await getCaptureQueue(env);
  const next = queue.filter((q) => q.id !== id);
  await saveCaptureQueue(env, next);
  if (env.INVENTORY) await env.INVENTORY.delete(CAPTURE_IMAGE_PREFIX + id);
  return next;
}
