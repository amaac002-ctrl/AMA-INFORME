/**
 * Small fetch wrapper that surfaces HTTP and network errors instead of
 * letting them be swallowed silently. On a non-2xx response it attempts to
 * read a `{ error }` / `{ message }` body and throws an Error with it, so
 * callers can propagate a meaningful message to the user.
 */
export async function fetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.clone().json();
      detail = body?.message || body?.error || '';
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(detail || `Error ${res.status} ${res.statusText}`.trim());
  }

  return res.json() as Promise<T>;
}

/** Extract a human-readable message from an unknown thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Error desconocido';
}
