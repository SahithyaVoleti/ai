"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Editor from "@monaco-editor/react";
import "./practice.css";

/* ================= TYPES ================= */

type Language = "python" | "javascript" | "c" | "cpp" | "java" | "sql" | "go" | "ruby" | "swift" | "php";


type TestCase = {
    input: string;
    expected: string;
};

type Problem = {
    id: number;
    title: string;
    description: string;
    testCases: TestCase[];
    solution_approach?: string;
    time_complexity?: string;
    difficulty?: number;
};

/* ================= COMPONENT ================= */

export default function PracticePage() {
    const router = useRouter();
    const [problems, setProblems] = useState<Problem[]>([]);
    const [selected, setSelected] = useState<Problem | null>(null);
    const [language, setLanguage] = useState<Language>("python");
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("");
    const [warning, setWarning] = useState("");
    const [problemScores, setProblemScores] = useState<Record<number, number>>({});
    const [examViolated, setExamViolated] = useState(false);
    const [interviewMode, setInterviewMode] = useState(false);
    const [submittedProblems, setSubmittedProblems] = useState<Set<number>>(new Set());

    /* ============ LOAD PROBLEMS ============ */
    useEffect(() => {
        const loadProblems = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/get_problems");
                if (res.ok) {
                    const data = await res.json();
                    if (data.problems && data.problems.length > 0) {
                        setProblems(data.problems);
                        setInterviewMode(data.interview_mode);
                        setSelected(data.problems[0]); // Auto-select first problem
                        console.log("✅ Loaded problems from interview system");
                    } else {
                        loadDefaultProblems();
                    }
                } else {
                    loadDefaultProblems();
                }
            } catch (error) {
                console.log("⚠️ Backend not available, using default problems");
                loadDefaultProblems();
            }
        };

        loadProblems();
    }, []);

    const enterFullScreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log("Full screen request failed", err);
            });
        }
    };

    useEffect(() => {
        if (interviewMode) {
            enterFullScreen();
        }
    }, [interviewMode]);


    const loadDefaultProblems = () => {
        const defaultProblems: Problem[] = [
            {
                id: 1,
                title: "Check Even or Odd",
                description: `Given an integer n, print "Even" if n is even, otherwise print "Odd".`,
                testCases: [
                    { input: "4", expected: "Even" },
                    { input: "7", expected: "Odd" },
                ],
            },
            {
                id: 2,
                title: "Reverse a String",
                description: `Given a string, print the reversed string.`,
                testCases: [
                    { input: "hello", expected: "olleh" },
                    { input: "abcd", expected: "dcba" },
                ],
            },
            {
                id: 3,
                title: "Sum of Digits",
                description: `Given a number, print the sum of its digits.`,
                testCases: [
                    { input: "123", expected: "6" },
                    { input: "99", expected: "18" },
                ],
            },
        ];
        setProblems(defaultProblems);
        setSelected(defaultProblems[0]);
    };

    const TOTAL_MARKS = problems.length * 2;

    /* ============ TAB SWITCH DETECTION ============ */
    /* ============ TAB SWITCH DETECTION ============ */
    useEffect(() => {
        const handler = () => {
            if (document.hidden && interviewMode) {
                alert("⚠ Tab switch detected! Exam invalidated.");
                reportViolation("tab_switch");
            }
        };

        const fullScreenHandler = () => {
            if (!document.fullscreenElement && interviewMode) {
                alert("⚠ You have exited full screen mode! This is a violation.");
                reportViolation("fullscreen_exit");
                enterFullScreen();
            }
        };

        document.addEventListener("visibilitychange", handler);
        document.addEventListener("fullscreenchange", fullScreenHandler);

        return () => {
            document.removeEventListener("visibilitychange", handler);
            document.removeEventListener("fullscreenchange", fullScreenHandler);
        };
    }, [interviewMode]);

    const reportViolation = (type: string) => {
        setExamViolated(true);
        fetch("http://localhost:5000/api/report_violation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: type,
                timestamp: new Date().toISOString()
            }),
        }).catch(() => { });
    };

    /* ============ JUDGE0 LANGUAGE MAPPING ============ */
    const getLanguageId = (lang: Language): number => {
        const mapping: Record<string, number> = {
            "python": 71,       // Python 3.8.1
            "javascript": 63,   // Node.js 12.14.0
            "cpp": 54,         // C++ (GCC 9.2.0)
            "c": 50,           // C (GCC 9.2.0)
            "java": 62,        // Java (OpenJDK 13.0.1)
            "sql": 82          // SQL (SQLite 3.31.1)
        };
        return mapping[lang] || 71; // Default to Python
    };

    const runCode = async () => {
        if (!selected || examViolated) return;

        setOutput("⏳ Executing secure test blocks on backend...");

        let passed = 0;
        let logs: string[] = [];

        for (let i = 0; i < selected.testCases.length; i++) {
            const tc = selected.testCases[i];

            try {
                // CALLING OUR SECURE BACKEND RUNNER
                const res = await fetch("http://localhost:5000/api/run_code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language_id: getLanguageId(language),
                        source_code: code,
                        stdin: tc.input,
                    }),
                });

                const data = await res.json();
                
                if (res.status === 401) {
                    logs.push(`⚠️ Error: Server Judge0 Key Not Set (.env). Contact Admin.`);
                    break;
                }

                if (data.status === 'success') {
                    const actualResult = (data.stdout || "").trim();
                    const expectedResult = tc.expected.trim();

                    if (actualResult === expectedResult) {
                        passed++;
                        logs.push(`✅ Test Case ${i + 1}: Passed`);
                    } else {
                        logs.push(`❌ Test Case ${i + 1}: Failed`);
                        logs.push(`   Expected: [${expectedResult}]`);
                        logs.push(`   Got: [${actualResult}]`);
                    }
                } else {
                    logs.push(`❌ Test Case ${i + 1}: Compilation/Runtime Error`);
                    logs.push(`   Details: ${data.stderr || data.error || 'Check server logs'}`);
                    break;
                }
            } catch (err) {
                console.error("Execution error:", err);
                logs.push(`❌ Test Case ${i + 1}: Backend Connection Timeout`);
                break;
            }
        }

        if (!examViolated) {
            setProblemScores((prev) => ({ ...prev, [selected.id]: passed }));
        }

        logs.push("\n--------------------");
        logs.push(
            examViolated
                ? "❌ Violation Detected — Attempt Disqualified"
                : `Final Verification: ${passed} / ${selected.testCases.length} Test Blocks Passed`
        );

        setOutput(logs.join("\n"));
    };

    /* ============ SUBMIT CODE ============ */
    const submitCode = async () => {
        if (!selected || !code.trim() || examViolated) {
            alert("⚠️ Please write some code before submitting!");
            return;
        }

        if (submittedProblems.has(selected.id)) {
            alert("⚠️ You have already submitted this problem!");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to submit your solution for "${selected.title}"?\n\nYou cannot edit after submission.`
        );

        if (!confirmed) return;

        try {
            const submissionData = {
                problem_id: selected.id,
                title: selected.title,
                code: code,
                language: language,
                score: problemScores[selected.id] || 0,
                test_cases_passed: problemScores[selected.id] || 0,
                total_test_cases: selected.testCases.length,
                timestamp: new Date().toISOString(),
                violated: examViolated
            };

            const res = await fetch("http://localhost:5000/api/submit_code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submissionData),
            });

            if (res.ok) {
                alert("✅ Code submitted successfully!");

                // Mark as submitted
                setSubmittedProblems(prev => new Set([...prev, selected.id]));

                // Move to next problem
                const currentIndex = problems.findIndex(p => p.id === selected.id);
                if (currentIndex < problems.length - 1) {
                    const nextProblem = problems[currentIndex + 1];
                    setSelected(nextProblem);
                    setCode("");
                    setOutput("");
                    setWarning("");
                } else {
                    alert("🎉 All problems completed! You can close this window.\n\nThe interviewer will continue.");
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("⚠️ Could not connect to interview system. Please inform the interviewer.");
        }
    };

    const totalScore = Object.values(problemScores).reduce((a, b) => a + b, 0);

    return (
        <div className="parent">
            {/* Interview Mode Banner */}
            {interviewMode && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    background: examViolated ? "#f44336" : "#4CAF50",
                    color: "white",
                    padding: "10px 20px",
                    zIndex: 1000,
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "14px"
                }}>
                    {examViolated ? "⛔ EXAM INVALIDATED" : "🎙️ INTERVIEW MODE ACTIVE"}
                    <span style={{ marginLeft: "20px" }}>
                        Problems Submitted: {submittedProblems.size}/{problems.length}
                    </span>
                </div>
            )}

            {/* 1 – PROBLEM STATEMENT */}
            <div className="div1" style={{ marginTop: interviewMode ? "50px" : "0" }}>
                {selected ? (
                    <>
                        <h2>
                            {selected.title}
                            {submittedProblems.has(selected.id) && (
                                <span style={{
                                    marginLeft: "15px",
                                    fontSize: "14px",
                                    color: "#4CAF50",
                                    background: "#e8f5e9",
                                    padding: "5px 12px",
                                    borderRadius: "5px"
                                }}>
                                    ✓ Submitted
                                </span>
                            )}
                        </h2>
                        <p style={{ fontSize: "16px", lineHeight: "1.6" }}>{selected.description}</p>

                        {selected.solution_approach && (
                            <div style={{
                                marginTop: "15px",
                                padding: "12px",
                                background: "#f5f5f5",
                                borderRadius: "5px",
                                borderLeft: "4px solid #2196F3"
                            }}>
                                <strong>💡 Hint:</strong> {selected.solution_approach}
                            </div>
                        )}

                        {selected.time_complexity && (
                            <p style={{
                                marginTop: "10px",
                                fontSize: "13px",
                                color: "#666",
                                fontStyle: "italic"
                            }}>
                                <strong>Expected Time Complexity:</strong> {selected.time_complexity}
                            </p>
                        )}
                    </>
                ) : (
                    <h2>Select a problem from the list</h2>
                )}
            </div>

            {/* 2 – BUTTONS */}
            {/* 2 – MAIN TOOLBAR (Buttons + Lang + Score) */}
            <div className="div2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        disabled={submittedProblems.has(selected?.id || 0)}
                        className="language-dropdown"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="sql">SQL</option>
                        <option value="go">Go</option>
                        <option value="ruby">Ruby</option>
                        <option value="swift">Swift</option>
                        <option value="php">PHP</option>
                    </select>

                    {!examViolated && (
                        <span className="total-score">
                            Score: {totalScore} / {TOTAL_MARKS}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="run-btn"
                        onClick={runCode}
                        disabled={!selected || examViolated || submittedProblems.has(selected?.id || 0)}
                    >
                        ▶ Run
                    </button>

                    <button
                        onClick={submitCode}
                        disabled={!selected || examViolated || !code.trim() || submittedProblems.has(selected?.id || 0)}
                        className="submit-btn"
                        style={{
                            background: submittedProblems.has(selected?.id || 0) ? "#9E9E9E" : "#4CAF50",
                            cursor: submittedProblems.has(selected?.id || 0) ? "not-allowed" : "pointer",
                            opacity: submittedProblems.has(selected?.id || 0) ? 0.6 : 1
                        }}
                    >
                        {submittedProblems.has(selected?.id || 0) ? "✓ Submitted" : "Submit"}
                    </button>

                    {interviewMode && (
                        <button
                            onClick={() => window.location.href = "/?phase=hr"}
                            className="finish-btn"
                        >
                            Finish
                        </button>
                    )}
                </div>
            </div>

            {/* 3 – PROBLEM LIST */}
            <div className="div3">
                {problems.map((p) => (
                    <div
                        key={p.id}
                        className={`problem-item ${selected?.id === p.id ? "active" : ""}`}
                        onClick={() => {
                            setSelected(p);
                            setCode("");
                            setOutput("");
                            setWarning("");
                        }}
                        style={{
                            position: "relative",
                            opacity: submittedProblems.has(p.id) ? 0.7 : 1
                        }}
                    >
                        {submittedProblems.has(p.id) && (
                            <span style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#4CAF50",
                                fontSize: "18px"
                            }}>
                                ✓
                            </span>
                        )}
                        {p.id}. {p.title}
                        {!examViolated && problemScores[p.id] !== undefined && (
                            <span className="score">{problemScores[p.id]}/2</span>
                        )}
                    </div>
                ))}
            </div>

            {/* 5 – EDITOR */}
            <div className="div5">
                {warning && <div className="paste-warning">{warning}</div>}
                {submittedProblems.has(selected?.id || 0) && (
                    <div style={{
                        background: "#fff3cd",
                        color: "#856404",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "10px",
                        fontWeight: "bold"
                    }}>
                        ⓘ This problem has been submitted. Select another problem to continue.
                    </div>
                )}
                <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    options={{
                        readOnly: submittedProblems.has(selected?.id || 0),
                        minimap: { enabled: false }
                    }}
                    onMount={(editor) => {
                        editor.onDidPaste(() => {
                            if (interviewMode) {
                                setWarning("⚠ Pasting detected! Exam invalidated.");
                                setExamViolated(true);

                                fetch("http://localhost:5000/api/report_violation", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        type: "paste_detected",
                                        problem_id: selected?.id,
                                        timestamp: new Date().toISOString()
                                    }),
                                }).catch(() => { });
                            }
                        });
                    }}
                />
            </div>

            {/* 7 – Removed DIV7 (Merged to Toolbar) */}

            {/* 9 – OUTPUT */}
            <div className="div9">
                <pre className="output">
                    {output || "Run code to see test results"}
                </pre>
            </div>

        </div>
    );
}
