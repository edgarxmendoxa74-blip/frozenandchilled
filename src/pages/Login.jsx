import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Key, LogIn, ArrowLeft, X } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState(() => {
        return localStorage.getItem('rememberEmail') || '';
    });
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberEmail'));
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Validate inputs
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Email is required');
            return;
        }

        if (!password) {
            setError('Password is required');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        // DEVELOPMENT ONLY: Test admin account for local testing
        if (trimmedEmail === 'admin@chilledandfrozenhub.com' && password === 'admin123') {
            console.log('✅ Development test admin login');
            localStorage.setItem('admin_test_user', 'true');
            localStorage.setItem('admin_test_email', trimmedEmail);
            if (rememberMe) {
                localStorage.setItem('rememberEmail', trimmedEmail);
            }
            navigate('/admin/dashboard');
            return;
        }

        try {
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password,
            });
            
            if (loginError) {
                console.error('Login error:', loginError);
                if (loginError.message?.includes('Invalid login credentials')) {
                    setError('Invalid email or password. (Test: admin@chilledandfrozenhub.com / admin123)');
                } else {
                    setError(loginError.message || 'Login failed. Please try again.');
                }
                return;
            }

            if (data?.user) {
                console.log('Login successful');
                localStorage.removeItem('admin_test_user');
                if (rememberMe) {
                    localStorage.setItem('rememberEmail', trimmedEmail);
                }
                navigate('/admin/dashboard');
            }
        } catch (err) {
            console.error('Unexpected login error:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    return (
        <div className="login-page" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', background: 'white' }}>
            {/* Left Side - Brand/Hero */}
            <div style={{ position: 'relative', background: 'var(--primary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'url("/hero.jpg") no-repeat center center/cover', mixBlendMode: 'overlay' }}></div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white', padding: '40px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '30px', display: 'inline-block', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.3)' }}>
                        <img src="/logo.png" alt="Chilled and Frozen Hub Logo" style={{ height: '110px', display: 'block' }} />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: 900 }}>Chilled and Frozen Hub</h1>
                    <p style={{ fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.9, fontWeight: 700 }}>Trader • Supplier • Distributor</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', background: 'var(--bg)' }}>
                <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '10px' }}>
                            <Lock size={18} />
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Admin Portal</span>
                        </div>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>Welcome Back</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Sign in to manage your dashboard.</p>
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                            <div style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px' }}><X size={12} /></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@chilledandfrozenhub.com"
                                    style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'all 0.3s' }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'all 0.3s' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                Remember me
                            </label>
                            <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: '100%', padding: '15px', background: 'var(--primary)', color: 'var(--accent)', border: 'none', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s'
                            }}
                        >
                            <LogIn size={20} />
                            Sign In to Dashboard
                        </button>
                    </form>

                    <div style={{ marginTop: '40px', textAlign: 'center' }}>
                        <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                            <ArrowLeft size={16} /> Back to Website
                        </a>
                    </div>
                </div>
            </div>

            {/* CSS for responsive layout */}
            <style>{`
                @media (max-width: 900px) {
                    .login-page { grid-template-columns: 1fr !important; }
                    .login-page > div:first-child { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Login;
