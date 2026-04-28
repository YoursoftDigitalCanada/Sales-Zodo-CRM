import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Check, ChevronDown, 
  BarChart3, Users, Layers, 
  Zap, MessageSquare, Shield, Menu, X,
  Star, Play, ArrowUp, Sparkles, Clock,
  TrendingUp, Target, Headphones, CheckCircle2,
  Mail, Phone, ChevronRight, Send, Loader2,
  Building2, Rocket, PieChart, Calendar, FileText,
  CreditCard, FolderOpen, Bell, Settings,
  UserPlus, Receipt, Kanban, LayoutDashboard,
  LineChart, DollarSign, Briefcase, Globe,
  Lock, RefreshCw, Smartphone, Monitor,
  Database, Cloud, Award, Heart, Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================
// 🍁 SHARED COMPONENTS (Same as Landing Page)
// ============================================

// Animated Counter Component
const AnimatedCounter = ({ 
  end, 
  duration = 2000, 
  suffix = '' 
}: { 
  end: number; 
  duration?: number; 
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <div ref={ref}>{count}{suffix}</div>;
};

// Button Component
const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  loading = false,
  icon,
  size = 'default'
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost' | 'gradient' | 'white'; 
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
}) => {
  const baseStyle = "rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-4 py-2 text-sm min-h-[36px]",
    default: "px-6 py-3 min-h-[48px]",
    lg: "px-4 py-3 sm:px-6 sm:py-4 lg:px-8 text-lg min-h-[56px]"
  };

  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0",
    secondary: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5",
    outline: "border-2 border-gray-200 text-gray-700 hover:border-red-600 hover:text-red-600 hover:bg-red-50 bg-transparent",
    text: "text-red-600 hover:text-red-800 hover:bg-red-50 p-0 min-h-0 px-2",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
    gradient: "bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5",
    white: "bg-white text-red-600 hover:bg-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

// Glass Card Component
const GlassCard = ({ 
  children, 
  className = '',
  hover = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) => (
  <div className={`
    bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl
    ${hover ? 'hover:shadow-2xl hover:-translate-y-1 transition-all duration-300' : ''}
    ${className}
  `}>
    {children}
  </div>
);

// Section Container
const Section = ({ 
  children, 
  className = "", 
  id = "",
  dark = false,
  pattern = false
}: { 
  children: React.ReactNode; 
  className?: string; 
  id?: string;
  dark?: boolean;
  pattern?: boolean;
}) => (
  <section 
    id={id} 
    className={`
      py-20 md:py-32 px-6 relative overflow-hidden
      ${dark ? 'bg-gray-900 text-white' : 'bg-white'}
      ${className}
    `}
  >
    {pattern && (
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
    )}
    
    <div className="max-w-[1200px] mx-auto relative z-10">
      {children}
    </div>
  </section>
);

// Section Header
const SectionHeader = ({ 
  badge,
  title, 
  subtitle,
  centered = true,
  light = false
}: { 
  badge?: string;
  title: string; 
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}) => (
  <div className={`mb-16 ${centered ? 'text-center max-w-3xl mx-auto' : ''}`}>
    {badge && (
      <span className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6
        ${light 
          ? 'bg-white/10 text-white/90' 
          : 'bg-red-50 text-red-600'
        }
      `}>
        <Sparkles size={14} />
        {badge}
      </span>
    )}
    <h2 className={`text-4xl md:text-5xl font-bold mb-6 leading-tight ${light ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`text-lg md:text-xl ${light ? 'text-gray-300' : 'text-gray-500'}`}>
        {subtitle}
      </p>
    )}
  </div>
);

// Back to Top Button
const BackToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`
        fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full 
        bg-red-600 text-white shadow-lg shadow-red-500/30
        flex items-center justify-center
        hover:bg-red-700 hover:shadow-xl hover:-translate-y-1
        transition-all duration-300
        ${show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
      `}
    >
      <ArrowUp size={20} />
    </button>
  );
};

