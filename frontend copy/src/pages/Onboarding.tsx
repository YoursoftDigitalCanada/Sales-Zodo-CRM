// src/pages/Onboarding.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  getStoredEnabledFeatures,
  normalizeEnabledFeatures,
  setEnabledFeatures,
  setOnboardingCompleted,
  isOnboardingCompleted,
} from "@/lib/enabled-features";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  X,
  Upload,
  Camera,
  Building2,
  User,
  Users,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Target,
  Zap,
  Sparkles,
  Star,
  Crown,
  Rocket,
  Trophy,
  Gift,
  Heart,
  ThumbsUp,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Shield,
  Lock,
  Key,
  Bell,
  Settings,
  Palette,
  Layout,
  LayoutGrid,
  List,
  Kanban,
  PieChart,
  BarChart3,
  TrendingUp,
  FileText,
  FolderOpen,
  Database,
  Cloud,
  Link as LinkIcon,
  ExternalLink,
  Play,
  PlayCircle,
  Video,
  BookOpen,
  GraduationCap,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Send,
  UserPlus,
  UserCheck,
  UsersRound,
  Building,
  Store,
  ShoppingBag,
  Headphones,
  Wrench,
  Code,
  Cpu,
  Smartphone,
  Monitor,
  MousePointer,
  Layers,
  Box,
  Package,
  Truck,
  Home,
  Coffee,
  Utensils,
  Plane,
  Car,
  Bike,
  Activity,
  Stethoscope,
  Pill,
  Scissors,
  Paintbrush,
  Music,
  Film,
  Gamepad2,
  Dumbbell,
  TreePine,
  Sun,
  Moon,
  Plus,
  Info,
  type LucideIcon,
} from "lucide-react";
import Confetti from "react-confetti";

// ============================================
// ANIMATED BACKGROUND COMPONENTS
// ============================================

