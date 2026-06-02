import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BrandLogo } from "@/components/public-v2/BrandLogo";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { resetUserPassword } from "@/features/users";

const PASSWORD_HINT = "Use 8+ characters with uppercase, lowercase, number, and special character.";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      toast({ title: "Invalid link", description: "This password setup link is missing its secure token.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Enter the same password in both fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(token, password);
      toast({ title: "Password saved", description: "Your account is ready. Sign in to start using the CRM." });
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast({
        title: "Password setup failed",
        description: error?.response?.data?.message || error?.message || "This link may be invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicV2Shell>
      <div className="flex min-h-screen items-center justify-center bg-hero-bg px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link className="inline-flex justify-center" to="/">
              <BrandLogo className="justify-center" size="lg" />
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-foreground">Set your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose a secure password to activate your CRM access.</p>
          </div>

          <Card className="border-border/60 p-6 shadow-lg sm:p-8">
            <div className="space-y-5">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">New password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11"
                />
              </div>

              <Button className="w-full" disabled={isSubmitting || !password || !confirmPassword} onClick={() => void handleSubmit()} size="lg" variant="accent">
                {isSubmitting ? "Saving..." : <><span>Save password</span><ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PublicV2Shell>
  );
}
