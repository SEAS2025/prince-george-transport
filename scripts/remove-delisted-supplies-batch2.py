"""Remove a batch of supplies from live PGT inventory (Cloudflare Pages + KV)."""
from __future__ import annotations

import json
import urllib.request
import http.cookiejar

SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

REMOVE_IDS = [
    "dynarex-suction-catheters-2406",  # Dynarex Sterile Suction Catheters Lot (Ziploc)
    "burn-sheet-2407",                 # Basic Medical Supply Sterile Burn Sheet 60x90
    "medline-yankauer-2408",           # Medline Yankauer Bulb Tip w/ Control Vent + 6' Tube
    "suction-tubing-2409",             # Medical Suction Tubing with Blue Connectors
    "pandemic-quick-kit-2411",         # Pandemic Quick-Kit PPE Prep Kit
    "endure-pedi-cannula-2416",        # Endure Pediatric Nasal Oxygen Cannula NCPC211
    "medline-pedi-nrb-2417",           # Medline Pediatric High-Concentration NRB Mask HCS4642B
    "medline-yankauer-2426",           # Medline Yankauer Bulb Tip Control Vent + Tube
    "westmed-humidifier-2432",         # Westmed 6 LPM Humidifier / 15" Adapter Tubing
    "generic-bvm-set-2433",            # Manual Resuscitator / BVM Set (Rebagged)
    "laerdal-bag-ii-2434",             # Laerdal THE BAG II Disposable Manual Resuscitator
    "finelife-umbrella-2410",          # FineLife Easy Open Umbrella (Blue)
    "ferno-cot-straps-2414",           # Ferno Stretcher/Cot Restraint Strap Set
    "kendrick-traction-2421",          # Kendrick Traction Device Pouch KE-800 / KE-810
    "manual-suction-pump-2457",        # Manual Handheld Suction Pump Kit (Bagged)
    "extrication-bag-2420",            # Green Extrication Device Carrying Bag
    "face-shields-2436",               # Anti-Fog Face Shield Multipack
    "neppt-restraints-2437",           # NEPPT Patient Soft Restraint Set (Blue, 4-Pack)
    "western-safety-vest-2438",        # Western Safety Reflective Hi-Vis Vest 94701
    "hose-holder-strap-2439",          # ZTSXLLIM Hose / Cable Holder Strap
    "hf-safety-glasses-2440",          # Harbor Freight Safety Glasses Item 66822
    "vivitar-wrist-bp-2441",           # Vivitar Digital Wrist Blood Pressure Monitor
    "primacare-mylar-blankets-2459",   # Primacare Foil Mylar Rescue Blankets 52x84 (Lot ~5)
    "caresens-strips-2471",            # CareSens N Blood Glucose Test Strips 50ct
    "cohesive-bandage-9797",           # Self-Adherent Cohesive Bandage Rolls (Assorted, 5)
]


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

    removed, missing = [], []
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
    still = [i for i in REMOVE_IDS if i in {x['id'] for x in after}]
    print("STILL PRESENT:" if still else "All requested IDs gone.", still or "")
    if missing:
        print(f"Already absent: {len(missing)} -> {missing}")


if __name__ == "__main__":
    main()
