"""Build an eBay File Exchange style CSV that fills Brand, Type, Condition,
shipping, returns, and location for the remaining PGT drafts.

Upload as: Seller Hub → Reports → Upload → Create new drafts
(OR delete current drafts first, then upload this file to avoid duplicates.)
"""
from __future__ import annotations

import csv
import html
import re
from pathlib import Path

KEEP_SKUS = {
    "cohesive-bandage-9797",
    "dynarex-cath-10fr-2473",
    "dixie-ems-pouch-2423",
    "berman-opa-lot-2400",
    "ossur-collar-2455",
    "caresens-strips-2471",
    "spider-straps-9799",
    "radio-cm200d-751tgq0925",
    "endure-pedi-cannula-2416",
    "medline-pedi-nrb-2417",
    "radio-cm200-922tne0190",
    "laerdal-headbed-ii-9801",
    "lifepak-cr-plus-2448",
    "everdixie-bp-cuff-9806",
    "contour-control-2472",
    "laerdal-lcsu4-2450",
    "porta-sharps-2422",
    "orange-cot-straps-lot-9800",
    "finelife-umbrella-2410",
    "extrication-bag-2420",
    "pedi-board-2449",
    "primacare-mylar-blankets-2459",
    "dealmed-nrb-2454",
    "caresens-n-box-2445",
    "manual-suction-pump-2457",
    "pandemic-quick-kit-2411",
    "radio-cm300-922tmc5022",
    "laerdal-bag-ii-2434",
    "flexicare-laryseal-2453",
    "western-safety-vest-2438",
    "bbp-spill-kit-2464",
    "medline-yankauer-2426",
    "orange-padded-splints-2415",
    "ambu-peep-2446",
    "quik-combo-adult-2397",
    "dynarex-cath-8fr-2468",
    "neppt-restraints-2437",
    "ferno-cot-straps-2414",
    "smart-tag-triage-9798",
    "hf-safety-glasses-2440",
    "dynarex-suction-catheters-2406",
    "ir-thermometer-9804",
    "orange-equipment-bag-9807",
    "westmed-humidifier-2432",
    "cot-straps-mixed-2443",
    "red-padded-splints-2405",
    "primacare-restraint-2444",
    "radio-cm200-922tmu3381",
    "hose-holder-strap-2439",
    "kendrick-traction-2421",
    # Additional drafts still in Seller Hub
    "vivitar-wrist-bp-2441",
    "hard-hat-shell-2401",
    "generic-bvm-set-2433",
    "berman-opa-kit-2399",
    "patient-care-kit-2404",
    "laerdal-stifneck-9803",
    "suction-tubing-2409",
    "burn-sheet-2407",
    "ambu-peep-2442",
    "dukal-trauma-dressing-2467",
    "safety-eyewear-2402",
    "medline-yankauer-2461",
    "physio-infant-pads-2396",
    "adc-berman-kit-2435",
    "medline-yankauer-2408",
    "lifepak-500-2447",
    "face-shields-2436",
    "medline-yankauer-2452",
    "caresens-kit-9805",
    "quik-combo-redi-pak-2395",
    "stericare-saline-2462",
    "physio-infant-pads-indate-2429",
    "pyramex-hardhat-2427",
}

