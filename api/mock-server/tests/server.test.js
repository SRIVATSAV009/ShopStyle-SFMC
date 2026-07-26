"use strict";

const test = require("node:test");
const assert = require("node:assert");
const app = require("../server");
const store = require("../store");
const { seedAll } = require("../seed");

function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test("interaction event: valid welcome signup returns 202 and stages journey entry", async () => {
  store.reset();
  seedAll();
  const server = await startTestServer();
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/interaction/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ContactKey: "SUB-TEST-1",
        EventDefinitionKey: "APIEvent-Welcome-Signup",
        Data: { SubscriberKey: "SUB-TEST-1", EmailAddress: "test@example.com", FirstName: "Test" },
      }),
    });
    assert.strictEqual(res.status, 202);

    const entryRows = store.query("Welcome_Journey_Entry", { SubscriberKey: "SUB-TEST-1" });
    assert.strictEqual(entryRows.length, 1);
    assert.strictEqual(entryRows[0].EmailAddress, "test@example.com");
  } finally {
    server.close();
  }
});

test("interaction event: missing ContactKey returns 400", async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/interaction/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ EventDefinitionKey: "APIEvent-Welcome-Signup", Data: {} }),
    });
    assert.strictEqual(res.status, 400);
  } finally {
    server.close();
  }
});

test("cart activity rowset: upserts ShopStyle_CartActivity by CartId", async () => {
  store.reset();
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/data/v1/customobjectdata/key/DE_SHOPSTYLE_CARTACTIVITY/rowset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { keys: { CartId: "CART-TEST-1" }, values: { SubscriberKey: "SUB-TEST-1", CartStatus: "Active", ItemCount: 1 } },
      ]),
    });
    assert.strictEqual(res.status, 201);

    const rows = store.query("ShopStyle_CartActivity", { CartId: "CART-TEST-1" });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].CartStatus, "Active");
  } finally {
    server.close();
  }
});

test("transactional send: missing recipient.to returns 400", async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/messaging/v1/email/messageDefinitionSends/key:ORDER_CONFIRMATION_TXN/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { contactKey: "SUB-TEST-1" } }),
    });
    assert.strictEqual(res.status, 400);
  } finally {
    server.close();
  }
});

test("oauth token: valid client credentials returns access_token", async () => {
  const server = await startTestServer();
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: "x", client_secret: "y" }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.access_token);
    assert.strictEqual(body.token_type, "Bearer");
  } finally {
    server.close();
  }
});
