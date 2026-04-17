"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
    setTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    // On mount: read saved preference or system preference
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('app_theme') as Theme | null;
        if (stored === 'dark' || stored === 'light') {
            applyTheme(stored);
            setThemeState(stored);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
            setThemeState('dark');
        }
    }, []);

    const applyTheme = (t: Theme) => {
        const root = document.documentElement; // <html>
        root.classList.remove('light', 'dark');
        root.classList.add(t);
        root.setAttribute('data-theme', t);
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(t);
        localStorage.setItem('app_theme', t);
    };

    const setTheme = (t: Theme) => {
        applyTheme(t);
        setThemeState(t);
    };

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
    };

    // Prevent flash: render children only after mount
    if (!mounted) {
        return (
            <ThemeContext.Provider value={{ theme: 'light', toggleTheme, setTheme }}>
                {children}
            </ThemeContext.Provider>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
