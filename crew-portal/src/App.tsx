import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isAuthenticated } from './api';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import MyJobsPage from './pages/MyJobs';
import JobDetailPage from './pages/JobDetail';
import TimeSheetPage from './pages/TimeSheet';
import ProfilePage from './pages/Profile';
import NotificationsPage from './pages/Notifications';
import ChecklistsPage from './pages/Checklists';
import SafetyPage from './pages/Safety';
import StatsPage from './pages/Stats';
import EquipmentPage from './pages/Equipment';
import LeavePage from './pages/Leave';
import DocumentsPage from './pages/Documents';
import TasksPage from './pages/Tasks';
import PayrollPage from './pages/Payroll';
import { LayoutDashboard, Briefcase, Clock, ListChecks, Menu, X, Bell, Shield, BarChart3, Wrench, Calendar, FileText, ClipboardCheck, User, DollarSign } from 'lucide-react';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function MoreMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;
  const items = [
    { icon: <Bell size={18} />, label: 'Notifications', path: '/notifications' },
    { icon: <ClipboardCheck size={18} />, label: 'Checklists', path: '/checklists' },
    { icon: <Shield size={18} />, label: 'Safety', path: '/safety' },
    { icon: <BarChart3 size={18} />, label: 'My Stats', path: '/stats' },
    { icon: <Wrench size={18} />, label: 'Equipment', path: '/equipment' },
    { icon: <DollarSign size={18} />, label: 'Payroll', path: '/payroll' },
    { icon: <Calendar size={18} />, label: 'Leave', path: '/leave' },
    { icon: <FileText size={18} />, label: 'Documents', path: '/documents' },
    { icon: <User size={18} />, label: 'Profile', path: '/profile' },
  ];
  return (
    <>
      <div className="more-overlay" onClick={onClose} />
      <div className="more-menu">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>More</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {items.map(item => (
            <button key={item.path} onClick={() => { navigate(item.path); onClose(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer', color: '#475569', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 500, transition: 'all 0.15s' }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="app-layout">
      {children}
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          <LayoutDashboard /><span>Home</span>
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => isActive ? 'active' : ''}>
          <Briefcase /><span>Jobs</span>
        </NavLink>
        <NavLink to="/time" className={({ isActive }) => isActive ? 'active' : ''}>
          <Clock /><span>Time</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
          <ListChecks /><span>Tasks</span>
        </NavLink>
        <button onClick={() => setMoreOpen(true)} className={moreOpen ? 'active' : ''} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          <Menu /><span>More</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><AppLayout><MyJobsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute><AppLayout><JobDetailPage /></AppLayout></ProtectedRoute>} />
        <Route path="/time" element={<ProtectedRoute><AppLayout><TimeSheetPage /></AppLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><AppLayout><TasksPage /></AppLayout></ProtectedRoute>} />
        <Route path="/payroll" element={<ProtectedRoute><AppLayout><PayrollPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/checklists" element={<ProtectedRoute><AppLayout><ChecklistsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/safety" element={<ProtectedRoute><AppLayout><SafetyPage /></AppLayout></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><AppLayout><StatsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><AppLayout><EquipmentPage /></AppLayout></ProtectedRoute>} />
        <Route path="/leave" element={<ProtectedRoute><AppLayout><LeavePage /></AppLayout></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><AppLayout><DocumentsPage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