// Floating Orbs Component
const FloatingOrbs = () => {
  const orbs = [
    { size: 600, x: "10%", y: "20%", color: "#23D3EE", delay: 0, duration: 20 },
    { size: 400, x: "80%", y: "10%", color: "#0F172A", delay: 2, duration: 25 },
    { size: 300, x: "70%", y: "70%", color: "#23D3EE", delay: 4, duration: 18 },
    { size: 500, x: "20%", y: "80%", color: "#0F172A", delay: 1, duration: 22 },
    { size: 200, x: "50%", y: "50%", color: "#23D3EE", delay: 3, duration: 15 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full opacity-30 blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}40 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 50, -20, 0],
            scale: [1, 1.1, 0.9, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Particle Field Component
const ParticleField = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-[#23D3EE]"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: 0.3,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Grid Pattern Component
const GridPattern = () => {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0F172A 1px, transparent 1px),
            linear-gradient(to bottom, #0F172A 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
};

// Animated Gradient Mesh
const GradientMesh = () => {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 40% 20%, rgba(23, 195, 178, 0.15) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(13, 35, 66, 0.1) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(23, 195, 178, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 50%, rgba(13, 35, 66, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(23, 195, 178, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 100%, rgba(13, 35, 66, 0.1) 0px, transparent 50%)
          `,
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Floating Icons Component
const FloatingIcons = () => {
  const icons = [
    { Icon: Rocket, x: "5%", y: "15%", size: 32, color: "#23D3EE" },
    { Icon: Star, x: "90%", y: "20%", size: 24, color: "#F59E0B" },
    { Icon: Target, x: "85%", y: "75%", size: 28, color: "#23D3EE" },
    { Icon: Zap, x: "8%", y: "70%", size: 26, color: "#8B5CF6" },
    { Icon: Heart, x: "15%", y: "45%", size: 20, color: "#EC4899" },
    { Icon: Crown, x: "92%", y: "50%", size: 24, color: "#F59E0B" },
    { Icon: Trophy, x: "75%", y: "10%", size: 22, color: "#10B981" },
    { Icon: Gift, x: "3%", y: "85%", size: 28, color: "#EF4444" },
    { Icon: Sparkles, x: "50%", y: "5%", size: 24, color: "#23D3EE" },
    { Icon: Lightbulb, x: "45%", y: "90%", size: 26, color: "#F59E0B" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, index) => {
        const Icon = item.Icon;
        return (
          <motion.div
            key={index}
            className="absolute"
            style={{ left: item.x, top: item.y }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
              y: [0, -15, 0],
            }}
            transition={{
              duration: 6 + index,
              delay: index * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon size={item.size} style={{ color: item.color }} />
          </motion.div>
        );
      })}
    </div>
  );
};

// Animated Lines Component
const AnimatedLines = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#23D3EE" stopOpacity="0" />
            <stop offset="50%" stopColor="#23D3EE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#23D3EE" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <motion.line
            key={i}
            x1="0%"
            y1={`${20 + i * 15}%`}
            x2="100%"
            y2={`${20 + i * 15}%`}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 8,
              delay: i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// Glowing Cursor Effect
const GlowingCursor = () => {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 50 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed w-96 h-96 rounded-full pointer-events-none z-0"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        background: "radial-gradient(circle, rgba(23, 195, 178, 0.15) 0%, transparent 70%)",
      }}
    />
  );
};

// Wave Animation Component
const WaveAnimation = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 pointer-events-none overflow-hidden opacity-30">
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <motion.path
          fill="#23D3EE"
          fillOpacity="0.3"
          initial={{ d: "M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" }}
          animate={{
            d: [
              "M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,122.7C672,128,768,192,864,213.3C960,235,1056,213,1152,181.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.path
          fill="#0F172A"
          fillOpacity="0.2"
          initial={{ d: "M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,186.7C672,192,768,192,864,186.7C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" }}
          animate={{
            d: [
              "M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,186.7C672,192,768,192,864,186.7C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,224L48,229.3C96,235,192,245,288,234.7C384,224,480,192,576,181.3C672,171,768,181,864,197.3C960,213,1056,235,1152,229.3C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,186.7C672,192,768,192,864,186.7C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            ],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
};

// Animated Background Container
const AnimatedBackground = ({ variant = "default" }: { variant?: "default" | "celebration" }) => {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <GradientMesh />
      <GridPattern />
      <FloatingOrbs />
      <ParticleField />
      <FloatingIcons />
      <AnimatedLines />
      <GlowingCursor />
      <WaveAnimation />
    </div>
  );
};

// ============================================
// TYPES & INTERFACES
// ============================================

type OnboardingStep =
  | "welcome"
  | "profile"
  | "company"
  | "team-size"
  | "industry"
  | "goals"
  | "features"
  | "integrations"
  | "invite-team"
  | "preferences"
  | "complete";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  jobTitle: string;
  department: string;
}

interface CompanyProfile {
  name: string;
  website: string;
  logo: string | null;
  address: string;
  city: string;
  country: string;
  industry: string;
  size: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "manager" | "member" | "viewer";
  department: string;
}

interface OnboardingData {
  profile: UserProfile;
  company: CompanyProfile;
  teamSize: string;
  industry: string;
  goals: string[];
  features: string[];
  integrations: string[];
  teamMembers: TeamMember[];
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
    defaultView: "list" | "grid" | "kanban";
  };
}

interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: LucideIcon;
  optional?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const steps: StepConfig[] = [
  { id: "welcome", title: "Welcome", description: "Let's get started", icon: Rocket },
  { id: "profile", title: "Your Profile", description: "Tell us about yourself", icon: User },
  { id: "company", title: "Company Details", description: "Set up your organization", icon: Building2 },
  { id: "team-size", title: "Team Size", description: "How big is your team?", icon: Users },
  { id: "industry", title: "Industry", description: "What's your business focus?", icon: Briefcase },
  { id: "goals", title: "Your Goals", description: "What do you want to achieve?", icon: Target },
  { id: "features", title: "Key Features", description: "Customize your experience", icon: Zap },
  { id: "integrations", title: "Integrations", description: "Connect your tools", icon: LinkIcon, optional: true },
  { id: "invite-team", title: "Invite Team", description: "Bring your team onboard", icon: UserPlus, optional: true },
  { id: "preferences", title: "Preferences", description: "Personalize your workspace", icon: Settings },
  { id: "complete", title: "All Done!", description: "You're ready to go", icon: Trophy },
];

const teamSizes = [
  { id: "solo", label: "Just me", description: "Solo entrepreneur", icon: User, range: "1" },
  { id: "small", label: "Small team", description: "2-10 members", icon: Users, range: "2-10" },
  { id: "medium", label: "Medium team", description: "11-50 members", icon: UsersRound, range: "11-50" },
  { id: "large", label: "Large team", description: "51-200 members", icon: Building, range: "51-200" },
  { id: "enterprise", label: "Enterprise", description: "200+ members", icon: Building2, range: "200+" },
];

const industries = [
  { id: "technology", label: "Technology", icon: Cpu, color: "#3B82F6" },
  { id: "saas", label: "SaaS", icon: Cloud, color: "#8B5CF6" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, color: "#10B981" },
  { id: "marketing", label: "Marketing & Advertising", icon: TrendingUp, color: "#F59E0B" },
  { id: "consulting", label: "Consulting", icon: Briefcase, color: "#EC4899" },
  { id: "finance", label: "Finance & Banking", icon: DollarSign, color: "#14B8A6" },
  { id: "healthcare", label: "Healthcare", icon: Stethoscope, color: "#EF4444" },
  { id: "education", label: "Education", icon: GraduationCap, color: "#6366F1" },
  { id: "realestate", label: "Real Estate", icon: Home, color: "#F97316" },
  { id: "manufacturing", label: "Manufacturing", icon: Wrench, color: "#64748B" },
  { id: "retail", label: "Retail", icon: Store, color: "#84CC16" },
  { id: "hospitality", label: "Hospitality", icon: Coffee, color: "#A855F7" },
  { id: "logistics", label: "Logistics & Transport", icon: Truck, color: "#0EA5E9" },
  { id: "media", label: "Media & Entertainment", icon: Film, color: "#D946EF" },
  { id: "nonprofit", label: "Non-profit", icon: Heart, color: "#F43F5E" },
  { id: "other", label: "Other", icon: Box, color: "#94A3B8" },
];

const goals = [
  { id: "manage-leads", label: "Manage Leads & Contacts", description: "Organize and track all your prospects", icon: Users },
  { id: "sales-pipeline", label: "Track Sales Pipeline", description: "Visualize and manage deals", icon: TrendingUp },
  { id: "client-management", label: "Client Management", description: "Build stronger relationships", icon: UserCheck },
  { id: "team-collaboration", label: "Team Collaboration", description: "Work better together", icon: UsersRound },
  { id: "task-management", label: "Task & Project Management", description: "Stay organized and productive", icon: CheckCircle2 },
  { id: "invoicing", label: "Invoicing & Payments", description: "Get paid faster", icon: CreditCard },
  { id: "reporting", label: "Analytics & Reporting", description: "Make data-driven decisions", icon: BarChart3 },
  { id: "automation", label: "Workflow Automation", description: "Save time with automation", icon: Zap },
  { id: "communication", label: "Email & Communication", description: "Centralize all communications", icon: Mail },
  { id: "scheduling", label: "Scheduling & Bookings", description: "Manage appointments easily", icon: Calendar },
];

const features = [
  { id: "leads", label: "Lead Management", description: "Capture and nurture leads", icon: Users, category: "Sales" },
  { id: "pipeline", label: "Sales Pipeline", description: "Visual deal tracking", icon: Kanban, category: "Sales" },
  { id: "contacts", label: "Contact Management", description: "Centralized contact database", icon: UserCheck, category: "CRM" },
  { id: "companies", label: "Company Profiles", description: "Organize by organization", icon: Building2, category: "CRM" },
  { id: "tasks", label: "Tasks & To-dos", description: "Stay on top of work", icon: CheckCircle2, category: "Productivity" },
  { id: "calendar", label: "Calendar", description: "Schedule and plan", icon: Calendar, category: "Productivity" },
  { id: "email", label: "Email Integration", description: "Sync your inbox", icon: Mail, category: "Communication" },
  { id: "invoices", label: "Invoicing", description: "Create and send invoices", icon: FileText, category: "Finance" },
  { id: "reports", label: "Reports & Analytics", description: "Insights and metrics", icon: PieChart, category: "Analytics" },
  { id: "documents", label: "Document Management", description: "Store and share files", icon: FolderOpen, category: "Productivity" },
  { id: "automation", label: "Automation", description: "Automate workflows", icon: Zap, category: "Advanced" },
  { id: "api", label: "API Access", description: "Build custom integrations", icon: Code, category: "Advanced" },
];

const integrations = [
  { id: "google", name: "Google Workspace", description: "Gmail, Calendar, Drive", color: "#4285F4", popular: true },
  { id: "microsoft", name: "Microsoft 365", description: "Outlook, Teams, OneDrive", color: "#00A4EF", popular: true },
  { id: "slack", name: "Slack", description: "Team communication", color: "#4A154B", popular: true },
  { id: "zoom", name: "Zoom", description: "Video meetings", color: "#2D8CFF", popular: true },
  { id: "stripe", name: "Stripe", description: "Payment processing", color: "#635BFF", popular: false },
  { id: "quickbooks", name: "QuickBooks", description: "Accounting software", color: "#2CA01C", popular: false },
  { id: "mailchimp", name: "Mailchimp", description: "Email marketing", color: "#FFE01B", popular: false },
  { id: "hubspot", name: "HubSpot", description: "Marketing automation", color: "#FF7A59", popular: false },
  { id: "zapier", name: "Zapier", description: "Connect 5000+ apps", color: "#FF4A00", popular: true },
  { id: "salesforce", name: "Salesforce", description: "CRM integration", color: "#00A1E0", popular: false },
];

const departments = ["Sales", "Marketing", "Customer Success", "Support", "Operations", "Finance", "HR", "Engineering", "Product", "Design", "Executive", "Other"];
const jobTitles = ["CEO / Founder", "CTO", "COO", "CFO", "VP of Sales", "VP of Marketing", "Sales Manager", "Marketing Manager", "Account Executive", "Business Development", "Customer Success Manager", "Project Manager", "Product Manager", "Developer", "Designer", "Consultant", "Other"];
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
];
const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// ============================================
// GLASSMORPHISM CARD COMPONENT
// ============================================

const GlassCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative backdrop-blur-xl bg-white/70 border border-white/20 rounded-3xl shadow-xl shadow-black/5",
        className
      )}
      {...props}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// ============================================
// ENHANCED PROGRESS INDICATOR
// ============================================

const ProgressIndicator = ({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepConfig[];
  currentStep: OnboardingStep;
  onStepClick: (step: OnboardingStep) => void;
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentIndex) / (steps.length - 1)) * 100;

  return (
    <div className="hidden lg:block w-80 p-6">
      <GlassCard className="p-6 h-full">
        {/* Logo and Progress */}
        <div className="mb-8">
          <motion.div 
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div 
              className="w-12 h-12 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#23D3EE]/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Sparkles size={24} className="text-white" />
            </motion.div>
            <div>
              <h2 className="font-bold text-[#0F172A] text-lg">CRM Setup</h2>
              <p className="text-sm text-slate-500">Step {currentIndex + 1} of {steps.length}</p>
            </div>
          </motion.div>
          
          {/* Animated Progress Bar */}
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/30 to-transparent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Steps Navigation */}
        <nav className="space-y-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.id === currentStep;
            const isAccessible = index <= currentIndex;
            const Icon = step.icon;

            return (
              <motion.button
                key={step.id}
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={isAccessible ? { x: 4 } : {}}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                  isCurrent
                    ? "bg-gradient-to-r from-[#23D3EE]/20 to-[#0F172A]/10 border border-[#23D3EE]/30 shadow-lg shadow-[#23D3EE]/10"
                    : isCompleted
                    ? "hover:bg-white/50"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                    isCurrent
                      ? "bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white shadow-lg shadow-[#23D3EE]/30"
                      : isCompleted
                      ? "bg-gradient-to-br from-green-400 to-green-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  )}
                  whileHover={isCurrent ? { scale: 1.1 } : {}}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Check size={18} />
                    </motion.div>
                  ) : (
                    <Icon size={18} />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold truncate",
                        isCurrent ? "text-[#23D3EE]" : isCompleted ? "text-[#0F172A]" : "text-slate-400"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.optional && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-white/50">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{step.description}</p>
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-6 border-t border-slate-200/50"
        >
          <p className="text-xs text-slate-400 mb-3">Need help?</p>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 p-2 text-sm text-slate-600 hover:bg-white/50 rounded-lg transition-colors">
              <HelpCircle size={16} className="text-slate-400" />
              Help Center
            </button>
            <button className="w-full flex items-center gap-2 p-2 text-sm text-slate-600 hover:bg-white/50 rounded-lg transition-colors">
              <MessageSquare size={16} className="text-slate-400" />
              Contact Support
            </button>
          </div>
        </motion.div>
      </GlassCard>
    </div>
  );
};

// Mobile Progress Bar with Glass Effect
const MobileProgressBar = ({
  steps,
  currentStep,
}: {
  steps: StepConfig[];
  currentStep: OnboardingStep;
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentIndex) / (steps.length - 1)) * 100;
  const CurrentIcon = steps[currentIndex].icon;

  return (
    <div className="lg:hidden">
      <GlassCard className="m-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-xl flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <CurrentIcon size={20} className="text-white" />
            </motion.div>
            <div>
              <p className="font-semibold text-[#0F172A]">{steps[currentIndex].title}</p>
              <p className="text-xs text-slate-500">Step {currentIndex + 1} of {steps.length}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#23D3EE]">{Math.round(progress)}%</p>
          </div>
        </div>
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </GlassCard>
    </div>
  );
};

// ============================================
// ENHANCED STEP COMPONENTS
// ============================================

// Welcome Step with Enhanced Animation
const WelcomeStep = ({ onNext }: { onNext: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto text-center py-8 lg:py-12"
    >
      <GlassCard className="p-8 lg:p-12">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="relative w-28 h-28 mx-auto mb-8"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-3xl shadow-2xl shadow-[#23D3EE]/30"
            animate={{
              boxShadow: [
                "0 25px 50px -12px rgba(23, 195, 178, 0.3)",
                "0 25px 50px -12px rgba(23, 195, 178, 0.5)",
                "0 25px 50px -12px rgba(23, 195, 178, 0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket size={48} className="text-white" />
            </motion.div>
          </div>
          
          {/* Orbiting particles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-[#23D3EE] rounded-full"
              style={{
                top: "50%",
                left: "50%",
              }}
              animate={{
                x: [0, 60 * Math.cos((i * 2 * Math.PI) / 3), 0],
                y: [0, 60 * Math.sin((i * 2 * Math.PI) / 3), 0],
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4"
        >
          Welcome to Your New CRM! 
          <motion.span
            animate={{ rotate: [0, 20, -20, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="inline-block ml-2"
          >
            🎉
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-slate-600 mb-10 max-w-lg mx-auto"
        >
          Let's set up your workspace in just a few minutes. We'll personalize everything based on your needs.
        </motion.p>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          {[
            { icon: Clock, label: "5 minutes", description: "Quick setup", color: "#23D3EE" },
            { icon: Sparkles, label: "Personalized", description: "Tailored for you", color: "#8B5CF6" },
            { icon: Shield, label: "Secure", description: "Your data is safe", color: "#10B981" },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg"
            >
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${item.color}20` }}
                whileHover={{ rotate: 10 }}
              >
                <item.icon size={24} style={{ color: item.color }} />
              </motion.div>
              <p className="font-bold text-[#0F172A]">{item.label}</p>
              <p className="text-sm text-slate-500">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <motion.button
            onClick={onNext}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-8 py-4 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] text-white font-semibold rounded-2xl shadow-xl shadow-[#23D3EE]/30 overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative flex items-center gap-2 text-lg">
              Let's Get Started
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight size={20} />
              </motion.span>
            </span>
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-slate-400 mt-6"
        >
          ✨ You can always change these settings later
        </motion.p>
      </GlassCard>
    </motion.div>
  );
};

// Profile Step with Enhanced UI
const ProfileStep = ({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.firstName.trim()) newErrors.firstName = "First name is required";
    if (!data.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!data.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <User size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Tell us about yourself</h2>
          <p className="text-slate-500">This helps us personalize your experience</p>
        </div>

        {/* Avatar Upload */}
        <motion.div 
          className="flex justify-center mb-8"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative group">
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Avatar className="relative w-28 h-28 border-4 border-white shadow-xl">
              <AvatarImage src={data.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white text-2xl font-bold">
                {data.firstName && data.lastName ? getInitials(data.firstName, data.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onUpdate({ avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}` })}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-xl flex items-center justify-center text-white shadow-lg"
            >
              <Camera size={18} />
            </motion.button>
          </div>
        </motion.div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="firstName" className="text-sm font-medium text-[#0F172A]">
                First Name *
              </Label>
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(e) => onUpdate({ firstName: e.target.value })}
                placeholder="John"
                className={cn(
                  "rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all",
                  errors.firstName && "border-red-500"
                )}
              />
              {errors.firstName && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500"
                >
                  {errors.firstName}
                </motion.p>
              )}
            </motion.div>
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Label htmlFor="lastName" className="text-sm font-medium text-[#0F172A]">
                Last Name *
              </Label>
              <Input
                id="lastName"
                value={data.lastName}
                onChange={(e) => onUpdate({ lastName: e.target.value })}
                placeholder="Doe"
                className={cn(
                  "rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all",
                  errors.lastName && "border-red-500"
                )}
              />
              {errors.lastName && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500"
                >
                  {errors.lastName}
                </motion.p>
              )}
            </motion.div>
          </div>

          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
              Email Address *
            </Label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => onUpdate({ email: e.target.value })}
                placeholder="john@company.com"
                className={cn(
                  "pl-10 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all",
                  errors.email && "border-red-500"
                )}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {errors.email}
              </motion.p>
            )}
          </motion.div>

          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Label htmlFor="phone" className="text-sm font-medium text-[#0F172A]">
              Phone Number
            </Label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => onUpdate({ phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="pl-10 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all"
              />
            </div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#0F172A]">Job Title</Label>
              <Select value={data.jobTitle} onValueChange={(value) => onUpdate({ jobTitle: value })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {jobTitles.map((title) => (
                    <SelectItem key={title} value={title} className="rounded-lg">
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#0F172A]">Department</Label>
              <Select value={data.department} onValueChange={(value) => onUpdate({ department: value })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept} className="rounded-lg">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <motion.div 
          className="flex justify-between mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Company Step
// Company Step (continued)
const CompanyStep = ({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: CompanyProfile;
  onUpdate: (data: Partial<CompanyProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = "Company name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Building2 size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Company Details</h2>
          <p className="text-slate-500">Tell us about your organization</p>
        </div>

        {/* Logo Upload */}
        <motion.div
          className="flex justify-center mb-8"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative group">
            <motion.div
              className="w-24 h-24 rounded-2xl bg-white/50 backdrop-blur-sm border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-[#23D3EE] transition-colors"
              whileHover={{ scale: 1.05 }}
              onClick={() => onUpdate({ logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${Date.now()}` })}
            >
              {data.logo ? (
                <img src={data.logo} alt="Company logo" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-400">Upload Logo</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Form Fields */}
        <div className="space-y-5">
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Label htmlFor="companyName" className="text-sm font-medium text-[#0F172A]">
              Company Name *
            </Label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="companyName"
                value={data.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Acme Inc."
                className={cn(
                  "pl-10 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all",
                  errors.name && "border-red-500"
                )}
              />
            </div>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {errors.name}
              </motion.p>
            )}
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Label htmlFor="website" className="text-sm font-medium text-[#0F172A]">
              Website
            </Label>
            <div className="relative">
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="website"
                value={data.website}
                onChange={(e) => onUpdate({ website: e.target.value })}
                placeholder="https://www.example.com"
                className="pl-10 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all"
              />
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium text-[#0F172A]">
                City
              </Label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="city"
                  value={data.city}
                  onChange={(e) => onUpdate({ city: e.target.value })}
                  placeholder="New York"
                  className="pl-10 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium text-[#0F172A]">
                Country
              </Label>
              <Select value={data.country} onValueChange={(value) => onUpdate({ country: value })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {["United States", "Canada", "United Kingdom", "Germany", "France", "Australia", "Other"].map((country) => (
                    <SelectItem key={country} value={country} className="rounded-lg">
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Label htmlFor="address" className="text-sm font-medium text-[#0F172A]">
              Address
            </Label>
            <Textarea
              id="address"
              value={data.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="123 Business Street, Suite 100"
              className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm focus:border-[#23D3EE] focus:ring-[#23D3EE]/20 transition-all resize-none"
              rows={2}
            />
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Team Size Step
const TeamSizeStep = ({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: string;
  onSelect: (size: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Users size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">How big is your team?</h2>
          <p className="text-slate-500">This helps us recommend the right plan for you</p>
        </div>

        {/* Team Size Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {teamSizes.map((size, index) => {
            const Icon = size.icon;
            const isSelected = selected === size.id;

            return (
              <motion.button
                key={size.id}
                onClick={() => onSelect(size.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-6 rounded-2xl border-2 text-left transition-all overflow-hidden",
                  isSelected
                    ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5 shadow-lg shadow-[#23D3EE]/20"
                    : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50 hover:bg-white/80"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-full flex items-center justify-center"
                  >
                    <Check size={14} className="text-white" />
                  </motion.div>
                )}
                <motion.div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
                    isSelected
                      ? "bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white"
                      : "bg-slate-100 text-slate-500"
                  )}
                  whileHover={{ rotate: 5 }}
                >
                  <Icon size={24} />
                </motion.div>
                <h3 className={cn(
                  "font-semibold mb-1 transition-colors",
                  isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                )}>
                  {size.label}
                </h3>
                <p className="text-sm text-slate-500">{size.description}</p>
                <p className="text-xs text-slate-400 mt-1">{size.range} people</p>
              </motion.button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={onNext}
            disabled={!selected}
            whileHover={{ scale: selected ? 1.02 : 1 }}
            whileTap={{ scale: selected ? 0.98 : 1 }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl transition-all",
              selected
                ? "text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl"
                : "text-slate-400 bg-slate-100 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Industry Step
const IndustryStep = ({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: string;
  onSelect: (industry: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Briefcase size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">What industry are you in?</h2>
          <p className="text-slate-500">We'll customize your experience based on your industry</p>
        </div>

        {/* Industry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {industries.map((industry, index) => {
            const Icon = industry.icon;
            const isSelected = selected === industry.id;

            return (
              <motion.button
                key={industry.id}
                onClick={() => onSelect(industry.id)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-4 rounded-xl border-2 text-center transition-all",
                  isSelected
                    ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5 shadow-lg"
                    : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-full flex items-center justify-center"
                  >
                    <Check size={12} className="text-white" />
                  </motion.div>
                )}
                <motion.div
                  className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: `${industry.color}20` }}
                  whileHover={{ rotate: 10 }}
                >
                  <Icon size={20} style={{ color: industry.color }} />
                </motion.div>
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                )}>
                  {industry.label}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={onNext}
            disabled={!selected}
            whileHover={{ scale: selected ? 1.02 : 1 }}
            whileTap={{ scale: selected ? 0.98 : 1 }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl transition-all",
              selected
                ? "text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl"
                : "text-slate-400 bg-slate-100 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Goals Step
const GoalsStep = ({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (goalId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Target size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">What are your main goals?</h2>
          <p className="text-slate-500">Select all that apply - we'll prioritize these features for you</p>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {goals.map((goal, index) => {
            const Icon = goal.icon;
            const isSelected = selected.includes(goal.id);

            return (
              <motion.button
                key={goal.id}
                onClick={() => onToggle(goal.id)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  isSelected
                    ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5 shadow-lg"
                    : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                )}
              >
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected
                      ? "bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white"
                      : "bg-slate-100 text-slate-500"
                  )}
                  animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                >
                  <Icon size={20} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-semibold mb-1 transition-colors",
                    isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                  )}>
                    {goal.label}
                  </h3>
                  <p className="text-sm text-slate-500">{goal.description}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  isSelected
                    ? "border-[#23D3EE] bg-[#23D3EE]"
                    : "border-slate-300"
                )}>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check size={12} className="text-white" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Count */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <Badge className="bg-[#23D3EE]/10 text-[#23D3EE] border-[#23D3EE]/30">
              {selected.length} goal{selected.length !== 1 ? "s" : ""} selected
            </Badge>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={onNext}
            disabled={selected.length === 0}
            whileHover={{ scale: selected.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: selected.length > 0 ? 0.98 : 1 }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl transition-all",
              selected.length > 0
                ? "text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl"
                : "text-slate-400 bg-slate-100 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Features Step
const FeaturesStep = ({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (featureId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Zap size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Choose your key features</h2>
          <p className="text-slate-500">We'll enable these features in your workspace</p>
        </div>

        {/* Features by Category */}
        <div className="space-y-6 mb-8">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features
                  .filter((f) => f.category === category)
                  .map((feature, index) => {
                    const Icon = feature.icon;
                    const isSelected = selected.includes(feature.id);

                    return (
                      <motion.button
                        key={feature.id}
                        onClick={() => onToggle(feature.id)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5"
                            : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white"
                            : "bg-slate-100 text-slate-500"
                        )}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium transition-colors",
                            isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                          )}>
                            {feature.label}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{feature.description}</p>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "border-[#23D3EE] bg-[#23D3EE]"
                            : "border-slate-300"
                        )}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                      </motion.button>
                    );
                  })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Count */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <Badge className="bg-[#23D3EE]/10 text-[#23D3EE] border-[#23D3EE]/30">
              {selected.length} feature{selected.length !== 1 ? "s" : ""} selected
            </Badge>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={onNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Integrations Step
const IntegrationsStep = ({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (integrationId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const popularIntegrations = integrations.filter((i) => i.popular);
  const otherIntegrations = integrations.filter((i) => !i.popular);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-3xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <LinkIcon size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Connect your tools</h2>
          <p className="text-slate-500">Integrate with the apps you already use</p>
          <Badge variant="outline" className="mt-2">
            Optional - Skip if you prefer
          </Badge>
        </div>

        {/* Popular Integrations */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Star size={14} className="text-yellow-500" />
            Popular
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularIntegrations.map((integration, index) => {
              const isSelected = selected.includes(integration.id);

              return (
                <motion.button
                  key={integration.id}
                  onClick={() => onToggle(integration.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    isSelected
                      ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5 shadow-lg"
                      : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: integration.color }}
                  >
                    {integration.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-semibold transition-colors",
                      isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                    )}>
                      {integration.name}
                    </p>
                    <p className="text-sm text-slate-500">{integration.description}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    isSelected
                      ? "border-[#23D3EE] bg-[#23D3EE]"
                      : "border-slate-300"
                  )}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Other Integrations */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            More Integrations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherIntegrations.map((integration, index) => {
              const isSelected = selected.includes(integration.id);

              return (
                <motion.button
                  key={integration.id}
                  onClick={() => onToggle(integration.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all",
                    isSelected
                      ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5"
                      : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: integration.color }}
                  >
                    {integration.name.charAt(0)}
                  </div>
                  <p className={cn(
                    "text-sm font-medium transition-colors",
                    isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                  )}>
                    {integration.name}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <div className="flex gap-3">
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
            >
              Skip
            </motion.button>
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
            >
              Continue
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Invite Team Step
const InviteTeamStep = ({
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onNext,
  onBack,
}: {
  members: TeamMember[];
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember: (id: string, data: Partial<TeamMember>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<TeamMember["role"]>("member");

  const handleAddMember = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      onAddMember();
      onUpdateMember(members[members.length - 1]?.id || "new", { email: newEmail, role: newRole });
      setNewEmail("");
      setNewRole("member");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <UserPlus size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Invite your team</h2>
          <p className="text-slate-500">Collaborate together from day one</p>
          <Badge variant="outline" className="mt-2">
            Optional - You can invite later
          </Badge>
        </div>

        {/* Add Member Form */}
        <motion.div
          className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="rounded-xl border-slate-200 bg-white"
              />
            </div>
            <Select value={newRole} onValueChange={(value: TeamMember["role"]) => setNewRole(value)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <motion.button
              onClick={handleAddMember}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] text-white rounded-xl flex items-center gap-2 justify-center"
            >
              <Plus size={18} />
              Add
            </motion.button>
          </div>
        </motion.div>

        {/* Team Members List */}
        {members.length > 0 && (
          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Team Members ({members.length})
            </h3>
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-slate-200"
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white text-sm">
                    {member.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{member.email}</p>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
                <motion.button
                  onClick={() => onRemoveMember(member.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {members.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-slate-400"
          >
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>No team members added yet</p>
            <p className="text-sm">Add colleagues to collaborate together</p>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <div className="flex gap-3">
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
            >
              Skip
            </motion.button>
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
            >
              Continue
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// Preferences Step
const PreferencesStep = ({
  preferences,
  onUpdate,
  onNext,
  onBack,
}: {
  preferences: OnboardingData["preferences"];
  onUpdate: (data: Partial<OnboardingData["preferences"]>) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#23D3EE]/30"
          >
            <Settings size={32} className="text-[#23D3EE]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Personalize your workspace</h2>
          <p className="text-slate-500">Set up your preferences</p>
        </div>

        {/* Preferences Form */}
        <div className="space-y-6">
          {/* Theme Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Label className="text-sm font-medium text-[#0F172A] mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light", icon: Sun, label: "Light" },
                { id: "dark", icon: Moon, label: "Dark" },
                { id: "system", icon: Monitor, label: "System" },
              ].map((theme) => {
                const Icon = theme.icon;
                const isSelected = preferences.theme === theme.id;

                return (
                  <motion.button
                    key={theme.id}
                    onClick={() => onUpdate({ theme: theme.id as "light" | "dark" | "system" })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-4 rounded-xl border-2 text-center transition-all",
                      isSelected
                        ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5"
                        : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                    )}
                  >
                    <Icon size={24} className={cn(
                      "mx-auto mb-2",
                      isSelected ? "text-[#23D3EE]" : "text-slate-500"
                    )} />
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                    )}>
                      {theme.label}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Language and Timezone */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#0F172A]">Language</Label>
              <Select value={preferences.language} onValueChange={(value) => onUpdate({ language: value })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#0F172A]">Timezone</Label>
              <Select value={preferences.timezone} onValueChange={(value) => onUpdate({ timezone: value })}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="rounded-lg">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Default View */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Label className="text-sm font-medium text-[#0F172A] mb-3 block">Default View</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "list", icon: List, label: "List" },
                { id: "grid", icon: LayoutGrid, label: "Grid" },
                { id: "kanban", icon: Kanban, label: "Kanban" },
              ].map((view) => {
                const Icon = view.icon;
                const isSelected = preferences.defaultView === view.id;

                return (
                  <motion.button
                    key={view.id}
                    onClick={() => onUpdate({ defaultView: view.id as "list" | "grid" | "kanban" })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "p-4 rounded-xl border-2 text-center transition-all",
                      isSelected
                        ? "border-[#23D3EE] bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5"
                        : "border-slate-200 bg-white/50 hover:border-[#23D3EE]/50"
                    )}
                  >
                    <Icon size={24} className={cn(
                      "mx-auto mb-2",
                      isSelected ? "text-[#23D3EE]" : "text-slate-500"
                    )} />
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-[#23D3EE]" : "text-[#0F172A]"
                    )}>
                      {view.label}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Label className="text-sm font-medium text-[#0F172A] mb-3 block">Notifications</Label>
            <div className="space-y-3">
              {[
                { id: "email", icon: Mail, label: "Email Notifications", description: "Receive updates via email" },
                { id: "push", icon: Bell, label: "Push Notifications", description: "Browser push notifications" },
                { id: "desktop", icon: Monitor, label: "Desktop Notifications", description: "System notifications" },
              ].map((notification) => {
                const Icon = notification.icon;
                const key = notification.id as keyof typeof preferences.notifications;
                const isEnabled = preferences.notifications[key];

                return (
                  <motion.div
                    key={notification.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon size={18} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-[#0F172A]">{notification.label}</p>
                        <p className="text-sm text-slate-500">{notification.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        onUpdate({
                          notifications: { ...preferences.notifications, [key]: checked },
                        })
                      }
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-slate-600 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 hover:bg-white/80 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>
          <motion.button
            onClick={onNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-[#23D3EE] to-[#0F172A] rounded-xl shadow-lg shadow-[#23D3EE]/30 hover:shadow-xl transition-all"
          >
            Finish Setup
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      // Preferences Step (continued - closing tag)
      </GlassCard>
    </motion.div>
  );
};

// Complete Step - Celebration Screen
const CompleteStep = ({
  data,
  onFinish,
}: {
  data: OnboardingData;
  onFinish: () => void;
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const stats = [
    { label: "Goals Selected", value: data.goals.length, icon: Target },
    { label: "Features Enabled", value: data.features.length, icon: Zap },
    { label: "Integrations", value: data.integrations.length, icon: LinkIcon },
    { label: "Team Members", value: data.teamMembers.length, icon: Users },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto text-center py-8"
    >
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={["#23D3EE", "#0F172A", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981"]}
        />
      )}

      <GlassCard className="p-8 lg:p-12">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="relative w-32 h-32 mx-auto mb-8"
        >
          {/* Outer ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-[#23D3EE]/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-[#23D3EE]/20"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          
          {/* Trophy icon */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#23D3EE] to-[#0F172A] rounded-full flex items-center justify-center shadow-2xl shadow-[#23D3EE]/40"
            animate={{
              boxShadow: [
                "0 25px 50px -12px rgba(23, 195, 178, 0.4)",
                "0 25px 50px -12px rgba(23, 195, 178, 0.6)",
                "0 25px 50px -12px rgba(23, 195, 178, 0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Trophy size={56} className="text-white" />
            </motion.div>
          </motion.div>

          {/* Floating stars */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                y: [-20, -40],
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity,
              }}
            >
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4"
        >
          You're All Set! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-slate-600 mb-8 max-w-md mx-auto"
        >
          Your workspace is ready. Let's start building amazing relationships with your customers!
        </motion.p>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg"
              >
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE]/20 to-[#0F172A]/10 flex items-center justify-center mx-auto mb-2"
                  whileHover={{ rotate: 10 }}
                >
                  <Icon size={20} className="text-[#23D3EE]" />
                </motion.div>
                <motion.p
                  className="text-2xl font-bold text-[#0F172A]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1, type: "spring" }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Welcome Message Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="p-6 bg-gradient-to-br from-[#23D3EE]/10 to-[#0F172A]/5 rounded-2xl border border-[#23D3EE]/20 mb-8"
        >
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
              <AvatarImage src={data.profile.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#23D3EE] to-[#0F172A] text-white font-bold">
                {getInitials(data.profile.firstName, data.profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-[#0F172A]">
                Welcome, {data.profile.firstName}!
              </h3>
              <p className="text-sm text-slate-600">
                {data.company.name ? `${data.company.name} • ` : ""}
                {data.profile.jobTitle || "Team Member"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {data.goals.slice(0, 3).map((goalId) => {
                  const goal = goals.find((g) => g.id === goalId);
                  return goal ? (
                    <Badge
                      key={goalId}
                      variant="outline"
                      className="bg-white/50 text-[#0F172A] border-[#23D3EE]/30"
                    >
                      {goal.label}
                    </Badge>
                  ) : null;
                })}
                {data.goals.length > 3 && (
                  <Badge variant="outline" className="bg-white/50">
                    +{data.goals.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Start Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-10"
        >
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Quick Start
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Add Contacts", description: "Import your contacts" },
              { icon: Kanban, label: "Create Pipeline", description: "Set up sales stages" },
              { icon: PlayCircle, label: "Watch Tutorial", description: "Learn the basics" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 text-left hover:border-[#23D3EE]/50 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-[#23D3EE]" />
                  </div>
                  <p className="font-semibold text-[#0F172A]">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <motion.button
            onClick={onFinish}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-10 py-4 bg-gradient-to-r from-[#23D3EE] to-[#0F172A] text-white font-semibold rounded-2xl shadow-xl shadow-[#23D3EE]/30 overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative flex items-center gap-3 text-lg">
              <Rocket size={22} />
              Go to Dashboard
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight size={20} />
              </motion.span>
            </span>
          </motion.button>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center gap-6 mt-8 text-sm text-slate-500"
        >
          <button className="hover:text-[#23D3EE] transition-colors flex items-center gap-1">
            <BookOpen size={14} />
            Documentation
          </button>
          <button className="hover:text-[#23D3EE] transition-colors flex items-center gap-1">
            <Video size={14} />
            Video Tutorials
          </button>
          <button className="hover:text-[#23D3EE] transition-colors flex items-center gap-1">
            <MessageSquare size={14} />
            Get Support
          </button>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
};

// ============================================
// MAIN ONBOARDING COMPONENT
// ============================================

const Onboarding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Current step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");

  // Onboarding data state
  const [data, setData] = useState<OnboardingData>({
    profile: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      avatar: null,
      jobTitle: "",
      department: "",
    },
    company: {
      name: "",
      website: "",
      logo: null,
      address: "",
      city: "",
      country: "",
      industry: "",
      size: "",
    },
    teamSize: "",
    industry: "",
    goals: [],
    features: ["leads", "contacts", "tasks", "calendar"], // Default features
    integrations: [],
    teamMembers: [],
    preferences: {
      theme: "system",
      language: "en",
      timezone: "America/New_York",
      notifications: {
        email: true,
        push: true,
        desktop: false,
      },
      defaultView: "list",
    },
  });

  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (hasPrefilled.current) return;

    const safeJsonParse = <T,>(value: string | null): T | null => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    };

    const user = safeJsonParse<{
      firstName?: string;
      lastName?: string;
      email?: string;
    }>(localStorage.getItem("user"));

    const tenant = safeJsonParse<{ name?: string }>(
      localStorage.getItem("tenant")
    );

    const statePrefill = (location.state as any)?.prefill as
      | { fullName?: string; email?: string; company?: string }
      | undefined;

    const fullName = statePrefill?.fullName?.trim() || "";
    const fullNameParts = fullName.split(/\s+/).filter(Boolean);
    const stateFirstName = fullNameParts[0] || "";
    const stateLastName = fullNameParts.slice(1).join(" ");

    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        firstName: stateFirstName || user?.firstName || prev.profile.firstName,
        lastName: stateLastName || user?.lastName || prev.profile.lastName,
        email: statePrefill?.email || user?.email || prev.profile.email,
      },
      company: {
        ...prev.company,
        name: statePrefill?.company || tenant?.name || prev.company.name,
      },
      features: isOnboardingCompleted()
        ? (getStoredEnabledFeatures() ?? prev.features)
        : prev.features,
    }));

    hasPrefilled.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation functions
  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Update functions
  const updateProfile = (profileData: Partial<UserProfile>) => {
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profileData },
    }));
  };

  const updateCompany = (companyData: Partial<CompanyProfile>) => {
    setData((prev) => ({
      ...prev,
      company: { ...prev.company, ...companyData },
    }));
  };

  const setTeamSize = (size: string) => {
    setData((prev) => ({ ...prev, teamSize: size }));
  };

  const setIndustry = (industry: string) => {
    setData((prev) => ({ ...prev, industry }));
  };

  const toggleGoal = (goalId: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter((g) => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const toggleFeature = (featureId: string) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const toggleIntegration = (integrationId: string) => {
    setData((prev) => ({
      ...prev,
      integrations: prev.integrations.includes(integrationId)
        ? prev.integrations.filter((i) => i !== integrationId)
        : [...prev.integrations, integrationId],
    }));
  };

  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      email: "",
      role: "member",
      department: "",
    };
    setData((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember],
    }));
  };

  const removeTeamMember = (id: string) => {
    setData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
    }));
  };

  const updateTeamMember = (id: string, memberData: Partial<TeamMember>) => {
    setData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) =>
        m.id === id ? { ...m, ...memberData } : m
      ),
    }));
  };

  const updatePreferences = (prefsData: Partial<OnboardingData["preferences"]>) => {
    setData((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefsData },
    }));
  };

  // Finish onboarding
  const handleFinish = () => {
    // Persist onboarding state locally (backend persistence can be added later)
    try {
      const normalizedFeatures = normalizeEnabledFeatures(data.features);
      if (normalizedFeatures.length === 0) {
        toast({
          title: "Select at least one feature",
          description: "Choose the features you want to enable before continuing.",
          variant: "destructive",
        });
        return;
      }
      setEnabledFeatures(normalizedFeatures);
      setOnboardingCompleted(true);
      localStorage.setItem("onboardingData", JSON.stringify(data));

      // Keep local user/tenant in sync so header/sidebar reflect onboarding edits.
      const safeJsonParse = <T,>(value: string | null): T | null => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      };

      const storedUser = safeJsonParse<Record<string, unknown>>(
        localStorage.getItem("user")
      );
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(storedUser ?? {}),
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          email: data.profile.email,
          phone: data.profile.phone,
          jobTitle: data.profile.jobTitle,
          department: data.profile.department,
        })
      );

      const storedTenant = safeJsonParse<Record<string, unknown>>(
        localStorage.getItem("tenant")
      );
      localStorage.setItem(
        "tenant",
        JSON.stringify({
          ...(storedTenant ?? {}),
          name: data.company.name,
          website: data.company.website,
          industry: data.company.industry,
          size: data.company.size,
          address: data.company.address,
          city: data.company.city,
          country: data.company.country,
        })
      );
    } catch {
      // Local persistence is best-effort; don't block navigation.
    }

    // Show success toast
    toast({
      title: "Welcome to your CRM! 🎉",
      description: "Your workspace is ready. Let's get started!",
    });

    // Navigate to dashboard
    navigate("/dashboard");
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case "welcome":
        return <WelcomeStep onNext={goToNextStep} />;

      case "profile":
        return (
          <ProfileStep
            data={data.profile}
            onUpdate={updateProfile}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "company":
        return (
          <CompanyStep
            data={data.company}
            onUpdate={updateCompany}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "team-size":
        return (
          <TeamSizeStep
            selected={data.teamSize}
            onSelect={setTeamSize}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "industry":
        return (
          <IndustryStep
            selected={data.industry}
            onSelect={setIndustry}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "goals":
        return (
          <GoalsStep
            selected={data.goals}
            onToggle={toggleGoal}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "features":
        return (
          <FeaturesStep
            selected={data.features}
            onToggle={toggleFeature}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "integrations":
        return (
          <IntegrationsStep
            selected={data.integrations}
            onToggle={toggleIntegration}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "invite-team":
        return (
          <InviteTeamStep
            members={data.teamMembers}
            onAddMember={addTeamMember}
            onRemoveMember={removeTeamMember}
            onUpdateMember={updateTeamMember}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "preferences":
        return (
          <PreferencesStep
            preferences={data.preferences}
            onUpdate={updatePreferences}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case "complete":
        return <CompleteStep data={data} onFinish={handleFinish} />;

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground
          variant={currentStep === "complete" ? "celebration" : "default"}
        />

        {/* Main Content */}
        <div className="relative z-10 flex min-h-screen">
          {/* Desktop Sidebar Progress */}
          <ProgressIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Mobile Progress Bar */}
            <MobileProgressBar steps={steps} currentStep={currentStep} />

            {/* Step Content */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Skip Onboarding Link */}
            {currentStep !== "complete" && currentStep !== "welcome" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center pb-6"
              >
                <button
                  onClick={() => setCurrentStep("complete")}
                  className="text-sm text-slate-400 hover:text-[#23D3EE] transition-colors"
                >
                  Skip setup and go to dashboard →
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Onboarding;
