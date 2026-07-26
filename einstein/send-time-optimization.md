# Einstein Send Time Optimization (STO)

Einstein STO is enabled on every promotional `EmailSend` activity across all journeys in this
repository (Welcome Email 2/3, Abandoned Cart Emails 1-3, Birthday variants, Winback series, VIP
Retention) — each learns a per-subscriber optimal send window from historical open behavior and
delivers within it, up to a maximum queue delay of 24 hours from journey activity arrival.

## Configuration Per Journey

| Journey | STO Enabled | Max Delay | Fallback Window |
|---|---|---|---|
| Welcome | Yes (Email 2, 3 only — Email 1 sends immediately for signup momentum) | 24h | `PreferredSendTimeStart`/`End` from `ShopStyle_Preferences` if set, else 9am-6pm local |
| Abandoned Cart | No | — | Cart urgency makes fixed, short wait windows more effective than STO's delay tolerance |
| Post-Purchase | No | — | Timing is driven by shipping/delivery events, not open-time prediction |
| Birthday | Yes | 12h | Ensures the email still lands on the actual birthday even with STO delay |
| Winback | Yes | 24h | Re-engagement benefits most from hitting the subscriber's historically best window |
| VIP Retention | Yes | 24h | High-value, low-volume send — optimizing for open likelihood matters more than immediacy |

## Interaction with IP Warm-up

During active IP warm-up (see [`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md)),
STO is **disabled** — warm-up requires tightly controlled, predictable daily volume ramps, and STO's
send-time spreading would make bounce/complaint-rate monitoring per volume-step harder to attribute
correctly. STO is re-enabled once an IP pool reaches steady state (Day 31+).

## Holiday/Blackout Awareness

STO respects `Shared_HolidayCalendar` (see [`../architecture/business-units.md`](../architecture/business-units.md#shared-data-extensions))
blackout windows — a predicted optimal send time that falls inside a blackout date is pushed to the
next eligible window rather than sent, avoiding sends during regionally sensitive dates.
