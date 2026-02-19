import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Check, ChevronDown, Code, Globe, Smartphone, 
  Megaphone, Palette, Users, Layers, Zap, MessageSquare, 
  Shield, Menu, X, Star, ArrowUp, TrendingUp, Target, 
  CheckCircle2, Mail, Phone, MapPin, Linkedin, Twitter, 
  Github, ExternalLink, Loader2, Search, BarChart3, 
  Briefcase, Award, Rocket, Eye, DollarSign, Cpu, Play,
  Clock, Headphones, MousePointer
} from 'lucide-react';
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ============================================
// 🎬 ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeInDown = {
  hidden: { opacity: 0, y: -40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ============================================
// 🧩 ANIMATED COMPONENTS
// ============================================

// Animated Section Wrapper
const AnimatedSection = ({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Button Component with Hover Animation
const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  loading = false,
  size = 'default'
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost' | 'white'; 
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  size?: 'sm' | 'default' | 'lg';
}) => {
  const baseStyle = "rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group";
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-red-600 text-[#0F172A] hover:bg-red-700 shadow-sm hover:shadow-md",
    secondary: "bg-slate-900 text-[#0F172A] hover:bg-slate-800 shadow-sm hover:shadow-md",
    outline: "border border-slate-300 text-slate-200 hover:border-slate-400 hover:bg-[#F8FAFC] bg-white",
    text: "text-red-600 hover:text-red-700 hover:bg-red-50",
    ghost: "text-[#475569] hover:text-[#0F172A] hover:bg-white/10",
    white: "bg-white text-red-600 hover:bg-[#F8FAFC] shadow-sm hover:shadow-md"
  };

  return (
    <motion.button 
      onClick={onClick} 
      disabled={loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Shine effect */}
      <span className="absolute inset-0 w-full h-full  from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </motion.button>
  );
};

// Card with Hover Animation
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
  <motion.div 
    className={`
      bg-white border border-[rgba(15,23,42,0.06)] rounded-md
      ${hover ? 'cursor-pointer' : ''}
      ${padding ? 'p-6' : ''}
      ${className}
    `}
    whileHover={hover ? { y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" } : {}}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Section Component
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
      py-16 md:py-24 px-6 overflow-hidden
      ${dark ? 'bg-slate-900 text-[#0F172A]' : ''}
      ${gray ? 'bg-[#F8FAFC]' : ''}
      ${red ? 'bg-red-600 text-[#0F172A]' : ''}
      ${!dark && !gray && !red ? 'bg-white' : ''}
      ${className}
    `}
  >
    <div className="max-w-6xl mx-auto">
      {children}
    </div>
  </section>
);

// Section Header with Animation
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
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div 
      ref={ref}
      className={`mb-12 ${centered ? 'text-center max-w-2xl mx-auto' : ''}`}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {badge && (
        <motion.span 
          variants={fadeInDown}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4
            ${light 
              ? 'bg-white/20 text-[#0F172A]' 
              : redBadge 
                ? 'bg-red-100 text-red-600'
                : 'bg-white/5 text-[#475569]'
            }
          `}
        >
          {badge}
        </motion.span>
      )}
      <motion.h2 
        variants={fadeInUp}
        className={`text-3xl md:text-4xl font-semibold mb-4 leading-tight ${light ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p 
          variants={fadeInUp}
          className={`text-base md:text-lg ${light ? 'text-[#0F172A]/80' : 'text-[#94A3B8]'}`}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

// Animated Counter
const AnimatedCounter = ({ 
  end, 
  duration = 2, 
  suffix = '' 
}: { 
  end: number; 
  duration?: number; 
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// FAQ Item with Animation
const FAQItem = ({ 
  question, 
  answer, 
  isOpen, 
  onToggle,
  index
}: { 
  question: string; 
  answer: string; 
  isOpen: boolean; 
  onToggle: () => void;
  index: number;
}) => (
  <motion.div 
    className="border-b border-[rgba(15,23,42,0.06)] last:border-0"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
  >
    <motion.button 
      onClick={onToggle}
      className="w-full py-5 flex items-center justify-between text-left group"
      whileHover={{ x: 5 }}
    >
      <span className="font-medium text-[#0F172A] group-hover:text-red-600 transition-colors pr-4">
        {question}
      </span>
      <motion.div 
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-colors
          ${isOpen ? 'bg-red-600 text-[#0F172A]' : 'bg-white/5 text-[#94A3B8]'}
        `}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChevronDown size={16} />
      </motion.div>
    </motion.button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <p className="text-[#94A3B8] text-sm leading-relaxed pb-5">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

