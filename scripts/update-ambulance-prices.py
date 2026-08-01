"""Price ambulances: only P-07 jump-start ($5k); P-03/P-04 not running ($3k). OBO; buyer pays shipping."""
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

UPDATES = {
    "ambulance-p04": {
        "price": 3000,
        "condition": "Used — Not running",
        "acceptOffers": True,
        "ebayTitle": "Ford E-Series Type II Ambulance Unit P-04 Not Running As-Is OBO",
        "description": (
            "Fleet-retired Prince George Transport Type II high-top ambulance, unit P-04 / side #4. "
            "SC plate P676883. Outdoor-stored; OUT OF SERVICE tag on dash. "
            "Does not run — sold as a non-running project / parts / body. "
            "Driver-side lower body dent photographed. Cosmetic wear, pine debris, and fleet aging expected.\n\n"
            "Asking $3,000 OBO (or best offer).\n"
            "Buyer pays shipping / transport. Local pickup available at 200 Louthian Way, Blythewood, SC 29016.\n"
            "Sold as-is, where-is, with no warranty. Buyer responsible for title/registration verification at walkthrough. "
            "Call/text (803) 231-9420."
        ),
    },
    "ambulance-p03": {
        "price": 3000,
        "condition": "Used — Not running",
        "acceptOffers": True,
        "ebayTitle": "Ford E-Series Type II Ambulance Unit P-03 Not Running As-Is OBO",
        "description": (
            "Fleet-retired Prince George Transport Type II high-top ambulance, unit P-03 / side #3. "
            "SC plate P811790. Rear chevron graphics, dual Star of Life. "
            "Does not run — sold as a non-running project / parts / body. "
            "Stored outdoors on grass; mildew/dirt on lower body typical of retired fleet. "
            "Patient compartment photographed (gray vinyl interior).\n\n"
            "Asking $3,000 OBO (or best offer).\n"
            "Buyer pays shipping / transport. Local pickup available at 200 Louthian Way, Blythewood, SC 29016.\n"
            "Sold as-is, where-is, with no warranty. Verify VIN, title, and miles in person. "
            "Call/text (803) 231-9420."
        ),
    },
    "ambulance-p07": {
        "price": 5000,
        "condition": "Used — Runs with jump",
        "acceptOffers": True,
        "ebayTitle": "McCoy Miller Ford Type II Ambulance Unit P-07 Runs w Jump As-Is OBO",
        "description": (
            "Fleet-retired Prince George Transport high-top ambulance, unit P-07. "
            "McCoy Miller conversion on Ford chassis. SC plate P841040. "
            "Jump-start capable — starts/runs with a jump; battery and overall mechanical condition unknown — sold as-is. "
            "Outdoor storage with soiling on lower panels. Scene-light roof package photographed.\n\n"
            "Asking $5,000 OBO (or best offer).\n"
            "Buyer pays shipping / transport. Local pickup available at 200 Louthian Way, Blythewood, SC 29016.\n"
            "Sold as-is, where-is, with no warranty. Confirm VIN, title, miles, and options in person. "
            "Call/text (803) 231-9420."
        ),
    },
}


def api(jar, method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SITE + path,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": UA,
            "Accept": "application/json",
        },
        method=method,
    )
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    with opener.open(req, timeout=180) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    jar = http.cookiejar.CookieJar()
    api(jar, "POST", "/api/admin/login", {"pin": PIN})
    items = api(jar, "GET", "/api/admin/inventory")["items"]
    updated = 0
    for item in items:
        patch = UPDATES.get(item["id"])
        if not patch:
            continue
        item.update(patch)
        updated += 1
        print(f"Updated {item['id']}: ${patch['price']} · {patch['condition']}")

    if updated != 3:
        raise SystemExit(f"Expected 3 vehicles, updated {updated}")

    saved = api(jar, "PUT", "/api/admin/inventory", {"items": items})
    for v in saved["items"]:
        if v.get("category") == "vehicles":
            print(f"  LIVE {v['id']}: ${v.get('price')} · {v.get('condition')}")


if __name__ == "__main__":
    main()
