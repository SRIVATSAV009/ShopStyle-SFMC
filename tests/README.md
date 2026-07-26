# Testing

| Type | Location |
|---|---|
| Journey tests | [`journey-tests/`](journey-tests/) — one plan per journey (Welcome, Abandoned Cart, Post-Purchase, Birthday/Loyalty, Winback) |
| CloudPage tests | [`cloudpage-tests/cloudpage-test-plan.md`](cloudpage-tests/cloudpage-test-plan.md) |
| Automation tests | [`automation-tests/automation-test-plan.md`](automation-tests/automation-test-plan.md) |
| SQL / data validation | [`sql-validation/`](sql-validation/) |
| Integration (cross-phase) tests | [`integration-tests/end-to-end-integration-test-plan.md`](integration-tests/end-to-end-integration-test-plan.md) |
| API tests | [`../postman/`](../postman/) (Postman/Newman), [`../api/mock-server/tests/`](../api/mock-server/tests/) (automated `node --test`) |

## Running the Automated Suite

```bash
# Mock server unit tests
cd api/mock-server && npm install && npm test

# API contract tests (requires the mock server running: npm start in another terminal)
npx newman run postman/ShopStyle-SFMC.postman_collection.json -e postman/ShopStyle-SFMC-QA.postman_environment.json

# Deployment pipeline (also serves as an integration smoke test)
node deployment/scripts/deploy-business-units.js
node deployment/scripts/deploy-roles.js
node deployment/scripts/deploy-data-extensions.js
node deployment/scripts/deploy-automations.js
node deployment/scripts/deploy-cloudpages.js
node deployment/scripts/validate-deployment.js
```

All of the above were run and verified passing during development of this repository (mock server:
5/5 tests; Postman/Newman: 9 requests / 8 assertions, 0 failures; deployment pipeline: 32/32 DEs,
5/5 automations, 5/5 business units, 5/5 roles, 4/4 CloudPages, all validation checks passing).

Journey, CloudPage, automation, and integration test plans are manual procedures (SFMC journeys/
automations cannot be exercised headlessly outside a live or sandbox org) — they're written to be
executed step-by-step against a QA Business Unit as part of [`../deployment/checklist.md`](../deployment/checklist.md).
