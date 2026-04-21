"use client";

import React, { useState, useRef, useEffect } from 'react';
import { getApiUrl } from '../../api-utils';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, AlertCircle, RefreshCw, ChevronRight, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../auth-context';
import { useTheme } from '../theme-context';
import Link from 'next/link';

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const globalSpeechTokenRef = useRef(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const speak = (text: string) => {
        if (typeof window === 'undefined') return;
        const myId = ++globalSpeechTokenRef.current;
        if (audioRef.current) {
            try {
                const oldAudio = audioRef.current;
                audioRef.current = null;
                oldAudio.onended = null;
                oldAudio.pause();
                oldAudio.src = "";
            } catch (e) { }
        }
        try { window.speechSynthesis.cancel(); } catch (e) { }

        setIsSpeaking(true);
        const playFallback = async () => {
            if (myId !== globalSpeechTokenRef.current) return;
            try {
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                });
                if (!response.ok) throw new Error();
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                if (myId !== globalSpeechTokenRef.current) return;
                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                audio.onended = () => setIsSpeaking(false);
                audio.onerror = () => browserFallback();
                await audio.play();
            } catch (err) { browserFallback(); }
        };
        const browserFallback = () => {
            try {
                const utt = new SpeechSynthesisUtterance(text);
                const voices = window.speechSynthesis.getVoices();
                const maleVoice = voices.find(v =>
                    v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('james') ||
                    v.name.toLowerCase().includes('google us english') ||
                    (v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female'))
                );
                if (maleVoice) utt.voice = maleVoice;
                utt.rate = 0.9;
                utt.pitch = 0.85;
                utt.onend = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utt);
            } catch (e) { setIsSpeaking(false); }
        };
        playFallback();
    };

    useEffect(() => {
        // Voice welcome on first meaningful interaction or slight delay
        const timer = setTimeout(() => {
            speak("Welcome back. Please provide your credentials to access the evaluation portal.");
        }, 1500);
        return () => clearTimeout(timer);
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (data.user.role === 'admin') {
                    localStorage.setItem('admin_session', JSON.stringify(data.user));
                    router.push('/admin');
                } else {
                    login(data.user);
                    if (!data.user.plan_id) {
                        router.push('/pricing');
                    } else {
                        router.push('/dashboard');
                    }
                }
            } else {
                const msg = data.message || 'Authentication failed.';
                setError(msg);
                speak(msg);
            }
        } catch (err) {
            setError("Connection to interview node failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0A0D14]' : 'bg-[#F0F4F8]'} font-sans p-6`}>

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
            <div className={`w-full max-w-[900px] h-auto lg:h-[580px] flex flex-col lg:flex-row shadow-[0_25px_50px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden ${theme === 'dark' ? 'bg-[#141B26]' : 'bg-white'} border border-white/5 relative z-10`}>

                {/* ══ LEFT SIDE — Admission Illustration ══ */}
                <div className={`hidden lg:flex flex-[0_0_42%] flex-col p-10 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] relative overflow-hidden`}>
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                        <div className="relative w-full max-w-[280px] aspect-square animate-float flex items-center justify-center">
                            <img
                                src="/hero_robot_laptop.png"
                                alt="Student Login"
                                className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                            />
                            <div className="absolute inset-0 bg-white/20 rounded-full blur-[70px] -z-10" />
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-[24px] p-6 relative z-10 border border-white/15 shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-blue-600">
                                <Sparkles size={12} fill="currentColor" />
                            </div>
                            <span className="text-white text-[9px] font-black uppercase tracking-[0.2em]">Candidate Portal</span>
                        </div>
                        <h2 className="text-white text-xl font-black mb-2 leading-tight">
                            Master Your <br />Interview Skills.
                        </h2>
                        <p className="text-white/80 text-[12px] font-medium leading-relaxed">
                            Industry-leading AI mock interviews with instant feedback.
                        </p>
                    </div>
                </div>

                {/* ══ RIGHT SIDE — Admission Form ══ */}
                <div className={`flex-1 flex flex-col p-8 lg:p-12 relative overflow-hidden ${theme === 'dark' ? 'bg-[#141B26]' : 'bg-white'}`}>

                    <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                        <div className="mb-8 text-center lg:text-left">
                            <h1 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'} mb-1.5 tracking-tighter`}>
                                Candidate Access
                            </h1>
                            <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-[13px] font-semibold`}>
                                Log in to your profile to continue.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-[11px] font-bold animate-shake">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-widest`}>
                                    Candidate ID / Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        name="identifier"
                                        required
                                        value={formData.identifier}
                                        onChange={handleChange}
                                        placeholder="yourname@domain.com"
                                        className={`w-full ${theme === 'dark' ? 'bg-slate-800/40 border-white/5 text-white' : 'bg-[#F9FBFF] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-xl py-3.5 pl-11 pr-4 text-[13px] outline-none transition-all focus:border-blue-500 font-medium`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ml-1 uppercase tracking-widest`}>
                                    Security Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors pointer-events-none z-20">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full ${theme === 'dark' ? 'bg-slate-800/40 border-white/5 text-white' : 'bg-[#F9FBFF] border-slate-200 text-slate-900 focus:bg-white'} border-2 rounded-xl py-3.5 pl-11 pr-12 text-[13px] outline-none transition-all focus:border-blue-500 font-medium relative z-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <Link href="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:underline transition-all uppercase tracking-wider">
                                    Recover Password
                                </Link>
                                <Link href="/admin-login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors">
                                    Admin Access →
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[18px] font-black text-[14px] shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <>Start Evaluation <ChevronRight size={18} /></>}
                            </button>
                        </form>

                        <div className="mt-10 text-center text-[10px] font-medium text-slate-500 uppercase tracking-[0.15em]">
                            Don't have an account? <Link href="/signup" className="text-blue-600 font-black hover:underline ml-1">ENROLL NOW →</Link>
                        </div>
                    </div>
                </div>
            </div>



            <style jsx global>{`
                @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
        </div>
    );
}
