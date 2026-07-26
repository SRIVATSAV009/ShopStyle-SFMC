"use strict";
/**
 * Reference client for POST /interaction/v1/events (api/rest/event-signup.md), including the
 * exponential-backoff retry behavior described there. Used by ssjs/automation/fire-fallback-events.ssjs
 * as its Node-testable equivalent and by tests/integration-tests/ scripts.
 */

async function sendEvent(baseUrl, accessToken, { contactKey, eventDefinitionKey, data }, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/interaction/v1/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ContactKey: contactKey, EventDefinitionKey: eventDefinitionKey, Data: data }),
      });

      if (res.status === 429) {
        lastError = new Error("Rate limited (429)");
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Event send failed: ${res.status} ${body.message || ""}`);
      }

      return res.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { sendEvent };