# Explicit Brand / Type overrides (item-specific correctness)
OVERRIDES: dict[str, dict[str, str]] = {
    "cohesive-bandage-9797": {"brand": "Unbranded", "type": "Bandage"},
    "dynarex-cath-10fr-2473": {"brand": "Dynarex", "type": "Suction Catheter"},
    "dixie-ems-pouch-2423": {"brand": "Dixie EMS", "type": "Medical Bag"},
    "berman-opa-lot-2400": {"brand": "Unbranded", "type": "Airway"},
    "ossur-collar-2455": {"brand": "Ossur", "type": "Cervical Collar"},
    "caresens-strips-2471": {"brand": "CareSens", "type": "Test Strip"},
    "spider-straps-9799": {"brand": "Unbranded", "type": "Restraint"},
    "radio-cm200d-751tgq0925": {"brand": "Motorola", "type": "Mobile Radio"},
    "endure-pedi-cannula-2416": {"brand": "Endure", "type": "Nasal Cannula"},
    "medline-pedi-nrb-2417": {"brand": "Medline", "type": "Oxygen Mask"},
    "radio-cm200-922tne0190": {"brand": "Motorola", "type": "Mobile Radio"},
    "laerdal-headbed-ii-9801": {"brand": "Laerdal", "type": "Head Immobilizer"},
    "lifepak-cr-plus-2448": {"brand": "Physio-Control", "type": "AED/Defibrillator"},
    "everdixie-bp-cuff-9806": {"brand": "EverDixie", "type": "Blood Pressure Cuff"},
    "contour-control-2472": {"brand": "Contour", "type": "Control Solution"},
    "laerdal-lcsu4-2450": {"brand": "Laerdal", "type": "Suction Unit"},
    "porta-sharps-2422": {"brand": "porta SHARPS", "type": "Sharps Container"},
    "orange-cot-straps-lot-9800": {"brand": "Unbranded", "type": "Restraint"},
    "finelife-umbrella-2410": {"brand": "FineLife", "type": "Umbrella"},
    "extrication-bag-2420": {"brand": "Unbranded", "type": "Extrication Device"},
    "pedi-board-2449": {"brand": "Basic Medical Supply", "type": "Backboard"},
    "primacare-mylar-blankets-2459": {"brand": "Primacare", "type": "Emergency Blanket"},
    "dealmed-nrb-2454": {"brand": "dealmed", "type": "Oxygen Mask"},
    "caresens-n-box-2445": {"brand": "CareSens", "type": "Glucose Meter"},
    "manual-suction-pump-2457": {"brand": "Unbranded", "type": "Suction Unit"},
    "pandemic-quick-kit-2411": {"brand": "Unbranded", "type": "PPE Kit"},
    "radio-cm300-922tmc5022": {"brand": "Motorola", "type": "Mobile Radio"},
    "laerdal-bag-ii-2434": {"brand": "Laerdal", "type": "Resuscitator"},
    "flexicare-laryseal-2453": {"brand": "Flexicare", "type": "Laryngeal Mask"},
    "western-safety-vest-2438": {"brand": "Western Safety", "type": "Safety Vest"},
    "bbp-spill-kit-2464": {"brand": "First Aid Only", "type": "Spill Kit"},
    "medline-yankauer-2426": {"brand": "Medline", "type": "Suction Tip"},
    "orange-padded-splints-2415": {"brand": "METRO ONE", "type": "Splint"},
    "ambu-peep-2446": {"brand": "Ambu", "type": "PEEP Valve"},
    "quik-combo-adult-2397": {"brand": "Physio-Control", "type": "Defibrillator Electrode"},
    "dynarex-cath-8fr-2468": {"brand": "Dynarex", "type": "Suction Catheter"},
    "neppt-restraints-2437": {"brand": "NEPPT", "type": "Restraint"},
    "ferno-cot-straps-2414": {"brand": "Ferno", "type": "Restraint"},
    "smart-tag-triage-9798": {"brand": "SMART TAG", "type": "Triage Tag"},
    "hf-safety-glasses-2440": {"brand": "Harbor Freight", "type": "Safety Glasses"},
    "dynarex-suction-catheters-2406": {"brand": "Dynarex", "type": "Suction Catheter"},
    "ir-thermometer-9804": {"brand": "Unbranded", "type": "Thermometer"},
    "orange-equipment-bag-9807": {"brand": "Unbranded", "type": "Medical Bag"},
    "westmed-humidifier-2432": {"brand": "Westmed", "type": "Humidifier"},
    "cot-straps-mixed-2443": {"brand": "Unbranded", "type": "Restraint"},
    "red-padded-splints-2405": {"brand": "Unbranded", "type": "Splint"},
    "primacare-restraint-2444": {"brand": "Primacare", "type": "Restraint"},
    "radio-cm200-922tmu3381": {"brand": "Motorola", "type": "Mobile Radio"},
    "hose-holder-strap-2439": {"brand": "Unbranded", "type": "Organizer"},
    "kendrick-traction-2421": {"brand": "Kendrick", "type": "Traction Device"},
    "vivitar-wrist-bp-2441": {"brand": "Vivitar", "type": "Blood Pressure Monitor"},
    "hard-hat-shell-2401": {"brand": "Unbranded", "type": "Hard Hat"},
    "generic-bvm-set-2433": {"brand": "Unbranded", "type": "Resuscitator"},
    "berman-opa-kit-2399": {"brand": "Unbranded", "type": "Airway"},
    "patient-care-kit-2404": {"brand": "Unbranded", "type": "Patient Care Kit"},
    "laerdal-stifneck-9803": {"brand": "Laerdal", "type": "Cervical Collar"},
    "suction-tubing-2409": {"brand": "Unbranded", "type": "Suction Tubing"},
    "burn-sheet-2407": {"brand": "Basic Medical Supply", "type": "Burn Sheet"},
    "ambu-peep-2442": {"brand": "Ambu", "type": "PEEP Valve"},
    "dukal-trauma-dressing-2467": {"brand": "DUKAL", "type": "Trauma Dressing"},
    "safety-eyewear-2402": {"brand": "Unbranded", "type": "Safety Glasses"},
    "medline-yankauer-2461": {"brand": "Medline", "type": "Suction Tip"},
    "physio-infant-pads-2396": {"brand": "Physio-Control", "type": "Defibrillator Electrode"},
    "adc-berman-kit-2435": {"brand": "ADC", "type": "Airway"},
    "medline-yankauer-2408": {"brand": "Medline", "type": "Suction Tip"},
    "lifepak-500-2447": {"brand": "Physio-Control", "type": "AED/Defibrillator"},
    "face-shields-2436": {"brand": "Unbranded", "type": "Face Shield"},
    "medline-yankauer-2452": {"brand": "Medline", "type": "Suction Tip"},
    "caresens-kit-9805": {"brand": "CareSens", "type": "Glucose Meter"},
    "quik-combo-redi-pak-2395": {"brand": "Physio-Control", "type": "Defibrillator Electrode"},
    "stericare-saline-2462": {"brand": "SteriCare", "type": "Irrigation Solution"},
    "physio-infant-pads-indate-2429": {"brand": "Physio-Control", "type": "Defibrillator Electrode"},
    "pyramex-hardhat-2427": {"brand": "Pyramex", "type": "Hard Hat"},
}


