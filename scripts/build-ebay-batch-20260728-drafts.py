"""Build eBay Create-drafts CSV for ebay-batch-20260728 supplies."""
from __future__ import annotations

import csv
import html
import json
import re
import urllib.request
from pathlib import Path

SITE = "https://prince-george-transport.pages.dev"
CATALOG = Path(__file__).resolve().parent / "data" / "ebay-batch-20260728.json"
OUT = Path(r"C:\Users\User\Downloads\pgt-ebay-BATCH-20260728-drafts.csv")

PAYMENT_PROFILE = "eBay Managed Payments (259705629010)"
SHIPPING_PROFILE = "PGT Domestic + Local Pickup"
RETURN_PROFILE = "PGT Policy"

ACTION = "Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)"
FIELDS = [
    ACTION,
    "Custom label (SKU)",
    "Category ID",
    "Title",
    "UPC",
    "Price",
    "Quantity",
    "Item photo URL",
    "Condition ID",
    "Description",
    "Format",
    "C:Brand",
    "C:Type",
    "PostalCode",
    "Payment profile name",
    "Shipping profile name",
    "Return profile name",
]

BATCH_IDS: set[str] | None = None


def abs_url(path: str) -> str:
    if not path:
        return ""
    if path.startswith("http"):
        return path
    return SITE.rstrip("/") + (path if path.startswith("/") else "/" + path)


def desc_html(text: str) -> str:
    parts = []
    for p in text.split("\n"):
        p = p.strip()
        if p:
            parts.append(f"<p>{html.escape(p)}</p>")
    parts.append(
        "<p>Prince George Transport — licensed SC ambulance service. "
        "Item location Blythewood SC 29016. Local pickup available.</p>"
    )
    return "".join(parts)


def condition_id(condition: str, title: str) -> str:
    blob = f"{condition} {title}".upper()
    if "EXPIRED" in blob or "TRAINING" in blob:
        return "1500"  # New other — common for expired sealed medical on eBay
    if "OPEN" in blob or "AS-IS" in blob or "USED" in blob:
        return "3000"
    return "1000"


def item_type(name: str) -> str:
    n = name.lower()
    if "igel" in n or "i-gel" in n or "laryseal" in n or "lma" in n:
        return "Airway Management"
    if "electrode" in n or "pad" in n or "defib" in n or "aed" in n:
        return "Defibrillator Accessories"
    if "nasopharyngeal" in n or "npa" in n or "airway" in n:
        return "Airway Management"
    if "bvm" in n or "resuscitator" in n:
        return "CPR & Resuscitation"
    if "lancet" in n or "glucose" in n or "strip" in n:
        return "Diabetic Care"
    if "suction" in n:
        return "Medical Supplies"
    if "ob kit" in n or "obstetrical" in n:
        return "First Aid Kits"
    return "EMS Medical Supplies"


def brand_clean(brand: str) -> str:
    b = (brand or "").split("/")[0].strip()
    return b or "Unbranded"


def main():
    global BATCH_IDS
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    BATCH_IDS = {i["id"] for i in catalog}

    req = urllib.request.Request(
        SITE + "/api/inventory", headers={"User-Agent": "Mozilla/5.0"}
    )
    items = [
        i
        for i in json.loads(urllib.request.urlopen(req).read())["items"]
        if i.get("id") in BATCH_IDS and i.get("price") is not None
    ]
    if len(items) != len(BATCH_IDS):
        missing = BATCH_IDS - {i["id"] for i in items}
        print("Warning: not yet on live inventory:", sorted(missing))

    rows = []
    for i in sorted(items, key=lambda x: x["id"]):
        photos = []
        if i.get("imageUrl"):
            photos.append(abs_url(i["imageUrl"]))
        for u in i.get("extraImageUrls") or []:
            if u:
                photos.append(abs_url(u))
        title = (i.get("ebayTitle") or i.get("name") or "")[:80]
        rows.append(
            {
                ACTION: "Draft",
                "Custom label (SKU)": i["id"],
                "Category ID": i.get("ebayCategoryId") or "117042",
                "Title": title,
                "UPC": "Does not apply",
                "Price": str(int(i["price"])),
                "Quantity": str(i.get("quantity") or 1),
                "Item photo URL": "|".join(photos),
                "Condition ID": condition_id(i.get("condition") or "", title),
                "Description": desc_html(i.get("description") or ""),
                "Format": "FixedPrice",
                "C:Brand": brand_clean(i.get("brand") or ""),
                "C:Type": item_type(i.get("name") or ""),
                "PostalCode": "29016",
                "Payment profile name": PAYMENT_PROFILE,
                "Shipping profile name": SHIPPING_PROFILE,
                "Return profile name": RETURN_PROFILE,
            }
        )

    info = [
        ["#INFO", "Version=0.0.2", "Template= eBay-draft-listings-template_US"],
        ["#INFO", f"Batch 20260728 — {len(rows)} supply drafts"],
        ["#INFO", f"Policies: {PAYMENT_PROFILE} / {SHIPPING_PROFILE} / {RETURN_PROFILE}"],
    ]

    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for line in info:
            w.writerow(line)
        w.writerow(FIELDS)
        for r in rows:
            w.writerow([r.get(h, "") for h in FIELDS])

    total = sum(int(r["Price"]) * int(r["Quantity"]) for r in rows)
    print(f"Wrote {len(rows)} -> {OUT}")
    print(f"Total list value: ${total}")
    for r in rows:
        print(f"  ${r['Price']:>3}  {r['Custom label (SKU)']}")


if __name__ == "__main__":
    main()
