"use strict";
/**
 * Reference client for the Transactional Messaging API (api/rest/transactional-send.md).
 */

async function sendTransactional(baseUrl, accessToken, { definitionKey, contactKey, to, attributes }) {
  const res = await fetch(`${baseUrl}/messaging/v1/email/messageDefinitionSends/key:${definitionKey}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      definitionKey,
      recipient: { contactKey, to, attributes: attributes || {} },
      options: { requestType: "ASYNC" },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Transactional send failed: ${res.status} ${body.message || ""}`);
  }

  return res.json();
}

module.exports = { sendTransactional };
