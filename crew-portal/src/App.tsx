import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { isAuthenticated } from './api';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import MyJobsPage from './pages/MyJobs';
import JobDetailPage from './pages/JobDetail';
import TimeSheetPage from './pages/TimeSheet';
import ProfilePage from './pages/Profile';
import { LayoutDashboard, Briefcase, Clock, User } from 'lucide-react';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      {children}
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
        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
          <User /><span>Profile</span>
        </NavLink>
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
        <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
