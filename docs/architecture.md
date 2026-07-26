# Architecture

This is the consolidated architecture reference. Component-level detail lives in dedicated docs linked
throughout — this page is the map, not a duplicate of the territory.

## System Overview

```mermaid
graph TB
    subgraph Channels["Acquisition Channels"]
        Web[Web / App]
        POS[In-Store POS]
        Social[Social / Ads]
    end

    subgraph SalesCloud["Salesforce Sales Cloud"]
        Contact[Contact / Case / Opportunity]
    end

    subgraph DataCloud["Salesforce Data Cloud"]
        ID[Identity Resolution]
        CI[Calculated Insights]
        SEG[Segments]
    end

    subgraph MC["Salesforce Marketing Cloud - ShopStyle Retail Enterprise 2.0"]
        CB[Contact Builder / Data Designer]
        AS[Automation Studio]
        JB[Journey Builder]
        ES[Email Studio]
        MS[Mobile Studio]
        CP[CloudPages]
        EIN[Einstein]
    end

    Web -->|REST events + Rowset API| CB
    POS --> DataCloud
    Contact -->|MC Connect sync, 15min| CB
    DataCloud --> ID --> CB
    CI --> SEG --> JB
    AS <--> CB
    CB --> JB
    JB --> ES
    JB --> MS
    JB --> CP
    CP --> CB
    EIN --> JB
```

Full Business Unit / role model: [`../architecture/business-units.md`](../architecture/business-units.md).

## Data Architecture

Contact model, Data Designer relationships, retention policy, and the full ER diagram:
[`../architecture/data-model.md`](../architecture/data-model.md).

## Data Flow — Signup to Retention

```mermaid
flowchart LR
    A[Signup: Web/App/SmartCapture] --> B[ShopStyle_Subscribers]
    B --> C[Welcome Journey]
    B --> D[Cart Activity]
    D --> E[Abandoned Cart Journey]
    B --> F[Order Placed]
    F --> G[Post-Purchase Journey]
    G --> H[Loyalty Tier Calc]
    B --> I[Inactivity Detection]
    I --> J[Winback Journey]
    J -->|no re-engagement| K[Sunset]
    H --> L[Birthday Journey]
    B --> M[Data Cloud Identity Resolution]
    M --> N[Calculated Insights / Segments]
    N --> O[VIP Retention Journey]
```

## Journey Architecture

Each journey has its own README with a Mermaid flow diagram, decision-split table, and exit-criteria
documentation:

- [Welcome](../journeys/welcome/README.md)
- [Abandoned Cart](../journeys/abandoned-cart/README.md)
- [Post-Purchase](../journeys/post-purchase/README.md)
- [Birthday/Loyalty](../journeys/birthday-loyalty/README.md)
- [Winback](../journeys/winback/README.md)
- [Case Escalation](../journeys/case-escalation/case-escalation-journey.json) (service, not marketing)
- [VIP Retention](../journeys/vip-retention/vip-retention-journey.json) (Data Cloud segment-driven)

## Sequence Diagram — Abandoned Cart Recovery (representative cross-system flow)

```mermaid
sequenceDiagram
    participant Web as ShopStyle Web/App
    participant MC as Marketing Cloud REST API
    participant Auto as Automation Studio
    participant JB as Journey Builder
    participant Cust as Customer

    Web->>MC: POST cart rowset (item added)
    Note over MC: ShopStyle_CartActivity, CartStatus=Active
    Web-->>MC: (30 min pass, no further activity)
    Auto->>MC: SQL sweep every 15 min
    Auto->>MC: UPDATE CartStatus='Abandoned'
    JB->>MC: DE entry source poll (15 min)
    JB->>Cust: Email 1 - Reminder
    JB->>JB: Wait 24h, re-check CartStatus
    JB->>MC: Allocate discount code
    JB->>Cust: Email 2 - 10% off + SMS
    JB->>JB: Wait 46h, re-check CartStatus
    JB->>Cust: Email 3 - 15% off, final notice
```

## Integration Architecture

Marketing Cloud Connect ↔ Sales Cloud: [`../mc-connect/README.md`](../mc-connect/README.md)
Salesforce Data Cloud ↔ Marketing Cloud: [`../data-cloud/README.md`](../data-cloud/README.md)
REST/SOAP API contracts: [`api-documentation.md`](api-documentation.md)

## Deliverability Architecture

Sender authentication, IP warm-up, bounce/complaint monitoring: [`../deliverability/README.md`](../deliverability/README.md),
[`../architecture/sender-authentication.md`](../architecture/sender-authentication.md),
[`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md).
