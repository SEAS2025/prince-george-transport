"""Build eBay Create-drafts CSV for all PGT ambulance / vehicle listings."""
from __future__ import annotations

import csv
import html
import json
import re
import urllib.request
from pathlib import Path

SITE = "https://prince-george-transport.pages.dev"
# Leaf category under Commercial Trucks → Van/Box Trucks (63732/80761 are parents).
CATEGORY = "80762"  # Box Trucks & Cube Vans
OUT = Path(r"C:\Users\User\Downloads\pgt-ebay-AMBULANCES-drafts.csv")

# Match Seller Hub → Business policies exactly (case-sensitive).
PAYMENT_PROFILE = "eBay Managed Payments (259705629010)"
SHIPPING_PROFILE = "PGT Domestic + Local Pickup"
RETURN_PROFILE = "PGT Policy"

ACTION = "Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)"
FIELDS = [
    ACTION,
    "Custom label (SKU)",
    "Category ID",
    "Title",
    "Seller Provided Title",
    "UPC",
    "Price",
    "Quantity",
    "Item photo URL",
    "Condition ID",
    "Description",
    "Format",
    "C:Brand",
    "C:Type",
    "Year",
    "Mileage",
    "Vehicle Title",
    "C:VIN",
    "PostalCode",
    "Payment profile name",
    "Shipping profile name",
    "Return profile name",
]


def abs_url(path: str) -> str:
    if not path:
        return ""
    if path.startswith("http"):
        return path
    return SITE.rstrip("/") + (path if path.startswith("/") else "/" + path)


def desc_html(item: dict) -> str:
    parts = []
    text = item.get("description") or ""
    for p in text.split("\n"):
        p = p.strip()
        if p:
            parts.append(f"<p>{html.escape(p)}</p>")

    vin = (item.get("serialNumber") or "").strip()
    miles = item.get("mileage")
    engine = (item.get("engineNotes") or "").strip()
    if vin:
        parts.append(f"<p><strong>VIN:</strong> {html.escape(vin)}</p>")
    if miles is not None and miles != "":
        parts.append(f"<p><strong>Odometer:</strong> {int(miles):,} mi</p>")
    if engine:
        parts.append(f"<p><strong>Engine / work:</strong> {html.escape(engine)}</p>")

    parts.append(
        "<p><strong>Or Best Offer (OBO)</strong> welcome. Buyer pays all shipping / freight / transport. "
        "Local pickup available in Blythewood SC — call (803) 231-9420 to arrange. Sold as-is.</p>"
    )
    return "".join(parts)


def vehicle_year(item: dict) -> str:
    m = re.search(r"\b(19|20)\d{2}\b", item.get("name") or "")
    return m.group(0) if m else ""


def seller_subtitle(item: dict) -> str:
    miles = item.get("mileage")
    mi = f"{int(miles):,} mi" if miles is not None else ""
    bits = ["Not Running", "Parts/Project/Body OBO"]
    if mi:
        bits.insert(1, mi)
    return " | ".join(bits)[:80]


def main():
    req = urllib.request.Request(
        SITE + "/api/inventory", headers={"User-Agent": "Mozilla/5.0"}
    )
    items = [
        i
        for i in json.loads(urllib.request.urlopen(req).read())["items"]
        if i.get("category") == "vehicles"
    ]
    if not items:
        raise SystemExit("No vehicles in inventory")

    rows = []
    for i in items:
        photos = []
        if i.get("imageUrl"):
            photos.append(abs_url(i["imageUrl"]))
        for u in i.get("extraImageUrls") or []:
            if u:
                photos.append(abs_url(u))
        title = (i.get("ebayTitle") or i.get("name") or "")[:80]
        price = i.get("price")
        if price is None:
            continue
        rows.append(
            {
                ACTION: "Draft",
                "Custom label (SKU)": i["id"],
                "Category ID": CATEGORY,
                "Title": title,
                "Seller Provided Title": seller_subtitle(i),
                "UPC": "Does not apply",
                "Price": str(int(price)),
                "Quantity": "1",
                "Item photo URL": "|".join(photos),
                "Condition ID": "3000",
                "Description": desc_html(i),
                "Format": "FixedPrice",
                "C:Brand": (i.get("brand") or "Ford").split("/")[0].strip(),
                "C:Type": "Ambulance",
                "Year": vehicle_year(i),
                "Mileage": str(int(i["mileage"])) if i.get("mileage") is not None else "",
                "Vehicle Title": "Clear",
                "C:VIN": (i.get("serialNumber") or "").strip(),
                "PostalCode": "29016",
                "Payment profile name": PAYMENT_PROFILE,
                "Shipping profile name": SHIPPING_PROFILE,
                "Return profile name": RETURN_PROFILE,
            }
        )

    info = [
        ["#INFO", "Version=0.0.2", "Template= eBay-draft-listings-template_US"],
        [
            "#INFO",
            "Category 80762 = Box Trucks & Cube Vans (leaf). PostalCode=29016 sets item location.",
        ],
        [
            "#INFO",
            f"Payment={PAYMENT_PROFILE} Shipping={SHIPPING_PROFILE} Return={RETURN_PROFILE}",
        ],
        [
            "#INFO",
            "If 'No Offline Payments' persists: edit Payment policy → enable Cash on pickup.",
        ],
        ["#INFO", "Upload at https://www.ebay.com/sh/reports → Create new drafts"],
    ]

    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for line in info:
            w.writerow(line)
        w.writerow(FIELDS)
        for r in rows:
            w.writerow([r.get(h, "") for h in FIELDS])

    print(f"Wrote {len(rows)} -> {OUT}")
    for r in rows:
        print(f"  {r['Custom label (SKU)']}: ${r['Price']}  {r['Title'][:60]}")


if __name__ == "__main__":
    main()
