"use client";

import React, { useEffect, useState } from 'react';
import { getApiUrl } from './api-utils';
import { useAuth } from '../auth-context';
import { useRouter } from 'next/navigation';
import { Search, Bell, User as UserIcon, Play, Filter, Calendar, LayoutDashboard, Settings, LogOut, Sun, Moon, BarChart, BarChart3, Camera, Upload, Download, X, Smartphone, School, FileText, Shield, PieChart as PieChartIcon, Activity, Award, CheckCircle, Star, TrendingUp, Flame, Lock, Zap, ArrowRight, Home, ArrowLeft, FileSearch, CheckCircle2, AlertCircle, ExternalLink, Brain, Layout, MessageSquare, Check, ChevronRight, Loader, CreditCard, ShieldAlert, Sparkles, FileSignature, Folder, Terminal, Crown, Video, Plus, Clock, MoreVertical, Target, Unlock, ChevronDown, History, Briefcase, GraduationCap, BookOpen, Code } from 'lucide-react';
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
        resume: '',
        register_no: user?.register_no || '',
        branch: user?.branch || '',
        domain: user?.domain || ''
    });
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('Dashboard');
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const libraryRef = useRef<HTMLDivElement>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
    const [atsAnalysis, setAtsAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [drills, setDrills] = useState<{ case_studies: any[], behavioral: any[], projects: any[], self_intro: any[] }>({ case_studies: [], behavioral: [], projects: [], self_intro: [] });
    const [selectedDrill, setSelectedDrill] = useState<any>(null);
    const [drillSearch, setDrillSearch] = useState('');
    const [activeDrillTab, setActiveDrillTab] = useState<'case_study' | 'behavioral' | 'projects' | 'self_intro'>('case_study');
    const [isDrillsLoading, setIsDrillsLoading] = useState(false);
    const [videoToPlay, setVideoToPlay] = useState<string | null>(null);

    // --- RESUME BUILDER STATE ---
    const [userResumes, setUserResumes] = useState<any[]>([]);
    const [isResumeBuilderOpen, setIsResumeBuilderOpen] = useState(false);
    const [isSavingResume, setIsSavingResume] = useState(false);
    const [userPayments, setUserPayments] = useState<any[]>([]);
    const [resumeForm, setResumeForm] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        portfolio: '',
        summary: '',
        skills: [] as string[],
        experience: [] as any[],
        education: [] as any[],
        projects: [] as any[]
    });

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                college_name: user.college_name || '',
                year: user.year || '',
                photo: user.photo || '',
                register_no: user.register_no || '',
                branch: user.branch || '',
                domain: user.domain || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (user) {
            fetchInterviews();
            fetchDrills();
            fetchUserResumes();
            fetchUserPayments();
        }

        // --- REAL-TIME SYNC ---
        // Refresh data when window is focused to ensure credits/plan are always up to date
        const handleFocus = () => {
            if (user) fetchInterviews();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, authLoading, router]);

    const fetchUserPayments = async () => {
        if (!user?.id) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/user/payments/${user.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setUserPayments(data.payments);
            }
        } catch (err) {
            console.error("Failed to fetch payments:", err);
        }
    };

    const fetchUserResumes = async () => {
        if (!user?.id) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/resume?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setUserResumes(data);
            }
        } catch (e) {
            console.warn("Failed to fetch resumes:", e);
        }
    };

    const resetResumeForm = () => {
        setResumeForm({
            id: '',
            name: '',
            email: '',
            phone: '',
            linkedin: '',
            portfolio: '',
            summary: '',
            skills: [],
            experience: [],
            education: [],
            projects: []
        });
        setIsResumeBuilderOpen(false);
    };

    const handleSaveResume = async () => {
        if (!user?.id) return;
        setIsSavingResume(true);
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            const isUpdate = !!resumeForm.id;
            const url = isUpdate ? `${baseUrl}/api/resume?id=${resumeForm.id}&user_id=${user.id}` : `${baseUrl}/api/resume`;
            const method = isUpdate ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...resumeForm, user_id: user.id }),
            });

            if (res.ok) {
                await fetchUserResumes();
                resetResumeForm();
            } else {
                const err = await res.json();
                alert("Error saving: " + (err.error || err.message || "Unknown error"));
            }
        } catch (e) {
            console.warn("Save Error:", e);
            alert("Connection error to backend.");
        } finally {
            setIsSavingResume(false);
        }
    };

    const handleEditResume = (resume: any) => {
        setResumeForm({
            id: resume.id,
            name: resume.name,
            email: resume.email,
            phone: resume.phone || '',
            linkedin: resume.linkedin || '',
            portfolio: resume.portfolio || '',
            summary: resume.summary || '',
            skills: resume.skills || [],
            experience: resume.experience || [],
            education: resume.education || [],
            projects: resume.projects || []
        });
        setIsResumeBuilderOpen(true);
    };

    const handleDeleteResume = async (id: string) => {
        if (!user?.id || !confirm("Are you sure you want to delete this resume?")) return;
        try {
            const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
            await fetch(`${baseUrl}/api/resume?id=${id}&user_id=${user.id}`, { method: "DELETE" });
            fetchUserResumes();
        } catch (e) {
            console.warn("Delete Error:", e);
        }
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
                            location: resumeForm.linkedin // Using linkedin as location field for now or placeholder
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
                            cgpa: (edu as any).grade || "N/A"
                        })),
                        skills: resumeForm.skills,
                        projects: resumeForm.projects.map(p => ({
                            title: p.name,
                            tech: (p as any).tech || "",
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
            console.warn("PDF Generation Error:", e);
            alert("Connection error.");
        }
    };

    const fetchDrills = async () => {
        setIsDrillsLoading(true);
        try {
            const res = await fetch(`${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/prep_drills`);
            const data = await res.json();
            if (data.status === 'success') {
                setDrills({
                    case_studies: data.case_studies || [],
                    behavioral: data.behavioral || [],
                    projects: data.projects || [],
                    self_intro: data.self_intro || []
                });
            }
        } catch (e) {
            console.warn("Failed to fetch drills:", e);
        } finally {
            setIsDrillsLoading(false);
        }
    };

    const fetchInterviews = async () => {
        if (!user?.id) return;
        setIsLoadingData(true);
        try {
            const res = await fetch(`${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/user/dashboard/${user.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setInterviews(data.interviews);
                if (data.user) updateUser(data.user);
            }
        } catch (e) {
            console.warn(e);
            alert("⚠️ Connection to server failed. Please ensure the backend is running at http://localhost:5000");
        } finally {
            setIsLoadingData(false);
        }
    };

    const scrollToLibrary = (section: string) => {
        // Map module sections to library tabs
        const mapping: Record<string, 'case_study' | 'behavioral' | 'projects' | 'self_intro'> = {
            'intro': 'self_intro',
            'projects': 'projects',
            'technical': 'case_study',
            'case_study': 'case_study',
            'behavioral': 'behavioral',
            'hr': 'behavioral'
        };

        const tab = mapping[section] || 'case_study';
        setActiveDrillTab(tab);
        
        if (activeTab !== 'Assessments') {
            setActiveTab('Assessments');
            // Give it a moment to render the Assessments tab before scrolling
            setTimeout(() => {
                if (libraryRef.current) {
                    libraryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        } else if (libraryRef.current) {
            libraryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- AGGREGATE DATA ---
    const [heatmap, setHeatmap] = useState<number[][]>([]);
    const [skillsData, setSkillsData] = useState<any[]>([]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#2563eb', '#ec4899'];

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
            const skillsMap: Record<string, { sum: number; count: number; accuracySum: number; depthSum: number; claritySum: number; confidenceSum: number; fluencySum: number }> = {};
            const normalizeCategory = (cat: string) => {
                const c = cat.toLowerCase();
                if (c.includes('intro') || c.includes('hr') || c.includes('behavioral')) return 'Communication';
                if (c.includes('technical') || c.includes('code') || c.includes('coding')) return 'Technical';
                if (c.includes('project') || c.includes('internship') || c.includes('experience')) return 'Experience';
                if (c.includes('scenario') || c.includes('case')) return 'Problem Solving';
                return 'General';
            };

            const granularTotals = { accuracy: 0, depth: 0, clarity: 0, confidence: 0, fluency: 0, count: 0 };

            interviews.forEach(inv => {
                if (!inv.details) return;
                try {
                    const details = typeof inv.details === 'string' ? JSON.parse(inv.details) : inv.details;
                    const evals = details.evaluations || [];
                    evals.forEach((e: any) => {
                        const cat = normalizeCategory(e.type || 'General');
                        let score = parseFloat(e.score);
                        let accuracy = parseFloat(e.accuracy || e.correctness || 0);
                        let depth = parseFloat(e.depth || 5);
                        let clarity = parseFloat(e.clarity || 5);
                        let confidence = parseFloat(e.confidence || 5);
                        let fluency = parseFloat(e.fluency || 5);
                        
                        if (isNaN(score)) score = 0;
                        
                        if (!skillsMap[cat]) skillsMap[cat] = { sum: 0, count: 0, accuracySum: 0, depthSum: 0, claritySum: 0, confidenceSum: 0, fluencySum: 0 };
                        skillsMap[cat].sum += score;
                        skillsMap[cat].accuracySum += accuracy;
                        skillsMap[cat].count += 1;

                        granularTotals.accuracy += accuracy;
                        granularTotals.depth += depth;
                        granularTotals.clarity += clarity;
                        granularTotals.confidence += confidence;
                        granularTotals.fluency += fluency;
                        granularTotals.count += 1;
                    });
                } catch (e) { }
            });

            const chartData = Object.keys(skillsMap).map(key => ({
                name: key,
                value: parseFloat((skillsMap[key].sum / skillsMap[key].count).toFixed(1)),
                accuracy: parseFloat(((skillsMap[key].accuracySum / skillsMap[key].count) * 10).toFixed(1))
            })).filter(d => d.value > 0);

            if (chartData.length === 0) setSkillsData([{ name: 'No Data', value: 100 }]);
            else setSkillsData(chartData);

            if (granularTotals.count > 0) {
                setGranularMetrics([
                    { name: 'Accuracy', value: Math.round((granularTotals.accuracy / granularTotals.count) * 10) },
                    { name: 'Depth', value: Math.round((granularTotals.depth / granularTotals.count) * 10) },
                    { name: 'Clarity', value: Math.round((granularTotals.clarity / granularTotals.count) * 10) },
                    { name: 'Confidence', value: Math.round((granularTotals.confidence / granularTotals.count) * 10) },
                    { name: 'Fluency', value: Math.round((granularTotals.fluency / granularTotals.count) * 10) }
                ]);
            } else {
                setGranularMetrics([]);
            }

            // --- READINESS CALCULATION ---
            const getVal = (name: string) => chartData.find(d => d.name === name)?.value || 0;
            const tech = getVal('Technical');
            const dsa = getVal('Problem Solving');
            const comm = getVal('Communication');
            const exp = getVal('Experience');

            const prodScore = Math.round((tech * 0.4 + dsa * 0.4 + exp * 0.2) * 10);
            const servScore = Math.round((comm * 0.4 + tech * 0.3 + exp * 0.3) * 10);

            setReadinessData([
                { name: 'Product Ready', score: Math.min(prodScore, 100), color: '#3b82f6', icon: Zap },
                { name: 'Service Ready', score: Math.min(servScore, 100), color: '#2563eb', icon: MessageSquare }
            ]);

            // --- DISTRIBUTION CALCULATION ---
            const dist = [
                { name: 'Below 40%', value: 0, color: '#93c5fd' }, // Blue 300
                { name: '40% - 70%', value: 0, color: '#3b82f6' }, // Blue 500
                { name: '70% - 85%', value: 0, color: '#2563eb' }, // Blue 600
                { name: 'Above 85%', value: 0, color: '#1e3a8a' }  // Blue 900
            ];
            interviews.forEach(inv => {
                const s = inv.overall_score || 0;
                if (s < 40) dist[0].value++;
                else if (s < 70) dist[1].value++;
                else if (s < 85) dist[2].value++;
                else dist[3].value++;
            });
            setDistributionData(dist.filter(d => d.value > 0));
        };

        const calculateDailyTrend = () => {
            const daily: Record<string, { sum: number; count: number; accuracySum: number; commSum: number }> = {};
            interviews.forEach(inv => {
                if (!inv.date) return;
                const d = new Date(inv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                if (!daily[d]) daily[d] = { sum: 0, count: 0, accuracySum: 0, commSum: 0 };
                daily[d].sum += (inv.overall_score || 0);
                
                try {
                    const details = typeof inv.details === 'string' ? JSON.parse(inv.details) : inv.details;
                    const evals = details.evaluations || [];
                    const avgAcc = evals.length > 0 ? (evals.reduce((a: any, b: any) => a + parseFloat(b.accuracy || b.correctness || 0), 0) / evals.length) : 0;
                    const avgComm = evals.length > 0 ? (evals.reduce((a: any, b: any) => a + (parseFloat(b.clarity || 5) + parseFloat(b.fluency || 5))/2, 0) / evals.length) : 0;
                    daily[d].accuracySum += (avgAcc * 10);
                    daily[d].commSum += (avgComm * 10);
                } catch(e) {}
                
                daily[d].count += 1;
            });
            return Object.keys(daily).map(d => ({
                date: d,
                score: Math.round(daily[d].sum / daily[d].count),
                accuracy: Math.round(daily[d].accuracySum / daily[d].count),
                communication: Math.round(daily[d].commSum / daily[d].count)
            }));
        };

        setHeatmap(generateGrid());
        calculateSkills();
        setTrendData(calculateDailyTrend());
    }, [interviews]);

    const [trendData, setTrendData] = useState<any[]>([]);
    const [granularMetrics, setGranularMetrics] = useState<any[]>([]);
    const [readinessData, setReadinessData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, terminated: 0 });

    useEffect(() => {
        const calculateCounts = () => {
            const total = interviews.length;
            const completed = interviews.filter(i => i.status === 'completed').length;
            const terminated = interviews.filter(i => i.status === 'terminated').length;
            setStats({ total, completed, terminated });
        };
        calculateCounts();
    }, [interviews]);

    // --- UI HELPERS ---
    const getIntensityClass = (level: number) => {
        switch (level) {
            case 1: return 'bg-slate-200';
            case 2: return 'bg-slate-400';
            case 3: return 'bg-white';
            default: return 'bg-white border border-slate-100/50';
        }
    };

    const sortedInterviews = [...interviews].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const averageScore = interviews.length > 0
        ? interviews.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / interviews.length
        : 0;
    const PerformanceTrendLine = (dataToUse?: any[]) => {
        const data = dataToUse || trendData;
        if (!data || data.length === 0 || interviews.length === 0) return <div className="h-40 flex items-center justify-center text-[var(--text-muted)] italic">Complete more interviews to see your performance trend!</div>;

        return (
            <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                borderColor: '#f1f5f9',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                fontSize: '11px'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#3b82f6"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            name="Overall"
                        />
                        <Area
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fillOpacity={1}
                            fill="url(#colorAcc)"
                            name="Accuracy"
                        />
                        <Area
                            type="monotone"
                            dataKey="communication"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fillOpacity={1}
                            fill="url(#colorComm)"
                            name="Communication"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const ReadinessChart = () => {
        if (!readinessData || readinessData.length === 0 || interviews.length === 0) {
            return <div className="h-40 flex items-center justify-center text-slate-400 italic text-sm">No data available for readiness analysis.</div>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {readinessData.map((item, i) => (
                    <div key={i} className="p-8 bg-white rounded-3xl border border-slate-100 relative overflow-hidden group shadow-soft hover:shadow-lg transition-all duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-white text-slate-900 transition-colors group-hover:bg-white group-hover:text-slate-900 dark:group-hover:bg-white dark:group-hover:text-slate-900`}>
                                    <item.icon size={22} className={item.animate ? 'animate-pulse' : ''} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{item.name}</p>
                                    <span className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-slate-900">{item.score}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r from-white to-slate-900"
                                style={{ width: `${item.score}%` }}
                            />
                        </div>
                        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
                            {item.name === 'Product Ready'
                                ? 'Optimized for high-scale environments and technical depth.'
                                : 'Tailored for client-facing excellence and solution delivery.'}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    const SkillGauge = ({ value, label, color, icon: Icon }: any) => (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-soft">
            <div className="relative w-16 h-16 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[{ value }, { value: 100 - value }]}
                            innerRadius={26}
                            outerRadius={30}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill="#0f172a" />
                            <Cell fill="#f1f5f9" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icon size={16} className="text-slate-400 opacity-60" />
                </div>
            </div>
            <div className="text-2xl font-bold tracking-tighter text-slate-900">{value}%</div>
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1.5">{label}</div>
        </div>
    );

    const FitnessGauge = ({ score, title, color }: any) => {
        const data = [{ value: score }, { value: 100 - score }];
        return (
            <div className="flex-1 bg-white border border-slate-100 dark:border-slate-100 rounded-3xl p-8 flex flex-col items-center relative overflow-hidden group hover:shadow-2xl transition-all duration-500 shadow-soft">
                <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-6 z-10">{title}</h4>
                <div className="relative w-44 h-32 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={60}
                                outerRadius={85}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell fill="#0f172a" stroke="none" />
                                <Cell fill="#f1f5f9" stroke="none" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-1 left-0 right-0 text-center">
                        <div className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-slate-900">{score}%</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-2 capitalize">Ready Profile</div>
                    </div>
                </div>
                <div className="mt-8 flex gap-3 z-10">
                    <span className="px-4 py-1.5 bg-slate-100 dark:bg-white rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-900">
                        {score >= 70 ? 'Elite Tier' : 'Strong Fit'}
                    </span>
                    <span className="px-4 py-1.5 bg-white dark:bg-white/50 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-400">Target 85%</span>
                </div>
            </div>
        );
    };

    const IndustryReadinessView = () => {
        const avgCorrectness = skillsData.length > 0 ? (skillsData.reduce((a, b) => a + (b.correctness || 0), 0) / skillsData.length) : 0;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {/* SKILL CHIPS - COMPACT */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SkillGauge label="Technical" value={skillsData.find(d => d.name === 'Technical')?.value || 0} color="#0f172a" icon={Zap} />
                    <SkillGauge label="Solving" value={skillsData.find(d => d.name === 'Problem Solving')?.value || 0} color="#334155" icon={Brain} />
                    <SkillGauge label="Comm" value={skillsData.find(d => d.name === 'Communication')?.value || 0} color="#475569" icon={MessageSquare} />
                    <SkillGauge label="Exp" value={skillsData.find(d => d.name === 'Experience')?.value || 0} color="#64748b" icon={Award} />
                </div>

                {/* CORRECTNESS HUD SECTION - PREMIUM CARD */}
                <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-2xl p-6 flex items-center justify-between shadow-soft group hover:bg-white dark:hover:bg-white hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-white dark:bg-white"></div>
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white dark:bg-white/5 rounded-xl text-slate-900 dark:text-slate-900">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-900 tracking-tight">Average Correctness</h3>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Quality Engagement Index</p>
                        </div>
                    </div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-slate-900 tracking-tighter">{(avgCorrectness * 10).toFixed(0)}%</div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FitnessGauge title="Product-Based Company Fitting" score={readinessData[0]?.score || 0} color="#0f172a" />
                        <FitnessGauge title="Service-Based Company Fitting" score={readinessData[1]?.score || 0} color="#0f172a" />
                    </div>

                    {/* METHODOLOGY - HYPER COMPACT */}
                    <div className="p-4 bg-white/50 border border-slate-100 rounded-xl relative overflow-hidden group">
                        <h4 className="text-[8px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2 text-slate-400">
                            <TrendingUp size={12} /> Disclosure
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-[7px] font-black uppercase text-slate-400">
                            <div><p className="text-slate-500 mb-1">Product:</p><code className="text-slate-950">40%T+40%S+20%E</code></div>
                            <div><p className="text-slate-500 mb-1">Service:</p><code className="text-slate-950">40%C+30%T+30%E</code></div>
                        </div>
                    </div>
                </div>
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
            const res = await fetch(`${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/user/profile/update`, {
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
            const res = await fetch(`${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/user/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user?.id }) });
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
                    videoRef.current.play().catch(() => { });
                }
            }, 100);

        } catch (err) {
            console.warn("Camera access failed:", err);
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
            reader.onloadend = async () => {
                const photoSrc = reader.result as string;
                setProfileData({ ...profileData, photo: photoSrc });
                
                // Auto-save photo logic to make it active instantly
                try {
                    const res = await fetch(`${typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/user/profile/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: user?.id, ...profileData, photo: photoSrc })
                    });
                    const data = await res.json();
                    if (data.status === 'success') updateUser(data.user);
                } catch (err) { console.warn("Auto-save photo fail", err); }
            };
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
                // Update the global user state so the score on the dashboard HUD updates immediately
                if (data.analysis && data.analysis.score !== undefined) {
                    updateUser({ ...user, resume_score: data.analysis.score });
                }
            } else {
                alert(data.message || "Failed to analyze resume.");
            }
        } catch (err) {
            console.warn(err);
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
        <div className="min-h-screen bg-[var(--background)] flex font-sans transition-all duration-500 selection:bg-slate-200 selection:text-slate-900">
            {/* CLASSIC WHITE SIDEBAR */}
            {/* PREMIUM SaaS SIDEBAR */}
            <aside className={`fixed lg:relative z-40 h-screen transition-all duration-500 ${isSidebarOpen ? 'w-72' : 'w-24'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-full m-4 mr-0 bg-white  border border-slate-100 dark:border-slate-100 rounded-[2.5rem] shadow-soft dark:shadow-none flex flex-col p-6 overflow-hidden">
                    <Link href="/" className={`mb-12 flex items-center transition-all hover:opacity-80 ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center'}`}>
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl shadow-slate-100 shrink-0">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-900 leading-none">AI Interviewer</span>
                            </div>
                        )}
                    </Link>

                    <nav className="space-y-2 flex-1">
                        {[
                            { name: 'Dashboard', icon: LayoutDashboard },
                            { name: 'Assessments', icon: Zap },
                            { name: 'Resume Builder', icon: FileSignature },
                            { name: 'Analytics', icon: BarChart3 },
                            { name: 'Achievements', icon: Award },
                            { name: 'Settings', icon: Settings },
                            ((user?.plan_id || 0) < 4) && { name: 'Claim Pro Access', icon: Crown, isBypass: true }
                        ].filter(Boolean).map((item: any, index) => (
                            <button
                                key={index}
                                onClick={async () => {
                                    if (item.name === 'Resume Builder') {
                                        router.push('/dashboard/resume-builder');
                                        return;
                                    }
                                    if (item.isBypass) {
                                        // MANUALLY ALLOW ACCESS - DEVELOPER BYPASS
                                        try {
                                            const apiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000';
                                            const res = await fetch(`${apiUrl}/api/payment/verify`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    user_id: user.id,
                                                    plan_id: 4,
                                                    razorpay_order_id: 'order_manual_bypass',
                                                    razorpay_payment_id: 'pay_manual_bypass',
                                                    razorpay_signature: 'bypass'
                                                })
                                            });
                                            const data = await res.json();
                                            if (data.status === 'success') {
                                                updateUser(data.user);
                                                window.location.reload();
                                            }
                                        } catch (e) {
                                            console.warn("Manual bypass failed:", e);
                                        }
                                        return;
                                    }
                                    setActiveTab(item.name);
                                }}
                                className={`
                                    w-full flex items-center p-4 rounded-2xl transition-all duration-300 relative group
                                    ${activeTab === item.name
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 border-blue-500 active-tab-scale'
                                        : item.isBypass ? 'text-amber-600 hover:bg-amber-50 border border-amber-100 mt-4' : 'text-slate-400 hover:text-slate-900 hover:bg-blue-50'}
                                    ${!isSidebarOpen && 'justify-center'}
                                `}
                            >
                                {activeTab === item.name && (
                                    <div className="absolute right-0 w-1 h-6 bg-white/40 rounded-full -translate-x-2" />
                                )}
                                <item.icon size={20} className={`shrink-0 ${activeTab === item.name ? 'text-white' : 'group-hover:text-blue-600 transition-colors'}`} />
                                {isSidebarOpen && <span className="text-sm font-bold tracking-tight ml-3">{item.name}</span>}
                            </button>
                        ))}
                    </nav>

                    {/* Assessments Tab Component */}
                    {activeTab === 'Assessments' && (
                        <div className="hidden">
                            {/* This is a placeholder for logic, actual render is below */}
                        </div>
                    )}

                    <button onClick={() => router.push('/')} className={`flex items-center p-4 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all hover:bg-white dark:hover:bg-white/5 group mb-2 ${!isSidebarOpen && 'justify-center'}`}>
                        <Home size={20} className="shrink-0 group-hover:-translate-y-1 transition-transform" />
                        {isSidebarOpen && <span className="text-sm font-semibold tracking-tight ml-3">Home</span>}
                    </button>
                    {isSidebarOpen && (
                        <div className={`mb-3 p-4 rounded-2xl border transition-all duration-500 shadow-sm ${
                            Number(user.plan_id) === 4 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' :
                            Number(user.plan_id) === 3 ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200' :
                            Number(user.plan_id) === 2 ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200' :
                            Number(user.plan_id) === 1 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
                            'bg-slate-50 border-slate-200'
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1 rounded-md ${
                                    Number(user.plan_id) === 4 ? 'bg-amber-100' :
                                    Number(user.plan_id) === 3 ? 'bg-orange-100' :
                                    Number(user.plan_id) === 2 ? 'bg-violet-100' :
                                    Number(user.plan_id) === 1 ? 'bg-blue-100' : 'bg-slate-200'
                                }`}>
                                    <Crown size={12} className={`${
                                        Number(user.plan_id) === 4 ? 'text-amber-600' :
                                        Number(user.plan_id) === 3 ? 'text-orange-600' :
                                        Number(user.plan_id) === 2 ? 'text-violet-600' :
                                        Number(user.plan_id) === 1 ? 'text-blue-600' : 'text-slate-500'
                                    }`} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Plan</span>
                            </div>
                            <div className={`text-base font-black tracking-tight ${
                                Number(user.plan_id) === 4 ? 'text-amber-700' :
                                Number(user.plan_id) === 3 ? 'text-orange-700' :
                                Number(user.plan_id) === 2 ? 'text-violet-700' :
                                Number(user.plan_id) === 1 ? 'text-blue-700' : 'text-slate-600'
                            }`}>
                                {Number(user.plan_id) === 4 ? '👑 Ultimate' :
                                 Number(user.plan_id) === 3 ? '🛡️ Proctor Elite' :
                                 Number(user.plan_id) === 2 ? '⚡ ATS Pro' :
                                 Number(user.plan_id) === 1 ? '⭐ Mock Starter' : '🌱 Free Tier'}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] font-bold text-slate-400">
                                <span>{user.interviews_remaining ?? 0} Credits</span>
                                <span className="opacity-60">Status: Active</span>
                            </div>
                            
                            {(!user.plan_id || Number(user.plan_id) < 4) && (
                                <button
                                    onClick={() => router.push('/pricing')}
                                    className={`mt-4 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                        Number(user.plan_id) === 4 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                        Number(user.plan_id) === 3 ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                                        Number(user.plan_id) === 2 ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' :
                                        Number(user.plan_id) === 1 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                        'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {Number(user.plan_id) === 0 ? 'Buy Credits' : 'Upgrade Plan'} →
                                </button>
                            )}
                        </div>
                    )}

                    <button onClick={logout} className={`flex items-center p-4 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all hover:bg-white dark:hover:bg-white/5 group ${!isSidebarOpen && 'justify-center'}`}>
                        <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="text-sm font-semibold tracking-tight ml-3">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-24 px-8 md:px-12 flex items-center justify-between sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all shadow-soft hover:shadow-md"
                        >
                            <Layout size={20} />
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 p-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all shadow-soft hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:block pr-2">Back</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={toggleTheme}
                            className="p-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all shadow-soft group"
                        >
                            {theme === 'dark' ? <Sun size={20} className="animate-in spin-in-180 duration-500" /> : <Moon size={20} className="animate-in spin-in-180 duration-500" />}
                        </button>
                        <button className="p-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 transition-all shadow-soft relative">
                            <Bell size={20} />
                            <div className="absolute top-3 right-3 w-2 h-2 bg-white dark:bg-white rounded-full border-2 border-white dark:border-slate-800"></div>
                        </button>
                        <div
                            className="flex items-center gap-3 p-1.5 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-soft group"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-100 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-all overflow-hidden">{user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : userInitial}</div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-500 pr-3 hidden md:block">{user.name.split(' ')[0]}</span>
                        </div>
                        {isProfileOpen && (
                            <div className="absolute right-12 top-24 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-4 border-b border-slate-50 dark:border-slate-100 mb-2">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-900">{user.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                                </div>
                                <button onClick={() => { setIsProfileOpen(false); setIsProfileModalOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 text-sm font-semibold text-slate-700 dark:text-slate-500 transition-colors"><Settings size={18} className="text-slate-400" /> Account Settings</button>
                                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-white text-slate-900 text-sm font-semibold transition-colors"><LogOut size={18} /> Sign Out</button>
                            </div>
                        )}
                        {isProfileOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />}
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto w-full max-w-[1500px] mx-auto scroll-smooth">
                    {activeTab === 'Assessments' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="p-12 md:p-16 bg-white border border-slate-100 rounded-[3rem] text-slate-900 shadow-soft relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-slate-100 transition-all duration-700"></div>
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">Assessment Catalog</h1>
                                <p className="text-slate-500 text-lg font-medium max-w-xl">Precision-engineered simulations tailored to your career trajectory. Choose a module to begin.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { title: 'Self-Introduction', desc: 'Master your personal pitch and first impressions.', icon: UserIcon, color: 'blue', section: 'intro', min_plan: 1 },
                                    { title: 'Project Defense', desc: 'In-depth practice for project discussions.', icon: Folder, color: 'blue', section: 'projects', min_plan: 1 },
                                    { title: 'Technical Drills', desc: 'Technical questions, coding challenges, and case studies.', icon: Terminal, color: 'violet', section: 'technical', min_plan: 2 },
                                    { title: 'Case Study Pro', desc: 'Real-world architecture and problem-solving scenarios.', icon: Layout, color: 'violet', section: 'case_study', min_plan: 2 },
                                    { title: 'Behavioral Mastery', desc: 'Situational leadership and conflict resolution.', icon: UserIcon, color: 'orange', section: 'behavioral', min_plan: 3 },
                                    { title: 'HR & Interpersonal', desc: 'Company culture fit and communication training.', icon: MessageSquare, color: 'orange', section: 'hr', min_plan: 3 }
                                ].map((drill: any, idx: number) => {
                                    const userPlan = Number(user?.plan_id || 0);
                                    const isLocked = userPlan < drill.min_plan;
                                    const planNames: Record<number, string> = { 1: 'Mock Starter', 2: 'ATS Pro', 3: 'Proctor Elite', 4: 'Ultimate' };
                                    const planColors: Record<number, string> = { 1: 'blue', 2: 'violet', 3: 'orange', 4: 'amber' };
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => !isLocked && scrollToLibrary(drill.section)}
                                            className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-soft hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative cursor-pointer ${isLocked ? 'opacity-90' : ''}`}
                                        >
                                            {isLocked && (
                                                <div className="absolute top-6 right-6">
                                                    <div className={`px-3 py-1 bg-${planColors[drill.min_plan]}-100 text-${planColors[drill.min_plan]}-700 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm`}>
                                                        <Lock size={12} fill="currentColor" /> {planNames[drill.min_plan]} Required
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`w-14 h-14 bg-${drill.color}-50 text-${drill.color}-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-${drill.color}-600 group-hover:text-white transition-all`}>
                                                <drill.icon size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900 mb-3 tracking-tight">{drill.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">{drill.desc}</p>

                                            {isLocked ? (
                                                <button onClick={(e) => { e.stopPropagation(); router.push('/pricing'); }} className="w-full py-4 bg-white /20 text-slate-400 border border-slate-100 dark:border-slate-800/10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/30 transition-all shadow-soft dark:shadow-none flex items-center justify-center gap-2 group/btn">
                                                    Unlock Module <Sparkles size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); enterFullScreen(); router.push(`/instructions?topic=${encodeURIComponent(drill.title)}&mode=practice&section=${drill.section}`); }}
                                                    className="w-full py-4 bg-white /20 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    Start Module <ChevronRight size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* PREPARATION LIBRARY & QUESTION BANK */}
                            <div ref={libraryRef} className="mt-20 space-y-10 pb-10">
                                <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 dark:border-slate-100 pb-8">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-slate-900 dark:text-slate-900 font-bold uppercase tracking-widest text-xs">
                                            <BookOpen size={16} /> Preparation Mastery
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-900">Preparation Library</h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">Curated high-impact scenarios with model answers to sharpen your edge.</p>
                                    </div>
                                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl">
                                        <button
                                            onClick={() => setActiveDrillTab('case_study')}
                                            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeDrillTab === 'case_study' ? 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-900'}`}
                                        >
                                            Case Studies
                                        </button>
                                        <button 
                                            onClick={() => setActiveDrillTab('behavioral')}
                                            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeDrillTab === 'behavioral' ? 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-900'}`}
                                        >
                                            Behavioral
                                        </button>
                                        <button 
                                            onClick={() => setActiveDrillTab('projects')}
                                            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeDrillTab === 'projects' ? 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-900'}`}
                                        >
                                            Projects
                                        </button>
                                        <button 
                                            onClick={() => setActiveDrillTab('self_intro')}
                                            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeDrillTab === 'self_intro' ? 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-900'}`}
                                        >
                                            Self Introduction
                                        </button>
                                    </div>
                                </div>

                                <div className="relative group">
                                     <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-slate-900 transition-colors">
                                        <Search size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeDrillTab === 'case_study' ? 'Case Studies' : activeDrillTab === 'behavioral' ? 'Behavioral' : activeDrillTab === 'projects' ? 'Project Defense' : 'Self Introduction'}...`}
                                        value={drillSearch}
                                        onChange={(e) => setDrillSearch(e.target.value)}
                                        className="w-full pl-16 pr-6 py-5 bg-white  border border-slate-200 dark:border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-white/20 transition-all font-medium text-slate-700 dark:text-slate-500 placeholder:text-slate-400 shadow-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(activeDrillTab === 'case_study' ? drills.case_studies : activeDrillTab === 'behavioral' ? drills.behavioral : activeDrillTab === 'projects' ? drills.projects : drills.self_intro)
                                        .filter(d => d.title?.toLowerCase().includes(drillSearch.toLowerCase()) || d.question.toLowerCase().includes(drillSearch.toLowerCase()) || d.category.toLowerCase().includes(drillSearch.toLowerCase()))
                                        .map((drill, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedDrill(drill)}
                                                className="bg-white  border border-slate-100 dark:border-slate-100 p-8 rounded-[2.5rem] shadow-soft dark:shadow-none hover:shadow-2xl hover:border-slate-200 dark:hover:border-white/10 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-white rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="px-4 py-1.5 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-100">
                                                        {drill.category}
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${drill.complexity === 'Master' ? 'bg-slate-200 text-slate-800' :
                                                            drill.complexity === 'Advanced' ? 'bg-slate-100 text-slate-700' :
                                                                'bg-white text-slate-600'
                                                        }`}>
                                                        {drill.complexity || 'Intermediate'}
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900 mb-4 tracking-tight leading-tight group-hover:text-slate-900 dark:group-hover:text-slate-900 transition-colors">
                                                    {drill.title || drill.question.substring(0, 50) + "..."}
                                                </h3>

                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2 mb-8">
                                                    {drill.question}
                                                </p>

                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex gap-2">
                                                        {(drill.tags || []).slice(0, 2).map((tag: string, i: number) => (
                                                            <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-white/5 px-2 py-1 rounded-md">#{tag}</span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-900 font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                        View Solution <ChevronRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {isDrillsLoading ? (
                                        <div className="col-span-full py-20 text-center space-y-4">
                                            <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Library...</p>
                                        </div>
                                    ) : (activeDrillTab === 'case_study' ? drills.case_studies : activeDrillTab === 'behavioral' ? drills.behavioral : activeDrillTab === 'projects' ? drills.projects : drills.self_intro).length === 0 ? (
                                        <div className="col-span-full py-20 text-center space-y-4">
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-500">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No preparation materials found. Check back soon!</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Resume Builder' && !isResumeBuilderOpen && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="p-10 md:p-14 bg-white border border-slate-100 rounded-[3rem] text-slate-900 shadow-soft relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">AI Resume Builder</h1>
                                <p className="text-slate-500 text-base md:text-lg font-medium max-w-xl">Create and manage your professional, ATS-optimized resumes directly from your console.</p>

                                {(!user?.plan_id || user.plan_id === 'free' || Number(user.plan_id) < 4) ? (
                                    <button
                                        onClick={() => router.push('/pricing')}
                                        className="mt-8 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-slate-100 transition-all shadow-soft hover:-translate-y-1"
                                    >
                                        Upgrade to Unlock Builder <Sparkles size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { resetResumeForm(); setIsResumeBuilderOpen(true); }}
                                        className="mt-8 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-white transition-all shadow-soft hover:-translate-y-1"
                                    >
                                        Create New Resume <ArrowRight size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userResumes.map((res: any, idx: number) => (
                                    <div key={idx} className="bg-white  border border-slate-100 dark:border-slate-100 p-8 rounded-3xl shadow-soft dark:shadow-none hover:shadow-2xl dark:hover:shadow-soft transition-all duration-500 group relative flex flex-col">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 bg-white dark:bg-white/5 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white group-hover:text-slate-900 dark:group-hover:text-slate-900 transition-all">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-900 text-[10px] font-black rounded-full uppercase tracking-wider">
                                                    Score: {res.ats_score || 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 mb-2 truncate">{res.name}</h3>
                                        <p className="text-base text-slate-500 font-medium mb-6">{res.email}</p>

                                        <div className="mt-auto flex items-center gap-3 pt-6 border-t border-slate-50">
                                            <button
                                                onClick={() => handleEditResume(res)}
                                                className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                                            >
                                                Edit <Layout size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteResume(res.id)}
                                                className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-white hover:text-slate-900 transition-all rounded-xl"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {userResumes.length === 0 && (
                                    <div className="col-span-full py-20 bg-white/50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-slate-500 shadow-sm">
                                            <FileSignature size={28} />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No resumes created yet. Start building one!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Resume Builder' && isResumeBuilderOpen && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center justify-between mb-8 no-print">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => setIsResumeBuilderOpen(false)} className="p-4 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-slate-900 dark:hover:text-slate-900 transition-all shadow-soft group">
                                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                    </button>
                                    <div>
                                        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-900 tracking-tight">
                                            {resumeForm.id ? "Precision Editor" : "Resume Architect"}
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Preview Enabled</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleDownloadPdf} className="px-6 py-4 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 text-slate-900 dark:text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                                        <Download size={14} /> PDF
                                    </button>
                                    <button onClick={handleSaveResume} className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white shadow-soft transition-all flex items-center gap-2">
                                        <CheckCircle size={14} /> Save Draft
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                {/* FORM COLUMN */}
                                <div className="xl:col-span-5 space-y-8 max-h-[calc(100vh-250px)] overflow-y-auto pr-4 custom-scrollbar pb-20 no-print">
                                    {/* PERSONAL IDENTITY */}
                                    <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2rem] p-8 shadow-soft dark:shadow-none space-y-6">
                                        <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:border-slate-100">
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-900 rounded-lg"><UserIcon size={18} /></div> Personal Identity
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                                <input value={resumeForm.name} onChange={(e) => setResumeForm({ ...resumeForm, name: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 transition-all font-bold text-slate-900 dark:text-slate-900 outline-none" placeholder="e.g. John Doe" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                                                <input value={resumeForm.email} onChange={(e) => setResumeForm({ ...resumeForm, email: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 transition-all font-bold text-slate-900 dark:text-slate-900 outline-none" placeholder="name@example.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Linkedin</label>
                                                <input value={resumeForm.linkedin} onChange={(e) => setResumeForm({ ...resumeForm, linkedin: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 transition-all font-bold text-slate-900 dark:text-slate-900 outline-none" placeholder="linkedin.com/in/username" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Portfolio</label>
                                                <input value={resumeForm.portfolio} onChange={(e) => setResumeForm({ ...resumeForm, portfolio: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 transition-all font-bold text-slate-900 dark:text-slate-900 outline-none" placeholder="github.com/username" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Summary</label>
                                            <textarea value={resumeForm.summary} onChange={(e) => setResumeForm({ ...resumeForm, summary: e.target.value })} className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 transition-all font-medium text-sm h-32 resize-none text-slate-700 dark:text-slate-500 outline-none" />
                                        </div>
                                    </div>

                                    {/* CORE COMPETENCIES */}
                                    <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2rem] p-8 shadow-soft dark:shadow-none space-y-6">
                                        <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:text-slate-900">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg"><Zap size={18} /></div> Skill Matrix
                                        </h3>
                                        <input 
                                            placeholder="Add skill (Enter)..." 
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') { 
                                                    const val = e.currentTarget.value.trim(); 
                                                    if (val && !resumeForm.skills.includes(val)) { 
                                                        setResumeForm({ ...resumeForm, skills: [...resumeForm.skills, val] }); 
                                                        e.currentTarget.value = ''; 
                                                    } 
                                                } 
                                            }} 
                                            className="w-full px-5 py-3 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 rounded-xl focus:border-slate-100 outline-none font-bold text-slate-900 dark:text-slate-900" 
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {resumeForm.skills.map((s, i) => (
                                                <div key={i} className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-2">
                                                    {s}
                                                    <button onClick={() => setResumeForm({ ...resumeForm, skills: resumeForm.skills.filter(sk => sk !== s) })}><X size={10} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CAREER HISTORY */}
                                    <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2rem] p-8 shadow-soft dark:shadow-none space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:text-slate-900">
                                                <div className="p-2 bg-white dark:bg-white text-slate-900 dark:text-slate-900 rounded-lg"><Activity size={18} /></div> Work Experience
                                            </h3>
                                            <button onClick={() => setResumeForm({ ...resumeForm, experience: [...resumeForm.experience, { role: '', company: '', duration: '', desc: '' }] })} className="p-2 bg-white dark:bg-white text-slate-400 dark:text-slate-500 rounded-lg hover:text-slate-900 dark:hover:text-slate-900 transition-all"><Plus size={18} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            {resumeForm.experience.map((exp, i) => (
                                                <div key={i} className="p-5 bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-slate-100 rounded-2xl relative group/exp space-y-3">
                                                    <button onClick={() => setResumeForm({ ...resumeForm, experience: resumeForm.experience.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/exp:opacity-100 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 text-slate-900 rounded-lg transition-all"><X size={14} /></button>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input placeholder="Role" value={exp.role} onChange={e => { const n = [...resumeForm.experience]; n[i].role = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                        <input placeholder="Company" value={exp.company} onChange={e => { const n = [...resumeForm.experience]; n[i].company = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                    </div>
                                                    <input placeholder="Duration (e.g. 2021 - Present)" value={exp.duration} onChange={e => { const n = [...resumeForm.experience]; n[i].duration = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="w-full px-4 py-2 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none text-slate-900 dark:text-slate-900" />
                                                    <textarea placeholder="Contributions..." value={exp.desc} onChange={e => { const n = [...resumeForm.experience]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, experience: n }); }} className="w-full px-4 py-3 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-xs h-24 resize-none outline-none font-medium text-slate-600 dark:text-slate-400 shadow-inner" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ACADEMIC FOUNDATION */}
                                    <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2rem] p-8 shadow-soft dark:shadow-none space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:text-slate-900">
                                                <div className="p-2 bg-white dark:bg-white text-slate-900 dark:text-slate-900 rounded-lg"><BookOpen size={18} /></div> Education
                                            </h3>
                                            <button onClick={() => setResumeForm({ ...resumeForm, education: [...resumeForm.education, { degree: '', school: '', year: '' }] })} className="p-2 bg-white dark:bg-white text-slate-400 dark:text-slate-500 rounded-lg hover:text-slate-900 dark:hover:text-slate-900 transition-all"><Plus size={18} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            {resumeForm.education.map((edu, i) => (
                                                <div key={i} className="p-5 bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-slate-100 rounded-2xl relative group/edu space-y-3">
                                                    <button onClick={() => setResumeForm({ ...resumeForm, education: resumeForm.education.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/edu:opacity-100 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 text-slate-900 rounded-lg transition-all"><X size={14} /></button>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input placeholder="Degree" value={edu.degree} onChange={e => { const n = [...resumeForm.education]; n[i].degree = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                        <input placeholder="School" value={edu.school} onChange={e => { const n = [...resumeForm.education]; n[i].school = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                    </div>
                                                    <input placeholder="Year/Status" value={edu.year} onChange={e => { const n = [...resumeForm.education]; n[i].year = e.target.value; setResumeForm({ ...resumeForm, education: n }); }} className="w-full px-4 py-2 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none text-slate-900 dark:text-slate-900" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* KEY PROJECTS */}
                                    <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2rem] p-8 shadow-soft dark:shadow-none space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:text-slate-900">
                                                <div className="p-2 bg-white dark:bg-white text-slate-900 rounded-lg"><Code size={18} /></div> Projects
                                            </h3>
                                            <button onClick={() => setResumeForm({ ...resumeForm, projects: [...resumeForm.projects, { name: '', link: '', desc: '' }] })} className="p-2 bg-white dark:bg-white text-slate-400 dark:text-slate-500 rounded-lg hover:text-slate-900 dark:hover:text-slate-900 transition-all"><Plus size={18} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            {resumeForm.projects.map((proj, i) => (
                                                <div key={i} className="p-5 bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-slate-100 rounded-2xl relative group/proj space-y-3">
                                                    <button onClick={() => setResumeForm({ ...resumeForm, projects: resumeForm.projects.filter((_, idx) => idx !== i) })} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/proj:opacity-100 bg-white dark:bg-white border border-slate-100 dark:border-slate-100 text-slate-900 rounded-lg transition-all"><X size={14} /></button>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input placeholder="Project Name" value={proj.name} onChange={e => { const n = [...resumeForm.projects]; n[i].name = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                        <input placeholder="Link" value={proj.link} onChange={e => { const n = [...resumeForm.projects]; n[i].link = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="px-4 py-2.5 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-900" />
                                                    </div>
                                                    <textarea placeholder="Description..." value={proj.desc} onChange={e => { const n = [...resumeForm.projects]; n[i].desc = e.target.value; setResumeForm({ ...resumeForm, projects: n }); }} className="w-full px-4 py-3 bg-white  border border-slate-100 dark:border-slate-100 rounded-xl text-xs h-20 resize-none outline-none font-medium text-slate-600 dark:text-slate-400 shadow-inner" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="xl:col-span-7 hidden md:block group/preview print:block print:col-span-12">
                                    <div className="sticky top-0 bg-white dark:bg-white border-4 border-slate-900/5 rounded-[2.5rem] shadow-2xl p-12 min-h-[1050px] 
                                        transform transition-transform group-hover/preview:scale-[1.01] duration-500 origin-top overflow-hidden preview-card">
                                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover/preview:opacity-40 transition-opacity">
                                            <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-white dark:bg-white animate-pulse"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Live Engine</span>
                                            </div>
                                        </div>

                                        <div className="space-y-10 text-slate-900">
                                            {/* PREVIEW HEADER */}
                                            <div className="pb-10 border-b-2 border-slate-900/5 flex justify-between items-end">
                                                <div>
                                                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{resumeForm.name || "YOUR NAME"}</h2>
                                                    <div className="flex flex-wrap gap-4 mt-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {resumeForm.email && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300"></div> {resumeForm.email}</span>}
                                                        {resumeForm.phone && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300"></div> {resumeForm.phone}</span>}
                                                        {resumeForm.linkedin && <span className="flex items-center gap-1.5 font-black text-slate-900 underline">LinkedIn</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="h-10 w-1 bg-slate-200 ml-auto mb-2"></div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Curriculum Vitae v2.4</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-12 gap-12">
                                                {/* MAIN CONTENT */}
                                                <div className="col-span-8 space-y-12">
                                                    <section>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 flex items-center gap-3">
                                                            Executive Summary <div className="h-[2px] w-8 bg-slate-100"></div>
                                                        </h3>
                                                        <p className="text-sm font-medium text-slate-700 leading-relaxed max-w-lg">
                                                            {resumeForm.summary || "Add a professional summary to showcase your core value proposition and career goals."}
                                                        </p>
                                                    </section>

                                                    <section>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 flex items-center gap-3">
                                                            Professional History <div className="h-[2px] w-8 bg-slate-100"></div>
                                                        </h3>
                                                        <div className="space-y-8">
                                                            {resumeForm.experience.length > 0 ? resumeForm.experience.map((exp: any, i: number) => (
                                                                <div key={i} className="relative pl-6 border-l-2 border-slate-50">
                                                                    <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-slate-200"></div>
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h4 className="font-black text-base text-slate-900 uppercase tracking-tight">{exp.role || "Job Title"}</h4>
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase bg-white px-2 py-0.5 rounded">{exp.duration || "Duration"}</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-3 underline decoration-2 underline-offset-4">{exp.company || "Company Name"}</p>
                                                                    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-4">{exp.desc || "Describe your key contributions and outcomes."}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="text-xs text-slate-500 italic font-medium">Capture your career milestones to populate this section.</div>
                                                            )}
                                                        </div>
                                                    </section>

                                                    <section>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 flex items-center gap-3">
                                                            Strategic Projects <div className="h-[2px] w-8 bg-slate-100"></div>
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {resumeForm.projects.length > 0 ? resumeForm.projects.slice(0, 4).map((p: any, i: number) => (
                                                                <div key={i} className="p-4 bg-white rounded-xl space-y-2">
                                                                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{p.name || "Project Title"}</h5>
                                                                    <p className="text-[9px] text-slate-400 font-medium line-clamp-2">{p.desc || "Brief overview of project scope."}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="col-span-full py-4 border-2 border-dashed border-slate-100 rounded-xl text-center text-[10px] text-slate-500 uppercase font-black tracking-widest">Awaiting Project Data</div>
                                                            )}
                                                        </div>
                                                    </section>
                                                </div>

                                                {/* SIDEBAR CONTENT */}
                                                <div className="col-span-4 space-y-12">
                                                    <section>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Expertise</h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {resumeForm.skills.length > 0 ? resumeForm.skills.map((sk: string, i: number) => (
                                                                <span key={i} className="bg-white text-slate-900 text-[9px] font-black px-2.5 py-1.5 rounded uppercase tracking-tighter shadow-sm">{sk}</span>
                                                            )) : (
                                                                ['Distributed Systems', 'Cloud Arch', 'Neural Nets'].map((s, i) => (
                                                                    <span key={i} className="bg-slate-100 text-slate-500 text-[9px] font-black px-2.5 py-1.5 rounded uppercase tracking-tighter italic">{s}</span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </section>

                                                    <section>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Foundation</h3>
                                                        <div className="space-y-6">
                                                            {resumeForm.education.length > 0 ? resumeForm.education.map((edu: any, i: number) => (
                                                                <div key={i} className="space-y-1">
                                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase leading-tight">{edu.degree || "Degree Name"}</h4>
                                                                    <p className="text-[10px] text-slate-900 font-bold uppercase tracking-widest">{edu.school || "Institution Name"}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold">{edu.year || "Year"}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="space-y-4 opacity-30 select-none grayscale">
                                                                    <div className="space-y-1">
                                                                        <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                                                                        <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </section>

                                                    <div className="pt-20">
                                                        <div className="p-6 bg-white border border-slate-100 rounded-3xl text-slate-900 space-y-4 shadow-xl">
                                                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400"><Shield size={18} /></div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight">Verified by Neural Protocol v.2</p>
                                                            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                                                <div className="h-full bg-white w-[88%]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'Dashboard' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {/* PREMIUM WELCOME HEADER */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white dark:bg-white 
                                border border-slate-100 dark:border-slate-100 rounded-[3rem] p-10 md:p-14 
                                text-slate-900 dark:text-slate-900 shadow-soft dark:shadow-none relative overflow-hidden group">
                                <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left z-10">
                                    <div className="relative group/photo w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-full bg-slate-50 border-[6px] border-white flex justify-center items-center shadow-xl overflow-hidden cursor-pointer transition-transform hover:scale-105 duration-500">
                                        {user?.photo ? (
                                            <img src={user.photo} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            <span className="text-4xl font-black text-blue-600">{userInitial}</span>
                                        )}
                                        <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                                            <Camera size={26} className="text-white drop-shadow-md" />
                                        </div>
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} title="Change Profile Photo" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                                            <span className="px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest bg-slate-900 text-white flex items-center gap-1.5 shadow-lg shadow-slate-200">
                                                <span>💳</span> {user.interviews_remaining || 0} Credits Available
                                            </span>
                                        </div>
                                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-slate-900 dark:text-slate-900">Welcome back,<br />{user.name.split(' ')[0]}!</h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium max-w-lg">Ready to master your next interview? Your performance trend is up 12% this week.</p>
                                    </div>
                                </div>
                                <button onClick={() => { enterFullScreen(); router.push('/?start=true'); }} className="relative z-10 bg-white text-slate-900 hover:bg-white hover:text-slate-900 border border-slate-200 px-10 py-5 rounded-[2rem] font-bold text-sm tracking-tight flex items-center gap-4 transition-all shadow-soft group/btn translate-x-1 hover:translate-x-0">
                                    Start Assessment <div className="p-1.5 bg-slate-100 dark:bg-white/20 rounded-full group-hover/btn:translate-x-1 transition-transform border border-slate-200/50 text-slate-600 dark:text-slate-900"><ArrowRight size={18} /></div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    {IndustryReadinessView()}
                                </div>

                                {/* CLASSIC ATS CARD - COMPACT */}
                                {/* MODERN ATS CARD */}
                                <div className="bg-white border border-slate-100 rounded-3xl p-10 shadow-soft flex flex-col relative overflow-hidden h-full group hover:shadow-xl transition-all duration-500">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:scale-125 transition-transform duration-700"></div>

                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                                                <FileSearch size={22} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-800 tracking-tight">ATS Core Score</h3>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Benchmark</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col space-y-10 justify-center relative z-10 text-center">
                                        <div className="group">
                                            <div className="text-8xl font-black text-slate-900 leading-none tracking-tighter drop-shadow-sm">{user.resume_score || 0}</div>
                                            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.3em] mt-6">System Quality Index</div>
                                        </div>
                                        <button
                                            onClick={handleCheckAtsScore}
                                            disabled={isAnalyzing}
                                            className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                        >
                                            {isAnalyzing ? <><Loader size={16} className="animate-spin" /> Analyzing Agent...</> : <><Zap size={16} className="fill-current" /> Re-Scan Resume Portfolio</>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ACTIVITY TRACKING - MOVED TO DASHBOARD */}
                            <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-3xl p-8 shadow-soft dark:shadow-none overflow-hidden group hover:shadow-xl transition-all duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-900 rounded-2xl">
                                            <Calendar size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900 tracking-tight">Activity Momentum</h3>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Daily Engagement Heatmap</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-1.5 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-900 border border-slate-100 dark:border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-soft dark:shadow-none">Consistency Tracking</div>
                                </div>
                                <div className="w-full">
                                    {renderHeatmap()}
                                </div>
                            </div>

                            {/* PERFORMANCE TREND ANALYSIS - PREMIUM */}
                            <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-3xl p-8 shadow-soft dark:shadow-none overflow-hidden relative group hover:shadow-xl transition-all duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white /20 text-slate-600 dark:text-slate-400 rounded-2xl">
                                            <TrendingUp size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900 tracking-tight">Performance Analytics</h3>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Assessment Growth Pattern</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-1.5 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-soft dark:shadow-none">Live Sync</div>
                                </div>
                                <div className="h-[250px] w-full">
                                    {PerformanceTrendLine()}
                                </div>
                            </div>



                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Attempts', value: stats.total, icon: Activity, color: 'text-slate-900 dark:text-slate-900' },
                                    { label: 'Successfully Completed', value: stats.completed, icon: CheckCircle2, color: 'text-slate-600' },
                                    { label: 'Security Violations', value: stats.terminated, icon: ShieldAlert, color: 'text-slate-600' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white  border border-slate-100 dark:border-slate-100 rounded-3xl p-6 shadow-soft dark:shadow-none hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group">
                                        <div className={`w-10 h-10 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400 mb-4 group-hover:bg-slate-100 dark:group-hover:bg-white/10 group-hover:text-slate-900 dark:group-hover:text-slate-900 transition-all`}>
                                            <stat.icon size={20} />
                                        </div>
                                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 truncate w-full px-2">{stat.label}</h4>
                                        <div className={`text-2xl font-black tracking-tighter ${stat.color === 'text-slate-600' ? 'text-slate-900 dark:text-slate-900' : stat.color || 'text-slate-900 dark:text-slate-900'}`}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* SESSION ARCHIVE TABLE - PREMIUM */}
                            <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2.5rem] shadow-soft dark:shadow-none overflow-hidden group hover:shadow-xl transition-all duration-500">
                                <div className="p-8 border-b border-slate-50/50 dark:border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white dark:bg-white/5 rounded-2xl text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-white/10 group-hover:text-slate-900 dark:group-hover:text-slate-900 transition-all">
                                            <Layout size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900 tracking-tight">Session Archive</h3>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Historical Assessment Data</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveTab('Analytics')} className="text-xs font-bold text-slate-900 dark:text-slate-900 hover:text-black transition-all bg-slate-100 dark:bg-white px-6 py-3 rounded-2xl">View Analytics</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/50 dark:bg-white/5">
                                                <th className="px-6 py-5 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">S.No</th>
                                                <th className="px-10 py-5 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Performance Level</th>
                                                <th className="px-10 py-5 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Assessment Type</th>
                                                <th className="px-10 py-5 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Date Conducted</th>
                                                <th className="px-10 py-5 text-right text-slate-400 font-bold uppercase text-[10px] tracking-widest">Report</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {interviews.length === 0 ? (
                                                <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest">No assessment records found. Complete an interview to generate your first report.</td></tr>
                                            ) : (
                                                interviews.slice(0, 5).map((inv, i) => (
                                                    <tr key={i} className="hover:bg-white/50 transition-all cursor-default group/row">
                                                        <td className="px-6 py-6 text-center text-[11px] font-black text-slate-400">{i + 1}</td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm border ${inv.overall_score >= 80 ? 'bg-white text-slate-600 border-slate-100' : 'bg-white text-slate-600 border-slate-100'}`}>
                                                                    {inv.overall_score || 0}%
                                                                </div>
                                                                <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full transition-all duration-1000 ${inv.overall_score >= 80 ? 'bg-white0' : 'bg-white0'}`} style={{ width: `${inv.overall_score}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-700 text-sm">{inv.module_name || 'General Assessment'}</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Protocol v2</span>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${inv.status === 'completed' ? 'bg-white text-slate-600 border-slate-100' :
                                                                            inv.status === 'terminated' ? 'bg-white text-slate-600 border-slate-100' :
                                                                                'bg-white text-slate-400 border-slate-100'
                                                                        }`}>
                                                                        {inv.status || 'started'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-[11px] text-slate-500 font-bold uppercase tracking-tight">{new Date(inv.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                        <td className="px-10 py-6 text-right flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => setVideoToPlay(`http://localhost:5000/api/video/stream/${inv.id}`)}
                                                                className="p-3 bg-white border border-slate-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-soft group-hover/row:shadow-md"
                                                                title="View Recording"
                                                            >
                                                                <Video size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => window.location.href = `http://localhost:5000/api/download_report?id=${inv.id}&plan_id=${user.plan_id}`}
                                                                className="p-3 bg-white border border-slate-100 text-slate-900 rounded-xl hover:bg-white hover:text-slate-900 transition-all shadow-soft group-hover/row:shadow-md"
                                                            >
                                                                <Download size={18} />
                                                            </button>
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
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="p-12 md:p-16 bg-gradient-to-br from-white to-white rounded-[3rem] text-slate-900 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Hall of Fame</h1>
                                <p className="text-slate-500 text-lg font-medium max-w-lg">Your journey to mastery. Every assessment brings you closer to the elite tier.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[
                                    { title: 'The Pioneer', desc: 'Completed your first interview.', icon: Play, unlocked: true },
                                    { title: 'Consistent Learner', desc: '3-day practice streak.', icon: Flame, unlocked: true },
                                    { title: 'Technical Scholar', desc: 'Score 90% in technical round.', icon: Brain, unlocked: false },
                                    { title: 'Communication Pro', desc: 'Expert level semantic analysis.', icon: MessageSquare, unlocked: false },
                                    { title: 'ATS Master', desc: 'Resume verified & optimized.', icon: FileSearch, unlocked: false },
                                    { title: 'Global Elite', desc: 'Reach top 1% rank.', icon: Star, unlocked: false }
                                ].map((badge, i) => (
                                    <div key={i} className={`group p-10 rounded-[2.5rem] border transition-all duration-500 ${badge.unlocked ? 'bg-white  border-slate-100 dark:border-slate-100 shadow-soft dark:shadow-none hover:shadow-xl dark:hover:shadow-slate-900/10' : 'bg-white/30 dark:bg-white/5 border-slate-100 dark:border-slate-100 opacity-60'}`}>
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110 ${badge.unlocked ? 'bg-white border border-slate-200 text-slate-900' : 'bg-white dark:bg-white text-slate-400 dark:text-slate-600'}`}><badge.icon size={28} /></div>
                                        <h3 className="font-bold text-xl mb-3 text-slate-800 dark:text-slate-900">{badge.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{badge.desc}</p>
                                        {!badge.unlocked && <div className="mt-6 flex items-center gap-2 text-slate-400 dark:text-slate-600"><Lock size={12} fill="currentColor" /><span className="text-[10px] font-bold uppercase tracking-widest">Locked</span></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Analytics' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2.5rem] p-10 shadow-soft dark:shadow-none">
                                    <h3 className="text-xl font-bold mb-10 flex items-center gap-4 text-slate-800 dark:text-slate-900"><div className="p-3 bg-white dark:bg-white/5 rounded-2xl text-slate-400"><Activity size={20} /></div> Performance Spectrum</h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={granularMetrics.length > 0 ? granularMetrics : skillsData}>
                                                <PolarGrid stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
                                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" />
                                                <Radar
                                                    name="Competency"
                                                    dataKey="value"
                                                    stroke="#0f172a"
                                                    fill="#0f172a"
                                                    fillOpacity={0.15}
                                                    strokeWidth={3}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2.5rem] p-10 shadow-soft dark:shadow-none">
                                    <h3 className="text-xl font-bold mb-10 flex items-center gap-4 text-slate-800 dark:text-slate-900"><div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-900 dark:text-slate-900"><TrendingUp size={20} /></div> Growth Trajectory</h3>
                                    <div className="h-[350px]">{PerformanceTrendLine()}</div>
                                </div>
                            </div>
                            <div className="bg-white  border border-slate-100 dark:border-slate-100 rounded-[2.5rem] p-10 shadow-soft dark:shadow-none overflow-hidden">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="p-3 bg-white /20 rounded-2xl text-slate-600 dark:text-slate-400"><Calendar size={20} /></div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-900">Activity Calendar</h3>
                                </div>
                                {renderHeatmap()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Settings' && (
                        <div className="max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            {/* Profile Header Card */}
                            <div className="p-12 md:p-16 bg-white border border-slate-100 rounded-[3.5rem] text-slate-900 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="relative group/photo">
                                        <div className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] bg-white border-2 border-blue-100 flex items-center justify-center text-5xl font-black text-blue-600 shadow-2xl overflow-hidden transition-transform duration-700 group-hover/photo:rotate-3">
                                            {profileData.photo ? (
                                                <img src={profileData.photo} className="w-full h-full object-cover" alt="Profile" />
                                            ) : userInitial}
                                        </div>
                                        <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center gap-3 rounded-[2.5rem] transition-all duration-300 backdrop-blur-sm">
                                            <button type="button" onClick={startCamera} className="p-4 bg-white text-blue-600 border border-blue-100 rounded-2xl hover:bg-blue-50 transition-all shadow-xl active:scale-95"><Camera size={22} /></button>
                                            <label className="p-4 bg-white text-blue-600 border border-blue-100 rounded-2xl hover:bg-blue-50 cursor-pointer transition-all shadow-xl active:scale-95">
                                                <Upload size={22} />
                                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-left flex-1">
                                        <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-blue-100">Verified Identity</div>
                                        <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter text-slate-900 transition-colors group-hover:text-blue-600">{user?.name || "Member Profile"}</h1>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-blue-50/30 px-5 py-2.5 rounded-2xl border border-blue-50/50">
                                                <Mail size={16} className="text-blue-500" /> {user?.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-blue-50/30 px-5 py-2.5 rounded-2xl border border-blue-50/50">
                                                <Smartphone size={16} className="text-blue-500" /> {user?.phone || 'No contact set'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {/* 1. PERSONAL INFORMATION */}
                                    <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-soft space-y-8 hover:border-blue-100 transition-colors">
                                        <h3 className="text-xl font-bold flex items-center gap-4 text-slate-800">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserIcon size={20} /></div> Personal Identity
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Full Name</label>
                                                <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all shadow-inner" placeholder="Enter your full name" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Email Address</label>
                                                <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all shadow-inner" placeholder="Your primary email" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Contact Number</label>
                                                <input type="text" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all shadow-inner" placeholder="Primary contact phone" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. ACADEMIC & RESUME */}
                                    <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-soft space-y-8 hover:border-blue-100 transition-colors">
                                        <h3 className="text-xl font-bold flex items-center gap-4 text-slate-800">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><School size={20} /></div> Education & Files
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">University / Institution</label>
                                                <input type="text" value={profileData.college_name} onChange={e => setProfileData({ ...profileData, college_name: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5 outline-none transition-all shadow-inner" placeholder="e.g. Stanford University" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Academic Year</label>
                                                <div className="relative">
                                                    <select value={profileData.year} onChange={e => setProfileData({ ...profileData, year: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner appearance-none cursor-pointer">
                                                        <option value="1st Year">1st Year</option>
                                                        <option value="2nd Year">2nd Year</option>
                                                        <option value="3rd Year">3rd Year</option>
                                                        <option value="4th Year">4th Year</option>
                                                        <option value="Graduate">Graduate</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Reg Number</label>
                                                    <input type="text" value={profileData.register_no} onChange={e => setProfileData({ ...profileData, register_no: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" placeholder="ID No." />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Branch</label>
                                                    <input type="text" value={profileData.branch} onChange={e => setProfileData({ ...profileData, branch: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" placeholder="CS, ME..." />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Career Domain</label>
                                                <input type="text" value={profileData.domain} onChange={e => setProfileData({ ...profileData, domain: e.target.value })} className="w-full bg-slate-50 border border-slate-50 rounded-2xl px-6 py-4.5 text-sm font-bold focus:bg-white focus:border-blue-400 outline-none transition-all shadow-inner" placeholder="e.g. Full Stack Development" />
                                            </div>
                                            <div className="relative p-6 bg-blue-50/40 rounded-3xl border border-blue-100/50 flex items-center justify-between group/resume shadow-inner">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-50"><FileText size={20} /></div>
                                                    <div>
                                                        <p className="font-bold text-sm leading-none text-slate-900">Global Resume</p>
                                                        <p className="text-blue-500 text-[9px] font-black uppercase mt-1 tracking-widest">Linked AI Knowledge</p>
                                                    </div>
                                                </div>
                                                <label className="px-6 py-2.5 bg-blue-600 text-white border border-blue-500 rounded-xl font-bold text-[10px] cursor-pointer hover:bg-blue-700 hover:scale-105 transition-all uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
                                                    Update Protocol <input type="file" className="hidden" accept=".pdf" onChange={handleResumeChange} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 pt-6">
                                    <button type="submit" disabled={saving} className="flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50">
                                        {saving ? 'Synchronizing Profile...' : 'Finalize & Update Identity'}
                                    </button>
                                    <button type="button" onClick={logout} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                                        <LogOut size={16} /> Sign Out Securely
                                    </button>
                                </div>

                                {/* Transaction History Section */}
                                <div className="mt-8 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-soft hover:border-blue-100 transition-colors">
                                    <h3 className="text-xl font-bold flex items-center gap-4 text-slate-800 mb-8">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><CreditCard size={20} /></div> Transaction History
                                    </h3>
                                    
                                    {userPayments.length > 0 ? (
                                        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 shadow-inner">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Subscribed Plan</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount Paid</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Timestamp</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Method</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {userPayments.map((p, idx) => {
                                                        const planNames: any = { "1": "Starter", "2": "ATS Pro", "3": "Proctor Elite", "4": "Ultimate Bundle" };
                                                        return (
                                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-black text-slate-800">{planNames[p.plan_id] || "Premium Tier"}</span>
                                                                        <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">{p.payment_id}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className="text-base font-black text-blue-600">₹{p.amount}</span>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className="text-xs font-bold text-slate-500">{new Date(p.created_at).toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${p.payment_mode === 'Razorpay' ? 'bg-blue-400' : 'bg-slate-400'}`}></div>
                                                                        <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{p.payment_mode}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/20">
                                            <div className="w-20 h-20 rounded-[2rem] bg-white text-slate-200 flex items-center justify-center shadow-soft mb-4 group-hover:scale-110 transition-transform">
                                                <CreditCard size={32} />
                                            </div>
                                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No transaction history detected</p>
                                        </div>
                                    )}
                                </div>
                            </form>

                            {/* PREFERENCES & SECURITY */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                <div onClick={toggleTheme} className="p-10 bg-white border border-slate-100 rounded-[3rem] flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all shadow-soft group">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl transition-all group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white"><Sun size={24} /></div>
                                        <div>
                                            <span className="block font-black text-lg text-slate-900 tracking-tight">Interface Theme</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Light / Dark Protocol</span>
                                        </div>
                                    </div>
                                    <div className={`w-14 h-7 rounded-full p-1 relative transition-all duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-xl ${theme === 'dark' ? 'translate-x-[28px]' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                <div onClick={handleDeleteAccount} className="p-10 bg-white border border-slate-100 rounded-[3rem] flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all shadow-soft group">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl transition-all group-hover:scale-110"><ShieldAlert size={24} /></div>
                                        <div>
                                            <span className="block font-black text-lg text-rose-500 tracking-tight">Security Wipe</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Permanent Termination</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-rose-400 group-hover:translate-x-1 transition-transform" size={24} />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* PREMIUM PROFILE MODAL */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsProfileModalOpen(false)} />
                    <div className="bg-white  border border-slate-100 dark:border-slate-100 w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-100 flex justify-between items-center bg-white/30 dark:bg-white/5">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-900 tracking-tight">Edit Profile</h2>
                                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">Update your professional information</p>
                            </div>
                            <button onClick={() => setIsProfileModalOpen(false)} className="p-3 hover:bg-white dark:hover:bg-white/10 rounded-2xl transition-all"><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleUpdateProfile} className="space-y-10">
                                <div className="flex flex-col md:flex-row items-center gap-10">
                                    <div className="relative group shrink-0">
                                        <div className="w-36 h-36 rounded-[2rem] bg-white border-2 border-slate-200 flex items-center justify-center text-5xl font-bold text-slate-900 shadow-xl overflow-hidden">
                                            {profileData.photo ? <img src={profileData.photo} className="w-full h-full object-cover" /> : userInitial}
                                        </div>
                                        <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 rounded-[2rem] transition-all duration-300 backdrop-blur-sm">
                                            <button type="button" onClick={startCamera} className="p-3 bg-white/20 hover:bg-white/40 rounded-xl text-slate-900 transition-all"><Camera size={20} /></button>
                                            <label className="p-3 bg-white/20 hover:bg-white/40 rounded-xl text-slate-900 cursor-pointer transition-all"><Upload size={20} /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} /></label>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full">
                                        {isCapturing ? (
                                            <div className="space-y-4">
                                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-36 rounded-2xl bg-slate-100 border border-slate-200 object-cover shadow-inner" />
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={capturePhoto} className="flex-1 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg shadow-slate-200/50">Capture</button>
                                                    <button type="button" onClick={() => setIsCapturing(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-white rounded-2xl border border-slate-100 flex items-center gap-4">
                                                <div className="p-3 bg-white rounded-xl text-slate-400 shadow-sm"><Activity size={20} /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Visual Identity</p>
                                                    <p className="text-xs text-slate-400">Used for proctoring reports</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Full Name</label>
                                        <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Email Address</label>
                                        <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Phone Number</label>
                                        <input type="text" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Academic Year</label>
                                        <select value={profileData.year} onChange={e => setProfileData({ ...profileData, year: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all appearance-none cursor-pointer">
                                            <option value="1st Year">1st Year</option>
                                            <option value="2nd Year">2nd Year</option>
                                            <option value="3rd Year">3rd Year</option>
                                            <option value="4th Year">4th Year</option>
                                            <option value="Graduate">Graduate</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">University Name</label>
                                        <input type="text" value={profileData.college_name} onChange={e => setProfileData({ ...profileData, college_name: e.target.value })} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all" placeholder="e.g. Stanford University" />
                                    </div>
                                </div>
                                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-slate-900 flex justify-between items-center shadow-soft group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform"><FileSearch size={22} /></div>
                                        <div>
                                            <p className="font-bold text-lg leading-none">Resume Repository</p>
                                            <p className="text-slate-900/70 text-xs mt-1">Required for AI assessment matching</p>
                                        </div>
                                    </div>
                                    <label className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-bold text-xs cursor-pointer hover:bg-white transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-black/10">
                                        Select PDF <input type="file" className="hidden" accept=".pdf" onChange={handleResumeChange} />
                                    </label>
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-5 font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em] text-xs">Discard</button>
                                    <button type="submit" disabled={saving} className="flex-[2] py-5 bg-white border border-slate-900 text-slate-900 rounded-3xl font-bold uppercase tracking-[0.2em] text-xs shadow-soft hover:bg-white hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50">
                                        {saving ? 'Synchronizing...' : 'Apply Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* PREMIUM PAYMENT MODAL */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !isPaying && setIsPaymentModalOpen(false)} />
                    <div className="bg-white border border-slate-100 w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-500">
                        {/* Header */}
                        <div className="p-10 border-b border-slate-50 bg-white/30 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white border border-slate-200 rounded-[1.25rem] flex items-center justify-center text-slate-900 shadow-soft group">
                                    <CreditCard size={28} className="transition-transform group-hover:scale-110" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Priority Upgrade</h2>
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Instant Feature Activation</p>
                                </div>
                            </div>
                            {!isPaying && (
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all">
                                    <X size={24} className="text-slate-400" />
                                </button>
                            )}
                        </div>

                        <div className="p-10 space-y-10">
                            {paymentSuccess ? (
                                <div className="py-16 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-700">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                                        <div className="relative w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 shadow-2xl shadow-emerald-500/40">
                                            <CheckCircle size={80} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Payment Verified</h3>
                                        <p className="text-slate-500 font-medium mt-3">Welcome to the Elite Tier, {user?.name.split(' ')[0]}.</p>
                                    </div>
                                    <div className="flex items-center gap-3 px-6 py-2 bg-slate-100 rounded-full">
                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                        <span className="text-[10px] font-bold uppercase text-slate-900 tracking-widest">Calibrating Dashboard...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Summary Card */}
                                    <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-slate-900 flex justify-between items-center shadow-soft relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Diamond Bundle</p>
                                            <h4 className="text-2xl font-bold tracking-tight">Lifetime Access</h4>
                                        </div>
                                        <div className="relative z-10 text-right">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Total Due</p>
                                            <h4 className="text-3xl font-bold tracking-tighter">₹500</h4>
                                        </div>
                                    </div>

                                    {/* Card Display Profile */}
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Payment Method</label>
                                            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between group hover:border-slate-300 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-8 bg-white rounded flex items-center justify-center text-[8px] font-bold text-slate-900 tracking-widest overflow-hidden relative">
                                                        VISA
                                                        <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full opacity-50"></div>
                                                    </div>
                                                    <span className="text-sm font-mono text-slate-600">**** **** **** 4242</span>
                                                </div>
                                                <Shield size={18} className="text-slate-400" />
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                By clicking "Activate Elite Mode", you agree to our terms of service. This is a sandbox transaction.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Master Action */}
                                    <button
                                        onClick={handleSimulatePayment}
                                        disabled={isPaying}
                                        className={`
                                            w-full py-6 rounded-[2rem] font-bold text-sm uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn
                                            ${isPaying ? 'bg-white/50 cursor-not-allowed' : 'bg-white hover:bg-white text-slate-900 shadow-2xl shadow-slate-200/50 active:scale-[0.98]'}
                                        `}
                                    >
                                        {isPaying ? (
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Encrypting Link...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-3">
                                                <span>Activate Elite Mode</span>
                                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </div>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* PREMIUM ATS REPORT MODAL */}
            {isAtsModalOpen && atsAnalysis && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="w-full max-w-5xl max-h-[92vh] bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Master Header */}
                        <div className="p-10 border-b border-slate-100 bg-white text-slate-900 flex justify-between items-center shrink-0 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-125 transition-transform duration-1000"></div>
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-lg shadow-xl shadow-black/10">
                                    <Brain size={32} className="text-slate-900" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight">Neural Resume Analysis</h3>
                                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.4em] mt-1 opacity-80">v5.0 Global Protocol Execution</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAtsModalOpen(false)} className="relative z-10 p-4 hover:bg-white/10 rounded-full transition-all active:scale-90">
                                <X size={28} />
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
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-900" />
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * atsAnalysis.score) / 100} className="text-slate-900 transition-all duration-1000 ease-out" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-5xl font-black italic">{atsAnalysis.score}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ATS Index</span>
                                        </div>
                                    </div>
                                    <div className="px-6 py-2 bg-white border border-slate-200 text-slate-900 text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm">
                                        {atsAnalysis.level} Level
                                    </div>
                                </div>

                                {/* Field & Market */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategic Field</p>
                                            <h4 className="text-2xl font-black italic">{atsAnalysis.field}</h4>
                                        </div>
                                        <div className="mt-6 flex items-center gap-3 text-slate-900">
                                            <div className="p-2 bg-white border border-slate-200 text-slate-900 rounded-lg"><Layout size={18} /></div>
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
                                    <Search className="text-slate-400" size={16} /> Scanning Checklist
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
                                            <div key={s} className="group flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl hover:border-slate-400 transition-all cursor-pointer">
                                                <span className="text-xs font-black italic">{s}</span>
                                                <Check className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" size={14} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                        <ExternalLink className="text-slate-400" size={16} /> Strategic Learning Paths
                                    </h4>
                                    <div className="space-y-4">
                                        {atsAnalysis.courses.map((course: any, idx: number) => (
                                            <a
                                                key={idx}
                                                href={course[1]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all"
                                            >
                                                <span className="text-[11px] font-black italic text-slate-900">{course[0]}</span>
                                                <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-all" size={18} />
                                            </a>
                                        ))}
                                        {atsAnalysis.courses.length === 0 && (
                                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 italic text-xs font-bold">
                                                No specific courses identified for this field. Focus on core technical skills.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Videos Section */}
                            <div className="pt-6 border-t border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Writing Optimization</p>
                                        <div className="aspect-video bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
                                            <iframe src={atsAnalysis.resume_video.replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Behavioral Assessment Preparation</p>
                                        <div className="aspect-video bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
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
                                className="px-10 py-4 bg-white border border-slate-200 text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-soft hover:bg-white transition-all active:scale-95"
                            >
                                Acknowledge Insights
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* QUESTION BANK MODAL */}
            {selectedDrill && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className={`p-8 md:p-10 border-b border-slate-100 flex justify-between items-center shrink-0 relative overflow-hidden group bg-white text-slate-900`}>
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-125 transition-transform duration-1000"></div>
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-4 bg-white rounded-[1.5rem] shadow-sm border border-slate-100">
                                    {activeDrillTab === 'case_study' ? <Layout size={28} className="text-slate-900" /> : <UserIcon size={28} className="text-slate-900" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Preparation Library</span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{selectedDrill.category}</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{selectedDrill.title || "Behavioral Scenario"}</h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDrill(null)} className="relative z-10 p-3 hover:bg-slate-100 rounded-full transition-all active:scale-90">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    <MessageSquare size={14} className="text-slate-900" /> The Challenge
                                </div>
                                <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100/50">
                                    <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed italic">
                                        "{selectedDrill.question}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    <Sparkles size={14} className="text-slate-400" /> Ideal Response Architecture
                                </div>
                                <div className="p-8 md:p-10 bg-white border border-slate-100 rounded-[3rem] relative group/ans">
                                    <div className="absolute top-6 right-8 text-slate-900 group-hover/ans:text-slate-400 transition-colors">
                                        <Award size={32} />
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <div className="text-slate-700 text-lg leading-loose whitespace-pre-wrap font-medium">
                                            {selectedDrill.ideal_answer}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-6">
                                <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <Activity size={14} /> Complexity: {selectedDrill.complexity}
                                </div>
                                {(selectedDrill.tags || []).map((tag: string) => (
                                    <div key={tag} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                        #{tag}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-50 bg-white/30 flex justify-center shrink-0 gap-4">
                            <button
                                onClick={() => setSelectedDrill(null)}
                                className="px-10 py-5 bg-slate-200 text-slate-700 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-soft hover:bg-slate-300 transition-all active:scale-95"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        document.documentElement.requestFullscreen().catch(() => { });
                                    }
                                    router.push(`/instructions?topic=${encodeURIComponent(selectedDrill.title || selectedDrill.category || "Behavioral Scenario")}&mode=practice&section=${activeDrillTab}`);
                                }}
                                className="px-10 py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-soft hover:bg-white hover:text-slate-900 transition-all active:scale-95 flex items-center gap-2"
                            >
                                Practice Drill
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* VIDEO PLAYBACK MODAL */}
            {videoToPlay && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="w-full max-w-4xl bg-black rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="absolute top-0 inset-x-0 p-5 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
                            <div className="flex items-center gap-3 text-white">
                                <Video size={24} className="text-blue-500" />
                                <span className="font-bold tracking-widest text-sm uppercase">Assessment Recording</span>
                            </div>
                            <button onClick={() => setVideoToPlay(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md">
                                <X size={24} className="text-white" />
                            </button>
                        </div>
                        {/* Video Element */}
                        <div className="aspect-video w-full bg-black flex items-center justify-center">
                            <video 
                                src={videoToPlay} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
