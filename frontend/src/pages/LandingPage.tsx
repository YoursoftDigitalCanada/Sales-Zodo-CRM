import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Menu, X, Play, Check,
  MapPin, Brain, Ruler, FileText,
  LayoutGrid, Receipt, Calendar, Users, DollarSign, CreditCard,
  Twitter, Facebook, Linkedin, Instagram,
  Sparkles, Zap, TrendingUp, Shield,
  ChevronRight, Star
} from 'lucide-react';
import logo from '../Images/Logo/logo.png';
import dashboardMockup from '../Images/dashboard-mockup.png';

/* ============================================
   DESIGN TOKENS
   ============================================ */
const T = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceTint: '#F0FDFA',
  primary: '#0891B2',
  primaryDark: '#0E7490',
  accent: '#22D3EE',
  amber: '#D97706',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: 'rgba(15,23,42,0.06)',
  shadow: '0 8px 40px rgba(19,27,46,0.06)',
  shadowHover: '0 16px 48px rgba(19,27,46,0.10)',
  shadowSoft: '0 2px 16px rgba(19,27,46,0.04)',
};

/* ============================================
   UTILITIES
   ============================================ */
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
      transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

/* Card wrapper */
function Card({ children, className = '', highlight = false, style = {} }: {
  children: React.ReactNode; className?: string; highlight?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div
      className={cx('bg-white rounded-2xl transition-all duration-200', className)}
      style={{
        boxShadow: T.shadowSoft,
        border: highlight ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
        ...style,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowSoft;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {children}
    </div>
  );
}

/* Section wrapper */
function Section({ children, id, bg = T.bg, className = '' }: {
  children: React.ReactNode; id?: string; bg?: string; className?: string;
}) {
  return (
    <section id={id} className={cx('py-20 lg:py-28 relative', className)} style={{ background: bg }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {children}
      </div>
    </section>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <FadeIn className="text-center mb-16">
      <h2
        className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-extrabold mb-4"
        style={{ color: T.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.15 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-[17px] max-w-xl mx-auto leading-relaxed" style={{ color: T.textSecondary }}>
          {subtitle}
        </p>
      )}
    </FadeIn>
  );
}

/* Primary button */
function PrimaryBtn({ children, onClick, className = '' }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 text-[15px] font-bold text-white px-7 py-3.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
        className
      )}
      style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
    >
      {children}
    </button>
  );
}

