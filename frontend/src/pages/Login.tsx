import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { BrandLogo } from "@/components/public-v2/BrandLogo";
import { login, setAuthSession } from "@/features/auth";
import { getStoredTenant } from "@/features/auth/lib/auth-storage";
import {
  APP_FEATURE_IDS,
  getFeatureAccessFromTenant,
  isOnboardingRequired,
  normalizeEnabledFeatures,
  setAvailableFeatures,
  setEnabledFeatures,
  setOnboardingCompleted,
} from "@/lib/enabled-features";

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rememberedCompanyName = getStoredTenant()?.name?.trim();

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      toast({
        title: "Missing details",
        description: "Enter your email and password to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response?.data as Record<string, any> | undefined;
      const accessToken = data?.tokens?.accessToken;

      if (!response?.success || !accessToken) {
        throw new Error(response?.message || "Invalid credentials.");
      }

      setAuthSession({
        accessToken,
        refreshToken: data?.tokens?.refreshToken,
        user: data?.user,
        employee: data?.employee,
        tenant: data?.tenant,
        permissions: data?.permissions,
      });

      const availableFeatures = getFeatureAccessFromTenant(data?.tenant) ?? [...APP_FEATURE_IDS];
      const enabledFeatures = normalizeEnabledFeatures((data?.tenant as any)?.enabledFeatures);
      setAvailableFeatures(availableFeatures);
      setEnabledFeatures(enabledFeatures.length > 0 ? enabledFeatures : availableFeatures);
      setOnboardingCompleted((data?.tenant as any)?.onboardingCompleted === true);

      navigate(isOnboardingRequired() ? "/onboarding" : "/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.response?.data?.message || error?.message || "Unable to sign in right now.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicV2Shell>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-bg px-4 py-10">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <Link className="inline-flex justify-center" to="/">
              {rememberedCompanyName ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold uppercase text-accent">
                    {rememberedCompanyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[260px] truncate text-sm font-semibold text-foreground">{rememberedCompanyName}</p>
                    <p className="text-xs text-muted-foreground">CRM</p>
                  </div>
                </div>
              ) : (
                <BrandLogo className="justify-center" size="lg" />
              )}
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your Zodo account</p>
          </div>

          <Card className="border-border/60 p-6 shadow-lg sm:p-8">
            <div className="space-y-5">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSignIn();
                    }
                  }}
                  placeholder="alex@company.com"
                  className="h-11"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Password</Label>
                  <Link className="text-xs font-medium text-accent hover:underline" to="/contact">
                    Need help?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleSignIn();
                      }
                    }}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" disabled={isSubmitting || !email.trim() || !password} onClick={() => void handleSignIn()} size="lg" variant="accent">
                {isSubmitting ? (
                  "Signing in..."
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link className="font-medium text-accent hover:underline" to="/signup">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </PublicV2Shell>
  );
}