def condition_token(cond: str, title: str) -> str:
    c = (cond or "").lower()
    t = (title or "").lower()
    if "parts" in t or "as-is" in t or "for parts" in t:
        return "USED"
    if "opened" in c or "open box" in c or "opened" in t:
        return "USED"
    if re.search(r"new|sealed", c) or "sealed" in t or "new" in t[:20]:
        if "used" in t:
            return "USED"
        return "NEW"
    return "USED"


def ship_cost(price: float) -> str:
    if price >= 150:
        return "24.99"
    if price >= 80:
        return "18.99"
    if price >= 40:
        return "14.99"
    if price >= 15:
        return "9.99"
    return "6.99"


def desc_html(text: str) -> str:
    paras = [p.strip() for p in re.split(r"\n+", (text or "").strip()) if p.strip()]
    if not paras:
        paras = [""]
    parts = [f"<p>{html.escape(p)}</p>" for p in paras]
    parts.append(
        "<p>Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).</p>"
    )
    parts.append(
        "<p>Item location: Blythewood, SC 29016. Local pickup available. Call/text (803) 231-9420.</p>"
    )
    parts.append(
        "<p>Returns: 30 days. Buyer pays return shipping. Item must be unused/undamaged unless dead-on-arrival.</p>"
    )
    return "".join(parts)


