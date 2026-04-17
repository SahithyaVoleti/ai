"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle, Shield, Zap, Star, Crown, ArrowRight, Sparkles, Moon, Sun, ChevronLeft, CreditCard, Lock, ShieldCheck, X, LogOut } from 'lucide-react';
import { useAuth } from '../auth-context';
import { useTheme } from '../theme-context';

const plans = [
    {
        id: 1,
        name: "Basic Mock",
        price: "150",
        description: "Entry-level simulation for students starting their prep journey.",
        features: [
            "AI-Resume Interview",
            "Core Skill Analysis",
            "1-Page Report",
            "Instant Feedback"
        ],
        icon: Star,
        color: "from-slate-400 to-slate-600",
        accent: "bg-slate-400",
        popular: false
    },
    {
        id: 2,
        name: "ATS Professional",
        price: "250",
        description: "Advanced insights for candidates applying to top-tier tech firms.",
        features: [
            "Everything in Basic",
            "ATS Score Optimizer",
            "3-Page Deep Report",
            "Keyword Targeter"
        ],
        icon: Zap,
        color: "from-blue-500 to-indigo-600",
        accent: "bg-blue-500",
        popular: true
    },
    {
        id: 3,
        name: "Proctor Elite",
        price: "450",
        description: "The gold standard for high-stakes institutional mock sessions.",
        features: [
            "Everything in Pro",
            "Proctoring Evidence",
            "Identity Verification",
            "Violation Timeline"
        ],
        icon: Shield,
        color: "from-indigo-600 to-purple-600",
        accent: "bg-indigo-600",
        popular: false
    },
    {
        id: 4,
        name: "Ultimate Vault",
        price: "500",
        description: "Unlimited power for serious career transitions and growth.",
        features: [
            "Everything in Elite",
            "Native Resume Builder",
            "8-Page Master Report",
            "Priority AI Pipeline"
        ],
        icon: Crown,
        color: "from-slate-800 to-slate-950",
        accent: "bg-slate-900",
        popular: false
    }
];

