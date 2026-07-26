# Deployment Guide

Narrative walkthrough of deploying this program to a new Marketing Cloud environment. For the
step-by-step checklist to execute during an actual deployment, use
[`../deployment/checklist.md`](../deployment/checklist.md) — this guide explains the *why* behind
that sequence.

## 1. Prerequisites

Provision the SFMC environment per [Prerequisites in the README](../README.md#prerequisites) before
running any script here — an Enterprise 2.0 license with the listed studios enabled, an Installed
Package, and (if Data Cloud/MC Connect are in scope) the corresponding Salesforce org connections.

## 2. Configuration

Copy and populate the two config templates (see [`configuration-guide.md`](configuration-guide.md)
for field-by-field detail):

```bash
cp config/config.example.json config/config.json
cp config/credentials.example.json config/credentials.json
```

Both are gitignored — never commit populated values.

## 3. Foundation Layer (Business Units, Roles, Data Model)

Deploy in this order because each layer depends on the previous one existing:

1. **Business Units** (`deploy-business-units.js`) — the Parent/Child MID structure everything else
   is scoped to.
2. **Roles** (`deploy-roles.js`) — so the engineers running the rest of the deployment have correctly
   scoped access in the target environment.
3. **Data Extensions** (`deploy-data-extensions.js`) — the 32 schemas in
   [`../config/data-extensions/`](../config/data-extensions/), covering the full contact model,
   staging tables, reporting tables, and operational DEs.
4. **Data Designer relationships** — applied via the Contact Builder UI/REST API from
   [`../config/data-designer-relationships.json`](../config/data-designer-relationships.json) (not yet
   scripted — Contact Builder relationship creation has no bulk API as of this writing, so this step
   is manual, following the relationship table in
   [`../architecture/data-model.md`](../architecture/data-model.md)).
5. **Shared Data Extension sharing** — configured in Contact Builder → Shared Data Extensions per
   [`../architecture/business-units.md`](../architecture/business-units.md#shared-data-extensions-parent-bu-issendablefalse-unless-noted).

## 4. Operational Layer (Automations, CloudPages)

```bash
node deployment/scripts/deploy-automations.js
node deployment/scripts/deploy-cloudpages.js
```

Automations deploy in a **paused** state — do not enable scheduling yet. CloudPages deploy live
immediately (they're read-only until a journey/email links to them, so this is safe).

## 5. Content Layer (Emails, AMPscript, Journeys)

This layer is **not yet scripted** — email templates ([`../email-templates/`](../email-templates/))
and AMPscript content blocks ([`../ampscript/`](../ampscript/)) are uploaded via Content Builder, and
journeys ([`../journeys/`](../journeys/)) are built in Journey Builder's canvas from the JSON
definitions in this repo (Journey Builder has no declarative bulk-import API as of this writing — each
journey's JSON is the source-of-truth *specification* an engineer builds the canvas from, not a file
Journey Builder itself ingests). Journeys are created in **draft** state.

## 6. Validation

```bash
node deployment/scripts/validate-deployment.js
```

Must exit 0 before proceeding to activation. This confirms deployed counts match the repo's
source-of-truth file counts — it does not confirm business-logic correctness, which is what the
[test plans](../tests/) are for.

## 7. Activation

Follow the ordered activation sequence in
[`../deployment/checklist.md#activation-production-only--ordered`](../deployment/checklist.md#activation-production-only--ordered).
The order matters: entry-source automations must be confirmed running *before* the journeys that
depend on their output are activated, or journeys will activate against empty entry sources and appear
"broken" when they're actually just waiting on data that hasn't been generated yet.

## 8. Post-Deployment

Re-run sender authentication checks, verify a real test send lands in an inbox (not just Preview &
Test, which doesn't exercise the full sending pipeline), and notify the on-call rotation per
[`runbook.md`](runbook.md).

## Rolling Back

See [`../deployment/checklist.md#rollback`](../deployment/checklist.md#rollback) — pause, don't
delete. Journeys and automations both support pause-in-place, preserving state for a fix-forward
re-activation rather than losing in-flight contact progress.
