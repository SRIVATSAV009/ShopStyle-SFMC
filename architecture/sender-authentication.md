# Sender Authentication Package

Every ShopStyle Child BU sends from its own **dedicated sending domain** and **dedicated IP pool** so
that reputation, DKIM, and SPF are isolated per market/brand and one BU's deliverability issue cannot
affect another's.

## Domains per Business Unit

| Business Unit | Sending Domain | Tracking/Link Domain | Return Path Domain |
|---|---|---|---|
| ShopStyle US | `email.shopstyleretail.com` | `links.shopstyleretail.com` | `bounce.shopstyleretail.com` |
| ShopStyle CA | `email.shopstyleretail.ca` | `links.shopstyleretail.ca` | `bounce.shopstyleretail.ca` |
| ShopStyle Outlet | `email.shopstyleoutlet.com` | `links.shopstyleoutlet.com` | `bounce.shopstyleoutlet.com` |
| ShopStyle QA/Sandbox | `email-qa.shopstyleretail.com` | `links-qa.shopstyleretail.com` | `bounce-qa.shopstyleretail.com` |

## SPF (Sender Policy Framework)

Published on each sending domain's DNS zone, authorizing Marketing Cloud's sending infrastructure:

```dns
email.shopstyleretail.com.   TXT   "v=spf1 include:cust-spf.exacttarget.com ~all"
bounce.shopstyleretail.com.  TXT   "v=spf1 include:cust-spf.exacttarget.com ~all"
```

`~all` (softfail) is used during warm-up/validation; cut over to `-all` (hardfail) once 30 days of clean
sending history confirms no legitimate mail originates outside Marketing Cloud
(`deployment/checklist.md` gate: *SPF hardfail cutover*).

## DKIM (DomainKeys Identified Mail)

Marketing Cloud generates a 2048-bit DKIM key pair per sending domain (via the Domain setup wizard in
Email Studio → Sender Authentication Package). CNAME published per domain:

```dns
sig1._domainkey.email.shopstyleretail.com.   CNAME   sig1.dkim.exacttarget.com.
```

DKIM signing is enabled at the Sending Profile level for every Child BU
(`config/sending-profiles.json`) and verified nightly by
[`deliverability/monitors/dkim-dmarc-check.js`](../deliverability/monitors/dkim-dmarc-check.js).

## DMARC

Published at the organizational domain apex so it covers all subdomains (`email.`, `bounce.`, `links.`):

```dns
_dmarc.shopstyleretail.com.  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@shopstyleretail.com; ruf=mailto:dmarc-forensics@shopstyleretail.com; fo=1; pct=100; adkim=s; aspf=s"
```

Rollout policy: `p=none` (monitor-only, 14 days) → `p=quarantine` (current, `pct=100`) → `p=reject`
(target: post 60-day clean DMARC aggregate report review). `adkim=s`/`aspf=s` (strict alignment) is used
because the sending domain and DKIM/Return-Path domain are always exact matches, never subdomain
variants — strict alignment is safe and materially reduces spoofing risk versus relaxed (`r`) mode.

Aggregate (`rua`) reports are parsed daily by
[`deliverability/monitors/parse-dmarc-aggregate.js`](../deliverability/monitors/parse-dmarc-aggregate.js)
and summarized into `sql/reporting/dmarc-alignment-summary.sql`-backed dashboards.

## Dedicated Domain + SSL (CloudPages / Landing Pages)

Each Child BU's CloudPages are served from a branded, SSL-secured custom domain rather than the default
`*.pub.marketingcloudapps.com`:

| Business Unit | CloudPages Domain | TLS |
|---|---|---|
| ShopStyle US | `offers.shopstyleretail.com` | TLS 1.2+, SFMC-managed cert (auto-renewed) |
| ShopStyle CA | `offres.shopstyleretail.ca` | TLS 1.2+, SFMC-managed cert |
| ShopStyle Outlet | `offers.shopstyleoutlet.com` | TLS 1.2+, SFMC-managed cert |

DNS: `CNAME offers.shopstyleretail.com -> cname.mcpage.io.` Configured under **Web Studio → Domains**;
enforced HTTPS redirect is enabled so `http://` requests 301 to `https://`.

## Return Path / Bounce Mail Management

Each domain's `bounce.` subdomain is configured as a dedicated **Reply Mail Management (RMM)** and
bounce-handling domain, isolating NDR/out-of-office/bounce traffic from the primary sending reputation
and enabling accurate hard-bounce classification (feeding `Shared_GlobalSuppressionList`).

## IP Pools

| Pool | Assigned To | Purpose |
|---|---|---|
| `ip-pool-us-primary` (3 dedicated IPs) | ShopStyle US | Promotional + transactional |
| `ip-pool-ca-primary` (2 dedicated IPs) | ShopStyle CA | Promotional + transactional |
| `ip-pool-outlet-shared` (shared IP pool) | ShopStyle Outlet | Lower volume, shared-pool acceptable |
| `ip-pool-qa` (sandbox shared pool) | QA/Sandbox | Never sends to real subscribers |

See [`ip-warming-strategy.md`](ip-warming-strategy.md) for the ramp schedule on new dedicated IPs.
