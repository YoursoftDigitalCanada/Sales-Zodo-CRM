import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check,
  BarChart3, Bot, Users, Layers, Zap, Shield,
  Menu, X, Sparkles, TrendingUp, Target,
  Globe, Clock, Award, Activity, PieChart,
  Workflow, Building2, ChevronRight, Play,
  CreditCard, FileText, Calendar, Mail
} from 'lucide-react';
import logo from '../Images/Logo/logo.png';

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

// Mouse-following particles (hero only)
function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    size: number; opacity: number; color: string; life: number; maxLife: number;
  }>>([]);
  const mouse = useRef({ x: -100, y: -100, active: false });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#2EC4C7', '#6BCB77', '#F6C945', '#F3722C'];
    const MAX = 60;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
      mouse.current.active =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
    };

    const handleLeave = () => { mouse.current.active = false; };

    window.addEventListener('mousemove', handleMove);
    canvas.parentElement?.addEventListener('mouseleave', handleLeave);

    let lastSpawn = 0;
    const loop = (t: number) => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      // Spawn particles near mouse
      if (mouse.current.active && t - lastSpawn > 40 && particles.current.length < MAX) {
        lastSpawn = t;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.8;
        particles.current.push({
          x: mouse.current.x + (Math.random() - 0.5) * 20,
          y: mouse.current.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3,
          size: 2 + Math.random() * 3,
          opacity: 0.6 + Math.random() * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 1000 + Math.random() * 600,
        });
      }

      // Update & draw
      particles.current = particles.current.filter(p => {
        p.life += 16;
        if (p.life >= p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;
        const progress = p.life / p.maxLife;
        const alpha = p.opacity * (1 - progress);
        const scale = 1 - progress * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      canvas.parentElement?.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ============================================
// LANDING PAGE
// ============================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      background: '#F7F9FC',
    }}>

      {/* ========================================
          NAVBAR — Glass, sticky, minimal
          ======================================== */}
      <nav className={cx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/70 backdrop-blur-xl border-b border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'bg-transparent'
      )}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="ZODO" className="h-9 w-auto" />
          </div>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'AI Platform', 'Modules', 'Pricing'].map(item => (
              <button
                key={item}
                onClick={() => scrollTo(`#${item.toLowerCase().replace(/\s/g, '-')}`)}
                className="px-4 py-2 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] rounded-lg hover:bg-black/[0.03] transition-all duration-200"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] px-4 py-2 transition-colors duration-200"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-[13px] font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] pl-5 pr-4 py-2.5 rounded-[10px] transition-all duration-200 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
            >
              Get Started <ArrowRight size={14} />
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-[#475569]">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-black/[0.04] px-6 py-4 space-y-1">
            {['Features', 'AI Platform', 'Modules', 'Pricing'].map(item => (
              <button key={item} onClick={() => scrollTo(`#${item.toLowerCase().replace(/\s/g, '-')}`)}
                className="block w-full text-left text-[13px] text-[#475569] hover:text-[#0F172A] py-2.5 font-medium">{item}</button>
            ))}
            <div className="pt-3 border-t border-black/[0.04] flex flex-col gap-2">
              <button onClick={() => navigate('/login')} className="text-[13px] font-medium text-[#475569] py-2">Sign In</button>
              <button onClick={() => navigate('/signup')} className="text-[13px] font-semibold text-white bg-[#0F172A] px-5 py-2.5 rounded-[10px] text-center">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================
          HERO — Stripe-level ambient gradient
          ======================================== */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Ambient gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #2EC4C7 0%, transparent 65%)', filter: 'blur(100px)' }} />
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #6BCB77 0%, transparent 65%)', filter: 'blur(100px)' }} />
          <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #F6C945 0%, transparent 65%)', filter: 'blur(100px)' }} />
        </div>

        {/* Mouse-following particles */}
        <HeroParticles />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left — Copy */}
            <FadeIn>
              <div className="space-y-7">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2EC4C7] animate-pulse" />
                  <span className="text-[12px] font-semibold text-[#475569] tracking-wide">AI-Powered CRM Platform</span>
                </div>

                <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] leading-[1.06] font-extrabold text-[#0F172A]" style={{ letterSpacing: '-0.035em' }}>
                  The CRM that<br />
                  thinks, predicts<br />
                  & <span className="bg-clip-text text-transparent" style={{
                    backgroundImage: 'linear-gradient(135deg, #2EC4C7, #6BCB77, #F6C945)',
                  }}>automates</span>
                </h1>

                <p className="text-[17px] text-[#64748B] leading-[1.7] max-w-[460px]">
                  ZODO unifies leads, clients, revenue, and analytics into one
                  intelligent platform — built for teams that value insight over busywork.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-7 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                  >
                    Get Started <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => scrollTo('#modules')}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] px-6 py-3.5 rounded-[12px] border border-black/[0.08] hover:border-black/[0.14] transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}
                  >
                    Book Demo
                  </button>
                </div>

                {/* Trust metrics */}
                <div className="flex items-center gap-8 pt-5 border-t border-black/[0.04]">
                  {[
                    { value: '2,400+', label: 'Active Users' },
                    { value: '180+', label: 'Companies' },
                    { value: '99.9%', label: 'Uptime' },
                  ].map((s, i) => (
                    <div key={i}>
                      <p className="text-xl font-bold text-[#0F172A]" style={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
                      <p className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-[0.06em] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Right — Product Mockup (Glass) */}
            <FadeIn delay={200}>
              <div className="relative">
                {/* Ambient glow behind mockup */}
                <div className="absolute -inset-8 rounded-[40px] opacity-[0.12]"
                  style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77, #F6C945, #F3722C)', filter: 'blur(60px)' }} />

                <div className="relative rounded-[20px] p-6 border border-white/60"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                    animation: 'float 8s ease-in-out infinite',
                  }}>
                  {/* Dashboard header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(46,196,199,0.1), rgba(107,203,119,0.1))' }}>
                        <Sparkles size={15} className="text-[#2EC4C7]" />
                      </div>
                      <div>
                        <span className="text-[12px] font-semibold text-[#0F172A]">AI Business Overview</span>
                        <span className="ml-2 text-[9px] font-bold text-[#2EC4C7] bg-[#2EC4C7]/8 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">Updated now</div>
                  </div>

                  {/* Intelligence Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Pipeline', value: 'Strong', color: '#16A34A', icon: Activity },
                      { label: 'Revenue', value: '+18%', color: '#2EC4C7', icon: TrendingUp },
                      { label: 'Alerts', value: '4', color: '#F3722C', icon: Target },
                      { label: 'AI Score', value: '92%', color: '#7C3AED', icon: Zap },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-[12px] border border-black/[0.04]"
                        style={{ background: 'rgba(248,250,252,0.8)' }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <item.icon size={10} className="text-[#94A3B8]" />
                          <span className="text-[9px] text-[#94A3B8] font-semibold uppercase tracking-wider">{item.label}</span>
                        </div>
                        <span className="text-[15px] font-bold" style={{ color: item.color, letterSpacing: '-0.01em' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="h-[72px] rounded-[12px] border border-black/[0.04] flex items-end px-3 pb-2.5 gap-[3px]"
                    style={{ background: 'rgba(248,250,252,0.8)' }}>
                    {[38, 52, 34, 62, 48, 72, 58, 78, 68, 85, 80, 92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-[3px] transition-all duration-700"
                        style={{
                          height: `${h}%`,
                          background: i >= 9
                            ? 'linear-gradient(180deg, #2EC4C7, #6BCB77)'
                            : 'rgba(226,232,240,0.6)',
                          transitionDelay: `${i * 50}ms`,
                        }} />
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========================================
          TRUSTED BY
          ======================================== */}
      <section className="py-14 relative">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-center text-[11px] text-[#94A3B8] uppercase tracking-[0.2em] font-semibold mb-8">Trusted by forward-thinking teams</p>
          <div className="flex items-center justify-center gap-14 flex-wrap opacity-30">
            {['Acme Corp', 'TechFlow', 'DataSync', 'CloudNine', 'NextGen'].map(name => (
              <span key={name} className="text-[17px] font-bold text-[#64748B]" style={{ letterSpacing: '-0.01em' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          FEATURES — Glass cards, 3-column
          ======================================== */}
      <section id="features" className="py-28 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #6BCB77 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-[12px] font-semibold text-[#2EC4C7] uppercase tracking-[0.12em] mb-3">Features</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-4" style={{ letterSpacing: '-0.03em' }}>
              Everything you need to scale
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-xl mx-auto leading-[1.7]">
              A complete platform for every stage of your business — from first contact to revenue.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Target, title: 'Lead Intelligence', desc: 'AI-driven lead scoring, enrichment, and pipeline management with predictive conversion insights.' },
              { icon: Users, title: 'Client 360°', desc: 'Unified client profiles with relationship mapping, communication history, and deal intelligence.' },
              { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time dashboards with forecasting, trends, and automated performance summaries.' },
              { icon: Workflow, title: 'Workflow Builder', desc: 'Visual automation engine for follow-ups, assignments, approvals, and multi-step sequences.' },
              { icon: PieChart, title: 'Revenue Intelligence', desc: 'Pipeline health monitoring, revenue forecasting, and win/loss analysis across segments.' },
              { icon: Building2, title: 'Enterprise Multi-Tenant', desc: 'Isolated workspaces with RBAC, audit logs, SSO, and centralized team management.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="p-6 rounded-[20px] border border-white/60 h-full transition-all duration-300 hover:-translate-y-1 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}>
                  <div className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(46,196,199,0.08), rgba(107,203,119,0.08))' }}>
                    <item.icon size={20} className="text-[#2EC4C7]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#0F172A] mb-2" style={{ letterSpacing: '-0.01em' }}>{item.title}</h3>
                  <p className="text-[13px] text-[#64748B] leading-[1.65]">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          AI PLATFORM — Futuristic but clean
          ======================================== */}
      <section id="ai-platform" className="py-28 relative overflow-hidden">
        {/* Ambient gradient */}
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2EC4C7 0%, transparent 70%)', filter: 'blur(90px)' }} />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <FadeIn>
              <div>
                <p className="text-[12px] font-semibold text-[#2EC4C7] uppercase tracking-[0.12em] mb-3">AI Intelligence</p>
                <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-5" style={{ letterSpacing: '-0.03em' }}>
                  Intelligence built into<br />every workflow
                </h2>
                <p className="text-[16px] text-[#64748B] leading-[1.7] mb-8 max-w-lg">
                  ZODO's AI engine continuously analyzes your pipeline, predicts outcomes,
                  and surfaces the next best action — without you asking.
                </p>

                <div className="space-y-4">
                  {[
                    { title: 'Predictive Revenue', desc: 'ML-driven forecasting that improves with every deal.' },
                    { title: 'Smart Follow-ups', desc: 'AI schedules optimal outreach timing for each lead.' },
                    { title: 'Risk Detection', desc: 'Spots at-risk deals and stalled pipelines in real-time.' },
                    { title: 'Automated Insights', desc: 'Daily business summaries with actionable recommendations.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3.5">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: 'linear-gradient(135deg, rgba(46,196,199,0.12), rgba(107,203,119,0.12))' }}>
                        <Check size={12} className="text-[#2EC4C7]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-semibold text-[#0F172A]">{item.title}</h4>
                        <p className="text-[13px] text-[#64748B] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="relative">
                <div className="absolute -inset-6 rounded-[30px] opacity-[0.1]"
                  style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77)', filter: 'blur(50px)' }} />
                <div className="relative space-y-3">
                  {/* AI Insight Cards */}
                  {[
                    { label: 'Pipeline Risk Score', value: 'Medium', badge: 'AI Insight', color: '#F6C945', msg: '3 leads stalled >5 days — suggested follow-up generated' },
                    { label: 'Revenue Prediction', value: '+22% Q2', badge: 'Forecast', color: '#6BCB77', msg: 'Based on current pipeline velocity and historical patterns' },
                    { label: 'Smart Action', value: 'Contact 2 leads', badge: 'Priority', color: '#2EC4C7', msg: 'Optimal outreach window: Today 2–4 PM based on engagement data' },
                  ].map((card, i) => (
                    <div key={i} className="rounded-[16px] p-5 border border-white/60"
                      style={{
                        background: 'rgba(255,255,255,0.72)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        animationDelay: `${i * 100}ms`,
                      }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider">{card.label}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ color: card.color, background: `${card.color}12`, border: `1px solid ${card.color}20` }}>
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-[#0F172A] mb-1" style={{ letterSpacing: '-0.02em' }}>{card.value}</p>
                      <p className="text-[12px] text-[#64748B] leading-relaxed">{card.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========================================
          PRODUCT MODULES — Stripe-style grid
          ======================================== */}
      <section id="modules" className="py-28 relative overflow-hidden">
        <div className="absolute -left-40 bottom-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #F6C945 0%, transparent 70%)', filter: 'blur(100px)' }} />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <p className="text-[12px] font-semibold text-[#2EC4C7] uppercase tracking-[0.12em] mb-3">Product</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-4" style={{ letterSpacing: '-0.03em' }}>
              One platform, every workflow
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-xl mx-auto leading-[1.7]">
              Manage your entire business from a single, beautiful interface.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Target, title: 'CRM & Leads', desc: 'Full lifecycle pipeline management with AI scoring, automation, and smart views.', tag: 'Core' },
              { icon: FileText, title: 'Projects & Tasks', desc: 'Kanban boards, task dependencies, time tracking, and team collaboration tools.', tag: 'Productivity' },
              { icon: CreditCard, title: 'Finance & Invoicing', desc: 'Estimates, invoices, payment tracking, and revenue dashboards in one place.', tag: 'Finance' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Custom dashboards, automated reports, and drill-down business intelligence.', tag: 'Intelligence' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="p-7 rounded-[20px] border border-white/60 h-full transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(46,196,199,0.08), rgba(107,203,119,0.08))' }}>
                      <item.icon size={22} className="text-[#2EC4C7]" strokeWidth={1.75} />
                    </div>
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-2.5 py-1 rounded-full border border-black/[0.04]">{item.tag}</span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#0F172A] mb-2" style={{ letterSpacing: '-0.01em' }}>{item.title}</h3>
                  <p className="text-[14px] text-[#64748B] leading-[1.65]">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          DASHBOARD SHOWCASE — Stripe floating UI
          ======================================== */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77, #F6C945)', filter: 'blur(100px)' }} />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-4" style={{ letterSpacing: '-0.03em' }}>
              See ZODO in action
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-xl mx-auto leading-[1.7]">
              A clean, data-dense interface designed for all-day productivity.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="rounded-[24px] p-2 border border-white/60"
              style={{
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
              }}>
              <div className="rounded-[18px] overflow-hidden border border-black/[0.04]"
                style={{ background: 'white' }}>
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/[0.04]" style={{ background: '#FAFBFD' }}>
                  <div className="flex gap-1.5">
                    <div className="w-[10px] h-[10px] rounded-full bg-[#FCA5A5]" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#FDE68A]" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#86EFAC]" />
                  </div>
                  <div className="flex-1 mx-16">
                    <div className="bg-white rounded-md px-3 py-1 text-[10px] text-[#94A3B8] border border-black/[0.04] text-center max-w-xs mx-auto">
                      crm.zodo.ca/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="flex min-h-[320px]">
                  {/* Sidebar */}
                  <div className="w-44 border-r border-black/[0.04] p-3 space-y-0.5 hidden lg:block" style={{ background: '#FAFBFD' }}>
                    {['Dashboard', 'Leads', 'Clients', 'Projects', 'Tasks', 'Analytics', 'Settings'].map((item, i) => (
                      <div key={i} className={cx(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium',
                        i === 0 ? 'text-[#2EC4C7]' : 'text-[#94A3B8]'
                      )} style={i === 0 ? { background: 'rgba(46,196,199,0.06)' } : {}}>
                        {i === 0 && <div className="w-[3px] h-3.5 bg-[#2EC4C7] rounded-full -ml-3 mr-0.5" />}
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main */}
                  <div className="flex-1 p-5">
                    {/* AI Hero */}
                    <div className="border-l-[3px] border-[#2EC4C7] rounded-[10px] p-3.5 mb-4" style={{ background: 'rgba(46,196,199,0.03)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-[#2EC4C7]" />
                        <span className="text-[11px] font-semibold text-[#0F172A]">AI Business Overview</span>
                        <span className="text-[8px] font-bold text-[#2EC4C7] bg-[#2EC4C7]/8 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { l: 'Pipeline', v: 'Strong', c: '#16A34A' },
                          { l: 'Revenue', v: '+18%', c: '#2EC4C7' },
                          { l: 'Alerts', v: '4', c: '#F3722C' },
                          { l: 'Score', v: '92%', c: '#7C3AED' },
                        ].map((k, i) => (
                          <div key={i}>
                            <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-medium">{k.l}</p>
                            <p className="text-[14px] font-bold mt-0.5" style={{ color: k.c }}>{k.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPI row */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { v: '24', l: 'Projects', c: '#2EC4C7' },
                        { v: '$8.2k', l: 'Revenue', c: '#F3722C' },
                        { v: '156', l: 'Clients', c: '#6BCB77' },
                        { v: '7', l: 'Tasks', c: '#7C3AED' },
                      ].map((k, i) => (
                        <div key={i} className="p-2.5 rounded-[8px] border border-black/[0.04]">
                          <p className="text-[15px] font-bold" style={{ color: k.c }}>{k.v}</p>
                          <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-medium mt-0.5">{k.l}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className="h-20 rounded-[10px] border border-black/[0.04] flex items-end px-3 pb-2 gap-[3px]" style={{ background: '#FAFBFD' }}>
                      {[35, 48, 32, 58, 44, 68, 55, 75, 62, 82, 78, 90].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-[2px]" style={{
                          height: `${h}%`,
                          background: i >= 9 ? 'linear-gradient(180deg, #2EC4C7, #6BCB77)' : 'rgba(226,232,240,0.5)',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ========================================
          TESTIMONIALS
          ======================================== */}
      <section className="py-28 relative">
        <div className="max-w-[1200px] mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-4" style={{ letterSpacing: '-0.03em' }}>
              Loved by teams everywhere
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'ZODO replaced three tools for us. The AI insights alone save our team 10 hours per week on pipeline analysis.', name: 'Sarah Chen', role: 'VP Sales', company: 'TechFlow' },
              { quote: 'Finally a CRM that understands enterprise needs. Clean interface, powerful automation, and remarkably accurate predictions.', name: 'Marcus Rivera', role: 'CEO', company: 'DataSync' },
              { quote: 'The data density makes it feel like a Bloomberg terminal for sales. Our team adopted it within a week.', name: 'Emily Park', role: 'Head of Revenue', company: 'CloudNine' },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="p-6 rounded-[20px] border border-white/60 h-full flex flex-col"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, si) => (
                      <div key={si} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(246,201,69,0.12)' }}>
                        <span className="text-[8px]" style={{ color: '#F6C945' }}>★</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[14px] text-[#475569] leading-[1.7] flex-1 mb-5">"{t.quote}"</p>
                  <div className="border-t border-black/[0.04] pt-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77)' }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0F172A]">{t.name}</p>
                      <p className="text-[11px] text-[#94A3B8]">{t.role} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          PRICING
          ======================================== */}
      <section id="pricing" className="py-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #F3722C 0%, transparent 70%)', filter: 'blur(100px)' }} />

        <div className="max-w-[1000px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[#0F172A] mb-4" style={{ letterSpacing: '-0.03em' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-lg mx-auto leading-[1.7]">
              Start free. Scale as you grow. No surprises.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter', price: '$0', period: '/mo',
                desc: 'For small teams getting started',
                features: ['Up to 5 users', '500 contacts', 'Basic analytics', 'Email support'],
                cta: 'Start Free', popular: false
              },
              {
                name: 'Professional', price: '$49', period: '/user/mo',
                desc: 'For growing businesses',
                features: ['Unlimited users', 'AI Business Insights', 'Advanced automation', 'Priority support', 'Custom reports'],
                cta: 'Start Trial', popular: true
              },
              {
                name: 'Enterprise', price: 'Custom', period: '',
                desc: 'For large organizations',
                features: ['Everything in Pro', 'Dedicated infra', 'SSO & SAML', 'SLA guarantee', 'Custom integrations', 'Onboarding'],
                cta: 'Contact Sales', popular: false
              },
            ].map((plan, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className={cx(
                  'rounded-[20px] p-7 h-full flex flex-col transition-all duration-300',
                  plan.popular ? 'relative' : ''
                )}
                  style={plan.popular ? {
                    background: '#0F172A',
                    boxShadow: '0 8px 40px rgba(15,23,42,0.15)',
                  } : {
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-bold text-white px-3 py-1 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77)' }}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className={cx('text-[17px] font-bold mb-1', plan.popular ? 'text-white' : 'text-[#0F172A]')}>{plan.name}</h3>
                  <p className={cx('text-[12px] mb-5', plan.popular ? 'text-[#94A3B8]' : 'text-[#64748B]')}>{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={cx('text-[36px] font-extrabold', plan.popular ? 'text-white' : 'text-[#0F172A]')} style={{ letterSpacing: '-0.03em' }}>{plan.price}</span>
                    {plan.period && <span className={cx('text-[13px]', plan.popular ? 'text-[#94A3B8]' : 'text-[#64748B]')}>{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={plan.popular
                            ? { background: 'rgba(46,196,199,0.15)' }
                            : { background: 'rgba(46,196,199,0.08)' }}>
                          <Check size={9} className="text-[#2EC4C7]" strokeWidth={3} />
                        </div>
                        <span className={cx('text-[13px]', plan.popular ? 'text-[#CBD5E1]' : 'text-[#475569]')}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/signup')}
                    className={cx(
                      'w-full py-3 rounded-[10px] text-[13px] font-semibold transition-all duration-200',
                      plan.popular
                        ? 'bg-white text-[#0F172A] hover:bg-[#F1F5F9]'
                        : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'
                    )}
                    style={{ boxShadow: plan.popular ? 'none' : '0 1px 2px rgba(0,0,0,0.1)' }}
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
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] rounded-full opacity-[0.08]"
            style={{ background: 'linear-gradient(135deg, #2EC4C7, #6BCB77, #F6C945, #F3722C)', filter: 'blur(120px)' }} />
        </div>

        <div className="max-w-[680px] mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/[0.06] mb-6"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
              <Sparkles size={13} className="text-[#2EC4C7]" />
              <span className="text-[12px] font-semibold text-[#475569] tracking-wide">Ready to upgrade?</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-[#0F172A] mb-5" style={{ letterSpacing: '-0.035em', lineHeight: 1.1 }}>
              Start making intelligent<br />decisions today
            </h2>
            <p className="text-[16px] text-[#64748B] mb-8 max-w-md mx-auto leading-[1.7]">
              Join hundreds of teams using ZODO to manage leads,
              close deals, and grow revenue with AI.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-8 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
              >
                Get Started Free <ArrowRight size={15} />
              </button>
              <button
                onClick={() => scrollTo('#pricing')}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] px-6 py-3.5 rounded-[12px] border border-black/[0.08] transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}
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
      <footer className="py-14 border-t border-black/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="ZODO" className="h-8 w-auto" />
              </div>
              <p className="text-[13px] text-[#64748B] leading-[1.7] max-w-sm">
                AI-powered CRM platform for modern enterprises.
                Manage leads, clients, and revenue intelligently.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'AI Platform', 'Pricing', 'Integrations', 'Changelog'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press', 'Contact'] },
              { title: 'Resources', links: ['Docs', 'API', 'Status', 'Security', 'Privacy'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[11px] font-semibold text-[#0F172A] uppercase tracking-[0.1em] mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors duration-200">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-black/[0.04] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#94A3B8]">© 2026 ZODO. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Privacy</a>
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Terms</a>
              <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors">Cookies</a>
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