function OutlineBtn({ children, onClick, className = '', dark = false }: {
  children: React.ReactNode; onClick?: () => void; className?: string; dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 text-[15px] font-bold px-7 py-3.5 rounded-lg border-2 transition-all duration-200 hover:shadow-md',
        dark ? 'text-white border-white/30 hover:bg-white/10' : 'border-gray-200 hover:border-gray-300',
        className
      )}
      style={dark ? {} : { color: T.textPrimary, background: T.surface }}
    >
      {children}
    </button>
  );
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
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

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'AI Estimator', href: '#ai-estimator' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Demo', href: '#demo' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{
      fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      background: T.bg,
    }}>

      {/* ========================================
          NAVBAR
          ======================================== */}
      <nav className={cx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm'
          : 'bg-white/60 backdrop-blur-md'
      )} style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-[72px]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="ZODO" className="h-9 w-auto" />
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(item => (
              <button
                key={item.label}
                onClick={() => scrollTo(item.href)}
                className="px-4 py-2 text-[14px] font-semibold transition-colors duration-200 rounded-lg hover:bg-gray-50"
                style={{ color: T.textSecondary }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[14px] font-semibold px-4 py-2 transition-colors duration-200 rounded-lg hover:bg-gray-50"
              style={{ color: T.textSecondary }}
            >
              Sign In
            </button>
            <PrimaryBtn onClick={() => navigate('/signup')}>
              Start Free
            </PrimaryBtn>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2" style={{ color: T.textSecondary }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white px-6 py-4 space-y-1 shadow-lg" style={{ borderTop: `1px solid ${T.border}` }}>
            {navLinks.map(item => (
              <button key={item.label} onClick={() => scrollTo(item.href)}
                className="block w-full text-left text-[14px] py-2.5 font-semibold" style={{ color: T.textSecondary }}>{item.label}</button>
            ))}
            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => navigate('/login')} className="text-[14px] font-semibold py-2" style={{ color: T.textSecondary }}>Sign In</button>
              <PrimaryBtn onClick={() => navigate('/signup')} className="justify-center w-full">Start Free</PrimaryBtn>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================
          SECTION 1: HERO
          ======================================== */}
      <section className="relative pt-[100px] pb-16 lg:pt-[120px] lg:pb-24 overflow-hidden" style={{ background: '#F1F5F9' }}>
        {/* Decorative gradient blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: T.primary }} />
        <div className="absolute bottom-[-50px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[80px]"
          style={{ background: T.amber }} />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[520px]">
            {/* Left — Copy */}
            <FadeIn>
              <div className="space-y-6">
                <span
                  className="inline-flex items-center gap-2 text-[13px] font-bold px-4 py-1.5 rounded-full"
                  style={{ background: `${T.primary}12`, color: T.primary }}
                >
                  <Sparkles size={14} /> AI-Powered Roofing CRM
                </span>

                <h1
                  className="text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.08] font-extrabold"
                  style={{ color: T.textPrimary, letterSpacing: '-0.03em' }}
                >
                  Create Roofing{' '}
                  <span style={{ color: T.primary }}>Estimates in Seconds</span>{' '}
                  with AI
                </h1>

                <p className="text-[17px] leading-[1.7] max-w-[480px]" style={{ color: T.textSecondary }}>
                  Enter a property address and get instant, accurate estimates—no manual measurements, no guesswork.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <PrimaryBtn onClick={() => navigate('/signup')}>
                    Create Free Estimate <ArrowRight size={16} />
                  </PrimaryBtn>
                  <OutlineBtn onClick={() => scrollTo('#demo')}>
                    <Play size={16} className="fill-current" /> Watch Demo
                  </OutlineBtn>
                </div>

                <p className="text-[13px] font-medium" style={{ color: T.textMuted }}>
                  ✓ No credit card required &nbsp;·&nbsp; ✓ Free 14-day trial
                </p>
              </div>
            </FadeIn>

            {/* Right — AI Estimator Product Card */}
            <FadeIn delay={200}>
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-6 rounded-full opacity-[0.10] blur-[60px]"
                  style={{ background: `radial-gradient(circle, ${T.primary} 0%, transparent 70%)` }} />
                <div className="absolute -inset-12 rounded-full opacity-[0.06] blur-[80px]"
                  style={{ background: `radial-gradient(circle, ${T.amber} 0%, transparent 70%)` }} />

                <div className="relative bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(8,145,178,0.12)', border: `1px solid ${T.border}` }}>
                  {/* Card Header */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                      <span className="text-[14px] font-bold" style={{ color: T.textPrimary }}>AI Roof Estimator</span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: `${T.primary}12`, color: T.primary }}>LIVE</span>
                  </div>

                  {/* Address Input + Roof Overlay */}
                  <div className="relative px-5 pt-4">
                    {/* Simulated Address Input */}
                    <div className="flex items-center gap-2.5 bg-white rounded-lg px-3.5 py-2.5 mb-3" style={{ border: `1px solid ${T.border}`, boxShadow: T.shadowSoft }}>
                      <MapPin size={16} style={{ color: T.primary }} />
                      <span className="text-[13px] font-medium" style={{ color: T.textPrimary }}>742 Evergreen Terrace, Springfield</span>
                      <div className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold text-white" style={{ background: T.primary }}>Search</div>
                    </div>
                    <div className="relative rounded-xl overflow-hidden" style={{ background: '#E0F7FA', height: '180px' }}>
                      {/* Simulated aerial roof view with measurement overlays */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 400 180" className="w-full h-full">
                          {/* House outline */}
                          <polygon points="200,10 350,80 350,170 50,170 50,80" fill="#A5F3FC" opacity="0.4" stroke={T.primary} strokeWidth="2" />
                          <polygon points="200,10 350,80 200,60 50,80" fill="#22D3EE" opacity="0.25" stroke={T.primary} strokeWidth="1.5" />
                          {/* Roof sections */}
                          <polygon points="200,10 280,50 200,60 120,50" fill={T.primary} opacity="0.25" stroke={T.primary} strokeWidth="1" />
                          <polygon points="280,50 350,80 280,100 200,60" fill="#06B6D4" opacity="0.3" stroke={T.primary} strokeWidth="1" />
                          <polygon points="120,50 200,60 120,100 50,80" fill="#0E7490" opacity="0.2" stroke={T.primary} strokeWidth="1" />
                          {/* Measurement lines */}
                          <line x1="60" y1="85" x2="340" y2="85" stroke={T.primary} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
                          <line x1="200" y1="15" x2="200" y2="165" stroke={T.primary} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
                          {/* Labels */}
                          <rect x="150" y="20" width="100" height="20" rx="4" fill={T.primary} />
                          <text x="200" y="34" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Main Ridge</text>
                          <rect x="290" y="60" width="60" height="20" rx="4" fill="#0E7490" />
                          <text x="320" y="74" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Section A</text>
                          <rect x="50" y="60" width="60" height="20" rx="4" fill="#06B6D4" />
                          <text x="80" y="74" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Section B</text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Measurements Row */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    {[
                      { label: 'Total Area', value: '2,450 sq ft' },
                      { label: 'Pitch', value: '6/12' },
                      { label: 'Sections', value: '4' },
                    ].map((m, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.textMuted }}>{m.label}</p>
                        <p className="text-[15px] font-bold" style={{ color: T.textPrimary }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="mx-5 mb-5 rounded-xl p-4" style={{ background: T.surfaceTint, border: `1px solid ${T.border}` }}>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Materials', value: '$8,200' },
                        { label: 'Labor', value: '$4,500' },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between text-[14px]">
                          <span style={{ color: T.textSecondary }}>{row.label}</span>
                          <span className="font-semibold" style={{ color: T.textPrimary }}>{row.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[16px] pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                        <span className="font-bold" style={{ color: T.textPrimary }}>Total Estimate</span>
                        <span className="text-[16px] font-extrabold" style={{ color: T.primary }}>$12,700</span>
                      </div>
                    </div>
                    <button
                      className="w-full mt-3 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all duration-200 hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                    >
                      Generate Estimate →
                    </button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ========================================
          SECTION 2: AI ESTIMATOR HIGHLIGHT
          ======================================== */}
      <Section id="ai-estimator" bg={T.surface}>
        <SectionHeader
          title="AI Roof Estimator That Works Like a Pro"
          subtitle="From address to estimate in under 60 seconds"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: 1, icon: MapPin, title: 'Enter Address', desc: 'Type in any property address to get started' },
            { step: 2, icon: Brain, title: 'AI Analyzes Roof', desc: 'Automatically pulls satellite imagery and detects roof structure' },
            { step: 3, icon: Ruler, title: 'Generates Measurements', desc: 'Calculates area, pitch, and dimensions instantly' },
            { step: 4, icon: FileText, title: 'Builds Estimate', desc: 'Creates a professional quote with accurate pricing' },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 100}>
              <Card className="p-7 text-center h-full relative overflow-hidden">
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center text-[12px] font-extrabold text-white rounded-b-lg"
                  style={{ background: T.primary }}
                >
                  {s.step}
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mt-6 mb-4"
                  style={{ background: `${T.primary}10` }}
                >
                  <s.icon size={26} style={{ color: T.primary }} strokeWidth={1.75} />
                </div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: T.textPrimary }}>{s.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: T.textSecondary }}>{s.desc}</p>
              </Card>
            </FadeIn>
          ))}
        </div>

        {/* Benefit pills */}
        <FadeIn delay={400}>
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {['No manual measuring', 'Faster quotes', 'Higher accuracy', 'Win more jobs'].map((b, i) => (
              <span key={i} className="text-[13px] font-semibold px-5 py-2 rounded-full"
                style={{ background: `${T.primary}08`, color: T.primary, border: `1px solid ${T.primary}20` }}>
                ✓ {b}
              </span>
            ))}
          </div>
        </FadeIn>
      </Section>

      {/* ========================================
          SECTION 3: PROBLEM → SOLUTION
          ======================================== */}
      <Section bg={T.surfaceTint}>
        <SectionHeader title="Stop Losing Jobs to Slow Estimates" />

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Problems */}
          <FadeIn>
            <Card className="p-8 h-full" style={{ boxShadow: T.shadowSoft }}>
              <h3 className="text-[18px] font-bold mb-6" style={{ color: '#DC2626' }}>
                ❌ The Old Way
              </h3>
              <div className="space-y-4">
                {[
                  'Driving to every site just to measure',
                  'Spending hours on manual calculations',
                  'Losing bids because quotes take too long',
                  'Forgetting to bill for extra work',
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#FEE2E2' }}>
                      <X size={12} style={{ color: '#DC2626' }} strokeWidth={3} />
                    </div>
                    <p className="text-[15px]" style={{ color: T.textSecondary }}>{p}</p>
                  </div>
                ))}
              </div>
            </Card>
          </FadeIn>

          {/* Solutions */}
          <FadeIn delay={150}>
            <Card className="p-8 h-full" highlight style={{ boxShadow: T.shadowSoft }}>
              <h3 className="text-[18px] font-bold mb-6" style={{ color: T.primary }}>
                ✨ The ZODO Way
              </h3>
              <div className="space-y-4">
                {[
                  'AI-powered remote measurements in seconds',
                  'Instant automated estimates from any address',
                  'Send quotes in minutes, not days',
                  'Auto-generated invoices from every job',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${T.primary}15` }}>
                      <Check size={12} style={{ color: T.primary }} strokeWidth={3} />
                    </div>
                    <p className="text-[15px]" style={{ color: T.textSecondary }}>{s}</p>
                  </div>
                ))}
              </div>
            </Card>
          </FadeIn>
        </div>

        <FadeIn delay={300}>
          <div className="text-center mt-10">
            <PrimaryBtn onClick={() => navigate('/signup')}>
              Try AI Estimator Free <ArrowRight size={16} />
            </PrimaryBtn>
          </div>
        </FadeIn>
      </Section>

      {/* ========================================
          SECTION 4: FEATURES GRID
          ======================================== */}
      <Section id="features" bg={T.bg}>
        <SectionHeader
          title="Everything You Need to Run Your Roofing Business"
          subtitle="From first estimate to final payment—all in one platform"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: 'AI Roof Estimator', desc: 'Enter an address, get instant measurements and pricing', highlight: true, badge: 'AI POWERED' },
            { icon: LayoutGrid, title: 'Job Pipeline', desc: 'Track every job from lead to completion with drag-and-drop Kanban', highlight: false },
            { icon: Receipt, title: 'Auto Invoice Builder', desc: 'Generate professional invoices directly from completed jobs', highlight: false },
            { icon: Calendar, title: 'Site Visit Scheduling', desc: 'Book and manage site visits with integrated calendar', highlight: false },
            { icon: Users, title: 'Client Management', desc: 'Full CRM with contact history, notes, and communications', highlight: false },
            { icon: CreditCard, title: 'Payments Tracking', desc: 'Monitor payments, outstanding balances, and revenue', highlight: false },
          ].map((f, i) => (
            <FadeIn key={i} delay={i * 80}>
              <Card
                className={cx('p-7 h-full', f.highlight ? 'relative overflow-hidden' : '')}
                highlight={f.highlight}
              >
                {f.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${T.primaryDark}, ${T.primary})` }} />
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.highlight ? `${T.primary}15` : `${T.primary}08` }}
                >
                  <f.icon size={24} style={{ color: T.primary }} strokeWidth={1.75} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-[16px] font-bold" style={{ color: T.textPrimary }}>{f.title}</h3>
                  {f.badge && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                      style={{ background: `${T.primary}15`, color: T.primary }}>{f.badge}</span>
                  )}
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: T.textSecondary }}>{f.desc}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ========================================
          SECTION 5: HOW IT WORKS
          ======================================== */}
      <Section bg={T.surfaceTint}>
        <SectionHeader title="Get Paid in 4 Simple Steps" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { num: '1', icon: Sparkles, title: 'Create Estimate', desc: 'Use AI or build manually' },
            { num: '2', icon: ArrowRight, title: 'Send to Client', desc: 'Professional proposals via email' },
            { num: '3', icon: Zap, title: 'Convert to Job', desc: 'One-click job creation' },
            { num: '4', icon: DollarSign, title: 'Get Paid', desc: 'Auto invoice and collect payment' },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="text-center relative">
                {/* Connector */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-8 -right-3 w-6">
                    <ChevronRight size={20} style={{ color: T.textMuted }} />
                  </div>
                )}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                >
                  <span className="text-[22px] font-extrabold text-white">{s.num}</span>
                </div>
                <h3 className="text-[16px] font-bold mb-1" style={{ color: T.textPrimary }}>{s.title}</h3>
                <p className="text-[14px]" style={{ color: T.textSecondary }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ========================================
          SECTION 6: PRODUCT PREVIEW
          ======================================== */}
      <Section id="demo" bg={T.bg}>
        <SectionHeader
          title="Built for Roofers, Loved by Roofers"
          subtitle="A powerful, intuitive interface designed for modern roofing businesses"
        />

        <FadeIn>
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 32px 80px rgba(102,55,244,0.10)', border: `1px solid ${T.border}` }}>
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-5 py-3" style={{ background: T.surfaceTint, borderBottom: `1px solid ${T.border}` }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#FF6B6B' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#FFD93D' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#6BCB77' }} />
              </div>
              <div className="flex-1 mx-12">
                <div className="bg-white rounded-md px-4 py-1.5 text-[12px] font-medium text-center max-w-xs mx-auto" style={{ color: T.textMuted, border: `1px solid ${T.border}` }}>
                  crm.zodo.ca/dashboard
                </div>
              </div>
            </div>
            <img
              src={dashboardMockup}
              alt="ZODO CRM Dashboard Preview"
              className="w-full"
              style={{ objectFit: 'cover', maxHeight: '520px' }}
            />
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="text-center mt-10">
            <PrimaryBtn onClick={() => navigate('/signup')}>
              Start Your Free Trial <ArrowRight size={16} />
            </PrimaryBtn>
          </div>
        </FadeIn>
      </Section>

      {/* ========================================
          SECTION 7: VALUE METRICS
          ======================================== */}
      <Section bg={T.surface}>
        <SectionHeader title="The Results Speak for Themselves" />

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { metric: '10x', label: 'Faster Estimates', desc: 'What used to take hours now takes seconds' },
            { metric: '3x', label: 'More Jobs Closed', desc: 'Faster quotes mean winning more bids' },
            { metric: '$0', label: 'Revenue Missed', desc: 'Auto invoicing captures every dollar' },
          ].map((m, i) => (
            <FadeIn key={i} delay={i * 100}>
              <Card className="p-8 text-center h-full">
                <p className="text-[48px] font-extrabold mb-1" style={{ color: T.primary, letterSpacing: '-0.04em' }}>{m.metric}</p>
                <p className="text-[17px] font-bold mb-2" style={{ color: T.textPrimary }}>{m.label}</p>
                <p className="text-[14px]" style={{ color: T.textSecondary }}>{m.desc}</p>
              </Card>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={300}>
          <p className="text-[14px] font-medium text-center mt-10" style={{ color: T.textMuted }}>
            Join hundreds of roofing contractors already using ZODO
          </p>
        </FadeIn>
      </Section>

      {/* ========================================
          SECTION 8: PRICING
          ======================================== */}
      <Section id="pricing" bg={T.surfaceTint}>
        <SectionHeader
          title="Simple, Transparent Pricing"
          subtitle="No hidden fees. Cancel anytime."
        />

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Starter */}
          <FadeIn>
            <Card className="p-8 h-full flex flex-col">
              <h3 className="text-[22px] font-bold mb-1" style={{ color: T.textPrimary }}>Starter</h3>
              <p className="text-[14px] mb-5" style={{ color: T.textSecondary }}>Perfect for small roofing businesses</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[42px] font-extrabold" style={{ color: T.textPrimary, letterSpacing: '-0.04em' }}>$49</span>
                <span className="text-[15px] font-medium" style={{ color: T.textMuted }}>/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Up to 50 estimates/month',
                  'Job pipeline management',
                  'Invoice builder',
                  'Client management',
                  'Site visit scheduling',
                  'Email support',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${T.primary}10` }}>
                      <Check size={11} style={{ color: T.primary }} strokeWidth={3} />
                    </div>
                    <span className="text-[14px]" style={{ color: T.textSecondary }}>{f}</span>
                  </li>
                ))}
              </ul>
              <OutlineBtn onClick={() => navigate('/signup')} className="w-full justify-center">
                Start Free Trial
              </OutlineBtn>
            </Card>
          </FadeIn>

          {/* Pro — Highlighted */}
          <FadeIn delay={100}>
            <Card className="p-8 h-full flex flex-col relative overflow-hidden" highlight>
              {/* Most Popular badge */}
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${T.primaryDark}, ${T.primary})` }} />
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-[22px] font-bold" style={{ color: T.textPrimary }}>Pro</h3>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white"
                  style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>MOST POPULAR</span>
              </div>
              <p className="text-[14px] mb-5" style={{ color: T.textSecondary }}>For growing roofing companies</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[42px] font-extrabold" style={{ color: T.textPrimary, letterSpacing: '-0.04em' }}>$99</span>
                <span className="text-[15px] font-medium" style={{ color: T.textMuted }}>/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Everything in Starter',
                  { text: '✨ AI Roof Estimator', highlight: true },
                  'Unlimited estimates',
                  'Payments tracking',
                  'Priority support',
                  'Custom branding',
                  'Team collaboration',
                ].map((f, i) => {
                  const isObj = typeof f === 'object';
                  const text = isObj ? f.text : f;
                  const isHighlight = isObj && f.highlight;
                  return (
                    <li key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${T.primary}15` }}>
                        <Check size={11} style={{ color: T.primary }} strokeWidth={3} />
                      </div>
                      <span className={cx('text-[14px]', isHighlight ? 'font-bold' : '')}
                        style={{ color: isHighlight ? T.primary : T.textSecondary }}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <PrimaryBtn onClick={() => navigate('/signup')} className="w-full justify-center">
                Start Free Trial
              </PrimaryBtn>
            </Card>
          </FadeIn>
        </div>
      </Section>

      {/* ========================================
          SECTION 9: FINAL CTA
          ======================================== */}
      <section className="py-24 lg:py-32 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: '#22D3EE' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{ background: '#0E7490' }} />

        <div className="max-w-[700px] mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <h2
              className="text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold text-white mb-5"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.12 }}
            >
              Start Closing More Roofing Jobs Today
            </h2>
            <p className="text-[17px] text-white/80 mb-8 max-w-lg mx-auto leading-relaxed">
              Join thousands of contractors who save time and win more bids with ZODO's AI-powered roofing CRM.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 text-[15px] font-bold px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                style={{ background: T.surface, color: T.primary }}
              >
                Start Free <ArrowRight size={16} />
              </button>
              <OutlineBtn onClick={() => scrollTo('#demo')} dark>
                Book Demo
              </OutlineBtn>
            </div>
            <p className="text-[13px] font-medium text-white/50 mt-6">
              No credit card required · Setup in 2 minutes
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ========================================
          SECTION 10: FOOTER
          ======================================== */}
      <footer className="py-16" style={{ background: T.textPrimary }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <img src={logo} alt="ZODO" className="h-8 w-auto brightness-0 invert" />
              </div>
              <p className="text-[14px] leading-[1.8] max-w-xs mb-4" style={{ color: T.textMuted }}>
                The AI-powered roofing CRM that helps contractors create estimates in seconds, manage jobs, and get paid faster.
              </p>
              <div className="flex items-center gap-3">
                {[Twitter, Facebook, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.08)', color: T.textMuted }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = T.primary;
                      (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLAnchorElement).style.color = T.textMuted;
                    }}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'AI Estimator', 'Pricing', 'Demo', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[12px] font-bold uppercase tracking-[0.12em] mb-5" style={{ color: '#CBD5E1' }}>{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-[14px] transition-colors duration-200 hover:text-white" style={{ color: T.textMuted }}>{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[13px]" style={{ color: T.textMuted }}>© 2026 ZODO. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Cookies'].map(link => (
                <a key={link} href="#" className="text-[13px] transition-colors duration-200 hover:text-white" style={{ color: T.textMuted }}>{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}