export default function Pricing() {
    const router = useRouter();
    const { user, updateUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSelectPlan = async (planId: number) => {
        if (!user) {
            router.push('/login');
            return;
        }
        
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        setLoadingPlan(planId);
        
        // Removed strict SDK check to allow offline/mock simulation to proceed
        loadRazorpay(); 

        try {
            // 1. Create Order on Backend
            const orderRes = await fetch('http://localhost:5000/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    plan_name: plan.name,
                    amount: plan.price
                })
            });
            const orderData = await orderRes.json();

            if (orderData.status !== 'success') {
                alert(orderData.message || "Failed to create order");
                setLoadingPlan(null);
                return;
            }

            // 1b. SIMULATED CHECKOUT BYPASS
            if (orderData.simulated) {
                console.log("🛠️ [SIMULATOR] Bypassing real Razorpay for mock transaction.");
                setSelectedPlan(plan);
                setIsPaymentModalOpen(true);
                setIsPaying(true);
                
                // Trigger simulated verification
                setTimeout(async () => {
                   try {
                       const verifyRes = await fetch('http://localhost:5000/api/payment/verify', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({
                               user_id: user.id,
                               plan_id: planId,
                               razorpay_order_id: orderData.order_id,
                               razorpay_payment_id: 'pay_simulated_success',
                               razorpay_signature: 'simulated_sig'
                           })
                       });
                       const verifyData = await verifyRes.json();
                       
                       if (verifyData.status === 'success') {
                           setPaymentSuccess(true); // TRIGGER SUCCESS UI
                           if (verifyData.user) {
                               updateUser(verifyData.user);
                           } else {
                               updateUser({ ...user, plan_id: planId });
                           }
                           
                           // Delay redirect to show success message
                           setTimeout(() => {
                               setIsPaymentModalOpen(false);
                               setPaymentSuccess(false);
                               const returnTopic = localStorage.getItem('return_topic');
                               if (returnTopic) {
                                   localStorage.removeItem('return_topic');
                                   router.push(`/instructions?topic=${encodeURIComponent(returnTopic)}`);
                               } else {
                                   router.push('/dashboard');
                               }
                           }, 3000);
                       } else {
                           alert("Simulation failed logic.");
                           setIsPaymentModalOpen(false);
                       }
                   } catch(e) { 
                       console.error(e);
                       setIsPaymentModalOpen(false);
                   } finally {
                       setIsPaying(false);
                   }
                }, 2000);
                return;
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: "INR",
                name: "AI Interviewer",
                description: `Purchase ${plan.name} Package`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    setIsPaymentModalOpen(true);
                    setIsPaying(true);
                    
                    // 3. Verify Payment on Backend
                    try {
                        const verifyRes = await fetch('http://localhost:5000/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                plan_id: planId,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();
                        
                        if (verifyData.status === 'success') {
                            setPaymentSuccess(true);
                            if (verifyData.user) {
                                updateUser(verifyData.user);
                            } else {
                                updateUser({ ...user, plan_id: planId });
                            }
                            setTimeout(() => {
                                setIsPaymentModalOpen(false);
                                setPaymentSuccess(false);
                                const returnTopic = localStorage.getItem('return_topic');
                                if (returnTopic) {
                                    localStorage.removeItem('return_topic');
                                    router.push(`/instructions?topic=${encodeURIComponent(returnTopic)}`);
                                } else {
                                    router.push('/resume-builder');
                                }
                            }, 3000);
                        } else {
                            alert("Payment verification failed!");
                            setIsPaymentModalOpen(false);
                        }
                    } catch (e) {
                        alert("Error verifying payment");
                        setIsPaymentModalOpen(false);
                    } finally {
                        setIsPaying(false);
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.phone
                },
                theme: { color: "#4f46e5" }
            };

            const rzp = (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error(err);
            alert("Payment initialization failed.");
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 bg-[var(--background)] p-6 md:p-12 relative overflow-hidden font-sans`}>
            {/* Background Decorations */}
            <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-600/5'} rounded-full blur-[120px] pointer-events-none`} />
            <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] ${theme === 'dark' ? 'bg-blue-800/10' : 'bg-blue-400/5'} rounded-full blur-[120px] pointer-events-none`} />

            {/* Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-16 relative z-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600'} transition-all hover:scale-110 active:scale-95 shadow-sm group`}
                        title="Go Back"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-900 shadow-lg shadow-slate-100">I</div>
                        <span className={`text-2xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Interview.AI</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'} border transition-all shadow-sm`}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                    </button>
                    {user && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className={`px-5 py-2.5 rounded-2xl ${theme === 'dark' ? 'bg-blue-500/10 text-white hover:bg-blue-500/20 border-blue-500/30' : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5'} border text-[13px] font-black tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-2`}
                            >
                                <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white animate-pulse"></div>
                                {user.name.split(' ')[0]}
                            </button>
                            <button
                                onClick={logout}
                                className={`p-2.5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10' : 'bg-white border-slate-200 text-red-500 hover:bg-red-50'} border transition-all shadow-sm active:scale-90`}
                                title="Sign Out"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto text-center relative z-10">
                <div className="space-y-4 mb-16 animate-fadeIn">
                    <h1 className={`text-4xl md:text-6xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>
                        Powerful Features, <span className="text-blue-600 transition-colors">Simple Pricing.</span>
                    </h1>
                    <p className={`max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium text-lg leading-relaxed`}>
                        Choose the plan that's right for your career stage. Get instant access to AI-powered interviews, scoring, and proctoring.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 px-2 lg:px-0">
                    {plans.map((plan, idx) => (
                        <div
                            key={plan.id}
                            className={`
                                group relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-700 animate-fadeIn
                                ${theme === 'dark'
                                    ? 'bg-[#0F172A]/40 border-white/5 hover:bg-[#0F172A]/80 hover:border-indigo-500/50'
                                    : 'bg-white border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)] hover:border-blue-200'}
                                border backdrop-blur-3xl overflow-hidden
                                ${plan.popular ? 'scale-[1.03] lg:scale-[1.05] z-30 border-blue-500 ring-2 ring-blue-500/10' : 'scale-100 z-10'}
                            `}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            {/* Decorative Background Glow */}
                            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-10 transition-opacity duration-1000 rounded-full blur-[60px]`} />

                            {plan.popular && (
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400"></div>
                            )}

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-all duration-500`}>
                                    <plan.icon className="text-white" size={28} />
                                </div>
                                {plan.popular && (
                                    <div className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-600/20">
                                        Best Choice
                                    </div>
                                )}
                            </div>

                            <div className="mb-8 text-left relative z-10">
                                <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tight`}>{plan.name}</h3>
                                <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-bold leading-relaxed mb-6 uppercase tracking-wider`}>{plan.description}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>₹{plan.price}</span>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-black uppercase tracking-widest`}>/ credit</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10 flex-1 relative z-10">
                                {plan.features.map((feature, fidx) => (
                                    <div key={fidx} className="flex items-start gap-3 group/feat">
                                        <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/feat:scale-110 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-50 text-blue-600'}`}>
                                            <Check size={10} strokeWidth={5} />
                                        </div>
                                        <span className={`text-[13px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} text-left font-bold tracking-tight leading-snug`}>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={loadingPlan !== null}
                                className={`
                                    w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 relative z-10
                                    ${plan.popular
                                        ? 'bg-blue-600 text-white shadow-[0_15px_30px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.97]'
                                        : theme === 'dark'
                                            ? 'bg-white/5 text-white hover:bg-white/10 active:scale-[0.97] border border-white/5'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.97] shadow-xl shadow-slate-900/10'
                                    }
                                `}
                            >
                                {loadingPlan === plan.id ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Secure Access <ArrowRight size={14} /></>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center animate-fadeInUp">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-blue-600'} transition-colors flex items-center gap-2 mx-auto`}
                    >
                        Skip for now, I'll explore first <ChevronLeft size={16} className="rotate-180" />
                    </button>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && selectedPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isPaying && setIsPaymentModalOpen(false)} />
                    <div className="bg-white border border-slate-100 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-slate-100">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Secure Checkout</h2>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">Simulated Transaction</p>
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
                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest animate-pulse">Redirecting to Dashboard...</p>
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
                                            <h4 className="text-2xl font-black text-blue-400 italic">₹{selectedPlan.price}</h4>
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
                                    <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-blue-400">
                                        <ShieldCheck size={18} className="shrink-0" />
                                        <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                                            This is a simulated secure transaction for demonstration purposes. No real funds will be charged.
                                        </p>
                                    </div>

                                    {/* Action - Disabled as Razorpay handles this */}
                                    <div className="w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] bg-blue-600/20 text-blue-400/50 flex items-center justify-center gap-3 border border-blue-500/10">
                                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                        <span>Awaiting Razorpay Confirmation...</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
