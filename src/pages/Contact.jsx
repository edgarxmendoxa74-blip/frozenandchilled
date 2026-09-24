import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Facebook, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Contact = () => {
    const [storeSettings, setStoreSettings] = useState({
        store_name: 'Chilled And Frozen Hub',
        address: 'Caltex Road, Banaba South, Batangas City',
        contact: '09947246294 / 09949314800',
        open_time: '08:00',
        close_time: '19:00',
        logo_url: '/logo.png'
    });

    useEffect(() => {
        const fetchStoreSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
            if (data) setStoreSettings(data);
        };
        fetchStoreSettings();
    }, []);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minutes} ${ampm}`;
    };

    return (
        <div className="page-wrapper">
            <header className="app-header">
                <div className="container header-container">
                    <Link to="/" className="brand">
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Chilled And Frozen Logo" style={{ height: '60px' }} />
                    </Link>
                    <nav className="header-nav" style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/" className="nav-link">Home</Link>
                        <Link to="/contact" className="nav-link">Contact</Link>
                    </nav>
                </div>
            </header>

            <main className="container" style={{ padding: '80px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '15px' }}>Visit Us</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Trader • Supplier • Distributor</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '60px' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: '#f4f9f4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--primary)' }}>
                            <MapPin size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Our Location</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            {storeSettings.address}
                        </p>
                        <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, marginTop: '8px' }}>
                            Google Maps: CHILLED AND FROZEN HUB
                        </p>
                    </div>

                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: '#f4f9f4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--primary)' }}>
                            <Phone size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Contact Hotline</h3>
                        <p style={{ color: 'var(--text-dark)', fontSize: '1rem', fontWeight: 700, lineHeight: '1.6' }}>
                            ☎️ 09947246294<br />
                            ☎️ 09949314800
                        </p>
                    </div>

                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: '#f4f9f4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--primary)' }}>
                            <Clock size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Business Hours</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Open daily from:<br />
                            {formatTime(storeSettings.open_time)} - {formatTime(storeSettings.close_time)}
                        </p>
                    </div>
                </div>

                {/* Social Media Section */}
                <div style={{ background: 'var(--gradient-green)', color: 'white', borderRadius: '40px', padding: '60px', textAlign: 'center', boxShadow: 'var(--shadow-md)', border: '2px solid var(--secondary)' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: 900 }}>CHILLED AND FROZEN HUB</h2>
                    <p style={{
                        fontSize: '1.2rem',
                        color: 'var(--secondary)',
                        fontWeight: 800,
                        marginBottom: '30px',
                        letterSpacing: '1px'
                    }}>
                        TRADER • SUPPLIER • DISTRIBUTOR
                    </p>
                    <p style={{ marginBottom: '40px', color: 'rgba(255,255,255,0.9)' }}>Connect with us directly on Facebook Messenger for wholesale inquiries and fast checkout.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <a href="https://m.me/chilledandfrozenhubmeatshop" target="_blank" rel="noopener noreferrer" style={{ background: 'var(--secondary)', color: 'var(--primary-dark)', padding: '15px 30px', borderRadius: '50px', textDecoration: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Facebook size={20} />
                            Messenger Chat
                        </a>
                        <a href="tel:09947246294" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '15px 30px', borderRadius: '50px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Phone size={20} />
                            Call Us Now
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Contact;
