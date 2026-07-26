# IP Warming Strategy

Applies to new dedicated IPs provisioned for `ip-pool-us-primary` and `ip-pool-ca-primary`
(see [`sender-authentication.md`](sender-authentication.md)). Warm-up is executed and tracked by
[`automation-studio/config/ip-warmup-automation.json`](../automation-studio/config/ip-warmup-automation.json),
which throttles daily send volume by BU/pool and halts automatically on a bounce/complaint threshold
breach.

## Principles

1. **Send to your most engaged subscribers first.** Warm-up segments pull from
   `ShopStyle_Subscribers` joined to the engagement view, filtered to subscribers with an open or
   click in the last 90 days (see `sql/segmentation/warmup-engaged-segment.sql`).
2. **Increase volume gradually**, never more than ~2x day-over-day.
3. **Hold volume flat (don't increase) on any day** where bounce rate > 2% or complaint rate > 0.1%;
   **roll back to the prior day's volume** if either threshold is breached twice in a rolling 3-day
   window.
4. **Consistent daily sending** — no gaps. A skipped day forces a restart at ~50% of the last
   successful volume.

## 30-Day Ramp Schedule

| Day Range | Daily Volume Cap (per IP) | Audience Filter |
|---|---|---|
| 1–3 | 1,000 | Engaged ≤ 30 days, opens+clicks only |
| 4–7 | 5,000 | Engaged ≤ 60 days |
| 8–11 | 10,000 | Engaged ≤ 90 days |
| 12–15 | 25,000 | Engaged ≤ 90 days + transactional traffic |
| 16–19 | 50,000 | Full active list minus re-engagement/winback segment |
| 20–23 | 100,000 | Full active list |
| 24–27 | 250,000 | Full active list, including winback (low volume) |
| 28–30 | 500,000 | Full active list |
| 31+ | Uncapped (steady state) | Full send strategy, subject to ongoing deliverability monitoring |

## Monitoring During Warm-up

Every send during the warm-up window is checked by
[`deliverability/monitors/warmup-guardrail.js`](../deliverability/monitors/warmup-guardrail.js) against:

- Bounce rate (hard + soft) per send
- Spam complaint rate (via feedback loops / seed list monitoring)
- Inbox placement (seed-list panel, e.g., major mailbox providers sampling)
- Sender Score / reputation trend

Breach of any guardrail triggers `deliverability/monitors/alert-automation.js` (see
[`docs/runbook.md`](../docs/runbook.md#deliverability-incident)) which pages the Automation Operator
role and automatically pauses the warm-up automation's next scheduled run.

## Post-Warmup Steady State

Once at uncapped volume, the same guardrail automation continues running daily (not just during
warm-up) as the standing **deliverability health check** described in
[`deliverability/`](../deliverability/) and [Phase 11 reporting](../sql/reporting/).
