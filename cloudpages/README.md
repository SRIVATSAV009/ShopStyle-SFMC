# CloudPages

All ShopStyle CloudPages are hosted on the branded, SSL-secured domain `offers.shopstyleretail.com`
(see [`../architecture/sender-authentication.md`](../architecture/sender-authentication.md)) and share
a common CSS/JS asset bundle ([`assets/`](assets/)) and a token-based identity pattern for
authenticated pages.

| Page | Path | Auth | Purpose |
|---|---|---|---|
| [Preference Center](preference-center/preference-center.html) | `/preference-center` | Token | Category, frequency, promo/SMS opt-in management |
| [Profile Update](profile-update/profile-update.html) | `/profile-update` | Token | Name, date of birth, mobile number |
| [Subscription Management](subscription-management/subscription-management.html) | `/subscription-management` | Token | Reduce frequency or fully unsubscribe |
| [Smart Capture Signup](smart-capture/newsletter-signup.html) | `/join` | None (public) | New-subscriber acquisition, triggers Welcome Journey |

## Identity Pattern: Scoped Access Tokens

Authenticated pages never accept a raw `SubscriberKey` or `EmailAddress` in the URL. Instead:

1. At email-send time, AMPscript mints a random GUID and stores it in `CloudPage_AccessToken`
   (`SubscriberKey`, `Purpose`, 30-day expiration) — see
   [`../ampscript/cloudpages/mint-access-token.amp`](../ampscript/cloudpages/mint-access-token.amp),
   also inlined directly in [`../ampscript/shared/legal-footer.amp`](../ampscript/shared/legal-footer.amp).
2. The email link is `https://offers.shopstyleretail.com/preference-center?token={GUID}`.
3. The CloudPage's SSJS resolves the token server-side (`resolveToken()` in each page), checking
   existence and expiration before ever looking up subscriber data.
4. An expired/invalid/missing token renders a "link expired" message directing the subscriber back to
   a recent email or to log in via the main site — it never falls back to guessing identity.

This keeps PII out of URLs (which can leak via browser history, referrer headers, or forwarded emails)
while avoiding a full login flow for a low-friction preference update.

## AMPscript + SSJS in the Same Program

- **AMPscript** is used in the *email* templates to mint tokens and build the CloudPage URL
  (`RedirectTo`, `GUID()`, `InsertData`).
- **SSJS** is used *inside the CloudPages themselves* for the heavier logic — token resolution, form
  processing, multi-field validation, and Data Extension writes — because SSJS gives proper
  control-flow (functions, try/catch, real conditionals) that is significantly more maintainable than
  deeply nested AMPscript `%%[ IF ]%%` blocks for a multi-field form handler.
- Pages use the `<% %>` / `<%= %>` SSJS templating shorthand to interpolate server-computed values
  into the HTML response, standard for SFMC CloudPages of this complexity.

## Smart Capture → Welcome Journey Handoff

`newsletter-signup.html` inserts the new `ShopStyle_Subscribers` row directly (CloudPages write to
Data Extensions synchronously, no import lag) and then fires `APIEvent-Welcome-Signup` via an internal
`HttpRequest` call — the exact same event contract used by the production web app
(see [`../api/rest/event-signup.md`](../api/rest/event-signup.md)), so the Welcome Journey has a single
consistent entry point regardless of which channel captured the signup.

## Validation

- **Server-side** (authoritative): every page re-validates in SSJS before writing to a Data Extension —
  see `validateSubmission()` / `validateProfileForm()` / `isValidEmail()` in each page's script block.
- **Client-side** (UX only): [`assets/js/form-validation.js`](assets/js/form-validation.js) gives
  inline error messages before submission; never trusted as the sole validation layer.

## Testing

[`../tests/cloudpage-tests/cloudpage-test-plan.md`](../tests/cloudpage-tests/cloudpage-test-plan.md)
