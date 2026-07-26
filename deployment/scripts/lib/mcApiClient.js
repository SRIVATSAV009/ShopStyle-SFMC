"use strict";
/**
 * Shared Marketing Cloud API client used by every deployment script in this folder.
 * Reads config/config.json + config/credentials.json (both gitignored, see the .example templates)
 * for environment/credentials, obtains an OAuth token, and exposes thin REST helpers.
 *
 * Against api/mock-server, this works unmodified — the mock server implements the same
 * /v2/token and Data Extension-oriented routes used here.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

function loadJsonIfExists(relativePath, fallback) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return fallback;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function loadConfig() {
  const config = loadJsonIfExists("config/config.json", loadJsonIfExists("config/config.example.json", {}));
  const credentials = loadJsonIfExists("config/credentials.json", loadJsonIfExists("config/credentials.example.json", {}));
  return { config, credentials };
}

class MarketingCloudClient {
  constructor({ baseUrl, clientId, clientSecret }) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  static fromEnvironment(overrides = {}) {
    const { config, credentials } = loadConfig();
    return new MarketingCloudClient({
      baseUrl: overrides.baseUrl || process.env.SHOPSTYLE_MOCK_SERVER_URL || "http://localhost:4000",
      clientId: overrides.clientId || (credentials.marketingCloud && credentials.marketingCloud.clientId) || "local-dev-client",
      clientSecret: overrides.clientSecret || (credentials.marketingCloud && credentials.marketingCloud.clientSecret) || "local-dev-secret",
    });
  }

  async authenticate() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;

    const res = await fetch(`${this.baseUrl}/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Authentication failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    this.accessToken = body.access_token;
    this.tokenExpiresAt = Date.now() + (body.expires_in - 60) * 1000; // refresh 60s early
    return this.accessToken;
  }

  async request(method, urlPath, body) {
    const token = await this.authenticate();
    const res = await fetch(`${this.baseUrl}${urlPath}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`${method} ${urlPath} failed: ${res.status} ${detail}`);
    }
    return res.status === 204 ? null : res.json();
  }

  // Convenience wrapper used by deploy-data-extensions.js against the mock server's
  // test-only DE-registration route (a real integration would call the SOAP Create/CreateDataExtension
  // API — see api/soap/retrieve-data-extension.md for the SOAP envelope pattern this mirrors).
  async upsertDataExtensionRow(deName, keyFields, row) {
    return this.request("POST", `/data/${deName}`, { keyFields, row });
  }
}

module.exports = { MarketingCloudClient, loadConfig, REPO_ROOT };
