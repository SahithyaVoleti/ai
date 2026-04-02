"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-context';
import { useAuth } from '../auth-context';

export default function TermsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0A0D14] text-white' : 'bg-[#F0F4F8] text-[#0F172A]'} p-8 md:p-12 font-sans transition-colors duration-500`}>
            <div className={`max-w-4xl mx-auto rounded-[2rem] p-8 md:p-12 shadow-xl border ${theme === 'dark' ? 'bg-[#141B26] border-white/5' : 'bg-white border-slate-200'} relative z-10`}>
                <div className="flex justify-between items-center mb-10">
                    <button
                        onClick={() => router.back()}
                        className={`flex items-center gap-2 font-bold text-sm transition-colors group ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTheme}
                            className={`p-2 rounded-xl border transition-all shadow-sm flex items-center justify-center ${theme === 'dark' ? 'bg-[#0A0D14] border-white/10' : 'bg-white border-slate-200'}`}
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
                        </button>
                        
                        {user && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className={`px-5 py-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border-indigo-500/30 border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                            >
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                {user.name.split(' ')[0]}
                            </button>
                        )}
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Terms of Service</h1>
                <p className={`text-sm font-bold mb-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>Effective Date: February</p>

                <div className={`space-y-8 text-sm md:text-base leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>
                        Welcome to the AI Interviewer Protocol. By accessing our platform, participating in AI-driven mock interviews, and using our evaluation services, you agree to be bound by these Terms of Service.
                    </p>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>1. Use of the Services</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Eligibility:</strong> You must be an officially enrolled candidate or authorized user to begin an assessment.</li>
                            <li><strong>Proctoring Integrity:</strong> You agree not to use multiple tabs (over the 3-limit allowance), mobile devices, notes, or third parties for assistance during technical evaluation modules.</li>
                            <li><strong>Session Recording:</strong> Voice and text-based metrics are actively recorded to construct your score report. You acknowledge and consent to this technical analysis.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>2. User Content & Intellectual Property</h2>
                        <p>
                            Code, audio responses, and resumes uploaded by you remain your property. However, you grant AI Interviewer a temporary license to process, parse, and evaluate them via our Large Language Models and AI parsing engines. The proprietary platform UI, models, logic, and output reports represent the intellectual property of AI Interviewer Protocol.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>3. Disclaimer of Warranties</h2>
                        <p>
                            AI output is non-deterministic and stochastic. While we strive to provide the most precise interview scores and evaluations possible, score assessments should be used primarily as educational self-improvement tools.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
