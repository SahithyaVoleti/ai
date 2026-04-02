"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Camera, User, Phone, CheckCircle, RefreshCw, AlertCircle, ChevronRight, GraduationCap, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-context';
import Link from 'next/link';

export default function SignupManual() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', year: '', password: '', photo: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            setError("Camera access is required for proctoring verification.");
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
            setError('Please capture your photo for identity verification.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, role: 'Student' }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                router.push('/login');
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch {
            setError('Network connection failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0A0D14]' : 'bg-[#F0F4F8]'} font-sans py-10 px-4`}>

            {/* Header Navs */}
            <div className="absolute top-8 left-8 z-50">
                <button onClick={() => router.push('/signup')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                    <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
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
            <div className={`w-full max-w-[900px] h-auto lg:h-[600px] flex flex-col lg:flex-row shadow-[0_25px_50px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden ${theme === 'dark' ? 'bg-[#141B26]' : 'bg-white'} border border-white/5 relative z-10`}>

                {/* ══ LEFT SIDE — Student Illustration Panel ══ */}
                <div className={`hidden lg:flex flex-[0_0_42%] flex-col p-10 bg-gradient-to-br from-[#4F46E5] via-[#3B82F6] to-[#2563EB] relative overflow-hidden`}>
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-fadeIn">
                        <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                            <div className="relative w-full h-full animate-float">
                                <img
                                    src="/hero_robot_laptop.png"
                                    alt="Manual Mode"
                                    className="w-full h-full object-contain filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)] transition-opacity duration-700"
                                />
                                <div className="absolute inset-0 bg-white/20 rounded-full blur-[70px] -z-10" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-[24px] p-6 relative z-10 border border-white/15 shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-blue-600">
                                <Sparkles size={12} fill="currentColor" />
                            </div>
                            <span className="text-white text-[9px] font-black uppercase tracking-[0.2em]">Next-Gen Interviewing</span>
                        </div>
                        <h2 className="text-white text-xl font-black mb-2 leading-tight">
                            Unlock Your <br />Potential with AI.
                        </h2>
                        <p className="text-white/80 text-[12px] font-medium leading-relaxed">
                            Join thousands of candidates mastering technical interviews.
                        </p>
                    </div>
                </div>

                {/* ══ RIGHT SIDE — Signup Form ══ */}
                <div className={`flex-1 flex flex-col p-8 lg:p-12 relative overflow-y-auto max-h-[90vh] ${theme === 'dark' ? 'bg-[#141B26]' : 'bg-white'}`}>

                    <div className="mb-8 text-center lg:text-left">

                        <h1 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'} mb-1.5 tracking-tighter`}>
                            Create Account
                        </h1>
                        <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold`}>
                            Join the AI-powered interview network.
                        </p>
                    </div>



                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold animate-shake">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 📸 PHOTO CAPTURE */}
                        <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-[#FAFBFF] border-blue-50'} border-2 flex items-center gap-5 mb-4 group hover:border-blue-100 transition-colors shadow-sm`}>
                            <div className="relative">
                                {capturedImage ? (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-500 shadow-lg">
                                        <img src={capturedImage} className="w-full h-full object-cover transform scale-x-[-1]" />
                                    </div>
                                ) : cameraActive ? (
                                    <div className="w-16 h-16 bg-black rounded-xl overflow-hidden border border-blue-500 relative">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <div className="absolute inset-x-0 top-0 h-1 bg-blue-500 animate-scan opacity-60" />
                                    </div>
                                ) : (
                                    <div className={`w-16 h-16 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-slate-800' : 'bg-white border-slate-200'} border-2 border-dashed flex items-center justify-center group-hover:border-blue-400 transition-colors`}>
                                        <Camera size={20} className="text-slate-300 group-hover:text-blue-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-[10px] font-black uppercase tracking-[0.1em] ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} mb-1`}>Photo Setup</h4>
                                <div className="flex gap-2 items-center">
                                    {!capturedImage && !cameraActive && <button type="button" onClick={startCamera} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-95 transition-all">Start Camera</button>}
                                    {cameraActive && <button type="button" onClick={capturePhoto} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all">Capture</button>}
                                    {capturedImage && <button type="button" onClick={() => { setCapturedImage(null); startCamera(); }} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all">Retake</button>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Full Name" name="name" icon={<User size={16} />} value={formData.name} onChange={handleChange} placeholder="First and last name" theme={theme} />
                            <InputField label="Email Address" name="email" type="email" icon={<Mail size={16} />} value={formData.email} onChange={handleChange} placeholder="name@email.com" theme={theme} />
                            <InputField label="Phone Number" name="phone" type="tel" icon={<Phone size={16} />} value={formData.phone} onChange={handleChange} placeholder="10-digit mobile" theme={theme} />

                            <div className="space-y-1.5">
                                <label className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-widest`}>Education Year</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <GraduationCap size={16} />
                                    </div>
                                    <select
                                        name="year" required value={formData.year} onChange={handleChange}
                                        className={`w-full ${theme === 'dark' ? 'bg-slate-800/40 border-white/5 text-white' : 'bg-[#F9FBFF] border-slate-200 text-slate-900'} border-2 rounded-xl py-3 pl-11 pr-4 text-[13px] outline-none transition-all focus:border-blue-500 focus:bg-white font-medium appearance-none shadow-sm`}
                                    >
                                        <option value="">Select Year</option>
                                        {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <InputField 
                                label="Password" 
                                name="password" 
                                type={showPassword ? "text" : "password"} 
                                icon={<Lock size={16} />} 
                                value={formData.password} 
                                onChange={handleChange} 
                                placeholder="Min. 6 characters" 
                                theme={theme}
                                showToggle={true}
                                onToggle={() => setShowPassword(!showPassword)}
                                isVisible={showPassword}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[18px] font-black text-[14px] shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Complete Enrollment</>}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                        Already enrolled? <Link href="/login" className="text-blue-600 font-bold hover:underline ml-1">SIGN IN →</Link>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan { 0%, 100% { top: 0%; transform: scaleX(1.1); } 50% { top: 100%; transform: scaleX(0.9); } }
                .animate-scan { animation: scan 2s ease-in-out infinite; }
                @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
        </div>
    );
}

function InputField({ label, name, type = "text", icon, value, onChange, placeholder, theme, showToggle, onToggle, isVisible }: any) {
    return (
        <div className="space-y-1.5">
            <label className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-widest`}>{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none z-20">
                    {icon}
                </div>
                <input
                    name={name}
                    type={type}
                    required
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={type === 'password' || name === 'password' ? 'new-password' : 'off'}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800/40 border-white/5 text-white' : 'bg-[#F9FBFF] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-xl py-3 pl-11 ${showToggle ? 'pr-12' : 'pr-4'} text-[13px] outline-none transition-all focus:border-blue-500 font-medium relative z-10`}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center p-0"
                    >
                        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}
