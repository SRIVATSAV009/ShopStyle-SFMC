"use strict";
/**
 * In-memory Data Extension store used by the mock server. Each DE is a Map keyed by a composite
 * primary key string, mirroring how SFMC Data Extensions behave for upsert-by-primary-key.
 * Seeded from sample-data/ on startup (see seed.js).
 */

const dataExtensions = new Map();

function getDE(name) {
  if (!dataExtensions.has(name)) dataExtensions.set(name, new Map());
  return dataExtensions.get(name);
}

function upsert(deName, keyFields, row) {
  const de = getDE(deName);
  const key = keyFields.map((f) => row[f]).join("::");
  const existing = de.get(key) || {};
  de.set(key, { ...existing, ...row });
  return de.get(key);
}

function insert(deName, keyFields, row) {
  return upsert(deName, keyFields, row);
}

function query(deName, filters) {
  const de = getDE(deName);
  let rows = Array.from(de.values());
  if (filters) {
    for (const [field, value] of Object.entries(filters)) {
      rows = rows.filter((r) => String(r[field]) === String(value));
    }
  }
  return rows;
}

function all(deName) {
  return Array.from(getDE(deName).values());
}

function reset() {
  dataExtensions.clear();
}

module.exports = { getDE, upsert, insert, query, all, reset };
