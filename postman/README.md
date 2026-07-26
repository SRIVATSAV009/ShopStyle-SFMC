# Postman Collection

`ShopStyle-SFMC.postman_collection.json` covers every REST API contract documented in
[`../api/rest/`](../api/rest/), organized to match the journeys/phases they support.

## Running

**Via Postman UI:** Import both the collection and `ShopStyle-SFMC-QA.postman_environment.json`,
start the mock server (`cd api/mock-server && npm start`), select the environment, run the "Auth"
folder first to populate `access_token`, then run the rest.

**Via Newman (CI-friendly):**

```bash
cd api/mock-server && npm install && npm start &
npx newman run postman/ShopStyle-SFMC.postman_collection.json \
  -e postman/ShopStyle-SFMC-QA.postman_environment.json
```

Verified locally: 9 requests / 8 assertions, 0 failures against the mock server (see
[`../api/mock-server/README.md`](../api/mock-server/README.md)).

## Against a Real SFMC Sandbox

Duplicate `ShopStyle-SFMC-QA.postman_environment.json`, set `base_url` to your subdomain's
`rest_instance_url`, and populate `client_id`/`client_secret` from your Installed Package (see
[`../mc-connect/oauth-config.md`](../mc-connect/oauth-config.md)). No collection changes needed — the
request shapes match the real API contracts exactly.
