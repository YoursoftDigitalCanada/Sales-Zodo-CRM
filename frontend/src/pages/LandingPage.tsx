import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Check, ChevronDown, ChevronUp, 
  Code, BarChart3, Bot, Users, Layers, 
  Zap, MessageSquare, Shield, User, Menu, X, Globe,
  Star, Play, ArrowUp, Sparkles, Clock, Award,
  TrendingUp, Target, Headphones, CheckCircle2,
  Mail, Phone, MapPin, Linkedin, Twitter, Github,
  ChevronRight, ExternalLink, Send, Loader2,
  Building2, Rocket, PieChart, Calendar, FileText,
  MousePointer, Heart, Coffee, Briefcase,RefreshCw,  Smartphone as AppleIcon 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================
// 🍁 DESIGN SYSTEM - BALANCED RED + NEUTRAL
// ============================================

// Color Strategy:
// - Red (50%): Primary CTAs, key accents, featured elements, some icons
// - Slate/Gray (50%): Backgrounds, secondary elements, text, borders

// ============================================
// 🧩 COMPONENTS
// ============================================

// Animated Counter
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

// Button - No Gradients, Balanced Colors
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
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost' | 'dark' | 'white'; 
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
}) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  // No gradients - flat colors only
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    outline: "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 bg-white",
    text: "text-red-600 hover:text-red-700 hover:bg-red-50",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    dark: "bg-white text-slate-900 hover:bg-slate-100 shadow-sm",
    white: "bg-white text-red-600 hover:bg-slate-50 shadow-sm"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

// Card Component
const Card = ({ 
  children, 
  className = '',
  hover = true,
  padding = true
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  padding?: boolean;
}) => (
  <div className={`
    bg-white border border-slate-200 rounded-xl
    ${hover ? 'hover:shadow-lg hover:border-slate-300 transition-all duration-200' : 'shadow-sm'}
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

// Feature Card - Balanced Red Accent
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description,
  accentRed = false,
  delay = 0
}: { 
  icon: any; 
  title: string; 
  description: string;
  accentRed?: boolean;
  delay?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div 
      ref={ref}
      className={`
        group bg-white p-6 rounded-xl border border-slate-200 
        hover:border-slate-300 hover:shadow-lg transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`
        w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200
        ${accentRed 
          ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' 
          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'
        }
      `}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

// Section Container
const Section = ({ 
  children, 
  className = "", 
  id = "",
  dark = false,
  gray = false,
  red = false
}: { 
  children: React.ReactNode; 
  className?: string; 
  id?: string;
  dark?: boolean;
  gray?: boolean;
  red?: boolean;
}) => (
  <section 
    id={id} 
    className={`
      py-16 md:py-24 px-6
      ${dark ? 'bg-slate-900 text-white' : ''}
      ${gray ? 'bg-slate-50' : ''}
      ${red ? 'bg-red-600 text-white' : ''}
      ${!dark && !gray && !red ? 'bg-white' : ''}
      ${className}
    `}
  >
    <div className="max-w-6xl mx-auto">
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
  light = false,
  redBadge = false
}: { 
  badge?: string;
  title: string; 
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
  redBadge?: boolean;
}) => (
  <div className={`mb-12 ${centered ? 'text-center max-w-2xl mx-auto' : ''}`}>
    {badge && (
      <span className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4
        ${light 
          ? 'bg-white/20 text-white' 
          : redBadge 
            ? 'bg-red-100 text-red-600'
            : 'bg-slate-100 text-slate-600'
        }
      `}>
        {badge}
      </span>
    )}
    <h2 className={`text-3xl md:text-4xl font-semibold mb-4 leading-tight ${light ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`text-base md:text-lg ${light ? 'text-white/80' : 'text-slate-500'}`}>
        {subtitle}
      </p>
    )}
  </div>
);

