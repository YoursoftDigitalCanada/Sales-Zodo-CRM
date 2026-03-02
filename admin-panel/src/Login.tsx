import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from './api';
import { Shield, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await adminLogin(email, password);
            const { token, admin } = res.data.data;
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_user', JSON.stringify(admin));
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}>
            <div style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                    }}>
                        <Shield size={28} color="#0f172a" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        Admin Console
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        ZODO CRM — Internal Management
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        color: '#ef4444',
                        fontSize: '0.875rem',
                        marginBottom: '1rem',
                        textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@zodo.ca"
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#475569', marginTop: '1.5rem' }}>
                    Authorized personnel only
                </p>
            </div>
        </div>
    );
}
