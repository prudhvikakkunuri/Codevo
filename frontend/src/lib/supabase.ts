import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://niteijwuvrtxdeygggfu.supabase.co";

// Read public environment variables for Supabase connection
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

/**
 * Resolves the authoritative backend API base URL.
 * In production, uses NEXT_PUBLIC_API_URL (e.g. Render backend URL).
 * In local development, falls back to http://localhost:8000.
 * Strips any trailing slashes to guarantee clean path composition.
 */
export function getBackendUrl(path: string = ""): string {
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const BACKEND_API_URL = getBackendUrl();

/**
 * Returns true if real Supabase credentials have been configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_ANON_KEY.trim().length > 10 &&
      !SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  );
}

// Singleton browser Supabase client
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns the authoritative Supabase browser client.
 * Configured with auto-refresh and standard browser session persistence.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  // If anon key is missing, initialize with a safe placeholder that will report
  // clear errors on auth operations rather than crashing client-side rendering.
  const anonKey = isSupabaseConfigured()
    ? SUPABASE_ANON_KEY
    : "placeholder-unconfigured-anon-key";

  supabaseClientInstance = createClient(SUPABASE_URL, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "codevo:sb:auth-token",
    },
  });

  return supabaseClientInstance;
}

/**
 * Calls a protected FastAPI backend endpoint with the candidate's Supabase JWT.
 * FastAPI cryptographically verifies the token using Supabase's JWKS.
 */
export async function fetchWithAuth<T = unknown>(
  endpoint: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<{ data?: T; status: number; error?: string }> {
  const token = session?.access_token;
  if (!token) {
    return {
      status: 401,
      error: "Unauthenticated: Missing Supabase access token.",
    };
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : getBackendUrl(endpoint);

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        const errorBody = await res.json();
        errorMessage =
          errorBody.detail ||
          errorBody.error?.message ||
          errorBody.message ||
          errorMessage;
      } catch {
        // use default error message
      }
      return { status: res.status, error: errorMessage };
    }

    const data = (await res.json()) as T;
    return { data, status: res.status };
  } catch (err) {
    return {
      status: 0,
      error: err instanceof Error ? err.message : "Network error contacting backend",
    };
  }
}