// Testimonial Card
const TestimonialCard = ({ 
  quote, 
  author, 
  role, 
  company,
  rating = 5
}: { 
  quote: string; 
  author: string; 
  role: string; 
  company: string;
  rating?: number;
}) => (
  <Card className="h-full flex flex-col">
    <div className="flex gap-0.5 mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
    <p className="text-slate-600 mb-6 flex-1 leading-relaxed">"{quote}"</p>
    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-medium text-sm">
        {author.charAt(0)}
      </div>
      <div>
        <div className="font-medium text-slate-900 text-sm">{author}</div>
        <div className="text-xs text-slate-500">{role}, {company}</div>
      </div>
    </div>
  </Card>
);

// Pricing Card
const PricingCard = ({ 
  name, 
  price, 
  period = '/month',
  description, 
  features, 
  popular = false,
  cta = 'Get Started'
}: { 
  name: string; 
  price: string; 
  period?: string;
  description: string; 
  features: string[];
  popular?: boolean;
  cta?: string;
}) => (
  <div className={`
    relative p-6 rounded-xl transition-all duration-200
    ${popular 
      ? 'bg-red-600 text-white shadow-xl ring-2 ring-red-600' 
      : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg'
    }
  `}>
    {popular && (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded-full">
        Most Popular
      </span>
    )}
    
    <h3 className={`text-lg font-semibold mb-1 ${popular ? 'text-white' : 'text-slate-900'}`}>{name}</h3>
    <p className={`text-sm mb-4 ${popular ? 'text-red-100' : 'text-slate-500'}`}>{description}</p>
    
    <div className="mb-6">
      <span className={`text-4xl font-semibold ${popular ? 'text-white' : 'text-slate-900'}`}>{price}</span>
      <span className={`text-sm ${popular ? 'text-red-100' : 'text-slate-500'}`}>{period}</span>
    </div>
    
    <ul className="space-y-3 mb-6">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <Check size={16} className={`mt-0.5 flex-shrink-0 ${popular ? 'text-white' : 'text-green-600'}`} />
          <span className={popular ? 'text-red-50' : 'text-slate-600'}>{feature}</span>
        </li>
      ))}
    </ul>
    
    <Button 
      variant={popular ? 'white' : 'outline'} 
      className="w-full"
    >
      {cta}
    </Button>
  </div>
);

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
  <div className="border-b border-slate-100 last:border-0">
    <button 
      onClick={onToggle}
      className="w-full py-5 flex items-center justify-between text-left group"
    >
      <span className="font-medium text-slate-900 group-hover:text-red-600 transition-colors pr-4">
        {question}
      </span>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
        ${isOpen ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}
      `}>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
    </button>
    <div className={`
      overflow-hidden transition-all duration-200
      ${isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}
    `}>
      <p className="text-slate-500 text-sm leading-relaxed">{answer}</p>
    </div>
  </div>
);

// Back to Top - Red Accent
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
        fixed bottom-6 right-6 z-50 w-10 h-10 rounded-lg 
        bg-red-600 text-white shadow-lg
        flex items-center justify-center
        hover:bg-red-700 transition-all duration-200
        ${show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
      `}
    >
      <ArrowUp size={18} />
    </button>
  );
};

// Announcement Banner
const AnnouncementBanner = ({ onClose }: { onClose: () => void }) => (
  <div className="bg-red-600 text-white py-2.5 px-6">
    <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-sm">
      <span>🍁</span>
      <span>New: AI Chatbot 2.0 is here with advanced features</span>
      <a href="#" className="underline font-medium hover:no-underline">Learn more →</a>
      <button onClick={onClose} className="ml-4 hover:opacity-70 transition-opacity">
        <X size={14} />
      </button>
    </div>
  </div>
);

