PaymentMethods error fix

Your eBay account uses Business Policies, so PaymentMethods is REJECTED.

Two options:

A) PREFERRED — use the AI prefill file (no PaymentMethods):
   ebay-ambulances-prefill-listing.xlsx / .zip
   Upload at Seller Hub → Uploads

B) Create-listings file — fill policy names first:
   1. Open https://www.ebay.com/bpp/page/businesspolicy
   2. Copy exact Payment / Shipping / Return policy names
   3. Put them in PaymentProfileName, ShippingProfileName, ReturnProfileName
      on every row (or in the SETUP sheet of the xlsx, then copy across)
   4. Upload CSV/XLSX as Create new listings

PaymentMethods column has been REMOVED from the create-listings file.
