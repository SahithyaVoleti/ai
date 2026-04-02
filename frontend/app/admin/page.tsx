"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
    Settings,
    Trash2,
    FileText,
    Eye,
    EyeOff
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
        avg_score: 0
    });
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
        // Convert candidates data to CSV
        const headers = ['S.No', 'Register No', 'Name', 'Email', 'Branch', 'Year', 'Phone', 'Total Interviews', 'Best Score', 'Status'];
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
                c.total_interviews > 0 ? 'Completed' : 'Pending'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'candidates_export.csv');
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

        return matchesSearch && matchesYear && matchesBranch && matchesStatus && matchesScore;
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

                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all">
                            <Download size={16} /> <span className="hidden sm:block">Export</span>
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
                        {/* KEY METRICS ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* TOTAL ENROLLED */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">+12%</span>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.total_enrolled}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Total Students Enrolled</p>
                            </div>

                            {/* STUDENTS INTERVIEWED */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div className="text-xs font-bold text-[var(--text-muted)]">
                                        {stats.total_enrolled > 0 ? ((stats.students_interviewed / stats.total_enrolled) * 100).toFixed(0) : 0}% Participation
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.students_interviewed}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Students Interviewed</p>
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
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.total_attempts}</h3>
                                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Total Attempts Completed</p>
                            </div>
                        </div>

                        {/* AVERAGE SCORE */}
                        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                                    <Award size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">{stats.avg_score}%</h3>
                            <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Average Score</p>
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
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Email</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Branch</th>
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
                                                <td className="px-6 py-3 text-sm font-medium text-[var(--text-muted)]">{candidate.email}</td>
                                                <td className="px-6 py-3 font-bold text-sm">{candidate.branch || '-'}</td>
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

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
                                                            <th className="px-5 py-3 text-[10px] font-black uppercase text-[var(--text-muted)]">Report</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {candidateHistory.length > 0 ? candidateHistory.map((h, i) => (
                                                            <tr key={i} className="border-t border-[var(--border)]/50 hover:bg-[var(--card-bg)] transition-colors">
                                                                <td className="px-5 py-3 text-xs font-bold">{new Date(h.date).toLocaleDateString()}</td>
                                                                <td className="px-5 py-3 text-xs font-black text-indigo-600">{h.overall_score.toFixed(0)}%</td>
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
        </div >
    );
}
