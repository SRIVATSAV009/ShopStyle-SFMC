# CloudPages — Test Plan

## 1. Token Resolution Tests (all authenticated pages)

| Test ID | Scenario | Expected Result |
|---|---|---|
| CP-01 | Valid, unexpired token | Page loads pre-populated with current subscriber data |
| CP-02 | Missing `token` querystring | "Link expired" message rendered, no DE lookups attempted |
| CP-03 | Token not found in `CloudPage_AccessToken` | "Link expired" message |
| CP-04 | Token found but `ExpirationDate` in the past | "Link expired" message |
| CP-05 | Malformed token (SQL-injection-style string, `< 10` chars) | Rejected by length check before any lookup — no DE call made |

## 2. Preference Center Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| CP-06 | GET with valid token, subscriber has no `ShopStyle_Preferences` row yet | Form renders with sensible defaults (Women's+Men's on, Standard frequency) |
| CP-07 | POST valid form data | `ShopStyle_Preferences` upserted, `ShopStyle_ConsentLog` row written, success banner shown |
| CP-08 | POST with invalid `frequency` value (tampered form) | Server-side `validateSubmission` rejects, error banner shown, no DE write |
| CP-09 | POST twice in a row (double-submit) | Second POST correctly updates (not duplicates) the existing `ShopStyle_Preferences` row |

## 3. Profile Update Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| CP-10 | POST with empty `firstName` | Rejected server-side even if client-side JS is disabled/bypassed |
| CP-11 | POST with future `dateOfBirth` | Rejected with "cannot be in the future" |
| CP-12 | POST with invalid mobile number format | Rejected |
| CP-13 | Valid update | `ShopStyle_Subscribers` row updated, confirmed reflected on page reload |

## 4. Subscription Management Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| CP-14 | "Send me fewer emails" | `ShopStyle_Preferences.FrequencyPreference = 'Reduced'`, subscriber NOT added to suppression |
| CP-15 | "Unsubscribe from all emails" | `SubscriberStatus='Unsubscribed'`, `EmailOptIn=0`, row added to `Shared_GlobalSuppressionList`, `ConsentLog` entry written |
| CP-16 | Unsubscribe when already on `Shared_GlobalSuppressionList` (duplicate) | No duplicate suppression row inserted (existence check before insert) |
| CP-17 | Tampered `action` form field (not `reduce`/`unsubscribe`) | Rejected with generic error, no state change |

## 5. Smart Capture Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| CP-18 | New email, valid format | Subscriber inserted, `ConsentLog` written, `APIEvent-Welcome-Signup` fired, success message shown |
| CP-19 | Email already exists in `ShopStyle_Subscribers` | Friendly "already subscribed" message, **no** duplicate insert, **no** duplicate journey entry |
| CP-20 | Invalid email format | Rejected server-side (not just client-side) |
| CP-21 | Welcome Journey API call fails (simulated 5xx) | Subscriber + consent log are still saved (writes are not rolled back); error is swallowed for the user-facing message but should be logged — verify `Automation_ErrorLog` gap is addressed (see follow-up: add error logging to this SSJS block, same pattern as `ssjs/shared/error-logger.ssjs`) |

## 6. Cross-Browser / Rendering

- Verify all 4 pages render correctly and are usable on: Chrome, Safari (iOS), Samsung Internet
  (Android) — CloudPages traffic from email links skews heavily mobile.
- Verify `<%= %>` output is properly HTML-escaped for user-controlled fields (`firstName`, `lastName`)
  to prevent stored/reflected XSS — add explicit `Platform.Function.HTMLEncode()` wrapping if not
  already covered by SFMC's default output encoding in QA testing.

## Sign-off Checklist

- [ ] CP-01–CP-05 token resolution tests pass
- [ ] CP-06–CP-09 preference center tests pass
- [ ] CP-10–CP-13 profile update tests pass
- [ ] CP-14–CP-17 subscription management tests pass
- [ ] CP-18–CP-21 smart capture tests pass
- [ ] XSS/output-encoding review completed
- [ ] Deployment checklist item `cloudpages.*` marked complete