def main() -> None:
    src = Path(r"C:\Users\User\Downloads\pgt-ebay-FIRST-BATCH-no-expired.csv")
    out = Path(r"C:\Users\User\Downloads\pgt-ebay-DRAFTS-FIXED-brand-ship-return.csv")

    action_hdr = (
        "Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)"
    )
    # Extended drafts columns: official set + fields Seller Hub File Exchange commonly accepts
    fieldnames = [
        action_hdr,
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
        # Item specifics (draft complete / listings)
        "C:Brand",
        "C:Type",
        # Location
        "Location",
        "PostalCode",
        # Shipping (domestic service besides local pickup)
        "ShippingType",
        "ShippingService-1:Option",
        "ShippingService-1:FreeShipping",
        "ShippingService-1:Cost",
        "ShippingService-1:Priority",
        "DispatchTimeMax",
        "LocalPickup",
        # Returns
        "ReturnsAcceptedOption",
        "ReturnsWithinOption",
        "RefundOption",
        "ShippingCostPaidByOption",
        "ReturnsDescription",
    ]

    rows_out = []
    with src.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            sku = (r.get("sku") or "").strip()
            if sku not in KEEP_SKUS:
                continue
            title = (r.get("title") or "")[:80]
            price = float(r.get("price") or 0)
            ovr = OVERRIDES.get(sku, {})
            brand = ovr.get("brand") or (r.get("brand") or "").strip() or "Unbranded"
            typ = ovr.get("type") or "Medical Supplies"
            if (r.get("category_id") or "") == "46539":
                typ = ovr.get("type") or "Mobile Radio"
                brand = ovr.get("brand") or brand or "Motorola"

            pics = (r.get("image_url") or "").strip()
            extra = (r.get("extra_image_urls") or "").strip()
            if extra:
                pics = "|".join(u for u in [pics, *extra.split("|")] if u)

            rows_out.append(
                {
                    action_hdr: "Draft",
                    "Custom label (SKU)": sku,
                    "Category ID": r.get("category_id") or "117042",
                    "Title": title,
                    "UPC": "",
                    "Price": r.get("price") or "",
                    "Quantity": r.get("qty") or "1",
                    "Item photo URL": pics,
                    "Condition ID": condition_token(r.get("condition") or "", title),
                    "Description": desc_html(r.get("description") or ""),
                    "Format": "FixedPrice",
                    "C:Brand": brand,
                    "C:Type": typ,
                    "Location": "Blythewood",
                    "PostalCode": "29016",
                    "ShippingType": "Flat",
                    "ShippingService-1:Option": "USPSGroundAdvantage",
                    "ShippingService-1:FreeShipping": "0",
                    "ShippingService-1:Cost": ship_cost(price),
                    "ShippingService-1:Priority": "1",
                    "DispatchTimeMax": "3",
                    "LocalPickup": "1",
                    "ReturnsAcceptedOption": "ReturnsAccepted",
                    "ReturnsWithinOption": "Days_30",
                    "RefundOption": "MoneyBack",
                    "ShippingCostPaidByOption": "Buyer",
                    "ReturnsDescription": "30-day returns. Buyer pays return shipping.",
                }
            )

    missing = KEEP_SKUS - {row["Custom label (SKU)"] for row in rows_out}
    if missing:
        raise SystemExit(f"Missing SKUs in worksheet: {sorted(missing)}")

    info = [
        ["#INFO", "Version=0.0.2", "Template= eBay-draft-listings-template_US"],
        [
            "#INFO Extended with C:Brand, C:Type, Location, ShippingService-1, Returns. "
            "DELETE existing drafts with these SKUs before upload to avoid duplicates."
        ],
        ["#INFO After upload: https://www.ebay.com/sh/lst/drafts — verify shipping service & publish."],
        ["#INFO Generated by Prince George Transport"],
    ]

    with out.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for line in info:
            w.writerow(line)
        w.writerow(fieldnames)
        for row in rows_out:
            w.writerow([row.get(h, "") for h in fieldnames])

    print(f"Wrote {len(rows_out)} rows -> {out}")
    brands = {r["C:Brand"] for r in rows_out}
    types = {r["C:Type"] for r in rows_out}
    print("brands", len(brands), sorted(brands)[:12], "...")
    print("types", sorted(types))
    print("conds", {r["Condition ID"] for r in rows_out})


if __name__ == "__main__":
    main()
