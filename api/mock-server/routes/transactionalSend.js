"use strict";
/**
 * Mocks POST /messaging/v1/email/messageDefinitionSends/key:{definitionKey}/send
 * (api/rest/transactional-send.md).
 */

const express = require("express");
const store = require("../store");

const router = express.Router();

router.post("/messaging/v1/email/messageDefinitionSends/key::definitionKey/send", (req, res) => {
  const { definitionKey } = req.params;
  const { recipient } = req.body || {};

  if (!recipient || !recipient.contactKey || !recipient.to) {
    return res.status(400).json({ message: "recipient.contactKey and recipient.to are required" });
  }

  const messageKey = `${definitionKey}-${Date.now()}`;
  store.insert("_MockTransactionalSendLog", ["MessageKey"], {
    MessageKey: messageKey,
    DefinitionKey: definitionKey,
    ContactKey: recipient.contactKey,
    To: recipient.to,
    Attributes: JSON.stringify(recipient.attributes || {}),
    SentAt: new Date().toISOString(),
  });

  return res.status(202).json({
    requestId: `req-${Date.now()}`,
    responses: [{ messageKey, statusCode: "OK" }],
  });
});

module.exports = router;
