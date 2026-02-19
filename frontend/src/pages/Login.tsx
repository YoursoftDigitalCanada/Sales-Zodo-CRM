import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { login, setAuthSession } from "@/features/auth";
import { isOnboardingRequired } from "@/lib/enabled-features";
import {
  Loader2, Mail, Lock, Eye, EyeOff, ArrowRight,
  Layers, Check, Sparkles, Shield, Zap, Users,
  Github, Chrome
} from "lucide-react";
import logo from "../Images/Logo/logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      const authData = response?.data as
        | {
          tokens?: { accessToken?: string; refreshToken?: string };
          user?: { firstName?: string };
          employee?: unknown;
          tenant?: unknown;
          permissions?: unknown;
        }
        | undefined;
      const accessToken = authData?.tokens?.accessToken;

      if (response?.success && accessToken) {
        // Store tokens and user data
        setAuthSession({
          accessToken,
          refreshToken: authData?.tokens?.refreshToken,
          user: authData?.user,
          employee: authData?.employee,
          tenant: authData?.tenant,
          permissions: authData?.permissions,
        });

        toast({
          title: "Login Successful",
          description: `Welcome back, ${authData?.user?.firstName || "User"}!`,
        });
        navigate(isOnboardingRequired() ? "/onboarding" : "/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: response?.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Server not reachable";

      const retryAfterSeconds = error?.response?.data?.retryAfter;

      let description = apiMessage;
      if (status === 429 && typeof retryAfterSeconds === "number") {
        description = `${apiMessage} Try again in ${retryAfterSeconds}s.`;
      }

      toast({ title: "Login Failed", description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({ title: "Coming Soon", description: `${provider} login will be available soon!` });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0F172A] via-[#1e293b] to-[#0F172A] overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#23D3EE]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#4BDE80]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#F97315]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="ZODO" className="h-12 w-auto object-contain" />
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Welcome back to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200">
                  your workspace
                </span>
              </h1>
              <p className="text-lg text-white/70 max-w-md">
                Access your CRM, manage clients, and automate your business with AI-powered tools.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: Shield, text: "Enterprise-grade security" },
                { icon: Zap, text: "Lightning-fast performance" },
                { icon: Users, text: "Trusted by 500+ companies" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon size={20} />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-white/90 italic mb-4">
              "ZODO CRM transformed how we manage clients. The CRM is intuitive and the AI chatbot handles 60% of our support queries automatically."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                S
              </div>
              <div>
                <div className="text-white font-semibold">Sarah Johnson</div>
                <div className="text-white/60 text-sm">CEO, TechStart Inc</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logo} alt="ZODO" className="h-10 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold mb-4">
              <Sparkles size={14} />
              Welcome Back
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-gray-500">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleSocialLogin('Google')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              <Chrome size={20} className="text-red-500" />
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('GitHub')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              <Github size={20} />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <NavLink
                  to="/forgot-password"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Forgot password?
                </NavLink>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all duration-200 flex items-center justify-center">
                    {rememberMe && <Check size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  Remember me for 30 days
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#23D3EE] to-[#6366F1] text-white font-semibold rounded-xl shadow-lg shadow-[#23D3EE]/25 hover:shadow-xl hover:shadow-[#23D3EE]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-gray-500">
            Don't have an account?{" "}
            <NavLink
              to="/signup"
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Create free account
            </NavLink>
          </p>

          {/* Security Note */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Shield size={16} />
              <span>Protected by enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
