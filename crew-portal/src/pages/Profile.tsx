import { useEffect, useState } from 'react';
import { crewApi, getCurrentUser, logout } from '../api';
import { Loader2, LogOut, Mail, Phone, Calendar, Shield } from 'lucide-react';

export default function ProfilePage() {
    const user = getCurrentUser();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await crewApi.getProfile();
                setProfile(data);
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="loading"><Loader2 size={28} className="spinner" /></div>;

    const u = profile?.user || {};
    const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="page">
            <div className="page-header">
                <h1>My Profile</h1>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 16 }}>
                <div className="profile-avatar">{initials}</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{u.firstName} {u.lastName}</h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{profile?.position || profile?.department || 'Crew Member'}</p>
                {profile?.role && (
                    <span className="badge badge-active" style={{ marginTop: 8 }}><Shield size={10} /> {profile.role.name}</span>
                )}
            </div>

            <div className="detail-section">
                <h3>Contact Details</h3>
                {u.email && (
                    <div className="detail-row">
                        <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> Email</span>
                        <span className="detail-value">{u.email}</span>
                    </div>
                )}
                {u.phone && (
                    <div className="detail-row">
                        <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> Phone</span>
                        <span className="detail-value">{u.phone}</span>
                    </div>
                )}
            </div>

            <div className="detail-section">
                <h3>Employment</h3>
                {profile?.employeeNumber && <div className="detail-row"><span className="detail-label">Employee #</span><span className="detail-value">{profile.employeeNumber}</span></div>}
                {profile?.department && <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{profile.department}</span></div>}
                {profile?.position && <div className="detail-row"><span className="detail-label">Position</span><span className="detail-value">{profile.position}</span></div>}
                {profile?.hireDate && (
                    <div className="detail-row">
                        <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Hire Date</span>
                        <span className="detail-value">{new Date(profile.hireDate).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748B' }}>{user?.tenantName || 'ZODO CRM'}</span>
            </div>

            <button className="btn btn-danger btn-lg" style={{ marginTop: 24 }} onClick={logout}>
                <LogOut size={16} /> Sign Out
            </button>
        </div>
    );
}
