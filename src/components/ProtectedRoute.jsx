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

    if (!currentUser) {
        console.log('ProtectedRoute: No user, redirecting to login');
        return <Navigate to="/admin" />;
    }

    return children;
};

export default ProtectedRoute;
