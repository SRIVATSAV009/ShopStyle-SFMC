# Runbook

On-call response procedures for the ShopStyle Marketing Cloud program. Alerts referenced here
originate from [`../deliverability/monitors/alert-automation.js`](../deliverability/monitors/alert-automation.js)
and each automation's own `errorHandling.notifications` block.

## Deliverability Incident

**Trigger**: `Reporting_DeliverabilitySummary.GuardrailStatus = 'BREACH'` alert (bounce rate > 2% or
complaint rate > 0.1% for any Business Unit/day).

1. **Confirm scope**: run [`sql/reporting/deliverability-summary.sql`](../sql/reporting/deliverability-summary.sql)
   manually — is this one Business Unit/IP pool, or program-wide?
2. **Check for an obvious cause**:
   - Was a new/re-warmed IP pool involved? Check [`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md)
     compliance — did a send exceed that day's volume cap?
   - Was a segment sent to that skews unusually cold (e.g., an old imported list bypassing normal
     engagement-based targeting)?
   - Run `node deliverability/monitors/dkim-dmarc-check.js` — did sender authentication silently break
     (expired DNS record, domain migration)?
3. **Contain**: if the breach is ongoing (not a single historical bad send), pause any active
   promotional send/journey on the affected Business Unit/IP pool immediately.
4. **If mid IP-warmup**: the automation should have already applied `HOLD_FLAT`/`ROLLBACK` per
   [`warmup-guardrail.js`](../deliverability/monitors/warmup-guardrail.js) — verify it did; if not,
   manually hold the ramp schedule.
5. **Root-cause and document**: file a postmortem noting cause, contact-list segment implicated, and
   remediation (e.g., "excluded list X from future sends," "corrected DNS record").
6. **Resume**: only after the guardrail check passes clean for 24 hours.

## Post-Purchase Timeouts

**Trigger**: `EXIT-SHIP-TIMEOUT` or `EXIT-DELIVERY-TIMEOUT` volume spikes in the Post-Purchase journey
(see [`../journeys/post-purchase/`](../journeys/post-purchase/)).

1. Check whether [`automation-studio/sql/13-order-status-timeout-fallback.sql`](../automation-studio/sql/13-order-status-timeout-fallback.sql)
   and its paired [`fire-fallback-events.ssjs`](../ssjs/automation/fire-fallback-events.ssjs) are
   running — a spike usually means the carrier webhook integration is down *and* the fallback
   automation is also failing (check `Automation_ErrorLog` for `Order-Status-Timeout-Fallback`
   entries).
2. If the webhook integration itself is down (not just the fallback), this is a commerce-platform
   incident, not a Marketing Cloud one — escalate to the commerce/integration team; the fallback
   automation should keep the customer experience degrading gracefully (delayed but not silent) in
   the meantime.
3. Once the webhook integration recovers, verify the backlog of stuck orders processes without a
   flood of simultaneous shipping-notification sends (check whether a rate limit is needed on the
   fallback script's REST calls if the backlog is large).

## Automation Failure (General)

**Trigger**: any `Automation_ErrorLog` row with `Severity IN ('Error', 'Critical')`.

1. Identify `AutomationName`/`ActivityName` from the alert.
2. Check whether it auto-retried (per that automation's `errorHandling.retryPolicy`) and still failed,
   or failed outright on a non-retryable error.
3. Common causes and fixes:
   - **SFTP file not found / malformed** (ETL automations): check the source system's export job.
   - **Data anomaly halt** (e.g., `validate-catalog-row-count.ssjs`): this is often correct behavior,
     not a bug — investigate the source feed before overriding.
   - **REST call failure in a Script Activity**: check the target endpoint's health; if it's the mock
     server in a non-production test, this is expected when the server isn't running.
4. Fix forward in the repo (never patch directly in the SFMC UI without updating the source file here
   — see [`../docs/best-practices.md`](best-practices.md)), redeploy the specific artifact, re-run.

## Escalation Contacts

| Role | Responsibility |
|---|---|
| Automation Operator (see [`../architecture/business-units.md`](../architecture/business-units.md#enterprise-roles-least-privilege-model)) | First responder for automation failures |
| Marketing Cloud Developer | Journey/AMPscript/SSJS logic issues |
| Data Engineering | ETL/integration failures, SFTP/PGP issues |
| Platform Owner (Enterprise Administrator) | Sender authentication, Business Unit-level issues, escalation of last resort |
