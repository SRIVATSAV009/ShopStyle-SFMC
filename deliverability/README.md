# Deliverability

| Monitor | Purpose |
|---|---|
| [`monitors/dkim-dmarc-check.js`](monitors/dkim-dmarc-check.js) | Verifies SPF/DKIM/DMARC DNS records actually resolve as configured in [`../architecture/sender-authentication.md`](../architecture/sender-authentication.md) |
| [`monitors/parse-dmarc-aggregate.js`](monitors/parse-dmarc-aggregate.js) | Parses DMARC aggregate (RUA) reports, flags unrecognized sending sources (spoofing signal) |
| [`monitors/warmup-guardrail.js`](monitors/warmup-guardrail.js) | Enforces the IP warm-up bounce/complaint thresholds from [`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md) |
| [`monitors/alert-automation.js`](monitors/alert-automation.js) | Central alert sweep — automation failures (`Automation_ErrorLog`) + deliverability guardrail breaches (`Reporting_DeliverabilitySummary`) |

## Bounce Monitoring

Hard bounces feed `Shared_GlobalSuppressionList` (`SuppressionReason = 'HardBounce'`) via
[`../automation-studio/sql/01-apply-global-suppression.sql`](../automation-studio/sql/01-apply-global-suppression.sql),
permanently excluding the address from future sends. Soft bounces are tracked but not suppressed until
a configurable consecutive-soft-bounce threshold is reached (handled by SFMC's native bounce
management rules at the Sender Authentication Package level).

Bounce rate is tracked daily per Business Unit in
[`../sql/reporting/deliverability-summary.sql`](../sql/reporting/deliverability-summary.sql) against
the same 2% guardrail used during IP warm-up — the guardrail doesn't relax after warm-up completes,
it becomes the standing daily health check.

## Spam Complaint Monitoring

Complaint rate is tracked the same way (0.1% guardrail). Complaints also immediately suppress via
`Shared_GlobalSuppressionList` (`SuppressionReason = 'SpamComplaint'`) — a spam complaint is a stronger
negative signal than a simple unsubscribe and is treated with zero grace period.

## Alert Automation

`alert-automation.js` is the reference implementation of the alerting logic wired into
[`../automation-studio/config/reporting-refresh-automation.json`](../automation-studio/config/reporting-refresh-automation.json)
(step 4) and referenced from every automation's `errorHandling.notifications` block across this repo.
Escalation path and on-call response: [`../docs/runbook.md`](../docs/runbook.md#deliverability-incident).
