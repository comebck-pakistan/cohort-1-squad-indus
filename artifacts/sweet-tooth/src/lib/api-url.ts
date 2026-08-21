/**
 * Browser calls should stay same-origin (`/api/...`).
 * Production frontends already rewrite `/api` to the API project, so an
 * absolute VITE_API_URL triggers CORS and shows "Failed to fetch" on login.
 * Local Vite also proxies `/api` unless VITE_API_URL is set for a remote API.
 */
export const API_BASE =
  typeof window !== "undefined"
    ? ""
    : import.meta.env.DEV
      ? import.meta.env.VITE_API_URL || ""
      : import.meta.env.VITE_API_URL || "https://cohort-1-squad-indus-api-server-z3b.vercel.app";

export function apiUrl(path: string): string {
  if (!API_BASE) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE.replace(/\/+$/, "")}${normalized}`;
}
