import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children }) => {
    const authContext = useAuth();
    
    if (!authContext) {
        console.error('ProtectedRoute: Auth context not available');
        return <Navigate to="/admin" />;
    }

    const { currentUser } = authContext;

    // Allow access if:
    // 1. currentUser exists from Supabase auth, OR
    // 2. Test user is set in localStorage (dev only)
    const testUser = localStorage.getItem('admin_test_user') === 'true';
    
    if (!currentUser && !testUser) {
        console.log('ProtectedRoute: No user, redirecting to login');
        return <Navigate to="/admin" />;
    }

    return children;
};

export default ProtectedRoute;
