"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/common/wordmark";
import { useAuth } from "@/lib/auth-context";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // If already authenticated, redirect to /app
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/app");
    }
  }, [isLoading, isAuthenticated, router]);

  // Real-time password strength evaluation
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let label = "Weak";
    let color = "bg-rose-500";
    if (score === 2) {
      label = "Fair";
      color = "bg-amber-500";
    } else if (score === 3) {
      label = "Good";
      color = "bg-blue-500";
    } else if (score >= 4) {
      label = "Strong";
      color = "bg-emerald-500";
    }

    return {
      score,
      label,
      color,
      hasLength: password.length >= 8,
      hasUpperLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (!agreedToTerms) {
      setError("You must accept Codevo's Terms of Service and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signup(fullName, email, password);
      if (res.success) {
        if (res.requiresEmailConfirmation) {
          setEmailConfirmationRequired(true);
        } else {
          router.replace("/app");
        }
      } else {
        setError(res.error || "Failed to create account. Please try again.");
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
        {emailConfirmationRequired ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-95">
            <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Mail className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                Confirmation Email Sent
              </h2>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                We sent an account confirmation link to{" "}
                <span className="font-mono text-zinc-200 font-semibold">{email}</span>.
                Please check your inbox and confirm your address to complete registration.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <Link
                href="/login"
                className="w-full h-10 rounded-md bg-foreground text-background font-mono text-xs font-semibold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                Create your account
              </h1>
              <p className="text-xs text-zinc-400 font-sans">
                Start technical interview challenges and interactive AI workspace assessments.
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
          {/* Full Name */}
          <div className="space-y-1.5 font-mono text-xs">
            <label htmlFor="fullName" className="text-zinc-300 block font-medium">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="size-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border/70 bg-zinc-950/60 text-xs text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

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
            <label htmlFor="password" className="text-zinc-300 block font-medium">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="size-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-2 pt-1 font-sans">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Strength</span>
                  <span className="font-mono text-zinc-300">{passwordStrength.label}</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "h-full flex-1 transition-all",
                        passwordStrength.score >= step ? passwordStrength.color : "bg-zinc-800"
                      )}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400 font-mono pt-0.5">
                  <span className={cn(passwordStrength.hasLength ? "text-emerald-400" : "text-zinc-500")}>
                    ✓ 8+ characters
                  </span>
                  <span className={cn(passwordStrength.hasUpperLower ? "text-emerald-400" : "text-zinc-500")}>
                    ✓ Upper &amp; lowercase
                  </span>
                  <span className={cn(passwordStrength.hasNumber ? "text-emerald-400" : "text-zinc-500")}>
                    ✓ Contains number
                  </span>
                  <span className={cn(passwordStrength.hasSpecial ? "text-emerald-400" : "text-zinc-500")}>
                    ✓ Special character
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 font-mono text-xs">
            <label htmlFor="confirmPassword" className="text-zinc-300 block font-medium">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock className="size-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-9 pl-9 pr-9 rounded-md border border-border/70 bg-zinc-950/60 text-xs text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                className="absolute right-2.5 size-5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Terms & Privacy Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              id="terms"
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 size-3.5 rounded border-border/80 bg-zinc-900 text-foreground accent-emerald-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-[11px] text-zinc-400 leading-relaxed font-sans cursor-pointer">
              I agree to Codevo&apos;s{" "}
              <span className="text-zinc-300 underline underline-offset-2">Terms of Service</span> and{" "}
              <span className="text-zinc-300 underline underline-offset-2">Privacy Policy</span>.
            </label>
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Sign in */}
        <div className="pt-4 border-t border-border/40 text-center text-xs text-zinc-400 font-sans">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground hover:text-zinc-300 font-medium underline underline-offset-2 transition-colors"
          >
            Sign in
          </Link>
        </div>
        </>
        )}
      </div>

      {/* Security Banner Note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Shield className="size-3.5 text-emerald-400/80" />
        <span>Argon2id Salt Hashing • Isolated Docker Containers • Zero Secrets in Bundles</span>
      </div>
    </div>
  );
}

