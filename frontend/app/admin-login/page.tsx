"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, AlertCircle, RefreshCw, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function AdminLogin() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [step, setStep] = useState<'login' | 'otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset' | 'forgot_success'>('login');
    const [emailForOtp, setEmailForOtp] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.status === 'requires_otp') {
                setEmailForOtp(data.email);
                setStep('otp');
            } else if (data.status === 'success') {
                localStorage.setItem('admin_session', JSON.stringify(data.user));
                router.push('/admin');
            } else {
                setError(data.message || 'Invalid credentials');
            }
        } catch {
            setError('Connection failed. Server error.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/admin/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailForOtp, otp: otpValue }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                localStorage.setItem('admin_session', JSON.stringify(data.user));
                router.push('/admin');
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch {
            setError('Verification failed. Server error.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setStep('forgot_otp');
            } else {
                setError(data.message || 'Failed to send recovery code');
            }
        } catch {
            setError('Connection failure.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, otp: otpValue }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setStep('forgot_reset');
                setOtpValue('');
            } else {
                setError(data.message || 'Invalid code');
            }
        } catch {
            setError('Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, new_password: newPassword }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setStep('forgot_success');
            } else {
                setError(data.message || 'Reset failed');
            }
        } catch {
            setError('Failure updating password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0F111A]' : 'bg-[#F3F4F9]'} font-sans`}>

            {/* Header Navs */}
            <div className="absolute top-8 left-8 z-50">
                <button onClick={() => router.push('/')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                    <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Home
                </button>
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-8 right-8 z-50">
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'} border transition-all shadow-sm`}
                >
                    {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                </button>
            </div>

            {/* Main Container */}
            <div className={`w-full max-w-[900px] h-auto lg:h-[580px] flex flex-col lg:flex-row shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden ${theme === 'dark' ? 'bg-[#1A1D2B]' : 'bg-white'} border border-white/10 relative z-10 mx-4`}>

                {/* ══ LEFT SIDE — Branding Panel ══ */}
                <div className="hidden lg:flex flex-[0_0_42%] flex-col p-10 bg-[#6366F1] relative overflow-hidden group">
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                        {/* High-quality Interview Admin Illustration */}
                        <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-[70px] animate-pulse" />
                            <div className="relative w-full h-full animate-float">
                                <img
                                    src="/admin_hero.png"
                                    alt="Admin Panel"
                                    className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-[24px] p-6 relative z-10 border border-white/15 shadow-xl">
                        <h2 className="text-white text-xl font-black mb-2 leading-tight tracking-tight">
                            Smart Management
                        </h2>
                        <p className="text-white/80 text-[12px] font-medium leading-relaxed">
                            Oversee AI interviews and candidate performance with precision.
                        </p>
                    </div>

                    {/* Decorative Background */}
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl opacity-40" />
                </div>

                {/* ══ RIGHT SIDE — Form Panel ══ */}
                <div className={`flex-1 flex flex-col p-8 lg:p-12 relative overflow-hidden ${theme === 'dark' ? 'bg-[#1A1D2B]' : 'bg-white'}`}>

                    {step === 'login' ? (
                        <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                            <div className="mb-8 text-center lg:text-left">
                                <h1 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-1.5 tracking-tighter`}>
                                    Welcome back!
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-medium`}>
                                    Secure access to AI interview dashboard.
                                </p>
                            </div>



                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>
                                        Admin Email / ID
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            name="identifier"
                                            required
                                            value={formData.identifier}
                                            onChange={handleChange}
                                            placeholder="admin@interview-ai.com"
                                            className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-4 pl-12 pr-4 text-[14px] outline-none transition-all focus:border-indigo-500 font-medium`}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>
                                        Admin Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-4 pl-12 pr-4 text-[14px] outline-none transition-all focus:border-indigo-500 font-medium`}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <button onClick={() => setStep('forgot_email')} type="button" className="text-[11px] font-bold text-indigo-500 hover:underline transition-all">
                                        Forgot password?
                                    </button>
                                    <button onClick={() => router.push('/login')} type="button" className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} hover:text-indigo-500 transition-colors`}>
                                        Student Portal →
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[20px] font-black text-[15px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <>Login to Dashboard <ChevronRight size={18} /></>}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-[12px] font-medium text-slate-500 uppercase tracking-widest">
                                New Administrator? <button onClick={() => router.push('/admin-signup')} className="text-indigo-500 font-black hover:underline cursor-pointer ml-1">CREATE ACCOUNT →</button>
                            </div>
                        </div>
                    ) : step === 'otp' ? (
                        /* OTP STEP (Login) */
                        <div className="flex-1 flex flex-col justify-center items-center animate-fadeIn text-center">
                            <div className="mb-10 group">
                                <div className="w-20 h-20 rounded-[28px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                                    <Lock size={36} className="text-indigo-500" />
                                </div>
                                <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                                    Verification
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold max-w-[280px]`}>
                                    A security code has been transmitted to your linked email for session verification.
                                </p>
                            </div>

                            <form onSubmit={handleOtpSubmit} className="w-full space-y-8">
                                <input
                                    type="text"
                                    maxLength={6}
                                    required
                                    autoFocus
                                    value={otpValue}
                                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className={`w-full bg-transparent text-center text-6xl font-black tracking-[0.4em] outline-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'} placeholder:opacity-5 transition-all focus:scale-105`}
                                />
                                <div className="w-[180px] h-1.5 bg-indigo-500/10 rounded-full overflow-hidden relative mx-auto">
                                    <div className="absolute inset-y-0 bg-indigo-500 w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otpValue.length < 6}
                                    className="w-full py-4.5 bg-[#6366F1] text-white rounded-[20px] font-black text-[15px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Sync Profile'}
                                </button>

                                <button type="button" onClick={() => setStep('login')} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors">
                                    ← Revise Access
                                </button>
                            </form>
                        </div>
                    ) : step === 'forgot_email' ? (
                        /* FORGOT PASSWORD - EMAIL STEP */
                        <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                            <div className="mb-10 text-center lg:text-left">
                                <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                                    Account Recovery
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-medium`}>
                                    Enter your administrator email to receive a password reset code.
                                </p>
                            </div>

                            <form onSubmit={handleForgotEmailSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>
                                        Admin Email
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="your-admin-email@domain.com"
                                            className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-4 pl-12 pr-4 text-[14px] outline-none transition-all focus:border-indigo-500 font-medium`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[20px] font-black text-[15px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <>Generate Reset Code <ChevronRight size={18} /></>}
                                </button>

                                <button type="button" onClick={() => setStep('login')} className="w-full text-center text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors">
                                    ← Back to Login
                                </button>
                            </form>
                        </div>
                    ) : step === 'forgot_otp' ? (
                        /* FORGOT PASSWORD - OTP STEP */
                        <div className="flex-1 flex flex-col justify-center items-center animate-fadeIn text-center">
                            <div className="mb-10">
                                <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                                    Verification
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold`}>
                                    Check your inbox for the 6-digit recovery code.
                                </p>
                            </div>

                            <form onSubmit={handleForgotOtpVerify} className="w-full space-y-8">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    maxLength={6}
                                    required
                                    autoFocus
                                    value={otpValue}
                                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className={`w-full bg-transparent text-center text-6xl font-black tracking-[0.4em] outline-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'} placeholder:opacity-5 transition-all focus:scale-105`}
                                />

                                <button
                                    type="submit"
                                    disabled={loading || otpValue.length < 6}
                                    className="w-full py-4.5 bg-[#6366F1] text-white rounded-[20px] font-black text-[15px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Confirm Code'}
                                </button>

                                <button type="button" onClick={() => setStep('forgot_email')} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors">
                                    ← Edit Email
                                </button>
                            </form>
                        </div>
                    ) : step === 'forgot_reset' ? (
                        /* FORGOT PASSWORD - NEW PASSWORD STEP */
                        <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                            <div className="mb-10 text-center lg:text-left">
                                <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                                    New Password
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-medium`}>
                                    Select a secure master password for your administrator node.
                                </p>
                            </div>

                            <form onSubmit={handlePasswordReset} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>
                                        System Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-4 pl-12 pr-4 text-[14px] outline-none transition-all focus:border-indigo-500 font-medium`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[20px] font-black text-[15px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Update & Secure Portal'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* SUCCESS STEP */
                        <div className="flex-1 flex flex-col justify-center items-center animate-fadeIn text-center">
                            <div className="mb-8">
                                <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-lg shadow-green-500/20">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                                    Success!
                                </h1>
                                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold`}>
                                    Your administrator credentials have been updated and synchronized.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setStep('login');
                                    setNewPassword('');
                                    setForgotEmail('');
                                    setOtpValue('');
                                }}
                                className="w-full py-4.5 bg-slate-900 text-white rounded-[20px] font-black text-[15px] shadow-xl active:scale-95 transition-all"
                            >
                                Return to Authenticator
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Background Decorative Blur */}
            <div className={`absolute top-0 right-0 w-[50%] h-screen bg-indigo-50/20 dark:bg-indigo-900/5 transition-colors pointer-events-none blur-3xl`} />

            <style jsx global>{`
                @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes loading { 0% { left: -100%; } 100% { left: 100%; } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
        </div>
    );
}
