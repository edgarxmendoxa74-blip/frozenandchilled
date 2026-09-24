import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const About = () => {
    const [storeSettings, setStoreSettings] = useState({
        store_name: 'Chilled And Frozen Hub',
        logo_url: '/logo.png'
    });

    useEffect(() => {
        const fetchStoreSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
            if (data) setStoreSettings(data);
        };
        fetchStoreSettings();
    }, []);

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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', marginBottom: '80px' }}>
                    <div>
                        <h1 style={{ fontSize: '3.5rem', marginBottom: '10px', fontWeight: 900 }}>Chilled & Frozen <span style={{ color: 'var(--primary)' }}>Hub</span></h1>
                        <p style={{
                            fontSize: '1.3rem',
                            color: 'var(--primary-dark)',
                            fontWeight: 800,
                            marginBottom: '20px',
                            letterSpacing: '1px'
                        }}>
                            TRADER • SUPPLIER • DISTRIBUTOR
                        </p>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '25px', color: 'var(--primary)' }}>Your Premier Wholesale Meat Supplier</h2>
                        <p style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                            {storeSettings.store_name} is a premier trader, supplier, and distributor of high-end beef, wholesale chicken, imported pork, seafood, and staple food products based in Banaba South, Batangas City.
                        </p>
                        <p style={{ lineHeight: '1.8' }}>
                            We partner directly with leading worldwide brands such as Excel, St. Helens, Seara, Swift, Sadia, Alibem, and Frimesa to deliver top-tier frozen meats at competitive wholesale and retail rates for restaurants, caterers, and meat lovers.
                        </p>
                    </div>
                    <img src="https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80" alt="Chilled And Frozen Meats" style={{ width: '100%', borderRadius: '20px', boxShadow: 'var(--shadow-md)' }} />
                </div>
            </main>
        </div>
    );
};

export default About;
