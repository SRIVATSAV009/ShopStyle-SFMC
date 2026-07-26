# Business Unit Architecture

## Hierarchy

```
ShopStyle Retail Enterprise 2.0 (Parent BU, MID: 5000001)
├── ShopStyle US (Child BU, MID: 5000011)         — primary commerce market, USD
├── ShopStyle CA (Child BU, MID: 5000012)         — Canada market, CAD, French/English
├── ShopStyle Outlet (Child BU, MID: 5000013)     — clearance/outlet brand, shares CRM org
└── ShopStyle QA/Sandbox (Child BU, MID: 5000099) — non-production testing, isolated sending IPs
```

The Parent BU (`5000001`) owns:

- **Shared Data Extensions** (see below) — product catalog, suppression lists, brand-wide unsubscribe/global suppression, cross-BU customer identity bridge.
- **Enterprise-level Setup**: Sender Authentication Package (SPF/DKIM), Business Unit provisioning, User/Role administration (Enterprise Roles), Reply Mail Management, Enterprise-wide Automation for cross-BU jobs (e.g., identity resolution ingestion from Data Cloud).
- **Installed Package (Server-to-Server + Web App)** used by all Child BUs for shared integrations (Sales Cloud, Data Cloud, e-commerce platform), scoped per BU via OAuth scopes.

Each Child BU owns its own:

- Local (non-shared) Data Extensions: subscriber-market data, local preferences, market-specific orders.
- Journeys, Automations, Email/SMS sends, CloudPages — scoped to that BU's audience and branding.
- Sending domains and IP pool assignment (see [`sender-authentication.md`](sender-authentication.md)).

## Shared Data Extensions (Parent BU, `IsSendable=false` unless noted)

| Data Extension | Purpose | Shared To |
|---|---|---|
| `Shared_ProductCatalog` | Master SKU/product feed (price, image, category, inventory) synced nightly from commerce platform | All Child BUs (read) |
| `Shared_GlobalSuppressionList` | Cross-BU unsubscribe / hard-bounce / spam-complaint suppression, enforced pre-send | All Child BUs (read) |
| `Shared_CustomerIdentityBridge` | Maps `Data Cloud Unified Individual ID` → per-BU `SubscriberKey`, used by identity resolution jobs | All Child BUs (read/write) |
| `Shared_BrandContentLibrary` | Reusable AMPscript content blocks / legal footers / social links, referenced via `ContentBlockByKey` | All Child BUs (read) |
| `Shared_HolidayCalendar` | Send-time blackout dates and regional holidays used by Send Time Optimization + Automation scheduling | All Child BUs (read) |

Sharing is configured via **Contact Builder → Shared Data Extensions**, granting Child BUs `Read` (or
`Read/Write` for the identity bridge) access without duplicating data. See
[`config/data-extensions/`](../config/data-extensions/) for the deployable schema of each DE.

## Business Unit Provisioning (Enterprise 2.0)

Provisioning is executed via the SOAP `Account` object (`ClientID` context switch) or the Setup UI. The
scripted definition used by `deployment/scripts/deploy-business-units.js` is:

```json
{
  "parentBusinessUnit": {
    "mid": "5000001",
    "name": "ShopStyle Retail Enterprise 2.0",
    "timezone": "America/New_York"
  },
  "childBusinessUnits": [
    { "mid": "5000011", "name": "ShopStyle US", "timezone": "America/New_York", "locale": "en-US", "sendingDomain": "email.shopstyleretail.com" },
    { "mid": "5000012", "name": "ShopStyle CA", "timezone": "America/Toronto", "locale": "en-CA", "sendingDomain": "email.shopstyleretail.ca" },
    { "mid": "5000013", "name": "ShopStyle Outlet", "timezone": "America/New_York", "locale": "en-US", "sendingDomain": "email.shopstyleoutlet.com" },
    { "mid": "5000099", "name": "ShopStyle QA/Sandbox", "timezone": "America/New_York", "locale": "en-US", "sendingDomain": "email-qa.shopstyleretail.com" }
  ]
}
```

## Enterprise Roles (least-privilege model)

| Role | Scope | Assigned To |
|---|---|---|
| `Enterprise Administrator` | Parent BU only | MC Platform Owner (1–2 users) |
| `Marketing Cloud Developer` | Per Child BU | Journey/AMPscript/SSJS engineers |
| `Content Editor` | Per Child BU, Email Studio + CloudPages only | Campaign/content team |
| `Marketing Cloud Viewer` | Per Child BU, read-only | Analytics/reporting stakeholders |
| `Automation Operator` | Per Child BU, Automation Studio only | Data engineering / integration team |

Roles are defined declaratively in [`config/roles.json`](../config/roles.json) and applied via the SOAP
`AccountUser`/`Role` API during environment bootstrap (`deployment/scripts/deploy-roles.js`).
