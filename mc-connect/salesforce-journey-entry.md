# Journey Entry from Salesforce (Salesforce Data Event)

Marketing Cloud Connect exposes a **Salesforce Data Event** journey entry source type, letting Journey
Builder react directly to Sales/Service Cloud record changes without a custom REST integration. ShopStyle
uses this for one flow: a Case-Escalation Care journey.

## Salesforce Flow Configuration

A Record-Triggered Flow (`Case_Escalation_To_Marketing_Cloud`) fires on `Case` update when
`Escalated__c` changes from `false` to `true`, and calls the packaged **Marketing Cloud Connect —
"Send to Journey"** Apex action, passing:

```json
{
  "ContactId": "{!$Record.ContactId}",
  "JourneyEventDefinitionKey": "SFDCEvent-CaseEscalated",
  "CaseId": "{!$Record.Id}",
  "CaseSubject": "{!$Record.Subject}",
  "CasePriority": "{!$Record.Priority}"
}
```

This uses the **same underlying mechanism** as a REST `APIEvent` (see
[`../api/rest/event-signup.md`](../api/rest/event-signup.md)) but is configured declaratively in
Salesforce Flow rather than called from external code — appropriate here because the trigger condition
lives entirely inside Salesforce data.

## Journey: Case Escalation Care

[`../journeys/case-escalation/case-escalation-journey.json`](../journeys/case-escalation/case-escalation-journey.json)
— a short, non-promotional journey: acknowledgment email within minutes of escalation, then a
decision split on `_SFCase.Status` after 48 hours (resolved → satisfaction survey; still open →
internal Slack/email alert to the support manager via a REST Call-out activity, not a customer-facing
send).

This journey is intentionally **excluded** from the promotional suppression logic in
[`../automation-studio/sql/21-crm-suppression-sync.sql`](../automation-studio/sql/21-crm-suppression-sync.sql) —
it uses the **Default Transactional Send Classification**, since a case acknowledgment is a service
communication, not marketing, and must reach the customer even if they've suppressed promotional email.

## REST API Fallback

For integrations that cannot use a native Salesforce Flow (e.g., a legacy on-prem call-center system
also writing Case records), the same entry point is available via the standard
`POST /interaction/v1/events` contract with `EventDefinitionKey: "APIEvent-CaseEscalated"` — a parallel
event definition mapped to the same journey entry point, documented in
[`../api/rest/case-escalation-event.md`](../api/rest/case-escalation-event.md).
