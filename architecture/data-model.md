# Contact Builder / Data Designer Model

## Base Contact Model

`ShopStyle_Subscribers` is registered in Contact Builder as the **Population's base Data Extension**
(`ContactKey = SubscriberKey`). All other contact-scoped Data Extensions are attached through **Data
Designer** relationships, forming a single queryable contact graph that Journey Builder, Automation
Studio SQL, and AMPscript `LookupRows`/`LookupOrderedRows` all resolve against consistently.

## Data Designer Relationships

| Parent DE | Child DE | Relationship | Join Field(s) | Cardinality |
|---|---|---|---|---|
| `ShopStyle_Subscribers` | `ShopStyle_Preferences` | 1:1 | `SubscriberKey` | One preference record per subscriber |
| `ShopStyle_Subscribers` | `ShopStyle_Addresses` | 1:many | `SubscriberKey` | Multiple shipping/billing addresses |
| `ShopStyle_Subscribers` | `ShopStyle_Orders` | 1:many | `SubscriberKey` | Full order history |
| `ShopStyle_Orders` | `ShopStyle_OrderLineItems` | 1:many | `OrderId` | Line items per order |
| `ShopStyle_Subscribers` | `ShopStyle_Loyalty` | 1:1 | `SubscriberKey` | One loyalty record per subscriber |
| `ShopStyle_Subscribers` | `ShopStyle_CartActivity` | 1:many | `SubscriberKey` | Cart snapshots over time |
| `ShopStyle_Subscribers` | `ShopStyle_ConsentLog` | 1:many | `SubscriberKey` | Append-only consent audit trail |
| `ShopStyle_Subscribers` | `Shared_CustomerIdentityBridge` | 1:1 (per BU) | `SubscriberKey` + `BusinessUnitMID` | Cross-cloud identity link |
| `ShopStyle_OrderLineItems` | `Shared_ProductCatalog` | many:1 | `SKU` | Reference join, not a Data Designer relationship (cross-BU shared DE) |

Deployable schemas for every DE live in [`config/data-extensions/`](../config/data-extensions/); the
Data Designer relationship graph itself is deployed declaratively via
[`config/data-designer-relationships.json`](../config/data-designer-relationships.json) using the
Contact Builder REST API (`/contacts/v1/model/relationships`).

## Entity-Relationship Diagram

```mermaid
erDiagram
    ShopStyle_Subscribers ||--|| ShopStyle_Preferences : "1:1"
    ShopStyle_Subscribers ||--o{ ShopStyle_Addresses : "1:many"
    ShopStyle_Subscribers ||--o{ ShopStyle_Orders : "1:many"
    ShopStyle_Orders ||--o{ ShopStyle_OrderLineItems : "1:many"
    ShopStyle_Subscribers ||--|| ShopStyle_Loyalty : "1:1"
    ShopStyle_Subscribers ||--o{ ShopStyle_CartActivity : "1:many"
    ShopStyle_Subscribers ||--o{ ShopStyle_ConsentLog : "1:many"
    ShopStyle_Subscribers ||--|| Shared_CustomerIdentityBridge : "1:1 per BU"
    ShopStyle_OrderLineItems }o--|| Shared_ProductCatalog : "many:1 (SKU ref)"

    ShopStyle_Subscribers {
        string SubscriberKey PK
        string EmailAddress
        string MobileNumber
        string FirstName
        string LastName
        date DateOfBirth
        boolean EmailOptIn
        boolean SMSOptIn
        string SubscriberStatus
        string UnifiedIndividualId
    }
    ShopStyle_Preferences {
        string SubscriberKey PK_FK
        boolean CategoryWomens
        boolean CategoryMens
        string FrequencyPreference
        boolean PromotionalOptIn
    }
    ShopStyle_Orders {
        string OrderId PK
        string SubscriberKey FK
        date OrderDate
        string OrderStatus
        decimal OrderTotal
    }
    ShopStyle_OrderLineItems {
        string LineItemId PK
        string OrderId FK
        string SKU FK
        number Quantity
        decimal LineTotal
    }
    ShopStyle_Loyalty {
        string SubscriberKey PK_FK
        string CurrentTier
        number PointsBalance
        decimal TrailingTwelveMonthSpend
    }
    ShopStyle_CartActivity {
        string CartId PK
        string SubscriberKey FK
        string CartStatus
        decimal CartTotal
    }
    Shared_ProductCatalog {
        string SKU PK
        string ProductName
        string Category
        decimal Price
    }
```

Rendered SVG export: [`architecture/diagrams/data-model-er.svg`](diagrams/data-model-er.svg) (generated
via `scripts/render-diagrams.js`, see [`docs/best-practices.md`](../docs/best-practices.md#diagrams)).

## Query Conventions

- All Automation Studio SQL activities join on `SubscriberKey` (never `EmailAddress`) to remain stable
  across email address changes — see [`sql/`](../sql/) for examples.
- AMPscript `LookupRows`/`LookupOrderedRows` calls always pass `SubscriberKey` from
  `_subscriberkey` (email context) or the API-provided `contactKey` (journey entry context).
- Every Journey-entry SQL Query Activity begins by anti-joining against
  `Shared_GlobalSuppressionList` (see `automation-studio/sql/01-apply-global-suppression.sql`).
