import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, CreditCard,
  Server, LogOut, Shield, ChevronLeft, Menu, Headphones
} from 'lucide-react';
import './index.css';

import LoginPage from './Login';
import Dashboard from './Dashboard';
import TenantsPage from './Tenants';
import RevenuePage from './Revenue';
import SubscriptionsPage from './Subscriptions';
import SystemHealthPage from './SystemHealth';
import SupportTicketsPage from './SupportTickets';

/* ── Auth Guard ───────────────────────────────────────────────────── */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ── Sidebar ──────────────────────────────────────────────────────── */
const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  { to: '/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/support-tickets', label: 'Support Tickets', icon: Headphones },
  { to: '/system', label: 'System Health', icon: Server },
];

function Sidebar({ collapsed, toggle }: { collapsed: boolean; toggle: () => void }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <div className="sidebar" style={{ width: collapsed ? 64 : 260, transition: 'width 0.2s' }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Shield size={18} color="#0f172a" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>ZODO Admin</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Internal Console</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: collapsed ? '0.7rem' : '0.7rem 1rem',
              borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 500,
              color: isActive ? '#06b6d4' : '#94a3b8',
              background: isActive ? 'rgba(6,182,212,0.1)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}
          >
            <item.icon size={18} />
            {!collapsed && <span className="nav-text">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        {!collapsed && admin.email && (
          <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{admin.firstName} {admin.lastName}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{admin.email}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={toggle} className="btn btn-ghost" style={{ flex: collapsed ? 1 : 0, padding: '0.5rem', justifyContent: 'center' }}>
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
          {!collapsed && (
            <button onClick={logout} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Layout ───────────────────────────────────────────────────────── */
function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
      <main className="main-content" style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Layout><TenantsPage /></Layout></ProtectedRoute>} />
        <Route path="/revenue" element={<ProtectedRoute><Layout><RevenuePage /></Layout></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Layout><SubscriptionsPage /></Layout></ProtectedRoute>} />
        <Route path="/support-tickets" element={<ProtectedRoute><Layout><SupportTicketsPage /></Layout></ProtectedRoute>} />
        <Route path="/system" element={<ProtectedRoute><Layout><SystemHealthPage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
