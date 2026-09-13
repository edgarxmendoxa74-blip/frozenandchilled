import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for developer bypass session first
        const bypassUser = localStorage.getItem('admin_bypass');
        if (bypassUser) {
            setCurrentUser({ email: 'admin@chilledandfrozenhub.com', id: 'bypass-id' });
            setLoading(false);
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!localStorage.getItem('admin_bypass')) {
                setCurrentUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user ?? null);
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
