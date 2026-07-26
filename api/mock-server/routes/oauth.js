"use strict";
/**
 * Mocks POST /v2/token (mc-connect/oauth-config.md). Accepts any non-empty client_id/client_secret
 * for local testing and issues a short-lived, non-cryptographically-meaningful token.
 */

const express = require("express");

const router = express.Router();

router.post("/v2/token", (req, res) => {
  const { grant_type: grantType, client_id: clientId, client_secret: clientSecret } = req.body || {};

  if (grantType !== "client_credentials" || !clientId || !clientSecret) {
    return res.status(400).json({ message: "grant_type=client_credentials, client_id, client_secret are required" });
  }

  res.json({
    access_token: `mock-token-${Buffer.from(clientId).toString("base64").slice(0, 12)}-${Date.now()}`,
    token_type: "Bearer",
    expires_in: 1200,
    rest_instance_url: "http://localhost:4000/",
    soap_instance_url: "http://localhost:4000/soap/",
  });
});

module.exports = router;