// ============================================
// 🏠 MAIN LANDING PAGE
// ============================================

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(0);
  const [showBanner, setShowBanner] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation handler
  const handleNavClick = (e: React.MouseEvent, item: { href: string; isRoute: boolean }) => {
    e.preventDefault();
    if (item.isRoute) {
      navigate(item.href);
    } else {
      const element = document.querySelector(item.href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  // ==========================================
  // NAVBAR
  // ==========================================
  const Navbar = () => {
    const navItems = [
      { label: 'Services', href: '/ServicesPage', isRoute: true },
      { label: 'CRM', href: '/crm', isRoute: true },
      { label: 'AI Chatbot', href: '#chatbot', isRoute: false },
      { label: 'Pricing', href: '#pricing', isRoute: false },
    ];

    return (
      <nav className={`fixed w-full z-50 transition-all duration-200 ${
        isScrolled 
          ? 'bg-white shadow-sm border-b border-slate-100' 
          : 'bg-transparent'
      }`}>
        {showBanner && !isScrolled && <AnnouncementBanner onClose={() => setShowBanner(false)} />}
        
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Layers className="text-white" size={18} />
            </div>
            <span className="font-semibold text-slate-900">Yoursoft</span>
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">CA</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map(item => (
              <a 
                key={item.label} 
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className="text-sm text-slate-600 hover:text-red-600 transition-colors"
              >
                {item.label}
              </a>
            ))}
            
            {/* Dropdown */}
            <div className="relative group">
              <button className="text-sm text-slate-600 hover:text-red-600 flex items-center gap-1 transition-colors">
                Resources
                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>
              
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-white rounded-lg shadow-lg border border-slate-200 py-2 min-w-[160px]">
                  {['Blog', 'Documentation', 'Help Center', 'API Reference'].map(item => (
                    <a 
                      key={item} 
                      href="#" 
                      className="block px-4 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/signup')}>
              Get Started
              <ArrowRight size={14} />
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="px-6 py-4 space-y-1">
              {navItems.map(item => (
                <a 
                  key={item.label} 
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className="block py-2.5 text-slate-600 hover:text-red-600 text-sm"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 space-y-2 border-t border-slate-100 mt-4">
                <Button variant="outline" className="w-full" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button className="w-full" size="sm" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  };

  // ==========================================
  // HERO
  // ==========================================
  const Hero = () => (
    <div className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden bg-slate-50">
      {/* Subtle Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left - Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm mb-6">
              <div className="flex -space-x-1.5">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-6 h-6 rounded-full border-2 border-white bg-red-100 flex items-center justify-center text-[10px] font-medium text-red-600"
                  >
                    {['S', 'M', 'A'][i]}
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-600">
                Trusted by <span className="font-semibold text-red-600">500+</span> companies
              </span>
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 leading-[1.15] mb-5">
              Build. Manage. Automate.
              <span className="block mt-2 text-red-600">
                All in One Platform
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg text-slate-500 mb-8 max-w-md leading-relaxed">
              The complete ecosystem for Canadian businesses. Custom development, powerful CRM, and 24/7 AI automation.
            </p>
            
            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Free Trial
                <ArrowRight size={16} />
              </Button>
              <Button variant="outline" size="lg">
                <Play size={16} className="text-red-600" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={16} className="text-green-600" />
                <span>PIPEDA Compliant</span>
              </div>
            </div>
          </div>
          
          {/* Right - Dashboard Preview */}
          <div className="relative">
            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Browser Header */}
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-white rounded px-3 py-1 text-slate-400 text-xs border border-slate-200 max-w-[200px]">
                    app.yoursoftdigital.ca
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-5 bg-slate-50">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Revenue', value: '$48.5K', change: '+12%' },
                    { label: 'Leads', value: '2,847', change: '+8%' },
                    { label: 'Conversion', value: '24%', change: '+4%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                      <div className="text-slate-400 text-xs mb-1">{stat.label}</div>
                      <div className="text-slate-900 text-lg font-semibold">{stat.value}</div>
                      <div className="text-green-600 text-xs">{stat.change}</div>
                    </div>
                  ))}
                </div>
                
                {/* Chart */}
                <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
                  <div className="text-sm font-medium text-slate-700 mb-3">Revenue Overview</div>
                  <div className="h-24 flex items-end gap-1">
                    {[35, 45, 30, 60, 45, 55, 70, 50, 65, 55, 80, 70].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-red-600 rounded-sm hover:bg-red-700 transition-colors cursor-pointer" 
                        style={{ height: `${h}%` }} 
                      />
                    ))}
                  </div>
                </div>
                
                {/* Activity */}
                <div className="bg-white rounded-lg p-4 border border-slate-100">
                  <div className="text-sm font-medium text-slate-700 mb-3">Recent Activity</div>
                  <div className="space-y-2">
                    {[
                      { name: 'New lead from Toronto', time: '2m ago' },
                      { name: 'Invoice #1234 paid', time: '15m ago' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="text-slate-400 text-xs">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Card - Growth */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">+127%</div>
                  <div className="text-xs text-slate-500">Growth Rate</div>
                </div>
              </div>
            </div>
            
            {/* Floating Card - AI Bot */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Bot size={16} className="text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">AI Active</div>
                  <div className="text-xs text-green-600">Online 24/7</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Logos */}
        <div className="mt-16 pt-10 border-t border-slate-200">
          <p className="text-center text-xs text-slate-400 mb-6 uppercase tracking-wider font-medium">
            Trusted by leading Canadian companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['Shopify', 'RBC', 'TD Bank', 'Air Canada', 'Lululemon'].map((brand) => (
              <span 
                key={brand} 
                className="text-lg font-semibold text-slate-300 hover:text-slate-400 transition-colors"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STATS - Red Background
  // ==========================================
  const StatsCounter = () => (
    <Section className="!py-12" red>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: 500, suffix: '+', label: 'Happy Clients' },
          { value: 98, suffix: '%', label: 'Client Retention' },
          { value: 50, suffix: 'M+', label: 'Messages Handled' },
          { value: 24, suffix: '/7', label: 'Support Available' },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl md:text-4xl font-semibold text-white mb-1">
              <AnimatedCounter end={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-red-100 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  // ==========================================
  // AUDIENCE
  // ==========================================
  const Audience = () => (
    <Section gray>
      <SectionHeader 
        badge="Who We Help"
        title="Built for Growth-Focused Teams"
        subtitle="From startups to enterprises, we help Canadian businesses scale efficiently."
        redBadge
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Rocket, title: "Startups", text: "Launch fast with MVP development and growth tools.", red: true },
          { icon: Briefcase, title: "Agencies", text: "Manage clients, projects & invoices seamlessly.", red: false },
          { icon: Building2, title: "Enterprises", text: "Scalable custom software ecosystems.", red: true },
          { icon: Code, title: "SaaS Founders", text: "Accelerate product-market fit with AI.", red: false },
        ].map((item, idx) => (
          <FeatureCard 
            key={idx} 
            icon={item.icon} 
            title={item.title} 
            description={item.text}
            accentRed={item.red}
            delay={idx * 50}
          />
        ))}
      </div>
    </Section>
  );

  // ==========================================
  // CORE OFFERINGS
  // ==========================================
  const CoreOfferings = () => (
    <Section id="services">
      <SectionHeader 
        badge="Our Solutions"
        title="Three Pillars of Business Growth"
        subtitle="Everything you need to build, manage, and automate your operations."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services - Slate */}
        <Card className="group" padding={false}>
          <div className="p-6">
            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Code size={24} />
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Development Services</h3>
            <p className="text-slate-500 text-sm mb-4">Custom software solutions tailored to your needs.</p>
            
            <ul className="space-y-2 mb-6">
              {['Web Applications', 'Mobile Apps', 'UI/UX Design', 'API Integration'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check size={14} className="text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
            
            <Button variant="text" className="p-0">
              Learn More 
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>

        {/* CRM - Red Featured */}
        <div className="bg-red-600 p-6 rounded-xl text-white relative shadow-lg">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded-full">
            🍁 Most Popular
          </span>
          
          <div className="w-12 h-12 rounded-lg bg-white/20 text-white flex items-center justify-center mb-4">
            <BarChart3 size={24} />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">CRM Platform</h3>
          <p className="text-red-100 text-sm mb-4">All-in-one solution for managing your business.</p>
          
          <ul className="space-y-2 mb-6">
            {['Lead Management', 'Project Tracking', 'Invoicing', 'Team Collaboration', 'Analytics'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-50">
                <Check size={14} className="text-white" />
                {item}
              </li>
            ))}
          </ul>
          
          <Button variant="white" className="w-full" onClick={() => navigate('/crm')}>
            Try CRM Free
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* AI Chatbot - Slate */}
        <Card className="group" padding={false}>
          <div className="p-6">
            <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Bot size={24} />
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-slate-900">AI Automation</h3>
            <p className="text-slate-500 text-sm mb-4">Intelligent chatbots that work 24/7 for you.</p>
            
            <ul className="space-y-2 mb-6">
              {['24/7 Support', 'Lead Capture', 'Knowledge Base', 'Multi-platform'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check size={14} className="text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
            
            <Button variant="text" className="p-0">
              See Demo 
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      </div>
    </Section>
  );

  // ==========================================
  // SERVICES DETAIL
  // ==========================================
  const ServicesDetail = () => {
    const services = [
      { id: 0, title: "Website Development", content: "High-performance React & Next.js websites built for conversion.", icon: Globe },
      { id: 1, title: "Digital Marketing", content: "SEO, PPC, and content strategies that drive real traffic.", icon: TrendingUp },
      { id: 2, title: "SEO & Analytics", content: "Data-driven insights to optimize conversions.", icon: PieChart },
      { id: 3, title: "Automation Setup", content: "Workflows that save you 20+ hours a week.", icon: Zap },
    ];

    return (
      <Section gray>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-red-100 text-red-600">
              Expert Services
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 leading-tight text-slate-900">
              We build the tech so you can focus on growth
            </h2>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Stop juggling freelancers. Our dedicated Canadian team handles everything from code to deployment.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {['React', 'Next.js', 'Node.js', 'AWS', 'Figma'].map(tech => (
                <span key={tech} className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                  {tech}
                </span>
              ))}
            </div>
            
            <Button>
              Get a Custom Quote
              <ArrowRight size={14} />
            </Button>
          </div>
          
          <Card padding={false} hover={false}>
            {services.map((s) => (
              <div key={s.id} className="border-b border-slate-100 last:border-0">
                <button 
                  onClick={() => setActiveAccordion(activeAccordion === s.id ? null : s.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    activeAccordion === s.id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <s.icon size={18} />
                  </div>
                  <span className="flex-1 font-medium text-slate-900 text-sm">{s.title}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-slate-400 transition-transform ${activeAccordion === s.id ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${
                  activeAccordion === s.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-5 pb-4 pl-[72px] text-slate-500 text-sm">
                    {s.content}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </Section>
    );
  };

  // ==========================================
  // CRM PRODUCT - Slate Dark
  // ==========================================
  const CRMProduct = () => (
    <Section>
      <div className="bg-slate-900 rounded-2xl p-8 md:p-12 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-red-600 text-white">
              🍁 CRM Platform
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white leading-tight">
              The Operating System for Your Business
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Manage clients, invoices, projects, and employees in one unified dashboard.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-8">
              <Button>
                Start Free Trial
                <ArrowRight size={14} />
              </Button>
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500">
                <Play size={14} />
                Watch Demo
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {['Client Portal', 'Invoicing', 'Kanban Board', 'Analytics'].map(feat => (
                <div key={feat} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={14} className="text-green-400" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Revenue', value: '$124.5K' },
                { label: 'Leads', value: '2,847' },
                { label: 'Conversion', value: '24.8%' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">{stat.label}</div>
                  <div className="text-white font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-700 rounded-lg p-4 h-32 flex items-end gap-1">
              {[40, 55, 35, 70, 45, 80, 60, 90, 50, 75, 65, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-red-600 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // AI CHATBOT
  // ==========================================
  const AIChatbot = () => (
    <Section id="chatbot" gray>
      <SectionHeader 
        badge="AI Automation"
        title="Your 24/7 AI Sales Agent"
        subtitle="Turn visitors into leads while you sleep."
        redBadge
      />
      
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        {/* Chat Demo */}
        <Card hover={false}>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <div className="font-medium text-slate-900 text-sm">Yoursoft AI</div>
              <div className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Online
              </div>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                <Bot size={12} />
              </div>
              <div className="bg-slate-100 p-3 rounded-xl rounded-tl-none text-slate-700 text-sm max-w-[240px]">
                Hi! 👋 How can I help you today?
              </div>
            </div>
            
            <div className="flex gap-2 flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                <User size={12} />
              </div>
              <div className="bg-red-600 p-3 rounded-xl rounded-tr-none text-white text-sm max-w-[240px]">
                I need a CRM for my agency
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                <Bot size={12} />
              </div>
              <div className="bg-slate-100 p-3 rounded-xl rounded-tl-none text-slate-700 text-sm max-w-[240px]">
                Great choice! Our CRM includes client management, invoicing, and more. Want a demo?
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {['Yes, show me', 'Pricing?', 'Talk to sales'].map(reply => (
              <button key={reply} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-full hover:bg-red-100 transition-colors border border-red-100">
                {reply}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white hover:bg-red-700 transition-colors">
              <Send size={16} />
            </button>
          </div>
        </Card>
        
        {/* Features */}
        <div className="space-y-5">
          {[
            { icon: MessageSquare, title: "Instant Responses", desc: "Answer queries 24/7 in English & French.", red: true },
            { icon: Target, title: "Lead Qualification", desc: "AI captures emails, names, and intent.", red: false },
            { icon: Zap, title: "Easy Integration", desc: "Works with your website and social media.", red: true },
            { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliant with Canadian data hosting.", red: false },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                item.red 
                  ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'
              }`}>
                <item.icon size={18} />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-0.5">{item.title}</h4>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
          
          <div className="pt-4">
            <Button>
              See AI in Action
              <Play size={14} />
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // INTEGRATIONS
  // ==========================================
  const Integrations = () => {
    const integrations = [
      { name: 'Slack', icon: '💬' },
      { name: 'Zapier', icon: '⚡' },
      { name: 'HubSpot', icon: '🧡' },
      { name: 'Salesforce', icon: '☁️' },
      { name: 'Google', icon: '🔍' },
      { name: 'Shopify', icon: '🛒' },
      { name: 'Stripe', icon: '💳' },
      { name: 'Notion', icon: '📓' },
    ];

    return (
      <Section>
        <SectionHeader 
          badge="Integrations"
          title="Works With Your Favorite Tools"
          subtitle="Seamlessly connect with 100+ apps and services."
        />
        
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {integrations.map((item, i) => (
            <div 
              key={i}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all text-center group cursor-pointer"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</div>
              <div className="text-xs text-slate-500 group-hover:text-red-600 transition-colors">{item.name}</div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Button variant="outline" size="sm">
            View All Integrations
            <ExternalLink size={14} />
          </Button>
        </div>
      </Section>
    );
  };

  // ==========================================
  // PROCESS
  // ==========================================
  const Process = () => (
    <Section gray>
      <SectionHeader 
        badge="Process"
        title="From Idea to Launch in 4 Steps"
        subtitle="Our proven methodology ensures your project exceeds expectations."
        redBadge
      />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { step: "01", title: "Discovery", desc: "Deep dive into your requirements and goals.", icon: Target, red: true },
          { step: "02", title: "Strategy", desc: "Design the perfect solution architecture.", icon: Layers, red: false },
          { step: "03", title: "Build", desc: "Agile development with weekly demos.", icon: Code, red: true },
          { step: "04", title: "Launch", desc: "Deploy, train, and scale with confidence.", icon: Rocket, red: false }
        ].map((item, i) => (
          <Card key={i} className="text-center group">
            <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-4 transition-colors ${
              item.red 
                ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'
            }`}>
              <item.icon size={22} />
            </div>
            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium mb-3">
              Step {item.step}
            </span>
            <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
            <p className="text-slate-500 text-sm">{item.desc}</p>
          </Card>
        ))}
      </div>
    </Section>
  );

  // ==========================================
  // WHY US - Slate Dark
  // ==========================================
  const WhyUs = () => (
    <Section dark>
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-red-600 text-white">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">
            We Don't Just Build Software.
            <span className="block text-slate-400">We Build Partnerships.</span>
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Our hybrid approach of Services + SaaS ensures you're never left stuck.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, text: "99.9% Uptime SLA" },
              { icon: Headphones, text: "Canadian Support" },
              { icon: Globe, text: "PIPEDA Compliant" },
              { icon: Zap, text: "Fast Delivery" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <item.icon size={16} className="text-red-400" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: "500+", label: "Projects Delivered", red: true },
            { value: "98%", label: "Client Satisfaction", red: false },
            { value: "50+", label: "Team Members", red: false },
            { value: "12+", label: "Years Experience", red: true }
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-6 text-center ${
              stat.red ? 'bg-red-600' : 'bg-slate-800 border border-slate-700'
            }`}>
              <div className="text-3xl font-semibold text-white mb-1">{stat.value}</div>
              <div className={stat.red ? 'text-red-100 text-sm' : 'text-slate-400 text-sm'}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // TESTIMONIALS
  // ==========================================
  const Testimonials = () => {
    const testimonials = [
      {
        quote: "Yoursoft transformed our business. The CRM alone saved us 20+ hours per week.",
        author: "Sarah Thompson",
        role: "CEO",
        company: "TechStart Vancouver",
        rating: 5
      },
      {
        quote: "The AI chatbot reduced our support tickets by 40%. Customers love the instant responses.",
        author: "Marc Leblanc",
        role: "Head of Operations",
        company: "GrowthLabs Montreal",
        rating: 5
      },
      {
        quote: "From concept to launch in just 6 weeks. Highly recommended for any Canadian business!",
        author: "Emily Chen",
        role: "Founder",
        company: "DesignHub Toronto",
        rating: 5
      }
    ];

    return (
      <Section gray>
        <SectionHeader 
          badge="Testimonials"
          title="Loved by 500+ Canadian Companies"
          subtitle="Don't just take our word for it."
          redBadge
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={i} {...testimonial} />
          ))}
        </div>
      </Section>
    );
  };

  // ==========================================
  // PRICING (Continued)
  // ==========================================
  const Pricing = () => (
    <Section id="pricing">
      <SectionHeader 
        badge="Pricing"
        title="Simple, Transparent Pricing"
        subtitle="No hidden fees. Cancel anytime. All prices in CAD."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <PricingCard 
          name="Starter"
          price="$59"
          description="Perfect for small teams"
          features={[
            'Up to 500 contacts',
            'Basic CRM features',
            'Email support',
            '1 user included',
          ]}
          cta="Start Free Trial"
        />
        
        <PricingCard 
          name="Professional"
          price="$179"
          description="For growing businesses"
          features={[
            'Up to 5,000 contacts',
            'Advanced automation',
            'AI Chatbot (EN + FR)',
            '10 users included',
            'Priority support',
          ]}
          popular={true}
          cta="Start Free Trial"
        />
        
        <PricingCard 
          name="Enterprise"
          price="Custom"
          period=""
          description="For large organizations"
          features={[
            'Unlimited contacts',
            'Full platform access',
            'Dedicated manager',
            'Custom development',
          ]}
          cta="Contact Sales"
        />
      </div>
      
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full text-sm text-green-700">
          <Shield size={16} />
          30-day money-back guarantee
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // FAQ
  // ==========================================
  const FAQ = () => {
    const faqs = [
      {
        question: "How long does it take to get started?",
        answer: "You can sign up and start using our CRM in minutes. For custom projects, we typically deliver MVPs within 4-8 weeks."
      },
      {
        question: "Can I integrate with my existing tools?",
        answer: "Yes! We integrate with 100+ popular tools including Slack, Zapier, HubSpot, Salesforce, and more."
      },
      {
        question: "Is my data stored in Canada?",
        answer: "Yes! We offer Canadian data residency options. Your data is stored in secure Canadian data centers."
      },
      {
        question: "Do you support both English and French?",
        answer: "Yes! Our platform, AI chatbot, and support team are fully bilingual."
      },
      {
        question: "Can I cancel anytime?",
        answer: "Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees."
      }
    ];

    return (
      <Section gray>
        <SectionHeader 
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="Got questions? We've got answers."
          redBadge
        />
        
        <div className="max-w-2xl mx-auto">
          <Card hover={false}>
            {faqs.map((faq, i) => (
              <FAQItem 
                key={i}
                question={faq.question}
                answer={faq.answer}
                isOpen={activeFAQ === i}
                onToggle={() => setActiveFAQ(activeFAQ === i ? null : i)}
              />
            ))}
          </Card>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm mb-3">Still have questions?</p>
          <Button variant="outline" size="sm">
            <MessageSquare size={14} />
            Chat with Us
          </Button>
        </div>
      </Section>
    );
  };

  // ==========================================
  // NEWSLETTER - Red Background
  // ==========================================
  const Newsletter = () => (
    <Section red>
      <div className="text-center max-w-lg mx-auto">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/20 flex items-center justify-center">
          <Mail size={24} className="text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
          Stay Ahead of the Curve
        </h2>
        <p className="text-red-100 mb-6 text-sm">
          Get weekly insights on AI, automation, and business growth. Join 10,000+ subscribers.
        </p>
        
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input 
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-2.5 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <Button variant="secondary" className="whitespace-nowrap">
            Subscribe
            <ArrowRight size={14} />
          </Button>
        </form>
        
        <p className="text-red-200 text-xs mt-4">
          No spam, ever. Unsubscribe anytime. 🇨🇦
        </p>
      </div>
    </Section>
  );

  // ==========================================
  // FINAL CTA
  // ==========================================
  const FinalCTA = () => (
    <Section gray>
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-red-100 text-red-600">
          🍁 Ready to Get Started?
        </span>
        
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4 leading-tight">
          Transform Your Business Today
        </h2>
        
        <p className="text-slate-500 mb-8">
          Join 500+ Canadian companies already using Yoursoft Digital to scale their operations.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button size="lg" onClick={() => navigate('/signup')}>
            Start Free Trial
            <ArrowRight size={16} />
          </Button>
          <Button variant="outline" size="lg">
            <Calendar size={16} />
            Schedule a Demo
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-green-600" />
            14-day free trial
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-green-600" />
            No credit card required
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-green-600" />
            Canadian data hosting
          </div>
        </div>
      </div>
    </Section>
  );

  // ==========================================
  // FOOTER
  // ==========================================
  const Footer = () => (
    <footer className="bg-slate-900 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Footer */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <Layers size={16} className="text-white" />
              </div>
              <span className="font-semibold text-white">Yoursoft</span>
            </div>
            <p className="text-slate-400 text-sm mb-4 max-w-xs">
              The complete ecosystem for Canadian businesses. Build, manage, and automate with confidence.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-medium text-white mb-4 text-sm">Product</h4>
            <ul className="space-y-2">
              {['CRM Platform', 'AI Chatbot', 'Integrations', 'Pricing'].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-4 text-sm">Company</h4>
            <ul className="space-y-2">
              {['About Us', 'Careers', 'Blog', 'Contact'].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-4 text-sm">Support</h4>
            <ul className="space-y-2">
              {['Help Center', 'Documentation', 'API', 'Status'].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Contact */}
        <div className="flex flex-wrap gap-6 py-6 border-t border-slate-800 mb-6">
          {[
            { icon: Mail, text: "hello@yoursoftdigital.ca" },
            { icon: Phone, text: "+1 (416) 555-0123" },
            { icon: MapPin, text: "Toronto, ON" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400 text-sm">
              <item.icon size={14} className="text-red-500" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        
        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-800">
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <span>🇨🇦</span>
            © {new Date().getFullYear()} Yoursoft Digital. Made in Canada.
          </div>
          <div className="flex gap-6 text-sm">
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <a key={item} href="#" className="text-slate-500 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );

  // ==========================================
  // RENDER FULL PAGE
  // ==========================================
  return (
    <div className="font-sans text-slate-900 bg-white antialiased">
      <Navbar />

      <main>
        <Hero />
        <StatsCounter />
        <Audience />
        <CoreOfferings />
        <ServicesDetail />
        <CRMProduct />
        <AIChatbot />
        <Integrations />
        <Process />
        <WhyUs />
        <Testimonials />
        <Pricing />
        <FAQ />
        <Newsletter />
        <FinalCTA />
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}