"use client";

import React, { useState, useRef, useEffect } from 'react';
import { getApiUrl } from './api-utils';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Camera, User, Phone, CheckCircle, RefreshCw, AlertCircle, ChevronRight, BarChart, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function AdminSignup() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '', photo: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };



    const startCamera = async () => {
        setError('');
        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
            } catch (err) {
                console.warn("HD camera failed, retrying with basic constraints", err);
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err: any) {
            setError("Camera access blocked. Verification required.");
        }
    };

    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => {
                if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                    console.error(e);
                }
            });
        }
    }, [cameraActive]);

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, 400, 400);
        const img = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(img);
        setFormData({ ...formData, photo: img });
        streamRef.current?.getTracks().forEach(t => t.stop());
        setCameraActive(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.photo) {
            setError('Biometric scan is required for registration.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/admin/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.status === 'success') {
                router.push('/admin-login');
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch {
            setError('Server connection failure.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0F111A]' : 'bg-[#F3F4F9]'} font-sans py-10 px-4`}>

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
            <div className={`w-full max-w-[1100px] h-auto flex flex-col lg:flex-row shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[48px] overflow-hidden ${theme === 'dark' ? 'bg-[#1A1D2B]' : 'bg-white'} border border-white/10 relative z-10`}>

                {/* ══ LEFT SIDE — Branding Panel ══ */}
                <div className="hidden lg:flex flex-[0_0_40%] flex-col p-12 bg-[#6366F1] relative overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                        <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-[70px] animate-pulse" />
                            <div className="relative w-full h-full animate-float">
                                <img
                                    src="/admin_hero.png"
                                    alt="AI Recruiter"
                                    className="w-full h-full object-contain filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)] transition-opacity duration-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/15 backdrop-blur-xl rounded-[32px] p-8 relative z-10 border border-white/20 shadow-2xl">
                        <h2 className="text-white text-2xl font-black mb-3 leading-tight tracking-tight">
                            Admin Security Setup
                        </h2>
                        <p className="text-white/80 text-[13px] font-medium leading-relaxed">
                            Register your admin account with photo verification to securely manage and oversee all AI-powered interviews and candidate analytics.
                        </p>
                    </div>

                    <div className="absolute top-[-15%] right-[-15%] w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
                </div>

                {/* ══ RIGHT SIDE — Signup Form ══ */}
                <div className={`flex-1 flex flex-col p-8 lg:p-12 relative overflow-y-auto max-h-[90vh] ${theme === 'dark' ? 'bg-[#1A1D2B]' : 'bg-white'}`}>

                    <div className="mb-8">
                        <span className={`inline-block px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'} border text-[10px] font-black uppercase tracking-[0.2em] mb-4`}>
                            Admin Registration
                        </span>
                        <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tighter`}>
                            Create Admin Account
                        </h1>
                        <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold`}>
                            Register your account to manage candidate assessment workflows.
                        </p>
                    </div>



                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 📸 BIOMETRIC SECTION */}
                        <div className={`p-5 rounded-[28px] ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-[#F9FAFB] border-slate-100'} border-2 flex items-center gap-6 mb-6 group hover:border-indigo-200 transition-all`}>
                            <div className="relative">
                                {capturedImage ? (
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-xl">
                                        <img src={capturedImage} className="w-full h-full object-cover transform scale-x-[-1]" />
                                    </div>
                                ) : cameraActive ? (
                                    <div className="w-20 h-20 bg-black rounded-2xl overflow-hidden border-2 border-indigo-500 relative">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500 animate-scan opacity-60" />
                                    </div>
                                ) : (
                                    <div className={`w-20 h-20 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-slate-800' : 'bg-white border-slate-200'} border-2 border-dashed flex items-center justify-center group-hover:border-indigo-400 transition-colors`}>
                                        <Camera size={24} className="text-slate-300 group-hover:text-indigo-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} mb-1`}>Photo Verification</h4>
                                <div className="flex gap-2">
                                    {!capturedImage && !cameraActive && <button type="button" onClick={startCamera} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg">Start Capture</button>}
                                    {cameraActive && <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Take Photo</button>}
                                    {capturedImage && <button type="button" onClick={() => { setCapturedImage(null); startCamera(); }} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Reset Photo</button>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>Full Name</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input name="name" required value={formData.name} onChange={handleChange} placeholder="First and last name" className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] outline-none transition-all focus:border-indigo-500 font-medium`} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="admin@domain.com" className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] outline-none transition-all focus:border-indigo-500 font-medium`} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>Phone Number</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                        <Phone size={16} />
                                    </div>
                                    <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+1..." className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-3.5 pl-11 pr-4 text-[13px] outline-none transition-all focus:border-indigo-500 font-medium`} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-wider`}>Password</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none z-20">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-white' : 'bg-[#F9FAFB] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-2xl py-3.5 pl-11 pr-12 text-[13px] outline-none transition-all focus:border-indigo-500 font-medium relative z-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center p-0"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[20px] font-black text-[14px] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={20} /> : <><CheckCircle size={18} /> Create Account</>}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-[12px] font-medium text-slate-500 uppercase tracking-widest">
                        Already have an account? <button onClick={() => router.push('/admin-login')} className="text-indigo-500 font-black hover:underline cursor-pointer ml-1">LOGIN →</button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan { 0%, 100% { top: 0%; transform: scaleX(1.1); } 50% { top: 100%; transform: scaleX(0.9); } }
                .animate-scan { animation: scan 2s ease-in-out infinite; }
                @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
        </div>
    );
}
