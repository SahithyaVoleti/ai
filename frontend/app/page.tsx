"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, Suspense } from 'react';
import styles from './home.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './auth-context';
import { Sun, Moon, Shield, ShieldAlert, Camera, Mic, Monitor, User, CheckCircle, Check, AlertCircle, LogOut, Sparkles, FileText, BarChart, ArrowRight, ArrowLeft, Volume2, ChevronRight, Brain, LayoutDashboard, Play, Terminal, Video, Zap, Globe, Lock, Database } from 'lucide-react';
import { useTheme } from './theme-context';
import Editor from "@monaco-editor/react";

function HomeContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [stage, setStage] = useState<'landing' | 'upload' | 'systemCheck' | 'verification' | 'calibration' | 'instructions' | 'interview' | 'code' | 'report' | 'results'>('landing');
  const [reportData, setReportData] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [proctorStatus, setProctorStatus] = useState({ face: false, warning: '' });

  useEffect(() => {
    if (user && stage === 'landing') {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user, stage]);

  const searchParams = useSearchParams();
  useEffect(() => {
    const startParam = searchParams.get('start');
    const setupStages = ['upload', 'verification', 'calibration', 'instructions'];

    if (startParam === 'true' && user) {
      if (stage === 'landing') setStage('upload');
    } else if (!startParam) {
      // If user navigates back to base URL without 'start', return to landing from any setup stage
      if (setupStages.includes(stage)) {
        setStage('landing');
      }
    }
  }, [searchParams, user, stage]);



  const [checks, setChecks] = useState({
    fullscreen: false,
    camera: false,
    screenShare: false
  });
  const [checkLoading, setCheckLoading] = useState(false);

  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // const [isWav2Lip, setIsWav2Lip] = useState(false); // Removed Wav2Lip
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [phase, setPhase] = useState('warmup');
  const [phaseCount, setPhaseCount] = useState(0);

  // Helper: Fisher-Yates shuffle
  const shuffleArray = (arr: string[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const buildPhases = () => [
    'greeting',
    'warmup',
    'intro',
    'resume_overview',
    'resume_skills',
    'resume_projects',
    'technical_core',
    'technical_advanced',
    'code',
    'case_study',
    'scenario_behavioral',
    'leadership',
    'teamwork',
    'adaptability',
    'future_goals',
    'conclusion'
  ];

  const [PHASES, setPHASES] = useState<string[]>(buildPhases);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Auto-clear feedback
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(''), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioUnlockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const [codingProblems, setCodingProblems] = useState<any[]>([]);
  const [currentCodingIdx, setCurrentCodingIdx] = useState(0);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [codingLanguage, setCodingLanguage] = useState<'python' | 'java' | 'c' | 'javascript'>('python');
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [codingOutput, setCodingOutput] = useState('');
  const [isRunningCode, setIsRunningCode] = useState(false);

  const [lastCodingStats, setLastCodingStats] = useState({ passed: 0, total: 0 });

  // INACTIVITY & SILENCE HANDLING
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRepeatedRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  const getPhaseThreshold = (pIndex: number) => {
    const p = PHASES[pIndex];
    if (p === 'greeting') return 1;
    if (p === 'warmup') return 2;
    if (p === 'intro') return 1;
    if (p === 'resume_overview') return 1;
    if (p === 'resume_skills') return 1;
    if (p === 'resume_projects') return 1;
    if (p === 'technical_core') return 1;
    if (p === 'technical_advanced') return 1;
    if (p === 'scenario_behavioral') return 1;
    if (p === 'leadership') return 1;
    if (p === 'adaptability') return 1;
    if (p === 'future_goals') return 1;
    if (p === 'case_study') return 1;
    if (p === 'code') return 1;
    if (p === 'conclusion') return 1;
    return 1;
  };


  const tabSwitchCountRef = useRef(0);
  const lookingDownRef = useRef(0);
  const hasStartedRef = useRef(false);
  const isManualStopRef = useRef(false);

  const showNoFaceWarnRef = useRef(false);
  const [showFullscreenWarn, setShowFullscreenWarn] = useState(false);
  const showFullscreenWarnRef = useRef(false);
  const [showTabSwitchWarn, setShowTabSwitchWarn] = useState(false);
  const showTabSwitchWarnRef = useRef(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showNoFaceWarn, setShowNoFaceWarn] = useState(false);
  const fullscreenWarnCountRef = useRef(0);
  const noFaceRef = useRef(0);

  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected'>('connected');
  const recognitionActiveRef = useRef(false);
  const isResettingRef = useRef(false); // New flag to prevent redundant restarts
  const globalSpeechTokenRef = useRef(0); // For speech singleton
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const lastResultTimeRef = useRef(Date.now());

  // WHISPER / AUDIO RECORDING REFS
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const interviewStartTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Refs for State in Callbacks
  const questionRef = useRef('');
  const isSpeakingRef = useRef(false);
  const hasDownloadedRef = useRef(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [activeInstructionStep, setActiveInstructionStep] = useState(0);

  // NEW: Consolidated hooks from bottom to top to fix React Hook rules
  const [verifyStatus, setVerifyStatus] = useState('');
  const [verifyImage, setVerifyImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyFailCount, setVerifyFailCount] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(16).fill(0));

  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const recognitionInstanceRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const isTerminatingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const agentVideoRef = useRef<HTMLVideoElement>(null);
  // const wav2lipVideoRef = useRef<HTMLVideoElement>(null); // Removed Wav2Lip
  // const [wav2lipVideoUrl, setWav2lipVideoUrl] = useState<string | null>(null); // Removed Wav2Lip
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const verificationVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Web Audio API lip-sync — direct DOM refs to avoid 60fps React re-renders
  const lipSyncBarsRef = useRef<HTMLDivElement[]>([]);
  const lipSyncRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (stage === 'landing') {
      const interval = setInterval(() => {
        setActiveInstructionStep((prev) => (prev + 1) % 4);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const faqs = [
    {
      q: "How does the AI generate interview questions?",
      a: "Our AI analyzes your uploaded resume using advanced LLMs to extract your specific skills, projects, and experiences. It then generates tailored questions that challenge your expertise and adapt to your previous answers."
    },
    {
      q: "Is the proctoring engine active during the entire session?",
      a: "Yes, the proctoring system monitors your video feed, tab switches, and full-screen status throughout the entire interview to ensure a fair and secure environment."
    },
    {
      q: "What happens if I exit fullscreen mode more than 3 times?",
      a: "The system allows for up to 3 warnings. Exceeding this limit will result in an automatic termination of the interview session to maintain strict evaluation standards."
    },
    {
      q: "Can I download my performance report immediately?",
      a: "Absolutely. Once the interview is complete, a comprehensive PDF report including your scores, visual evidence of violations, and detailed feedback is generated and made available on your dashboard."
    },
    {
      q: "What coding languages are supported in the coding round?",
      a: "Currently, we support Python, Java, C, and JavaScript. You can select your preferred language at the start of the coding evaluation stage."
    },
    {
      q: "Is my resume data used to train the AI model?",
      a: "No, your privacy is our priority. Your resume and interview data are used solely for your personal evaluation and reporting. We do not use candidate data for model training purposes."
    },
    {
      q: "Do I need to pay for every interview session?",
      a: "We offer a tier-based system. Basic users can access limited practice sessions, while our Premium tiers provide unlimited interviews, advanced proctoring, and deep technical analytics."
    },
    {
      q: "My camera isn't working, can I still take the interview?",
      a: "Since our platform relies on visual proctoring for security, a working camera is required for the system verification stage before the interview begins."
    }
  ];

  useEffect(() => {
    questionRef.current = question;
    hasDownloadedRef.current = false; // Reset when interview state changes (e.g. restart flow)
  }, [question, stage === 'landing']);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === 'interview') {
      if (!interviewStartTimeRef.current) interviewStartTimeRef.current = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - (interviewStartTimeRef.current || Date.now())) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (stage !== 'interview' || isSpeakingRef.current) return;

    // User requested: 2m -> repeat -> 2m -> move to next
    inactivityTimerRef.current = setTimeout(() => {
      latestFnRef.current?.handleInactivity?.();
    }, 120000);
    lastActivityRef.current = Date.now();
  };

  const latestFnRef = useRef<any>({});

  useEffect(() => {
    latestFnRef.current = {
      resetInactivityTimer,
      resetSilenceTimer,
      handleInactivity,
      handleSubmitAnswer,
      handlePhaseProgress,
      transcript,
      interimTranscript,
      isSpeakingRef,
      stage
    };
  });

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (stage !== 'interview' || isSpeakingRef.current) return;

    // Start 15s timer for auto-submit
    silenceTimerRef.current = setTimeout(() => {
      const { transcript, interimTranscript, isSpeakingRef, handleSubmitAnswer, stage: latestStage } = latestFnRef.current;
      const currentAns = (transcript.trim() + " " + interimTranscript.trim()).trim();
      // Lowered threshold to 3 characters for quiet/short affirmative answers
      if (currentAns.length >= 3 && !isSpeakingRef.current && latestStage === 'interview') {
        console.log("⏱️ Auto-submitting after silence...");
        handleSubmitAnswer();
      }
    }, 15000); // 15s is more natural than 30s
  };

  const handleInactivity = async () => {
    if (stage !== 'interview' || isSpeakingRef.current) return;

    if (!hasRepeatedRef.current) {
      console.log("🕒 Inactivity (1m): Repeating question");
      hasRepeatedRef.current = true;
      setTranscript('');
      setInterimTranscript('');
      speak("I noticed it's been a minute without a response. Let me repeat the question for you: " + (questionRef.current || "Could you please answer the previous question?"), () => {
        resetInactivityTimer();
      });
    } else {
      console.log("🕒 Extended inactivity (1m after repeat): Skipping question");
      hasRepeatedRef.current = false;

      try {
        setTranscript('');
        setInterimTranscript('');
        await fetch("http://localhost:5000/api/interview/answer", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionRef.current,
            answer: "No response (1 minute timeout after repeat)",
            inactivity: true
          })
        });
      } catch (e) { console.error("Silence submission error", e); }

      speak("Since I haven't received a response in the last minute, I will move on to the next part of our interview to ensure we stay on schedule.", () => {
        handlePhaseProgress();
      });
    }
  };

  useEffect(() => {
    if (stage === 'interview' && !isSpeaking) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    }
  }, [stage, isSpeaking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // AUTO SCROLL TRANSCRIPT
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    console.log("📝 Current Transcript State:", { transcript, interimTranscript });
  }, [transcript, interimTranscript]);

  // ANIMATE AUDIO LEVEL & WAVEFORM
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      setFrequencyData(new Array(16).fill(0));
      return;
    }

    let animationFrame: number;
    const updateLevel = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        const currentLevel = average * 4.0;
        setAudioLevel(currentLevel);

        // AGENT SYNC: Pause movement when user speaks (Energy > 14)
        if (agentVideoRef.current && !isSpeakingRef.current) {
          if (currentLevel > 14) {
            if (!agentVideoRef.current.paused) agentVideoRef.current.pause();
          } else {
            if (agentVideoRef.current.paused) agentVideoRef.current.play().catch(() => { });
          }
        }

        const bars = 16;
        const step = Math.floor(dataArray.length / 2 / bars);
        const sampled = [];
        for (let i = 0; i < bars; i++) {
          sampled.push(dataArray[i * step]);
        }
        setFrequencyData(sampled);
        animationFrame = requestAnimationFrame(updateLevel);
      }
    };
    updateLevel();
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isListening]);

  const safeStartRecognition = () => {
    if (!recognitionRef.current || recognitionActiveRef.current || isStartingRef.current || isResettingRef.current) return;
    if (showFullscreenWarnRef.current || showTabSwitchWarnRef.current || (stage !== 'landing' && !document.fullscreenElement)) return;
    if (isSpeakingRef.current || isManualStopRef.current || !['interview', 'code'].includes(stage)) return;

    try {
      isStartingRef.current = true;
      isResettingRef.current = true;
      recognitionActiveRef.current = false;
      isManualStopRef.current = false;

      try { recognitionRef.current.abort(); } catch (e) { }

      setTimeout(() => {
        try {
          isResettingRef.current = false;
          recognitionRef.current?.start();
        } catch (e: any) {
          if (e.name === 'InvalidStateError') recognitionActiveRef.current = true;
          isStartingRef.current = false;
        }
      }, 500);

      const activeStream = streamRef.current || currentStream || (window as any).__cameraStream;
      if (activeStream && activeStream.getAudioTracks().length > 0) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.stop();
          } catch (e) { }
        }

        try {
          let mimeType = '';
          const candidateTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
          for (const type of candidateTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              mimeType = type;
              break;
            }
          }

          const recorder = new MediaRecorder(activeStream, mimeType ? { mimeType } : {});
          audioChunksRef.current = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
          
          // CRITICAL: Defensive start logic
          if (recorder.state === 'inactive') {
            try {
              // Try chunked first (better for recovery)
              recorder.start(1000);
            } catch (err) {
              console.warn("⚠️ MediaRecorder chunked start failed, trying basic start...");
              if (recorder.state === 'inactive') {
                 try { recorder.start(); } catch (err2) { console.error("❌ MediaRecorder failed to start:", err2); }
              }
            }
            mediaRecorderRef.current = recorder;
          }
        } catch (recorderErr) {
          console.error("❌ MediaRecorder failed:", recorderErr);
        }
      }
    } catch (e: any) {
      console.error("General Mic failure:", e);
    } finally {
      setTimeout(() => { isStartingRef.current = false; }, 800);
    }
  };

  const streamRef = useRef<MediaStream | null>(null);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Keep camera active from the moment they start the flow (upload stage) until the end
    const isCameraNeeded = ['upload', 'verification', 'calibration', 'instructions', 'interview', 'code'].includes(stage);

    const init = async () => {
      if (isCameraNeeded) {
        // Check if stream is active and tracks are live
        const isStreamActive = streamRef.current &&
          streamRef.current.getTracks().length > 0 &&
          streamRef.current.getVideoTracks()[0]?.readyState === 'live';

        if (isStreamActive) {
          console.log("♻️ Reusing existing camera stream");
          const stream = streamRef.current!;
          setCurrentStream(stream);
          const syncEl = (el: HTMLVideoElement | null) => {
            if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => { }); }
          };
          syncEl(videoRef.current);
          syncEl(verificationVideoRef.current);
          return;
        }

        try {
          console.log(`🎥 Initializing camera for stage: ${stage}`);

          if (!navigator?.mediaDevices) {
            setFeedback("⚠️ Camera API not supported or insecure connection (use HTTPS or localhost).");
            return;
          }

          // Try HD first, fallback to basic if device rejects constraints
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true,
                // Enhanced Chrome-specific constraints for maximum sensitivity
                googAutoGainControl: true,
                googNoiseSuppression: false,
                googHighpassFilter: false,
                googEchoCancellation: true,
                googAutoGainControl2: true,
                channelCount: 1,
                sampleRate: 48000
              } as any
            });
          } catch {
            console.warn("⚠️ HD camera failed — retrying with basic constraints");
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          }

          streamRef.current = stream;
          setCurrentStream(stream);
          // Global backup — survives React re-renders and stage transitions
          (window as any).__cameraStream = stream;

          const attachStream = (el: HTMLVideoElement | null) => {
            if (!el) return;
            el.srcObject = stream;
            el.play().catch(e => { if (e.name !== 'AbortError') console.warn("Video play:", e.name); });
          };
          attachStream(videoRef.current);
          attachStream(verificationVideoRef.current);
          // Re-sync after render settles
          setTimeout(() => { attachStream(videoRef.current); attachStream(verificationVideoRef.current); }, 700);

          // Audio Visualizer
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 1024;
            source.connect(analyser);
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
          } catch { /* non-critical */ }

          setFeedback('');
          console.log("✅ Camera stream active");

        } catch (e: any) {
          console.warn("📸 Media Error:", e.name, e.message);
          if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            setFeedback("⚠️ Camera blocked! Click the 🔒 lock icon in your browser address bar → Allow Camera & Microphone → then refresh.");
          } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
            setFeedback("⚠️ Camera in use by another app (Zoom, Teams). Close them and refresh.");
          } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            setFeedback("⚠️ No camera found. Please connect a webcam and refresh.");
          } else {
            setFeedback(`⚠️ Camera error (${e.name}). Please refresh the page.`);
          }
        }
      } else {
        if (streamRef.current) {
          console.log("🛑 Stopping camera stream (not needed for this stage)");
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setCurrentStream(null);
          (window as any).__cameraStream = null;
          if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
        }
      }
    };


    init();

    // CAMERA WATCHDOG: Ensures tracks stay live
    const cameraWatchdog = setInterval(() => {
      if (isCameraNeeded) {
        const s = streamRef.current || currentStream || (window as any).__cameraStream;
        if (!s || s.getTracks().some((t: MediaStreamTrack) => t.readyState === 'ended')) {
          console.warn("📸 Camera watchdog detected inactive stream. Restarting...");
          init();
        }
      }
    }, 8000);

    return () => clearInterval(cameraWatchdog);
  }, [stage]);

  // ROBUST CAMERA SYNC: Ensures the video element is always playing the latest stream
  useEffect(() => {
    const video = videoRef.current;
    const vVideo = verificationVideoRef.current;

    if (currentStream) {
      if (video && video.srcObject !== currentStream) {
        console.log("🔗 Syncing main video element with stream");
        video.srcObject = currentStream;
        video.play().catch(() => {});
      }
      if (vVideo && vVideo.srcObject !== currentStream) {
        console.log("🔗 Syncing verification video element with stream");
        vVideo.srcObject = currentStream;
        vVideo.play().catch(() => {});
      }
    }
  }, [currentStream, stage]);

  const restartCamera = async () => {
    console.log("🔄 Force-restarting camera hardware...");
    setFeedback("Restarting camera...");

    // 1. Stop all tracks of existing stream
    const existing = streamRef.current || currentStream || (window as any).__cameraStream;
    if (existing) {
      existing.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    // 2. Clear refs and state
    streamRef.current = null;
    setCurrentStream(null);
    (window as any).__cameraStream = null;

    // 3. Re-acquire fresh stream
    try {
      if (!navigator?.mediaDevices) {
        setFeedback("⚠️ Camera API not supported or insecure connection (use HTTPS or localhost).");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: {
          echoCancellation: false, // Less gating for soft voices
          noiseSuppression: false, // Don't cut out soft words as 'noise'
          autoGainControl: true,
          googAutoGainControl: true,
          googNoiseSuppression: false,
          googHighpassFilter: false, // Capture full range
          channelCount: 1
        } as any
      });

      streamRef.current = stream;
      setCurrentStream(stream);
      (window as any).__cameraStream = stream;

      // Auto-attach to visible refs
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (verificationVideoRef.current) verificationVideoRef.current.srcObject = stream;

      setFeedback("Camera restarted. Is the video visible now?");
      console.log("✅ Camera restarted successfully");
    } catch (e: any) {
      console.error("Restart failed:", e);
      setFeedback(`Failed to restart camera: ${e.message}`);
    }
  };




  // RESET VOICE STATE ON NEW QUESTION
  useEffect(() => {
    isManualStopRef.current = false;
    isStartingRef.current = false;
    lastResultTimeRef.current = Date.now();
    setTranscript('');
    setInterimTranscript('');
  }, [question]);

  // INITIALIZE SPEECH RECOGNITION
  useEffect(() => {
    let recognition: any = null;
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Language optimization: Prefer Indian English if in India, otherwise US English
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
        const isIndia = tz.includes("calcutta") || tz.includes("kolkata") || tz.includes("india") || tz.includes("asia/kol");
        recognition.lang = isIndia ? 'en-IN' : 'en-US';
        console.log(`🎤 Recognition language set to: ${recognition.lang}`);

        // Heartbeat to detect if the engine is truly alive
        recognition.onsoundstart = () => {
          console.log("🔊 Engine detected actual sound...");
          lastResultTimeRef.current = Date.now();
        };

        recognition.onresult = (event: any) => {
          // 0. Update activity heartbeat
          lastResultTimeRef.current = Date.now();

          // 1. Extract RESULTS: Cumulative for interim to ensure zero misses
          let currentFinalChunks = [];
          let currentInterim = '';

          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              if (i >= event.resultIndex) {
                currentFinalChunks.push(result[0].transcript);
              }
            } else {
              currentInterim += result[0].transcript;
            }
          }

          const cleanFinalAdd = currentFinalChunks.join(' ').trim();
          
          // 2. State synchronization (Update interim first for speed)
          setInterimTranscript(currentInterim);

          // 3. Process committed (final) phrase
          if (cleanFinalAdd) {
            console.log("🎤 Final committed phrase:", cleanFinalAdd);

            const lowerText = cleanFinalAdd.toLowerCase();
            const repeatTriggers = ["repeat", "say again", "not clear", "didn't understand", "did not understand", "didn't get you", "did not get you", "clueless"];
            const isRepeatCommand = lowerText.length < 50 && repeatTriggers.some(t => lowerText.includes(t));

            if (isRepeatCommand) {
              setTimeout(() => {
                setTranscript('');
                setInterimTranscript('');
                try { recognitionInstanceRef.current?.stop(); } catch (e) { }
                speak("No problem, I will repeat the question for you. " + (questionRef.current || ""));
              }, 400);
            }

            // Commit to main state
            setTranscript(prev => {
              const prevTrim = prev.trim();
              return prevTrim ? `${prevTrim} ${cleanFinalAdd}` : cleanFinalAdd;
            });
          }

          // 4. Activity heartbeat
          if (cleanFinalAdd || currentInterim) {
            latestFnRef.current.resetInactivityTimer?.();
            latestFnRef.current.resetSilenceTimer?.();
          }
        };

        recognition.onstart = () => {
          setIsListening(true);
          recognitionActiveRef.current = true;
          isStartingRef.current = false; // Ensure starting flag is cleared on success
          console.log("🎤 Mic is ACTIVE / Listening");
        };

        recognition.onerror = (event: any) => {
          const ignoredErrors = ['no-speech', 'aborted', 'audio-capture', 'network'];
          isStartingRef.current = false; // Ensure starting flag is cleared on error
          if (ignoredErrors.includes(event.error)) return;
          console.error("Recognition error:", event.error);
          setIsListening(false);
          recognitionActiveRef.current = false;
        };

        recognition.onend = () => {
          setIsListening(false);
          recognitionActiveRef.current = false;
          console.log("🎤 Mic session closed.");

          // Only auto-restart if we are NOT in the middle of a intentional reset
          if (!isResettingRef.current && recognition === recognitionInstanceRef.current && stage === 'interview' && !isSpeakingRef.current && !isManualStopRef.current && hasStartedRef.current) {
            console.log("🔄 Auto-repairing mic session...");
            setTimeout(() => {
              if (recognition === recognitionInstanceRef.current && !isResettingRef.current) safeStartRecognition();
            }, 300);
          }
        };

        recognitionRef.current = recognition;
        recognitionInstanceRef.current = recognition;
      }
    }

    const watchdog = setInterval(() => {
      const now = Date.now();
      const isStillInInterview = ['interview', 'code'].includes(stage);
      const shouldMicBeOff = isSpeakingRef.current || isTranscribing || fetchingQuestion || isManualStopRef.current;

      if (hasStartedRef.current && isStillInInterview && !shouldMicBeOff) {
        // Restart if engine stayed silent despite user speaking, or if session just timed out
        const silenceDuration = now - lastResultTimeRef.current;
        const isStalled = recognitionActiveRef.current && silenceDuration > 10000;
        const isMissedSound = (audioLevel > 10) && silenceDuration > 4000 && recognitionActiveRef.current;

        if (isStalled || isMissedSound) {
          console.log(isMissedSound ? "🔥 Mic missed sounds (Low Level). Force Restarting..." : "🔄 Voice engine stalled. Restarting...");
          try {
            recognitionActiveRef.current = false;
            isStartingRef.current = false;
            recognition?.abort();
          } catch (e) { }
          lastResultTimeRef.current = now;
        }

        if (!recognitionActiveRef.current && !isStartingRef.current) {
          console.log("🛠️ Watchdog: Resuming mic listeners...");
          safeStartRecognition();
        }
      }
    }, 2000);

    return () => {
      clearInterval(watchdog);
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.onresult = null;
          recognition.stop();
          recognition.abort();
        } catch (e) { }
        recognitionActiveRef.current = false;
      }
    };
  }, [stage, question]); // RE-INITIALIZE ON EVERY QUESTION FOR MAXIMUM RELIABILITY

  const handleSubmitAnswer = async () => {
    if (showFullscreenWarnRef.current || showTabSwitchWarnRef.current) return;
    if (fetchingQuestion || isTranscribing) return; // Busy lock
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    }
    recognitionActiveRef.current = false;
    setIsListening(false);

    // STOP WHISPER RECORDING & TRANSCRIBE
    let finalUserAns = (transcript.trim() + " " + interimTranscript.trim()).trim();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsTranscribing(true);
      const recorder = mediaRecorderRef.current;

      const whisperTranscript = await new Promise<string>((resolve) => {
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'answer.webm');

          try {
            console.log("⏳ Sending audio to Whisper for high-accuracy processing...");
            const transRes = await fetch("http://localhost:5000/api/transcribe", {
              method: "POST",
              body: formData
            });
            const transData = await transRes.json();
            if (transData.status === 'success' && transData.transcript) {
              console.log("✨ Whisper Result:", transData.transcript);
              resolve(transData.transcript);
            } else {
              resolve(finalUserAns); // Fallback to browser recognition
            }
          } catch (e) {
            console.error("Whisper Error:", e);
            resolve(finalUserAns);
          }
        };
        recorder.stop();
      });

      finalUserAns = whisperTranscript;
      setIsTranscribing(false);
    }

    if (!finalUserAns || finalUserAns.trim().length === 0) {
      console.log("⚠️ No answer detected. Sending '-1' as requested.");
      finalUserAns = "-1";
    }

    // Determine NEXT category immediately to pre-fetch without lag
    let nextCount = phaseCount + 1;
    let nextIdx = phaseIndex;
    const currentThreshold = getPhaseThreshold(phaseIndex);
    if (nextCount >= currentThreshold) {
      nextIdx = phaseIndex + 1;
      nextCount = 0;
    }
    const nextCat = nextIdx < PHASES.length ? PHASES[nextIdx] : null;

    setFetchingQuestion(true);
    setTranscript('');
    setInterimTranscript('');
    setFeedback("");

    const isIcebreaker = ['warmup', 'general', 'intro'].includes(phase);

    try {
      const res = await fetch("http://localhost:5000/api/interview/answer", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          answer: finalUserAns,
          next_category: (nextCat && nextCat !== 'code') ? nextCat : null // Pre-fetch next technical question
        })
      });
      const data = await res.json();

      // If we got the next question in the same response, use it immediately!
      if (data.next_question) {
        setFetchingQuestion(false);
        setQuestion(data.next_question);
        questionRef.current = data.next_question;

        // Trust the backend entirely for flow progression
        if (data.next_category) {
          setPhase(data.next_category);
        }
        hasRepeatedRef.current = false;

        if (data.next_category === 'coding' || data.next_category === 'code') {
          startCodingRound();
        } else if (data.next_category === 'conclusion') {
          speak(data.next_question, () => {
            handleEndInterview();
          });
        } else {
          // Explicitly silent on feedback during interview as requested
          speak(data.next_question);
        }
      } else {
        // Fallback or move to code/termination
        handlePhaseProgress();
      }
    } catch (e) {
      console.error("Answer submission failed", e);
      handlePhaseProgress();
    }

    setFeedback("");
  };

  const handlePhaseProgress = (acknowledgment?: string) => {
    let nextCount = phaseCount + 1;
    let nextIndex = phaseIndex;

    // Questions per phase matching user's request
    const threshold = getPhaseThreshold(phaseIndex);

    if (nextCount >= threshold) {
      nextIndex = phaseIndex + 1;
      nextCount = 0;
    }

    setPhaseCount(nextCount);
    setPhaseIndex(nextIndex);

    if (nextIndex >= PHASES.length) {
      handleTermination("Interview completed successfully.");
      return;
    }

    const nextPhase = PHASES[nextIndex];
    setPhase(nextPhase);
    hasRepeatedRef.current = false;
    isManualStopRef.current = false; // Reset manual stop for new interaction

    if (nextPhase === 'code') {
      startCodingRound();
    } else {
      fetchNextQuestion(nextPhase);
    }
  };

  const fetchNextQuestion = async (cat: string) => {
    setFetchingQuestion(true);
    try {
      const apiUrl = `http://localhost:5000/api/interview/question?category=${cat}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      const q = data.question;

      setQuestion(q);
      questionRef.current = q;
      // Removed acknowledgement to follow "no feedback during interview" rule
      speak(q);
      setFetchingQuestion(false);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingQuestion(false);
    }
  };

  const startCodingRound = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/get_problems");
      const data = await res.json();
      if (data.status === 'success' && data.problems.length > 0) {
        // Select 2 random coding questions dynamically
        const shuffled = data.problems.sort(() => 0.5 - Math.random());
        setCodingProblems(shuffled.slice(0, 2));
        setCurrentCodingIdx(0);
        setCodeAnswer('');
        setStage('code');
        const codingPrompt = "Now, let's move to a coding challenge. I will give you two problems. Please solve the current problem on the screen using any language you are comfortable with.";
        speak(codingPrompt);
        questionRef.current = codingPrompt;
      } else {
        // Skip if no problems
        handlePhaseProgress();
      }
    } catch (e) {
      handlePhaseProgress();
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async () => {
    const currentProblem = codingProblems[currentCodingIdx];
    if (!currentProblem || !codeAnswer.trim()) {
      setFeedback("⚠️ Please write some code first.");
      return;
    }

    setIsRunningCode(true);
    setCodingOutput("⏳ Running test cases...\n");

    let passed = 0;
    const testCases = currentProblem.test_cases || currentProblem.testCases || [];
    let logs: string[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const res = await fetch("https://hackintern.onrender.com/api/compiler/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: codingLanguage,
            code: codeAnswer,
            input: tc.input || "",
          }),
        });

        const data = await res.json();
        const actual = (data.output || "").trim();
        const expected = (tc.output || tc.expected || "").trim();

        if (actual === expected) {
          passed++;
          logs.push(`✅ Test Case ${i + 1} Passed`);
        } else {
          logs.push(`❌ Test Case ${i + 1} Failed (Expected: ${expected}, Got: ${actual})`);
        }
      } catch (error) {
        logs.push(`❌ Test Case ${i + 1} Error: Connection failed`);
      }
    }

    logs.push(`\n--------------------\nOverall Score: ${passed} / ${testCases.length}`);
    setCodingOutput(logs.join("\n"));
    setLastCodingStats({ passed, total: testCases.length });
    setIsRunningCode(false);
  };

  const handleSubmitCode = async () => {
    if (showFullscreenWarnRef.current || showTabSwitchWarnRef.current) return;
    if (!codeAnswer.trim()) {
      setFeedback("⚠️ Please write your solution before submitting.");
      return;
    }

    const problem = codingProblems[currentCodingIdx];
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/submit_code", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problem.id,
          title: problem.title,
          code: codeAnswer,
          language: codingLanguage,
          test_cases_passed: lastCodingStats.passed,
          total_test_cases: lastCodingStats.total
        })
      });

      if (currentCodingIdx < codingProblems.length - 1) {
        setCurrentCodingIdx(prev => prev + 1);
        setCodeAnswer('');
        speak("Solution received. Here is your next problem.");
      } else {
        speak("Coding round complete. Moving to final behavioral questions.", () => {
          setStage('interview');
          handlePhaseProgress();
        });
      }
    } catch (e) {
      setFeedback("⚠️ Submission failed. Continuing...");
      handlePhaseProgress();
    } finally {
      setLoading(false);
    }
  };
  // --- UTILITIES MOVED TO TOP FOR VISIBILITY ---
  const handleDownloadReport = (isManual = false) => {
    if (!isManual && hasDownloadedRef.current) return;
    if (!isManual) hasDownloadedRef.current = true;

    console.log(isManual ? "📥 Manual report request..." : "📥 Auto-downloading report...");

    let url = "http://localhost:5000/api/download_report";
    if (interviewId) {
      url += `?id=${interviewId}`;
    }

    // Use hidden anchor for more reliable download behavior
    const link = document.createElement("a");
    link.href = url;
    link.download = interviewId ? `Report_${interviewId}.pdf` : "Report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const enterFullScreen = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  };

  // Helper to terminate and generate report
  const handleTermination = (reason: string) => {
    if (isTerminatingRef.current) return;
    isTerminatingRef.current = true;

    const isSuccess = reason.toLowerCase().includes("successfully");

    speak(reason, async () => {
      // Generate report in backend before showing termination screen
      try {
        const res = await fetch("http://localhost:5000/api/interview/finish", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id })
        });
        const data = await res.json();
        if (data.status === "success") {
          console.log("✅ Final result received:", data);
          setReportData(data);
          if (data.interview_id) {
            setInterviewId(data.interview_id);
          }
          setStage("results");
        }
      } catch (e) { console.error("Error finishing interview:", e); }

      if (isSuccess) {
        setStage('results');
      } else {
        setStage('report');
      }
      handleDownloadReport();
    });

    // Fallback if audio fails
    setTimeout(() => {
      if (isSuccess) setStage('results');
      else setStage('report');
      handleDownloadReport(); // Still check ref here, handleDownloadReport now has its own lock
    }, 5000);
  };

  // FORCE FULLSCREEN ON STAGE CHANGE
  useEffect(() => {
    // Only force fullscreen during active proctoring stages.
    // We skip 'upload' and 'systemCheck' to allow user interaction with OS file pickers/dialogs.
    const activeProctoringStages = ['verification', 'calibration', 'instructions', 'interview', 'code'];
    if (activeProctoringStages.includes(stage)) {
      enterFullScreen();
    }
  }, [stage]);

  // STABLE VIOLATION LOGIC
  useEffect(() => {
    const monitoringStages = ['verification', 'calibration', 'instructions', 'interview', 'code'];
    if (!monitoringStages.includes(stage)) return;

    const check = () => {
      if (!monitoringStages.includes(stage)) return;
      const isExited = !document.fullscreenElement;
      const isHidden = document.visibilityState === 'hidden';

      if (isExited) {
        // If we are already showing warning, do nothing
        if (showFullscreenWarnRef.current) return;

        fullscreenWarnCountRef.current += 1;

        fetch("http://localhost:5000/proctor/event", {
          method: "POST", headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: "FULLSCREEN_EXIT", message: `User exited full screen mode (Attempt ${fullscreenWarnCountRef.current})`, severity: "MEDIUM" })
        });

        if (fullscreenWarnCountRef.current > 3) {
          handleTermination("Multiple (more than 3) fullscreen violations detected. Terminating interview for security.");
        } else {
          setShowFullscreenWarn(true);
          showFullscreenWarnRef.current = true;
          // Stop agent background voice completely when full screen is exited
          try {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            // Stop recognition too
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              recognitionActiveRef.current = false;
              setIsListening(false);
            }
            // Also pause any fallback audio playing
            if ((window as any).audioRef?.current) {
              (window as any).audioRef.current.pause();
              (window as any).audioRef.current = null;
            }
          } catch (e) { }
          speak("Full screen exited.");
        }
      }

      if (isHidden) {
        if (showTabSwitchWarnRef.current) return;
        tabSwitchCountRef.current += 1;
        fetch("http://localhost:5000/proctor/event", {
          method: "POST", headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: "TAB_SWITCH", message: `Tab switch detected (Attempt ${tabSwitchCountRef.current})`, severity: tabSwitchCountRef.current >= 5 ? "CRITICAL" : "MEDIUM" })
        });
        if (tabSwitchCountRef.current >= 3) {
          handleTermination("Security violation: Maximum tab switches exceeded. Terminating interview.");
        } else {
          setShowTabSwitchWarn(true);
          showTabSwitchWarnRef.current = true;
          // Stop agent background voice completely for tab switch too
          try {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            // Stop recognition
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              recognitionActiveRef.current = false;
              setIsListening(false);
            }
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
          } catch (e) { }
        }
      } else {
        // Returned from hidden state
        if (showTabSwitchWarnRef.current) {
          setShowTabSwitchWarn(false);
          showTabSwitchWarnRef.current = false;
          // Auto-resume if in interview or code stage
          if (!showFullscreenWarnRef.current) {
            if (stage === 'interview') {
              setTimeout(() => {
                if (questionRef.current) speak("Returning to the interview. " + questionRef.current);
              }, 500);
            } else if (stage === 'code') {
              setTimeout(() => {
                speak("Returning to the coding challenge.");
              }, 500);
            }
          }
        }
      }
    };

    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        check();
      } else {
        setShowFullscreenWarn(false);
        showFullscreenWarnRef.current = false;
        // Safety: ensure any stuck audio or speech state is cleared on return
        try {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          isManualStopRef.current = false; // Allow auto-resume
        } catch (e) { }

        // Explicitly resume interview flow - verbal nudge as requested ("it should ask right")
        setTimeout(() => {
          if (stage === 'interview') {
            if (questionRef.current) {
              speak("Resuming.");
            } else {
              safeStartRecognition();
            }
          } else if (stage === 'code') {
            speak("Returning to the coding challenge.");
          }
        }, 500);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('visibilitychange', check);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('visibilitychange', check);
    };
  }, [stage, showFullscreenWarn, question]); // Added question to ensure re-prompt has latest if needed

  // PROCTORING POLL & FRAME LOGIC
  useEffect(() => {
    // Continuous monitoring from verification onwards
    if (!['verification', 'calibration', 'instructions', 'interview', 'code'].includes(stage)) return;
    const detectExtensions = () => {
      // Check for common extension attributes or injected elements
      const indicators = [
        'data-gr-ext-installed', // Grammarly
        'data-grammarly-part',
        'data-extension-id', // Generic extension ID attribute
      ];

      const hasIndicators = indicators.some(attr =>
        document.documentElement.hasAttribute(attr) ||
        document.body.hasAttribute(attr) ||
        document.querySelector(`[${attr}]`)
      );

      // Check for unexpected scripts or iframes (common in extensions)
      const scripts = document.getElementsByTagName('script');
      const hasSuspiciousScript = Array.from(scripts).some(s =>
        s.src.includes('chrome-extension://') || s.src.includes('grammarly')
      );

      return hasIndicators || hasSuspiciousScript;
    };

    const poll = async () => {
      // SKIP termination checks during verification stage
      // Verification failures should stay on verification page, not trigger termination
      if (stage === 'verification') return;

      // EXTENSION CHECK
      if (detectExtensions() && (stage === 'interview' || stage === 'code')) {
        handleTermination("Security Violation: Browser extensions (like Grammarly or Translate) detected. Please disable all extensions to continue.");
        return;
      }

      // poll every 2s for backend-triggered termination (ID fraud)
      try {
        const res = await fetch("http://localhost:5000/proctor/status");
        const data = await res.json();
        const activeProctoringStages = ['calibration', 'instructions', 'interview', 'code'];
        if (data.should_terminate && activeProctoringStages.includes(stage)) {
          handleTermination(data.termination_reason || "Critical security violation detected. The interview is being terminated.");
        }
      } catch (e) { }
    };
    const sendFrame = async () => {
      let activeVideo = null;
      if (stage === 'verification') {
        activeVideo = document.getElementById('verification-video') as HTMLVideoElement;
      } else {
        activeVideo = document.getElementById('main-video') as HTMLVideoElement || videoRef.current;
      }
      
      if (!activeVideo || activeVideo.readyState < 2) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')?.drawImage(activeVideo, 0, 0, 640, 480);
      const img = canvas.toDataURL('image/jpeg', 0.8);
      try {
        const res = await fetch("http://localhost:5000/proctor/process_frame", {
          method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img })
        });
        const data = await res.json();
        const warning = data.warning || data.current_warning || '';

        // Optimize: Only update state if something changed
        setProctorStatus(prev => {
          if (prev.face === data.face_detected && prev.warning === warning) return prev;
          return { face: data.face_detected, warning: warning };
        });

        // Only terminate in active stages. 
        // Verification stage handles its own failures in captureAndVerify.
        const activeProctoringStages = ['calibration', 'instructions', 'interview', 'code'];
        if (activeProctoringStages.includes(stage) && data.should_terminate) {
          // Use the reason from backend if available, otherwise generic
          const reason = data.termination_reason || "Security Violation Detected. Interview Terminated.";
          handleTermination(reason);
          return;
        }
        if (warning.toLowerCase().includes("movement") || warning.toLowerCase().includes("down")) {
          lookingDownRef.current += 1;
          if (lookingDownRef.current > 4) {
            setFeedback("⚠️ Please maintain focus on the screen.");
            lookingDownRef.current = 0;
          }
        } else {
          lookingDownRef.current = 0;
        }
        if (!data.face_detected) noFaceRef.current += 1; else noFaceRef.current = 0;
        // Match 20s requirement (40 frames at 2 FPS)
        setShowNoFaceWarn(noFaceRef.current > 20); 
      } catch (e) { }
    };
    const t = setInterval(poll, 1000); // 1s poll for faster warnings
    const f = setInterval(sendFrame, 500); // Increased frequency (2 FPS) for faster detection
    return () => { clearInterval(t); clearInterval(f); };
  }, [stage]);

  // 1. Lip Sync & Mic Control Effect
  useEffect(() => {
    if (stage !== 'interview') return;

    const v = agentVideoRef.current;
    if (!v) return;

    // Agent video provides idle background animation
    v.loop = true;
    v.muted = true;
    v.play().catch(() => {});

    if (isSpeaking) {
      // Stop mic while agent is speaking
      if (recognitionRef.current && recognitionActiveRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    } else {
      // Agent done speaking — start listening
      if (stage === 'interview') safeStartRecognition();
    }
  }, [isSpeaking, stage]);

  /* FAILSAFE TTS AUDIO REF */

  const speak = (text: string, onComplete?: () => void) => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;

    // 1. Generate new unique ID for this speech request
    const myId = ++globalSpeechTokenRef.current;

    // 2. STOP EVERYTHING PREVIOUSLY RUNNING
    if (audioRef.current) {
      try {
        // Detach ALL handlers first so cleanup doesn't trigger onerror fallback
        const oldAudio = audioRef.current;
        audioRef.current = null;
        oldAudio.onplay = null;
        oldAudio.onended = null;
        oldAudio.onerror = null;
        oldAudio.oncanplaythrough = null;
        oldAudio.pause();
        oldAudio.src = "";
      } catch (e) { }
    }
    try { synth.cancel(); } catch (e) { }
    
    /* Removed Wav2Lip logic
    if (wav2lipVideoRef.current) {
      try {
        const v = wav2lipVideoRef.current;
        v.oncanplaythrough = null;
        v.onended = null;
        v.onerror = null;
        v.pause();
        v.src = "";
      } catch (e) { }
    }
    setWav2lipVideoUrl(null);
    */

    setIsSpeaking(false);
    isSpeakingRef.current = false;

    // 3. RAPID-FIRE / REDUNDANT DEFERRALS
    const activeProctoringStages = ['verification', 'calibration', 'instructions', 'interview', 'code'];
    const isNotInFullscreen = activeProctoringStages.includes(stage) && !document.fullscreenElement;
    if (showFullscreenWarnRef.current || showTabSwitchWarnRef.current || isNotInFullscreen) {
      if ((window as any)._lastDeferredText === text) return;
      (window as any)._lastDeferredText = text;
      console.log("⏳ Speak deferred (Visibility Violation)");

      // If deferred because not in fullscreen, actively request fullscreen to break the loop
      if (isNotInFullscreen && !showFullscreenWarnRef.current && !showTabSwitchWarnRef.current) {
        document.documentElement.requestFullscreen().catch(() => { });
      }

      setTimeout(() => {
        if (myId !== globalSpeechTokenRef.current) return; // Stale
        (window as any)._lastDeferredText = null;
        speak(text, onComplete);
      }, 1500);
      return;
    }

    const playFallback = async () => {
      if (myId !== globalSpeechTokenRef.current) return;
      if (showFullscreenWarnRef.current || showTabSwitchWarnRef.current) return;

      const ttsUrl = `http://localhost:5000/api/generate_video`; // Request actual lip-sync

      // Helper: stop any running animation loop
      const stopLipSync = () => {
        if (lipSyncRafRef.current) {
          cancelAnimationFrame(lipSyncRafRef.current);
          lipSyncRafRef.current = null;
        }
        // Reset bars to flat
        lipSyncBarsRef.current.forEach(bar => {
          if (bar) bar.style.height = '3px';
        });
      };

      // Helper: start Web Audio API lip-sync loop
      const startLipSync = (audioEl: HTMLAudioElement) => {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Small = fast, 32 frequency bins
          analyser.smoothingTimeConstant = 0.6;
          const source = audioCtx.createMediaElementSource(audioEl);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          const bufferLen = analyser.frequencyBinCount; // 32
          const dataArray = new Uint8Array(bufferLen);

          const NUM_BARS = 7;
          const binStep = Math.floor(bufferLen / NUM_BARS);
          const MAX_HEIGHT = 20; // max bar height px
          const MIN_HEIGHT = 3;  // min bar height px

          const loop = () => {
            lipSyncRafRef.current = requestAnimationFrame(loop);
            analyser.getByteFrequencyData(dataArray);
            
            let totalAmplitude = 0;
            lipSyncBarsRef.current.forEach((bar, i) => {
              if (!bar) return;
              const binStart = i * binStep;
              let sum = 0;
              for (let b = binStart; b < binStart + binStep && b < bufferLen; b++) {
                sum += dataArray[b];
              }
              const avg = sum / binStep;
              totalAmplitude += avg;
              const height = MIN_HEIGHT + (avg / 255) * (MAX_HEIGHT - MIN_HEIGHT);
              bar.style.height = `${height}px`;
            });

            // Dynamic Video Sync: Adjust agent video playback speed based on audio energy
            if (agentVideoRef.current) {
              const normalizedAmp = totalAmplitude / (NUM_BARS * 255);
              // mapping 0-1 to 0.9-1.2 playback rate for "speaking" feel (previously 0.8-1.5)
              agentVideoRef.current.playbackRate = 0.9 + (normalizedAmp * 0.3);
            }
          };

          // Resume AudioContext (may be suspended on first user gesture)
          audioCtx.resume().then(() => {
            loop();
          });
        } catch (e) {
          console.warn('Web Audio API not available:', e);
          // Fallback: just animate bars with CSS keyframes
          lipSyncBarsRef.current.forEach((bar, i) => {
            if (!bar) return;
            bar.style.animation = `lipsync ${0.12 + i * 0.04}s ease-in-out infinite alternate`;
          });
        }
      };

      try {
        console.log('🔊 Fetching TTS audio...');
        const resp = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text, lip_sync: true })
        });
        if (!resp.ok) throw new Error(`TTS fetch failed: ${resp.status}`);
        
        const contentType = resp.headers.get("content-type");

        let audioSrcUrl: string | null = null;
        let isBlobUrl = false;

        if (contentType && contentType.includes("application/json")) {
           const data = await resp.json();
           if (data.audio_url) {
             audioSrcUrl = data.audio_url;
           } else {
             throw new Error("JSON response but audio_url is missing");
           }
        } else {
          // AUDIO Fallback Strategy (Web Audio CSS sync)
          const blob = await resp.blob();
          console.log(`🔊 Audio blob received: ${blob.size} bytes, type=${blob.type}`);
          audioSrcUrl = URL.createObjectURL(blob);
          isBlobUrl = true;
        }

        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.volume = 1.0;
        audioRef.current = audio;

        audio.onplay = () => {
          if (myId !== globalSpeechTokenRef.current) { audio.pause(); return; }
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          startLipSync(audio);
        };

        audio.onended = () => {
          if (myId !== globalSpeechTokenRef.current) return;
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          stopLipSync();
          if (agentVideoRef.current) agentVideoRef.current.playbackRate = 1.0; // Reset speed
          if (isBlobUrl && audioSrcUrl) URL.revokeObjectURL(audioSrcUrl);
          if (onComplete) onComplete();
          if (stage === 'interview') {
            safeStartRecognition();
            latestFnRef.current?.resetInactivityTimer?.();
          }
        };

        audio.onerror = (e) => {
          const err = audio.error;
          console.warn('Audio element error:', err?.code, err?.message, e);
          stopLipSync();
          if (isBlobUrl && audioSrcUrl) URL.revokeObjectURL(audioSrcUrl);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          // Fall back to browser speech synthesis
          try {
            const synth = window.speechSynthesis;
            const utt = new SpeechSynthesisUtterance(text);
            utt.onstart = () => {
              setIsSpeaking(true);
              isSpeakingRef.current = true;
              lipSyncBarsRef.current.forEach((bar, i) => {
                if (!bar) return;
                bar.style.animation = `lipsync ${0.12 + i * 0.04}s ease-in-out infinite alternate`;
              });
            };
            utt.onend = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              stopLipSync();
              if (onComplete) onComplete();
              if (stage === 'interview') { safeStartRecognition(); latestFnRef.current?.resetInactivityTimer?.(); }
            };
            synth.speak(utt);
          } catch (synthErr) {
            if (onComplete) onComplete();
          }
        };

        // Wait for audio to be ready, THEN play
        audio.oncanplaythrough = () => {
          console.log('🔊 Audio canplaythrough — calling play()');
          audio.play().catch((playErr) => {
            console.warn('🔊 Audio play() rejected:', playErr);
            if (playErr.name === 'NotAllowedError') setAudioBlocked(true);
            audio.onerror?.(new Event('error'));
          });
        };

        // Set src AFTER attaching all event handlers
        console.log('🔊 Setting audio src to URL, calling load()');
        if (audioSrcUrl) {
          audio.src = audioSrcUrl;
          audio.load(); // explicitly start loading
        }

      } catch (e) {
        console.error('TTS playback failed:', e);
        // Fallback to browser synth
        try {
          const synth = window.speechSynthesis;
          const utt = new SpeechSynthesisUtterance(text);
          utt.onstart = () => { setIsSpeaking(true); isSpeakingRef.current = true; };
          utt.onend = () => {
            setIsSpeaking(false); isSpeakingRef.current = false;
            if (onComplete) onComplete();
          };
          synth.speak(utt);
        } catch (synthErr) {
          if (onComplete) onComplete();
        }
      }
    };

    // Call backend TTS — Web Audio API drives real-time lip-sync bars
    playFallback();
  };

  const unlockAudio = () => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    // Essential for Chrome/Edge autoplay policy
    synth.cancel();
    synth.resume();

    // Heartbeat - force audio state activation
    const dummy = new SpeechSynthesisUtterance("");
    synth.speak(dummy);

    audioUnlockedRef.current = true;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setAudioBlocked(false);
  };

  const handleBeginInterview = async () => {
    if (!file || !name) {
      alert("Please enter your name and upload a resume.");
      return;
    }

    // 1. Immediate Audio Unlock & Feedback
    speak("Analyzing your resume. Please wait a moment.");

    isTerminatingRef.current = false;

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('name', name);
    formData.append('email', email);
    if (user) formData.append('user_id', String(user.id));

    try {
      const res = await fetch('http://localhost:5000/api/upload_resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Start proctoring
        await fetch('http://localhost:5000/proctor/start', { method: 'POST' });

        // Enter fullscreen BEFORE changing stage — prevents speak() deferral race condition
        // (when stage becomes 'verification', the fullscreen enforcement kicks in and speak() gets deferred
        //  if fullscreen isn't already active. So we pre-activate it here.)
        enterFullScreen();

        speak(data.message || "Resume verified. Now, please verify your identity.", () => {
          // Ensure stage change happens after speech completes
          setStage('verification');
        });

        // Fallback: force stage change after 3s in case onComplete never fires (e.g., TTS fails silently)
        setTimeout(() => setStage('verification'), 3000);

      } else {
        const errorMsg = data.message || "Resume verification failed.";
        setFeedback("⚠️ " + errorMsg);
        setFile(null); // Clear file to force re-upload as per user request
        speak(errorMsg);
      }
    } catch (e) {
      setFeedback("❌ Connection error. Please ensure backend is running.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- IDENTITY VERIFICATION ---

  useEffect(() => {
    if (stage !== 'verification') return;

    // Poll every 150ms until the video element is mounted AND stream is attached
    const interval = setInterval(() => {
      // Try ref first, then query DOM by id as a fallback
      const el = verificationVideoRef.current ||
        (document.getElementById('verification-video') as HTMLVideoElement | null);

      if (!el) return; // element not mounted yet, keep polling

      // Update ref if found via DOM
      if (!verificationVideoRef.current && el) {
        (verificationVideoRef as any).current = el;
      }

      // Check all possible sources for the stream
      const s = streamRef.current || currentStream || (window as any).__cameraStream;
      if (!s) return;

      // Sync state if we found a stream in refs/window but not state
      if (!currentStream && s) setCurrentStream(s);

      // Ensure stream tracks are enabled
      s.getTracks().forEach((t: MediaStreamTrack) => { if (!t.enabled) t.enabled = true; });

      if (el.srcObject !== s) {
        el.srcObject = s;
        console.log('✅ Stream attached to verification video (poll)');
      }
      el.play().catch(() => { });

      // Stop polling once video is playing
      if (el.readyState >= 2) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [stage, currentStream]);


  const captureAndVerify = async () => {
    const video = verificationVideoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setVerifyStatus("🔴 Camera not ready. Please wait for video feed or restart camera.");
      return;
    }

    // Warn but don't block if face not yet detected by proctoring engine
    if (!proctorStatus.face) {
      setVerifyStatus("⚠️ Face not clearly detected — attempting high-accuracy match anyway...");
    }

    setVerifying(true);
    setVerifyStatus("Capturing biometric data...");

    // Capture
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (ctx && video) {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      ctx.drawImage(video, x, y, size, size, 0, 0, 400, 400);
    }
    const img = canvas.toDataURL('image/jpeg', 0.8);

    try {
      setVerifyStatus("Comparing with database records...");
      const res = await fetch("http://localhost:5000/api/auth/verify_face", {
        method: "POST", headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, image: img })
      });
      const data = await res.json();

      if (data.status === 'success') {
        setVerifyStatus("✅ " + (data.message || "Identity & Eyes Verified Successfully!"));
        setProctorStatus({ face: true, warning: '' });
        setVerifying(false);
        speak(data.message || "Identity verified. Now, let's calibrate your environment."),
        
        // Signal proctoring reset
        fetch("http://localhost:5000/proctor/reset", { method: "POST" }).catch(() => { });

        setTimeout(() => {
          setStage('calibration');
        }, 2000);
      } else {
        setVerifyFailCount(prev => prev + 1);
        setVerifyStatus("❌ " + (data.message || "Verification failed."));
        
        // Detailed feedback logic
        if (data.message?.toLowerCase().includes("light")) {
          speak("Verification failed due to low lighting. Please move to a brighter area.");
        } else if (data.message?.toLowerCase().includes("eyes")) {
          speak("Verification failed. Please keep your eyes open and look at the camera.");
        } else {
          speak(data.message || "Identity verification failed. Please try again.");
        }
        setVerifying(false);
      }
    } catch (e) {
      setVerifyStatus("❌ Connection error. Identity verification is required to proceed.");
      setVerifying(false);
    }
  };


  const handleEndInterview = async () => {
    setShowEndConfirm(true);
  };

  const confirmEndInterview = async () => {
    if (isTerminatingRef.current) return;
    isTerminatingRef.current = true;

    setShowEndConfirm(false);
    setLoading(true);

    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    }
    recognitionActiveRef.current = false;
    setIsListening(false);

    try {
      // 1. Submit any current "last words" if they exist
      const finalUserAns = (transcript.trim() + " " + interimTranscript.trim()).trim();
      if (finalUserAns && finalUserAns.length > 5 && (stage === 'interview' || stage === 'code')) {
        console.log("📝 Submitting final partial answer before ending...");
        await fetch("http://localhost:5000/api/interview/answer", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question, answer: finalUserAns })
        });
      }

      // 2. Conclude the interview session
      const res = await fetch("http://localhost:5000/api/interview/finish", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id })
      });
      const data = await res.json();

      if (data.status === 'success') {
        setReportData(data);

        // 3. Professional Closing
        speak("Thank you for your time. The interview session is now concluded. Your performance report is being finalized.", () => {
          setStage('results');
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
          }
          handleDownloadReport();
        });

        // Fallback for stage change
        setTimeout(() => {
          setStage('results');
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
          }
          handleDownloadReport();
        }, 4000);
      }
    } catch (e) {
      console.error("Error ending interview:", e);
      setStage('results'); // Fallback
    } finally {
      setLoading(false);
    }
  };


  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if we're typing in a textarea (like in code round)
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';

      if (e.key === 'Enter') {
        if (stage === 'verification' && !verifying) {
          e.preventDefault();
          captureAndVerify();
        } else if (stage === 'interview' && !isSpeaking) {
          // If we're not in an input, allow Enter to submit
          if (!isInput) {
            e.preventDefault();
            handleSubmitAnswer();
          }
        } else if (stage === 'code' && (e.ctrlKey || e.metaKey)) {
          // Support Ctrl+Enter for code submission
          e.preventDefault();
          handleSubmitCode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, verifying, isSpeaking, transcript]);

  return (
    <div className={`min-h-screen transition-colors duration-500 bg-[var(--background)] text-[var(--foreground)]`}>



      {/* GLOBAL PROCTORING OVERLAY */}
      {proctorStatus.warning && ['calibration', 'instructions', 'interview', 'code'].includes(stage) && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] w-full max-w-md px-4 pointer-events-none">
          <div className="bg-red-600 text-white font-black py-4 px-8 rounded-3xl shadow-[0_20px_50px_rgba(220,38,38,0.5)] border-4 border-white flex items-center justify-center gap-4 animate-in slide-in-from-top-10 duration-300">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <AlertCircle size={28} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.3em] opacity-80 leading-none mb-1">Security Alert</span>
              <span className="uppercase tracking-widest text-sm leading-tight font-black">{proctorStatus.warning}</span>
            </div>
          </div>
        </div>
      )}

      {(stage === 'landing' || stage === 'results' || stage === 'report') && (
        <nav className={`h-20 w-full flex items-center justify-center border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-white/80'} backdrop-blur-xl sticky top-0 z-[100] transition-all duration-300`}>
          <div className="w-full max-w-[1400px] flex items-center justify-between px-8 md:px-12">
            <div className="flex items-center gap-5 group cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-600/30 group-hover:scale-110 transition-transform">AI</div>
              <div className="flex flex-col">
                <span className={`font-black text-2xl tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Interview.AI</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Intelligence 2.0</span>
              </div>
            </div>

            <div className="flex items-center gap-6 lg:gap-10">
              <div className="hidden lg:flex gap-10">
                <Link href="/features" className={`text-xs font-black ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors`}>Features</Link>
                <Link href="/about" className={`text-xs font-black ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors`}>About</Link>
                <button 
                  onClick={() => {
                    const el = document.getElementById('instructions');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    speak("To ensure a successful interview session, please follow these four steps. First, upload your professional resume. Second, wait for our AI to adapt the questions to your specific background. Third, enter the mock session and face voice-based questions and coding challenges. Finally, review your expert feedback and instant PDF report to master your performance.");
                  }}
                  className={`text-xs font-black bg-transparent border-none cursor-pointer ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors`}
                >
                  Guidelines
                </button>
                <Link href="#faq" className={`text-xs font-black ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors`}>FAQs</Link>
              </div>

              <div className={`h-8 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'} mx-2`}></div>

              <div className="flex items-center gap-4">
                {/* Premium Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:border-indigo-200'} border transition-all shadow-sm active:scale-90`}
                  title={theme === 'dark' ? "Activate Daylight Mode" : "Activate Midnight Mode"}
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {user ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-[18px] text-[11px] font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-widest"
                    >
                      <LayoutDashboard size={14} /> My Deck
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/login')} className={`text-[11px] font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'} hover:text-indigo-600 uppercase tracking-widest px-2`}>Login</button>
                    <button onClick={() => router.push('/signup')} className="px-7 py-3.5 bg-indigo-600 text-white rounded-[18px] text-[11px] font-black shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 uppercase tracking-widest">Enroll Now</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}


      {/* STAGE: LANDING */}
      {
        stage === 'landing' && (
          <>
            <main className={styles.heroSection}>
              <div className={styles.heroContent}>


                <h1 className={styles.heroTitle}>
                  Experience <span className={styles.gradientText}>Reel Interviews</span>.<br />
                  Before the Real One.
                </h1>

                {/* STAGE: CODE EDITOR (New Step 4 End) */}
                {/* (Moved Code Block out) */}

                {/* STAGE: UPLOAD */}

                <p className={styles.heroSubtitle}>
                  Join thousands of students forcing their way into top tech jobs.
                  Real-time voice interaction, emotion analysis, and resume-tailored questions.
                </p>

                <div className={`${styles.ctaGroup} relative z-10`}>
                  <button
                    onClick={() => {
                      if (user) {
                        enterFullScreen();
                        setStage('upload');
                      } else {
                        router.push('/login');
                      }
                    }}
                    className={`${styles.btnPrimary} cursor-pointer`}
                  >
                    Start Mock Interview
                  </button>
                  <button
                    className={`${styles.btnSecondary} cursor-pointer`}
                    onClick={() => {
                      router.push('/features');
                    }}
                  >
                    Learn More
                  </button>
                </div>
              </div>

              <div className={styles.heroImageContainer}>
                <div className="relative">
                  <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
                  <img
                    src="/robot_hero_final.png"
                    alt="AI Interviewer"
                    className={styles.heroImage}
                  />
                  {/* Premium Halo Effect */}
                  <div className="absolute inset-0 bg-white/40 rounded-full blur-[100px] -z-10 animate-pulse" />
                </div>
              </div>
            </main>

            {/* ENTERPRISE INFRASTRUCTURE MARQUEE */}
            <section className={styles.infrastructureSection}>
              <div className={styles.infraHeader}>
                <span className={styles.infraBadge}>Enterprise Infrastructure</span>
              </div>
              
              <div className={styles.marqueeContainer}>
                {[1, 2].map((loop) => (
                  <React.Fragment key={loop}>
                    <div className={styles.infraCard}>
                      <Shield className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Secure Biometrics</div>
                        <div className={styles.infraDesc}>256-bit Encrypted identity</div>
                      </div>
                    </div>
                    <div className={styles.infraCard}>
                      <Zap className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Ultra-Low Latency</div>
                        <div className={styles.infraDesc}>150ms Voice response</div>
                      </div>
                    </div>
                    <div className={styles.infraCard}>
                      <Globe className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Global Network</div>
                        <div className={styles.infraDesc}>Edge-deployed AI models</div>
                      </div>
                    </div>
                    <div className={styles.infraCard}>
                      <Database className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Real-time Analytics</div>
                        <div className={styles.infraDesc}>Instant performance storage</div>
                      </div>
                    </div>
                    <div className={styles.infraCard}>
                      <Lock className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Privacy First</div>
                        <div className={styles.infraDesc}>SOC2 Compliant processing</div>
                      </div>
                    </div>
                    <div className={styles.infraCard}>
                      <Brain className={styles.infraIcon} size={28} />
                      <div>
                        <div className={styles.infraLabel}>Neural Engine</div>
                        <div className={styles.infraDesc}>Proprietary LLM architecture</div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </section>

            {/* INSTRUCTIONS SECTION */}
            <section id="instructions" className={styles.instructionsSection}>
              <div className="max-w-7xl mx-auto px-6 md:px-8">
                <div className="text-center mb-16">
                  <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm">How It Works</span>
                  <h2 className="text-3xl md:text-5xl font-black mt-3 mb-6">4 Steps to Your Dream Job.</h2>
                  <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-lg">Follow this roadmap to master your skills and dominate your next technical interview.</p>
                </div>

                <div className={`${styles.instructionsContainer} ${styles['stepStage' + activeInstructionStep]}`}>
                  {/* Step 1 */}
                  <div
                    className={`${styles.stepNode} ${activeInstructionStep === 0 ? styles.stepActive : ''} cursor-pointer`}
                    onClick={() => {
                      if (user) {
                        enterFullScreen();
                        setStage('upload');
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    <div className={styles.stepCircle}>
                      <FileText size={32} />
                      <div className={styles.stepBadge}>1</div>
                    </div>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>Resume Upload</h3>
                      <p className={styles.stepText}>Start by uploading your current resume. Our AI analyzes your experience, skills, and projects in seconds.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    className={`${styles.stepNode} ${activeInstructionStep === 1 ? styles.stepActive : ''} cursor-pointer`}
                    onClick={() => {
                      if (user) {
                        enterFullScreen();
                        setStage('upload');
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    <div className={styles.stepCircle}>
                      <Sparkles size={32} />
                      <div className={styles.stepBadge}>2</div>
                    </div>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>AI Adaptation</h3>
                      <p className={styles.stepText}>The platform generates a unique set of questions specifically tailored to your background and targeting role.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    className={`${styles.stepNode} ${activeInstructionStep === 2 ? styles.stepActive : ''} cursor-pointer`}
                    onClick={() => {
                      if (user) {
                        enterFullScreen();
                        setStage('upload');
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    <div className={styles.stepCircle}>
                      <Mic size={32} />
                      <div className={styles.stepBadge}>3</div>
                    </div>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>Mock Session</h3>
                      <p className={styles.stepText}>Enter the realistic interview room. Face voice-based questions, coding challenges, and proctoring.</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div
                    className={`${styles.stepNode} ${activeInstructionStep === 3 ? styles.stepActive : ''} cursor-pointer`}
                    onClick={() => {
                      if (user) {
                        enterFullScreen();
                        setStage('upload');
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    <div className={styles.stepCircle}>
                      <BarChart size={32} />
                      <div className={styles.stepBadge}>4</div>
                    </div>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>Expert Feedback</h3>
                      <p className={styles.stepText}>Complete the round to receive an instant report. Fix your weak points and try again until you're perfect.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURES SECTION (Restored) */}
            <section id="features" className="flex flex-col justify-center py-24 bg-[var(--card-bg)] border-t border-[var(--border)]">
              <div className="max-w-7xl mx-auto px-6 md:px-8">
                <div className="text-center mb-16">
                  <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm">Why Choose Us</span>
                  <h2 className="text-3xl md:text-5xl font-black mt-3 mb-6">Master Every Interview Stage.</h2>
                  <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-lg">From behavioral questions to live coding challenges, we simulate it all with AI precision.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  {/* Row 1 */}
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500 transition-all group">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform"><Sparkles size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Builds Confidence</h3>
                    <p className="text-sm text-[var(--text-muted)]">Practice in a stress-free environment. Overcome anxiety and gain the confidence to ace your real interview.</p>
                  </div>
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-purple-500 transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Resume Analysis</h3>
                    <p className="text-sm text-[var(--text-muted)]">Our AI scans your resume to generate tailored questions, ensuring you practice what actually matters for your role.</p>
                  </div>
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-green-500 transition-all group">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform"><Monitor size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Real Experience</h3>
                    <p className="text-sm text-[var(--text-muted)]">Experience the pressure of a real interview with realistic voice interactions, strict proctoring, and live coding.</p>
                  </div>

                  {/* Row 2 */}
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500 transition-all group">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform"><Mic size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Voice-First AI</h3>
                    <p className="text-sm text-[var(--text-muted)]">Speak naturally. Our AI listens, understands, and responds with human-like latency and voice.</p>
                  </div>
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-red-500 transition-all group">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform"><Shield size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Strict Proctoring</h3>
                    <p className="text-sm text-[var(--text-muted)]">Simulate exam conditions with full-screen enforcement, tab monitoring, and gadget detection.</p>
                  </div>
                  <div className="p-7 rounded-3xl bg-[var(--background)] border border-[var(--border)] hover:border-orange-500 transition-all group">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform"><BarChart size={24} /></div>
                    <h3 className="text-lg font-bold mb-3">Detailed Reporting</h3>
                    <p className="text-sm text-[var(--text-muted)]">Get instant feedback, actionable insights, and a downloadable PDF report of your performance.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ SECTION */}
            <section id="faq" className={styles.faqSection}>
              <div className="max-w-7xl mx-auto px-6 md:px-8">
                <h2 className={styles.faqHeader}>FAQs</h2>
                <div className={styles.faqGrid}>
                  {/* Column 1 */}
                  <div className={styles.faqCol}>
                    {faqs.slice(0, 4).map((faq, i) => (
                      <div
                        key={i}
                        className={`${styles.faqItem} ${activeFaqIndex === i ? styles.faqItemActive : ''}`}
                        onClick={() => setActiveFaqIndex(activeFaqIndex === i ? null : i)}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={styles.faqQuestion}>{faq.q}</span>
                          <ChevronRight size={18} className={styles.faqIcon} />
                        </div>
                        <div className={`${styles.faqAnswer} ${activeFaqIndex === i ? styles.faqAnswerVisible : ''}`}>
                          <p className={styles.faqDesc}>{faq.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Column 2 */}
                  <div className={styles.faqCol}>
                    {faqs.slice(4).map((faq, i) => {
                      const idx = i + 4;
                      return (
                        <div
                          key={idx}
                          className={`${styles.faqItem} ${activeFaqIndex === idx ? styles.faqItemActive : ''}`}
                          onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className={styles.faqQuestion}>{faq.q}</span>
                            <ChevronRight size={18} className={styles.faqIcon} />
                          </div>
                          <div className={`${styles.faqAnswer} ${activeFaqIndex === idx ? styles.faqAnswerVisible : ''}`}>
                            <p className={styles.faqDesc}>{faq.a}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            
            {/* FOOTER SECTION */}
            <footer className="py-20 bg-[var(--background)] border-t border-[var(--border)] overflow-hidden relative">
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -ml-48 -mb-48"></div>
              <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">AI</div>
                      <span className="text-2xl font-black tracking-tighter">Interview.AI</span>
                    </div>
                    <p className="text-[var(--text-muted)] font-medium max-w-sm leading-relaxed mb-8">
                      Empowering candidates worldwide to master technical interviews through state-of-the-art AI simulation and real-time feedback.
                    </p>





                  </div>
                  
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-600 mb-6">Platform</h4>
                    <ul className="space-y-4">
                      <li><Link href="/features" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">Features</Link></li>
                      <li><Link href="/about" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">About Us</Link></li>
                      <li><button onClick={() => {
                        const el = document.getElementById('instructions');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }} className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer">Guidelines</button></li>
                      <li><Link href="#faq" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">FAQs</Link></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-600 mb-6">Legal</h4>
                    <ul className="space-y-4">
                      <li><Link href="/privacy" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                      <li><Link href="/terms" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                      <li><Link href="/contact" className="text-sm font-bold text-[var(--text-muted)] hover:text-indigo-600 transition-colors">Contact Support</Link></li>
                    </ul>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  <div>&copy; {new Date().getFullYear()} AI Interviewer Engine. All Rights Reserved.</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    System Status: Operational
                  </div>
                </div>
              </div>
            </footer>
          </>
        )
      }

      {/* STAGE: CODE */}
      {
        stage === 'code' && (
          <main className="h-screen flex flex-col lg:flex-row bg-[#0f172a] text-white">
            <div className="w-full lg:w-96 bg-[#1e293b] border-b lg:border-r border-slate-700 p-4 lg:p-6 flex flex-col gap-4 justify-between overflow-y-auto max-h-[30vh] lg:max-h-full">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="px-3 py-1 bg-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest">Coding Round</div>
                  <h2 className="text-xl font-bold text-slate-200">Problem {currentCodingIdx + 1} of {codingProblems.length}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-slate-400">Time: {formatTime(elapsedTime)}</div>
                  <div className="h-2 w-32 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentCodingIdx + 1) / codingProblems.length) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="w-full lg:w-1/3 p-6 md:p-8 border-b lg:border-r border-slate-800 bg-[#0f172a] overflow-y-auto max-h-[40%] lg:max-h-none">
                <h1 className="text-xl md:text-2xl font-black mb-4 text-white tracking-tight">{codingProblems[currentCodingIdx]?.title}</h1>
                <div className="inline-block px-2.5 py-1 bg-green-500/10 text-green-500 rounded-md text-[10px] font-black uppercase tracking-wider mb-6 border border-green-500/20">
                  Difficulty: {codingProblems[currentCodingIdx]?.difficulty || 'Medium'}
                </div>

                <div className="space-y-6 text-slate-300 leading-relaxed font-medium">
                  <div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Description</h3>
                    <p>{codingProblems[currentCodingIdx]?.description}</p>
                  </div>

                  {codingProblems[currentCodingIdx]?.test_cases && (
                    <div>
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">Example Test Cases</h3>
                      <div className="space-y-3">
                        {codingProblems[currentCodingIdx].test_cases.slice(0, 2).map((tc: any, i: number) => (
                          <div key={i} className="bg-black/40 border border-slate-800 p-3 rounded-xl font-mono text-xs">
                            <div className="text-indigo-400 mb-1">Input: {tc.input}</div>
                            <div className="text-green-400">Output: {tc.output}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 text-xs">
                    <div className="flex gap-2 items-center text-indigo-400 mb-2 font-black uppercase tracking-tighter">
                      <Shield size={14} /> Security Active
                    </div>
                    Plagiarism detection and tab-switching monitoring are active during this stage.
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#111827]">
                <div className="bg-[#1e293b]/50 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <label htmlFor="language_select" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">Language</label>
                      <select
                        id="language_select"
                        value={codingLanguage}
                        onChange={(e) => setCodingLanguage(e.target.value as any)}
                        className="bg-[#0f172a] text-slate-300 text-xs font-mono px-3 py-1.5 rounded-md border border-slate-700 outline-none focus:border-indigo-500/50 transition-colors"
                      >
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="c">C</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                    </div>

                    <button
                      onClick={handleRunCode}
                      disabled={isRunningCode}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isRunningCode ? <span className="animate-spin text-lg">⏳</span> : <Play size={14} />}
                      Run Code
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={codingLanguage}
                      value={codeAnswer}
                      onChange={(val) => setCodeAnswer(val || '')}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        padding: { top: 20 },
                        readOnly: loading
                      }}
                    />
                  </div>

                  {/* Terminal / Output Pane */}
                  <div className="h-1/3 min-h-[150px] border-t border-slate-800 bg-[#0f172a] flex flex-col">
                    <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Terminal size={12} /> Execution Results
                      </h3>
                      <button
                        onClick={() => setCodingOutput('')}
                        className="text-[10px] text-slate-500 hover:text-white underline"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex-1 p-4 font-mono text-xs overflow-y-auto whitespace-pre-wrap text-slate-300">
                      {codingOutput || "Run your code to see the output here..."}
                    </div>
                  </div>

                  {/* PiP Video Feed (Overlays Editor) */}
                  <div className="absolute top-4 right-4 w-48 aspect-video bg-black/40 rounded-xl border border-white/20 shadow-2xl overflow-hidden z-30 pointer-events-none flex items-center justify-center relative">
                    <div className="absolute bottom-3 right-3 z-40 flex flex-col items-end">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                            <Shield className="text-green-500 w-3 h-3" />
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-green-500">Secure</span>
                        </div>
                    </div>

                    <video
                      ref={(el) => {
                        (videoRef as any).current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.play().catch((e) => {
                            if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error("Video play failed:", e);
                          });
                        }
                      }}
                      autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-100"
                    />
                  </div>

                  <div className="absolute bottom-4 right-4 flex gap-4 z-40">
                    <button
                      onClick={handleSubmitCode}
                      disabled={loading}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "Submitting..." : (currentCodingIdx === codingProblems.length - 1 ? "Submit Final" : "Next Problem")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )
      }


      {/* STAGE: VERIFICATION */}
      {
        stage === 'verification' && (
          <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-24 left-8 z-50">
              <button onClick={() => setStage('upload')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
              </button>
            </div>
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 w-full max-w-5xl h-full flex flex-col md:flex-row items-center justify-center gap-12 p-6 md:p-12">

              {/* Left Column: Instructions & Context (Hidden on small mobile) */}
              <div className="hidden md:flex flex-col items-start text-left space-y-6 flex-1 animate-fadeInLeft">
                <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mb-2">
                  <Shield size={36} />
                </div>
                <h1 className="text-5xl font-black tracking-tighter leading-tight">
                  Identity <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Verification</span>
                </h1>
                <p className="text-xl text-[var(--text-muted)] leading-relaxed max-w-md">
                  We use advanced biometric analysis to ensure exam integrity. Please look directly at the camera.
                </p>

                <div className="flex flex-col gap-4 mt-8 w-full">
                  <div className={`flex items-center gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm transition-all ${(currentStream || streamRef.current) ? 'border-green-500/30 bg-green-500/5' : ''}`}>
                    <div className={`p-2 rounded-lg ${(currentStream || streamRef.current) ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {(currentStream || streamRef.current) ? <CheckCircle size={20} /> : <Camera size={20} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">Camera Initialized</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{(currentStream || streamRef.current) ? 'Hardware connection active' : 'Waiting for hardware...'}</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm transition-all ${proctorStatus.face ? 'border-green-500/30 bg-green-500/5' : ''}`}>
                    <div className={`p-2 rounded-lg ${proctorStatus.face ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {proctorStatus.face ? <CheckCircle size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">Face Visible</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{proctorStatus.face ? 'Biometric scan in progress' : 'Position your face in center'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Camera Feed */}
              <div className="flex-1 flex flex-col items-center w-full max-w-lg">
                <div className="relative w-full aspect-square md:aspect-[4/5] max-h-[60vh] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/20 ring-4 ring-black/5 group">
                  <video
                    id="verification-video"
                    ref={verificationVideoRef}
                    autoPlay playsInline muted
                    onCanPlay={(e) => (e.target as HTMLVideoElement).play().catch(() => { })}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* Overlay UI */}
                  <div className="absolute inset-0 border-[6px] border-dashed border-white/10 rounded-[3rem] pointer-events-none"></div>

                  {/* Status Tag */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
                    <div className={`px-6 py-2 rounded-full text-xs md:text-sm font-black text-white flex items-center gap-2 shadow-xl uppercase tracking-widest backdrop-blur-md border border-white/20 ${proctorStatus.face ? 'bg-green-500/90' : 'bg-red-500/90 animate-pulse'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full bg-white ${proctorStatus.face ? '' : 'animate-ping'}`}></span>
                      {proctorStatus.face ? 'Face Locked' : 'Detecting Face...'}
                    </div>
                  </div>

                  {/* Scanning Animation */}
                  {verifying && (
                    <>
                      <div className={styles.scanLine}></div>
                      <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="text-white font-black tracking-widest animate-pulse">VERIFYING...</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status Message */}
                {verifyStatus && (
                  <div className={`mt-6 px-6 py-3 rounded-2xl font-bold text-sm transition-all animate-in fade-in slide-in-from-bottom-4 shadow-lg flex items-center gap-3 ${verifyStatus.includes('✅') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {verifyStatus.includes('✅') ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {verifyStatus}
                  </div>
                )}

                {/* Main Action Button */}
                <button
                  onClick={captureAndVerify}
                  disabled={verifying}
                  className="mt-8 w-full max-w-sm py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xl hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <Camera className="group-hover:rotate-12 transition-transform" size={24} />
                  <span>Authenticate</span>
                </button>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    onClick={restartCamera}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-400 underline underline-offset-4 flex items-center gap-1.5 transition-colors"
                  >
                    <AlertCircle size={14} /> Video still black? Restart Camera hardware
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] text-center">
                    Note: Ensure your physical camera shutter is open and no other app is using it.
                  </p>
                </div>


              </div>

            </div>
          </main>
        )
      }

      {/* STAGE: CALIBRATION */}
      {
        stage === 'calibration' && (
          <main className="h-screen flex items-center justify-center p-8 bg-[var(--background)] relative">
            {/* Back Button */}
            <div className="absolute top-24 left-8 z-50">
              <button onClick={() => setStage('verification')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
              </button>
            </div>
            <div className="w-full max-w-3xl bg-[var(--card-bg)] p-12 rounded-[3rem] border border-[var(--border)] shadow-2xl text-center">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-indigo-50">
                <Shield size={40} className="animate-pulse" />
              </div>
              <h1 className="text-4xl font-black mb-6 tracking-tight text-slate-800">Environment Security Mode</h1>
              <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed max-w-xl mx-auto">
                Identity Verified. Activating <span className="text-indigo-600 font-black">Atlas Security Pro</span>. 
                We are now scanning your environment for unauthorized gadgets or individuals.
              </p>

              <div className="relative w-full max-w-lg aspect-video mx-auto bg-black rounded-[2rem] overflow-hidden border-4 border-indigo-500 shadow-2xl mb-10 group">
                <video
                  id="main-video"
                  ref={(el) => {
                    (videoRef as any).current = el;
                    if (el && (currentStream || streamRef.current)) {
                      const s = currentStream || streamRef.current;
                      if (el.srcObject !== s) el.srcObject = s!;
                    }
                  }}
                  autoPlay muted playsInline
                  onCanPlay={(e) => (e.target as HTMLVideoElement).play().catch(() => { })}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 border-2 border-indigo-400/50 rounded-full border-dashed animate-pulse ring-8 ring-indigo-500/10"></div>
                  <div className="absolute w-2 h-2 bg-indigo-500 rounded-full"></div>
                </div>

                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Person Tracking: Active</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Gadget Shield: Scanning</span>
                  </div>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%]">
                  {proctorStatus.warning ? (
                    <div className="px-6 py-3 rounded-2xl bg-red-600 text-white flex items-center justify-center gap-3 shadow-2xl animate-bounce">
                      <ShieldAlert size={20} />
                      <span className="text-sm font-black uppercase tracking-widest">{proctorStatus.warning}</span>
                    </div>
                  ) : (
                    <div className={`px-6 py-2 rounded-full text-xs font-black text-white flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest backdrop-blur-md ${proctorStatus.face ? 'bg-green-600/80' : 'bg-red-600/80 animate-pulse'}`}>
                      <span className={`w-2 h-2 rounded-full bg-white ${proctorStatus.face ? '' : 'animate-ping'}`}></span>
                      {proctorStatus.face ? 'Environment Secured' : 'No Face Detected'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <button
                  onClick={() => {
                    speak("Calibration complete. Please review the interview instructions carefully before we begin.");
                    setStage('instructions');
                  }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95"
                >
                  <CheckCircle size={24} /> I&apos;m Ready to Start
                </button>
              </div>
            </div>
          </main>
        )
      }

      {/* STAGE: INSTRUCTIONS */}
      {
        stage === 'instructions' && (
          <main className="h-screen flex items-center justify-center p-4 md:p-8 bg-[var(--background)] relative">
            {/* Back Button */}
            <div className="absolute top-24 left-8 z-50">
              <button onClick={() => setStage('calibration')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back
              </button>
            </div>
            <div className="w-full max-w-4xl bg-[var(--card-bg)] p-8 md:p-10 rounded-[2.5rem] border border-[var(--border)] shadow-2xl relative overflow-hidden flex flex-col">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} />
                </div>
                <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Interview Guidelines</h1>
                <p className="text-[var(--text-muted)] text-base font-medium">Follow these instructions for a successful session.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Mic size={20} /></div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Voice Interaction</h3>
                      <p className="text-sm text-[var(--text-muted)]">Speak clearly and naturally. Our AI will analyze your communication skills, confidence, and technical depth.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center shrink-0"><Monitor size={20} /></div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Environment</h3>
                      <p className="text-sm text-[var(--text-muted)]">Ensure you are in a quiet, well-lit room. Background noise or other people talking may affect your score.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-500/10 text-green-600 rounded-xl flex items-center justify-center shrink-0"><FileText size={20} /></div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Structure</h3>
                      <p className="text-sm text-[var(--text-muted)]">The interview consists of Technical rounds, Resume-based questions, and a Live Coding challenge.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-red-50 dark:bg-red-950/20 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
                  <img src="/robot_friend.png" className="absolute -right-12 -bottom-12 w-48 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
                  <h3 className="font-black text-red-600 dark:text-red-400 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                    <Shield size={14} /> Proctoring Rules
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="font-bold underline decoration-red-200">No Tab Switching:</span> Session will end after 3 warnings.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="font-bold underline decoration-red-200">Fullscreen:</span> Maintain active fullscreen throughout.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="font-bold underline decoration-red-200">No Gadgets:</span> Phone detection leads to immediate failure.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="font-bold underline decoration-red-200">Visuals:</span> Full face must be visible in camera at all times.</p>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={() => {
                    unlockAudio();
                    // Enter fullscreen first so speak() isn't deferred on this proctored stage
                    enterFullScreen();
                    setTimeout(() => {
                      speak("Testing audio system. If you can hear this, you are ready for the interview session.");
                    }, 300);
                  }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-200"
                >
                  <div className="p-2 bg-white rounded-full shadow-sm"><Mic size={16} /></div> Test Audio
                </button>

                <button
                  onClick={() => {
                    unlockAudio();

                    // CRITICAL FIX: speak() is deferred when not in fullscreen (because 'instructions'
                    // is a proctored stage). So we MUST enter fullscreen and change stage directly,
                    // without relying on speak()'s onComplete callback.

                    // Step 1: Enter fullscreen immediately (required before speak() will work)
                    enterFullScreen();

                    // Step 2: Set up interview state
                    hasStartedRef.current = true;
                    fetch("http://localhost:5000/proctor/reset", { method: "POST" }).catch(() => { });
                    fetch("http://localhost:5000/api/interview/reset", { method: "POST" }).catch(() => { });

                    const freshPhases = [
                      'greeting',
                      'warmup',
                      'intro',
                      'technical',
                      'scenario',
                      'project',
                      'behavioral',
                      'code',
                      'conclusion'
                    ];
                    setPHASES(freshPhases);
                    setPhaseIndex(0);
                    setPhaseCount(0);
                    setPhase('greeting');

                    // Step 3: Transition to interview stage after a short delay to let
                    // fullscreen activate (so speak() inside the interview won't be deferred)
                    setTimeout(() => {
                      setStage('interview');
                      // Step 4: Speak welcome message AFTER stage change + fullscreen
                      setTimeout(() => {
                        speak("Starting the interview session now. I will be your interviewer today. Good luck!", () => {
                          fetchNextQuestion('greeting');
                        });
                      }, 300);
                    }, 500);
                  }}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                >
                  Start Final Interview <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </main>
        )
      }

      {/* STAGE: UPLOAD */}
      {
        stage === 'upload' && (
          <main className="pt-32 pb-16 flex items-center justify-center px-8 min-h-screen relative">
            {/* Back Button */}
            <div className="absolute top-24 left-8 z-50">
              <button onClick={() => router.push('/dashboard')} className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors font-bold text-sm bg-transparent border-none cursor-pointer group`}>
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
              </button>
            </div>
            <div className={styles.uploadStageWrapper}>
              {/* Left: Agent Welcome */}
              <div className={`${styles.agentWelcomeSection} hidden lg:flex`}>
                <div className={styles.wavingAgentContainer}>
                  <img src="/waving_agent.png" alt="AI Agent" className={styles.wavingAgent} />
                  <div className={styles.agentSpeechBubble}>
                    Ready to start your journey, {name.split(' ')[0] || 'Champ'}?
                  </div>
                </div>
              </div>

              {/* Right: Upload Form */}
              <div className={`${styles.glassCard} w-full max-w-xl p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border)] shadow-2xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                <h2 className="text-4xl font-black mb-4">Interview Setup</h2>
                <p className="text-[var(--text-muted)] mb-8 font-medium italic">&quot;Preparation is the key to success. Let&apos;s get you ready.&quot;</p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-4">Welcome, <span className="text-indigo-600">{name || 'Candidate'}</span>!</h3>
                  </div>

                  {/* Name Input Field */}
                  <div>
                    <label className="block text-sm font-bold mb-2 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:border-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 ml-1">Upload Resume (PDF)</label>
                    <div className="relative group cursor-pointer h-32 border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-center hover:border-indigo-500 transition-colors bg-[var(--background)]">
                      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] group-hover:text-indigo-600 transition-colors">
                        <img src="/resume_icon.svg" alt="Resume" className="w-14 h-14 mb-2 opacity-90 group-hover:opacity-100 transition-opacity" />
                        <span className="font-bold">{file ? file.name : "Click to select file"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio Test Button */}
                  <div className="flex flex-col gap-2 w-full">
                    {feedback && (
                      <div className="text-red-500 text-xs font-bold animate-pulse flex items-center gap-1">
                        <AlertCircle size={14} /> {feedback}
                      </div>
                    )}
                    <div className="flex justify-between items-center w-full">
                      <button
                        onClick={() => {
                          unlockAudio();
                          speak("Checking audio system. If you can hear this, you are ready to proceed with the interview.");
                        }}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-2"
                      >
                        <Mic size={14} /> 1. Click to Unlock Audio
                      </button>

                      <button
                        onClick={() => speak("Verification successful. Audio is working perfectly.")}
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Volume2 size={14} /> 2. Test Voice
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleBeginInterview}
                    disabled={loading}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Analyzing Resume..." : "Begin Interview"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        )
      }

      {/* STAGE: INTERVIEW (Professional Video Call Redesign) */}
      {
        stage === 'interview' && (
          <main className="h-screen bg-[#fafbfc] flex flex-col p-4 md:p-6 lg:p-10 overflow-hidden font-sans relative">

            {/* AUDIO BLOCKED HELPER */}
            {audioBlocked && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
                <button
                  onClick={unlockAudio}
                  className="bg-yellow-400 text-black px-6 py-3 rounded-full font-black shadow-2xl border-4 border-black flex items-center gap-2"
                >
                  <Sun size={20} /> AUDIO BLOCKED: CLICK TO UNMUTE
                </button>
              </div>
            )}


            <div className="flex-1 flex flex-col lg:flex-row gap-8 h-full min-h-0">

              {/* LEFT: PROFESSIONAL VIDEO STAGE */}
              <div className={`flex-[2.5] flex flex-col relative rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl border-4 transition-all duration-500 ${isSpeaking ? 'border-blue-500 shadow-blue-500/20' : 'border-slate-800'}`}>
                
                {/* Agent Backdrop */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)' }}>
                  <div className="relative w-full h-full overflow-hidden shadow-2xl">
                    <video
                      ref={agentVideoRef}
                      src="/agent.mp4"
                      loop
                      muted
                      autoPlay
                      playsInline
                      className={`h-full w-full object-contain transition-all duration-700 ${isSpeaking ? 'opacity-100' : 'opacity-100'}`}
                      onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                    />
                    
                    {/* Wav2Lip Overlay Removed */}

                    {/* Glow ring when speaking */}
                    <div className={`absolute inset-0 transition-all duration-500 pointer-events-none rounded-inherit z-20 ${isSpeaking ? 'shadow-[inset_0_0_60px_rgba(99,102,241,0.15)]' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

                    {/* LIP SYNC BARS — driven by Web Audio API analyser, directly updated via DOM ref */}
                    {true && (
                      <div
                        className="absolute z-20 flex items-end justify-center gap-[4px]"
                        style={{ bottom: '27%', left: '50%', transform: 'translateX(-50%)', height: '24px', width: '72px' }}
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            ref={(el) => { if (el) lipSyncBarsRef.current[i] = el; }}
                            style={{
                              width: '8px',
                              height: '3px',        // starts flat — RAF loop updates this
                              borderRadius: '3px 3px 0 0',
                              background: isSpeaking
                                ? 'rgba(99,102,241,0.85)'   // indigo when speaking
                                : 'rgba(160,160,160,0.3)',   // grey when silent
                              transition: 'background 0.3s',
                              transformOrigin: 'bottom',
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* "SPEAKING" indicator badge */}
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${isSpeaking ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                      <div className="flex items-center gap-2 bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full shadow-xl border border-white/20">
                        <div className="flex gap-[3px] items-end h-4">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              ref={(el) => { if (el) lipSyncBarsRef.current[7 + i] = el; }}
                              style={{ width: '3px', height: '3px', background: 'white', borderRadius: '2px', transformOrigin: 'bottom' }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Speaking</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Row UI */}
                <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-30 pointer-events-none">

                  {/* Left: Security & Diagnostics */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 w-fit">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Link: Active</span>
                    </div>
                    <button 
                      onClick={() => { (window as any).location.reload(); }}
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 w-fit text-white/60 transition-all active:scale-95 group pointer-events-auto"
                    >
                      <Zap size={14} className="group-hover:text-yellow-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Diagnosis</span>
                    </button>
                  </div>

                  {/* User Camera PiP */}
                  <div className="w-56 aspect-video bg-slate-900 rounded-3xl border-4 border-slate-700 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform shrink-0 pointer-events-auto relative flex items-center justify-center">
                    <div className="absolute top-3 left-3 z-50">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 ${proctorStatus.face ? 'bg-green-500/90' : 'bg-red-500/90'} backdrop-blur-md rounded-full border border-white/20`}>
                        <div className={`w-1.5 h-1.5 bg-white rounded-full ${proctorStatus.face ? 'animate-pulse' : 'animate-ping'}`}></div>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">
                          {proctorStatus.face ? 'Face Detected' : 'No Face Detected'}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-3 z-40 flex flex-col items-end">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                            <Shield className="text-green-500 w-3 h-3" />
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-green-500">Secure</span>
                        </div>
                    </div>

                    <video
                      ref={(el) => {
                        (videoRef as any).current = el;
                        if (el && (currentStream || streamRef.current)) {
                          const s = currentStream || streamRef.current;
                          if (el.srcObject !== s) el.srcObject = s!;
                        }
                      }}
                      autoPlay muted playsInline
                      onCanPlay={(e) => (e.target as HTMLVideoElement).play().catch(() => { })}
                      className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-100"
                    />
                  </div>
                </div>

                {/* Bottom Thinking / Overlay Section */}
                <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center">
                  {/* Question Display Card (Replaced Thinking Bar) */}
                  <div className="w-full max-w-2xl px-6">
                    {question ? (
                      <div className="bg-white/95 backdrop-blur-xl border border-white/50 pt-8 pb-12 px-10 rounded-[2.5rem] shadow-2xl pointer-events-auto transition-all animate-in slide-in-from-bottom-5 duration-500 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Current Question</span>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-slate-800 leading-snug">
                          {question}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full max-w-xl mx-auto bg-white/90 backdrop-blur-md border border-slate-100 py-10 px-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center gap-3">
                        <div className="flex gap-2">
                          {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floating Mic Button */}
                  <div className="mt-[-30px] relative z-50 pointer-events-auto">
                    <button
                      onClick={() => {
                        console.log("🛠️ Manual Mic Reset Triggered");
                        try { recognitionRef.current?.abort(); } catch (e) { }
                        isStartingRef.current = false;
                        recognitionActiveRef.current = false;
                        isManualStopRef.current = false;
                        safeStartRecognition();
                      }}
                      className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-[0.1em] hover:bg-indigo-600 transition-all shadow-2xl border border-white/10 whitespace-nowrap hidden group-hover:block"
                    >
                      Reset Voice Engine
                    </button>
                    <div className="absolute inset-0 animate-ping bg-indigo-500/10 rounded-full"></div>
                    <button
                      onClick={() => {
                        if (isListening) {
                          isManualStopRef.current = true;
                          try { recognitionRef.current?.stop(); } catch (e) { }
                          setIsListening(false);
                        } else {
                          isManualStopRef.current = false;
                          try { recognitionRef.current?.start(); } catch (e) { }
                          setIsListening(true);
                        }
                      }}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_15px_30px_rgba(0,0,0,0.15)] relative ${isListening ? 'bg-red-500 text-white scale-110' : 'bg-white text-slate-600 hover:text-indigo-600'}`}>
                      <Mic size={28} strokeWidth={2.5} className={isListening && audioLevel > 5 ? 'scale-110' : ''} />
                      {/* Audio Pulse Ring */}
                      {isListening && (
                        <div className="absolute -inset-4 border-2 border-indigo-500/20 rounded-full animate-pulse transition-transform" style={{ scale: `${1 + (audioLevel / 50)}` }}></div>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: PROFESSIONAL SIDE PANEL */}
              <div className="lg:w-[32rem] flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-2">

                {/* Agent Profile Card */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <img src="/robot_avatar_new.png" alt="Agent" className="w-full h-full object-cover rounded-2xl" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-black text-slate-800">Agent Ishan</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active Now</span>
                    </div>
                  </div>
                </div>

                {/* Timer/Round Card */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Time Elapsed</span>
                    <span className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">{formatTime(elapsedTime)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</span>
                    <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">Round 1</div>
                  </div>
                </div>

                {/* Transcript Card */}
                <div className="bg-white flex flex-col gap-4 flex-1 min-h-[350px] rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group">
                  <div className="p-6 pb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Transcript</h3>
                    <div className="flex gap-2">
                      <div className="px-2 py-0.5 bg-red-500 text-white rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span> recording live
                      </div>
                      <div className="px-2 py-0.5 bg-green-100 text-green-600 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={8} /> accuracy optimized
                      </div>
                    </div>
                  </div>

                  <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar text-center flex flex-col items-center">
                    {!transcript && !interimTranscript ? (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">Listening for voice...</span>
                      </div>
                    ) : (
                      <div className="w-full h-auto py-4 text-base font-bold text-slate-800 leading-relaxed text-center whitespace-pre-wrap">
                        {transcript}
                        {interimTranscript && (
                          <span className="text-indigo-500 opacity-70">
                            {transcript ? " " : ""}{interimTranscript}
                          </span>
                        )}
                        <div ref={transcriptEndRef} className="h-0 w-0" />
                      </div>
                    )}
                  </div>

                  <div className="bg-indigo-50 py-3 mx-4 mb-2 rounded-xl text-center">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center gap-2">
                      <div className={`w-1.5 h-1.5 bg-indigo-500 rounded-full transition-all duration-75 ${audioLevel > 5 ? 'scale-[2.5] bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'animate-pulse'}`}></div>
                      {audioLevel > 5 ? "Capturing your voice..." : "Interviewer is listening"}
                    </span>
                  </div>

                  {/* HIGH-SENSITIVITY VOLUME METER */}
                  <div className="px-5 pb-4">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {new Array(30).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 transition-all duration-100 ${audioLevel > (i * 3) ? 'bg-indigo-500' : 'bg-slate-200 opacity-30'}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 px-1">
                      <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Silence</span>
                      <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Voice Peak</span>
                    </div>
                  </div>
                </div>

                {/* AI Evaluation Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">AI Evaluation Active</span>
                  </div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                </div>

                {/* Auto-Submit Alert Card */}
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Auto-Submit Active (10s Silence)</span>
                  </div>
                  <p className="text-[9px] text-blue-500 font-bold leading-relaxed ml-7">Answer will be submitted automatically after you stop speaking.</p>
                </div>

                {/* Actions Section */}
                <div className="mt-auto flex flex-col gap-3 py-2">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={loading || isSpeaking || fetchingQuestion || isTranscribing}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    {isTranscribing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        Transcribing...
                      </div>
                    ) : (
                      <>Submit & Proceed <ArrowRight size={20} /></>
                    )}
                  </button>

                  <button
                    onClick={handleEndInterview}
                    className="w-full py-4 text-slate-400 font-bold flex items-center justify-center gap-2 hover:text-slate-600 transition-all text-xs uppercase tracking-widest border border-slate-100 rounded-2xl"
                  >
                    <LogOut size={14} /> End Interview Session
                  </button>
                </div>
              </div>
            </div>

            {/* End Confirmation Modal (Integrated) */}
            {showEndConfirm && (
              <div className="fixed inset-0 z-[102] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[3.5rem] max-w-lg w-full text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <BarChart size={40} />
                  </div>
                  <h2 className="text-3xl font-black mb-4 text-slate-800 tracking-tight">Generate Final Report?</h2>
                  <p className="text-slate-500 mb-10 font-medium">This will end the interview and analyze your performance. You will receive a detailed PDF with score breakdowns.</p>

                  <div className="flex flex-col gap-4">
                    <button onClick={confirmEndInterview} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Generate My Report</button>

                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      Exit Without Report
                    </button>

                    <button onClick={() => setShowEndConfirm(false)} className="w-full py-3 text-slate-400 font-bold underline text-xs uppercase tracking-widest hover:text-slate-600">No, Continue Interview</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        )
      }

      {/* STAGE: RESULTS */}
      {
        stage === 'results' && (
          <main className="h-screen flex items-center justify-center p-8 bg-[var(--background)]">
            <div className="w-full max-w-2xl bg-[var(--card-bg)] p-12 rounded-[3.5rem] border border-[var(--border)] shadow-[0_30px_100px_rgba(0,0,0,0.2)] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-600 to-purple-600"></div>

              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
                <CheckCircle size={40} />
                <img src="/atlas_hero.png" className="absolute -top-10 -left-20 w-32 opacity-20 animate-float" />
              </div>

              <h1 className="text-4xl font-black mb-4">Interview Completed</h1>
              <p className="text-[var(--text-muted)] mb-10 font-medium">Great job! Your performance has been analyzed by our AI engine.</p>

              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="p-6 bg-[var(--background)] rounded-3xl border border-[var(--border)]">
                  <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Overall Score</div>
                  <div className="text-4xl font-black text-indigo-600">{reportData?.score || 0}%</div>
                </div>
                <div className="p-6 bg-[var(--background)] rounded-3xl border border-[var(--border)]">
                  <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Status</div>
                  <div className="text-xl font-black text-green-600">PASSED</div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 opacity-70">Recommended: Secure your performance certificate</p>
                  <button
                    onClick={() => handleDownloadReport(true)}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Monitor size={24} /> Download Final Report
                  </button>

                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <ArrowLeft size={18} /> Exit to Dashboard
                  </button>
                </div>

              </div>
            </div>
          </main>
        )
      }

      {/* STAGE: REPORT */}
      {
        stage === 'report' && (
          <main className="h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-2xl text-center bg-[var(--card-bg)] p-16 rounded-[3rem] border-8 border-red-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-4 bg-red-500"></div>
              <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Shield size={48} />
              </div>
              <h1 className="text-5xl font-black mb-6 tracking-tight">Access Terminated</h1>
              <p className="text-xl text-[var(--text-muted)] font-medium mb-12 leading-relaxed">
                Security proctoring detected multiple violations (Tab switching / Gadget detection / Loss of focus). A detailed incident report has been sent to the dashboard.
              </p>
              <div className="flex gap-4 justify-center">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Detailed incident evidence available below</p>
                  <button
                    onClick={() => handleDownloadReport(true)}
                    className="px-6 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center gap-2 active:scale-95"
                  >
                    <Monitor size={20} /> Download Incident Report
                  </button>

                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                  >
                    <ArrowLeft size={18} /> Exit
                  </button>
                </div>

              </div>
            </div>
          </main>
        )
      }

      {/* GLOBAL SECURITY OVERLAYS */}
      {
        showFullscreenWarn && (
          <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] max-w-lg text-center shadow-[0_0_50px_rgba(239,68,68,0.3)] border border-red-500/50 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-3xl font-black mb-2 text-red-600 tracking-tight">Return to Fullscreen</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">Exiting fullscreen mode is a security violation. You must stay in fullscreen to continue the interview.</p>

              <button
                onClick={() => {
                  enterFullScreen();
                  setShowFullscreenWarn(false);
                  showFullscreenWarnRef.current = false;
                }}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-500/30 active:scale-95"
              >
                Enter Fullscreen Now
              </button>
              <p className="mt-5 text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-50 inline-block px-3 py-1 rounded-full border border-red-100">
                Warning {fullscreenWarnCountRef.current} of 3
              </p>
            </div>
          </div>
        )
      }

      {
        showTabSwitchWarn && (
          <div className="fixed inset-0 z-[301] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] max-w-lg text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] border border-orange-500/50 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Monitor size={40} />
              </div>
              <h2 className="text-3xl font-black mb-2 text-orange-600 tracking-tight">Security Alert</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">Tab switching is strictly monitored. Please remain focused on this window to avoid immediate termination.</p>

              <button
                onClick={() => {
                  setShowTabSwitchWarn(false);
                  showTabSwitchWarnRef.current = false;
                  // Auto-resume logic
                  if (!showFullscreenWarnRef.current) {
                    if (stage === 'interview') {
                      speak("Returning to the interview. " + questionRef.current);
                    } else if (stage === 'code') {
                      speak("Returning to the coding challenge.");
                    }
                  }
                }}
                className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/30 active:scale-95"
              >
                I Understand
              </button>
              <p className="mt-5 text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-50 inline-block px-3 py-1 rounded-full border border-orange-100">
                {4 - tabSwitchCountRef.current} attempts remaining
              </p>
            </div>
          </div>
        )
      }

    </div >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
