import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Get initial session from Supabase
        supabase.auth.getSession()
            .then(({ data: { session }, error: sessionError }) => {
                if (sessionError) {
                    console.error('Session retrieval error:', sessionError);
                    setError('Failed to retrieve session. Please try again.');
                    setLoading(false);
                    return;
                }
                setCurrentUser(session?.user ?? null);
                setLoading(false);
            })
            .catch(err => {
                console.error('Unexpected error getting session:', err);
                setError('Authentication service unavailable');
                setLoading(false);
            });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user ?? null);
            setError(null);
        });

        return () => {
            if (subscription?.unsubscribe) {
                subscription.unsubscribe();
            }
        };
    }, []);

    const value = {
        currentUser,
        error
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
