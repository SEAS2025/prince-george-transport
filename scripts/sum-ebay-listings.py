import csv
from pathlib import Path

first = list(
    csv.DictReader(
        Path(r"C:\Users\User\Downloads\pgt-ebay-FIRST-BATCH-no-expired.csv").open(
            encoding="utf-8-sig"
        )
    )
)
fixed_skus = set()
with Path(r"C:\Users\User\Downloads\pgt-ebay-DRAFTS-FIXED-brand-ship-return.csv").open(
    encoding="utf-8", newline=""
) as f:
    hdr = None
    for row in csv.reader(f):
        if row and row[0].startswith("Action("):
            hdr = row
            continue
        if hdr and row and row[0] == "Draft":
            d = dict(zip(hdr, row))
            fixed_skus.add(d["Custom label (SKU)"])

items = []
for r in first:
    items.append(
        (float(r["price"]), r["sku"], r["title"][:55], r["sku"] in fixed_skus)
    )
items.sort(reverse=True)

print("TOP 12 (*=in fixed/listed set):")
for p, s, t, inf in items[:12]:
    mark = "*" if inf else " "
    print(f"  ${p:8.2f} {mark} {s}  {t}")

only_first = [x for x in items if not x[3]]
print(f"\nIn first-batch but not fixed: {len(only_first)}  ${sum(x[0] for x in only_first):.2f}")
for p, s, t, _ in only_first:
    print(f"  ${p:8.2f}  {s}  {t}")

fixed_sum = sum(x[0] for x in items if x[3])
all_sum = sum(x[0] for x in items)
print(f"\nFixed set: {sum(1 for x in items if x[3])} items  ${fixed_sum:.2f}")
print(f"First batch all: {len(items)} items  ${all_sum:.2f}")

# rough fee model: ~13% final value + ~$0.30, shipping collected vs cost wash for flat
fees = fixed_sum * 0.13 + 0.30 * sum(1 for x in items if x[3])
print(f"Est eBay fees ~13%: ${fees:.2f}")
print(f"Est net before shipping cost/tax: ${fixed_sum - fees:.2f}")
print(f"If 50% sell: ${fixed_sum*0.5:.2f} gross / ${(fixed_sum*0.5 - fees*0.5):.2f} approx net")
print(f"If 100% sell: ${fixed_sum:.2f} gross / ${fixed_sum - fees:.2f} approx net")
