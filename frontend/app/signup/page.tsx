"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, User, ChevronRight, ShieldCheck, CheckCircle, Sun, Moon, Camera, RefreshCw, ArrowRight, Sparkles, FileText, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../theme-context';

// --- Assets ---

// Every page now has a unique premium 3D illustration
const mascotImage = "/robot_welcome_new.png";

// Small Avatar for Chat Bubbles
const RobotAvatar = () => (
    <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
        <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden p-1">
            <img src="/robot_avatar_new.png" alt="AI" className="w-[85%] h-[85%] object-contain" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white"></div>
    </div>
);

const UserAvatar = () => (
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border-2 border-white shadow-sm flex-shrink-0">
        <User size={20} />
    </div>
);

interface Message {
    id: number;
    sender: 'bot' | 'user';
    text: string | React.ReactNode;
    time: string;
}

// --- Components ---

const ChatBubble = ({ message }: { message: Message }) => {
    const isBot = message.sender === 'bot';

    return (
        <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-4 animate-fadeIn`}>
            {isBot && <RobotAvatar />}

            <div className={`max-w-[85%] md:max-w-[70%] mx-2 md:mx-3 flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                <div
                    className={`
            relative px-5 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed
            ${isBot
                            ? 'bg-[var(--card-bg)] text-[var(--foreground)] rounded-tl-none border border-[var(--border)]'
                            : 'bg-blue-600 text-white rounded-tr-none'}
          `}
                >
                    {message.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {isBot ? 'AI Assistant' : 'You'} • {message.time}
                </span>
            </div>

            {!isBot && <UserAvatar />}
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex w-full justify-start mb-4">
        <RobotAvatar />
        <div className="ml-3 bg-white border border-slate-100 px-4 py-4 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm h-[46px]">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    </div>
);

const OptionButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all group w-full md:w-auto text-left"
    >
        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-200 group-hover:text-blue-700 flex items-center justify-center transition-colors text-slate-500">
            <Icon size={20} />
        </div>
        <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{label}</span>
            <span className="text-xs text-slate-500 group-hover:text-blue-600">Select this role</span>
        </div>
        <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-500" size={18} />
    </button>
);

// --- Main App Component ---

export default function Signup() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [hasStarted, setHasStarted] = useState(false); // Controls Landing vs Chat view
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [chatStep, setChatStep] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    // Added 'phone', 'year' and 'college_name' to state
    const [userData, setUserData] = useState({ name: '', email: '', phone: '', year: '', branch: '', domain: '', college_name: '', role: 'Student', password: '', photo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Photo Capture States
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const globalSpeechTokenRef = useRef(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const getCurrentTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });

            // Follow up after short delay for any late-rendering content
            setTimeout(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }, 150);
        }
    };

    // --- TTS Logic (Masculine Identity) ---
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

            console.log("🔊 Atlas Speaking:", text.slice(0, 50));

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

    // Watch for new bot messages and speak them
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.sender === 'bot' && typeof lastMessage.text === 'string') {
            speak(lastMessage.text);
        }
    }, [messages]);

    useEffect(() => {
        if (hasStarted) {
            scrollToBottom();

            if (!isTyping && !isSubmitting && chatStep !== 9 && chatStep !== 8 && chatStep !== 4) {
                inputRef.current?.focus();
            }
        }
    }, [messages, isTyping, hasStarted, chatStep, isSubmitting]);

    useEffect(() => {
        let isStopped = false;

        const syncCamera = async () => {
            if (chatStep === 9 && !capturedImage && !streamRef.current) {
                try {
                    console.log("📸 Requesting camera access...");
                    let stream: MediaStream;
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                        });
                    } catch (err) {
                        console.warn("HD camera failed, retrying with basic constraints", err);
                        stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    }

                    if (isStopped) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }

                    streamRef.current = stream;
                    setCameraActive(true);

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play().catch(e => {
                            if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error("Video play failed:", e);
                        });
                    }
                } catch (e: any) {
                    const isPermissionError = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
                    if (isPermissionError) {
                        console.warn("Camera access failed: Permission Denied");
                    } else {
                        console.error("Camera access failed:", e);
                    }
                    setMessages(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        sender: 'bot',
                        text: isPermissionError
                            ? "🚫 Camera access was denied. Please click the lock icon in your browser address bar and choose 'Allow' for Camera, then refresh the page."
                            : "⚠️ I couldn't access your camera. Please ensure it's connected and not used by another app.",
                        time: getCurrentTime()
                    }]);
                }
            }
        };

        syncCamera();

        // If camera is active and video element just mounted/updated
        if (chatStep === 9 && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Camera mount play failed:", e);
            });
        }

        return () => {
            isStopped = true;
        };
    }, [chatStep, capturedImage, cameraActive]);

    // --- Start Chat Sequence ---
    const startChat = () => {
        setHasStarted(true);
        setIsTyping(true);

        // Simulate initial loading
        setTimeout(() => {
            setMessages([
                {
                    id: Date.now() + Math.random(),
                    sender: 'bot',
                    text: "👋 Hi there! I'm Atlas, your AI Interview Assistant.",
                    time: getCurrentTime()
                }
            ]);
            setIsTyping(false);

            // Second message
            setTimeout(() => {
                setIsTyping(true);
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: Date.now() + Math.random(),
                            sender: 'bot',
                            text: "I'll help you set up your profile for your mock interviews. Let's get started! First, what is your full name?",
                            time: getCurrentTime()
                        }
                    ]);
                    setIsTyping(false);
                    setChatStep(1); // Ready for Name
                }, 1500);
            }, 800);
        }, 1000);
    };

    // --- Chat Logic ---
    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        // Add User Message
        const displayedText = chatStep === 6 ? '•'.repeat(inputValue.length) : inputValue;
        const userMsg: Message = {
            id: Date.now() + Math.random(),
            sender: 'user',
            text: displayedText,
            time: getCurrentTime()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        processStep(chatStep, inputValue);
    };

    const handleOptionSelect = (val: string) => {
        const userMsg: Message = {
            id: Date.now() + Math.random(),
            sender: 'user',
            text: val,
            time: getCurrentTime()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
        processStep(chatStep, val);
    };

    const processStep = async (currentStep: number, value: string) => {
        let responseText = '';
        let nextStep = currentStep + 1;
        let delay = 1500;
        let valid = true;

        // Clone current state for immediate reading
        let currentData = { ...userData };

        switch (currentStep) {
            case 1: // Name Input
                if (value.length < 2) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Could you please enter your real full name?", time: getCurrentTime() }]);
                    return; // Loop: chatStep remains 1
                }
                currentData.name = value;
                setUserData(prev => ({ ...prev, name: value }));
                responseText = `Nice to meet you, ${value.split(' ')[0]}! 🌟 Now, what is your email address?`;
                break;

            case 2: // Email Input
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Hmm, that doesn't look like a valid email. Please try again (e.g. name@example.com).", time: getCurrentTime() }]);
                    return; // Loop: chatStep remains 2
                }
                currentData.email = value;
                setUserData(prev => ({ ...prev, email: value }));
                // NEW STEP: Phone Number
                responseText = "Got it! 📧 Now, please enter your mobile number (10 digits) for account verification.";
                break;

            case 3: // Phone Input (NEW)
                const phoneClean = value.replace(/\D/g, ''); // Remove non-digits

                // 1. Length Check
                if (phoneClean.length !== 10) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Please enter a valid 10-digit mobile number.", time: getCurrentTime() }]);
                    return;
                }

                // 2. Mobile Prefix Check (India: 6,7,8,9)
                if (!/^[6-9]/.test(phoneClean)) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Hmm, that doesn't look like a valid mobile number. It should start with 6, 7, 8, or 9.", time: getCurrentTime() }]);
                    return;
                }

                // 3. Repeated Digits Check (e.g. 9999999999)
                if (/^(\d)\1{9}$/.test(phoneClean)) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "That looks like a test number. Please enter your real mobile number for verification.", time: getCurrentTime() }]);
                    return;
                }

                currentData.phone = phoneClean;
                setUserData(prev => ({ ...prev, phone: phoneClean }));
                responseText = (
                    <div className="flex flex-col gap-3">
                        <span>Got it! 📱 Now, what is your educational domain?</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {['B.Tech', 'B.Pharmacy', 'Agriculture', 'Degree', 'MBA/PG', 'Others'].map(opt => (
                                <button 
                                    key={opt}
                                    onClick={() => handleOptionSelect(opt)}
                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-xs font-bold transition-all"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                );
                break;

            case 4: // Domain Input
                currentData.domain = value;
                setUserData(prev => ({ ...prev, domain: value }));
                responseText = `Excellent! 🎓 Within ${value}, what is your specialization or branch? (e.g. CSE, ECE, Pharmacology, Agronomy)`;
                break;

            case 5: // Branch Input
                currentData.branch = value;
                setUserData(prev => ({ ...prev, branch: value }));
                responseText = "For the stats, which year are you in? (e.g. 2nd Year, 3rd Year, 4th Year)";
                break;

            case 6: // Year Input
                let yearVal = value.trim();
                if (['2', '2nd', 'second', 'ii'].some(x => yearVal.toLowerCase().includes(x))) yearVal = "2nd Year";
                else if (['3', '3rd', 'third', 'iii'].some(x => yearVal.toLowerCase().includes(x))) yearVal = "3rd Year";
                else if (['4', '4th', 'fourth', 'iv'].some(x => yearVal.toLowerCase().includes(x))) yearVal = "4th Year";
                currentData.year = yearVal;
                setUserData(prev => ({ ...prev, year: yearVal }));
                responseText = "Great! Which college or university are you currently attending?";
                break;

            case 7: // University Input
                if (value.length < 3) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Please enter your university name.", time: getCurrentTime() }]);
                    return;
                }
                currentData.college_name = value;
                setUserData(prev => ({ ...prev, college_name: value }));
                responseText = "Thanks! Now, please create a secure password.";
                break;

            case 8: // Password Input
                if (value.length < 6) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Please use a stronger password (at least 6 characters). Try again.", time: getCurrentTime() }]);
                    return;
                }
                currentData.password = value;
                setUserData(prev => ({ ...prev, password: value }));
                responseText = "Password secure! 🔒 Now, strictly for proctoring verification, I need to capture a live photo of you. This will be used to verify your identity during the interview.";
                break;

            default:
                break;
        }

        if (currentStep !== 9) {
            // Normal flow (Skip for camera step, handled separately)
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: responseText, time: getCurrentTime() }]);
                setIsTyping(false);
                setChatStep(nextStep);
            }, delay);
        } else {
            // Special handling for camera step transition
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: responseText, time: getCurrentTime() }]);
                setIsTyping(false);
            }, delay);
        }
    };

    // --- Camera Functions ---
    const startCamera = async () => {
        if (streamRef.current) return;
        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
            } catch (err) {
                console.warn("HD camera failed, retrying with basic constraints", err);
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = stream;
            setCameraActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            console.error("Manual camera start failed:", e);
            alert("Camera access is mandatory for proctoring verification. Please allow access in your browser settings.");
        }
    };

    const capturePhoto = () => {
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx && video) {
            const size = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;
            ctx.drawImage(video, x, y, size, size, 0, 0, 400, 400);
        }
        const img = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(img);
        setUserData(prev => ({ ...prev, photo: img }));

        // Stop camera
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraActive(false);
    };

    const confirmPhoto = () => {
        // Proceed to Submit
        setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'user', text: "Photo captured.", time: getCurrentTime() }]);
        setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Photo verified. Creating your secure account... 🛠️", time: getCurrentTime() }]);
        setIsTyping(true);
        setChatStep(10); // Moving to processing step

        // Capture data at this moment to avoid closure stale state
        const submissionData = { ...userData, photo: capturedImage };

        setTimeout(async () => {
            try {
                const res = await fetch('http://localhost:5000/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionData)
                });
                const data = await res.json();

                if (data.status === 'success') {
                    setMessages(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        sender: 'bot',
                        text: "Success! Your account is ready. Redirecting you to login...",
                        time: getCurrentTime()
                    }]);
                    setIsTyping(false);
                    setChatStep(11); // Success state
                } else if (data.message && (data.message.toLowerCase().includes("exist") || data.message.toLowerCase().includes("already"))) {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        sender: 'bot',
                        text: (
                            <div className="flex flex-col gap-3">
                                <span className="font-semibold text-red-100">🚫 {data.message || "Account already exists."}</span>
                                <div className="flex flex-col gap-2 mt-1">
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="px-4 py-3 bg-white text-blue-700 font-bold rounded-xl border border-blue-100 hover:bg-blue-50 text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        Login to Existing Account
                                    </button>
                                    <button
                                        onClick={() => {
                                            setUserData(prev => ({ ...prev, email: '', phone: '' }));
                                            setChatStep(2); // Restart from email
                                            // Add a bot prompt to restart the flow visually
                                            setMessages(m => [...m, {
                                                id: Date.now(),
                                                sender: 'bot',
                                                text: "Okay, let's try different credentials. What is your email address?",
                                                time: getCurrentTime()
                                            }]);
                                        }}
                                        className="px-4 py-3 bg-blue-600/20 text-white font-bold rounded-xl border border-white/20 hover:bg-blue-600/30 text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        Change Email & Phone
                                    </button>
                                </div>
                            </div>
                        ),
                        time: getCurrentTime()
                    }]);
                } else {
                    setIsTyping(false);
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: `Registration failed: ${data.message || 'Unknown error'}. Please refresh and try again.`, time: getCurrentTime() }]);
                }
            } catch (err) {
                setIsTyping(false);
                setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text: "Network error. Please make sure the server is running.", time: getCurrentTime() }]);
            }
        }, 1500);
    };

    const getInputType = () => {
        if (chatStep === 2) return "email";
        if (chatStep === 3) return "tel";
        if (chatStep === 6) return showPassword ? "text" : "password";
        return "text";
    };

    const getPlaceholder = () => {
        if (chatStep === 1) return "Type your full name...";
        if (chatStep === 2) return "name@university.edu";
        if (chatStep === 3) return "e.g. 9876543210";
        if (chatStep === 4) return "e.g. 3rd Year";
        if (chatStep === 5) return "e.g. Vignan University";
        if (chatStep === 6) return "Create a password...";
        return "Type your answer...";
    };

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (!hasStarted) {
                    e.preventDefault();
                    startChat();
                } else if (chatStep === 7 && capturedImage) {
                    e.preventDefault();
                    confirmPhoto();
                } else if (chatStep === 9) {
                    e.preventDefault();
                    router.push('/login');
                }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [hasStarted, chatStep, capturedImage, router]);

    // --- Render ---

    // 1. Landing View — Choose signup method
    if (!hasStarted) {
        return (
            <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0A0D14]' : 'bg-[#F8FAFC]'} flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden font-sans`}>
                {/* Background orbs */}
                <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'} rounded-full blur-[120px] pointer-events-none`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-500/5'} rounded-full blur-[120px] pointer-events-none`} />

                {/* Header Navs */}
                <div className="absolute top-8 left-8 z-50">
                    <button onClick={() => router.push('/')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer`}>
                        <ChevronRight size={18} className="rotate-180" /> Back to Home
                    </button>
                </div>

                <div className="absolute top-8 right-8 z-50">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'} border transition-all shadow-sm`}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Main Content Grid */}
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 relative z-10 items-center">

                    {/* LEFT: Branding & Bot Illustration */}
                    <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
                        <div className="relative group">
                            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-500/10'} blur-[80px] rounded-full group-hover:scale-110 transition-all duration-700`} />
                            <div className={`relative z-10 w-48 h-48 lg:w-80 lg:h-80 rounded-[48px] overflow-hidden ${theme === 'dark' ? 'bg-[#1E293B]/20' : 'bg-white/40'} backdrop-blur-sm border border-white/10 shadow-2xl animate-float flex items-center justify-center p-6`}>
                                <img
                                    src="/robot_hero_final.png"
                                    alt="AI Interviewer"
                                    className="w-full h-full object-contain filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)] transition-opacity duration-700"
                                />
                            </div>
                        </div>
                        <div className="space-y-4 max-w-sm">
                            <span className={`inline-block px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} text-[10px] font-black uppercase tracking-[0.2em]`}>
                                Powered by Atlas Engine
                            </span>
                            <h2 className={`text-4xl lg:text-6xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'} leading-[1.1] tracking-tight`}>
                                Ready to <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Level Up?</span>
                            </h2>
                            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-sm lg:text-base leading-relaxed font-medium`}>
                                I'm Atlas, your AI recruiter. Let's get you set up so you can start practicing and land that dream job.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Signup Mode Selectors (Pods) */}
                    <div className="lg:col-span-7 flex flex-col sm:flex-row gap-6 lg:pl-4">

                        {/* THE AI PATH (Chatbot Signup) */}
                        <button
                            onClick={startChat}
                            className={`flex-1 group relative p-8 lg:p-10 rounded-[2.5rem] ${theme === 'dark' ? 'bg-indigo-600/5 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-600/10' : 'bg-white border-indigo-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_rgba(79,70,229,0.1)] hover:border-indigo-300'} border transition-all duration-300 text-left flex flex-col justify-between min-h-[380px]`}
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-500">
                                <Sparkles size={56} className="text-indigo-400" />
                            </div>

                            <div>
                                <div className={`w-16 h-16 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'} flex items-center justify-center mb-8 border group-hover:scale-110 transition-transform overflow-hidden`}>
                                    <img src="/waving_agent.png" alt="AI Agent Waving" className="w-full h-full object-contain" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>AI Guided</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[9px] font-black text-green-500 uppercase border border-green-500/20">Fastest</span>
                                    </div>
                                    <p className={`${theme === 'dark' ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'} text-sm leading-relaxed transition-colors font-medium`}>
                                        Chat with me to set up your profile. Friendly, fast, and no forms to fill.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-indigo-500 font-bold text-sm uppercase tracking-[0.1em] mt-8 group-hover:gap-5 transition-all">
                                Start Conversation <ArrowRight size={18} />
                            </div>
                        </button>

                        {/* THE MANUAL PATH (Form Signup) */}
                        <button
                            onClick={() => router.push('/signup-manual')}
                            className={`flex-1 group relative p-8 lg:p-10 rounded-[2.5rem] ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]' : 'bg-white border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.06)] hover:border-slate-300'} border transition-all duration-300 text-left flex flex-col justify-between min-h-[380px]`}
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 group-hover:-rotate-6 transition-all duration-500">
                                <FileText size={56} className="text-slate-400" />
                            </div>

                            <div>
                                <div className={`w-16 h-16 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center justify-center mb-8 border group-hover:scale-110 transition-transform overflow-hidden`}>
                                    <img src="/modern_ai_team.png" className="w-full h-full object-contain" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>Manual Mode</h3>
                                    <p className={`${theme === 'dark' ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'} text-sm leading-relaxed transition-colors font-medium`}>
                                        Traditional registration form. Best if you have all your details and resume ready to go.
                                    </p>
                                </div>
                            </div>

                            <div className={`flex items-center gap-3 ${theme === 'dark' ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-[#0F172A]'} font-bold text-sm uppercase tracking-[0.1em] mt-8 transition-all group-hover:gap-5`}>
                                Simple Form <ArrowRight size={18} />
                            </div>
                        </button>

                    </div>
                </div>

                {/* Footer Link */}
                <div className="absolute bottom-12 left-0 right-0 text-center z-10">
                    <p className={`${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} text-sm font-semibold uppercase tracking-widest`}>
                        Already have an account?{' '}
                        <Link href="/login" className="text-indigo-500 font-black hover:text-indigo-400 hover:underline transition-colors ml-1">
                            Sign in →
                        </Link>
                    </p>
                </div>

                <style>{`
                    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                    .animate-float { animation: float 6s ease-in-out infinite; }
                `}</style>
            </div>
        );
    }


    // 2. Chat View (Conversational Interface)

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden animate-fadeIn">

            {/* Sidebar */}
            <div className="hidden md:flex flex-col justify-between w-full md:w-1/3 lg:w-1/4 bg-slate-900 text-white p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20 -ml-20 -mb-20"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-8" onClick={() => router.push('/')}>
                        <div className="flex items-center gap-2 cursor-pointer">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">I</div>
                            <span className="text-xl font-bold tracking-tight">Interview.AI</span>
                            {/* Branding removed */}
                        </div>
                    </div>
                    <div className="mt-12">
                        <h1 className="text-3xl font-bold leading-tight mb-4">Setting up your profile.</h1>
                        <p className="text-slate-400 text-sm leading-relaxed mb-12">
                            We're customizing your mock interview experience based on your responses.
                        </p>

                        <div className="relative w-full aspect-square max-w-[200px] animate-float opacity-80 hover:opacity-100 transition-opacity">
                            <img src="/hero_robot_laptop.png" alt="Atlas" className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />
                            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl -z-10"></div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">
                        Progress
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${Math.min((chatStep / 7) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-[100dvh] relative bg-[var(--background)]">
                {/* Mobile Header */}
                <div className="md:hidden p-4 bg-[var(--nav-bg)] border-b border-[var(--border)] flex items-center justify-between z-20 shadow-sm">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setHasStarted(false)} className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors`}>
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <span className="font-bold text-[var(--foreground)]">Interview.AI</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-2 text-[var(--text-muted)]">
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="text-xs font-medium text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full">
                            Step {Math.min(chatStep, 6)} of 6
                        </div>
                    </div>
                </div>

                {/* Desktop Back Button */}
                <div className="hidden md:block absolute top-8 left-8 z-50">
                    <button onClick={() => setHasStarted(false)} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                        <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                </div>

                {/* Desktop Theme Toggle Overlay */}
                <div className="hidden md:block absolute top-6 right-8 z-50">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'} border transition-all shadow-sm backdrop-blur-md`}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Messages */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 md:p-8 pb-48 scroll-smooth"
                >
                    <div className="max-w-3xl mx-auto space-y-2">
                        {messages.map((msg) => (
                            <ChatBubble key={msg.id} message={msg} />
                        ))}

                        {isTyping && <TypingIndicator />}

                        {/* Step 9: Success */}
                        {!isTyping && chatStep === 9 && (
                            <div className="flex justify-center mt-8 animate-pulse">
                                <div className="bg-green-50 text-green-700 px-6 py-3 rounded-full flex items-center gap-2 text-sm font-medium border border-green-100">
                                    <ShieldCheck size={18} />
                                    Account created successfully!
                                </div>
                            </div>
                        )}


                        <div ref={messagesEndRef} className="h-4" />

                        {/* CAMERA UI OVERLAY */}
                        {chatStep === 7 && (
                            <div className="my-6 bg-[var(--card-bg)] border border-dashed border-blue-300 p-6 rounded-3xl animate-fadeIn flex flex-col items-center gap-4">
                                {!cameraActive && !capturedImage && (
                                    <button onClick={startCamera} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2">
                                        <Camera size={20} /> Enable Camera
                                    </button>
                                )}

                                {cameraActive && !capturedImage && (
                                    <div className="relative w-64 h-64 bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-4 border-slate-200 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                            <div className="w-10 h-10 bg-red-500 rounded-full"></div>
                                        </button>
                                    </div>
                                )}

                                {capturedImage && (
                                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl">
                                            <img src={capturedImage} className="w-full h-full object-cover transform scale-x-[-1]" />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => { setCapturedImage(null); setCameraActive(true); }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-2 font-bold text-sm">
                                                <RefreshCw size={16} /> Retake
                                            </button>
                                            <button onClick={confirmPhoto} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg flex items-center gap-2 font-bold transform hover:scale-105 transition-all">
                                                <CheckCircle size={18} /> Confirm Photo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Extra bottom spacer for guaranteed accessibility */}
                        <div className="h-20" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--nav-bg)]/95 backdrop-blur-sm p-4 md:p-6 border-t border-[var(--border)] z-20">
                    <div className="max-w-3xl mx-auto">
                        {chatStep === 7 ? (
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                            >
                                Go to Login <ChevronRight size={20} />
                            </button>
                        ) : (
                            <form
                                onSubmit={handleSendMessage}
                                className={`relative transition-all duration-300 ${isTyping ? 'opacity-50' : 'opacity-100'}`}
                            >
                                {chatStep === 4 ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {['2nd Year', '3rd Year', '4th Year'].map((y) => (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => handleOptionSelect(y)}
                                                className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-blue-500 hover:bg-blue-500/10 text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all shadow-sm active:scale-95"
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="relative flex items-center gap-2">
                                        <div className="relative flex-1 group">
                                            <input
                                                ref={inputRef}
                                                type={getInputType()}
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder={getPlaceholder()}
                                                disabled={isTyping || chatStep > 6}
                                                autoComplete={chatStep === 6 ? "new-password" : "off"}
                                                className={`w-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-muted)] text-lg px-6 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-[var(--background)] transition-all shadow-inner relative z-10 ${chatStep === 6 ? 'pr-14' : ''}`}
                                                autoFocus
                                            />
                                            {chatStep === 6 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none z-30 w-10 h-10 flex items-center justify-center"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim() || isTyping || chatStep > 6}
                                            className={`
                        p-3 rounded-xl transition-all duration-200
                        ${!inputValue.trim() ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:scale-105'}
                        `}
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
