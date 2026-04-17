"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronLeft, Sparkles, Monitor, Mic, Shield, 
    BarChart, Brain, Terminal, Zap, Globe, 
    Lock, Database, CheckCircle, ArrowRight, Sun, Moon, LogOut
} from 'lucide-react';
import { useTheme } from '../theme-context';
import { useAuth } from '../auth-context';

export default function FeaturesPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

    const mainFeatures = [
        {
            title: "AI Adaptation Engine",
            desc: "Our neural engine doesn't just read your resume; it understands it. Every question is dynamically generated based on your specific projects, skills, and the target role's seniority.",
            icon: <Brain className="text-blue-600" />,
            color: "blue"
        },
        {
            title: "Voice-First Interaction",
            desc: "Experience zero-latency voice interaction. The AI listens, processes your speech, and responds with natural articulation, simulating a real human conversation experience.",
            icon: <Mic className="text-blue-600" />,
            color: "blue"
        },
        {
            title: "Live Coding Sandbox",
            desc: "Solve complex algorithmic challenges in a real-time, proctored environment. Support for Python, Java, C, and JavaScript with instant feedback and plagiarism detection.",
            icon: <Terminal className="text-blue-600" />,
            color: "blue"
        },
        {
            title: "Advanced Proctoring",
            desc: "Maintain the highest standards of integrity with our multi-layered identity verification, face tracking, tab-switch monitoring, and gadget detection algorithms.",
            icon: <Shield className="text-blue-600" />,
            color: "blue"
        },
        {
            title: "Technical Analytics",
            desc: "Receive a deep-dive analysis of your performance. We evaluate technical accuracy, communication clarity, confidence levels, and problem-solving efficiency.",
            icon: <BarChart className="text-blue-600" />,
            color: "blue"
        },
    ];

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Inter] selection:bg-slate-200 selection:text-slate-900 transition-colors duration-500">
            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--nav-bg)]/80 border-b border-[var(--border)] py-4">
                <div className="max-w-7xl mx-auto px-6 md:px-8 flex justify-between items-center">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2.5 text-[var(--text-muted)] hover:text-slate-900 transition-all font-bold group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-8 h-8 bg-blue-600 border border-blue-700 rounded-md flex items-center justify-center text-white font-black shadow-sm">AI</div>
                        <div className="font-black tracking-tight text-[var(--foreground)] text-xl transition-all uppercase tracking-tighter">Features</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTheme}
                            className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'} border transition-all shadow-sm flex items-center justify-center`}
                            title="Toggle Light/Dark Mode"
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                        </button>
                        
                        {/* Functional Name Button */}
                        {user && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className={`px-5 py-2.5 rounded-2xl ${theme === 'dark' ? 'bg-slate-500/10 text-white hover:bg-slate-500/20 border-slate-500/30' : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-slate-500/5'} border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                                >
                                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                                    {user.name.split(' ')[0]}
                                </button>
                                <button
                                    onClick={logout}
                                    className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10' : 'bg-white border-slate-200 text-red-500 hover:bg-red-50'} border transition-all shadow-sm active:scale-90`}
                                    title="Sign Out"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="text-center mb-20">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
                            The Future of <span className="text-blue-600 underline decoration-blue-200">Interviewing</span>.
                        </h1>
                        <p className="text-base md:text-xl text-[var(--text-muted)] font-medium max-w-3xl mx-auto leading-relaxed">
                            Our platform combines state-of-the-art AI, real-time audio analysis, and enterprise-grade security to provide the most realistic practice environment ever built.
                        </p>
                    </header>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainFeatures.map((f, idx) => (
                            <div key={idx} className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-blue-400 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-all"></div>
                                <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-8 transition-transform group-hover:scale-110 shadow-sm text-blue-600">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-black mb-4 tracking-tight">{f.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-8 flex-1">
                                    {f.desc}
                                </p>
                                <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest mt-auto">
                                    Included in Pro <ArrowRight size={14} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-20 bg-blue-600 rounded-2xl p-10 md:p-20 text-center relative overflow-hidden text-white shadow-2xl shadow-blue-600/30">
                        <div className="absolute inset-0 bg-blue-600 opacity-90"></div>
                        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px]"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter">Ready to experience these features?</h2>
                            <p className="text-blue-100 text-base md:text-lg font-medium max-w-2xl mx-auto mb-10">
                                Join over 50,000+ candidates who have successfully secured roles at top tech companies using our platform.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => router.push('/signup')}
                                    className="px-8 py-4 bg-white text-blue-600 hover:bg-slate-50 rounded-md font-bold text-sm uppercase tracking-wider shadow-lg transition-all hover:-translate-y-1 active:scale-95 border-none cursor-pointer"
                                >
                                    Start Practice Now
                                </button>
                                <button 
                                    onClick={() => router.push('/contact')}
                                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-md font-bold text-sm uppercase tracking-wider backdrop-blur-md transition-all active:scale-95 border border-white/20 cursor-pointer"
                                >
                                    Contact Sales
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER --- */}
            <footer className="py-12 bg-[var(--background)] border-t border-[var(--border)] text-center">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">AI</div>
                            <span className="font-black text-2xl tracking-tighter">Interview.AI</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
                            <a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</a>
                            <a href="/terms" className="hover:text-blue-600 transition-colors">Terms</a>
                            <a href="/contact" className="hover:text-blue-600 transition-colors">Contact</a>
                        </div>
                        <div className="text-xs font-medium text-[var(--text-muted)]">
                            &copy; AI Interviewer. Master your future.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
