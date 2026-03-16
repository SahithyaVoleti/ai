"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // Load preference
        const stored = localStorage.getItem('app_theme') as Theme;
        if (stored) {
            setTheme(stored);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        // Apply theme to HTML and Body
        const root = document.documentElement;
        const body = document.body;

        root.classList.remove('light', 'dark');
        body.classList.remove('light', 'dark');

        root.classList.add(theme);
        body.classList.add(theme);

        root.setAttribute('data-theme', theme);
        localStorage.setItem('app_theme', theme);

        console.log(`Theme toggled to: ${theme}`);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
