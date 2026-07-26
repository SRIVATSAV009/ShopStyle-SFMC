"use strict";
/**
 * Mocks POST /interaction/v1/events (api/rest/event-signup.md, order-status-events.md,
 * case-escalation-event.md). Records the event and, for known EventDefinitionKeys, simulates the
 * resulting journey-entry side effect against the in-memory store so downstream test assertions
 * (e.g., "did the contact enter Welcome_Journey_Entry") have something to check.
 */

const express = require("express");
const store = require("../store");

const router = express.Router();

const JOURNEY_ENTRY_SIDE_EFFECTS = {
  "APIEvent-Welcome-Signup": (data) => store.upsert("Welcome_Journey_Entry", ["SubscriberKey"], data),
  "APIEvent-OrderPlaced": (data) => store.upsert("PostPurchase_Journey_Entry", ["SubscriberKey"], data),
  "APIEvent-OrderShipped": (data) =>
    store.upsert("ShopStyle_Orders", ["OrderId"], { ...data, OrderStatus: "Shipped" }),
  "APIEvent-OrderDelivered": (data) =>
    store.upsert("ShopStyle_Orders", ["OrderId"], { ...data, OrderStatus: "Delivered", ActualDeliveryDate: new Date().toISOString() }),
  "APIEvent-CaseEscalated": (data) => store.upsert("CaseEscalation_Journey_Entry", ["CaseId"], data),
};

router.post("/interaction/v1/events", (req, res) => {
  const { ContactKey, EventDefinitionKey, Data } = req.body || {};

  if (!ContactKey || !EventDefinitionKey) {
    return res.status(400).json({ message: "ContactKey and EventDefinitionKey are required" });
  }

  store.insert("_MockEventLog", ["EventInstanceId"], {
    EventInstanceId: `${EventDefinitionKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ContactKey,
    EventDefinitionKey,
    Data: JSON.stringify(Data || {}),
    ReceivedAt: new Date().toISOString(),
  });

  const sideEffect = JOURNEY_ENTRY_SIDE_EFFECTS[EventDefinitionKey];
  if (sideEffect) sideEffect(Data || {});

  return res.status(202).json({ eventInstanceId: `${EventDefinitionKey}-${Date.now()}` });
});

module.exports = router;
