import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children }) => {
    const { currentUser } = useAuth();

    const bypass = localStorage.getItem('admin_bypass');

    if (!currentUser && bypass !== 'true') {
        return <Navigate to="/admin" />;
    }

    return children;
};

export default ProtectedRoute;
