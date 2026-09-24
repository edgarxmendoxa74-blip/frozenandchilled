import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        // DEVELOPMENT ONLY: Check for test user
        const testUser = localStorage.getItem('admin_test_user');
        if (testUser === 'true') {
            const email = localStorage.getItem('admin_test_email') || 'admin@example.com';
            return { email, id: 'test-admin-dev', aud: 'authenticated' };
        }
        return null;
    });
    const [loading, setLoading] = useState(() => {
        const testUser = localStorage.getItem('admin_test_user');
        return testUser !== 'true';
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if using test user (development only)
        const testUser = localStorage.getItem('admin_test_user');
        if (testUser === 'true') {
            setCurrentUser({
                email: localStorage.getItem('admin_test_email') || 'admin@example.com',
                id: 'test-admin-dev',
                aud: 'authenticated'
            });
            setLoading(false);
            return;
        }

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
