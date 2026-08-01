"""
Copy supply photos into public/img/supplies and merge items into live inventory API.
"""
from __future__ import annotations

import json
import shutil
import sys
import urllib.request
import http.cookiejar
from pathlib import Path

ROOT = Path(r"C:\Users\User\prince-george-transport")
JPG_DIR = Path(r"C:\Users\User\Downloads\ambulance-supplies-jpg")
IMG_OUT = ROOT / "public" / "img" / "supplies"
CATALOG = ROOT / "scripts" / "data" / "ambulance-supplies-batch-2026.json"
SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"


def copy_photos(items: list[dict]) -> list[dict]:
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    for item in items:
        pid = item["primaryPhoto"]
        src = JPG_DIR / f"{pid}.jpg"
        if not src.exists():
            raise FileNotFoundError(src)
        dest_name = f"{item['id']}.jpg"
        dest = IMG_OUT / dest_name
        shutil.copy2(src, dest)
        item["imageUrl"] = f"/img/supplies/{dest_name}"

        extras = []
        for photo in item.get("photoIds", []):
            if photo == pid:
                continue
            esrc = JPG_DIR / f"{photo}.jpg"
            if not esrc.exists():
                continue
            ename = f"{item['id']}-{photo.lower()}.jpg"
            edest = IMG_OUT / ename
            shutil.copy2(esrc, edest)
            extras.append(f"/img/supplies/{ename}")
        item["extraImageUrls"] = extras
    return items


UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def api(cookie_jar: http.cookiejar.CookieJar, method: str, path: str, body: dict | None = None):
    data = None
    headers = {
        "Content-Type": "application/json",
        "User-Agent": UA,
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(SITE + path, data=data, headers=headers, method=method)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    with opener.open(req, timeout=180) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    items = json.loads(CATALOG.read_text(encoding="utf-8"))
    print(f"Catalog items: {len(items)}")
    items = copy_photos(items)
    print(f"Photos copied to {IMG_OUT}")

    jar = http.cookiejar.CookieJar()
    login = api(jar, "POST", "/api/admin/login", {"pin": PIN})
    print("Login:", login)

    existing = api(jar, "GET", "/api/admin/inventory")["items"]
    print(f"Existing inventory: {len(existing)}")

    # Drop previous versions of this batch by id, keep radios + other items
    batch_ids = {i["id"] for i in items}
    kept = [e for e in existing if e.get("id") not in batch_ids]
    # Also remove any prior batch items that might have been slugified differently — keep known radio ids etc.
    new_items = []
    for i in items:
        new_items.append(
            {
                "id": i["id"],
                "name": i["name"],
                "brand": i.get("brand") or "",
                "condition": i.get("condition") or "Used",
                "category": "supplies",
                "price": i.get("price"),
                "quantity": i.get("quantity") or 1,
                "description": i.get("description") or "",
                "ebayTitle": i.get("ebayTitle") or "",
                "ebayCategoryId": i.get("ebayCategoryId") or "117042",
                "imageUrl": i["imageUrl"],
                "extraImageUrls": i.get("extraImageUrls") or [],
                "ebayQueued": True,
            }
        )

    merged = new_items + kept
    saved = api(jar, "PUT", "/api/admin/inventory", {"items": merged})
    print(f"Saved inventory: {len(saved['items'])} items ({len(new_items)} new supplies)")
    total = sum((i.get("price") or 0) * (i.get("quantity") or 1) for i in new_items)
    print(f"New batch list value (sum): ${total:.0f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", e)
        sys.exit(1)
