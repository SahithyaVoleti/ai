"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronLeft, Sparkles, Monitor, Mic, Shield, 
    BarChart, Brain, Terminal, Zap, Globe, 
    Lock, Database, CheckCircle, ArrowRight, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../theme-context';

export default function FeaturesPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    const mainFeatures = [
        {
            title: "AI Adaptation Engine",
            desc: "Our neural engine doesn't just read your resume; it understands it. Every question is dynamically generated based on your specific projects, skills, and the target role's seniority.",
            icon: <Brain className="text-indigo-600" />,
            color: "indigo"
        },
        {
            title: "Voice-First Interaction",
            desc: "Experience zero-latency voice interaction. The AI listens, processes your speech, and responds with natural articulation, simulating a real human conversation experience.",
            icon: <Mic className="text-blue-500" />,
            color: "blue"
        },
        {
            title: "Live Coding Sandbox",
            desc: "Solve complex algorithmic challenges in a real-time, proctored environment. Support for Python, Java, C, and JavaScript with instant feedback and plagiarism detection.",
            icon: <Terminal className="text-emerald-500" />,
            color: "emerald"
        },
        {
            title: "Advanced Proctoring",
            desc: "Maintain the highest standards of integrity with our multi-layered identity verification, face tracking, tab-switch monitoring, and gadget detection algorithms.",
            icon: <Shield className="text-red-500" />,
            color: "red"
        },
        {
            title: "Technical Analytics",
            desc: "Receive a deep-dive analysis of your performance. We evaluate technical accuracy, communication clarity, confidence levels, and problem-solving efficiency.",
            icon: <BarChart className="text-purple-500" />,
            color: "purple"
        },
        {
            title: "Enterprise Infrastructure",
            desc: "Scalable SOC2 compliant architecture designed for high-concurrency interview cycles. Secure data encryption and privacy-first candidate handling.",
            icon: <Lock className="text-amber-500" />,
            color: "amber"
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[Inter] selection:bg-indigo-500 selection:text-white transition-colors duration-500">
            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--nav-bg)]/80 border-b border-[var(--border)] py-4">
                <div className="max-w-7xl mx-auto px-6 md:px-8 flex justify-between items-center">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2.5 text-[var(--text-muted)] hover:text-indigo-600 transition-all font-bold group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-indigo-500/20 shadow-lg">AI</div>
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
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-6 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="text-center mb-20">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                            <Sparkles size={16} /> Next-Gen Technology
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
                            The Future of <span className="text-indigo-600 underline decoration-indigo-200">Interviewing</span>.
                        </h1>
                        <p className="text-base md:text-xl text-[var(--text-muted)] font-medium max-w-3xl mx-auto leading-relaxed">
                            Our platform combines state-of-the-art AI, real-time audio analysis, and enterprise-grade security to provide the most realistic practice environment ever built.
                        </p>
                    </header>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainFeatures.map((f, idx) => (
                            <div key={idx} className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-indigo-500 transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 shadow-sm">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-black mb-4 tracking-tight">{f.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-8 flex-1">
                                    {f.desc}
                                </p>
                                <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-auto">
                                    Included in Pro <ArrowRight size={14} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-20 bg-slate-900 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden text-white shadow-2xl shadow-indigo-500/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-slate-900 opacity-60"></div>
                        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter">Ready to experience these features?</h2>
                            <p className="text-white/60 text-base md:text-lg font-medium max-w-2xl mx-auto mb-10">
                                Join over 50,000+ candidates who have successfully secured roles at top tech companies using our platform.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button 
                                    onClick={() => router.push('/signup')}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 active:scale-95 border-none cursor-pointer"
                                >
                                    Start Practice Now
                                </button>
                                <button 
                                    onClick={() => router.push('/contact')}
                                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest backdrop-blur-md transition-all active:scale-95 border border-white/10 cursor-pointer"
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
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">AI</div>
                            <span className="font-black text-2xl tracking-tighter">Interview.AI</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
                            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</a>
                            <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms</a>
                            <a href="/contact" className="hover:text-indigo-600 transition-colors">Contact</a>
                        </div>
                        <div className="text-xs font-medium text-[var(--text-muted)]">
                            &copy; {new Date().getFullYear()} AI Interviewer. Master your future.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
