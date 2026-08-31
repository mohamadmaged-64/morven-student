import assert from "node:assert/strict";

/**
 * Shared helpers for tests that exercise authenticated endpoints.
 *
 * The file-processing / media endpoints require a valid Bearer access token.
 * Tests that hit them should register a fresh user and pass the returned token
 * through `makeClient` so every request is authenticated.
 */

export async function registerUser(baseUrl, suffix = "") {
  const ts = Date.now();
  const email = `tool-${ts}-${Math.floor(Math.random() * 1e6)}${suffix}@test.local`;
  const username = `tooluser${ts}${Math.floor(Math.random() * 1e6)}`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username,
      password: "password123!",
      displayName: "Tool Tester",
    }),
  });
  if (res.status !== 201) {
    const text = await res.text();
    assert.fail(`register should succeed: ${text}`);
  }
  const body = await res.json();
  return { accessToken: body.accessToken, email, username };
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Wrap fetch so every request carries the access token. Pass this object's
 * `request` method to the local upload/download helpers in a test file.
 */
export function makeClient(baseUrl, token) {
  const headers = authHeaders(token);
  return {
    baseUrl,
    token,
    headers,
    // Low-level authenticated fetch (like global fetch but with auth headers).
    fetch: (url, init = {}) =>
      fetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers || {}) },
      }),
    // Convenience verb shortcuts for JSON routes.
    post: (url, init = {}) =>
      fetch(url, { ...init, method: "POST", headers: { ...headers, ...(init.headers || {}) } }),
  };
}
