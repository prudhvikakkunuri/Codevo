"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/common/wordmark";
import { useAuth } from "@/lib/auth-context";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to /app
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/app");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    const pwdToSubmit = password;
    // Clear password from local component state to minimize in-memory raw credential lifetime
    setPassword("");

    try {
      const res = await login(email, pwdToSubmit);
      if (res.success) {
        router.replace("/app");
      } else {
        setError(res.error || "Invalid email or password.");
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 select-none">
      {/* Brand Header */}
      <div className="mb-8 text-center space-y-2">
        <Link href="/" className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Wordmark size="lg" />
        </Link>
        <p className="text-xs text-zinc-400 font-mono tracking-wide">
          Build. Debug. Prove. • Candidate Engineering Interview Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#101014] border border-border/80 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
            Sign in to Codevo
          </h1>
          <p className="text-xs text-zinc-400 font-sans">
            Access your interview workspaces, active challenges, and evaluation history.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg border border-red-900/50 bg-red-950/20 text-xs text-red-300 flex items-start gap-2.5 font-sans animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1.5 font-mono text-xs">
            <label htmlFor="email" className="text-zinc-300 block font-medium">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="size-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@codevo.dev"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border/70 bg-zinc-950/60 text-xs text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-zinc-300 block font-medium">
                Password
              </label>
            </div>
            <div className="relative flex items-center">
              <Lock className="size-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-9 pl-9 pr-9 rounded-md border border-border/70 bg-zinc-950/60 text-xs text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 size-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3.5 rounded border-border/80 bg-zinc-900 text-foreground accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-[11px] text-zinc-400 font-sans cursor-pointer">
                Remember this device
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 mt-2 rounded-md bg-foreground text-background hover:bg-zinc-200 text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Sign up */}
        <div className="pt-4 border-t border-border/40 text-center text-xs text-zinc-400 font-sans">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-foreground hover:text-zinc-300 font-medium underline underline-offset-2 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>

      {/* Security Banner Note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Shield className="size-3.5 text-emerald-400/80" />
        <span>Argon2id Salt Hashing • Isolated Docker Containers • Zero Secrets in Bundles</span>
      </div>
    </div>
  );
}

