import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, ChevronDown, ChevronUp,
  BarChart3, Bot, Users, Layers, Zap, Shield,
  Menu, X, Sparkles, TrendingUp, Target,
  Globe, Clock, Award, Activity, PieChart,
  Workflow, Mail, Building2, ArrowUpRight
} from 'lucide-react';
import logo from '../Images/Logo/logo.png';

// ============================================
// DESIGN SYSTEM
// ============================================
const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

// ============================================
// REUSABLE COMPONENTS
// ============================================

function FadeInSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cx(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 600ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 600ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// MAIN LANDING PAGE
// ============================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'AI Platform', href: '#ai' },
    { label: 'Product', href: '#product' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>

      {/* ========== NAVBAR ========== */}
      <nav className={cx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]'
          : 'bg-transparent'
      )}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ZODO" className="h-8 w-auto" />
            <span className="text-lg font-bold text-[#0F172A] tracking-tight">ZODO</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => scrollTo(item.href)}
                className="text-sm text-[#475569] hover:text-[#0F172A] transition-colors font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-5 py-2.5 rounded-lg transition-all smooth-hover"
            >
              Get Started
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#475569]"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[rgba(15,23,42,0.06)] px-6 py-4 space-y-3">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => scrollTo(item.href)}
                className="block w-full text-left text-sm text-[#475569] hover:text-[#0F172A] py-2 font-medium"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 border-t border-[rgba(15,23,42,0.06)] space-y-2">
              <button onClick={() => navigate('/login')} className="block w-full text-left text-sm font-medium text-[#475569] py-2">Sign In</button>
              <button onClick={() => navigate('/signup')} className="block w-full text-sm font-semibold text-white bg-[#0F172A] px-5 py-2.5 rounded-lg text-center">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Subtle hero background accent */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Copy */}
            <FadeInSection>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0891B2]/6 border border-[#0891B2]/10">
                  <Sparkles size={13} className="text-[#0891B2]" />
                  <span className="text-xs font-semibold text-[#0891B2] tracking-wide uppercase">AI-Powered CRM</span>
                </div>

                <h1 className="text-[3.2rem] leading-[1.08] font-extrabold text-[#0F172A] tracking-tight">
                  The CRM That<br />
                  <span style={{ color: '#0891B2' }}>Thinks</span>, Predicts<br />
                  & Automates
                </h1>

                <p className="text-lg text-[#475569] leading-relaxed max-w-lg">
                  ZODO unifies your leads, clients, revenue, and analytics into one
                  intelligent platform. Built for teams that value data-driven decisions
                  over busywork.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-7 py-3.5 rounded-lg transition-all smooth-hover"
                  >
                    Start Free Trial
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => scrollTo('#product')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#475569] hover:text-[#0F172A] px-5 py-3.5 rounded-lg border border-[rgba(15,23,42,0.1)] hover:border-[rgba(15,23,42,0.2)] transition-all bg-white smooth-hover"
                  >
                    View Product
                  </button>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-6 pt-4">
                  {[
                    { label: 'Active Users', value: '2,400+' },
                    { label: 'Companies', value: '180+' },
                    { label: 'Uptime', value: '99.9%' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <p className="text-lg font-bold text-[#0F172A]">{stat.value}</p>
                      <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* Right — Product Mockup */}
            <FadeInSection delay={200}>
              <div
                className="relative"
                style={{ animation: 'float 8s ease-in-out infinite' }}
              >
                <div className="bg-white rounded-xl p-5 border border-[rgba(15,23,42,0.06)]"
                  style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.08), 0 12px 48px rgba(15,23,42,0.04)' }}>
                  {/* Mock Dashboard Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#0891B2]/8 flex items-center justify-center">
                        <Sparkles size={14} className="text-[#0891B2]" />
                      </div>
                      <span className="text-xs font-semibold text-[#0F172A]">AI Business Overview</span>
                      <span className="text-[9px] font-bold text-[#0891B2] bg-[#0891B2]/6 px-1.5 py-0.5 rounded uppercase tracking-wider">Live</span>
                    </div>
                  </div>

                  {/* Mock Intelligence Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Pipeline Health', value: 'Strong', color: '#16A34A', icon: Activity },
                      { label: 'Revenue Forecast', value: '+18%', color: '#0891B2', icon: TrendingUp },
                      { label: 'Priority Alerts', value: '4', color: '#EA580C', icon: Target },
                      { label: 'Automation Score', value: '92%', color: '#7C3AED', icon: Zap },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.04)]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <item.icon size={11} className="text-[#94A3B8]" />
                          <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mock Chart */}
                  <div className="h-24 bg-[#F8FAFC] rounded-lg border border-[rgba(15,23,42,0.04)] flex items-end px-3 pb-2 gap-1">
                    {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{
                        height: `${h}%`,
                        backgroundColor: i >= 10 ? '#0891B2' : i >= 8 ? '#22D3EE' : '#E2E8F0',
                        transition: `height 800ms cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ========== TRUSTED BY ========== */}
      <section className="py-12 border-y border-[rgba(15,23,42,0.04)]">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] text-[#94A3B8] uppercase tracking-[0.2em] font-semibold mb-6">Trusted by forward-thinking teams</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-40">
            {['Acme Corp', 'TechFlow', 'DataSync', 'CloudNine', 'NextGen'].map(name => (
              <span key={name} className="text-lg font-bold text-[#94A3B8] tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AI PLATFORM SECTION ========== */}
      <section id="ai" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0891B2]/6 border border-[#0891B2]/10 mb-4">
              <Bot size={13} className="text-[#0891B2]" />
              <span className="text-xs font-semibold text-[#0891B2] tracking-wide uppercase">AI Intelligence</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              Intelligence Built Into Every Workflow
            </h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              ZODO's AI engine analyzes your pipeline, predicts outcomes, and suggests
              the next best action — all in real time.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BarChart3, title: 'Predictive Analytics', desc: 'Revenue forecasting and pipeline risk scoring powered by machine learning models.' },
              { icon: Sparkles, title: 'AI Business Insights', desc: 'Real-time summaries of your business health with actionable recommendations.' },
              { icon: Zap, title: 'Smart Automation', desc: 'Intelligent follow-up scheduling, lead scoring, and task prioritization.' },
              { icon: Activity, title: 'Live Monitoring', desc: 'Continuous pipeline analysis with instant alerts when metrics deviate from targets.' },
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 80}>
                <div className="p-5 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)] card-interactive h-full">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center mb-3"
                    style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.08)' }}>
                    <item.icon size={18} className="text-[#0891B2]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{item.title}</h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section id="features" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              Everything You Need to Scale
            </h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              A complete CRM platform with modules for every stage of your business — from first contact to revenue.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Target, title: 'Leads Management', desc: 'Capture, score, and nurture leads through an intelligent pipeline with AI-driven prioritization.' },
              { icon: Users, title: 'Clients & Contacts', desc: '360° client profiles with communication history, deal tracking, and relationship intelligence.' },
              { icon: BarChart3, title: 'AI Dashboard', desc: 'Real-time business intelligence with predictive KPIs, trend analysis, and automated insights.' },
              { icon: Workflow, title: 'Automation', desc: 'Design workflows that automate follow-ups, task assignments, and notifications without code.' },
              { icon: PieChart, title: 'Reports & Analytics', desc: 'Custom reports with drill-down capabilities, export options, and scheduled delivery.' },
              { icon: Building2, title: 'Multi-Tenant', desc: 'Enterprise-grade isolation with role-based access, audit logs, and team management.' },
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 60}>
                <div className="p-6 rounded-lg bg-white border border-[rgba(15,23,42,0.06)] card-interactive h-full">
                  <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center mb-4">
                    <item.icon size={20} className="text-[#475569]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRODUCT SHOWCASE ========== */}
      <section id="product" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              See ZODO in Action
            </h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              A clean, data-dense interface designed for all-day productivity —
              not another cluttered admin panel.
            </p>
          </FadeInSection>

          <FadeInSection>
            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-[rgba(15,23,42,0.06)]"
              style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
              {/* Product Mock */}
              <div className="bg-white rounded-xl overflow-hidden border border-[rgba(15,23,42,0.06)]"
                style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
                {/* Mock top bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FCA5A5]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FDE68A]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
                  </div>
                  <div className="flex-1 mx-12">
                    <div className="bg-white rounded-md px-3 py-1 text-[10px] text-[#94A3B8] border border-[rgba(15,23,42,0.06)] text-center">
                      crm.zodo.ca/dashboard
                    </div>
                  </div>
                </div>

                {/* Mock dashboard content */}
                <div className="flex">
                  {/* Sidebar mock */}
                  <div className="w-48 border-r border-[rgba(15,23,42,0.06)] p-3 space-y-1 hidden md:block">
                    {['Dashboard', 'Leads', 'Clients', 'Projects', 'Tasks', 'Analytics'].map((item, i) => (
                      <div key={i} className={cx(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium',
                        i === 0 ? 'bg-[#F0FDFA] text-[#0891B2]' : 'text-[#94A3B8]'
                      )}>
                        {i === 0 && <div className="w-0.5 h-3 bg-[#0891B2] rounded-full -ml-2.5 mr-1" />}
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main content mock */}
                  <div className="flex-1 p-4">
                    {/* AI Hero mock */}
                    <div className="border-l-2 border-[#0891B2] bg-[#F8FAFC] rounded-md p-3 mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={10} className="text-[#0891B2]" />
                        <span className="text-[10px] font-semibold text-[#0F172A]">AI Business Overview</span>
                        <span className="text-[8px] font-bold text-[#0891B2] bg-[#0891B2]/6 px-1 py-0.5 rounded uppercase">Live</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {['Strong', '+18%', '4 alerts', '92%'].map((v, i) => (
                          <div key={i} className="text-center">
                            <span className="text-[10px] font-bold text-[#0F172A]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPI mock */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { v: '24', c: '#0891B2' }, { v: '$8.2k', c: '#EA580C' },
                        { v: '156', c: '#16A34A' }, { v: '7', c: '#7C3AED' }
                      ].map((k, i) => (
                        <div key={i} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-md p-2 text-center">
                          <span className="text-sm font-bold" style={{ color: k.c }}>{k.v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chart mock */}
                    <div className="h-20 bg-[#F8FAFC] rounded-md border border-[rgba(15,23,42,0.04)] flex items-end px-2 pb-1.5 gap-0.5">
                      {[30, 45, 35, 55, 40, 65, 50, 70, 55, 80, 75, 90].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{
                          height: `${h}%`,
                          backgroundColor: i >= 10 ? '#0891B2' : '#E2E8F0'
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ========== ENTERPRISE TRUST ========== */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              Enterprise Ready, Day One
            </h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              Built for scale with the security and reliability your business demands.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Secure by Design', desc: 'SOC 2 compliant infrastructure with end-to-end encryption, RBAC, and complete audit trail.' },
              { icon: Globe, title: '99.9% Uptime SLA', desc: 'Globally distributed infrastructure with automatic failover and zero-downtime deployments.' },
              { icon: Award, title: 'Dedicated Support', desc: 'Priority onboarding, dedicated success manager, and 24/7 technical support for enterprise plans.' },
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="text-center p-8 rounded-lg bg-white border border-[rgba(15,23,42,0.06)] card-interactive">
                  <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                    <item.icon size={22} className="text-[#475569]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              Start free. Upgrade as you grow. No hidden fees.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Starter', price: '$0', period: '/month',
                desc: 'For small teams getting started',
                features: ['Up to 5 users', '500 contacts', 'Basic analytics', 'Email support'],
                cta: 'Start Free', popular: false
              },
              {
                name: 'Professional', price: '$49', period: '/user/month',
                desc: 'For growing businesses',
                features: ['Unlimited users', 'AI Business Insights', 'Advanced automation', 'Priority support', 'Custom reports'],
                cta: 'Start Trial', popular: true
              },
              {
                name: 'Enterprise', price: 'Custom', period: '',
                desc: 'For large organizations',
                features: ['Everything in Pro', 'Dedicated infrastructure', 'SSO & SAML', 'SLA guarantee', 'Custom integrations', 'Onboarding support'],
                cta: 'Contact Sales', popular: false
              },
            ].map((plan, i) => (
              <FadeInSection key={i} delay={i * 80}>
                <div className={cx(
                  'rounded-xl p-6 h-full flex flex-col',
                  plan.popular
                    ? 'bg-[#0F172A] text-white ring-1 ring-[#0F172A]'
                    : 'bg-white border border-[rgba(15,23,42,0.08)] card-interactive'
                )} style={plan.popular ? { boxShadow: '0 8px 32px rgba(15,23,42,0.12)' } : {}}>
                  {plan.popular && (
                    <span className="inline-block text-[10px] font-bold text-[#0891B2] bg-[#0891B2]/10 px-2 py-0.5 rounded uppercase tracking-wider mb-3 self-start">
                      Most Popular
                    </span>
                  )}
                  <h3 className={cx('text-lg font-bold mb-1', plan.popular ? 'text-white' : 'text-[#0F172A]')}>{plan.name}</h3>
                  <p className={cx('text-xs mb-4', plan.popular ? 'text-[#94A3B8]' : 'text-[#64748B]')}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className={cx('text-3xl font-extrabold', plan.popular ? 'text-white' : 'text-[#0F172A]')}>{plan.price}</span>
                    {plan.period && <span className={cx('text-sm', plan.popular ? 'text-[#94A3B8]' : 'text-[#64748B]')}>{plan.period}</span>}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2">
                        <Check size={14} className={plan.popular ? 'text-[#22D3EE]' : 'text-[#0891B2]'} strokeWidth={2.5} />
                        <span className={cx('text-[13px]', plan.popular ? 'text-[#CBD5E1]' : 'text-[#475569]')}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/signup')}
                    className={cx(
                      'w-full py-2.5 rounded-lg text-sm font-semibold transition-all smooth-hover',
                      plan.popular
                        ? 'bg-white text-[#0F172A] hover:bg-[#F1F5F9]'
                        : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]'
                    )}
                  >
                    {plan.cta}
                  </button>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-3">
              Trusted by Business Leaders
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'ZODO replaced three tools for us. The AI insights alone save our team 10 hours per week on pipeline analysis.', name: 'Sarah Chen', role: 'VP Sales', company: 'TechFlow Inc.' },
              { quote: 'Finally a CRM that understands enterprise needs. Clean interface, powerful automation, and the AI predictions are remarkably accurate.', name: 'Marcus Rivera', role: 'CEO', company: 'DataSync' },
              { quote: 'The data density and analytical dashboard make it feel like a Bloomberg terminal for sales. Our team adopted it within a week.', name: 'Emily Park', role: 'Head of Revenue', company: 'CloudNine' },
            ].map((t, i) => (
              <FadeInSection key={i} delay={i * 80}>
                <div className="p-6 rounded-lg bg-white border border-[rgba(15,23,42,0.06)] h-full flex flex-col">
                  <p className="text-[13px] text-[#475569] leading-relaxed flex-1 mb-4">"{t.quote}"</p>
                  <div className="border-t border-[rgba(15,23,42,0.06)] pt-4">
                    <p className="text-sm font-semibold text-[#0F172A]">{t.name}</p>
                    <p className="text-[12px] text-[#94A3B8]">{t.role} · {t.company}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0891B2]/6 border border-[#0891B2]/10 mb-6">
              <Sparkles size={13} className="text-[#0891B2]" />
              <span className="text-xs font-semibold text-[#0891B2] tracking-wide uppercase">Ready to upgrade?</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-4">
              Start Making Intelligent<br />Decisions Today
            </h2>
            <p className="text-base text-[#64748B] mb-8 max-w-lg mx-auto leading-relaxed">
              Join hundreds of teams already using ZODO to manage leads, close deals,
              and grow revenue with AI-powered intelligence.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-8 py-3.5 rounded-lg transition-all smooth-hover"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo('#pricing')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#475569] hover:text-[#0F172A] px-6 py-3.5 rounded-lg border border-[rgba(15,23,42,0.1)] hover:border-[rgba(15,23,42,0.2)] transition-all bg-white smooth-hover"
              >
                View Pricing
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 bg-[#F8FAFC] border-t border-[rgba(15,23,42,0.06)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="ZODO" className="h-7 w-auto" />
                <span className="text-base font-bold text-[#0F172A] tracking-tight">ZODO</span>
              </div>
              <p className="text-[13px] text-[#64748B] leading-relaxed">
                AI-powered CRM platform for modern enterprises. Manage leads, clients, and revenue intelligently.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'AI Platform', 'Pricing', 'Integrations'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Status', 'Security'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[rgba(15,23,42,0.06)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#94A3B8]">© 2026 ZODO. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Privacy</a>
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Terms</a>
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Float animation keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}