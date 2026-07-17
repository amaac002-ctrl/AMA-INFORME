/**
 * Small fetch helpers to remove the repeated JSON request/parse boilerplate
 * spread across the components.
 */

/** GET a URL and parse the JSON body. */
export async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

/** Send a JSON request and return the raw Response (so callers can inspect `res.ok`). */
export function sendJSON(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export const postJSON = (url: string, body?: unknown) => sendJSON(url, 'POST', body);
export const putJSON = (url: string, body?: unknown) => sendJSON(url, 'PUT', body);
export const deleteJSON = (url: string, body?: unknown) => sendJSON(url, 'DELETE', body);
