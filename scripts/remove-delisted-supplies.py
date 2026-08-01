"""Remove 15 supplies from live PGT inventory (Cloudflare Pages + KV)."""
from __future__ import annotations

import json
import urllib.request
import http.cookiejar
from pathlib import Path

SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

REMOVE_IDS = [
    "quik-combo-redi-pak-2395",
    "physio-infant-pads-2396",
    "quik-combo-adult-2397",
    "physio-infant-pads-indate-2429",
    "berman-opa-kit-2399",
    "berman-opa-lot-2400",
    "adc-berman-kit-2435",
    "patient-care-kit-2404",
    "red-padded-splints-2405",
    "orange-padded-splints-2415",
    "porta-sharps-2422",
    "bemis-canister-expired-2431",
    "ambu-peep-2442",
    "ambu-peep-2446",
    "flexicare-laryseal-2453",
]

ROOT = Path(r"C:\Users\User\prince-george-transport")
CATALOG = ROOT / "scripts" / "data" / "ambulance-supplies-batch-2026.json"


def api(jar, method, path, body=None):
    data = None
    headers = {"Content-Type": "application/json", "User-Agent": UA, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(SITE + path, data=data, headers=headers, method=method)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    with opener.open(req, timeout=120) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    jar = http.cookiejar.CookieJar()
    api(jar, "POST", "/api/admin/login", {"pin": PIN})
    before = api(jar, "GET", "/api/admin/inventory")["items"]
    before_ids = {i["id"] for i in before}
    print(f"Before: {len(before)} items")

    removed = []
    missing = []
    for iid in REMOVE_IDS:
        if iid not in before_ids:
            missing.append(iid)
            print(f"  skip (not on site): {iid}")
            continue
        try:
            api(jar, "DELETE", f"/api/admin/inventory/{iid}")
            removed.append(iid)
            print(f"  deleted: {iid}")
        except Exception as e:
            print(f"  FAIL {iid}: {e}")

    after = api(jar, "GET", "/api/admin/inventory")["items"]
    print(f"After: {len(after)} items (removed {len(removed)})")
    still = [i for i in REMOVE_IDS if i in {x["id"] for x in after}]
    if still:
        print("STILL PRESENT:", still)
    else:
        print("All listed IDs gone from live inventory.")

    # Keep local catalog in sync
    if CATALOG.exists():
        cat = json.loads(CATALOG.read_text(encoding="utf-8"))
        new_cat = [i for i in cat if i.get("id") not in set(REMOVE_IDS)]
        CATALOG.write_text(json.dumps(new_cat, indent=2) + "\n", encoding="utf-8")
        print(f"Catalog updated: {len(cat)} -> {len(new_cat)}")

    if missing:
        print(f"Already absent: {len(missing)}")


if __name__ == "__main__":
    main()
