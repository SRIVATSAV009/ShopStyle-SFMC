# API Documentation

Index of every API contract in this program. Each links to the full request/response spec.

## REST — Journey / Event Triggers

| Endpoint | Purpose | Doc |
|---|---|---|
| `POST /interaction/v1/events` (`APIEvent-Welcome-Signup`) | Enter Welcome Journey | [`../api/rest/event-signup.md`](../api/rest/event-signup.md) |
| `POST /interaction/v1/events` (`APIEvent-OrderShipped`/`OrderDelivered`/`OrderReturned`) | Advance Post-Purchase journey | [`../api/rest/order-status-events.md`](../api/rest/order-status-events.md) |
| `POST /interaction/v1/events` (`APIEvent-CaseEscalated`) | Enter Case Escalation Care journey (non-Salesforce callers) | [`../api/rest/case-escalation-event.md`](../api/rest/case-escalation-event.md) |

## REST — Data / Commerce

| Endpoint | Purpose | Doc |
|---|---|---|
| `POST /data/v1/customobjectdata/key/{deKey}/rowset` | Real-time cart activity writes | [`../api/rest/cart-events.md`](../api/rest/cart-events.md) |
| `POST /messaging/v1/email/messageDefinitionSends/key:{key}/send` | Transactional order confirmation | [`../api/rest/transactional-send.md`](../api/rest/transactional-send.md) |

## SOAP

| Call | Purpose | Doc |
|---|---|---|
| `Retrieve` / `ContinueRequest` | Legacy/batch Data Extension reads | [`../api/soap/retrieve-data-extension.md`](../api/soap/retrieve-data-extension.md) |

## Authentication

All REST/SOAP calls use OAuth2 client-credentials against `POST /v2/token`, scoped per Installed
Package — see [`../mc-connect/oauth-config.md`](../mc-connect/oauth-config.md).

## Schemas

Machine-readable request/response schemas: [`../api/schemas/`](../api/schemas/) (JSON Schema, used by
the mock server's request validation and available for consumer-side contract testing).

## Testing

- Postman collection (all endpoints above, runnable via Newman): [`../postman/`](../postman/)
- Mock server implementing every endpoint: [`../api/mock-server/`](../api/mock-server/)
- Reference clients (retry/backoff, SOAP envelope building): [`../api/mock-server/clients/`](../api/mock-server/clients/)

## Versioning & Backward Compatibility

All `EventDefinitionKey` values are versioned by convention only when a breaking schema change is
required (e.g., `APIEvent-Welcome-Signup-v2`) — additive fields do not require a new key. Consumers
should tolerate unknown fields in the `Data` payload rather than strictly validating against a closed
schema, so new optional attributes can be added without a coordinated release.