// Back to Top with Animation
const BackToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-md bg-red-600 text-[#0F172A] card-shadow flex items-center justify-center hover:bg-red-700"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// ============================================
// 🏠 SERVICES PAGE
// ============================================

export default function ServicesPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(0);
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Service Data
  const services = [
    {
      id: 'web',
      icon: Globe,
      title: 'Web Development',
      shortDesc: 'High-performance websites that convert visitors into customers.',
      color: 'red',
      features: [
        'Custom Website Design',
        'E-commerce Solutions',
        'Web Applications',
        'Landing Pages',
        'CMS Development',
        'API Integration'
      ],
      technologies: ['React', 'Next.js', 'Node.js', 'WordPress', 'Shopify', 'AWS'],
      benefits: [
        { icon: Zap, text: 'Lightning Fast', desc: 'Optimized for speed' },
        { icon: Search, text: 'SEO Ready', desc: 'Built-in optimization' },
        { icon: Smartphone, text: 'Responsive', desc: 'Perfect on all devices' },
        { icon: Shield, text: 'Secure', desc: 'Enterprise security' }
      ],
      process: [
        { step: '01', title: 'Discovery', desc: 'Understanding your goals' },
        { step: '02', title: 'Design', desc: 'Creating wireframes' },
        { step: '03', title: 'Development', desc: 'Building with code' },
        { step: '04', title: 'Launch', desc: 'Testing & deployment' }
      ],
      pricing: [
        { name: 'Landing Page', price: '$1,500', features: ['Single page', 'Mobile responsive', 'Contact form', '2 revisions'] },
        { name: 'Business Website', price: '$4,500', features: ['Up to 10 pages', 'CMS integration', 'SEO setup', 'Analytics'], popular: true },
        { name: 'E-commerce', price: '$8,000+', features: ['Product catalog', 'Payment gateway', 'Inventory', 'Custom features'] }
      ]
    },
    {
      id: 'app',
      icon: Smartphone,
      title: 'App Development',
      shortDesc: 'Native and cross-platform mobile apps for iOS and Android.',
      color: 'slate',
      features: [
        'iOS Development',
        'Android Development',
        'Cross-Platform Apps',
        'App Maintenance',
        'UI/UX Design',
        'Backend Development'
      ],
      technologies: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'Node.js'],
      benefits: [
        { icon: Smartphone, text: 'Native Feel', desc: 'Smooth experience' },
        { icon: Cpu, text: 'High Performance', desc: 'Optimized speed' },
        { icon: Shield, text: 'Secure', desc: 'Data protection' },
        { icon: Zap, text: 'Scalable', desc: 'Grows with you' }
      ],
      process: [
        { step: '01', title: 'Strategy', desc: 'Defining app goals' },
        { step: '02', title: 'Prototype', desc: 'Interactive mockups' },
        { step: '03', title: 'Build', desc: 'Agile development' },
        { step: '04', title: 'Deploy', desc: 'App store launch' }
      ],
      pricing: [
        { name: 'MVP App', price: '$15,000', features: ['Core features', 'Single platform', 'Basic backend', '3 months support'] },
        { name: 'Standard App', price: '$35,000', features: ['Full features', 'iOS + Android', 'Admin panel', '6 months support'], popular: true },
        { name: 'Enterprise', price: 'Custom', features: ['Complex features', 'Custom integrations', 'Dedicated team', 'Ongoing support'] }
      ]
    },
    {
      id: 'marketing',
      icon: Megaphone,
      title: 'Digital Marketing',
      shortDesc: 'Data-driven marketing strategies that deliver real results.',
      color: 'red',
      features: [
        'Search Engine Optimization',
        'Pay-Per-Click Advertising',
        'Social Media Marketing',
        'Content Marketing',
        'Email Marketing',
        'Analytics & Reporting'
      ],
      technologies: ['Google Ads', 'Meta Ads', 'SEMrush', 'Mailchimp', 'HubSpot', 'Analytics'],
      benefits: [
        { icon: TrendingUp, text: 'More Traffic', desc: 'Increase visitors' },
        { icon: Target, text: 'Better Leads', desc: 'Higher conversions' },
        { icon: DollarSign, text: 'Higher ROI', desc: 'Maximize spend' },
        { icon: BarChart3, text: 'Clear Reports', desc: 'Transparent data' }
      ],
      process: [
        { step: '01', title: 'Audit', desc: 'Analyzing performance' },
        { step: '02', title: 'Strategy', desc: 'Custom marketing plan' },
        { step: '03', title: 'Execute', desc: 'Running campaigns' },
        { step: '04', title: 'Optimize', desc: 'Continuous improvement' }
      ],
      pricing: [
        { name: 'Starter', price: '$1,500/mo', features: ['SEO basics', 'Social media', 'Monthly reports', 'Email support'] },
        { name: 'Growth', price: '$3,500/mo', features: ['Full SEO', 'PPC management', 'Content creation', 'Weekly calls'], popular: true },
        { name: 'Scale', price: '$7,000+/mo', features: ['Multi-channel', 'Advanced analytics', 'Dedicated manager', 'Custom strategy'] }
      ]
    },
    {
      id: 'design',
      icon: Palette,
      title: 'Graphic Design',
      shortDesc: 'Creative designs that capture your brand essence.',
      color: 'slate',
      features: [
        'Brand Identity',
        'Logo Design',
        'Marketing Materials',
        'Social Media Graphics',
        'Packaging Design',
        'Print Design'
      ],
      technologies: ['Figma', 'Adobe Creative Suite', 'Illustrator', 'Photoshop', 'After Effects', 'InDesign'],
      benefits: [
        { icon: Eye, text: 'Stand Out', desc: 'Unique designs' },
        { icon: Award, text: 'Professional', desc: 'Industry quality' },
        { icon: Layers, text: 'Consistent', desc: 'Cohesive brand' },
        { icon: Zap, text: 'Fast Delivery', desc: 'Quick turnaround' }
      ],
      process: [
        { step: '01', title: 'Brief', desc: 'Understanding vision' },
        { step: '02', title: 'Concepts', desc: 'Initial designs' },
        { step: '03', title: 'Refine', desc: 'Revisions & feedback' },
        { step: '04', title: 'Deliver', desc: 'Final files' }
      ],
      pricing: [
        { name: 'Logo Package', price: '$800', features: ['3 concepts', 'Unlimited revisions', 'All file formats', 'Brand guidelines'] },
        { name: 'Brand Identity', price: '$3,500', features: ['Logo + colors', 'Typography', 'Business cards', 'Brand book'], popular: true },
        { name: 'Full Branding', price: '$8,000+', features: ['Complete identity', 'Marketing materials', 'Social templates', 'Ongoing support'] }
      ]
    }
  ];

  const currentService = services[activeService];

  // Navigation handler
  const handleNavClick = (e: React.MouseEvent, item: { href: string; isRoute: boolean }) => {
    e.preventDefault();
    if (item.isRoute) {
      navigate(item.href);
    } else {
      window.location.href = item.href;
    }
    setIsMobileMenuOpen(false);
  };


 // ==========================================
