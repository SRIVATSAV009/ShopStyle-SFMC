# POST /interaction/v1/events — Welcome Journey Entry

Fires the `APIEvent-Welcome-Signup` entry event (see
[`journeys/welcome/entry-event-definition.json`](../../journeys/welcome/entry-event-definition.json))
to enter a newly-registered subscriber into the Welcome Journey.

## Endpoint

```
POST https://{subdomain}.rest.marketingcloudapis.com/interaction/v1/events
Authorization: Bearer {access_token}
Content-Type: application/json
```

`{subdomain}` is the per-Child-BU REST base URI obtained from the Installed Package (see
[`mc-connect/oauth-config.md`](../../mc-connect/oauth-config.md)). Auth token is a standard OAuth2
client-credentials grant against `/v2/token` scoped to `journeys_write`.

## Request Body

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-Welcome-Signup",
  "Data": {
    "SubscriberKey": "SUB-000482913",
    "EmailAddress": "jane.doe@example.com",
    "FirstName": "Jane",
    "SignupSource": "Web",
    "SignupDate": "2026-07-25T14:32:00Z",
    "PromoCodeIssued": "WELCOME15"
  }
}
```

## Response

`202 Accepted` — event queued for journey processing (typically enters the journey within seconds).

```json
{
  "eventInstanceId": "3f2a9c10-88e4-4a11-9c2e-1a2b3c4d5e6f"
}
```

### Error Responses

| Status | Body | Cause |
|---|---|---|
| 400 | `{"message": "ContactKey is required"}` | Missing `ContactKey` / `SubscriberKey` |
| 401 | `{"message": "Not Authorized"}` | Expired/invalid OAuth token |
| 404 | `{"message": "Event definition key not found"}` | `EventDefinitionKey` typo or event not published |
| 429 | `{"message": "Rate limit exceeded"}` | > 10,000 events/min per BU — see retry guidance below |

On `429`, the calling web application backend retries with exponential backoff (base 500ms, max 3
retries) — implemented in the mock server reference client:
[`api/mock-server/clients/eventClient.js`](../mock-server/clients/eventClient.js).

## Idempotency

The web app is responsible for calling this endpoint **exactly once per signup**; the journey's
`entryMode: MultipleEntries` / `reEntryMode: NoReentryUntilExit` (see `welcome-journey.json`) means a
duplicate call before the contact exits does not create a second parallel journey instance, but does
consume an unnecessary API call. The reference implementation deduplicates client-side using the
signup form's submit-token pattern.

## Validation

Full Postman collection: [`postman/ShopStyle-SFMC.postman_collection.json`](../../postman/ShopStyle-SFMC.postman_collection.json)
→ folder `Welcome Journey / Trigger Signup Event`.
