# Winback / Re-engagement Journey — Test Plan

Journey under test: [`journeys/winback/winback-journey.json`](../../journeys/winback/winback-journey.json)

## 1. Inactive Detection Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| WB-01 | Subscriber last opened/clicked exactly 90 days ago | `InactivityTier = 'Tier1_90Day'`, staged for entry |
| WB-02 | Subscriber last engaged 45 days ago | Not staged (below threshold) |
| WB-03 | Subscriber already has a `Winback_Journey_Log` row for `Tier1_90Day` | Not re-staged (dedup via log join) |
| WB-04 | Subscriber `SubscriberStatus != 'Active'` | Excluded regardless of inactivity |
| WB-05 | Subscriber with `_Sent` rows but zero `_Open`/`_Click` ever | `DaysSinceEngagement` correctly resolves from `NULL` engagement dates (should not error / should not treat as 0 days inactive) |

## 2. Decision Split / Re-engagement Tests

| Test ID | Checkpoint | Subscriber Action | Expected Outcome |
|---|---|---|---|
| WB-06 | After Email 1 wait | Opens Email 1 within 14 days | `EXIT-REENGAGED`, no Email 2 |
| WB-07 | After Email 1 wait | No engagement | Email 2 (25% incentive) sent |
| WB-08 | After Email 2 wait | Clicks Email 2 | `EXIT-REENGAGED`, no Email 3 |
| WB-09 | After Email 2 wait | No engagement | Email 3 (sunset warning) sent |
| WB-10 | After Email 3 + 30-day grace | Opens Email 3 on day 29 | `EXIT-REENGAGED` |
| WB-11 | After Email 3 + 30-day grace | No engagement | `WINBACK-LOG-SUNSET` flags subscriber; `EXIT-SUNSET-PENDING` |

## 3. Sunset Enforcement Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| WB-12 | Subscriber flagged `Sunset` in `Winback_Journey_Log`, zero engagement since flag | `automation-studio/sql/17-sunset-inactive-subscribers.sql` sets `SubscriberStatus='Sunset'`, `EmailOptIn=0` |
| WB-13 | Same subscriber, but opens an unrelated campaign email between flagging and the sunset automation run | **Not** sunset — engagement check re-evaluates at automation run time, not just at flag time |
| WB-14 | Sunset applied | `ShopStyle_ConsentLog` row written with `ConsentSource='WinbackSunsetPolicy'` |
| WB-15 | Sunset subscriber | Confirmed excluded from all other journeys via the shared exit-criteria pattern (`SubscriberStatus IN ('Unsubscribed','Sunset')`) |

## Sign-off Checklist

- [ ] WB-01–WB-05 detection tests pass
- [ ] WB-06–WB-11 decision-split tests pass across all three tiers
- [ ] WB-12–WB-15 sunset enforcement tests pass
- [ ] Confirmed sunset subscribers are excluded from Welcome/Abandoned Cart/Post-Purchase/Birthday journeys
- [ ] Deployment checklist item `journeys.winback` marked complete
