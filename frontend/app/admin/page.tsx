"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '../../api-utils';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Award,
    TrendingUp,
    Search,
    Bell,
    LogOut,
    Sun,
    Moon,
    Filter,
    Download,
    CheckCircle,
    BarChart3,
    MoreHorizontal,
    Video,
    Shield,
    Settings,
    Trash2,
    FileText,
    Eye,
    EyeOff,
    Zap,
    AlertTriangle,
    Cpu,
    MessagesSquare,
    FileSpreadsheet,
    GraduationCap
} from 'lucide-react';
import { useTheme } from '../theme-context';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [adminUser, setAdminUser] = useState<any>(null);
    const [stats, setStats] = useState({
        total_enrolled: 0,
        students_interviewed: 0,
        total_attempts: 0,
        terminated_count: 0,
        avg_score: 0,
        performance_categories: {
            'Placement Ready': 0,
            'Developing': 0,
            'Needs Training': 0
        },
        skill_metrics: {
            technical: 0,
            non_technical: 0
        },
        today_interviews: 0,
        top_performer: null as any,
        top_scorers: [] as any[],
        daily_volume: [] as any[]
    });
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [filterReadiness, setFilterReadiness] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [filterYear, setFilterYear] = useState('All');
    const [filterBranch, setFilterBranch] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterScore, setFilterScore] = useState('All');

    // Settings State
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [videoToPlay, setVideoToPlay] = useState<string | null>(null);

    // ── Auth Guard ──────────────────────────────────────────────────────────
    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (!session) {
            router.replace('/admin-login');
            return;
        }
        try {
            const parsed = JSON.parse(session);
            if (parsed.role !== 'admin') {
                router.replace('/admin-login');
                return;
            }
            setAdminUser(parsed);
        } catch {
            router.replace('/admin-login');
        }
    }, [router]);

    const getAdminHeaders = useCallback((): Record<string, string> => {
        const session = localStorage.getItem('admin_session');
        if (!session) return {};
        try {
            const parsed = JSON.parse(session);
            return {
                'Admin-ID': parsed.id.toString(),
                'Content-Type': 'application/json'
            };
        } catch { return {}; }
    }, []);

    const secureDownload = async (url: string, filename: string) => {
        try {
            const res = await fetch(url, {
                headers: getAdminHeaders()
            });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error(e);
            alert("Failed to download file.");
        }
    };

    const handleExportExcel = () => {
        // Convert candidates data to CSV (Excel compatible)
        const headers = ['S.No', 'Register No', 'Name', 'Email', 'Branch', 'Year', 'Phone', 'Total Interviews', 'Best Score', 'Readiness', 'Status'];
        const csvContent = [
            headers.join(','),
            ...filteredCandidates.map((c, i) => [
                i + 1,
                c.register_no || '-',
                `"${c.name}"`,
                c.email,
                c.branch || '-',
                c.year || '-',
                c.phone || '-',
                c.total_interviews,
                c.best_score || 0,
                `"${c.readiness_tag || 'Developing'}"`,
                c.total_interviews > 0 ? 'Completed' : 'Pending'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'ai_interviewer_candidates.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchCandidates();
        fetchInterviews();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/stats', {
                headers: getAdminHeaders()
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_session');
                router.replace('/admin-login');
                return;
            }
            const data = await res.json();
            if (data.status === 'success') {
                setStats(data.stats);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch stats", e);
        }
    };

    const fetchCandidates = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/candidates', {
                headers: getAdminHeaders()
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_session');
                router.replace('/admin-login');
                return;
            }
            const data = await res.json();
            if (data.status === 'success') {
                setCandidates(data.candidates);
            }
        } catch (e) {
            console.error("Failed to fetch candidates", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInterviews = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/interviews', {
                headers: getAdminHeaders()
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_session');
                router.replace('/admin-login');
                return;
            }
            const data = await res.json();
            if (data.status === 'success') {
                setInterviews(data.interviews);
            }
        } catch (e) {
            console.error("Failed to fetch interviews", e);
        }
    };

    const handleDeleteCandidate = async (id: number) => {
        if (!confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/candidate/${id}`, {
                method: 'DELETE',
                headers: getAdminHeaders()
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCandidates(prev => prev.filter(c => c.id !== id));
                setSelectedCandidate(null);
                // alert("Candidate deleted successfully"); // Optional: less intrusive UX preferred
            } else {
                alert("Failed to delete candidate");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting candidate");
        }
    };

    // --- METRICS CALCULATION ---
    // "how many students took the interview" -> Count where total_interviews > 0
    const activeStudents = candidates.filter(c => c.total_interviews > 0);
    const totalStudentsTookInterview = activeStudents.length;

    // "year wise breakdown"
    const yearCounts = {
        '2nd Year': activeStudents.filter(c => c.year === '2nd Year').length,
        '3rd Year': activeStudents.filter(c => c.year === '3rd Year').length,
        '4th Year': activeStudents.filter(c => c.year === '4th Year').length,
        'Other': activeStudents.filter(c => !['2nd Year', '3rd Year', '4th Year'].includes(c.year)).length
    };

    // "top performers"
    const topPerformers = [...activeStudents]
        .sort((a, b) => (b.best_score || 0) - (a.best_score || 0))
        .slice(0, 5);

    // --- HELPER: GET STATUS ---
    const getCandidateStatus = (c: any) => {
        if (!c.total_interviews || c.total_interviews === 0) return { label: 'Registered', color: 'bg-slate-100 text-slate-500' };
        if (c.best_score >= 80) return { label: 'Shortlisted', color: 'bg-green-100 text-green-700' };
        if (c.best_score < 50) return { label: 'Rejected', color: 'bg-red-50 text-red-600' };
        return { label: 'Completed', color: 'bg-blue-100 text-blue-600' };
    };

    // Filtered List for Table
    const filteredCandidates = candidates.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.register_no && c.register_no.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesYear = filterYear === 'All' || c.year === filterYear;
        const matchesBranch = filterBranch === 'All' || c.branch === filterBranch;

        let matchesStatus = true;
        const status = getCandidateStatus(c).label;
        if (filterStatus !== 'All') {
            matchesStatus = status === filterStatus;
        }

        let matchesScore = true;
        const score = c.best_score || 0;
        if (filterScore === '>80') matchesScore = score >= 80;
        if (filterScore === '50-80') matchesScore = score >= 50 && score < 80;
        if (filterScore === '<50') matchesScore = score < 50;

        const matchesReadiness = filterReadiness === 'All' || c.readiness_tag === filterReadiness;

        return matchesSearch && matchesYear && matchesBranch && matchesStatus && matchesScore && matchesReadiness;
    });

    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [candidateHistory, setCandidateHistory] = useState<any[]>([]);



    const fetchCandidateHistory = async (userId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/api/user/dashboard/${userId}`);
            const data = await res.json();
            if (data.status === 'success') {
                setCandidateHistory(data.interviews);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleViewCandidate = (candidate: any) => {
        setSelectedCandidate(candidate);
        fetchCandidateHistory(candidate.id);
    };

    // Filter Logic based on Tab
    // If Tab is Candidates, maybe show all? For now, re-use filteredCandidates

    const handleUpdatePassword = async () => {
        if (!adminPassword) {
            alert("Please enter a new password");
            return;
        }
        setIsUpdating(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@ai-interviewer.com',
                    new_password: adminPassword
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert("Password updated successfully");
                setAdminPassword("");
            } else {
                alert("Failed to update password: " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Error updating password");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAdminLogout = () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('user_session');
        localStorage.removeItem('resume_uploaded');
        window.location.href = '/';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-medium animate-pulse">Loading Admin Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans transition-colors duration-300 flex">

            {/* --- SIDEBAR --- */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-[var(--card-bg)] border-r border-[var(--border)] transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-20 flex items-center justify-center border-b border-[var(--border)] px-4">
                    <div className="flex items-center gap-3 w-full select-none cursor-pointer" onClick={() => router.push('/admin')}>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30 shrink-0">
                            AI
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden whitespace-nowrap">
                                <h1 className="text-lg font-bold tracking-tight">AI Interviewer</h1>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    {[
                        { icon: LayoutDashboard, label: 'Dashboard' },
                        { icon: Users, label: 'Performance' },
                        { icon: BarChart3, label: 'Analytics' },
                        { icon: Settings, label: 'Settings' },
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveTab(item.label)}
                            title={item.label}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${activeTab === item.label ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-[var(--text-muted)] hover:bg-[var(--nav-bg)] hover:text-[var(--foreground)]'}`}
                        >
                            <item.icon size={20} className={activeTab === item.label ? 'text-white' : 'group-hover:text-indigo-500'} />
                            {isSidebarOpen && <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <button onClick={toggleTheme} className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[var(--nav-bg)] transition-all ${!isSidebarOpen && 'justify-center'}`}>
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-500" />}
                        {isSidebarOpen && <span className="font-bold text-sm">Toggle Theme</span>}
                    </button>
                    <button onClick={handleAdminLogout} className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all mt-1 ${!isSidebarOpen && 'justify-center'}`}>
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="font-bold text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className={`flex-1 transition-all duration-300 p-6 space-y-8 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--nav-bg)] transition-all">
                            <MoreHorizontal size={20} className="text-[var(--text-muted)]" />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">Dashboard Overview</h2>
                            <p className="text-[var(--text-muted)] font-medium">Welcome back, {adminUser?.name || 'Admin'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative group flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl py-2.5 pl-12 pr-4 outline-none focus:border-indigo-500 focus:bg-[var(--background)] transition-all font-medium text-sm shadow-sm"
                            />
                        </div>

                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-emerald-500/20 hover:scale-105 transition-all flex-shrink-0">
                            <FileSpreadsheet size={16} /> <span className="hidden sm:block">Export Excel</span>
                        </button>
                        <div className="w-10 h-10 bg-[var(--card-bg)] border border-[var(--border)] rounded-full flex items-center justify-center relative cursor-pointer hover:bg-[var(--nav-bg)] transition-all">
                            <Bell size={18} className="text-[var(--text-muted)]" />
                            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                        </div>
                    </div>
                </div>

                {/* --- STATS GRID (Only on Dashboard) --- */}
                {activeTab === 'Dashboard' && (
                    <>
                        <div className="flex items-center justify-between gap-4 mb-2">
                             <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-indigo-500/20">
                                <Zap size={10} fill="currentColor" /> Live Updates Active
                             </div>
                             <span className="text-[10px] font-bold text-[var(--text-muted)] italic">
                                Last synced: {lastUpdated.toLocaleTimeString()}
                             </span>
                        </div>

                        {/* TOP PERFORMER HERO CARD */}
                        {stats.top_performer && (
                            <div className="mb-8 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-x opacity-10 rounded-[2.5rem]"></div>
                                <div className="bg-[var(--card-bg)] border-2 border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-600/40 border-4 border-white dark:border-slate-800 transform group-hover:scale-105 transition-transform">
                                                {stats.top_performer.name?.charAt(0)}
                                            </div>
                                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800 animate-bounce">
                                                <Award size={20} className="text-amber-900" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="px-3 py-1 bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-400/20">
                                                    Top Performer (Last 24 Hours)
                                                </span>
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight text-[var(--foreground)] mb-1 uppercase italic line-clamp-1">
                                                {stats.top_performer.name}
                                            </h2>
                                            <p className="text-lg font-bold text-[var(--text-muted)] flex items-center gap-2">
                                                <GraduationCap size={18} className="text-indigo-500" /> {stats.top_performer.year} | {stats.top_performer.branch}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-8 bg-[var(--background)] p-6 rounded-[2rem] border border-[var(--border)] shadow-inner">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Score</p>
                                            <div className="text-4xl font-black text-indigo-600">{stats.top_performer.score}%</div>
                                        </div>
                                        <div className="w-px h-12 bg-[var(--border)]"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Rank</p>
                                            <div className="text-4xl font-black text-emerald-500">#01</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* PERFORMANCE INTELLIGENCE SECTION */}
                        <div className="mb-6">
                            <h3 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Zap size={16} className="text-yellow-500" /> Performance Intelligence
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* PLACEMENT READY */}
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-6 rounded-[2rem] shadow-sm hover:shadow-emerald-500/10 transition-all relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                            <Award size={24} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight relative z-10">{stats.performance_categories?.['Placement Ready'] || 0}</h3>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 relative z-10">Placement Ready</p>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Award size={100} />
                                    </div>
                                </div>

                                {/* TECHNICAL STRENGTH */}
                                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 p-6 rounded-[2rem] shadow-sm hover:shadow-blue-500/10 transition-all relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                            <Cpu size={24} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight relative z-10">{stats.skill_metrics?.technical || 0}%</h3>
                                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 relative z-10">Avg. Technical Score</p>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Cpu size={100} />
                                    </div>
                                </div>

                                {/* SOFT SKILLS STRENGTH */}
                                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 p-6 rounded-[2rem] shadow-sm hover:shadow-purple-500/10 transition-all relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="w-12 h-12 bg-purple-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                                            <MessagesSquare size={24} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight relative z-10">{stats.skill_metrics?.non_technical || 0}%</h3>
                                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 relative z-10">Avg. Behavioral Score</p>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <MessagesSquare size={100} />
                                    </div>
                                </div>

                                {/* NEEDS TRAINING */}
                                <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-500/20 p-6 rounded-[2rem] shadow-sm hover:shadow-rose-500/10 transition-all relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                                            <AlertTriangle size={24} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight relative z-10">{stats.performance_categories?.['Needs Training'] || 0}</h3>
                                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 relative z-10">Needs Training</p>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <AlertTriangle size={100} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KEY METRICS ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* TOTAL ENROLLED */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Enrollment</span>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.total_enrolled}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Total People Registered</p>
                            </div>

                            {/* SIGNED IN / INTERVIEWED (ACTIVITY) */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center">
                                        <Zap size={24} />
                                    </div>
                                    <div className="text-[10px] font-black text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg">
                                        {stats.total_enrolled > 0 ? ((stats.students_interviewed / stats.total_enrolled) * 100).toFixed(0) : 0}% Active
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.students_interviewed}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Interviews Conducted</p>
                            </div>

                            {/* SELECTION RATE */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="text-xs font-bold text-[var(--text-muted)]">Target: 20%</div>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
                                    {totalStudentsTookInterview > 0 ? ((activeStudents.filter(c => c.best_score >= 80).length / totalStudentsTookInterview) * 100).toFixed(1) : 0}%
                                </h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Selection Rate</p>
                            </div>

                            {/* TOTAL ATTEMPTS */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                        +{stats.today_interviews} Today
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.total_attempts}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Total Assessment Volume</p>
                            </div>

                            {/* DAILY ACTIVITY CARD */}
                            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <TrendingUp size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Day Summary</span>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight relative z-10">{stats.today_interviews}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1 relative z-10">Interviews Today</p>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUp size={100} />
                                </div>
                            </div>
                        </div>

                        {/* DAILY SCORE & VOLUME CHARTS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* DAILY VOLUME CHART */}
                            <div className="col-span-1 lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">Engagement Overview</p>
                                        <h3 className="text-xl font-black text-[var(--foreground)] mt-1">Daily Interview Volume</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                                        <span className="text-xs font-bold text-[var(--text-muted)]">Last 30 Days</span>
                                    </div>
                                </div>
                                
                                <div className="w-full h-[300px]">
                                    {stats.daily_volume && stats.daily_volume.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.daily_volume}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                                <XAxis 
                                                    dataKey="date" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold'}}
                                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold'}} />
                                                <Tooltip 
                                                    contentStyle={{backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold'}}
                                                />
                                                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24}>
                                                    <defs>
                                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#6366f1" />
                                                            <stop offset="100%" stopColor="#4f46e5" />
                                                        </linearGradient>
                                                    </defs>
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
                                            <BarChart3 size={40} className="opacity-20" />
                                            <p className="font-bold text-sm">No activity recorded yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AVERAGE SCORE HIGHLIGHT */}
                            <div className="col-span-1 bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center text-center">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-4">
                                    <Award size={40} />
                                </div>
                                <h3 className="text-5xl font-black text-[var(--foreground)] tracking-tight">{stats.avg_score}%</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">Platform Average Score</p>
                                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase">
                                    <Zap size={12} fill="currentColor" /> Benchmarked against 10k+ candidates
                                </div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            {/* YEAR DISTRIBUTION (PIE CHART) */}
                            <div className="col-span-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col min-h-[300px]">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">Student Distribution</p>
                                    <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-[var(--text-muted)]">By Year</div>
                                </div>

                                <div className="w-full h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={[
                                            { name: '2nd', value: yearCounts['2nd Year'], color: '#3b82f6' },
                                            { name: '3rd', value: yearCounts['3rd Year'], color: '#8b5cf6' },
                                            { name: '4th', value: yearCounts['4th Year'], color: '#ec4899' },
                                            { name: 'Other', value: yearCounts['Other'], color: '#94a3b8' }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }} />
                                            <Tooltip
                                                cursor={{ fill: 'var(--nav-bg)' }}
                                                contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'var(--foreground)' }}
                                                itemStyle={{ color: 'var(--foreground)' }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                                {[
                                                    { name: '2nd', color: '#3b82f6' },
                                                    { name: '3rd', color: '#8b5cf6' },
                                                    { name: '4th', color: '#ec4899' },
                                                    { name: 'Other', color: '#94a3b8' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* TOP PERFORMERS (BAR GRAPH) */}
                            <div className="col-span-1 lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all flex flex-col min-h-[300px]">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">Top Performers</p>
                                    <button className="text-[10px] font-bold text-indigo-600 hover:underline">View All</button>
                                </div>

                                <div className="w-full h-[250px] relative">
                                    {topPerformers.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <BarChart data={topPerformers.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }}
                                                    interval={0}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold' }}
                                                    domain={[0, 100]}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'var(--nav-bg)' }}
                                                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'var(--foreground)' }}
                                                    itemStyle={{ color: 'var(--foreground)' }}
                                                />
                                                <Bar dataKey="best_score" radius={[4, 4, 0, 0]} barSize={40}>
                                                    {topPerformers.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#64748b' : index === 2 ? '#b45309' : '#6366f1'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                                            <BarChart3 size={32} className="mb-2" />
                                            <p className="text-[10px] font-bold uppercase">No Data</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- MAIN TABLE (Visible in Dashboard & Candidates) --- */}
                {(activeTab === 'Dashboard' || activeTab === 'Performance') && (
                    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-8 border-b border-[var(--border)] bg-[var(--nav-bg)]/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-black text-[var(--foreground)]">Student Directory</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Manage and review all registered candidates</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                                    <Filter size={16} className="text-[var(--text-muted)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Readiness:</span>
                                    <select
                                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                                        value={filterReadiness}
                                        onChange={(e) => setFilterReadiness(e.target.value)}
                                    >
                                        <option value="All">All Categories</option>
                                        <option value="Placement Ready">Placement Ready</option>
                                        <option value="Good in Technical">Good in Technical</option>
                                        <option value="Good in Soft Skills">Good in Non-Technical</option>
                                        <option value="Needs Training">Needs Training</option>
                                        <option value="Developing">Developing</option>
                                        <option value="No Assessment">No Assessment</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                                    <Filter size={16} className="text-[var(--text-muted)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Branch:</span>
                                    <select
                                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                                        value={filterBranch}
                                        onChange={(e) => setFilterBranch(e.target.value)}
                                    >
                                        <option value="All">All</option>
                                        <option value="CSE">CSE</option>
                                        <option value="ECE">ECE</option>
                                        <option value="EEE">EEE</option>
                                        <option value="MECH">MECH</option>
                                        <option value="CIVIL">CIVIL</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                                    <Filter size={16} className="text-[var(--text-muted)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Year:</span>
                                    <select
                                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                    >
                                        <option value="All">All Years</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                                    <Filter size={16} className="text-[var(--text-muted)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Status:</span>
                                    <select
                                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="All">All</option>
                                        <option value="Registered">Registered</option>
                                        <option value="Shortlisted">Shortlisted</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                                    <Filter size={16} className="text-[var(--text-muted)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mr-2">Score:</span>
                                    <select
                                        className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                                        value={filterScore}
                                        onChange={(e) => setFilterScore(e.target.value)}
                                    >
                                        <option value="All">All Scores</option>
                                        <option value=">80">&gt; 80%</option>
                                        <option value="50-80">50% - 80%</option>
                                        <option value="<50">&lt; 50%</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">S.No</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Reg No</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Name</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Branch</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Readiness</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Subscription</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Year</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Phone</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] text-center">Status</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] text-center">Score</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {filteredCandidates.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-24">
                                                <div className="flex flex-col items-center opacity-50">
                                                    <Users size={48} className="mb-4 text-[var(--text-muted)]" />
                                                    <p className="font-bold">No candidates found matching your criteria.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCandidates.map((candidate, idx) => (
                                            <tr key={candidate.id} className="group hover:bg-[var(--nav-bg)]/50 transition-colors">
                                                <td className="px-6 py-3 text-sm font-bold text-[var(--text-muted)]">{idx + 1}</td>
                                                <td className="px-6 py-3 font-mono text-sm font-bold text-indigo-600">{candidate.register_no || '-'}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-[var(--foreground)] border border-[var(--background)] shadow-sm">
                                                            {candidate.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <p className="font-bold text-sm text-[var(--foreground)]">{candidate.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 font-bold text-sm">{candidate.branch || '-'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        candidate.readiness_tag === 'Placement Ready' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                        candidate.readiness_tag === 'Needs Training' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                        candidate.readiness_tag === 'Good in Technical' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                        candidate.readiness_tag === 'Good in Soft Skills' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                    }`}>
                                                        {candidate.readiness_tag || 'Developing'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                            candidate.plan_id === 4 ? 'text-orange-500' :
                                                            candidate.plan_id === 3 ? 'text-slate-800 dark:text-white' :
                                                            candidate.plan_id === 2 ? 'text-blue-500' :
                                                            candidate.plan_id === 1 ? 'text-slate-600 dark:text-slate-400' :
                                                            'text-slate-400'
                                                        }`}>
                                                            {candidate.plan_id === 4 ? 'Ultimate' : candidate.plan_id === 3 ? 'Elite' : candidate.plan_id === 2 ? 'Pro' : candidate.plan_id === 1 ? 'Starter' : 'Free Tier'}
                                                        </span>
                                                        <span className={`text-[9px] font-bold ${candidate.interviews_remaining > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {candidate.interviews_remaining > 0 ? `${candidate.interviews_remaining} Credits` : 'Unsubscribed'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm">{candidate.year || '-'}</td>
                                                <td className="px-6 py-3 text-sm">{candidate.phone || '-'}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${getCandidateStatus(candidate).color}`}>
                                                        {getCandidateStatus(candidate).label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    {candidate.best_score ? (
                                                        <span className={`text-sm font-black ${candidate.best_score >= 80 ? 'text-green-500' : candidate.best_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {candidate.best_score.toFixed(0)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-muted)]">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                    <button onClick={() => handleViewCandidate(candidate)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-indigo-600 transition-colors" title="View Details">
                                                        <Users size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteCandidate(candidate.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors" title="Delete Candidate">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- INTERVIEWS TABLE (Stacked below Candidates) --- */}


                {/* --- ANALYTICS TAB --- */}
                {activeTab === 'Analytics' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Avg. Score</p>
                            <h3 className="text-4xl font-black text-indigo-600">
                                {(interviews.reduce((acc, curr) => acc + curr.overall_score, 0) / (interviews.length || 1)).toFixed(1)}%
                            </h3>
                        </div>
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Total Interviews</p>
                            <h3 className="text-4xl font-black text-[var(--foreground)]">{interviews.length}</h3>
                        </div>
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Pass Rate (&gt;50%)</p>
                            <h3 className="text-4xl font-black text-emerald-500">
                                {((interviews.filter(i => i.overall_score >= 50).length / (interviews.length || 1)) * 100).toFixed(0)}%
                            </h3>
                        </div>
                        {/* Placeholder for more charts */}
                        <div className="col-span-1 md:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] p-10 rounded-[2rem] text-center opacity-50">
                            <BarChart3 className="mx-auto mb-4" size={48} />
                            <p className="font-bold">More detailed analytics coming soon...</p>
                        </div>
                    </div>
                )}


                {/* --- SETTINGS TAB --- */}
                {activeTab === 'Settings' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8">
                            <h3 className="text-xl font-black mb-6">Admin Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Admin Email</label>
                                    <input type="email" value="admin@ai-interviewer.com" disabled className="w-full bg-[var(--nav-bg)] border border-[var(--border)] rounded-xl px-4 py-3 font-bold text-[var(--text-muted)] opacity-70 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">New Password API</label>
                                    <div className="relative group">
                                        <input
                                            type={showAdminPassword ? "text" : "password"}
                                            placeholder="Enter new password to update"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-4 pr-12 py-3 outline-none focus:border-indigo-500 transition-colors shadow-inner relative z-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-indigo-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center p-0"
                                        >
                                            {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleUpdatePassword}
                                        disabled={isUpdating}
                                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isUpdating ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
                                    >
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-8">
                            <h3 className="text-xl font-black mb-6 text-red-500">Danger Zone</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">Maintenance Mode</p>
                                    <p className="text-xs text-[var(--text-muted)]">Disable all student logins temporarily.</p>
                                </div>
                                <div
                                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                                    className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-300 ${maintenanceMode ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CANDIDATE DETAIL MODAL --- */}
                {
                    selectedCandidate && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCandidate(null)}>
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card-bg)]/95 backdrop-blur z-10">
                                    <h3 className="text-xl font-black">Candidate Profile</h3>
                                    <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-[var(--nav-bg)] rounded-full transition-colors">
                                        <LogOut size={20} className="rotate-45" />
                                    </button>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="flex items-start gap-6">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-black text-white shadow-lg shrink-0">
                                            {selectedCandidate.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-3xl font-black leading-tight">{selectedCandidate.name}</h2>
                                                    <p className="text-[var(--text-muted)] text-lg mb-2">{selectedCandidate.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase ${selectedCandidate.total_interviews > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {selectedCandidate.total_interviews > 0 ? 'Active' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                                                <div className="p-3 bg-[var(--nav-bg)] rounded-xl border border-[var(--border)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Register No</p>
                                                    <p className="font-bold font-mono text-indigo-600">{selectedCandidate.register_no || 'N/A'}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--nav-bg)] rounded-xl border border-[var(--border)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Branch</p>
                                                    <p className="font-bold">{selectedCandidate.branch || 'N/A'}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--nav-bg)] rounded-xl border border-[var(--border)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Year</p>
                                                    <p className="font-bold">{selectedCandidate.year || 'N/A'}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--nav-bg)] rounded-xl border border-[var(--border)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Phone</p>
                                                    <p className="font-bold">{selectedCandidate.phone || 'N/A'}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--nav-bg)] rounded-xl border border-[var(--border)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Subscription</p>
                                                    <p className="font-bold whitespace-nowrap text-xs flex flex-col pt-1">
                                                        <span className="text-orange-500">{selectedCandidate.plan_id === 4 ? 'Ultimate' : selectedCandidate.plan_id === 3 ? 'Elite' : selectedCandidate.plan_id === 2 ? 'Pro' : selectedCandidate.plan_id === 1 ? 'Starter' : 'Free Tier'}</span>
                                                        <span className="text-[9px] text-[var(--text-muted)]">{selectedCandidate.interviews_remaining > 0 ? `${selectedCandidate.interviews_remaining} Credits` : 'None'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-[var(--nav-bg)] border border-[var(--border)]">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Total Interviews</p>
                                            <p className="text-2xl font-black text-[var(--foreground)]">{selectedCandidate.total_interviews}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[var(--nav-bg)] border border-[var(--border)]">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Best Score</p>
                                            <p className="text-2xl font-black text-emerald-500">{selectedCandidate.best_score ? selectedCandidate.best_score.toFixed(1) : 0}%</p>
                                        </div>
                                        <div className="col-span-2 p-4 rounded-2xl bg-[var(--nav-bg)] border border-[var(--border)] flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Resume</p>
                                                <button
                                                    onClick={() => secureDownload(`http://localhost:5000/api/admin/download-resume/${selectedCandidate.id}`, `resume_${selectedCandidate.name.replace(/\s+/g, '_')}.pdf`)}
                                                    className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                                                >
                                                    Download PDF <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                                        {/* INTERVIEW HISTORY TABLE */}
                                        <div className="col-span-1 lg:col-span-2">
                                            <h4 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Interview History</h4>
                                            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                                                <table className="w-full text-left border-collapse bg-[var(--nav-bg)]">
                                                    <thead className="bg-[var(--border)]/30">
                                                        <tr>
                                                            <th className="px-5 py-3 text-[10px] font-black uppercase text-[var(--text-muted)]">Date</th>
                                                            <th className="px-5 py-3 text-[10px] font-black uppercase text-[var(--text-muted)]">Score</th>
                                                            <th className="px-5 py-3 text-[10px] font-black uppercase text-[var(--text-muted)] text-center">Recording</th>
                                                            <th className="px-5 py-3 text-[10px] font-black uppercase text-[var(--text-muted)]">Report</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {candidateHistory.length > 0 ? candidateHistory.map((h, i) => (
                                                            <tr key={i} className="border-t border-[var(--border)]/50 hover:bg-[var(--card-bg)] transition-colors">
                                                                <td className="px-5 py-3 text-xs font-bold">{new Date(h.date).toLocaleDateString()}</td>
                                                                <td className="px-5 py-3 text-xs font-black text-indigo-600">{h.overall_score.toFixed(0)}%</td>
                                                                <td className="px-5 py-3 text-center">
                                                                    {h.video_path ? (
                                                                        <button 
                                                                            onClick={() => setVideoToPlay(`http://localhost:5000/api/video/stream/${h.id}`)}
                                                                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            title="Watch Recording"
                                                                        >
                                                                            <Video size={14} />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Purged</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <button onClick={() => secureDownload(`http://localhost:5000/api/admin/candidate/${selectedCandidate.id}/best_report`, `report_${selectedCandidate.name.replace(/\s+/g, '_')}.pdf`)} className="text-[10px] font-bold text-blue-500 hover:underline bg-transparent border-none p-0 cursor-pointer">Download</button>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={3} className="px-5 py-4 text-xs text-center text-[var(--text-muted)] font-medium">No interviews found.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* AI ANALYSIS SECTION */}
                                        <div className="col-span-1 lg:col-span-2 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                            <h4 className="flex items-center gap-2 text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4">
                                                <TrendingUp size={16} /> AI Performance Analysis
                                            </h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                        <span>Resume Match Score</span>
                                                        <span>{selectedCandidate.best_score ? Math.min(100, selectedCandidate.best_score + 10).toFixed(0) : 0}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedCandidate.best_score ? Math.min(100, selectedCandidate.best_score + 10) : 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-[var(--border)] bg-[var(--nav-bg)]/30 flex justify-end gap-3">
                                    <button onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete Candidate</button>
                                    <button onClick={() => setSelectedCandidate(null)} className="px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[var(--nav-bg)] transition-colors">Close</button>
                                    <button
                                        onClick={() => secureDownload(`http://localhost:5000/api/admin/candidate/${selectedCandidate.id}/best_report`, `report_${selectedCandidate.name.replace(/\s+/g, '_')}.pdf`)}
                                        className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center"
                                    >
                                        View Full Report
                                    </button>
                                    <button onClick={() => alert("Candidate Shortlisted!")} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all flex items-center gap-2">
                                        <CheckCircle size={16} /> Shortlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >

            {/* --- VIDEO PLAYER MODAL --- */}
            {videoToPlay && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setVideoToPlay(null)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Interview Recording</h3>
                            </div>
                            <button onClick={() => setVideoToPlay(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                                <LogOut size={20} className="rotate-45" />
                            </button>
                        </div>
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <video 
                                src={videoToPlay} 
                                controls 
                                autoPlay 
                                className="w-full h-full max-h-[70vh]"
                                onContextMenu={e => e.preventDefault()}
                            />
                        </div>
                        <div className="p-6 bg-slate-900 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-indigo-500" /> Secure Stream • Admin Only
                            </div>
                            <p>Recording is stored on a protected server until student download</p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
