# POST /interaction/v1/events — Case Escalation (Non-Salesforce Fallback)

Parallel entry point into [`../../journeys/case-escalation/case-escalation-journey.json`](../../journeys/case-escalation/case-escalation-journey.json)
for callers that cannot use the native Salesforce Data Event trigger (see
[`../../mc-connect/salesforce-journey-entry.md`](../../mc-connect/salesforce-journey-entry.md)) —
e.g. a legacy on-prem call-center system that writes Cases via SOAP but cannot attach a Flow.

```
POST https://{subdomain}.rest.marketingcloudapis.com/interaction/v1/events
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-CaseEscalated",
  "Data": {
    "SubscriberKey": "SUB-000482913",
    "CaseId": "500XX00000AbCdEFGH",
    "CaseSubject": "Order damaged in transit",
    "CasePriority": "High",
    "EscalatedDate": "2026-07-25T16:00:00Z"
  }
}
```

`202 Accepted` — same response shape and idempotency guidance as
[`event-signup.md`](event-signup.md). Both trigger paths (`SFDCEvent-CaseEscalated` and
`APIEvent-CaseEscalated`) feed the same journey instance type, so a case created via either channel
gets identical customer-facing treatment.
