# Apply cleaned inventory (no bed pans/urinals/splints/sharps/in-date medical/non-expired AED pads/suction canisters).
#
# After logging into Cloudflare:
#   npx wrangler login
#   npm run inventory:apply
#
# Or: first request to GET /api/inventory after this deploy auto-purges restricted SKUs from KV.

npm run inventory:verify

npx wrangler kv key put inventory:v1 \
  --namespace-id=aa59fb7be32c407eb217c75faa134b95 \
  --path=scripts/inventory-kv.json

echo "Inventory KV updated."
