"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle, Shield, Zap, Star, Crown, ArrowRight, Sparkles, Moon, Sun, ChevronLeft, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../auth-context';
import { useTheme } from '../theme-context';

const plans = [
    {
        id: 1,
        name: "Mock Starter",
        price: "150",
        description: "Perfect for a quick interview simulation based on your resume.",
        features: [
            "Mock interview based on resume",
            "1-page professional report",
            "Core skill assessment",
            "Instant feedback"
        ],
        icon: Star,
        color: "from-blue-400 to-cyan-400",
        popular: false
    },
    {
        id: 2,
        name: "ATS Pro",
        price: "250",
        description: "Get detailed insights and see how you rank against ATS systems.",
        features: [
            "Everything in Starter",
            "2-page detailed report",
            "ATS Score calculation",
            "Keyword optimization tips"
        ],
        icon: Zap,
        color: "from-purple-500 to-indigo-500",
        popular: true
    },
    {
        id: 3,
        name: "Proctor Elite",
        price: "450",
        description: "Experience a real-world high-stakes interview environment.",
        features: [
            "Everything in ATS Pro",
            "3-page comprehensive report",
            "Identity Evidence capture",
            "Proctoring violation logs"
        ],
        icon: Shield,
        color: "from-emerald-500 to-teal-500",
        popular: false
    },
    {
        id: 4,
        name: "Ultimate Bundle",
        price: "500",
        description: "The complete package for serious job seekers.",
        features: [
            "Everything in Proctor Elite",
            "Native Resume Analyzer",
            "Full 5+ page report",
            "Priority AI processing"
        ],
        icon: Crown,
        color: "from-amber-400 to-orange-500",
        popular: false
    }
];

