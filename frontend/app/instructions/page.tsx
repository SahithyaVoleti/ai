"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, BookOpen, Monitor, Mic, Shield,
    Wifi, Sun, Moon, AlertTriangle, CheckCircle2,
    Smartphone, ExternalLink, Timer, Info
} from 'lucide-react';
import { useTheme } from '../theme-context';
import { useAuth } from '../auth-context';

export default function InstructionsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();

    const sections = [
        {
            title: "Hardware Setup",
            icon: <Monitor className="text-blue-500" />,
            rules: [
                "Maintain a stable internet connection (at least 2Mbps).",
                "Ensure your webcam is positioned at eye level.",
                "Use a high-quality microphone for clear audio capture.",
                "Plug in your laptop/PC to avoid battery issues."
            ]
        },
        {
            title: "Environment & Audio",
            icon: <Mic className="text-emerald-500" />,
            rules: [
                "Be in a quiet, private room without background noise.",
                "Ensure sufficient lighting on your face (avoid strong backlighting).",
                "No other people should be visible or audible in the room.",
                "Wear professional attire to maintain interview decorum."
            ]
        },
        {
            title: "Proctoring Rules",
            icon: <Shield className="text-indigo-600" />,
            rules: [
                "Fullscreen mode is mandatory throughout the session.",
                "Only 3 tab-switch warnings allowed before termination.",
                "Detection of mobile phones will lead to immediate failure.",
                "Keep your face visible within the frame at all times."
            ]
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
                        <div className="font-black tracking-tight text-[var(--foreground)] text-xl transition-all uppercase tracking-tighter">Instructions</div>
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
                            <button
                                onClick={() => router.push('/dashboard')}
                                className={`px-5 py-2.5 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/10 text-white hover:bg-indigo-500/20 border-indigo-500/30' : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5'} border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                            >
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                {user.name.split(' ')[0]}
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-6 px-6 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                                <BookOpen size={20} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Candidate <span className="text-indigo-600">Protocol</span></h1>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed max-w-2xl">
                            To ensure a fair and successful interview, please review these mandatory guidelines. Compliance with proctoring rules is essential for score validation.
                        </p>
                    </header>

                    {/* Quick Alert */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 mb-6 flex items-start gap-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <AlertTriangle size={80} className="text-amber-600" />
                        </div>
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-amber-900 dark:text-amber-400 mb-1">Crucial Reminder</h3>
                            <p className="text-xs font-bold text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                                Once the interview begins, exiting Fullscreen mode or switching browser tabs more than 3 times will result in <span className="underline decoration-2">automatic session termination</span> and a failure report.
                            </p>
                        </div>
                    </div>

                    {/* Guidelines Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {sections.map((section, idx) => (
                            <div key={idx} className="bg-[var(--card-bg)] p-5 rounded-[1.5rem] border border-[var(--border)] shadow-sm hover:border-indigo-500 transition-all group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                        {section.icon}
                                    </div>
                                    <h3 className="text-lg font-black">{section.title}</h3>
                                </div>
                                <ul className="space-y-3">
                                    {section.rules.map((rule, rIdx) => (
                                        <li key={rIdx} className="flex gap-2 text-xs font-medium text-[var(--text-muted)] group/item">
                                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                                            <span>{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* Special Note Box */}
                        <div className="bg-indigo-600 text-white p-6 rounded-[1.5rem] shadow-xl shadow-indigo-500/30 flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                                <Timer size={80} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-3 flex items-center gap-2">
                                    <Timer size={20} /> Timing Logic
                                </h3>
                                <p className="text-white/80 font-bold text-xs leading-relaxed mb-4">
                                    Most technical questions have a 3-5 minute response window. The AI interviewer will verbally prompt you if your response is too short or if you are inactive for too long.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/signup')}
                                className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                            >
                                I'm Ready to Practice
                            </button>
                        </div>
                    </div>

                    {/* Step by Step visualization */}
                    <div className="mt-8">
                        <h2 className="text-2xl font-black tracking-tight mb-4 text-center">Interview <span className="text-indigo-600">Workflow</span></h2>
                        <div className="flex flex-col md:flex-row gap-3 items-stretch">
                            {[
                                { step: "01", text: "Identity Verification", sub: "Face + Photo Match" },
                                { step: "02", text: "Resume Sync", sub: "Dynamic Q-Gen" },
                                { step: "03", text: "Proctored Rounds", sub: "Voice + Coding" },
                                { step: "04", text: "AI Assessment", sub: "Instant Report" }
                            ].map((s, i) => (
                                <div key={i} className="flex-1 p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl relative overflow-hidden">
                                    <span className="text-4xl font-black text-slate-100 dark:text-slate-800/20 absolute bottom-0 right-0 -mb-1 -mr-1">{s.step}</span>
                                    <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-1">Step {s.step}</p>
                                    <h4 className="font-bold text-xs mb-1">{s.text}</h4>
                                    <p className="text-[var(--text-muted)] text-[9px] uppercase font-black tracking-tighter">{s.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER --- */}
            <footer className="py-4 bg-[var(--background)] border-t border-[var(--border)] text-center mt-6">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">AI</div>
                            <span className="font-black text-lg tracking-tighter">AI Interviewer</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
                            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</a>
                            <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms</a>
                            <a href="/contact" className="hover:text-indigo-600 transition-colors">Contact</a>
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
