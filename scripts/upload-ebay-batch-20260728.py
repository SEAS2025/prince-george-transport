"""Upload ebay-batch-20260728 photos + inventory to live site."""
from __future__ import annotations

import json
import shutil
import sys
import urllib.request
import http.cookiejar
from pathlib import Path

ROOT = Path(r"C:\Users\User\prince-george-transport")
JPG_DIR = ROOT / "scripts" / "data" / "ebay-items-20260728" / "jpg"
IMG_OUT = ROOT / "public" / "img" / "supplies"
CATALOG = ROOT / "scripts" / "data" / "ebay-batch-20260728.json"
SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


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

    batch_ids = {i["id"] for i in items}
    kept = [e for e in existing if e.get("id") not in batch_ids]
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
    expired = sum(1 for i in new_items if "EXPIRED" in (i.get("condition") or ""))
    print(f"New batch: {expired} expired / {len(new_items)} total — list value ${total:.0f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", e)
        sys.exit(1)
