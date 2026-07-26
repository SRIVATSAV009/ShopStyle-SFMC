# Configuration Guide

## `config/config.json` (from `config.example.json`)

| Field | Purpose |
|---|---|
| `environment` | `QA` or `Production` — informational, used in log/alert messages |
| `businessUnits.parent` / `.activeChildBU` | Which MID this deployment run targets |
| `credentialsFile` | Path to the credentials file (relative to `config/`) |
| `featureFlags.enableEinsteinSTO` | Gates Send Time Optimization on journey EmailSend activities — see [`../einstein/send-time-optimization.md`](../einstein/send-time-optimization.md) |
| `featureFlags.enableDataCloudIdentityResolution` | Gates whether `Shared_CustomerIdentityBridge` sync trusts Data Cloud output over the fallback SQL bridge — see [`../data-cloud/README.md`](../data-cloud/README.md) |
| `featureFlags.enableSMSChannel` | Master switch for all SMS sends across every journey |
| `mockServer.port` / `.simulateLatencyMs` | Local mock server tuning, no effect against a real SFMC target |

## `config/credentials.json` (from `credentials.example.json`)

| Field | Purpose |
|---|---|
| `commercePlatformSftp` | SSH key path + host for the nightly product/discount-code feed imports |
| `dataLakeSftp` | SSH key path + host for encrypted exports (order archive, anonymized orders) |
| `pgpPrivateKey_ProductFeed` | Decryption key for inbound commerce-platform files — see [`security-guide.md#pgp-key-management`](security-guide.md#pgp-key-management) |
| `pgpPublicKey_DataLake` | Encryption key for outbound data-lake exports |
| `marketingCloud.clientId` / `.clientSecret` | Installed Package OAuth credentials — see [`../mc-connect/oauth-config.md`](../mc-connect/oauth-config.md) |

**Never commit a populated `config/credentials.json`** — it is gitignored specifically so this file
can safely contain real secrets locally. In CI/production, these values come from a secrets manager
(see [`security-guide.md#credential-management`](security-guide.md#credential-management)), not a
checked-out file at all.

## `config/roles.json`

Declarative Enterprise Role definitions. See
[`../architecture/business-units.md#enterprise-roles-least-privilege-model`](../architecture/business-units.md#enterprise-roles-least-privilege-model)
for the rationale behind each role's scope.

## `config/business-units.json`

Parent/Child MID structure. See
[`../architecture/business-units.md#hierarchy`](../architecture/business-units.md#hierarchy).

## `config/data-extensions/*.json`

One file per Data Extension, in the shape `deploy-data-extensions.js` expects: `name`,
`customerKey`, `description`, `isSendable`, `retentionPolicy`, `fields[]`. Adding a new Data Extension
to the program means adding a new file here — no other registration step, since
`deploy-data-extensions.js` reads the whole directory.

## `config/data-designer-relationships.json`

The Contact Builder relationship graph — see
[`../architecture/data-model.md#data-designer-relationships`](../architecture/data-model.md#data-designer-relationships).
Applied manually per [`deployment-guide.md`](deployment-guide.md#3-foundation-layer-business-units-roles-data-model)
(no bulk Contact Builder relationship API exists as of this writing).

## `config/sending-profiles.json`

Per-Business-Unit sender identity (from name, sending domain, IP pool, return path). See
[`../architecture/sender-authentication.md`](../architecture/sender-authentication.md).

## Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `SHOPSTYLE_MOCK_SERVER_URL` | `deployment/scripts/*`, `deliverability/monitors/alert-automation.js` | Overrides the default `http://localhost:4000` target — point at a real SFMC REST instance URL to run scripts against a live environment |
| `PORT` | `api/mock-server/server.js` | Mock server listen port (default 4000) |
