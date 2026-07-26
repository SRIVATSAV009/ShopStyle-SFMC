# Best Practices

Conventions applied consistently across this repository. Deviating from these in new work should be a
deliberate, documented decision, not an oversight.

## Data Model

- Always join/query on `SubscriberKey`, never `EmailAddress` — email addresses change, keys don't
  (see [`../architecture/data-model.md#query-conventions`](../architecture/data-model.md#query-conventions)).
- Every Data Extension gets an explicit retention policy — "no policy" is not a valid default; use
  `{"type": "None"}` deliberately for records that should persist for the parent's lifetime, and
  document why in the `notes` field.
- Staging DEs (`Staging_*`) are always truncate-and-load; never accumulate history in a staging table —
  that's what an archive table (`*_Archive`) is for.

## Journeys

- Every promotional journey checks the same suppression pattern in its exit criteria:
  `SubscriberStatus IN ('Unsubscribed', 'Sunset') OR EmailOptIn = 0`. Copy this exactly — don't
  reinvent it per journey (see [Integration Test IT-04](../tests/integration-tests/end-to-end-integration-test-plan.md#it-04-winback-sunset-does-not-break-other-journeys-suppression-checks)
  for why consistency here matters).
- Re-check time-sensitive state (cart status, order status) at every wait boundary, not just at entry —
  a contact's situation can change while they wait (see the Abandoned Cart journey's repeated
  `DECISION-STILL-ABANDONED-*` checks).
- Transactional vs. promotional send classification is a deliberate choice per email, not a default —
  service/receipt content always uses Default Transactional Send Classification so it isn't affected
  by promotional suppression.

## AMPscript / SSJS

- Always provide a fallback for `LookupRows`/`LookupOrderedRows` returning zero rows — a new contact
  with no preference/loyalty/cart data yet is a normal case, not an edge case.
- Re-verify price/stock/status data at render time from the source of truth
  (`Shared_ProductCatalog`), never trust a snapshot value from an earlier point in the flow (see the
  abandoned-cart product blocks re-checking live catalog data instead of the cart-time price
  snapshot).
- Prefer SSJS over deeply nested AMPscript `%%[ IF ]%%` blocks once a CloudPage or content block needs
  more than 2-3 levels of conditional logic — SSJS's real control flow is more maintainable.

## Automation Studio

- Every automation halts and notifies on activity failure (`HaltAutomationAndNotify`) — automations
  that "fail open" (continue past an error) risk operating on incomplete/incorrect data silently.
- Anomaly detection, not just error detection: a *successful* activity that produces a suspicious
  result (e.g., a >20% row-count collapse) should be treated as a failure — see
  [`validate-catalog-row-count.ssjs`](../automation-studio/script-activities/validate-catalog-row-count.ssjs).
- All Script Activities log to `Automation_ErrorLog` via the shared
  [`error-logger.ssjs`](../ssjs/shared/error-logger.ssjs) include, not ad hoc `Write()` calls — this
  keeps failures queryable and alertable.

## CloudPages

- Never put raw `SubscriberKey`/`EmailAddress` in a URL — use the scoped access-token pattern (see
  [`../cloudpages/README.md#identity-pattern-scoped-access-tokens`](../cloudpages/README.md#identity-pattern-scoped-access-tokens)).
- Client-side validation is UX only; every form field is re-validated server-side before any Data
  Extension write.

## Diagrams

All architecture/journey/sequence diagrams in this repo are authored as Mermaid code blocks directly
in Markdown (renders natively on GitHub and most doc tooling) rather than as external image files —
this keeps diagrams reviewable in a pull request diff like any other text change. When a rendered SVG
is needed for a non-Markdown context (a slide deck, a PDF), extract and render the block:

```bash
node scripts/render-diagrams.js   # extracts every ```mermaid block into architecture/diagrams/*.mmd
npx @mermaid-js/mermaid-cli -i architecture/diagrams/data-model-er.mmd -o architecture/diagrams/data-model-er.svg
```

## Naming Conventions

| Prefix | Meaning |
|---|---|
| `Shared_*` | Parent-BU shared Data Extension |
| `Staging_*` | Truncate-and-load landing zone, never queried directly by journeys |
| `*_Archive` | Cold-storage staging before external export |
| `Reporting_*` | Nightly-refreshed, dashboard/alert-consumed output |
| `_Deployed*` | Mock-server/deployment-script bookkeeping only, not a real SFMC naming convention |

## Git / Commit Conventions

Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `test: ...`, `chore: ...`),
one logical change per commit — see the commit history of this repository for the applied pattern.
