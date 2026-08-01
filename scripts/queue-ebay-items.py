"""Mark all priced non-vehicle items as ebayQueued for publish."""
from __future__ import annotations

import json
import http.cookiejar
import urllib.request

SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def api(jar, method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SITE + path,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json"},
        method=method,
    )
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    with opener.open(req, timeout=180) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    jar = http.cookiejar.CookieJar()
    api(jar, "POST", "/api/admin/login", {"pin": PIN})
    items = api(jar, "GET", "/api/admin/inventory")["items"]
    queued = 0
    skipped = 0
    for i in items:
        if i.get("category") == "vehicles" or not i.get("price"):
            skipped += 1
            continue
        if not i.get("ebayQueued"):
            i["ebayQueued"] = True
            queued += 1
        else:
            i["ebayQueued"] = True
    api(jar, "PUT", "/api/admin/inventory", {"items": items})
    ready = [i for i in items if i.get("ebayQueued") and i.get("price") and i.get("category") != "vehicles"]
    print(f"Queued/ready to publish: {len(ready)}")
    print(f"Skipped (vehicles / no price): {skipped}")
    print(f"Newly flagged: {queued}")


if __name__ == "__main__":
    main()
