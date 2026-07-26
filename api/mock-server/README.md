# ShopStyle SFMC Mock Server

A local, dependency-light (Express only) mock of the Marketing Cloud REST surface this program
integrates with, so journeys, CloudPages, and API contracts can be tested end-to-end without a live
SFMC sandbox.

## Endpoints Mocked

| Endpoint | Real API Doc |
|---|---|
| `POST /v2/token` | [`../../mc-connect/oauth-config.md`](../../mc-connect/oauth-config.md) |
| `POST /interaction/v1/events` | [`../rest/event-signup.md`](../rest/event-signup.md), [`../rest/order-status-events.md`](../rest/order-status-events.md), [`../rest/case-escalation-event.md`](../rest/case-escalation-event.md) |
| `POST /data/v1/customobjectdata/key/:deKey/rowset` | [`../rest/cart-events.md`](../rest/cart-events.md) |
| `POST /messaging/v1/email/messageDefinitionSends/key::key/send` | [`../rest/transactional-send.md`](../rest/transactional-send.md) |
| `POST /internal/alert` | Internal Slack/PagerDuty webhook stand-in used by `case-escalation-journey.json` and `deliverability/monitors/alert-automation.js` |
| `GET/POST /data/:deName` | Generic DE read/write for test assertions (not a real SFMC route) |

## Running

```bash
npm install
npm start          # listens on :4000, seeds from sample-data/*.csv
npm test            # runs api/mock-server/tests/server.test.js (node --test)
```

Reset state mid-session (useful between test runs without restarting the process):

```bash
curl -X POST http://localhost:4000/__test__/reset
```

## Reference Clients

[`clients/`](clients/) contains small, dependency-free clients used both by this mock server's own
tests and as the reference implementation pattern for real SSJS/Node integrations elsewhere in the
repo (e.g. `ssjs/automation/fire-fallback-events.ssjs` mirrors `clients/eventClient.js`'s retry logic):

- `eventClient.js` — `/interaction/v1/events` with 429 exponential backoff
- `transactionalClient.js` — Transactional Messaging API
- `soapClient.js` — SOAP Retrieve/ContinueRequest envelope building and parsing

## What This Is Not

This is a **test double**, not a faithful reimplementation of Marketing Cloud. It does not enforce
OAuth scopes, does not implement SOAP `ContinueRequest` pagination, and stores everything in memory
(lost on restart). It exists purely to make the journey/API/CloudPage test plans in
[`../../tests/`](../../tests/) executable in CI or locally.
