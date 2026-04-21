"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../../../api-utils';
import { useAuth } from '../../auth-context';
import { useRouter } from 'next/navigation';
import { 
    LayoutDashboard, Zap, FileSignature, BarChart3, Award, Settings, 
    LogOut, User as UserIcon, Mail, Phone, MapPin, Linkedin, Github, 
    Globe, Activity, Plus, Trash2, GraduationCap, Briefcase, BookOpen, 
    Code, Download, CheckCircle, ArrowLeft, Sparkles, X, Shield, Wrench, Clock,
    Link as LinkIcon, ExternalLink, Hash, Calendar, FileText, Star, Menu
} from 'lucide-react';
import Link from 'next/link';

export default function ResumeBuilderPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userResumes, setUserResumes] = useState<any[]>([]);
    const [isSavingResume, setIsSavingResume] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const globalSpeechTokenRef = useRef(0);
    
    // --- STATE MANAGEMENT ---
    const [resumeForm, setResumeForm] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: '',
        photo: '', // User can upload a profile photo
        summary: '',
        skills: [{ category: '', list: '' }], // Support Categorized Skills (e.g., Languages: Python, Java)
        experience: [{ role: '', company: '', duration: '', desc: '' }],
        education: [{ degree: '', school: '', year: '', grade: '' }],
        projects: [{ name: '', link: '', tech: '', desc: '' }],
        certifications: [{ name: '', issuer: '', year: '' }],
        internships: [{ role: '', company: '', duration: '', desc: '' }],
        achievements: [{ title: '', desc: '', year: '' }],
        activities: [{ title: '', desc: '' }],
        languages: '' // e.g. Telugu (Native), English (Fluent)
    });

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
        if (!user) return;
        fetchUserResumes();
        speak("Welcome to the Resume Architect. I am Atlas, your mentor. Let's design a resume that secures your dream role.");
    }, [user]);

    const fetchUserResumes = async () => {
        if (!user?.id) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/resume?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setUserResumes(data);
            }
        } catch (e: any) { console.warn("Fetch User Resumes Warning:", e?.message || e); }
    };

    const handleSaveResume = async () => {
        if (!user?.id) return;
        setIsSavingResume(true);
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const isUpdate = !!(resumeForm as any).id;
            const url = isUpdate ? `${baseUrl}/api/resume?id=${(resumeForm as any).id}&user_id=${user.id}` : `${baseUrl}/api/resume`;
            
            const res = await fetch(url, {
                method: isUpdate ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...resumeForm, user_id: user.id }),
            });

            if (res.ok) {
                 const saved = await res.json();
                 setResumeForm(prev => ({ ...prev, id: saved.id }));
                 const successMsg = "Resume Architect Synchronized Successfully!";
                 alert(successMsg);
                 speak(successMsg);
                 fetchUserResumes();
            } else {
                 const err = await res.json();
                 alert("Sync Error: " + (err.error || "Failed to save"));
            }
        } catch (e: any) { 
            console.warn("Save Error:", e?.message || e);
            alert("Connection error to architect server.");
        }
        finally { setIsSavingResume(false); }
    };

    const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this resume architecture plan?")) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            await fetch(`${baseUrl}/api/resume?id=${id}&user_id=${user?.id}`, { method: 'DELETE' });
            fetchUserResumes();
            speak("Design element removed from archives.");
        } catch (err: any) { console.warn("Delete Resume Warning:", err?.message || err); alert("Connection error while deleting."); }
    };

    const handleDownloadPdf = async () => {
        if (!user?.id) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/resume/builder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    resume_data: {
                        personal_info: {
                            name: resumeForm.name,
                            email: resumeForm.email,
                            phone: resumeForm.phone,
                            location: resumeForm.location
                        },
                        summary: resumeForm.summary,
                        experience: resumeForm.experience.map(e => ({
                            title: e.role,
                            company: e.company,
                            period: e.duration,
                            responsibilities: [e.desc]
                        })),
                        education: resumeForm.education.map(edu => ({
                            degree: edu.degree,
                            institution: edu.school,
                            year: edu.year,
                            cgpa: edu.grade || "N/A"
                        })),
                        skills: resumeForm.skills.map(s => `${s.category}: ${s.list}`),
                        projects: resumeForm.projects.map(p => ({
                            title: p.name,
                            tech: p.tech,
                            description: p.desc
                        }))
                    }
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Resume_${resumeForm.name.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Failed to generate PDF. Check backend.");
            }
        } catch (e) {
            console.error("PDF Generation Error:", e);
            alert("Connection error.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#fdfdfd] text-slate-900 font-inter flex flex-col md:flex-row h-screen overflow-hidden relative">
            
            {/* MOBILE MENU TOGGLE */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden fixed top-6 right-6 z-[110] w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* --- SIDEBAR --- */}
            <aside className={`bg-white border-r border-slate-100 transition-all duration-500 overflow-hidden flex flex-col z-[100] no-print 
                ${isSidebarOpen ? 'w-full md:w-80 translate-x-0' : 'w-0 md:w-24 -translate-x-full md:translate-x-0'} 
                fixed md:relative inset-y-0 left-0 shadow-2xl md:shadow-none`}>
                <div className="p-8 flex items-center justify-between shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-4 group">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-6 transition-all duration-500">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        {isSidebarOpen && <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">AI Interviewer</span>}
                    </Link>
                </div>

                <nav className="px-6 space-y-2 flex-1 mt-4">
                    {[
                        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
                        { name: 'Assessments', icon: Zap, path: '/dashboard' },
                        { name: 'Resume Builder', icon: FileSignature, path: '/dashboard/resume-builder', active: true },
                        { name: 'Analytics', icon: BarChart3, path: '/dashboard' },
                        { name: 'Achievements', icon: Award, path: '/dashboard' },
                        { name: 'Settings', icon: Settings, path: '/dashboard' },
                    ].map((item: any, index) => (
                         <Link
                            key={index}
                            href={item.path}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${item.active ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <item.icon size={20} className="shrink-0" />
                            {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && <span className="whitespace-nowrap">{item.name}</span>}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* --- MAIN WORKSPACE --- */}
            <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#fdfdfd] p-4 md:p-8">
                <div className="max-w-[1700px] mx-auto space-y-8">
                    
                    {/* TOP HEADER */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
                        <div className="flex items-center gap-5">
                            <button 
                                onClick={() => router.push('/dashboard')} 
                                className="group flex items-center justify-center w-12 h-12 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm hover:shadow-md"
                                title="Return to Dashboard"
                            >
                                <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div> {/* Divider */}
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    Resume Architect <Sparkles className="text-blue-500 animate-pulse" size={24} />
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Direct Cloud Sync • v2.0</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleDownloadPdf} className="px-6 py-4 bg-white border border-slate-100 text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                                <Download size={14} /> PDF Export
                            </button>
                            <button onClick={handleSaveResume} disabled={isSavingResume} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:bg-slate-300">
                                {isSavingResume ? <Clock size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save Draft
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start h-full pb-20">
                        
                        {/* --- FORM COLUMN (LEFT) --- */}
                        <div className="xl:col-span-5 space-y-6 no-print md:max-h-full overflow-y-auto md:overflow-visible pr-0 md:pr-4 custom-scrollbar px-2 md:px-0">
                            
                            {/* 1. PERSONAL IDENTITY */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-8">
                                <div className="flex justify-between items-center bg-slate-50/50 p-6 rounded-[2rem]">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><UserIcon size={18} /></div> Contact Identity
                                    </h3>
                                    <div className="relative group">
                                        <div className={`w-20 h-20 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 ${resumeForm.photo ? 'border-solid border-emerald-400' : ''}`}>
                                            {resumeForm.photo ? <img src={resumeForm.photo} className="w-full h-full object-cover" /> : <div className="text-center px-2"><Plus size={16} className="mx-auto text-slate-300" /><span className="text-[8px] font-black uppercase text-slate-300">Photo</span></div>}
                                            <input type="file" accept="image/*" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setResumeForm({ ...resumeForm, photo: reader.result as string });
                                                    reader.readAsDataURL(file);
                                                }
                                            }} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Photo" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                        <input value={resumeForm.name} onChange={(e) => setResumeForm({ ...resumeForm, name: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="Your Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                                        <input value={resumeForm.email} onChange={(e) => setResumeForm({ ...resumeForm, email: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="name@domain.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</label>
                                        <input value={resumeForm.phone} onChange={(e) => setResumeForm({ ...resumeForm, phone: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="807465xxxx" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location</label>
                                        <input value={resumeForm.location} onChange={(e) => setResumeForm({ ...resumeForm, location: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="Guntur, AP" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">LinkedIn</label>
                                        <input value={resumeForm.linkedin} onChange={(e) => setResumeForm({ ...resumeForm, linkedin: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="linkedin.com/id" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">GitHub</label>
                                        <input value={resumeForm.portfolio} onChange={(e) => setResumeForm({ ...resumeForm, portfolio: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" placeholder="github.com/id" />
                                    </div>
                                </div>
                            </div>

                            {/* 2. SUMMARY */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><FileText size={18} /></div> Professional Summary
                                </h3>
                                <textarea value={resumeForm.summary} onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-400 outline-none font-medium text-sm h-32 resize-none leading-relaxed" placeholder="Briefly describe your professional background and goals..." />
                            </div>

                            {/* 3. SKILLS MATRIX */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Zap size={18} /></div> Skill Matrix
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, skills: [...resumeForm.skills, { category: '', list: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.skills.map((s, i) => (
                                        <div key={i} className="flex gap-4 items-start group">
                                            <input placeholder="Category (e.g. Languages)" value={s.category} onChange={e => { const n = [...resumeForm.skills]; n[i].category = e.target.value; setResumeForm({ ...resumeForm, skills: n }); }} className="w-1/3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:opacity-50" />
                                            <input placeholder="Skills (e.g. Python, Java)" value={s.list} onChange={e => { const n = [...resumeForm.skills]; n[i].list = e.target.value; setResumeForm({ ...resumeForm, skills: n }); }} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-400 transition-all" />
                                            {resumeForm.skills.length > 1 && (
                                                <button onClick={() => setResumeForm({ ...resumeForm, skills: resumeForm.skills.filter((_, idx) => idx !== i) })} className="p-3 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. WORK EXPERIENCE */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Briefcase size={18} /></div> Professional Journey
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, experience: [...resumeForm.experience, { role: '', company: '', duration: '', desc: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.experience.map((exp, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, experience: resumeForm.experience.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Job Title" value={exp.role} onChange={e => { const n = [...resumeForm.experience]; n[i].role = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Company Name" value={exp.company} onChange={e => { const n = [...resumeForm.experience]; n[i].company = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <input placeholder="Duration (e.g. June 2021 - Present)" value={exp.duration} onChange={e => { const n = [...resumeForm.experience]; n[i].duration = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                            <textarea placeholder="Key contributions & achievements..." value={exp.desc} onChange={e => { const n = [...resumeForm.experience]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] h-24 resize-none outline-none font-medium leading-relaxed focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. EDUCATION */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><GraduationCap size={18} /></div> Academic Background
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, education: [...resumeForm.education, { degree: '', school: '', year: '', grade: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.education.map((edu, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, education: resumeForm.education.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Degree Program" value={edu.degree} onChange={e => { const n = [...resumeForm.education]; n[i].degree = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Institution" value={edu.school} onChange={e => { const n = [...resumeForm.education]; n[i].school = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Year" value={edu.year} onChange={e => { const n = [...resumeForm.education]; n[i].year = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Grade/GPA" value={edu.grade} onChange={e => { const n = [...resumeForm.education]; n[i].grade = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 6. PROJECTS */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Code size={18} /></div> Major Projects
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, projects: [...resumeForm.projects, { name: '', link: '', desc: '', tech: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.projects.map((proj, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, projects: resumeForm.projects.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Project Name" value={proj.name} onChange={e => { const n = [...resumeForm.projects]; n[i].name = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Project Link" value={proj.link} onChange={e => { const n = [...resumeForm.projects]; n[i].link = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <input placeholder="Technology Stack" value={proj.tech} onChange={e => { const n = [...resumeForm.projects]; n[i].tech = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                            <textarea placeholder="Description & Impact..." value={proj.desc} onChange={e => { const n = [...resumeForm.projects]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] h-20 resize-none outline-none font-medium leading-relaxed focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 7. CERTIFICATIONS */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Award size={18} /></div> Certifications
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, certifications: [...resumeForm.certifications, { name: '', issuer: '', year: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.certifications.map((cert, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, certifications: resumeForm.certifications.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Certification Name" value={cert.name} onChange={e => { const n = [...resumeForm.certifications]; n[i].name = e.target.value; setResumeForm({ ...resumeForm, certifications: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Issuing Organization" value={cert.issuer} onChange={e => { const n = [...resumeForm.certifications]; n[i].issuer = e.target.value; setResumeForm({ ...resumeForm, certifications: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <input placeholder="Year" value={cert.year} onChange={e => { const n = [...resumeForm.certifications]; n[i].year = e.target.value; setResumeForm({ ...resumeForm, certifications: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 8. INTERNSHIPS */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Activity size={18} /></div> Internships
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, internships: [...resumeForm.internships, { role: '', company: '', duration: '', desc: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.internships.map((intern, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, internships: resumeForm.internships.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Internship Role" value={intern.role} onChange={e => { const n = [...resumeForm.internships]; n[i].role = e.target.value; setResumeForm({ ...resumeForm, internships: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Company Name" value={intern.company} onChange={e => { const n = [...resumeForm.internships]; n[i].company = e.target.value; setResumeForm({ ...resumeForm, internships: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <input placeholder="Duration (e.g. May 2021 - July 2021)" value={intern.duration} onChange={e => { const n = [...resumeForm.internships]; n[i].duration = e.target.value; setResumeForm({ ...resumeForm, internships: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-400" />
                                            <textarea placeholder="Key learnings and outcomes..." value={intern.desc} onChange={e => { const n = [...resumeForm.internships]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, internships: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] h-20 resize-none outline-none font-medium leading-relaxed focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 9. ACHIEVEMENTS */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Star size={18} /></div> Key Achievements
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, achievements: [...resumeForm.achievements, { title: '', desc: '', year: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.achievements.map((ach, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, achievements: resumeForm.achievements.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Achievement Title" value={ach.title} onChange={e => { const n = [...resumeForm.achievements]; n[i].title = e.target.value; setResumeForm({ ...resumeForm, achievements: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                                <input placeholder="Year" value={ach.year} onChange={e => { const n = [...resumeForm.achievements]; n[i].year = e.target.value; setResumeForm({ ...resumeForm, achievements: n }); }} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            </div>
                                            <textarea placeholder="Brief impact or award details..." value={ach.desc} onChange={e => { const n = [...resumeForm.achievements]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, achievements: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] h-20 resize-none outline-none font-medium leading-relaxed focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 10. EXTRA-CURRICULAR */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Globe size={18} /></div> Co-curricular Activities
                                    </h3>
                                    <button onClick={() => setResumeForm({ ...resumeForm, activities: [...resumeForm.activities, { title: '', desc: '' }] })} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-4">
                                    {resumeForm.activities.map((act, i) => (
                                        <div key={i} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4 group">
                                            <button onClick={() => setResumeForm({ ...resumeForm, activities: resumeForm.activities.filter((_, idx) => idx !== i) })} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                            <input placeholder="Activity Title (e.g. Club Member)" value={act.title} onChange={e => { const n = [...resumeForm.activities]; n[i].title = e.target.value; setResumeForm({ ...resumeForm, activities: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
                                            <textarea placeholder="Describe your role or contribution..." value={act.desc} onChange={e => { const n = [...resumeForm.activities]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, activities: n }); }} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] h-20 resize-none outline-none font-medium leading-relaxed focus:border-blue-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 11. LANGUAGES */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Globe size={18} /></div> Languages
                                </h3>
                                <input placeholder="e.g. Telugu (Native), English (Fluent), Hindi" value={resumeForm.languages} onChange={(e) => setResumeForm({ ...resumeForm, languages: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-blue-400 outline-none font-bold text-sm" />
                            </div>
                        </div>

                        {/* --- CLASSIC ATS LIVE PREVIEW (RIGHT) --- */}
                        <div className="xl:col-span-7 group/preview print:block print:col-span-12 print:overflow-visible print:max-h-none">
                             <div className="sticky top-8 bg-white border-8 border-slate-900/5 rounded-[3rem] shadow-2xl p-4 min-h-[1100px] transform transition-transform group-hover/preview:scale-[1.005] duration-500 origin-top overflow-hidden preview-card print:border-0 print:shadow-none print:p-0 print:min-h-0 print:rounded-none">
                                 
                                 <div className="bg-white p-6 md:p-16 text-slate-900 font-serif leading-snug mx-auto max-w-[850px] print:p-0 print:max-w-none">
                                     
                                     {/* 1. HEADER (CENTERED + PHOTO) */}
                                     {resumeForm.photo ? (
                                        <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-8">
                                            <div className="text-left space-y-3">
                                                <h1 className="text-4xl font-extrabold text-slate-950 uppercase" style={{ fontVariantCaps: 'small-caps' }}>{resumeForm.name || "Alex Sterling"}</h1>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-slate-600">
                                                    {resumeForm.location && <span>{resumeForm.location}</span>}
                                                    {resumeForm.phone && <span>• {resumeForm.phone}</span>}
                                                    {resumeForm.email && <span>• {resumeForm.email}</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-[11px] font-bold text-blue-800">
                                                    {resumeForm.linkedin && <span className="flex items-center gap-1.5"><Linkedin size={12} /> {resumeForm.linkedin}</span>}
                                                    {resumeForm.portfolio && <span className="flex items-center gap-1.5"><LinkIcon size={12} /> {resumeForm.portfolio}</span>}
                                                </div>
                                            </div>
                                            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-slate-50 shadow-xl">
                                                <img src={resumeForm.photo} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                     ) : (
                                        <div className="text-center mb-10 space-y-3">
                                            <h1 className="text-4xl font-extrabold uppercase tracking-tight text-slate-950" style={{ fontVariantCaps: 'small-caps' }}>{resumeForm.name || "YOUR FULL NAME"}</h1>
                                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-medium text-slate-600">
                                                {resumeForm.location && <span>{resumeForm.location}</span>}
                                                {resumeForm.phone && <span>• {resumeForm.phone}</span>}
                                                {resumeForm.email && <span>• {resumeForm.email}</span>}
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-4 text-[12px] font-bold text-blue-800">
                                                {resumeForm.linkedin && <span className="flex items-center gap-1.5"><Linkedin size={12} /> {resumeForm.linkedin}</span>}
                                                {resumeForm.portfolio && <span className="flex items-center gap-1.5"><LinkIcon size={12} /> {resumeForm.portfolio}</span>}
                                            </div>
                                        </div>
                                     )}

                                     {/* 2. CAREER OBJECTIVE */}
                                     {resumeForm.summary && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Career Objective</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-3"></div>
                                             <p className="text-[13px] text-slate-800 font-medium leading-relaxed italic text-justify">
                                                 {resumeForm.summary}
                                             </p>
                                         </section>
                                     )}

                                     {/* 3. EDUCATION */}
                                     {resumeForm.education.length > 0 && resumeForm.education[0].school && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Education</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-6">
                                                 {resumeForm.education.map((edu, i) => (
                                                     <div key={i} className="relative">
                                                         <div className="flex justify-between items-start">
                                                             <div>
                                                                 <h4 className="text-[14px] font-black text-slate-950">{edu.school || "Your University Name"}</h4>
                                                                 <p className="text-[13px] font-medium text-slate-700 italic">{edu.degree || "Bachelor Program"}</p>
                                                             </div>
                                                             <div className="text-right">
                                                                 <p className="text-[12px] font-bold text-slate-950">{edu.year || "2020 - 2024"}</p>
                                                                 {edu.grade && <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{edu.grade}</p>}
                                                             </div>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 4. EXPERIENCE */}
                                     {resumeForm.experience.length > 0 && resumeForm.experience[0].company && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Experience</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-8">
                                                 {resumeForm.experience.map((exp, i) => (
                                                     <div key={i} className="space-y-2">
                                                         <div className="flex justify-between items-start">
                                                             <div>
                                                                 <h4 className="text-[14px] font-black text-slate-950 uppercase">{exp.company || "Company Name"}</h4>
                                                                 <p className="text-[13px] font-bold text-slate-700 italic">{exp.role || "Job Title"}</p>
                                                             </div>
                                                             <p className="text-[12px] font-black text-slate-950">{exp.duration}</p>
                                                         </div>
                                                         <div className="text-[13px] text-slate-800 font-medium leading-[1.6] pl-2 space-y-1.5 border-l-2 border-slate-50 ml-1">
                                                             {exp.desc && exp.desc.split('\n').map((line, idx) => (
                                                                 <div key={idx} className="flex gap-3">
                                                                     <span className="text-slate-400 mt-1.5 text-[8px] flex-shrink-0">•</span>
                                                                     <p>{line}</p>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 5. TECHNICAL SKILLS */}
                                     {resumeForm.skills.length > 0 && (resumeForm.skills[0].category || resumeForm.skills[0].list) && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Technical Skills</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <ul className="space-y-2 list-none">
                                                 {resumeForm.skills.map((s, i) => (
                                                     (s.category || s.list) ? (
                                                         <li key={i} className="text-[13px] flex gap-2">
                                                             <span className="text-slate-400 mt-1.5 text-[8px] flex-shrink-0">•</span>
                                                             <p className="text-slate-800 font-medium"><span className="font-black text-slate-950">{s.category}:</span> {s.list}</p>
                                                         </li>
                                                     ) : null
                                                 ))}
                                             </ul>
                                         </section>
                                     )}

                                     {/* 6. PROJECTS */}
                                     {resumeForm.projects.length > 0 && resumeForm.projects[0].name && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Projects</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-6">
                                                 {resumeForm.projects.map((proj, i) => (
                                                     <div key={i} className="space-y-1.5">
                                                         <div className="flex justify-between items-center">
                                                             <h4 className="text-[14px] font-black text-slate-950 leading-none">{proj.name || "Project Title"}</h4>
                                                             {proj.tech && <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{proj.tech}</span>}
                                                         </div>
                                                         {proj.link && <p className="text-[11px] font-bold text-slate-400">{proj.link}</p>}
                                                         <div className="text-[12px] text-slate-800 font-medium leading-relaxed pl-3 border-l-[1.5px] border-slate-100 italic">
                                                             {proj.desc || "Describe project objective and impact."}
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 8. INTERNSHIPS */}
                                     {resumeForm.internships.length > 0 && resumeForm.internships[0].company && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Internships</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-6">
                                                 {resumeForm.internships.map((intern, i) => (
                                                     <div key={i} className="space-y-1.5">
                                                         <div className="flex justify-between items-start">
                                                             <div>
                                                                 <h4 className="text-[14px] font-black text-slate-950 uppercase">{intern.company || "Company Name"}</h4>
                                                                 <p className="text-[13px] font-bold text-slate-700 italic">{intern.role || "Internship Role"}</p>
                                                             </div>
                                                             <p className="text-[12px] font-black text-slate-950">{intern.duration}</p>
                                                         </div>
                                                         <div className="text-[13px] text-slate-600 font-medium leading-relaxed pl-3 border-l-2 border-slate-50">
                                                             {intern.desc}
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 9. ACHIEVEMENTS */}
                                     {resumeForm.achievements.length > 0 && resumeForm.achievements[0].title && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Achievements</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-4">
                                                 {resumeForm.achievements.map((ach, i) => (
                                                     <div key={i} className="flex justify-between items-start text-[13px]">
                                                         <div className="flex gap-3">
                                                             <span className="text-slate-400 mt-1.5 text-[8px] flex-shrink-0">•</span>
                                                             <p className="text-slate-800 font-medium"><span className="font-black text-slate-950">{ach.title}</span> {ach.desc ? `- ${ach.desc}` : ''}</p>
                                                         </div>
                                                         <span className="text-[12px] font-black text-slate-400 ml-4">{ach.year}</span>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 10. EXTRA-CURRICULAR */}
                                     {resumeForm.activities.length > 0 && resumeForm.activities[0].title && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Co-curricular Activities</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <div className="space-y-4">
                                                 {resumeForm.activities.map((act, i) => (
                                                     <div key={i} className="flex justify-between items-start text-[13px]">
                                                         <div className="flex gap-3">
                                                             <span className="text-slate-400 mt-1.5 text-[8px] flex-shrink-0">•</span>
                                                             <p className="text-slate-800 font-medium"><span className="font-black text-slate-950">{act.title}</span> {act.desc ? `- ${act.desc}` : ''}</p>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </section>
                                     )}

                                     {/* 11. LANGUAGES */}
                                     {resumeForm.languages && (
                                         <section className="mb-8">
                                             <h3 className="text-[16px] font-black uppercase text-slate-950 mb-1" style={{ fontVariantCaps: 'small-caps' }}>Languages</h3>
                                             <div className="w-full h-[1.5px] bg-slate-900 mb-4"></div>
                                             <p className="text-[13px] text-slate-800 font-medium">{resumeForm.languages}</p>
                                         </section>
                                     )}

                                     {/* 10. CORE IDENTITY / FOOTER */}
                                     {/* CORE IDENTITY / FOOTER REMOVED AS PER USER REQUEST */}
                                 </div>
                             </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
