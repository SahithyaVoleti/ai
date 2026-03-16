"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function PrivacyPage() {
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

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Privacy Policy</h1>
                <p className={`text-sm font-bold mb-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>Last Updated: February 2026</p>

                <div className={`space-y-8 text-sm md:text-base leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>
                        Your privacy is critically important to us. This Privacy Policy outlines how the AI Interviewer Protocol collects, uses, and protects your information as part of your interview evaluation process.
                    </p>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>1. Information We Collect</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Identity Data:</strong> Name, email address, phone number, and education details you declare during registration.</li>
                            <li><strong>Biometric Data:</strong> Automated analysis of your video feed for proctoring purposes (eye movement, face detection, gadget detection). Video feeds are processed in real-time and are <strong>not</strong> permanently recorded unless stated otherwise.</li>
                            <li><strong>Audio Data:</strong> Voice recordings solely for transcription and AI assessment of your interview answers.</li>
                            <li><strong>Professional Data:</strong> Résumé uploads, including employment histories and project links you provide.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>2. How We Use Information</h2>
                        <p>
                            We use collected data exclusively to facilitate your mock interview experience, generate your competency reports, ensure academic integrity (proctoring), and deliver your dashboard analytics. We do not sell your data to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-black mb-3 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>3. Data Security</h2>
                        <p>
                            We implement enterprise-grade encryption for data at rest and in transit. Your resumes and interview transcripts are strictly isolated within your candidate profile.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
