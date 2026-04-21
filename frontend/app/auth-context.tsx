"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getApiUrl } from './api-utils';

type User = {
    id: number;
    name: string;
    email: string;
    phone: string;
    college_name?: string;
    photo?: string;
    resume_path?: string;
    role: string;
    year?: string;
    is_premium?: number;
    plan_id?: number;
    interviews_remaining?: number;
    resume_score?: number;
    resume_feedback?: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    updateUser: (userData: User) => void;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
    updateUser: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ── 1. Restore session on first load ──────────────────────────────
        const stored = localStorage.getItem('user_session');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user session", e);
            }
        }
        setLoading(false);

        // ── 2. Cross-tab logout sync ──────────────────────────────────────
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'user_session' || event.key === 'admin_session') {
                if (event.newValue === null) {
                    // Session was removed in another tab → log out this tab too
                    setUser(null);
                    // Force a reload if we are on a protected page to ensure state is reset
                    if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
                        window.location.href = '/';
                    }
                } else if (event.key === 'user_session') {
                    // Session was updated (e.g. profile save) → sync user data
                    try {
                        setUser(JSON.parse(event.newValue));
                    } catch (e) {
                        console.error("Failed to sync user session across tabs", e);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user_session', JSON.stringify(userData));
    };

    const logout = () => {
        // 1. Clear everything locally FIRST (synchronous) so the user is immediately logged out
        setUser(null);
        localStorage.removeItem('user_session');
        localStorage.removeItem('admin_session');
        localStorage.removeItem('resume_uploaded');

        // 2. Fire backend logout in background (don't await — don't block redirect)
        fetch('http://localhost:5000/api/auth/logout', { method: 'POST' }).catch(() => {});

        // 3. Redirect to home
        window.location.href = '/';
    };

    const updateUser = (userData: User) => {
        setUser(userData);
        try {
            localStorage.setItem('user_session', JSON.stringify(userData));
        } catch (e) {
            console.error("LocalStorage Update Failed (Quota likely exceeded):", e);
            // Fallback: save without photo if it's the culprit
            if (userData.photo) {
                const { photo, ...rest } = userData;
                localStorage.setItem('user_session', JSON.stringify(rest));
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

