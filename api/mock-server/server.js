"use strict";
/**
 * ShopStyle SFMC Mock Server
 * Local stand-in for the Marketing Cloud REST surface this program integrates with, used to run
 * the journey/API/CloudPage test plans in tests/ without a live SFMC sandbox.
 *
 * Usage:
 *   npm install
 *   npm start
 *   # or: node server.js --port 4000
 */

const express = require("express");
const oauthRoutes = require("./routes/oauth");
const interactionEventRoutes = require("./routes/interactionEvents");
const cartActivityRoutes = require("./routes/cartActivity");
const transactionalSendRoutes = require("./routes/transactionalSend");
const genericDataRoutes = require("./routes/genericData");
const internalAlertRoutes = require("./routes/internalAlert");
const { seedAll } = require("./seed");
const store = require("./store");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use(oauthRoutes);
app.use(interactionEventRoutes);
app.use(cartActivityRoutes);
app.use(transactionalSendRoutes);
app.use(genericDataRoutes);
app.use(internalAlertRoutes);

// Test-only utility endpoints, not part of the real SFMC API surface.
app.post("/__test__/reset", (req, res) => {
  store.reset();
  seedAll();
  res.json({ reset: true });
});
app.get("/__test__/dump/:deName", (req, res) => res.json(store.all(req.params.deName)));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal mock-server error", detail: err.message });
});

if (require.main === module) {
  seedAll();
  app.listen(PORT, () => {
    console.log(`ShopStyle SFMC mock server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
