import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        const bypassUser = localStorage.getItem('admin_bypass');
        return bypassUser ? { email: 'admin@chilledandfrozenhub.com', id: 'bypass-id' } : null;
    });
    const [loading, setLoading] = useState(() => {
        const bypassUser = localStorage.getItem('admin_bypass');
        return !bypassUser;
    });

    useEffect(() => {
        // Get initial session if not in bypass mode
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!localStorage.getItem('admin_bypass')) {
                setCurrentUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!localStorage.getItem('admin_bypass')) {
                setCurrentUser(session?.user ?? null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        currentUser
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="loading-screen">
                    <div className="spinner"></div>
                    <p>Securing your session...</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
