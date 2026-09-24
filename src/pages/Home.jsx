import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    MapPin,
    Phone,
    Facebook,
    Clock,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const Home = () => {
    const [storeSettings, setStoreSettings] = useState({
        manual_status: 'auto',
        open_time: '08:00',
        close_time: '19:00',
        store_name: 'Chilled and Frozen Hub',
        address: 'Caltex Road, Banaba South, Batangas City',
        contact: '09947246294 / 09949314800',
        logo_url: '/logo.png',
        banner_images: [
            'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80'
        ]
    });

    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Store Settings
                const savedStoreRaw = localStorage.getItem('storeSettings');
                const savedStore = savedStoreRaw ? JSON.parse(savedStoreRaw) : null;

                const { data: storeData } = await supabase.from('store_settings').select('*').limit(1).single();
                if (storeData) {
                    const mergedStore = {
                        ...storeData,
                        ...(savedStore || {}),
                        banner_images: (savedStore?.banner_images && savedStore.banner_images.length > 0)
                            ? savedStore.banner_images
                            : (storeData.banner_images || [])
                    };
                    setStoreSettings(mergedStore);
                } else if (savedStore) {
                    setStoreSettings(savedStore);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Slideshow functions
    const nextBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev + 1) % count);
    };

    const prevBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev - 1 + count) % count);
    };

    useEffect(() => {
        const bannerCount = (storeSettings.banner_images || []).length;
        if (bannerCount === 0) return;
        const timer = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % bannerCount);
        }, 5000);
        return () => clearInterval(timer);
    }, [storeSettings.banner_images]);

    const _formatTime = (timeStr) => {
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
                    <a href="/" className="brand">
                        <img src="/logo.png" alt="Chilled and Frozen Hub" style={{ height: '54px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </a>
                    <div className="header-nav">
                        <a
                            href="https://m.me/chilledandfrozenhubmeatshop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-accent"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <MessageSquare size={16} />
                            <span>Message Us</span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section" style={{ overflow: 'hidden', background: '#F4F9F4' }}>
                <div className="container hero-split">
                    <div className="hero-content animate-fade-up">
                        <span style={{
                            background: 'var(--secondary)',
                            color: 'var(--primary-dark)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'inline-block',
                            marginBottom: '15px'
                        }}>
                            TRADER • SUPPLIER • DISTRIBUTOR
                        </span>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '10px', lineHeight: 1.1 }}>
                            CHILLED AND <span style={{ color: 'var(--primary)' }}>FROZEN</span> HUB
                        </h1>
                        <p style={{
                            color: 'var(--primary-dark)',
                            fontWeight: 700,
                            marginBottom: '20px'
                        }}>
                            High-End Beef • Wholesale Chicken • Pork • Seafood • Rice
                        </p>
                        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '30px' }}>
                            📍 {storeSettings.address}<br />
                            ☎️ Hotline: {storeSettings.contact}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <a
                                href="https://m.me/chilledandfrozenhubmeatshop"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '14px 28px',
                                    borderRadius: '50px',
                                    textDecoration: 'none',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1rem',
                                    boxShadow: '0 4px 15px rgba(30, 139, 0, 0.3)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Facebook size={20} />
                                Order via Messenger
                            </a>
                            <a
                                href="tel:09947246294"
                                style={{
                                    background: 'white',
                                    color: 'var(--primary)',
                                    padding: '14px 28px',
                                    borderRadius: '50px',
                                    textDecoration: 'none',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1rem',
                                    border: '2px solid var(--primary)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Phone size={20} />
                                Call Us
                            </a>
                        </div>
                    </div>
                    <div className="hero-image-container">
                        {(storeSettings.banner_images || []).map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt={`Hero Banner ${i + 1}`}
                                className="hero-image"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                style={{
                                    position: i === 0 ? 'relative' : 'absolute',
                                    top: 0,
                                    left: 0,
                                    opacity: currentBannerIndex === i ? 1 : 0,
                                    transition: 'opacity 1s ease-in-out',
                                    zIndex: currentBannerIndex === i ? 1 : 0
                                }}
                            />
                        ))}
                        <button onClick={prevBanner} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronLeft size={24} color="var(--primary)" /></button>
                        <button onClick={nextBanner} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronRight size={24} color="var(--primary)" /></button>
                    </div>
                </div>
            </section>



            {/* Footer */}
            <footer className="app-footer">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand Column */}
                        <div className="footer-brand">
                            <div className="footer-logo-row">
                                <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" className="footer-logo-img" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                                <div>
                                    <h3 className="footer-brand-title">{storeSettings.store_name}</h3>
                                    <span className="footer-brand-sub">Trader • Supplier • Distributor</span>
                                </div>
                            </div>
                            <p className="footer-desc">
                                Premium quality meat wholesale & retail shop. Clean, fresh, guaranteed quality meats delivered to your doorstep.
                            </p>
                        </div>

                        {/* Contact Column */}
                        <div>
                            <h4 className="footer-col-title">Store Information</h4>
                            <ul className="footer-contact-list">
                                <li className="footer-contact-item">
                                    <MapPin size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{storeSettings.address}</span>
                                </li>
                                <li className="footer-contact-item">
                                    <Phone size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{storeSettings.contact}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Business Hours & Socials */}
                        <div>
                            <h4 className="footer-col-title">Business Hours</h4>
                            <ul className="footer-contact-list" style={{ marginBottom: '14px' }}>
                                <li className="footer-contact-item">
                                    <Clock size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Mon - Sun: {storeSettings.open_time || '08:00'} - {storeSettings.close_time || '19:00'}</span>
                                </li>
                            </ul>
                            <h4 className="footer-col-title" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Connect With Us</h4>
                            <div className="footer-social-row">
                                <a href="https://facebook.com/chilledandfrozenhubmeatshop" target="_blank" rel="noreferrer" className="footer-social-link" title="Facebook Page">
                                    <Facebook size={18} />
                                </a>
                                <a href={`tel:${storeSettings.contact}`} className="footer-social-link" title="Call Store">
                                    <Phone size={18} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© {new Date().getFullYear()} {storeSettings.store_name}. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