export default function Pricing() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const handleSelectPlan = (planId: number) => {
        if (!user) {
            router.push('/login');
            return;
        }
        const plan = plans.find(p => p.id === planId);
        setSelectedPlan(plan);
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPlan || !user) return;
        
        setIsPaying(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const res = await fetch('http://localhost:5000/api/user/select-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, plan_id: selectedPlan.id })
            });
            const data = await res.json();

            if (data.status === 'success') {
                updateUser({ ...user, plan_id: selectedPlan.id, is_premium: 1 });
                setPaymentSuccess(true);
                // Wait to show success state
                setTimeout(() => {
                    setIsPaymentModalOpen(false);
                    setPaymentSuccess(false);
                    router.push('/dashboard');
                }, 2000);
            } else {
                alert("Failed to select plan: " + data.message);
                setIsPaying(false);
            }
        } catch (err) {
            alert("Connection error. Please try again.");
            setIsPaying(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0A0D14]' : 'bg-[#F8FAFC]'} p-6 md:p-12 relative overflow-hidden font-sans`}>
            {/* Background Decorations */}
            <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'} rounded-full blur-[120px] pointer-events-none`} />
            <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-500/5'} rounded-full blur-[120px] pointer-events-none`} />

            {/* Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-16 relative z-10">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">I</div>
                    <span className={`text-2xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Interview.AI</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'} border transition-all shadow-sm`}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                    </button>
                    {user && (
                        <button
                            onClick={() => router.push('/dashboard')}
                            className={`px-5 py-2.5 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/10 text-white hover:bg-indigo-500/20 border-indigo-500/30' : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5'} border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                        >
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            {user.name.split(' ')[0]}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto text-center relative z-10">
                <div className="space-y-4 mb-16 animate-fadeIn">
                    <span className={`inline-block px-4 py-1.5 rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'} text-[10px] font-black uppercase tracking-[0.25em] border border-indigo-500/20`}>
                        Premium Access
                    </span>
                    <h1 className={`text-4xl md:text-6xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>
                        Powerful Features, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Simple Pricing.</span>
                    </h1>
                    <p className={`max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-lg leading-relaxed`}>
                        Choose the plan that's right for your career stage. Get instant access to AI-powered interviews, scoring, and proctoring.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {plans.map((plan, idx) => (
                        <div
                            key={plan.id}
                            className={`
                                group relative flex flex-col p-8 rounded-[32px] transition-all duration-500 animate-fadeIn
                                ${theme === 'dark'
                                    ? 'bg-[#141B26]/40 border-white/5 hover:bg-[#141B26]/60 hover:border-indigo-500/30'
                                    : 'bg-white border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:border-indigo-200'}
                                border backdrop-blur-md
                                ${plan.popular ? 'scale-105 z-20 border-indigo-500/50' : 'scale-100 z-10'}
                            `}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 rounded-full shadow-xl shadow-indigo-600/30 flex items-center gap-2">
                                    <Sparkles size={14} className="text-white fill-white" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Most Popular</span>
                                </div>
                            )}

                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-8 shadow-lg shadow-${plan.color.split('-')[1]}/20 group-hover:scale-110 transition-transform duration-500`}>
                                <plan.icon className="text-white" size={28} />
                            </div>

                            <div className="mb-8 text-left">
                                <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>{plan.name}</h3>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium leading-relaxed mb-6`}>{plan.description}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>₹{plan.price}</span>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-bold`}>/session</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, fidx) => (
                                    <div key={fidx} className="flex items-start gap-3">
                                        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} text-left font-medium`}>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={loadingPlan !== null}
                                className={`
                                    w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2
                                    ${plan.popular
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 active:scale-[0.97]'
                                        : theme === 'dark'
                                            ? 'bg-white/5 text-white hover:bg-white/10 active:scale-[0.97]'
                                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.97]'
                                    }
                                `}
                            >
                                {loadingPlan === plan.id ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Select Package <ArrowRight size={16} /></>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center animate-fadeInUp">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'} transition-colors flex items-center gap-2 mx-auto`}
                    >
                        Skip for now, I'll explore first <ChevronLeft size={16} className="rotate-180" />
                    </button>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && selectedPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isPaying && setIsPaymentModalOpen(false)} />
                    <div className="bg-[var(--card-bg)] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Secure Checkout</h2>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest leading-none mt-1">Simulated Transaction</p>
                                </div>
                            </div>
                            {!isPaying && (
                                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <X size={20} className="text-slate-400" />
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
                                        <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Payment Successful!</h3>
                                        <p className="text-slate-500 font-medium mt-2">Welcome to the {selectedPlan.name} plan.</p>
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest animate-pulse">Redirecting to Dashboard...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary */}
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Selected Plan</p>
                                            <h4 className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedPlan.name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Amount Due</p>
                                            <h4 className="text-2xl font-black text-indigo-400 italic">₹{selectedPlan.price}</h4>
                                        </div>
                                    </div>

                                    {/* Card Details (Simulated) */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Card Information</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    defaultValue="4242 4242 4242 4242" 
                                                    disabled 
                                                    className="w-full bg-[#0F111A] border border-white/5 rounded-2xl px-12 py-4 text-sm font-mono text-slate-300 outline-none" 
                                                />
                                                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                                                    <div className="w-6 h-4 bg-orange-400 rounded-sm opacity-50" />
                                                    <div className="w-6 h-4 bg-red-400 rounded-sm opacity-50" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Expiry</label>
                                                <input type="text" defaultValue="12/28" disabled className="w-full bg-[#0F111A] border border-white/5 rounded-2xl px-4 py-4 text-sm font-mono text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">CVC</label>
                                                <div className="relative">
                                                    <input type="text" defaultValue="***" disabled className="w-full bg-[#0F111A] border border-white/5 rounded-2xl px-4 py-4 text-sm font-mono text-slate-300" />
                                                    <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-indigo-400">
                                        <ShieldCheck size={18} className="shrink-0" />
                                        <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                                            This is a simulated secure transaction for demonstration purposes. No real funds will be charged.
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <button 
                                        onClick={handleConfirmPayment}
                                        disabled={isPaying}
                                        className={`
                                            w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden
                                            ${isPaying ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/30 active:scale-[0.98]'}
                                        `}
                                    >
                                        {isPaying ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Processing Payment...</span>
                                            </div>
                                        ) : (
                                            <span>Complete Transaction</span>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
