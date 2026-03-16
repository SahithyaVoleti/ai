"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Target, Users, Zap, Award, Globe, Heart, Rocket, ChevronLeft, Github, Linkedin, Twitter } from 'lucide-react';
import { useTheme } from '../theme-context';
import Link from 'next/link';

export default function AboutPage() {
    const router = useRouter();
    const { theme } = useTheme();

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
                        <div className="font-black tracking-tight text-[var(--foreground)] text-xl transition-all">AI Interviewer</div>
                    </div>
                    <div className="w-20"></div> {/* Spacer */}
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">

                    <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight">
                        Revolutionizing <span className="text-indigo-600 italic">Hiring</span> Through <br className="hidden md:block" /> Intelligence.
                    </h1>
                    <p className="text-xl text-[var(--text-muted)] font-medium leading-relaxed mb-12 max-w-2xl mx-auto">
                        We built AI Interviewer to bridge the gap between candidate potential and career opportunities. Experience the future of mock interviews today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button onClick={() => router.push('/signup')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all active:scale-95">
                            Join the Revolution
                        </button>
                        <button
                            onClick={() => {
                                document.getElementById('story-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-8 py-4 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl font-black text-lg hover:border-indigo-500 transition-all shadow-sm"
                        >
                            Our Story
                        </button>
                    </div>
                </div>
            </main>

            {/* --- CORE VALUES --- */}
            <section className="py-20 bg-[var(--card-bg)] border-y border-[var(--border)] overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -mr-48 -mt-48"></div>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                        <div className="max-w-lg">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Our Core Values</h2>
                            <p className="text-[var(--text-muted)] font-medium italic">"The values we live by, the tech we build for."</p>
                        </div>
                        <div className="text-indigo-600 font-bold flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl">
                            <Target size={18} /> Driven by Excellence
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <div className="p-8 bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-indigo-500 transition-all group">
                            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-4">Unmatched Speed</h3>
                            <p className="text-[var(--text-muted)] font-medium text-sm leading-relaxed">
                                Get instant evaluation and feedback on your performance. No more waiting days for interview results.
                            </p>
                        </div>

                        <div className="p-8 bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-indigo-500 transition-all group">
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                                <Shield size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-4">Accountability</h3>
                            <p className="text-[var(--text-muted)] font-medium text-sm leading-relaxed">
                                Our AI proctoring ensures a fair environment for everyone, eliminating bias and focusing on pure merit.
                            </p>
                        </div>

                        <div className="p-8 bg-[var(--background)] rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-indigo-500 transition-all group">
                            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                                <Heart size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-4">Human-First</h3>
                            <p className="text-[var(--text-muted)] font-medium text-sm leading-relaxed">
                                We build technology that mimics human conversation while maintaining professional evaluation standards.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- STATS SECTION --- */}
            <section id="story-section" className="py-24 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Small Team. <br />Big <span className="text-indigo-600 underline underline-offset-8">Impact</span>.</h2>
                        <p className="text-lg font-medium text-[var(--text-muted)] italic">
                            "We are on a mission to prepare every student for their dream job, one mock interview at a time."
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-8">
                            <div>
                                <p className="text-4xl font-black text-indigo-600">50K+</p>
                                <p className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">Interviews Conducted</p>
                            </div>
                            <div>
                                <p className="text-4xl font-black text-indigo-600">98%</p>
                                <p className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">Success Rate</p>
                            </div>
                            <div>
                                <p className="text-4xl font-black text-indigo-600">120+</p>
                                <p className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">Global Institutions</p>
                            </div>
                            <div>
                                <p className="text-4xl font-black text-indigo-600">1.2M</p>
                                <p className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">Lines of Intelligence</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute -inset-4 bg-indigo-500/5 blur-3xl opacity-50 rounded-full"></div>
                        <img
                            src="/modern_ai_team.png"
                            alt="Innovation in action"
                            className="rounded-[3rem] shadow-2xl relative z-1 border border-[var(--border)] transition-all duration-700 hover:scale-[1.02]"
                        />
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-500/30">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>

                    <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Ready to Master Your <br className="hidden md:block" /> Next Interview?</h2>
                    <p className="text-lg md:text-xl font-medium text-white/80 max-w-2xl mx-auto mb-12">
                        Don't let your first interview be the one that matters. Practice with Ishan, our AI agent, and get hired.
                    </p>
                    <button onClick={() => router.push('/signup')} className="px-12 py-5 bg-white text-indigo-600 rounded-3xl font-black text-xl hover:bg-slate-50 transition-all active:scale-95 shadow-xl">
                        Get Started Free
                    </button>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-12 bg-[var(--background)] border-t border-[var(--border)] text-center">
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
                            &copy; {new Date().getFullYear()} AI Interviewer. Master your future.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
