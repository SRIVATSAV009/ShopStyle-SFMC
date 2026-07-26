# Cart Activity API

Real-time endpoints called by the ShopStyle web/app commerce platform on every cart mutation. Writes
directly to `ShopStyle_CartActivity` / `ShopStyle_CartLineItems` via the Data Extension **Rowset** REST
API (not a Journey event — abandonment detection is a separate batch process, see
[`automation-studio/sql/11-detect-abandoned-carts.sql`](../../automation-studio/sql/11-detect-abandoned-carts.sql)).

## POST /data/v1/customobjectdata/key/{CartActivityDEKey}/rowset

Upserts the cart header. Called on: item added, item removed, quantity changed, checkout started.

```
POST https://{subdomain}.rest.marketingcloudapis.com/data/v1/customobjectdata/key/DE_SHOPSTYLE_CARTACTIVITY/rowset
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
[
  {
    "keys": { "CartId": "CART-88213-A" },
    "values": {
      "SubscriberKey": "SUB-000482913",
      "CartCreatedDate": "2026-07-25T10:02:00Z",
      "CartLastUpdatedDate": "2026-07-25T10:04:12Z",
      "CartStatus": "Active",
      "CartTotal": 214.50,
      "ItemCount": 3,
      "DiscountCode": ""
    }
  }
]
```

`201 Created` / `200 OK` on upsert. Rowset API performs an upsert on the DE's primary key (`CartId`),
so repeated calls during active shopping simply refresh `CartLastUpdatedDate` and `CartTotal`.

## POST /data/v1/customobjectdata/key/{CartLineItemsDEKey}/rowset

Companion call, same request, upserting normalized line items into `ShopStyle_CartLineItems`
(`CartLineItemId = Concat(CartId, "-", SKU)`), used by AMPscript `LookupOrderedRows` in the recovery
emails (see [`ampscript/email/abandoned-cart-product-blocks.amp`](../../ampscript/email/abandoned-cart-product-blocks.amp)).

## POST /data/v1/customobjectdata/key/{CartActivityDEKey}/rowset — Checkout Complete

On successful checkout, the same upsert endpoint sets `CartStatus = "Converted"` and
`RecoveredDate = now()` if the cart had previously been marked `Abandoned` — this is the signal the
journey's exit-criteria decision split checks (`journeys/abandoned-cart/abandoned-cart-journey.json`).

## Authentication & Rate Limits

Same OAuth2 client-credentials flow as [`event-signup.md`](event-signup.md). The Rowset API is rate
limited to 2,500 requests/10s per Business Unit; the web app batches rapid quantity-change events
client-side (400ms debounce) before calling this endpoint to stay well under that ceiling.

## Reference Client & Tests

- Mock implementation: [`api/mock-server/routes/cartActivity.js`](../mock-server/routes/cartActivity.js)
- Postman: `ShopStyle-SFMC.postman_collection.json` → folder `Abandoned Cart / Cart Activity Rowset`
