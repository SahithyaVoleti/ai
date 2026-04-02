"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, CheckCircle, ArrowRight, AlertCircle, Sun, Moon, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function ForgotPassword() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP (Mock), 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMessage(data.message);
                setStep(2);
            } else {
                setError(data.message || "Failed to send code. Check email.");
            }
        } catch (err) {
            setError("Connection failed. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setStep(3);
                setMessage('');
            } else {
                setError(data.message || "Invalid verification code.");
            }
        } catch (err) {
            setError("Verification failed.");
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, new_password: newPassword })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setStep(4); // Success
            } else {
                setError(data.message || "Failed to reset password.");
            }
        } catch (err) {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4 font-sans transition-colors duration-300 relative overflow-hidden`}>
            {/* Header Navs */}
            <div className="absolute top-8 left-8 z-50">
                <button onClick={() => router.push('/')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                    <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Home
                </button>
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-50 border border-[var(--border)]"
            >
                {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            <div className="bg-[var(--card-bg)] max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-fadeIn border border-[var(--border)]">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-[var(--foreground)]">Recovery</h2>
                        <p className="text-[var(--text-muted)] mt-2">Reset your account password</p>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2 opacity-80">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-[var(--text-muted)]" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-[var(--card-bg)] transition-all outline-none"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : <>Send Code <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleOtpSubmit} className="space-y-6 animate-slideIn">
                            <div className="bg-blue-500/10 text-blue-500 p-4 rounded-lg text-sm mb-4 border border-blue-500/20">
                                {message}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2 opacity-80">Verification Code</label>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-[var(--card-bg)] transition-all outline-none text-center tracking-widest text-2xl font-mono"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-200"
                            >
                                Verify Code
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handlePasswordReset} className="space-y-6 animate-slideIn">
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2 opacity-80">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-[var(--text-muted)] z-20 pointer-events-none" size={20} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-[var(--card-bg)] transition-all outline-none relative z-10"
                                        placeholder="Min. 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center p-0"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-200"
                            >
                                {loading ? 'Updating...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="text-center py-8 animate-fadeIn">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Password Reset!</h3>
                            <p className="text-[var(--text-muted)] mb-6">Your password has been successfully updated.</p>
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
                            >
                                Must Login Now
                            </button>
                        </div>
                    )}

                    <div className="mt-8 text-center border-t border-[var(--border)] pt-6">
                        <button onClick={() => router.push('/login')} className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm font-medium transition-colors">
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
