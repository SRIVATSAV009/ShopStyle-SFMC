# Troubleshooting Guide

Common issues and their resolution path, organized by area.

## Journeys

| Symptom | Likely Cause | Fix |
|---|---|---|
| Contact never enters a DE-entry journey | Entry-source automation hasn't run yet, or the filter criteria excludes them | Check the automation's last-run status; verify the contact's row against the entry DE's documented filter (e.g., `journeys/abandoned-cart/entry-source.json`) |
| Contact enters twice / duplicate sends | `reEntryMode` misconfigured, or a manual re-trigger while still in-journey | Confirm `NoReentryUntilExit` is set where intended; check for duplicate API event calls (see idempotency notes in `api/rest/event-signup.md`) |
| Decision split always takes the "else" branch | SQL/criteria syntax error, or the referenced field doesn't exist on the contact at that point in the journey | Test the branch criteria as a standalone SQL Query Activity against a known contact |
| Personalization shows blank/default values | AMPscript `LookupRows` found no matching row (new contact with no `ShopStyle_Preferences` row yet) | Confirm fallback defaults are in place — this is often correct behavior, not a bug (see `welcome-product-recommendations.amp`) |

## AMPscript / SSJS

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ContentBlockByKey` renders nothing | Content block key typo, or the block references AMPscript that errored silently | Test the content block standalone via Content Builder's Preview & Test |
| SSJS `LookupRows` returns unexpected type for a Boolean field | SFMC row fields often come back as string `"true"`/`"false"`, not native booleans | Compare with `== "true"` / `== true` (see the pattern in `cloudpages/preference-center/preference-center.html`) |
| CloudPage shows "link expired" for a token that should be valid | Token DE cleanup (7-day retention) ran, or `ExpirationDate` comparison timezone mismatch | Check `CloudPage_AccessToken` row directly; confirm server and DE timezone alignment |

## Automation Studio

| Symptom | Likely Cause | Fix |
|---|---|---|
| Automation stuck "Running" indefinitely | A File Transfer activity is waiting on a file that never arrived | Check the source SFTP for the expected file; verify credentials haven't expired |
| SQL Activity succeeds but target DE is empty | `Overwrite` vs `Append` import type mismatch, or the query itself returns zero rows | Test the query standalone in Query Studio first |
| Script Activity error: "no such Data Extension" | DE not yet deployed, or `CustomerKey`/`Name` mismatch between the script and the actual DE | Run `deployment/scripts/validate-deployment.js` to confirm the DE exists with the expected name |

## CloudPages

| Symptom | Likely Cause | Fix |
|---|---|---|
| Form submits but nothing happens | POST handler's `Request.Method == "POST"` check isn't matching (proxy/CDN altering the method) | Confirm the CloudPages domain's HTTPS redirect config isn't downgrading POST to GET |
| Styling missing | Shared CSS/JS asset path incorrect for the target domain | Verify `/cloudpages/assets/...` resolves under the deployed CloudPages domain, not just locally |
| Server-side validation error not shown to user | Error message set but the conditional render block checking `errorMessage` wasn't reached (early return) | Trace the SSJS block's control flow — see `deploy-cloudpages.js`'s structural validation for a starting checklist |

## APIs / Integration

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Not Authorized` | Expired token (20-minute lifetime) not refreshed proactively | Confirm the caller refreshes at ~90% of `expires_in`, not on 401 (see `mcApiClient.js`) |
| `429 Rate limit exceeded` | Burst of events beyond the 10,000/min per-BU ceiling | Confirm client-side batching/debounce is in place (see `api/rest/cart-events.md`) |
| SOAP call returns `MoreDataAvailable` but caller only reads first page | Missing `ContinueRequest` follow-up call | Use `soapClient.js`'s pagination pattern |

## Deployment

| Symptom | Likely Cause | Fix |
|---|---|---|
| `validate-deployment.js` reports a count mismatch | A `deploy-*.js` script was run against the wrong environment, or partially failed mid-run | Re-run the specific failing `deploy-*.js` script; check its console output for individual item failures |
| Deployed Data Extension missing fields | `config/data-extensions/*.json` edited after the last deploy run | Re-run `deploy-data-extensions.js` — it's idempotent (upsert), safe to re-run |

## Where to Look Next

If the issue isn't listed here: check [`runbook.md`](runbook.md) for incident-response procedures,
or [`Automation_ErrorLog`](../config/data-extensions/Automation_ErrorLog.json) for any related logged
error.
