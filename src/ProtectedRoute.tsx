import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/authService';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    return isAuthenticated ? 
        <Outlet /> : 
        <Navigate to="/sign-in" state={{ from: location }} replace />;
};