// NAVBAR - Static (No Animation)
// ==========================================
const Navbar = () => {
  const navItems = [
    { label: 'Home', href: '/', isRoute: true },
    { label: 'Services', href: '/services', isRoute: true },
    { label: 'CRM', href: '/crm', isRoute: true },
    { label: 'Pricing', href: '/#pricing', isRoute: false },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-[rgba(15,23,42,0.06)]' : 'bg-white'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center">
            <Layers className="text-[#0F172A]" size={18} />
          </div>
          <span className="font-semibold text-[#0F172A]">Yoursoft</span>
          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">CA</span>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a 
              key={item.label} 
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`text-sm transition-colors ${
                item.label === 'Services' ? 'text-red-600 font-medium' : 'text-[#475569] hover:text-red-600'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate('/signup')}>
            Get Started
            <ArrowRight size={14} />
          </Button>
        </div>

        {/* Mobile Menu */}
        <button 
          className="lg:hidden p-2 hover:bg-white/10 rounded-md" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[rgba(15,23,42,0.06)] card-shadow">
          <div className="px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <a 
                key={item.label} 
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className="block py-2.5 text-[#475569] hover:text-red-600 text-sm"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 space-y-2 border-t border-[rgba(15,23,42,0.06)] mt-4">
              <Button variant="outline" className="w-full" size="sm">Sign In</Button>
              <Button className="w-full" size="sm">Get Started</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

  // ==========================================
// HERO - Left Aligned, No Animation on Text
// ==========================================
const Hero = () => (
  <div className="relative pt-24 pb-16 bg-[#F8FAFC] overflow-hidden">
    {/* Animated Background Elements */}
    <motion.div 
      className="absolute top-20 right-10 w-64 h-64 bg-red-200/30 rounded-full blur-3xl"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{ duration: 5, repeat: Infinity }}
    />
    <motion.div 
      className="absolute bottom-10 left-10 w-96 h-96 bg-slate-200/50 rounded-full blur-3xl"
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.3, 0.5]
      }}
      transition={{ duration: 7, repeat: Infinity }}
    />
    
    {/* Pattern */}
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}
    />

    <div className="max-w-6xl mx-auto px-6 relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Content - NO ANIMATION, LEFT ALIGNED */}
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-6">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="hover:text-red-600 transition-colors">
              Home
            </a>
            <span>/</span>
            <span className="text-[#0F172A]">Services</span>
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-red-100 text-red-600">
            🍁 What We Do
          </span>
          
          {/* Heading - Left Aligned */}
          <h1 className="text-4xl sm:text-5xl font-semibold text-[#0F172A] leading-tight mb-5">
            Expert Solutions for
            <span className="block text-red-600">Your Digital Growth</span>
          </h1>
          
          {/* Description - Left Aligned with max-width */}
          <p className="text-lg text-[#94A3B8] mb-8 max-w-md leading-relaxed">
            From websites to apps, marketing to design — we deliver end-to-end digital solutions for Canadian businesses.
          </p>
          
          {/* Buttons - Left Aligned */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg">
              Get a Free Quote
              <ArrowRight size={16} />
            </Button>
            <Button variant="outline" size="lg">
              <Phone size={16} />
              Book a Call
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex items-center gap-6 mt-8 pt-8 border-t border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>500+ Projects</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>98% Satisfaction</span>
            </div>
          </div>
        </div>

        {/* Right - Service Cards with Animation */}
        <div className="hidden lg:block">
          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {services.map((service, i) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + (i * 0.1) }}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => {
                  setActiveService(i);
                  document.getElementById('service-detail')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`p-5 rounded-md border transition-all cursor-pointer ${
                  service.color === 'red' 
                    ? 'bg-red-600 border-red-600 text-[#0F172A] hover:bg-red-700' 
                    : 'bg-white border-[rgba(15,23,42,0.06)] hover:border-slate-300 hover:shadow-lg'
                }`}
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center mb-3 ${
                  service.color === 'red' ? 'bg-white/20' : 'bg-white/5'
                }`}>
                  <service.icon size={20} className={service.color === 'red' ? 'text-[#0F172A]' : 'text-[#475569]'} />
                </div>
                <h3 className={`font-medium text-sm ${service.color === 'red' ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
                  {service.title}
                </h3>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mobile Service Quick Links */}
      <div className="lg:hidden mt-12 grid grid-cols-2 gap-3">
        {services.map((service, i) => (
          <button
            key={service.id}
            onClick={() => {
              setActiveService(i);
              document.getElementById('service-detail')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`p-4 rounded-md border transition-all text-left ${
              service.color === 'red' 
                ? 'bg-red-600 border-red-600 text-[#0F172A]' 
                : 'bg-white border-[rgba(15,23,42,0.06)]'
            }`}
          >
            <service.icon size={20} className={service.color === 'red' ? 'text-[#0F172A]' : 'text-[#475569]'} />
            <span className={`block mt-2 text-sm font-medium ${service.color === 'red' ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
              {service.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

  // ==========================================
  // SERVICE DETAIL with Animations
  // ==========================================
  const ServiceDetail = () => (
    <Section id="service-detail">
      <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
        <AnimatedSection className="lg:w-1/2">
          <motion.div 
            className={`w-14 h-14 rounded-md flex items-center justify-center mb-4 ${
              currentService.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-white/5 text-[#475569]'
            }`}
            whileHover={{ rotate: 10, scale: 1.1 }}
          >
            <currentService.icon size={28} />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-semibold text-[#0F172A] mb-4">
            {currentService.title}
          </h2>
          <p className="text-lg text-[#94A3B8] mb-6 leading-relaxed">
            {currentService.shortDesc}
          </p>

          {/* Features List */}
          <motion.div 
            className="grid grid-cols-2 gap-3 mb-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {currentService.features.map((feature, i) => (
              <motion.div 
                key={i} 
                variants={staggerItem}
                className="flex items-center gap-2 text-sm text-[#475569]"
              >
                <Check size={16} className="text-green-600 flex-shrink-0" />
                {feature}
              </motion.div>
            ))}
          </motion.div>

          <Button size="lg">
            Start Your Project
            <ArrowRight size={16} />
          </Button>
        </AnimatedSection>

        {/* Technologies */}
        <AnimatedSection className="lg:w-1/2" delay={0.2}>
          <Card hover={false}>
            <h3 className="font-semibold text-[#0F172A] mb-4">Technologies We Use</h3>
            <motion.div 
              className="flex flex-wrap gap-2 mb-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {currentService.technologies.map((tech, i) => (
                <motion.span 
                  key={i} 
                  variants={staggerItem}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-3 py-1.5 bg-white/5 rounded-md text-sm font-medium text-[#475569] cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>

            <h3 className="font-semibold text-[#0F172A] mb-4">Why Choose Us</h3>
            <motion.div 
              className="grid grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {currentService.benefits.map((benefit, i) => (
                <motion.div 
                  key={i} 
                  variants={staggerItem}
                  className="flex gap-3 group"
                >
                  <motion.div 
                    className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                      i % 2 === 0 
                        ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-[#0F172A]' 
                        : 'bg-white/5 text-[#475569] group-hover:bg-slate-900 group-hover:text-[#0F172A]'
                    }`}
                    whileHover={{ rotate: 10 }}
                  >
                    <benefit.icon size={18} />
                  </motion.div>
                  <div>
                    <div className="font-medium text-[#0F172A] text-sm">{benefit.text}</div>
                    <div className="text-xs text-[#94A3B8]">{benefit.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </AnimatedSection>
      </div>

      {/* Service Tabs */}
      <motion.div 
        className="flex gap-2 mb-8 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {services.map((service, i) => (
          <motion.button
            key={service.id}
            onClick={() => setActiveService(i)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeService === i 
                ? 'bg-red-600 text-[#0F172A]' 
                : 'bg-white/5 text-[#475569] hover:bg-slate-200'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {service.title}
          </motion.button>
        ))}
      </motion.div>
    </Section>
  );

  // ==========================================
  // PROCESS with Animations
  // ==========================================
  const Process = () => (
    <Section gray>
      <SectionHeader 
        badge="Our Process"
        title={`How We Deliver ${currentService.title}`}
        subtitle="A proven methodology that ensures quality and timely delivery."
        redBadge
      />
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {currentService.process.map((step, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card className="text-center group relative h-full">
              {/* Connector Line */}
              {i < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-200" />
              )}
              
              <motion.div 
                className={`w-12 h-12 mx-auto rounded-md flex items-center justify-center mb-4 transition-colors ${
                  i % 2 === 0 
                    ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-[#0F172A]'
                    : 'bg-white/5 text-[#475569] group-hover:bg-slate-900 group-hover:text-[#0F172A]'
                }`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="font-semibold">{step.step}</span>
              </motion.div>
              <h3 className="font-semibold text-[#0F172A] mb-2">{step.title}</h3>
              <p className="text-[#94A3B8] text-sm">{step.desc}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );

  // ==========================================
  // PRICING with Animations
  // ==========================================
  const ServicePricing = () => (
    <Section>
      <SectionHeader 
        badge="Investment"
        title={`${currentService.title} Packages`}
        subtitle="Transparent pricing with no hidden fees. All prices in CAD."
      />
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {currentService.pricing.map((pkg, i) => (
          <motion.div 
            key={i}
            variants={staggerItem}
            whileHover={{ y: -10 }}
            className={`p-6 rounded-md transition-all duration-200 ${
              pkg.popular 
                ? 'bg-red-600 text-[#0F172A] card-shadow ring-2 ring-red-600' 
                : 'bg-white border border-[rgba(15,23,42,0.06)] hover:shadow-lg'
            }`}
          >
            {pkg.popular && (
              <motion.span 
                className="inline-block px-3 py-1 bg-slate-900 text-[#0F172A] text-xs font-medium rounded-full mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                Most Popular
              </motion.span>
            )}
            
            <h3 className={`text-lg font-semibold mb-1 ${pkg.popular ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
              {pkg.name}
            </h3>
            <div className="mb-4">
              <span className={`text-3xl font-semibold ${pkg.popular ? 'text-[#0F172A]' : 'text-[#0F172A]'}`}>
                {pkg.price}
              </span>
            </div>
            
            <ul className="space-y-3 mb-6">
              {pkg.features.map((feature, j) => (
                <motion.li 
                  key={j} 
                  className="flex items-start gap-2 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: j * 0.1 }}
                >
                  <Check size={16} className={`mt-0.5 flex-shrink-0 ${pkg.popular ? 'text-[#0F172A]' : 'text-green-600'}`} />
                  <span className={pkg.popular ? 'text-red-50' : 'text-[#475569]'}>{feature}</span>
                </motion.li>
              ))}
            </ul>
            
            <Button variant={pkg.popular ? 'white' : 'outline'} className="w-full">
              Get Started
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <p className="text-[#94A3B8] text-sm mb-3">Need something custom?</p>
        <Button variant="text">
          Contact us for a custom quote
          <ArrowRight size={14} />
        </Button>
      </motion.div>
    </Section>
  );

  // ==========================================
  // ALL SERVICES OVERVIEW
  // ==========================================
  const AllServicesOverview = () => (
    <Section dark>
      <SectionHeader 
        badge="All Services"
        title="Complete Digital Solutions"
        subtitle="Everything you need to succeed in the digital world."
        light
      />
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {services.map((service, i) => (
          <motion.div 
            key={service.id}
            variants={staggerItem}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`p-6 rounded-md border transition-all duration-200 cursor-pointer ${
              i % 2 === 0 
                ? 'bg-red-600 border-red-600 hover:bg-red-700' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
            onClick={() => {
              setActiveService(i);
              document.getElementById('service-detail')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-start gap-4">
              <motion.div 
                className={`w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 ${
                  i % 2 === 0 ? 'bg-white/20 text-[#0F172A]' : 'bg-slate-700 text-[#475569]'
                }`}
                whileHover={{ rotate: 10 }}
              >
                <service.icon size={24} />
              </motion.div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{service.title}</h3>
                <p className={`text-sm mb-4 ${i % 2 === 0 ? 'text-red-100' : 'text-[#475569]'}`}>
                  {service.shortDesc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {service.features.slice(0, 3).map((feature, j) => (
                    <span 
                      key={j} 
                      className={`px-2 py-1 rounded text-xs ${
                        i % 2 === 0 ? 'bg-white/10 text-[#0F172A]' : 'bg-slate-700 text-[#475569]'
                      }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <motion.div whileHover={{ x: 5 }}>
                <ArrowRight size={20} className="text-[#0F172A]/60" />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );

  // ==========================================
  // TESTIMONIALS
  // ==========================================
  const Testimonials = () => (
    <Section gray>
      <SectionHeader 
        badge="Client Stories"
        title="What Our Clients Say"
        subtitle="Real feedback from real Canadian businesses."
        redBadge
      />
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {[
          {
            quote: "They built our e-commerce site in just 6 weeks. Sales are up 200% since launch!",
            author: "Sarah Thompson",
            role: "Founder",
            company: "Maple Boutique",
            service: "Web Development"
          },
          {
            quote: "Our app has a 4.8 star rating thanks to their amazing UX work. Highly recommend!",
            author: "Michael Chen",
            role: "CEO",
            company: "FitTrack Canada",
            service: "App Development"
          },
          {
            quote: "ROI on our marketing campaign was 5x. They really know what they're doing.",
            author: "Emily Roberts",
            role: "Marketing Director",
            company: "GrowthLabs",
            service: "Digital Marketing"
          }
        ].map((testimonial, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card className="h-full flex flex-col">
              <span className={`text-xs font-medium mb-3 ${
                i % 2 === 0 ? 'text-red-600' : 'text-[#94A3B8]'
              }`}>
                {testimonial.service}
              </span>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: j * 0.1 }}
                  >
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                  </motion.div>
                ))}
              </div>
              <p className="text-[#475569] mb-4 flex-1">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-[rgba(15,23,42,0.06)]">
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ${
                    i % 2 === 0 ? 'bg-red-100 text-red-600' : 'bg-white/5 text-[#475569]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  {testimonial.author.charAt(0)}
                </motion.div>
                <div>
                  <div className="font-medium text-[#0F172A] text-sm">{testimonial.author}</div>
                  <div className="text-xs text-[#94A3B8]">{testimonial.role}, {testimonial.company}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );

  // ==========================================
  // FAQ
  // ==========================================
  const FAQ = () => {
    const faqs = [
      {
        question: "How long does a typical project take?",
        answer: "It depends on the scope. A landing page takes 1-2 weeks, a full website 4-8 weeks, and mobile apps typically 8-16 weeks."
      },
      {
        question: "Do you work with clients outside of Canada?",
        answer: "While we're based in Canada and specialize in serving Canadian businesses, we do work with international clients."
      },
      {
        question: "What is your payment structure?",
        answer: "For most projects, we require 50% upfront and 50% upon completion. For larger projects, we can arrange milestone-based payments."
      },
      {
        question: "Do you offer ongoing support?",
        answer: "Yes! We offer maintenance packages starting at $500/month that include updates, security patches, backups, and priority support."
      },
      {
        question: "Can you help with an existing project?",
        answer: "Absolutely. We often take over projects from other agencies. We'll do a thorough audit first before proposing improvements."
      }
    ];

    return (
      <Section>
        <SectionHeader 
          badge="FAQ"
          title="Common Questions"
          subtitle="Quick answers to help you get started."
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
                index={i}
              />
            ))}
          </Card>
        </div>
      </Section>
    );
  };

  // ==========================================
  // CTA
  // ==========================================
  const CTA = () => (
    <Section red>
      <motion.div 
        className="text-center max-w-2xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.span 
          variants={fadeInDown}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-white/20 text-[#0F172A]"
        >
          🍁 Let's Work Together
        </motion.span>
        
        <motion.h2 
          variants={fadeInUp}
          className="text-3xl md:text-4xl font-semibold text-[#0F172A] mb-4 leading-tight"
        >
          Ready to Start Your Project?
        </motion.h2>
        
        <motion.p variants={fadeInUp} className="text-red-100 mb-8">
          Get a free consultation and quote. No commitment, just honest advice.
        </motion.p>
        
        <motion.div 
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button variant="white" size="lg">
            Get a Free Quote
            <ArrowRight size={16} />
          </Button>
          <Button variant="outline" size="lg" className="border-white/30 text-[#0F172A] hover:bg-white/10">
            <Phone size={16} />
            +1 (416) 555-0123
          </Button>
        </motion.div>
      </motion.div>
    </Section>
  );

  // ==========================================
  // FOOTER
  // ==========================================
  const Footer = () => (
    <footer className="bg-slate-900 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Brand */}
          <motion.div variants={staggerItem} className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center">
                <Layers size={16} className="text-[#0F172A]" />
              </div>
              <span className="font-semibold text-[#0F172A]">Yoursoft</span>
            </div>
            <p className="text-[#475569] text-sm mb-4 max-w-xs">
              Expert digital solutions for Canadian businesses.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <motion.a 
                  key={i} 
                  href="#" 
                  className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-[#475569] hover:bg-red-600 hover:text-[#0F172A] transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </motion.div>
          
          {/* Services */}
          <motion.div variants={staggerItem}>
            <h4 className="font-medium text-[#0F172A] mb-4 text-sm">Services</h4>
            <ul className="space-y-2">
              {services.map(service => (
                <li key={service.id}>
                  <a href="#" className="text-[#475569] hover:text-[#0F172A] transition-colors text-sm">
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
          
          {/* Company */}
          <motion.div variants={staggerItem}>
            <h4 className="font-medium text-[#0F172A] mb-4 text-sm">Company</h4>
            <ul className="space-y-2">
              {['About Us', 'Portfolio', 'Careers', 'Contact'].map(item => (
                <li key={item}>
                  <a href="#" className="text-[#475569] hover:text-[#0F172A] transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </motion.div>
          
          {/* Contact */}
          <motion.div variants={staggerItem}>
            <h4 className="font-medium text-[#0F172A] mb-4 text-sm">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-[#475569] text-sm">
                <Mail size={14} className="text-red-500" />
                hello@yoursoft.ca
              </li>
              <li className="flex items-center gap-2 text-[#475569] text-sm">
                <Phone size={14} className="text-red-500" />
                +1 (416) 555-0123
              </li>
              <li className="flex items-center gap-2 text-[#475569] text-sm">
                <MapPin size={14} className="text-red-500" />
                Toronto, ON
              </li>
            </ul>
          </motion.div>
        </motion.div>
        
        {/* Bottom */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="text-[#94A3B8] text-sm flex items-center gap-2">
            <span>🇨🇦</span>
            © {new Date().getFullYear()} Yoursoft Digital. Made in Canada.
          </div>
          <div className="flex gap-6 text-sm">
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <a key={item} href="#" className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                {item}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );

  // ==========================================
  // RENDER
  // ==========================================
    // ==========================================
  // RENDER (Continued)
  // ==========================================
  return (
    <div className="font-sans text-[#0F172A] bg-white antialiased">
      <Navbar />
      
      <main>
        <Hero />
        <ServiceDetail />
        <Process />
        <ServicePricing />
        <AllServicesOverview />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}