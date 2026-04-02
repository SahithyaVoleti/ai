"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { useRouter } from 'next/navigation';
import { Search, Bell, User as UserIcon, Play, Filter, Calendar, LayoutDashboard, Settings, LogOut, Sun, Moon, BarChart, BarChart3, Camera, Upload, Download, X, Smartphone, School, FileText, Shield, PieChart as PieChartIcon, Activity, Award, CheckCircle, Star, TrendingUp, Flame, Lock, Zap, ArrowRight, Home, ArrowLeft, FileSearch, CheckCircle2, AlertCircle, ExternalLink, Brain, Layout, MessageSquare, Check, ChevronRight, Loader, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '../theme-context';

export default function Dashboard() {
    const enterFullScreen = () => {
        if (typeof document !== 'undefined') {
            document.documentElement.requestFullscreen().catch(() => { });
        }
    };
    const { user, logout, updateUser, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [interviews, setInterviews] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [filter, setFilter] = useState('All');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        college_name: user?.college_name || '',
        year: user?.year || '',
        photo: user?.photo || '',
        resume: ''
    });
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('Dashboard');
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
    const [atsAnalysis, setAtsAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (user) {
            fetchInterviews();
        }
    }, [user, authLoading, router]);

    const fetchInterviews = async () => {
        if (!user?.id) return;
        setIsLoadingData(true);
        try {
            const res = await fetch(`http://localhost:5000/api/user/dashboard/${user.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setInterviews(data.interviews);
                if (data.user) updateUser(data.user);
            }
        } catch (e) {
            console.error(e);
            alert("⚠️ Connection to server failed. Please ensure the backend is running at http://localhost:5000");
        } finally {
            setIsLoadingData(false);
        }
    };

    // --- AGGREGATE DATA ---
    const [heatmap, setHeatmap] = useState<number[][]>([]);
    const [skillsData, setSkillsData] = useState<any[]>([]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        const generateGrid = () => {
            const weeks = 53;
            const days = 7;
            const grid: number[][] = [];
            const counts: Record<string, number> = {};
            if (interviews && interviews.length > 0) {
                interviews.forEach(inv => {
                    if (!inv.date) return;
                    try {
                        const dateStr = new Date(inv.date).toISOString().split('T')[0];
                        counts[dateStr] = (counts[dateStr] || 0) + 1;
                    } catch (e) { }
                });
            }
            const today = new Date();
            const currentDay = today.getDay();
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + (6 - currentDay));

            for (let w = 0; w < weeks; w++) {
                const weekColumn: number[] = [];
                for (let d = 0; d < days; d++) {
                    const targetDate = new Date(endDate);
                    const daysToSubtract = ((weeks - 1 - w) * 7) + (6 - d);
                    targetDate.setDate(endDate.getDate() - daysToSubtract);
                    const dateKey = targetDate.toISOString().split('T')[0];
                    const count = counts[dateKey] || 0;
                    weekColumn.push(count > 0 ? Math.min(count, 3) : 0);
                }
                grid.push(weekColumn);
            }
            return grid;
        };

        const calculateSkills = () => {
            const skillsMap: Record<string, { sum: number; count: number }> = {};
            const normalizeCategory = (cat: string) => {
                const c = cat.toLowerCase();
                if (c.includes('intro') || c.includes('hr') || c.includes('behavioral')) return 'Communication';
                if (c.includes('technical') || c.includes('code') || c.includes('coding')) return 'Technical';
                if (c.includes('project') || c.includes('internship') || c.includes('experience')) return 'Experience';
                if (c.includes('scenario') || c.includes('case')) return 'Problem Solving';
                return 'General';
            };

            interviews.forEach(inv => {
                if (!inv.details) return;
                try {
                    const details = typeof inv.details === 'string' ? JSON.parse(inv.details) : inv.details;
                    const evals = details.evaluations || [];
                    evals.forEach((e: any) => {
                        const cat = normalizeCategory(e.type || 'General');
                        let score = parseFloat(e.score);
                        if (isNaN(score)) score = 0;
                        if (!skillsMap[cat]) skillsMap[cat] = { sum: 0, count: 0 };
                        skillsMap[cat].sum += score;
                        skillsMap[cat].count += 1;
                    });
                } catch (e) { }
            });

            const chartData = Object.keys(skillsMap).map(key => ({
                name: key,
                value: parseFloat((skillsMap[key].sum / skillsMap[key].count).toFixed(1))
            })).filter(d => d.value > 0);
            if (chartData.length === 0) setSkillsData([{ name: 'No Data', value: 100 }]);
            else setSkillsData(chartData);
        };

        const calculateDailyTrend = () => {
            const daily: Record<string, { sum: number; count: number }> = {};
            interviews.forEach(inv => {
                if (!inv.date) return;
                const d = new Date(inv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                if (!daily[d]) daily[d] = { sum: 0, count: 0 };
                daily[d].sum += (inv.overall_score || 0);
                daily[d].count += 1;
            });
            return Object.keys(daily).map(d => ({
                date: d,
                score: Math.round(daily[d].sum / daily[d].count)
            }));
        };

        setHeatmap(generateGrid());
        calculateSkills();
        setTrendData(calculateDailyTrend());
    }, [interviews]);

    const [trendData, setTrendData] = useState<any[]>([]);

    // --- UI HELPERS ---
    const getIntensityClass = (level: number) => {
        switch (level) {
            case 1: return 'bg-[var(--heatmap-1)]';
            case 2: return 'bg-[var(--heatmap-2)]';
            case 3: return 'bg-[var(--heatmap-3)]';
            default: return 'bg-[var(--heatmap-empty)]';
        }
    };

    const sortedInterviews = [...interviews].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const averageScore = interviews.length > 0
        ? interviews.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / interviews.length
        : 0;
    const PerformanceTrendLine = (dataToUse?: any[]) => {
        const data = dataToUse || trendData;
        if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-[var(--text-muted)] italic">Complete more interviews to see your performance trend!</div>;
        
        return (
            <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                            dy={10} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                            domain={[0, 100]} 
                            ticks={[0, 25, 50, 75, 100]}
                        />
                        <RechartsTooltip 
                             cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                             contentStyle={{ 
                                 backgroundColor: 'var(--card-bg)', 
                                 borderColor: 'var(--border)', 
                                 borderRadius: '16px', 
                                 boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                 padding: '12px 16px',
                                 border: '1px solid rgba(255,255,255,0.1)'
                             }}
                             labelStyle={{ fontWeight: 'black', marginBottom: '4px', color: '#3b82f6', textTransform: 'uppercase', fontSize: '10px' }}
                             itemStyle={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--foreground)' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorScore)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderHeatmap = () => {
        const weeksToShow = 52;
        const visibleData = heatmap.slice(-weeksToShow);
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + (6 - today.getDay()));
        const startWeekIndex = 53 - weeksToShow;
        const monthLabels: any[] = [];
        let lastMonth = -1;

        for (let i = 0; i < weeksToShow; i++) {
            const w = startWeekIndex + i;
            const daysToSubtract = ((53 - 1 - w) * 7) + 6;
            const d = new Date(endDate);
            d.setDate(endDate.getDate() - daysToSubtract);
            if (d.getMonth() !== lastMonth) {
                monthLabels.push({ index: i, label: d.toLocaleString('default', { month: 'short' }) });
                lastMonth = d.getMonth();
            }
        }

        return (
            <div className="flex flex-col gap-2 overflow-x-auto min-w-full pb-2">
                <div className="flex relative h-4 ml-12 min-w-[1150px]">
                    {monthLabels.map((m, idx) => (
                        <div key={idx} className="absolute text-[11px] font-black text-[var(--text-muted)] uppercase" style={{ left: `${m.index * 22}px` }}>{m.label}</div>
                    ))}
                </div>
                <div className="flex gap-4 min-w-[1150px]">
                    <div className="flex flex-col justify-between h-[148px] w-8 text-[10px] font-black text-[var(--text-muted)] text-right leading-none py-1.5 shrink-0 translate-y-[-2px]">
                        <span>Sun</span>
                        <span className="opacity-0">Mon</span>
                        <span>Tue</span>
                        <span className="opacity-0">Wed</span>
                        <span>Thu</span>
                        <span className="opacity-0">Fri</span>
                        <span>Sat</span>
                    </div>
                    <div className="flex gap-1.5">
                        {visibleData.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-1.5">
                                {week.map((level, dIdx) => (
                                    <div key={`${wIdx}-${dIdx}`} className={`w-4 h-4 rounded-[4px] ${getIntensityClass(level)} hover:ring-1 ring-[var(--text-muted)] cursor-pointer`} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- PROFILE ACTIONS ---
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('http://localhost:5000/api/user/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user?.id, ...profileData })
            });
            const data = await res.json();
            if (data.status === 'success') {
                updateUser(data.user);
                setMessage('✅ Profile updated successfully!');
                setTimeout(() => setIsProfileModalOpen(false), 1500);
            } else setMessage('❌ ' + (data.message || 'Error'));
        } catch (err) { setMessage('❌ Server error'); } finally { setSaving(false); }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure? All data will be lost.")) return;
        const confirmAgain = prompt("Type 'DELETE' to confirm:");
        if (confirmAgain !== 'DELETE') return;
        setSaving(true);
        try {
            const res = await fetch('http://localhost:5000/api/user/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user?.id }) });
            const data = await res.json();
            if (data.status === 'success') { logout(); router.push('/'); }
            else setMessage('❌ Failed to delete');
        } catch (err) { setMessage('❌ Connection error'); } finally { setSaving(false); }
    };

    const handleSimulatePayment = async () => {
        setIsPaying(true);
        // Simulate progress
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const res = await fetch('http://localhost:5000/api/user/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.id, plan_id: 4 }) // Default to Diamond for dashboard upgrade
            });
            const data = await res.json();
            if (data.status === 'success') {
                if (user) updateUser({ ...user, plan_id: 4, is_premium: 1 });
                setPaymentSuccess(true);
                // Wait to show success state
                setTimeout(() => {
                    setIsPaymentModalOpen(false);
                    setPaymentSuccess(false);
                    fetchInterviews();
                }, 2000);
            } else {
                alert("❌ Payment failed: " + data.message);
                setIsPaying(false);
            }
        } catch (err) {
            alert("❌ Connection error");
            setIsPaying(false);
        }
    };

    const startCamera = async () => {
        setIsCapturing(true);
        console.log("🎥 [DASHBOARD] Initializing camera...");
        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
            } catch {
                console.warn("HD camera failed, retrying basic...");
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            
            // Global backup to ensure it survives re-renders
            (window as any).__cameraStream = stream;

            // Wait a tick for React to mount the video element
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            }, 100);

        } catch (err) { 
            console.error("Camera access failed:", err);
            setIsCapturing(false); 
            alert("⚠️ I couldn't access your camera. Please ensure it's connected and you've allowed access in browser settings.");
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 400, 400);
            const photoData = canvas.toDataURL('image/jpeg', 0.7);
            setProfileData({ ...profileData, photo: photoData });
            
            // Stop hardware
            const stream = (window as any).__cameraStream || (videoRef.current.srcObject as MediaStream);
            if (stream) {
                stream.getTracks().forEach((t: any) => t.stop());
            }
            (window as any).__cameraStream = null;
            setIsCapturing(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setProfileData({ ...profileData, photo: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    const handleCheckAtsScore = async () => {
        if (!user) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch(`http://localhost:5000/api/analyze_resume_ats?user_id=${user.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setAtsAnalysis(data.report);
                setIsAtsModalOpen(true);
            } else {
                alert(data.message || "Failed to analyze resume.");
            }
        } catch (err) {
            console.error(err);
            alert("Connection error. Ensure backend is running.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => setProfileData({ ...profileData, resume: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">Loading...</div>;
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

    return (
        <div className="min-h-screen bg-[var(--background)] flex transition-colors duration-300">
            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-[var(--card-bg)] border-r border-[var(--border)] transition-all flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-20 flex items-center px-4 border-b border-[var(--border)] gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white shrink-0">AI</div>
                    {isSidebarOpen && <span className="font-bold text-[var(--foreground)] truncate">AI Interviewer</span>}
                </div>
                <nav className="flex-1 py-6 px-3 space-y-2">
                    {[
                        { icon: LayoutDashboard, label: 'Dashboard' },
                        { icon: Award, label: 'Achievements' },
                        { icon: BarChart3, label: 'Analytics' },
                        { icon: Settings, label: 'Settings' }
                    ].map((item, i) => (
                        <button key={i} onClick={() => setActiveTab(item.label)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.label ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-[var(--text-muted)] hover:bg-[var(--nav-bg)] hover:text-[var(--foreground)]'}`}>
                            <item.icon size={20} />
                            {isSidebarOpen && <span className="font-bold text-sm truncate">{item.label}</span>}
                        </button>
                    ))}
                    <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-blue-600 hover:bg-blue-500/5 mt-4">
                        <Home size={20} />
                        {isSidebarOpen && <span className="font-bold text-sm truncate">Home Page</span>}
                    </button>
                </nav>
                <div className="p-4 border-t border-[var(--border)] space-y-1">
                    <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--nav-bg)] text-[var(--foreground)]">
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                        {isSidebarOpen && <span className="font-bold text-sm">Theme</span>}
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/5 text-red-500">
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="font-bold text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 flex flex-col transition-all overflow-hidden ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* NAVBAR */}
                <nav className="h-20 bg-[var(--nav-bg)]/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-40">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 border border-[var(--border)] rounded-xl hover:bg-[var(--nav-bg)]"><Search size={20} className="text-[var(--text-muted)]" /></button>
                    <div className="flex items-center gap-4">
                        {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black tracking-widest border border-indigo-400">RECRUITER PANEL</button>}
                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-1 border border-[var(--border)] rounded-2xl hover:bg-[var(--card-bg)] transition-all">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white">{userInitial}</div>
                            <span className="text-sm font-bold pr-3 hidden md:block">{user.name.split(' ')[0]}</span>
                        </button>
                        {isProfileOpen && (
                            <div className="absolute right-6 top-16 w-56 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in duration-150">
                                <button onClick={() => { setIsProfileOpen(false); setIsProfileModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--nav-bg)] text-sm font-bold"><Settings size={16} /> Profile Settings</button>
                                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/5 text-red-500 text-sm font-bold"><LogOut size={16} /> Logout</button>
                            </div>
                        )}
                        {isProfileOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />}
                    </div>
                </nav>

                <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto w-full max-w-[1400px] mx-auto">
                    {activeTab === 'Dashboard' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Dashboard Welcome Content */}
                                <div className="lg:col-span-2 relative bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white overflow-hidden shadow-2xl">
                                    <div className="relative z-10 flex flex-col justify-between h-full gap-8">
                                        <div className="max-w-xl">
                                            <h1 className="text-3xl md:text-5xl font-black mb-3">Welcome, <span className="text-blue-400">{user.name}</span></h1>
                                            <p className="opacity-80 text-sm md:text-lg font-medium">Ready to sharpen your skills with AI-powered mock interviews?</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => { enterFullScreen(); router.push('/?start=true'); }} className="bg-blue-600 hover:bg-blue-700 px-8 py-5 rounded-2xl font-black text-xl flex items-center gap-4 transition-all hover:-translate-y-1 shadow-2xl border-none">
                                                <Play size={20} fill="currentColor" /> Start Session
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* PROMINENT RESUME ANALYZER (MOVED UP) */}
                                <div className="bg-[var(--card-bg)] border-2 border-indigo-500/20 rounded-[2.5rem] p-8 shadow-2xl flex flex-col relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-xl font-black flex items-center gap-3">
                                            <FileSearch className="text-blue-500" /> Resume Score
                                        </h3>
                                        {user.plan_id === 4 ? (
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase tracking-widest">Premium</span>
                                        ) : (
                                            <Lock className="text-[var(--text-muted)]" size={18} />
                                        )}
                                    </div>

                                    {!user.plan_id || user.plan_id < 4 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-2">
                                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                                                <Zap size={24} />
                                            </div>
                                            <p className="text-sm font-bold text-[var(--text-muted)]">Unlock AI Analysis to get your ATS Score</p>
                                            <button 
                                                onClick={() => setIsPaymentModalOpen(true)}
                                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                                            >
                                                Upgrade Now
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col space-y-4">
                                            <div className="p-5 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 flex items-center gap-4">
                                                <div className="text-4xl font-black italic text-blue-500 leading-none">{user.resume_score || 0}</div>
                                                <div className="h-8 w-[1px] bg-indigo-500/20" />
                                                <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-tight">ATS INDEX<br/>/ 100</p>
                                            </div>
                                            
                                            <button 
                                                onClick={handleCheckAtsScore}
                                                disabled={isAnalyzing}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isAnalyzing ? (
                                                    <><Loader size={16} className="animate-spin" /> Analyzing...</>
                                                ) : (
                                                    <><Zap size={16} /> Check ATS Score</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                                </div>
                            </div>

                            {/* DASHBOARD BODY */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative group">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black flex items-center gap-2 italic">
                                            <TrendingUp className="text-blue-500" /> Performance Analytics
                                        </h3>
                                        <p className="text-[10px] font-black uppercase text-[var(--test-muted)] tracking-widest mt-1">Daily Score Progression</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Live Trends</div>
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    {PerformanceTrendLine()}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Total Attempts', value: interviews.length, color: 'blue' },
                                    { label: 'Average Score', value: `${averageScore.toFixed(0)}%`, color: 'indigo' },
                                    { label: 'Consistency', value: `${interviews.length > 0 ? 'Active' : 'N/A'}`, color: 'emerald' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm hover:border-blue-500/30 transition-all">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">{stat.label}</h4>
                                        <div className="text-3xl font-black text-[var(--foreground)]">{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center">
                                    <h3 className="text-xl font-black italic">Recent Assessments</h3>
                                    <button onClick={() => setActiveTab('Analytics')} className="text-xs font-black uppercase text-blue-500 hover:underline">View All Analytics</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[var(--nav-bg)]/50">
                                            <tr>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">Performance</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">Type</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">Date</th>
                                                <th className="px-8 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {interviews.length === 0 ? (
                                                <tr><td colSpan={4} className="p-12 text-center text-[var(--text-muted)] font-bold italic">No records found. Start your first session!</td></tr>
                                            ) : (
                                                interviews.slice(0, 5).map((inv, i) => (
                                                    <tr key={i} className="hover:bg-[var(--nav-bg)]/20">
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${inv.overall_score >= 80 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>{inv.overall_score || 0}%</div>
                                                                <div className="h-1.5 w-24 bg-[var(--border)] rounded-full overflow-hidden"><div className={`h-full ${inv.overall_score >= 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${inv.overall_score}%` }}></div></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 font-bold text-sm">Full Mock</td>
                                                        <td className="px-8 py-4 text-xs text-[var(--text-muted)] font-medium">{new Date(inv.date).toLocaleDateString()}</td>
                                                        <td className="px-8 py-4 text-right">
                                                            <button onClick={() => window.location.href = `http://localhost:5000/api/download_report?id=${inv.id}`} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"><Download size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Achievements' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] text-white shadow-xl">
                                <h1 className="text-4xl font-black mb-2 italic">Hall of Fame</h1>
                                <p className="opacity-80 font-medium">Unlock badges through consistency and excellence.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { title: 'The Pioneer', desc: 'Completed your first interview.', icon: Play, unlocked: true },
                                    { title: 'Consistent Learner', desc: '3-day practice streak.', icon: Flame, unlocked: true },
                                    { title: 'Technical Scholar', desc: 'Score 90% in technical round.', icon: Lock, unlocked: false },
                                    { title: 'Communication Pro', desc: 'Expert level semantic analysis.', icon: Activity, unlocked: false },
                                    { title: 'ATS Master', desc: 'Resume verified & optimized.', icon: FileText, unlocked: false },
                                    { title: 'Global Elite', desc: 'Reach top 1% rank.', icon: Star, unlocked: false }
                                ].map((badge, i) => (
                                    <div key={i} className={`p-8 rounded-[2rem] border transition-all ${badge.unlocked ? 'bg-[var(--card-bg)] border-blue-500/30' : 'bg-[var(--card-bg)]/30 border-[var(--border)] opacity-60'}`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${badge.unlocked ? 'bg-blue-600 text-white' : 'bg-slate-500/20 text-slate-400'}`}><badge.icon size={24} /></div>
                                        <h3 className="font-black text-xl mb-2">{badge.title}</h3>
                                        <p className="text-sm text-[var(--text-muted)] font-medium">{badge.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Analytics' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm">
                                    <h3 className="text-xl font-black mb-8 flex items-center gap-3"><Activity className="text-blue-500" /> Skill Breakdown</h3>
                                    <div className="h-[300px]"><ResponsiveContainer><RadarChart data={skillsData}><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--text-muted)' }} /><PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" /><Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} /></RadarChart></ResponsiveContainer></div>
                                </div>
                                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm">
                                    <h3 className="text-xl font-black mb-8 flex items-center gap-3"><TrendingUp className="text-indigo-500" /> Score Trend</h3>
                                    <div className="h-[300px]">{PerformanceTrendLine()}</div>
                                </div>
                             </div>
                             <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm overflow-hidden">
                                <h3 className="text-xl font-black mb-8">Activity Grid</h3>
                                {renderHeatmap()}
                             </div>
                        </div>
                    )}

                    {activeTab === 'Settings' && (
                        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8 md:p-12 shadow-sm">
                                <h2 className="text-3xl font-black italic mb-8 border-b border-[var(--border)] pb-6">Account Settings</h2>
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between p-6 bg-[var(--nav-bg)] rounded-3xl border border-[var(--border)]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">{userInitial}</div>
                                            <div><p className="text-xl font-black">{user.name}</p><p className="text-sm text-[var(--text-muted)] font-medium">{user.email}</p></div>
                                        </div>
                                        <button onClick={() => setIsProfileModalOpen(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Edit Profile</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div onClick={toggleTheme} className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors">
                                            <div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</div><span className="font-bold">Dark Mode</span></div>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* PROFILE MODAL */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
                    <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="px-10 py-8 border-b border-[var(--border)] flex justify-between items-center bg-[var(--nav-bg)]/50">
                            <div><h2 className="text-2xl font-black italic">Edit Profile</h2><p className="text-[10px] font-black uppercase text-[var(--text-muted)] mt-1">Update your student information</p></div>
                            <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-[var(--background)] rounded-xl"><X size={24} /></button>
                        </div>
                        <div className="p-10 max-h-[70vh] overflow-y-auto">
                            <form onSubmit={handleUpdateProfile} className="space-y-8">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-xl overflow-hidden border-4 border-[var(--border)]">
                                            {profileData.photo ? <img src={profileData.photo} className="w-full h-full object-cover" /> : userInitial}
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded-3xl transition-all">
                                            <button type="button" onClick={startCamera} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white"><Camera size={18} /></button>
                                            <label className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white cursor-pointer"><Upload size={18} /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} /></label>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        {isCapturing && (
                                            <div className="space-y-3">
                                                <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-[200px] aspect-square rounded-2xl bg-black object-cover" />
                                                <div className="flex gap-2"><button type="button" onClick={capturePhoto} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Capture</button><button type="button" onClick={() => setIsCapturing(false)} className="px-4 py-2 text-xs font-bold">Cancel</button></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">Full Name</label><input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">Email</label><input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">Phone</label><input type="text" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">Year</label><select value={profileData.year} onChange={e => setProfileData({ ...profileData, year: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm"><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option><option value="Graduate">Graduate</option></select></div>
                                    <div className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">University</label><input type="text" value={profileData.college_name} onChange={e => setProfileData({ ...profileData, college_name: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm" placeholder="e.g. Vignan University" /></div>
                                </div>
                                <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-blue-600"><FileText size={20} /><div><p className="font-bold text-sm">Resume Upload</p></div></div>
                                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black cursor-pointer hover:bg-blue-700 transition-all uppercase tracking-widest">Select PDF<input type="file" className="hidden" accept=".pdf" onChange={handleResumeChange} /></label>
                                </div>
                                <div className="flex gap-4 pt-6"><button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 font-black uppercase tracking-widest text-sm">Cancel</button><button type="submit" disabled={saving} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isPaying && setIsPaymentModalOpen(false)} />
                    <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-[var(--border)] bg-[var(--nav-bg)]/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic">Secure Upgrade</h2>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest leading-none mt-1">Simulated Transaction</p>
                                </div>
                            </div>
                            {!isPaying && (
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-[var(--background)] rounded-xl transition-colors">
                                    <X size={20} className="text-[var(--text-muted)]" />
                                </button>
                            )}
                        </div>

                        <div className="p-8 space-y-8">
                            {paymentSuccess ? (
                                <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                                        <CheckCircle size={64} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black italic">Upgrade Successful!</h3>
                                        <p className="text-[var(--text-muted)] font-medium mt-2">Premium features are now unlocked.</p>
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest animate-pulse">Updating your dashboard...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary */}
                                    <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Target Upgrade</p>
                                            <h4 className="text-lg font-black">Diamond Bundle</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Amount Due</p>
                                            <h4 className="text-2xl font-black text-blue-500 italic">₹500</h4>
                                        </div>
                                    </div>

                                    {/* Card Details (Simulated) */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Card Information</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    defaultValue="4242 4242 4242 4242" 
                                                    disabled 
                                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-12 py-4 text-sm font-mono text-[var(--text-muted)] outline-none" 
                                                />
                                                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                                                    <div className="w-6 h-4 bg-orange-400 rounded-sm opacity-50" />
                                                    <div className="w-6 h-4 bg-red-400 rounded-sm opacity-50" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">Expiry</label>
                                                <input type="text" defaultValue="12/28" disabled className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-4 text-sm font-mono text-[var(--text-muted)]" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ml-1">CVC</label>
                                                <div className="relative">
                                                    <input type="text" defaultValue="***" disabled className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-4 text-sm font-mono text-[var(--text-muted)]" />
                                                    <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-indigo-400">
                                        <Shield size={18} className="shrink-0" />
                                        <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                                            This is a simulated secure transaction for demonstration purposes. No real funds will be charged.
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <button 
                                        onClick={handleSimulatePayment}
                                        disabled={isPaying}
                                        className={`
                                            w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden
                                            ${isPaying ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/20 active:scale-[0.98]'}
                                        `}
                                    >
                                        {isPaying ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            <span>Unlock Premium Access</span>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ATS REPORT MODAL */}
            {isAtsModalOpen && atsAnalysis && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-5xl max-h-[90vh] bg-[var(--background)] border border-[var(--border)] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-[var(--border)] bg-indigo-600 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Brain size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tight">ATS Intelligence Report</h3>
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">{user.name}'s Analysis • v3.2 Protocol</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAtsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Top Stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Score Circle */}
                                <div className="lg:col-span-1 p-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="relative w-40 h-40 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-indigo-500/10" />
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * atsAnalysis.score) / 100} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-5xl font-black italic">{atsAnalysis.score}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">ATS Index</span>
                                        </div>
                                    </div>
                                    <div className="px-6 py-2 bg-indigo-500/10 text-indigo-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                                        {atsAnalysis.level} Level
                                    </div>
                                </div>

                                {/* Field & Market */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Strategic Field</p>
                                            <h4 className="text-2xl font-black italic">{atsAnalysis.field}</h4>
                                        </div>
                                        <div className="mt-6 flex items-center gap-3 text-blue-500">
                                            <div className="p-2 bg-blue-500/20 rounded-lg"><Layout size={18} /></div>
                                            <p className="text-xs font-bold italic">High Global Demand</p>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">AI Recommendation</p>
                                            <p className="text-sm font-bold text-emerald-800/80 leading-relaxed italic">
                                                "Your profile is {atsAnalysis.score > 70 ? 'strong' : 'improving'}. Focus on specific projects to reach 90+ Score."
                                            </p>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {atsAnalysis.recommended_skills.slice(0, 3).map((s: string) => (
                                                <span key={s} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black rounded-full uppercase">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Checklist */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Search className="text-indigo-500" size={16} /> Scanning Checklist
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {atsAnalysis.checklist.map((item: any, idx: number) => (
                                        <div key={idx} className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${item.found ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700' : 'bg-rose-500/5 border-rose-500/10 text-rose-700 opacity-60'}`}>
                                            <div className="flex items-center gap-3">
                                                {item.found ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                                <span className="text-[11px] font-black uppercase tracking-tight">{item.item}</span>
                                            </div>
                                            <span className="text-[11px] font-black">+{item.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Skill Boosters */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Zap className="text-yellow-500" size={16} /> Recommended Skill Boosters
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {atsAnalysis.recommended_skills.map((s: string) => (
                                            <div key={s} className="group flex items-center gap-2 px-5 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-indigo-500/40 transition-all cursor-pointer">
                                                <span className="text-xs font-black italic">{s}</span>
                                                <Check className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" size={14} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                        <ExternalLink className="text-blue-500" size={16} /> Strategic Learning Paths
                                    </h4>
                                    <div className="space-y-4">
                                        {atsAnalysis.courses.map((course: any, idx: number) => (
                                            <a 
                                                key={idx} 
                                                href={course[1]} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="group flex items-center justify-between p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl hover:bg-blue-500/10 transition-all"
                                            >
                                                <span className="text-[11px] font-black italic text-blue-700">{course[0]}</span>
                                                <ChevronRight className="text-blue-400 group-hover:translate-x-1 transition-all" size={18} />
                                            </a>
                                        ))}
                                        {atsAnalysis.courses.length === 0 && (
                                            <div className="p-8 text-center border-2 border-dashed border-[var(--border)] rounded-3xl text-[var(--text-muted)] italic text-xs font-bold">
                                                No specific courses identified for this field. Focus on core technical skills.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Videos Section */}
                            <div className="pt-6 border-t border-[var(--border)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Writing Optimization</p>
                                        <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-xl border border-[var(--border)]">
                                            <iframe src={atsAnalysis.resume_video.replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Behavioral Assessment Prep</p>
                                        <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-xl border border-[var(--border)]">
                                            <iframe src={atsAnalysis.interview_video.replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[var(--border)] bg-[var(--nav-bg)] flex justify-center shrink-0">
                            <button 
                                onClick={() => setIsAtsModalOpen(false)}
                                className="px-10 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Acknowledge Insights
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
