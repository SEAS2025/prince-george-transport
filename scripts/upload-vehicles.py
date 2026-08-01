"""Replace vehicle inventory with the 5 Ford E-350 Super Duty ambulances (VIN/mileage update)."""
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

NOT_RUNNING = (
    "DOES NOT RUN — sold as a non-running project, parts donor, or ambulance body only.\n"
    "Outdoor-stored fleet unit. Buyer arranges all transport / towing."
)

def footer(price: int) -> str:
    return (
        f"Asking ${price:,} OBO (or best offer).\n"
        "Buyer pays shipping / transport. Local pickup available at "
        "200 Louthian Way, Blythewood, SC 29016.\n"
        "Sold as-is, where-is, with no warranty. Confirm VIN, title, and miles in person. "
        "Call/text (803) 231-9420."
    )

# Truck 1–3 reuse existing photo sets; trucks 4–5 need owner photos via /fleet
VEHICLES = [
    {
        "id": "ambulance-2008-a70177",
        "name": "2008 Ford E-350 Super Duty Diesel Ambulance — Truck 1",
        "brand": "Ford",
        "condition": "Used — Not running",
        "category": "vehicles",
        "price": 3500,
        "quantity": 1,
        "acceptOffers": True,
        "serialNumber": "1FDSS34P88DA70177",
        "mileage": 365027,
        "engineNotes": (
            "6.0L V8 diesel. New transmission installed at 347,847 mi (2023). "
            "Headlights, tires, and brakes replaced."
        ),
        "ebayTitle": "2008 Ford E350 Diesel Ambulance Not Running 365k New Trans OBO",
        "ebayCategoryId": "63732",
        "imageUrl": "/img/vehicles/truck-1.jpg",
        "extraImageUrls": [
            "/img/vehicles/truck-1-rear.jpg",
            "/img/vehicles/truck-1-front-alt.jpg",
            "/img/vehicles/truck-1-cabin.jpg",
            "/img/vehicles/truck-1-interior.jpg",
        ],
        "description": (
            "Fleet-retired Prince George Transport Type II ambulance — Truck 1.\n"
            "2008 Ford Econoline E-350 Super Duty, 6.0L V8 diesel.\n"
            "VIN: 1FDSS34P88DA70177 · License: 5525PN · Odometer: 365,027 mi.\n"
            "New transmission at 347,847 miles (2023). Headlights replaced. New tires and brakes.\n"
            f"{NOT_RUNNING}\n\n"
            + footer(3500)
        ),
    },
    {
        "id": "ambulance-2008-b04415",
        "name": "2008 Ford E-350 Super Duty Diesel Ambulance — Truck 2",
        "brand": "Ford",
        "condition": "Used — Not running",
        "category": "vehicles",
        "price": 3000,
        "quantity": 1,
        "acceptOffers": True,
        "serialNumber": "1FDSS34P58DB04415",
        "mileage": 176487,
        "engineNotes": "Diesel. Injectors replaced in 2023.",
        "ebayTitle": "2008 Ford E350 Diesel Ambulance Not Running 176k Injectors OBO",
        "ebayCategoryId": "63732",
        "imageUrl": "/img/vehicles/truck-2.jpg",
        "extraImageUrls": [
            "/img/vehicles/truck-2-front.jpg",
            "/img/vehicles/truck-2-rear.jpg",
            "/img/vehicles/truck-2-cabin.jpg",
            "/img/vehicles/truck-2-interior.jpg",
        ],
        "description": (
            "Fleet-retired Prince George Transport Type II ambulance — Truck 2.\n"
            "2008 Ford E-350 Super Duty diesel.\n"
            "VIN: 1FDSS34P58DB04415 · License: SS25PN · Odometer: 176,487 mi.\n"
            "Injectors replaced in 2023.\n"
            f"{NOT_RUNNING}\n\n"
            + footer(3000)
        ),
    },
    {
        "id": "ambulance-2010-a25619",
        "name": "2010 Ford E-350 Super Duty Diesel Ambulance — Truck 3",
        "brand": "Ford",
        "condition": "Used — Not running",
        "category": "vehicles",
        "price": 3000,
        "quantity": 1,
        "acceptOffers": True,
        "serialNumber": "1FDSS3EPADA25619",
        "mileage": 355825,
        "engineNotes": "Diesel.",
        "ebayTitle": "2010 Ford E350 Diesel Ambulance Not Running 355k mi As-Is OBO",
        "ebayCategoryId": "63732",
        "imageUrl": "/img/vehicles/ambulance-p07.jpg",
        "extraImageUrls": [
            "/img/vehicles/ambulance-p07-front.jpg",
            "/img/vehicles/ambulance-p07-side.jpg",
            "/img/vehicles/ambulance-p07-rear.jpg",
        ],
        "description": (
            "Fleet-retired Prince George Transport Type II ambulance — Truck 3.\n"
            "2010 Ford E-350 Super Duty diesel.\n"
            "VIN: 1FDSS3EPADA25619 · Odometer: 355,825 mi.\n"
            f"{NOT_RUNNING}\n\n"
            + footer(3000)
        ),
    },
    {
        "id": "ambulance-2009-a88103",
        "name": "2009 Ford E-350 Super Duty Diesel Ambulance — Truck 4",
        "brand": "Ford",
        "condition": "Used — Not running",
        "category": "vehicles",
        "price": 3000,
        "quantity": 1,
        "acceptOffers": True,
        "serialNumber": "1FDSSES2ADA88103",
        "mileage": 346618,
        "engineNotes": "Diesel. Refurbished AC — condition unknown.",
        "ebayTitle": "2009 Ford E350 Diesel Ambulance Not Running 346k Refurb AC OBO",
        "ebayCategoryId": "6001",
        "imageUrl": "/img/vehicles/truck-4.jpg",
        "extraImageUrls": [
            "/img/vehicles/truck-4-side.jpg",
            "/img/vehicles/truck-4-rear.jpg",
            "/img/vehicles/truck-4-cabin.jpg",
        ],
        "description": (
            "Fleet-retired Prince George Transport Type II ambulance — Truck 4.\n"
            "2009 Ford E-350 Super Duty diesel.\n"
            "VIN: 1FDSSES2ADA88103 · Odometer: 346,618 mi.\n"
            "Refurbished AC — condition unknown.\n"
            f"{NOT_RUNNING}\n\n"
            + footer(3000)
        ),
    },
    {
        "id": "ambulance-2010-a03185",
        "name": "2010 Ford E-350 Super Duty Diesel Ambulance — Truck 5",
        "brand": "Ford",
        "condition": "Used — Not running",
        "category": "vehicles",
        "price": 3000,
        "quantity": 1,
        "acceptOffers": True,
        "serialNumber": "1FDSSEP7ADA03185",
        "mileage": 377409,
        "engineNotes": "Diesel.",
        "ebayTitle": "2010 Ford E350 Diesel Ambulance Not Running 377k mi As-Is OBO",
        "ebayCategoryId": "6001",
        "imageUrl": "/img/vehicles/truck-5.jpg",
        "extraImageUrls": [
            "/img/vehicles/truck-5-side.jpg",
            "/img/vehicles/truck-5-front.jpg",
            "/img/vehicles/truck-5-cabin.jpg",
            "/img/vehicles/truck-5-interior.jpg",
        ],
        "description": (
            "Fleet-retired Prince George Transport Type II ambulance — Truck 5.\n"
            "2010 Ford E-350 Super Duty diesel.\n"
            "VIN: 1FDSSEP7ADA03185 · Odometer: 377,409 mi.\n"
            f"{NOT_RUNNING}\n\n"
            + footer(3000)
        ),
    },
]

OLD_VEHICLE_IDS = {
    "ambulance-p03",
    "ambulance-p04",
    "ambulance-p07",
    "ambulance-2008-a70177",
    "ambulance-2008-b04415",
    "ambulance-2010-a25619",
    "ambulance-2009-a88103",
    "ambulance-2010-a03185",
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
    existing = api(jar, "GET", "/api/admin/inventory")["items"]
    kept = [i for i in existing if i.get("id") not in OLD_VEHICLE_IDS and i.get("category") != "vehicles"]
    merged = VEHICLES + kept
    saved = api(jar, "PUT", "/api/admin/inventory", {"items": merged})
    vehicles = [i for i in saved["items"] if i.get("category") == "vehicles"]
    print(f"Saved {len(saved['items'])} total; vehicles={len(vehicles)}")
    for v in vehicles:
        print(
            f"- {v['name']}: ${v.get('price')} mi={v.get('mileage')} "
            f"VIN={v.get('serialNumber')} OBO={v.get('acceptOffers')}"
        )


if __name__ == "__main__":
    main()
