"use client";

import React, { useState, useRef } from 'react';
import { getApiUrl } from '../../api-utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Sun, Moon, ChevronRight } from 'lucide-react';
import { useTheme } from '../theme-context';

export default function ResumeUpload() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const globalSpeechTokenRef = useRef(0);

    // Redirect if not logged in
    React.useEffect(() => {
        if (!user && !localStorage.getItem('user_session')) {
            router.push('/login');
        }
    }, [user, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const [warning, setWarning] = useState('');

    const speak = (text: string) => {
        if (typeof window === 'undefined') return;

        // 1. Generate new unique ID for this speech request
        const myId = ++globalSpeechTokenRef.current;

        // 2. Stop everything previously running
        if (audioRef.current) {
            try {
                const oldAudio = audioRef.current;
                audioRef.current = null;
                oldAudio.onended = null;
                oldAudio.onerror = null;
                oldAudio.pause();
                oldAudio.src = "";
            } catch (e) { }
        }
        try { window.speechSynthesis.cancel(); } catch (e) { }

        setIsSpeaking(true);

        const playFallback = async () => {
            if (myId !== globalSpeechTokenRef.current) return;

            console.log("🔊 Atlas (Resume Upload):", text.slice(0, 50));

            try {
                // Call the masculine-hardened backend proxy
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                });

                if (!response.ok) throw new Error("Backend TTS failed");

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);

                if (myId !== globalSpeechTokenRef.current) return;

                const audio = new Audio(audioUrl);
                audioRef.current = audio;

                audio.onended = () => {
                    setIsSpeaking(false);
                };

                audio.onerror = () => {
                    console.warn("⚠️ Audio playback error, using browser fallback.");
                    browserFallback();
                };

                await audio.play();
            } catch (err) {
                browserFallback();
            }
        };

        const browserFallback = () => {
            try {
                const utt = new SpeechSynthesisUtterance(text);
                const voices = window.speechSynthesis.getVoices();
                // Strictly prioritize Male voices for Atlas
                const maleVoice = voices.find(v =>
                    v.name.toLowerCase().includes('david') ||
                    v.name.toLowerCase().includes('james') ||
                    v.name.toLowerCase().includes('google us english') ||
                    (v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female'))
                );
                if (maleVoice) utt.voice = maleVoice;
                utt.rate = 0.9;
                utt.pitch = 0.85; // Lower pitch for masculine feel
                utt.onend = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utt);
            } catch (e) {
                setIsSpeaking(false);
            }
        };

        playFallback();
    };

    const handleSubmit = async (e?: React.FormEvent, bypass: boolean = false) => {
        if (e) e.preventDefault();
        if (!file || !user) return;

        setIsUploading(true);
        setError('');
        setSuccess('');
        setWarning('');

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('name', user.name);
        formData.append('user_id', String(user.id));

        try {
            const res = await fetch('http://localhost:5000/api/upload_resume', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                const msg = 'Resume verified successfully. Lets move to the next process.';
                setSuccess(msg);
                speak(msg);
                
                // Trigger automatic ATS analysis in the background
                fetch('http://localhost:5000/api/analyze-resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id })
                }).catch(err => console.error("ATS Analysis error:", err));

                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                const msg = data.message || 'Verification failed. Please upload your correct resume.';
                setError(msg);
                speak(msg);

                // Handle trial expired / out of credits
                if (data.code === 'OUT_OF_CREDITS') {
                    setWarning('Your free demo session has ended. Please subscribe to a plan to continue your preparation.');
                    setTimeout(() => {
                        window.location.href = '/pricing';
                    }, 3500);
                }
            }
        } catch (err) {
            setError('Network error. Backend might be offline.');
        } finally {
            setIsUploading(false);
        }
    };

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && file && !isUploading) {
                e.preventDefault();
                handleSubmit(e as any);
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [file, isUploading]);

    if (!user) return null; // Or a loading spinner

    return (
        <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden`}>
            {/* Header Navs */}
            <div className="absolute top-8 left-8 z-50">
                <button onClick={() => router.push('/')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                    <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Home
                </button>
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-50 border border-[var(--border)]"
            >
                {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            <div className="max-w-md w-full bg-[var(--card-bg)] rounded-2xl shadow-xl overflow-hidden animate-fadeIn border border-[var(--border)]">
                <div className="bg-blue-600 p-8 text-center text-white">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Upload size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Upload Resume</h1>
                    <p className="text-blue-100 mt-2 text-sm">
                        Please upload your resume to verify your identity.
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Verification Required:</strong><br />
                            The name on your resume <span className="underline decoration-blue-400 decoration-2 font-bold">{user.name}</span> must match your account name.
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-muted)]">Resume (PDF)</label>
                            <div className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative
                                ${file ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-[var(--border)] hover:border-blue-400 hover:bg-[var(--background)]'}
                            `}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center text-green-700">
                                        <FileText size={40} className="mb-2" />
                                        <span className="font-semibold">{file.name}</span>
                                        <span className="text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Upload size={40} className="mb-2" />
                                        <span className="font-medium text-slate-600">Click to Browse</span>
                                        <span className="text-xs mt-1">or drag and drop PDF here</span>
                                    </div>
                                )}
                            </div>
                        </div>


                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                <CheckCircle size={16} />
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className={`
                                w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                                ${!file || isUploading ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-0.5'}
                            `}
                        >
                            {isUploading ? (
                                <>
                                    <Loader size={20} className="animate-spin" /> Verifying...
                                </>
                            ) : (
                                <>Verify & Continue</>
                            )}
                        </button>
                        
                        <p className="mt-4 text-[10px] text-slate-400 text-center leading-relaxed">
                            By clicking continue, you agree to our <b>Terms & Conditions</b>. 
                            Your resume data is processed for analysis and then <b>permanently deleted</b> from our servers globally. 
                            All scores and career insights are <b>AI-generated predictions</b> and should be used as a supplementary tool.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