// FAQ Item
const FAQItem = ({ 
  question, 
  answer, 
  isOpen, 
  onToggle 
}: { 
  question: string; 
  answer: string; 
  isOpen: boolean; 
  onToggle: () => void;
}) => (
  <div className="border-b border-gray-100 last:border-0">
    <button 
      onClick={onToggle}
      className="w-full py-6 flex items-center justify-between text-left group"
    >
      <span className="font-semibold text-lg text-gray-900 group-hover:text-red-600 transition-colors pr-8">
        {question}
      </span>
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
        ${isOpen ? 'bg-red-600 text-white rotate-180' : 'bg-gray-100 text-gray-500 group-hover:bg-red-50 group-hover:text-red-600'}
      `}>
        <ChevronDown size={20} />
      </div>
    </button>
    <div className={`
      overflow-hidden transition-all duration-300
      ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}
    `}>
      <p className="text-gray-500 leading-relaxed">{answer}</p>
    </div>
  </div>
);

// ============================================
// 🏠 CRM PAGE MAIN COMPONENT
// ============================================

export default function CRMPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==========================================
  // NAVBAR
  // ==========================================
  const Navbar = () => (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${isScrolled 
        ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-gray-900/5' 
        : 'bg-transparent'
      }
    `}>
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <Layers size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Yoursoft<span className="text-red-600">CRM</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-red-600 font-medium transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-red-600 font-medium transition-colors">Pricing</a>
            <a href="#testimonials" className="text-gray-600 hover:text-red-600 font-medium transition-colors">Reviews</a>
            <a href="#faq" className="text-gray-600 hover:text-red-600 font-medium transition-colors">FAQ</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Start Free Trial
              <ArrowRight size={16} />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t shadow-xl p-6 space-y-4">
            <a href="#features" className="block py-2 text-gray-600 hover:text-red-600 font-medium">Features</a>
            <a href="#pricing" className="block py-2 text-gray-600 hover:text-red-600 font-medium">Pricing</a>
            <a href="#testimonials" className="block py-2 text-gray-600 hover:text-red-600 font-medium">Reviews</a>
            <a href="#faq" className="block py-2 text-gray-600 hover:text-red-600 font-medium">FAQ</a>
            <hr className="my-4" />
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button className="w-full" onClick={() => navigate('/signup')}>
              Start Free Trial
            </Button>
          </div>
        )}
      </div>
    </nav>
  );

  // ==========================================
  // HERO SECTION
  // ==========================================
  const Hero = () => (
    <div className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-red-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(to right, #DC2626 1px, transparent 1px), linear-gradient(to bottom, #DC2626 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm mb-8">
              <span className="text-lg">🍁</span>
              <span className="text-sm font-medium text-gray-600">Built for Canadian Businesses</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">NEW</span>
            </div>
            
            {/* Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6">
              The All-in-One
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-orange-500">
                CRM Platform
              </span>
            </h1>
            
            <p className="text-xl text-gray-500 mb-8 leading-relaxed">
              Manage clients, track projects, send invoices, and grow your business — all from one powerful dashboard.
            </p>
            
            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <Button variant="gradient" size="lg" onClick={() => navigate('/signup')}>
                Start 14-Day Free Trial
                <ArrowRight size={20} />
              </Button>
              <Button variant="outline" size="lg">
                <Play size={20} className="fill-red-600 text-red-600" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
          
          {/* Right - Dashboard Preview */}
          <div className="lg:w-1/2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 rounded-3xl opacity-20 blur-2xl" />
              
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                {/* Browser Header */}
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-700 rounded-lg px-4 py-1.5 text-gray-400 text-sm max-w-md mx-auto">
                      crm.yoursoftdigital.ca/dashboard
                    </div>
                  </div>
                </div>
                
                {/* Dashboard */}
                <div className="p-6 space-y-4">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {[
                      { label: 'Revenue', value: '$124.5K', change: '+18%', icon: DollarSign },
                      { label: 'Active Clients', value: '847', change: '+12%', icon: Users },
                      { label: 'Projects', value: '34', change: '+5', icon: Briefcase },
                    ].map((stat, i) => (
                      <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <stat.icon size={16} className="text-gray-400" />
                          <span className="text-xs text-green-400">{stat.change}</span>
                        </div>
                        <div className="text-white text-xl font-bold">{stat.value}</div>
                        <div className="text-gray-500 text-xs">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-4">Revenue Overview</div>
                    <div className="h-32 flex items-end gap-2">
                      {[40, 55, 35, 70, 45, 80, 60, 90, 50, 75, 65, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-red-600 to-orange-500 rounded-t transition-all hover:opacity-80" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent Activity */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-3">Recent Activity</div>
                    <div className="space-y-3">
                      {[
                        { action: 'Invoice #1234 paid', time: '2 min ago', icon: Receipt },
                        { action: 'New client added', time: '1 hour ago', icon: UserPlus },
                        { action: 'Project completed', time: '3 hours ago', icon: CheckCircle2 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                            <item.icon size={14} className="text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm">{item.action}</div>
                            <div className="text-gray-500 text-xs">{item.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Stats Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp size={24} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">+127%</div>
                    <div className="text-sm text-gray-500">Revenue Growth</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TRUSTED BY SECTION
  // ==========================================
  const TrustedBy = () => (
    <Section className="!py-16 bg-gray-50">
      <div className="text-center mb-8">
        <p className="text-gray-500 font-medium">Trusted by 500+ Canadian companies</p>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
        {['Shopify', 'RBC', 'TD Bank', 'Bell', 'Rogers', 'Lululemon'].map((brand) => (
          <span key={brand} className="text-xl sm:text-2xl font-bold text-gray-600">{brand}</span>
        ))}
      </div>
    </Section>
  );

  // ==========================================
  // FEATURES SECTION
  // ==========================================
  const Features = () => {
    const features = [
      {
        icon: Users,
        title: "Client Management",
        description: "Organize all your clients in one place. Track interactions, store documents, and never miss a follow-up.",
        color: "red"
      },
      {
        icon: Kanban,
        title: "Project Tracking",
        description: "Kanban boards, timelines, and milestones to keep every project on track and your team aligned.",
        color: "orange"
      },
      {
        icon: Receipt,
        title: "Invoicing & Payments",
        description: "Create professional invoices, accept online payments, and automate recurring billing.",
        color: "rose"
      },
      {
        icon: LineChart,
        title: "Analytics Dashboard",
        description: "Real-time insights into revenue, client acquisition, and business performance.",
        color: "green"
      },
      {
        icon: FolderOpen,
        title: "File Management",
        description: "Secure cloud storage for contracts, proposals, and client documents with easy sharing.",
        color: "blue"
      },
      {
        icon: Bell,
        title: "Smart Notifications",
        description: "Automated reminders for follow-ups, payment due dates, and project deadlines.",
        color: "purple"
      },
      {
        icon: Users,
        title: "Team Collaboration",
        description: "Assign tasks, manage roles, and keep your entire team on the same page.",
        color: "indigo"
      },
      {
        icon: Bot,
        title: "AI Assistant",
        description: "Get intelligent suggestions, automate data entry, and save hours of manual work.",
        color: "pink"
      }
    ];

    const colorClasses: Record<string, string> = {
      red: "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white",
      orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
      rose: "bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
      green: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white",
      blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      indigo: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
      pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white",
    };

    return (
      <Section id="features" pattern>
        <SectionHeader 
          badge="Features"
          title="Everything You Need to Run Your Business"
          subtitle="A complete toolkit designed to help you manage clients, projects, and revenue effortlessly."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${colorClasses[feature.color]}`}>
                <feature.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Section>
    );
  };

  // ==========================================
  // FEATURE TABS SECTION
  // ==========================================
  const FeatureTabs = () => {
    const tabs = [
      {
        id: 0,
        icon: LayoutDashboard,
        title: "Dashboard",
        heading: "Your Business at a Glance",
        description: "Get a real-time overview of your entire business. Track revenue, monitor projects, and stay on top of tasks — all from one intuitive dashboard.",
        features: ["Real-time metrics", "Custom widgets", "Activity feed", "Quick actions"],
        image: "dashboard"
      },
      {
        id: 1,
        icon: Users,
        title: "Clients",
        heading: "Manage Client Relationships",
        description: "Keep all client information organized. Store contacts, track communication history, and never miss an opportunity to strengthen relationships.",
        features: ["Client profiles", "Communication logs", "Custom fields", "Tags & segments"],
        image: "clients"
      },
      {
        id: 2,
        icon: Kanban,
        title: "Projects",
        heading: "Track Every Project",
        description: "From kickoff to delivery, manage projects with ease. Use Kanban boards, set milestones, and keep your team aligned on priorities.",
        features: ["Kanban boards", "Time tracking", "Milestones", "Team assignments"],
        image: "projects"
      },
      {
        id: 3,
        icon: Receipt,
        title: "Invoices",
        heading: "Get Paid Faster",
        description: "Create professional invoices in seconds. Accept online payments, set up recurring billing, and automate payment reminders.",
        features: ["Invoice templates", "Online payments", "Recurring billing", "Payment tracking"],
        image: "invoices"
      }
    ];

    const activeTabData = tabs[activeTab];

    return (
      <Section className="bg-gray-900" dark>
        <SectionHeader 
          badge="Product Tour"
          title="See How It Works"
          subtitle="Explore the powerful features that will transform how you run your business."
          light
        />
        
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Tab Buttons */}
          <div className="lg:w-1/3 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4
                  ${activeTab === tab.id 
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-700'}`}>
                  <tab.icon size={20} />
                </div>
                <span className="font-semibold">{tab.title}</span>
                <ChevronRight size={18} className="ml-auto" />
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="lg:w-2/3">
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">{activeTabData.heading}</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">{activeTabData.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {activeTabData.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 size={16} className="text-green-400" />
                    {feature}
                  </div>
                ))}
              </div>
              
              {/* Mock Screenshot */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <activeTabData.icon size={48} className="text-red-500 mx-auto mb-4" />
                    <p className="text-gray-500">{activeTabData.title} Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  };

  // ==========================================
  // STATS SECTION
  // ==========================================
  const Stats = () => (
    <Section className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 !py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
        {[
          { value: 500, suffix: '+', label: 'Happy Clients' },
          { value: 2, suffix: 'M+', label: 'Invoices Sent' },
          { value: 98, suffix: '%', label: 'Client Retention' },
          { value: 24, suffix: '/7', label: 'Support' },
        ].map((stat, i) => (
          <div key={i}>
            <div className="text-4xl md:text-5xl font-bold mb-2">
              <AnimatedCounter end={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-white/80">{stat.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  // ==========================================
  // PRICING SECTION
  // ==========================================
  const Pricing = () => {
    const plans = [
      {
        name: "Starter",
        description: "Perfect for freelancers and solo entrepreneurs",
        monthlyPrice: "$149",
        yearlyPrice: "$1609",
        yearlyOriginalPrice: "$1788",
        features: [
          "Up to 100 clients",
          "Unlimited projects",
          "Basic invoicing",
          "5GB file storage",
          "Email support"
        ],
        popular: false,
        cta: "Start Free Trial"
      },
      {
        name: "Professional",
        description: "Ideal for growing agencies and teams",
        monthlyPrice: "$249",
        yearlyPrice: "$2689",
        yearlyOriginalPrice: "$2988",
        features: [
          "Unlimited clients",
          "Unlimited projects",
          "Advanced invoicing & payments",
          "50GB file storage",
          "Team collaboration (5 users)",
          "Priority support",
          "Custom branding"
        ],
        popular: true,
        cta: "Start Free Trial"
      },
      {
        name: "Enterprise",
        description: "For large organizations with custom needs",
        monthlyPrice: "$399",
        yearlyPrice: "$4309",
        yearlyOriginalPrice: "$4788",
        features: [
          "Everything in Professional",
          "Unlimited team members",
          "Unlimited storage",
          "Dedicated account manager",
          "Custom integrations",
          "SLA & uptime guarantee",
          "On-premise deployment"
        ],
        popular: false,
        cta: "Contact Sales"
      }
    ];

    return (
      <Section id="pricing" className="bg-gray-50" pattern>
        <SectionHeader 
          badge="Pricing"
          title="Simple, Transparent Pricing"
          subtitle="Choose the plan that fits your business. All plans include a 14-day free trial."
        />
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-14 h-8 bg-gray-200 rounded-full transition-colors"
          >
            <div className={`absolute top-1 w-6 h-6 bg-red-600 rounded-full transition-all ${billingCycle === 'yearly' ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Yearly
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Save 10%</span>
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i}
              className={`
                relative p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2
                ${plan.popular 
                  ? 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-2xl shadow-red-500/30 scale-105' 
                  : 'bg-white border border-gray-200 hover:border-red-200 hover:shadow-xl'
                }
              `}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-full shadow-lg">
                  🍁 Most Popular
                </span>
              )}
              
              <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-red-200' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              
              <div className="mb-6">
                {billingCycle === 'yearly' ? (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <span className={`text-lg font-medium line-through ${plan.popular ? 'text-red-200/80' : 'text-gray-400'}`}>
                        {plan.yearlyOriginalPrice}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${plan.popular ? 'bg-white/15 text-white' : 'bg-green-100 text-green-700'}`}>
                        10% OFF
                      </span>
                    </div>
                    <div>
                      <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.yearlyPrice}
                      </span>
                      <span className={plan.popular ? 'text-red-200' : 'text-gray-500'}>/year</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.monthlyPrice}
                    </span>
                    <span className={plan.popular ? 'text-red-200' : 'text-gray-500'}>/month</span>
                  </div>
                )}
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <CheckCircle2 size={20} className={plan.popular ? 'text-green-300 flex-shrink-0' : 'text-green-500 flex-shrink-0'} />
                    <span className={plan.popular ? 'text-red-100' : 'text-gray-600'}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                variant={plan.popular ? 'white' : 'outline'} 
                className="w-full"
                onClick={() => navigate('/signup')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </Section>
    );
  };

  // ==========================================
  // TESTIMONIALS SECTION
  // ==========================================
  const Testimonials = () => {
    const testimonials = [
      {
        quote: "Yoursoft CRM transformed how we manage our agency. We've increased revenue by 40% in just 6 months.",
        author: "Sarah Chen",
        role: "Founder",
        company: "Maple Marketing Co",
        rating: 5
      },
      {
        quote: "The invoicing feature alone has saved us 10 hours per week. Best decision we made for our business.",
        author: "Michael Roberts",
        role: "CEO",
        company: "Northern Tech Solutions",
        rating: 5
      },
      {
        quote: "Finally, a CRM built for Canadian businesses. The support team is incredible and truly understands our needs.",
        author: "Emily Thompson",
        role: "Operations Director",
        company: "Vancouver Creative",
        rating: 5
      }
    ];

    return (
      <Section id="testimonials">
        <SectionHeader 
          badge="Testimonials"
          title="Loved by Canadian Businesses"
          subtitle="See what our customers have to say about Yoursoft CRM."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <GlassCard key={i} className="p-4 sm:p-6 lg:p-8">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} size={18} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-lg mb-6 italic">"{testimonial.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role} at {testimonial.company}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </Section>
    );
  };

  // ==========================================
  // INTEGRATIONS SECTION
  // ==========================================
  const Integrations = () => {
    const integrations = [
      { name: 'Slack', icon: '💬', category: 'Communication' },
      { name: 'Zapier', icon: '⚡', category: 'Automation' },
      { name: 'Stripe', icon: '💳', category: 'Payments' },
      { name: 'QuickBooks', icon: '📊', category: 'Accounting' },
      { name: 'Google Drive', icon: '📁', category: 'Storage' },
      { name: 'Mailchimp', icon: '📧', category: 'Marketing' },
      { name: 'Calendly', icon: '📅', category: 'Scheduling' },
      { name: 'Zoom', icon: '🎥', category: 'Meetings' },
    ];

    return (
      <Section className="bg-gray-50" pattern>
        <SectionHeader 
          badge="Integrations"
          title="Works With Your Favorite Tools"
          subtitle="Connect Yoursoft CRM with the apps you already use to streamline your workflow."
        />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {integrations.map((integration, i) => (
            <div 
              key={i}
              className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-300 group text-center"
            >
              <div className="text-4xl mb-3">{integration.icon}</div>
              <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                {integration.name}
              </div>
              <div className="text-sm text-gray-500">{integration.category}</div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button variant="outline">
            View All Integrations
            <ArrowRight size={16} />
          </Button>
        </div>
      </Section>
    );
  };

  // ==========================================
  // FAQ SECTION
  // ==========================================
  const FAQ = () => {
    const faqs = [
      {
        question: "How long is the free trial?",
        answer: "We offer a 14-day free trial with full access to all features. No credit card required to start."
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees."
      },
      {
        question: "Is my data secure?",
        answer: "Absolutely. We use bank-level encryption, SOC 2 compliance, and offer Canadian data residency options to keep your data safe."
      },
      {
        question: "Do you offer custom enterprise solutions?",
        answer: "Yes, our Enterprise plan includes custom integrations, dedicated support, and on-premise deployment options. Contact our sales team for details."
      },
      {
        question: "Can I import data from other CRMs?",
        answer: "Yes, we offer free migration assistance to help you import data from other CRMs like Salesforce, HubSpot, and more."
      },
      {
        question: "What kind of support do you offer?",
        answer: "We offer email support for all plans, priority support for Professional plans, and dedicated account managers for Enterprise customers."
      }
    ];

    return (
      <Section id="faq">
        <SectionHeader 
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about Yoursoft CRM."
        />
        
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {faqs.map((faq, i) => (
            <FAQItem 
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={activeFAQ === i}
              onToggle={() => setActiveFAQ(activeFAQ === i ? null : i)}
            />
          ))}
        </div>
      </Section>
    );
  };

  // ==========================================
  // CTA SECTION
  // ==========================================
  const CTA = () => (
    <Section className="!py-0 !px-6">
      <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-5xl mb-6 block">🍁</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-red-100 mb-10">
            Join 500+ Canadian businesses using Yoursoft CRM to grow faster.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="white" size="lg" onClick={() => navigate('/signup')}>
              Start Your Free Trial
              <ArrowRight size={20} />
            </Button>
            <Button className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/20" size="lg">
              <Phone size={20} />
              Talk to Sales
            </Button>
          </div>
          
          <p className="text-red-200 text-sm mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // FOOTER
  // ==========================================
  const Footer = () => (
    <footer className="bg-gray-900 text-white pt-20 pb-8 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Layers size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold">
                Yoursoft<span className="text-red-500">CRM</span>
              </span>
            </div>
            <p className="text-gray-400 mb-6 max-w-xs">
              The all-in-one CRM platform built for Canadian businesses.
            </p>
            <div className="flex gap-4">
              {['twitter', 'linkedin', 'github'].map((social) => (
                <a key={social} href="#" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Globe size={18} />
                </a>
              ))}
            </div>
          </div>
          
          {/* Links */}
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Roadmap'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Support', links: ['Help Center', 'Documentation', 'API', 'Status'] },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-bold mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2024 Yoursoft Digital. All rights reserved. Made with 🍁 in Canada.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <FeatureTabs />
      <Stats />
      <Pricing />
      <Testimonials />
      <Integrations />
      <FAQ />
      <CTA />
      <Footer />
      <BackToTop />
    </div>
  );
}
