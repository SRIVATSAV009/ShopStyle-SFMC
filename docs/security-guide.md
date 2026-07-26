# Security Guide

## Credential Management

No secret (OAuth client secret, SFTP private key, PGP private key) is ever committed to this
repository. `config/credentials.json` is gitignored; only `config/credentials.example.json` (a
placeholder template) is tracked.

In Production, credential values are not read from a file on disk at all — `config/credentials.json`
is a **local development convenience only**. The production deployment scripts resolve the same field
names from environment variables backed by a secrets manager (e.g., AWS Secrets Manager / HashiCorp
Vault, whichever the enterprise standard is), injected at deploy/runtime. `mcApiClient.js`'s
`loadConfig()` is intentionally the single choke point for this — if the secrets-manager integration
changes, only that function needs updating, not every script that authenticates.

Rotation policy: OAuth client secrets rotate every 90 days; PGP keys per
[PGP Key Management](#pgp-key-management) below; SSH keys for SFTP rotate every 180 days or
immediately on suspected compromise.

## PGP Key Management

Used for encrypting/decrypting File Transfer Activity payloads (see
[`../automation-studio/README.md#activity-types-used-complete-coverage`](../automation-studio/README.md#activity-types-used-complete-coverage)).

- **Inbound feeds** (product catalog, discount codes): the commerce platform encrypts with
  ShopStyle's **public** key; Marketing Cloud decrypts with the corresponding **private** key
  (`pgpPrivateKey_ProductFeed`). Only Marketing Cloud holds this private key.
- **Outbound exports** (order archive, anonymized orders): ShopStyle encrypts with the **data lake
  team's public** key (`pgpPublicKey_DataLake`); only the data lake team holds the matching private
  key. ShopStyle cannot decrypt its own outbound exports after sending — this is intentional
  (one-way, recipient-controlled decryption).
- **Key rotation**: 2048-bit RSA minimum, rotated annually or immediately on suspected compromise.
  Rotation requires coordinating a key handoff with the counterparty (commerce platform / data lake
  team) — old and new keys both accepted for a 2-week overlap window to avoid a hard cutover failure.
- **Never** store a PGP private key inline in a config file committed to any repository, including
  this one — `credentials.example.json` only references a `keyPath` (filesystem/secrets-manager
  location), never key material itself.

## CloudPage Tokens

Authenticated CloudPages (Preference Center, Profile Update, Subscription Management) never accept a
raw `SubscriberKey` or `EmailAddress` in the URL — see
[`../cloudpages/README.md#identity-pattern-scoped-access-tokens`](../cloudpages/README.md#identity-pattern-scoped-access-tokens)
for the full mechanism. Security properties:

- Tokens are cryptographically random GUIDs (128-bit), not sequential or guessable IDs.
- 30-day expiration, enforced server-side on every request (`resolveToken()` in each CloudPage).
- Scoped by `Purpose` field (though currently all purposes share resolution logic — a future
  hardening step would restrict a `PreferenceCenter`-purpose token from resolving on the
  `SubscriptionManagement` page, defense-in-depth against a leaked link being reused beyond its
  intended page).
- 7-day retention on the token DE itself keeps the attack window short even for tokens that are never
  "used up" (see `CloudPage_AccessToken`'s retention policy) — note this is shorter than the 30-day
  token expiration, meaning old tokens age out of the store before their nominal expiration in
  practice; this is a known, accepted conservative-retention tradeoff.

## DSAR (Data Subject Access/Erasure Requests)

Full procedure: [`process-dsar-erasure.js`](../deployment/scripts/process-dsar-erasure.js), policy
rationale: [`../architecture/retention-policies.md#right-to-be-forgotten-dsar-handling`](../architecture/retention-policies.md#right-to-be-forgotten-dsar-handling).

**SLA**: erasure requests are processed within 30 days of verified receipt (standard GDPR/CCPA
window). The script itself completes in seconds once a request is verified — the SLA window accounts
for identity verification (out of scope of this repo, handled by the customer service/legal intake
process) and manual review of edge cases (e.g., a subject with an open dispute/chargeback, where
`ShopStyle_Orders` financial records may need to be retained longer under a separate legal-hold
exception, overriding the standard erasure flow).

**What is erased vs. retained**: see the code comments in `process-dsar-erasure.js` — child DEs
(`Preferences`, `Addresses`, `Loyalty`, `CartActivity`) are fully erased; `ShopStyle_Subscribers` is
anonymized (not row-deleted, to avoid dangling FK-style references from `Orders`); `ShopStyle_ConsentLog`
is **retained** with the erasure itself logged as evidence of compliance.

## Data Encoding & Injection

- **CloudPages**: user-controlled input (`firstName`, `lastName`, form fields) rendered back into
  HTML via SSJS `<%= %>` interpolation should be explicitly HTML-encoded
  (`Platform.Function.HTMLEncode()`) — flagged as a follow-up item in
  [`../tests/cloudpage-tests/cloudpage-test-plan.md#6-cross-browser--rendering`](../tests/cloudpage-tests/cloudpage-test-plan.md#6-cross-browser--rendering).
  Treat this as a pre-production blocker, not an optional hardening pass.
- **SQL Activities**: all SQL in this repo is static (no string-concatenated user input into SQL Query
  Activities) — Automation Studio SQL Activities do not accept parameterized runtime input by design,
  which structurally prevents SQL injection in this layer. Any future activity that must incorporate
  contact-provided data into a query should use AMPscript/SSJS DE lookups instead of dynamic SQL.
- **AMPscript**: all `RedirectTo()` calls wrap fully-formed URLs built from trusted server-side values
  (DE lookups, static strings) — never directly from unescaped user input.

## Least Privilege

Enterprise Roles ([`../config/roles.json`](../config/roles.json)) are scoped per function (Developer,
Content Editor, Viewer, Automation Operator) rather than granting broad admin access by default — see
[`../architecture/business-units.md#enterprise-roles-least-privilege-model`](../architecture/business-units.md#enterprise-roles-least-privilege-model).
Installed Packages are similarly scoped per integration consumer
([`../mc-connect/oauth-config.md`](../mc-connect/oauth-config.md)) rather than one shared
all-permissions package.
