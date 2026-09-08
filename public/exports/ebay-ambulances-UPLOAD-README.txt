Upload these 5 ambulances to eBay (FIXED after failed upload)

File: ebay-ambulances-create-listings.csv / .zip

Fixes applied from eBay error report:
1. Removed ConditionID / Condition Description (too long + not valid for this category)
2. Category changed to leaf 63735 = Emergency & Fire Trucks
3. Added PaymentMethods (PayPal,VisaMC,AmEx,Discover) for the offline-payments error

If upload still fails on Business Policies, open the CSV and fill these
with the EXACT names from Seller Hub → Account → Business policies:
  PaymentProfileName
  ShippingProfileName
  ReturnProfileName

Then upload at https://www.ebay.com/sh/reports/uploads
Template type: Create new listings
