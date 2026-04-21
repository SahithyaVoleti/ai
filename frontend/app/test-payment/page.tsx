"use client";

import React, { useState } from 'react';
import { getApiUrl } from '../../api-utils';
import { CreditCard, CheckCircle, AlertCircle, ArrowLeft, Zap, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

export default function TestPaymentPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleTestPayment = async () => {
        if (!user) {
            alert("Please login first to test payments.");
            router.push('/login');
            return;
        }

        setStatus('loading');
        setMessage('Initializing secure order...');

        const sdkLoaded = await loadRazorpay();
        if (!sdkLoaded) {
            setStatus('error');
            setMessage('Failed to load Razorpay SDK. Check your internet connection.');
            return;
        }

        try {
            // 1. Create a tiny test order (₹1)
            const orderRes = await fetch('http://localhost:5000/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    plan_name: "Test Payment",
                    amount: "1" // ₹1 for testing
                })
            });
            const orderData = await orderRes.json();

            if (orderData.status !== 'success') {
                throw new Error(orderData.message || "Backend failed to create order. Did you add your Keys to .env?");
            }

            // 2. Configure Razorpay Modal
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: "INR",
                name: "AI Interviewer (TEST)",
                description: "Verifying your API Key integration",
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    setStatus('loading');
                    setMessage('Verifying payment signature...');
                    
                    try {
                        const verifyRes = await fetch('http://localhost:5000/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                plan_id: 1, // Add 10 credits like Starter
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();

                        if (verifyData.status === 'success') {
                            setStatus('success');
                            setMessage('Payment Verified! 10 Credits added to your account.');
                        } else {
                            throw new Error(verifyData.message || "Signature verification failed.");
                        }
                    } catch (err: any) {
                        setStatus('error');
                        setMessage(err.message || "Verification failed.");
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: { color: "#4f46e5" },
                modal: {
                    ondismiss: function() {
                        setStatus('idle');
                        setMessage('');
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || "Something went wrong.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-[Inter]">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 p-10 text-center">
                <button 
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest mb-8 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Home
                </button>

                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Zap size={40} fill="currentColor" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-2">Payment <span className="text-indigo-600">Sandbox</span></h1>
                <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed">
                    Use this page to verify that your **Razorpay Key ID** and **Secret** are working correctly. 
                </p>

                {status === 'idle' && (
                    <button
                        onClick={handleTestPayment}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <CreditCard size={24} /> Pay ₹1 (Verify Keys)
                    </button>
                )}

                {status === 'loading' && (
                    <div className="py-6 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-6 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Integration Success!</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">{message}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                        >
                            View Credits in Dashboard
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-6 animate-in shake duration-500">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Keys Not Found?</h3>
                        <p className="text-red-500 text-xs font-bold mb-6 bg-red-50 p-3 rounded-lg border border-red-100">
                            {message}
                        </p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    <ShieldCheck size={14} /> 256-bit Encrypted SSL
                </div>
            </div>
        </div>
    );
}
