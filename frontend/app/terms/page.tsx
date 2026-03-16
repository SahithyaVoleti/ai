"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function TermsPage() {
    const router = useRouter();
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0A0D14] text-white' : 'bg-[#F0F4F8] text-[#0F172A]'} p-8 md:p-12 font-sans transition-colors duration-500`}>
            <div className={`max-w-4xl mx-auto rounded-[2rem] p-8 md:p-12 shadow-xl border ${theme === 'dark' ? 'bg-[#141B26] border-white/5' : 'bg-white border-slate-200'} relative z-10`}>
                <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 mb-10 font-bold text-sm transition-colors group ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Terms of Service</h1>
                <p className={`text-sm font-bold mb-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>Effective Date: February 2026</p>

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
