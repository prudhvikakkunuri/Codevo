"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  fetchWithAuth,
} from "@/lib/supabase";

export interface CandidateUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  emailConfirmed: boolean;
  createdAt?: string;
  lastSignInAt?: string | null;
}

export interface AuthContextType {
  user: CandidateUser | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  signup: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  verifyBackendToken: () => Promise<{
    verified: boolean;
    backendUser?: { id: string; role: string };
    error?: string;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(sbUser: SupabaseUser | null): CandidateUser | null {
  if (!sbUser) return null;

  const metadata = sbUser.user_metadata || {};
  const fullName =
    metadata.full_name ||
    metadata.name ||
    sbUser.email?.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Candidate";

  return {
    id: sbUser.id,
    email: sbUser.email || "",
    fullName,
    role: sbUser.role || "authenticated",
    emailConfirmed: Boolean(sbUser.email_confirmed_at),
    createdAt: sbUser.created_at,
    lastSignInAt: sbUser.last_sign_in_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CandidateUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  // Initialize and synchronize authentication state with Supabase Auth
  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    // 1. Restore active session from Supabase storage on mount
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn("Failed to retrieve Supabase session:", error.message);
          setSession(null);
          setUser(null);
        } else if (data.session) {
          setSession(data.session);
          setUser(mapSupabaseUser(data.session.user));
        } else {
          setSession(null);
          setUser(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Supabase getSession exception:", err);
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // 2. Subscribe to auth events (multi-tab sync, login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (newSession) {
        setSession(newSession);
        setUser(mapSupabaseUser(newSession.user));
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Authenticate user with Supabase Auth
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      if (!isSupabaseConfigured()) {
        return {
          success: false,
          error:
            "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.",
        };
      }

      if (!email.trim() || !password) {
        return { success: false, error: "Email and password are required." };
      }

      const supabase = getSupabaseClient();
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          // Check for unconfirmed email error
          if (
            error.message.toLowerCase().includes("email not confirmed") ||
            error.code === "email_not_confirmed"
          ) {
            return {
              success: false,
              requiresEmailConfirmation: true,
              error:
                "Email address has not been confirmed. Please check your inbox for the confirmation email.",
            };
          }

          // Return actual Supabase error (e.g. Invalid login credentials)
          return { success: false, error: error.message };
        }

        if (data.session) {
          setSession(data.session);
          setUser(mapSupabaseUser(data.session.user));
          return { success: true };
        }

        return { success: false, error: "Authentication failed. No session returned." };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "An unexpected error occurred during login.",
        };
      }
    },
    []
  );

  // Register new candidate account with Supabase Auth
  const signup = useCallback(
    async (
      fullName: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
      if (!isSupabaseConfigured()) {
        return {
          success: false,
          error:
            "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.",
        };
      }

      if (!fullName.trim()) {
        return { success: false, error: "Full name is required." };
      }
      if (!email.trim() || !email.includes("@")) {
        return { success: false, error: "A valid email address is required." };
      }
      if (password.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long." };
      }

      const supabase = getSupabaseClient();
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // Check if email confirmation is required by project settings
        if (data.user && !data.session) {
          return {
            success: true,
            requiresEmailConfirmation: true,
          };
        }

        // If email confirmation is disabled, user is immediately signed in
        if (data.session) {
          setSession(data.session);
          setUser(mapSupabaseUser(data.session.user));
          return { success: true, requiresEmailConfirmation: false };
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "An unexpected error occurred during registration.",
        };
      }
    },
    []
  );

  // Sign out and invalidate Supabase session
  const logout = useCallback(async () => {
    const supabase = getSupabaseClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error during Supabase signOut:", err);
    } finally {
      setSession(null);
      setUser(null);
    }
  }, []);

  // Verify the candidate's Supabase JWT against FastAPI's /api/v1/auth/me
  const verifyBackendToken = useCallback(async () => {
    if (!session?.access_token) {
      return { verified: false, error: "No active Supabase access token." };
    }

    const res = await fetchWithAuth<{ id: string; role: string }>(
      "/api/v1/auth/me",
      session
    );

    if (res.status === 200 && res.data) {
      return { verified: true, backendUser: res.data };
    }

    return {
      verified: false,
      error: res.error || `FastAPI rejected token with status ${res.status}`,
    };
  }, [session]);

  const value = useMemo(
    () => ({
      user,
      session,
      token: session?.access_token || null,
      isLoading,
      isAuthenticated: Boolean(user && session),
      isConfigured: configured,
      login,
      signup,
      logout,
      verifyBackendToken,
    }),
    [user, session, isLoading, configured, login, signup, logout, verifyBackendToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
