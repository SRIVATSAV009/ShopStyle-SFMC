# Deployment

All deployment scripts share [`scripts/lib/mcApiClient.js`](scripts/lib/mcApiClient.js) for
authentication and API calls, and run unmodified against either [`api/mock-server`](../api/mock-server/)
(default, `http://localhost:4000`) or a real SFMC environment (set `SHOPSTYLE_MOCK_SERVER_URL` to the
Installed Package's `rest_instance_url` and populate `config/credentials.json`).

## Scripts

| Script | Deploys |
|---|---|
| [`deploy-business-units.js`](scripts/deploy-business-units.js) | Parent/Child BU provisioning from `config/business-units.json` |
| [`deploy-roles.js`](scripts/deploy-roles.js) | Enterprise Roles from `config/roles.json` |
| [`deploy-data-extensions.js`](scripts/deploy-data-extensions.js) | All 32 Data Extension schemas from `config/data-extensions/*.json` (generates SOAP CreateRequest XML to `deployment/generated/`) |
| [`deploy-automations.js`](scripts/deploy-automations.js) | Automation Studio definitions from `automation-studio/config/*.json` |
| [`deploy-cloudpages.js`](scripts/deploy-cloudpages.js) | CloudPages from `cloudpages/**/*.html`, validated for required SSJS/asset references |
| [`validate-deployment.js`](scripts/validate-deployment.js) | Post-deployment gate — confirms deployed counts match source-of-truth file counts |
| [`process-dsar-erasure.js`](scripts/process-dsar-erasure.js) | Right-to-be-forgotten erasure (ad hoc, not part of the standard deploy sequence) |

## Standard Deployment Sequence

```bash
node deployment/scripts/deploy-business-units.js
node deployment/scripts/deploy-roles.js
node deployment/scripts/deploy-data-extensions.js
node deployment/scripts/deploy-automations.js
node deployment/scripts/deploy-cloudpages.js
node deployment/scripts/validate-deployment.js   # exits 1 on any mismatch — CI gate
```

Verified end-to-end against the mock server: 32/32 Data Extensions, 5/5 automations, 5/5 business
units, 5/5 roles, 4/4 CloudPages deployed and validated with zero failures.

See [`checklist.md`](checklist.md) for the full pre/post-deployment checklist (sender authentication
cutover, journey activation order, rollback plan).
