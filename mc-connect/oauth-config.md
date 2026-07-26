# Marketing Cloud Connect — OAuth & Installed Package Configuration

## Installed Package

ShopStyle uses a single **Server-to-Server + Web App** Installed Package per Business Unit, scoped to
the minimum required permissions per integration consumer.

| Component | MID | Component Type | Scopes |
|---|---|---|---|
| `ShopStyle-Ecommerce-Integration` | 5000011 (US) | Server-to-Server | `journeys_read`, `journeys_write`, `data_extensions_read`, `data_extensions_write`, `email_read`, `email_send` |
| `ShopStyle-MCConnect-SalesCloud` | 5000011 (US) | Server-to-Server (MC Connect managed) | `contacts_read`, `contacts_write`, `data_extensions_read`, `data_extensions_write`, `automations_execute` |
| `ShopStyle-CloudPages-Runtime` | 5000011 (US) | Server-to-Server | `data_extensions_read`, `data_extensions_write`, `journeys_write` |
| `ShopStyle-BI-Reporting` | 5000011 (US) | Server-to-Server, read-only | `data_extensions_read`, `automations_read`, `email_read` |

Each Child BU (`5000012`, `5000013`) has its own equivalent package set — packages are never shared
across BUs, even though the underlying commerce platform is shared, so a credential compromise in one
market cannot be used to write data into another.

## OAuth2 Flow

All server-side integrations use the **client credentials** grant:

```
POST https://{subdomain}.auth.marketingcloudapis.com/v2/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "{client_id}",
  "client_secret": "{client_secret}",
  "account_id": "5000011"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 1200,
  "rest_instance_url": "https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx.rest.marketingcloudapis.com/",
  "soap_instance_url": "https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx.soap.marketingcloudapis.com/"
}
```

Tokens expire after 20 minutes; all reference clients (`api/mock-server/clients/`) cache the token and
refresh proactively at 90% of `expires_in` rather than waiting for a 401.

## Credential Storage

Client ID/secret pairs are **never** committed to this repository — see
[`../config/credentials.example.json`](../config/credentials.example.json) for the template and
[`../docs/security-guide.md`](../docs/security-guide.md#credential-management) for the vaulting
pattern (secrets manager reference, not raw values, even in `config/credentials.json` locally).

## Salesforce Connected App (Sales Cloud side)

Marketing Cloud Connect itself authenticates to Sales Cloud via a Salesforce **Connected App**
(`ShopStyle_MarketingCloudConnect`), OAuth2 with a stored refresh token, scoped to the
`Marketing Cloud Connect Integration User` profile — a dedicated integration user, not a named
employee's credentials, per Salesforce security best practice.
