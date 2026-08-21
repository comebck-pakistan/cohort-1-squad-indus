/**
 * Browser calls must stay same-origin (`/api/...`).
 * Production frontends rewrite `/api` to the API project; pointing at an
 * absolute VITE_API_URL triggers CORS and shows "Failed to fetch" on login.
 * Local Vite also proxies `/api` to the API (see vite.config).
 */
export const API_BASE = "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized;
}
