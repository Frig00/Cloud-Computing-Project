import { AuthApi } from '@/api';
import { useQuery } from '@tanstack/react-query';
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('jwtToken') || null);

    const login = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('jwtToken', newToken);
        console.log('login', newToken);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('jwtToken');
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}