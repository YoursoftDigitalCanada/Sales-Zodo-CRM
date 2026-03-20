import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Menu, X, BarChart3,
  Cloud, Users, ChevronRight, Play,
  Twitter, Facebook, Linkedin, Instagram, Youtube,
  Star, Quote, Check
} from 'lucide-react';
import logo from '../Images/Logo/logo.png';
import dashboardMockup from '../Images/dashboard-mockup.png';
import heroIllustration from '../Images/hero-illustration.png';

// ============================================
// UTILITIES
// ============================================
const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

function FadeIn({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

// ============================================
// LANDING PAGE
// ============================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const navLinks = ['Product', 'Features', 'Pricing', 'Blog', 'Contact'];

  const features = [
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Real-time analytics and reporting for charts and comprehensive data tracking analytics.',
      color: '#2EC4C7',
    },
    {
      icon: Cloud,
      title: 'Secure Cloud Storage',
      description: 'Manage all the assets of secure cloud storage, existing data offers and secure credentials.',
      color: '#6BCB77',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Collaboration, connecting and team collaboration tools for customers and engagement of the resources.',
      color: '#F6C945',
    },
  ];

  const testimonials = [
    {
      quote: 'ZODO CRM has transformed how we manage our client relationships. The real-time analytics provide insights we never had before, helping us make data-driven decisions.',
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'TechFlow Inc.',
      avatar: 'SJ',
      avatarBg: 'linear-gradient(135deg, #2EC4C7, #6BCB77)',
    },
    {
      quote: 'The platform is incredibly intuitive. Our team was up and running within days, and the secure cloud storage gives us peace of mind about our client data.',
      name: 'Marcus Rivera',
      role: 'CEO',
      company: 'DataSync Corp.',
      avatar: 'MR',
      avatarBg: 'linear-gradient(135deg, #F6C945, #F3722C)',
    },
    {
      quote: 'Outstanding collaboration features! The team communication tools have reduced our response time by 40% and improved customer satisfaction scores dramatically.',
      name: 'Emily Chen',
      role: 'Head of Operations',
      company: 'CloudNine Solutions',
      avatar: 'EC',
      avatarBg: 'linear-gradient(135deg, #6BCB77, #2EC4C7)',
    },
  ];

  const platformFeatures = [
    { title: 'Real-time Analytics', desc: 'Live data dashboards and analytics for smart business decisions.', color: '#2EC4C7' },
    { title: 'Secure Cloud Storage', desc: 'Secured cloud storage for records and data with encrypted protection.', color: '#6BCB77' },
    { title: 'Team Collaboration', desc: 'Team collaboration anywhere with real-time data and controls and collaboration channels.', color: '#F6C945' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      background: '#FFFFFF',
    }}>

      {/* ========================================
          NAVBAR
          ======================================== */}
      <nav className={cx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm'
          : 'bg-white'
      )}>
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[72px]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="ZODO" className="h-10 w-auto" />
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(item => (
              <button
                key={item}
                onClick={() => scrollTo(`#${item.toLowerCase()}`)}
                className="px-4 py-2 text-[14px] font-medium text-[#555] hover:text-[#222] transition-colors duration-200"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[14px] font-medium text-[#555] hover:text-[#222] px-4 py-2 transition-colors duration-200"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-[14px] font-semibold text-white px-6 py-2.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7)' }}
            >
              Request Demo
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-[#555]">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1 shadow-lg">
            {navLinks.map(item => (
              <button key={item} onClick={() => scrollTo(`#${item.toLowerCase()}`)}
                className="block w-full text-left text-[14px] text-[#555] hover:text-[#222] py-2.5 font-medium">{item}</button>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <button onClick={() => navigate('/login')} className="text-[14px] font-medium text-[#555] py-2">Sign In</button>
              <button onClick={() => navigate('/signup')}
                className="text-[14px] font-semibold text-white px-5 py-2.5 rounded-full text-center"
                style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7)' }}>
                Request Demo
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================
          HERO SECTION
          ======================================== */}
      <section className="relative pt-[100px] pb-16 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FFFE 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[520px]">
            {/* Left — Copy */}
            <FadeIn>
              <div className="space-y-6">
                <h1 className="text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.12] font-extrabold text-[#1A1A2E]" style={{ letterSpacing: '-0.03em' }}>
                  Transform Your Data<br />
                  with ZODO's<br />
                  <span className="bg-clip-text text-transparent" style={{
                    backgroundImage: 'linear-gradient(135deg, #4CAF50, #2EC4C7)',
                  }}>Intelligent Platform.</span>
                </h1>

                <p className="text-[16px] text-[#666] leading-[1.75] max-w-[480px]">
                  Solve the intelligence drivers, data analytics and
                  solutions to produce needed platform.
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-2 text-[14px] font-semibold text-white px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7)' }}
                  >
                    Start Your Free Trial
                  </button>
                  <button
                    onClick={() => scrollTo('#features')}
                    className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4CAF50] hover:text-[#2EC4C7] transition-colors duration-200"
                  >
                    View Feature Details <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </FadeIn>

            {/* Right — Dashboard Mockup */}
            <FadeIn delay={200}>
              <div className="relative">
                <div className="absolute -inset-8 rounded-full opacity-[0.1]"
                  style={{ background: 'radial-gradient(circle, #2EC4C7 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <img
                  src={dashboardMockup}
                  alt="ZODO CRM Dashboard"
                  className="relative w-full rounded-xl shadow-2xl"
                  style={{
                    animation: 'float 8s ease-in-out infinite',
                  }}
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========================================
          FEATURES — Three-Column Cards
          ======================================== */}
      <section id="features" className="py-20 relative" style={{ background: '#FAFBFC' }}>
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#1A1A2E] mb-3" style={{ letterSpacing: '-0.02em' }}>
              Key Features
            </h2>
            <p className="text-[15px] text-[#888] max-w-lg mx-auto">
              Everything you need to manage your business intelligently
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  className="bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:-translate-y-2 cursor-default group"
                  style={{
                    boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)';
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${feature.color}15` }}
                  >
                    <feature.icon size={28} style={{ color: feature.color }} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[17px] font-bold text-[#1A1A2E] mb-3">{feature.title}</h3>
                  <p className="text-[14px] text-[#888] leading-[1.7]">{feature.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          PLATFORM SHOWCASE — Split Layout
          ======================================== */}
      <section id="product" className="py-24 relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Illustration / Mockup */}
            <FadeIn>
              <div className="relative">
                <div className="absolute -inset-8 rounded-full opacity-[0.08]"
                  style={{ background: 'radial-gradient(circle, #6BCB77 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <img
                  src={heroIllustration}
                  alt="Platform Overview"
                  className="relative w-full max-w-[500px] mx-auto"
                />
              </div>
            </FadeIn>

            {/* Right — Feature Highlights */}
            <FadeIn delay={150}>
              <div>
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#1A1A2E] mb-3" style={{ letterSpacing: '-0.02em' }}>
                  Transform Your Data with<br />
                  ZODO's Intelligent Platform.
                </h2>
                <p className="text-[15px] text-[#888] leading-[1.7] mb-8">
                  Set custom dashboard controls to understand analytics and
                  intelligent data-driven analytics intelligence.
                </p>

                <div className="space-y-4">
                  {platformFeatures.map((feat, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-gray-50"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${feat.color}15` }}>
                        <Check size={18} style={{ color: feat.color }} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-semibold text-[#1A1A2E] mb-1">{feat.title}</h4>
                        <p className="text-[13px] text-[#888] leading-[1.6]">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========================================
          DASHBOARD PREVIEW SECTION
          ======================================== */}
      <section className="py-20 relative" style={{ background: '#FAFBFC' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#1A1A2E] mb-3" style={{ letterSpacing: '-0.02em' }}>
              See ZODO in Action
            </h2>
            <p className="text-[15px] text-[#888] max-w-lg mx-auto">
              A powerful, data-rich interface designed for modern businesses.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F9FB] border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFD93D]" />
                  <div className="w-3 h-3 rounded-full bg-[#6BCB77]" />
                </div>
                <div className="flex-1 mx-12">
                  <div className="bg-white rounded-md px-4 py-1.5 text-[11px] text-[#999] border border-gray-100 text-center max-w-xs mx-auto">
                    crm.zodo.ca/dashboard
                  </div>
                </div>
              </div>
              <img
                src={dashboardMockup}
                alt="ZODO CRM Dashboard Preview"
                className="w-full"
                style={{ objectFit: 'cover', maxHeight: '500px' }}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ========================================
          CLIENT TESTIMONIALS
          ======================================== */}
      <section id="blog" className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2EC4C7 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-14">
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#1A1A2E] mb-3" style={{ letterSpacing: '-0.02em' }}>
              Client Testimonials
            </h2>
            <p className="text-[15px] text-[#888] max-w-lg mx-auto">
              See what our clients say about using ZODO CRM
            </p>
          </FadeIn>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  className={cx(
                    'rounded-2xl p-7 h-full flex flex-col transition-all duration-500 cursor-default',
                    activeTestimonial === i ? 'scale-[1.03]' : 'hover:scale-[1.01]'
                  )}
                  style={{
                    background: activeTestimonial === i ? 'linear-gradient(135deg, #f0fdf4, #ecfeff)' : '#fff',
                    border: activeTestimonial === i ? '2px solid #2EC4C7' : '1px solid #f0f0f0',
                    boxShadow: activeTestimonial === i
                      ? '0 12px 40px rgba(46,196,199,0.12)'
                      : '0 2px 16px rgba(0,0,0,0.04)',
                  }}
                  onClick={() => setActiveTestimonial(i)}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} size={16} className="fill-[#F6C945] text-[#F6C945]" />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative flex-1 mb-5">
                    <Quote size={24} className="absolute -top-1 -left-1 text-[#2EC4C7] opacity-20" />
                    <p className="text-[14px] text-[#555] leading-[1.8] pl-4 italic">
                      "{t.quote}"
                    </p>
                  </div>

                  {/* Author */}
                  <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-md"
                      style={{ background: t.avatarBg }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1A1A2E]">{t.name}</p>
                      <p className="text-[12px] text-[#999]">{t.role} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className="transition-all duration-300"
                style={{
                  width: activeTestimonial === i ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: activeTestimonial === i
                    ? 'linear-gradient(135deg, #4CAF50, #2EC4C7)'
                    : '#ddd',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          PRICING SECTION
          ======================================== */}
      <section id="pricing" className="py-24 relative" style={{ background: '#FAFBFC' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#1A1A2E] mb-3" style={{ letterSpacing: '-0.02em' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-[15px] text-[#888] max-w-lg mx-auto">
              Start free. Scale as you grow. No surprises.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Basic',
                price: '$0',
                period: '/mo',
                desc: 'For small teams getting started',
                features: ['Up to 5 users', '500 contacts', 'Basic analytics', 'Email support', 'Lead management'],
                cta: 'Start Free',
                popular: false,
                color: '#6BCB77',
              },
              {
                name: 'Standard',
                price: '$49',
                period: '/user/mo',
                desc: 'For growing businesses',
                features: ['Unlimited users', 'AI Business Insights', 'Project management', 'Advanced automation', 'Priority support', 'Custom reports'],
                cta: 'Start Trial',
                popular: true,
                color: '#2EC4C7',
              },
              {
                name: 'Premium',
                price: '$99',
                period: '/user/mo',
                desc: 'For large enterprises',
                features: ['Everything in Standard', 'AI Roof Estimator', 'Advanced analytics', 'SSO & SAML', 'Dedicated support', 'Custom integrations'],
                cta: 'Contact Sales',
                popular: false,
                color: '#F6C945',
              },
            ].map((plan, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div
                  className={cx(
                    'rounded-2xl p-7 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 relative',
                    plan.popular ? '' : ''
                  )}
                  style={plan.popular ? {
                    background: 'linear-gradient(135deg, #1A1A2E, #2D2D44)',
                    boxShadow: '0 16px 50px rgba(26,26,46,0.2)',
                  } : {
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-[11px] font-bold text-white px-4 py-1 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7)' }}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className={cx('text-[18px] font-bold mb-1', plan.popular ? 'text-white' : 'text-[#1A1A2E]')}>{plan.name}</h3>
                  <p className={cx('text-[13px] mb-5', plan.popular ? 'text-[#94A3B8]' : 'text-[#888]')}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={cx('text-[38px] font-extrabold', plan.popular ? 'text-white' : 'text-[#1A1A2E]')} style={{ letterSpacing: '-0.03em' }}>{plan.price}</span>
                    {plan.period && <span className={cx('text-[14px]', plan.popular ? 'text-[#94A3B8]' : 'text-[#888]')}>{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: plan.popular ? 'rgba(46,196,199,0.15)' : `${plan.color}15` }}>
                          <Check size={11} style={{ color: plan.popular ? '#2EC4C7' : plan.color }} strokeWidth={3} />
                        </div>
                        <span className={cx('text-[13px]', plan.popular ? 'text-[#CBD5E1]' : 'text-[#666]')}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/signup')}
                    className={cx(
                      'w-full py-3 rounded-full text-[14px] font-semibold transition-all duration-200',
                      plan.popular
                        ? 'text-[#1A1A2E] hover:opacity-90'
                        : 'text-white hover:opacity-90'
                    )}
                    style={{
                      background: plan.popular
                        ? 'linear-gradient(135deg, #4CAF50, #2EC4C7)'
                        : 'linear-gradient(135deg, #1A1A2E, #2D2D44)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          FINAL CTA
          ======================================== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full opacity-[0.06]"
            style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7, #F6C945)', filter: 'blur(100px)' }} />
        </div>

        <div className="max-w-[680px] mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#1A1A2E] mb-5" style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Ready to Transform Your<br />Business with ZODO?
            </h2>
            <p className="text-[16px] text-[#888] mb-8 max-w-md mx-auto leading-[1.7]">
              Join hundreds of teams using ZODO to manage clients,
              track analytics, and grow revenue intelligently.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-white px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #4CAF50, #2EC4C7)' }}
              >
                Start Your Free Trial <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo('#pricing')}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#555] hover:text-[#222] px-6 py-3.5 rounded-full border border-gray-200 bg-white transition-all duration-200 hover:shadow-md"
              >
                View Pricing
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ========================================
          FOOTER
          ======================================== */}
      <footer className="py-16 border-t border-gray-100" style={{ background: '#FAFBFC' }}>
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <img src={logo} alt="ZODO" className="h-9 w-auto" />
              </div>
              <p className="text-[14px] text-[#888] leading-[1.8] max-w-sm mb-6">
                Transform Your Data with ZODO's
                Intelligent Platform for
                intelligent data-driven analytics.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press', 'Contact'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Status', 'Security', 'Privacy'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[12px] font-bold text-[#1A1A2E] uppercase tracking-[0.12em] mb-5">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-[14px] text-[#888] hover:text-[#4CAF50] transition-colors duration-200">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#aaa]">© 2025 ZODO. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[
                { icon: Twitter, href: '#' },
                { icon: Facebook, href: '#' },
                { icon: Linkedin, href: '#' },
                { icon: Instagram, href: '#' },
                { icon: Youtube, href: '#' },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#aaa] transition-all duration-200 hover:text-white hover:shadow-md"
                  style={{
                    background: '#f0f0f0',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg, #4CAF50, #2EC4C7)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#f0f0f0';
                  }}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[13px] text-[#aaa] hover:text-[#4CAF50] transition-colors">Privacy</a>
              <a href="#" className="text-[13px] text-[#aaa] hover:text-[#4CAF50] transition-colors">Terms</a>
              <a href="#" className="text-[13px] text-[#aaa] hover:text-[#4CAF50] transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Float keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}