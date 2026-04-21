"use client";

import React from 'react';
import { getApiUrl } from '../../api-utils';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, BookOpen, Monitor, Mic, Shield,
    Wifi, Sun, Moon, AlertTriangle, CheckCircle2,
    Smartphone, ExternalLink, Timer, Info, ChevronRight, Star
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '../theme-context';
import { useAuth } from '../auth-context';

import { Suspense, useState, useRef, useEffect } from 'react';
import { getApiUrl } from '../../api-utils';

function InnerInstructions() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, updateUser } = useAuth();
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const globalSpeechTokenRef = useRef(0);
    
    // CAPTURE TOPIC FROM URL
    const searchParams = useSearchParams();
    const topic = searchParams ? searchParams.get('topic') || '' : '';
    const mode = searchParams ? searchParams.get('mode') || '' : '';
    const section = searchParams ? searchParams.get('section') || '' : '';

    // Gating Check: Specialized topics require premium plans
    const isSpecialized = topic && topic !== 'Technical Core';
    const isPractice = mode === 'practice';
    const isPlanEligible = !isSpecialized || (user?.plan_id && Number(user.plan_id) >= 2);
    const hasCredits = user?.interviews_remaining && user.interviews_remaining > 0;
    
    // Final eligibility logic: Practice mode bypasses credit check if plan is valid
    const canStart = isPlanEligible && (hasCredits || isPractice);

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

    // Sync user data to ensure latest credits (Handles late-session updates)
    useEffect(() => {
        if (user && (user.interviews_remaining ?? 0) === 0) {
            const refreshUser = async () => {
                setIsRefreshing(true);
                try {
                    const res = await fetch(`http://localhost:5000/api/user/${user.id}`);
                    const data = await res.json();
                    if (data.status === 'success' && data.user) {
                        updateUser(data.user);
                    }
                } catch (e) {
                    console.error("Failed to refresh user credits:", e);
                } finally {
                    setIsRefreshing(false);
                }
            };
            refreshUser();
        }

        // Welcome Orientation
        const welcomeText = `Welcome to the ${topic || 'Core'} Assessment. I am Atlas. Please review the hardware and proctoring protocols carefully before initiating the session. Good luck.`;
        const timer = setTimeout(() => speak(welcomeText), 1000);
        return () => clearTimeout(timer);
    }, [user?.id, topic]);

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
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-900 font-black shadow-sm">AI</div>
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
                                className={`px-5 py-2.5 rounded-2xl ${theme === 'dark' ? 'bg-slate-500/10 text-white hover:bg-slate-500/20 border-slate-500/30' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-500/5'} border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                            >
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
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
                            <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-900 rounded-xl">
                                <BookOpen size={20} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Candidate <span className="text-slate-900">Protocol</span></h1>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed max-w-2xl">
                            To ensure a fair and successful interview, please review these mandatory guidelines. Compliance with proctoring rules is essential for score validation.
                        </p>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                            {/* PLAN INFORMATION */}
                            <div>
                                {!user?.plan_id || user.plan_id === 1 ? (
                                    <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl max-w-xl">
                                        <Timer className="text-amber-500" size={24} />
                                        <div>
                                            <h4 className="text-amber-500 font-black text-[11px] uppercase tracking-widest">Demo Mode Active</h4>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Session limited to 5 minutes. PDF report download is locked until subscription.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl max-w-xl">
                                        <CheckCircle2 className="text-emerald-500" size={24} />
                                        <div>
                                            <h4 className="text-emerald-500 font-black text-[11px] uppercase tracking-widest">Premium Active</h4>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Full length interview enabled with comprehensive analytics.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* HARDWARE TEST MODULE */}
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Hardware Verification</h4>
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                </div>
                                <div className="grid grid-cols-3 gap-6 w-full mb-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm"><Monitor size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">Camera</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-sm"><Mic size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">Mic</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200 shadow-sm"><Wifi size={18} /></div>
                                        <span className="text-[10px] font-bold text-slate-500">Net 4G+</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                            stream.getTracks().forEach(t => t.stop());
                                            alert("✅ Hardware Verified: Your camera and microphone are working correctly.");
                                        } catch (e) {
                                            alert("❌ Hardware Error: Please ensure camera and microphone permissions are granted in your browser settings.");
                                        }
                                    }}
                                    className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Pre-Check Hardware
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* NEW: Assessment Objective Snapshot */}
                    {topic && (
                        <div className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                            <div className="relative z-10">
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
                                    Module Specialization
                                </span>
                                <h2 className="text-3xl font-black tracking-tight mb-2 italic uppercase tracking-tighter">{topic}</h2>
                                <p className="text-slate-200 text-sm font-medium mb-6 opacity-80">This session is optimized for {topic} focus areas.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        (topic === 'Self-Introduction' || topic === 'Self Introduction') ? ['Dynamic Branding', 'Narrative Impact', 'Vocal Presence'] :
                                        topic === 'Technical Core' ? ['Algorithms & Complexity', 'Logic Optimization', 'Edge Case Handling'] :
                                        topic === 'System Design' ? ['Scalability Archetypes', 'Load Balancing', 'Database Sharding'] :
                                        topic === 'HR & Leadership' ? ['Conflict Strategy', 'Team Motivation', 'Strategic Vision'] :
                                        topic === 'Data Intelligence' ? ['Model Evaluation', 'Neural Architecture', 'Feature Engineering'] :
                                        topic === 'Project Deep-Dive' ? ['Architecture Ownership', 'Critical Debugging', 'Tech Stack Choices'] :
                                        topic === 'Frontend Mastery' ? ['Rendering Internals', 'Browser Performance', 'State Management'] :
                                        ['General Assessment', 'Skill Analysis', 'Performance Benchmark']
                                    ][0].map((objective, oidx) => (
                                        <div key={oidx} className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs font-black uppercase tracking-widest">{objective}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEW: Performance Ecosystem for Self-Introduction */}
                    {(topic === 'Self-Introduction' || topic === 'Self Introduction') && (
                        <div className="mb-12 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="text-center">
                                <span className="text-slate-400 font-bold tracking-[0.3em] uppercase text-[9px]">Introduction Ecosystem</span>
                                <h2 className="text-2xl font-black mt-2 tracking-tight">Core Focus Areas</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { title: 'Dynamic Branding', robot: 'test.png', desc: 'Identify and refine your unique professional identity and value hooks.' },
                                    { title: 'Narrative Impact', robot: 'reports.png', desc: 'Structure your journey into a compelling, data-backed success story.' },
                                    { title: 'Vocal Authority', robot: 'interview.png', desc: 'Master the rhythm, clarity, and authoritative tone of your delivery.' },
                                    { title: 'Executive Presence', robot: 'admin.png', desc: 'Exude confidence and leadership through non-verbal and strategic cues.' }
                                ].map((focus, fidx) => (
                                    <div key={fidx} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-soft hover:shadow-xl transition-all hover:-translate-y-1 group">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform overflow-hidden border border-slate-100">
                                            <img src={`/ecosystem/${focus.robot}`} alt={focus.title} className="w-full h-full object-cover mix-blend-multiply" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight whitespace-nowrap">{focus.title}</h3>
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold">{focus.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


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
                            <div key={idx} className="bg-[var(--card-bg)] p-5 rounded-[1.5rem] border border-[var(--border)] shadow-sm hover:border-slate-400 transition-all group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-slate-100">
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
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/30 flex flex-col justify-between relative overflow-hidden group border border-white/10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                                <Timer size={24} className="animate-pulse" /> Precision Timing
                            </h3>
                            <p className="text-slate-300 font-bold text-sm leading-relaxed mb-4 max-w-md">
                                Evaluation segments are timed for optimal realism. The AI will monitor your cadence, clarity, and keyword depth.
                            </p>
                            <div className="flex items-center gap-3 mb-8">
                                <div className={`px-4 py-2 rounded-2xl border ${hasCredits || isPractice ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-red-500/20 border-red-500/30 text-red-100'}`}>
                                    <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">
                                        {isPractice ? 'Practice Status' : 'Remaining Interviews'}
                                    </span>
                                    <span className="text-xl font-black">
                                        {isPractice ? "Active ✅" : `${user?.interviews_remaining || 0} Attempts`}
                                    </span>
                                </div>
                                {isSpecialized && (
                                    <div className="px-4 py-2 rounded-2xl border bg-amber-500/20 border-amber-500/30 text-amber-100">
                                        <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">Module Status</span>
                                        <span className="text-xl font-black">{isPlanEligible ? "Premium Unlocked" : "Locked"}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Conditional Initiate Button based on Plan and Credits */}
                        {canStart ? (
                            <button
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        document.documentElement.requestFullscreen().catch(() => {});
                                    }
                                    let url = user ? '/?start=true' : '/signup';
                                    if (topic) url += `&topic=${encodeURIComponent(topic)}`;
                                    if (mode) url += `&mode=${mode}`;
                                    if (section) url += `&section=${section}`;
                                    router.push(url);
                                }}
                                className="relative z-10 w-full py-5 bg-white text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all active:scale-95 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 group/btn"
                            >
                                Initiate {isPractice ? 'Practice Drill' : (isSpecialized ? 'Specialized' : 'Core') + ' Assessment'} <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                             <div className="flex flex-col gap-3 text-center">
                                <button
                                    onClick={() => {
                                        if (topic) localStorage.setItem('return_topic', topic);
                                        router.push('/pricing');
                                    }}
                                    className="relative z-10 w-full py-5 bg-amber-400 text-amber-950 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-300 transition-all active:scale-95 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 group/btn"
                                >
                                    {isPlanEligible ? "Subscribe for more Credits" : "Upgrade Plan to Unlock"} <CheckCircle2 size={18} className="group-hover/btn:rotate-12 transition-transform" />
                                </button>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                    {isPlanEligible ? "Trial session exhausted." : "This module requires an ATS Pro plan or higher."}
                                </p>
                             </div>
                        )}
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <h2 className="text-3xl font-black tracking-tight mb-8">Interview <span className="text-slate-900">Protocol Workflow</span></h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { step: "01", text: "Identity Verification", sub: "Face + Photo Match" },
                                { step: "02", text: "Resume Sync", sub: "Dynamic Q-Gen" },
                                { step: "03", text: "Proctored Rounds", sub: "Voice + Coding" },
                                { step: "04", text: "AI Assessment", sub: "Instant Report" }
                            ].map((s, i) => (
                                <div key={i} className="flex-1 p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl relative overflow-hidden">
                                    <span className="text-4xl font-black text-slate-100 dark:text-slate-800/20 absolute bottom-0 right-0 -mb-1 -mr-1">{s.step}</span>
                                    <p className="text-slate-900 font-black text-[10px] uppercase tracking-widest mb-1">Step {s.step}</p>
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
                            <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-900 font-black text-xs">AI</div>
                            <span className="font-black text-lg tracking-tighter">AI Interviewer</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
                            <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
                            <a href="/terms" className="hover:text-slate-900 transition-colors">Terms</a>
                            <a href="/contact" className="hover:text-slate-900 transition-colors">Contact</a>
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

export default function InstructionsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-slate-500 font-bold">Loading Instructions...</div>}>
            <InnerInstructions />
        </Suspense>
    );
}
