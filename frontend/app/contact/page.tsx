"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function ContactPage() {
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

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">Contact Support</h1>
                <p className={`text-sm font-bold mb-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>We're here to help you</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">

                    {/* -- Contact Form Info -- */}
                    <div className="space-y-8">
                        <div>
                            <h3 className={`text-2xl font-black mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>Get in Touch</h3>
                            <p className={`text-sm md:text-base leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-8`}>
                                Having trouble with your microphone during an assessment? Need to dispute a proctoring penalty? Or just want to learn more about the AI models powering our platform? Reach out to our 24/7 engineering team.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs uppercase tracking-widest font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Email Support</p>
                                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>hello@ai-interviewer.tech</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs uppercase tracking-widest font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Call us (Priority)</p>
                                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>+1 (800) 123-4567</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
