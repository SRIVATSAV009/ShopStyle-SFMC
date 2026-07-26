# Transactional Messaging API — Order Confirmation

Order confirmation is sent via the **Transactional Messaging API** (not Journey Builder) so it is
immediate, guaranteed, and bypasses send-classification throttling / journey queue latency — the
correct pattern for time-critical receipts.

## POST /messaging/v1/email/messageDefinitionSends/key:{definitionKey}/send

```
POST https://{subdomain}.rest.marketingcloudapis.com/messaging/v1/email/messageDefinitionSends/key:ORDER_CONFIRMATION_TXN/send
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "definitionKey": "ORDER_CONFIRMATION_TXN",
  "recipient": {
    "contactKey": "SUB-000482913",
    "to": "jane.doe@example.com",
    "attributes": {
      "OrderId": "ORD-2026-0088213",
      "FirstName": "Jane",
      "OrderTotal": "214.50",
      "OrderDate": "2026-07-25T14:50:00Z",
      "EstimatedDeliveryDate": "2026-07-30"
    }
  },
  "options": {
    "requestType": "ASYNC"
  }
}
```

`202 Accepted`:

```json
{ "requestId": "9a8b7c6d-...", "responses": [ { "messageKey": "...", "statusCode": "OK" } ] }
```

The message definition `ORDER_CONFIRMATION_TXN` is configured against
[`../../email-templates/post-purchase/order-confirmation.html`](../../email-templates/post-purchase/order-confirmation.html),
using **Default Transactional Send Classification** (exempt from promotional frequency caps, still
honors hard opt-out/legal suppression).

## Triggering the Post-Purchase Journey (in parallel)

The same checkout-complete webhook handler that calls this Transactional Send **also** fires the
`APIEvent-OrderPlaced` event (see
[`../../journeys/post-purchase/entry-event-definition.json`](../../journeys/post-purchase/entry-event-definition.json))
to enter the contact into the Post-Purchase journey, which owns shipping/delivery/review/cross-sell —
deliberately decoupled from the confirmation send so a journey processing delay never delays the
receipt.

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-OrderPlaced",
  "Data": {
    "SubscriberKey": "SUB-000482913",
    "OrderId": "ORD-2026-0088213",
    "OrderDate": "2026-07-25T14:50:00Z"
  }
}
```

## Idempotency & Retry

Both calls use the commerce platform's `OrderId` as an idempotency key on the caller side; the
Transactional Messaging API additionally deduplicates identical `messageKey` + `recipient.contactKey`
combinations within a 60-second window server-side. Reference client with retry/backoff:
[`api/mock-server/clients/transactionalClient.js`](../mock-server/clients/transactionalClient.js).
