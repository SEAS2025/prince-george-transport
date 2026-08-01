import { isAdmin } from "../../../../_lib/auth.js";
import { getCaptureImage } from "../../../../_lib/capture-queue.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const id = params?.id;
  if (!id) return new Response("Not found", { status: 404 });

  if (!(await isAdmin(request, env))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const img = await getCaptureImage(env, id);
  if (!img) return new Response("Not found", { status: 404 });

  return new Response(img.bytes, {
    status: 200,
    headers: {
      "Content-Type": img.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
