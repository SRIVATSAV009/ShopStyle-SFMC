# Deployment Checklist

Use this checklist for every environment promotion (QA sandbox → Production). Check items off in
order — later steps assume earlier ones are complete.

## Pre-Deployment

- [ ] `config/config.json` and `config/credentials.json` populated for the target environment (copied
      from `.example` templates, never committed — see [`../docs/security-guide.md`](../docs/security-guide.md))
- [ ] Sender Authentication Package verified: `node deliverability/monitors/dkim-dmarc-check.js` passes
      for the target Business Unit's sending domain
- [ ] IP pool assigned and, if new, warm-up plan confirmed against [`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md)
- [ ] All journey test plans in [`../tests/journey-tests/`](../tests/journey-tests/) signed off in QA sandbox
- [ ] CloudPage test plan ([`../tests/cloudpage-tests/cloudpage-test-plan.md`](../tests/cloudpage-tests/cloudpage-test-plan.md)) signed off
- [ ] Postman collection run clean via Newman against the target environment
- [ ] `deployment/generated/` reviewed (SOAP CreateRequest payloads) by a second engineer before
      execution against a Production Business Unit

## Deployment Sequence

- [ ] `deploy-business-units.js` — business units.md
- [ ] `deploy-roles.js`
- [ ] `deploy-data-extensions.js` (32 DEs — see [`../architecture/data-model.md`](../architecture/data-model.md))
- [ ] Data Designer relationships applied from `config/data-designer-relationships.json` (Contact Builder UI or REST)
- [ ] Shared Data Extensions sharing configured (`Shared_ProductCatalog`, `Shared_GlobalSuppressionList`,
      `Shared_CustomerIdentityBridge`, `Shared_BrandContentLibrary`, `Shared_HolidayCalendar`)
- [ ] `deploy-automations.js` (created in **paused** state — do not activate yet)
- [ ] `deploy-cloudpages.js`
- [ ] Email templates uploaded to Content Builder (`email-templates/**`), AMPscript content blocks
      created from `ampscript/**` and referenced by `ContentBlockByKey`
- [ ] Journeys built in Journey Builder from `journeys/**/*.json` (created in **draft** state)
- [ ] `validate-deployment.js` passes (exit code 0)

## Activation (Production Only — Ordered)

Activate in this order so dependent automations have data to operate on before they're needed:

1. [ ] `journeys.welcome` — Nightly-Contact-Hygiene automation
2. [ ] `automation-studio.product-catalog-etl` — before any journey needing `Shared_ProductCatalog`
3. [ ] `journeys.welcome`
4. [ ] `journeys.abandoned-cart` — after `Abandoned-Cart-Detection` automation confirmed running
5. [ ] `journeys.post-purchase`
6. [ ] `journeys.birthday-loyalty` — after `Loyalty-Tier-and-Birthday-Nightly` automation confirmed running
7. [ ] `journeys.winback` — after `Winback-Inactive-Detection` automation confirmed running
8. [ ] `journeys.case-escalation`
9. [ ] `journeys.vip-retention` — requires Data Cloud segment activation complete first
10. [ ] `Reporting-Nightly-Refresh` automation
11. [ ] IP warm-up automation, if applicable

## Post-Deployment

- [ ] `dkim-dmarc-check.js` re-run and passing
- [ ] Test send of each journey's first email verified in an inbox (not just Preview & Test)
- [ ] Dashboard ([`../docs/dashboards/marketing-performance-dashboard.html`](../docs/dashboards/marketing-performance-dashboard.html))
      confirmed pulling live data (once `Reporting-Nightly-Refresh` has run once)
- [ ] Runbook ([`../docs/runbook.md`](../docs/runbook.md)) on-call rotation notified of go-live
- [ ] Rollback plan confirmed: journeys can be paused individually without affecting others; automations
      can be paused via Automation Studio without deleting the automation definition

## Rollback

If a critical issue is found post-activation:

1. Pause the affected journey(s) in Journey Builder (contacts already in-flight complete their current
   activity, then hold — this is safer than "stop and remove" which discards in-flight state).
2. Pause the corresponding entry-source automation (if DE-entry-based) so no new contacts enter.
3. File an incident per [`../docs/runbook.md`](../docs/runbook.md).
4. Fix forward in the repo, re-run the affected `deploy-*.js` script, re-validate, re-activate.
