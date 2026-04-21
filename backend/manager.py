import os
import re
import json
import time
import threading
import datetime
import PyPDF2
import random
from groq import Groq
import fitz
import cv2
import numpy as np
import base64
# Report Generation Imports
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xml.sax.saxutils import escape as xml_escape
import resume_analyzer # Import for ATS recommendations
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT

class InterviewManager:

    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.lock = threading.Lock() # For thread-safe operations during report generation
        # Check if the key is missing or is the default placeholder
        if not self.api_key or "your_groq_api_key_here" in self.api_key:
            print("[WARN] Warning: GROQ_API_KEY is missing or invalid. Running in Offline/Demo Mode.")
            self.client = None
        else:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Error initializing Groq client: {e}")
                self.client = None
        self.model_name = "llama-3.1-8b-instant"
        self.candidate_name = ""
        self.resume_text = ""
        self.projects_mentioned = []
        self.skills_mentioned = []
        self.technologies_mentioned = []
        self.core_subjects = []
        self.history = []
        self.evaluations = []
        self.submitted_solutions = []
        self.violations = [] # Track security violations
        self.proctor_score = 100 # New: Integrity/Proctoring Score
        self.start_time = datetime.datetime.now() # Approximate start
        self.session_id = str(int(time.time())) # Unique session for evidence isolation
        self.credit_consumed = False # Track if billing occurred for this session
        self.resume_path = None # Path to original resume PDF for auto-deletion
        self.resume_score = None # New: ATS Score from analysis
        self.resume_analysis_results = None # Full results from ATS engine
        self.module_topic = None # New: Specialized Assessment Module Topic (e.g. System Design)
        self.evidence_images = []  # Pre-decoded (path, label) tuples for past report generation
        self.candidate_photo = None # Base64 extracted photo from resume
        self.icebreaker_stage = 'start'
        self.icebreaker_count = 0
        self.max_icebreakers = 2
        self.asked_topics = []
        # STRICT INTERVIEW FLOW (Requested)
        self.plan_id = 0
        self.current_step = 0
        self.interview_flow = self._get_default_flow()

    def _get_default_flow(self, plan_id=0):
        """Standard full flow (Pro/Elite)"""
        return [
            "greeting",
            "warmup",
            "warmup",
            "intro",
            "resume_overview",
            "resume_skills",
            "resume_projects",
            "technical_core",
            "technical_advanced",
            "code",
            "code",
            "case_study",
            "scenario_behavioral",
            "scenario_hr",
            "leadership",
            "teamwork",
            "adaptability",
            "future_goals",
            "conclusion"
        ]

    def set_module_topic(self, topic):
        """Sets a specialized assessment topic (e.g. System Design, Technical Core)."""
        self.module_topic = topic
        if topic:
            print(f" ð¯ [MANAGER] Session Module set to: {topic}")

    def update_flow_for_plan(self, plan_id, practice_section=None):
        """Adjusts depth and length of interview based on plan ID or Practice Mode"""
        self.plan_id = int(plan_id)
        self.practice_mode = practice_section is not None
        self.practice_section = practice_section
        self.current_step = 0 # Restart always when plan context changes
        # 1. HANDLE PRACTICE MODE (Focused Sections)
        if self.practice_mode:
            if practice_section == 'intro':
                self.interview_flow = ["greeting", "warmup", "intro", "conclusion"]
            elif practice_section == 'projects':
                self.interview_flow = ["greeting", "resume_projects", "conclusion"]
            elif practice_section == 'technical':
                # Expanded technical flow to include case study and behavioral as requested
                self.interview_flow = ["greeting", "technical_core", "technical_advanced", "code", "case_study", "scenario_behavioral", "conclusion"]
            elif practice_section == 'case_study':
                # New dedicated case study section
                self.interview_flow = ["greeting", "case_study", "case_study", "conclusion"]
            elif practice_section == 'behavioral' or practice_section == 'hr':
                # Improved behavioral and HR drill flow
                self.interview_flow = ["greeting", "scenario_behavioral", "leadership", "adaptability", "teamwork", "conclusion"]
            else:
                self.interview_flow = ["greeting", "warmup", "conclusion"]
            print(f"ð¯ [FLOW] Practice Mode Activated: {practice_section}")
        # 2. HANDLE STANDARD PLAN FLOW
        elif self.plan_id == 1:
            # Starter / Trial: Fast 5-minute flow (Appx 5-6 questions)
            self.interview_flow = [
                "greeting",
                "warmup",
                "resume_overview",
                "resume_skills",
                "technical_core",
                "conclusion"
            ]
            print(f"ð [FLOW] Reduced Interview Flow for Starter Plan (Plan 1)")
        elif self.plan_id == 2:
            # ATS Pro: Strong technical deep dive (Appx 10-12 questions)
            self.interview_flow = [
                "greeting", "warmup", "warmup", "intro",
                "resume_overview", "resume_skills", "resume_projects",
                "technical_core", "technical_advanced",
                "code", "scenario_behavioral", "conclusion"
            ]
            print(f"ð [FLOW] Standard Flow for ATS Pro Plan (Plan 2)")
        elif self.plan_id == 3:
            # Proctor Elite: Full flow with all behavioral and teamwork rounds
            self.interview_flow = [
                "greeting", "warmup", "warmup", "intro",
                "resume_overview", "resume_skills", "resume_projects",
                "technical_core", "technical_advanced",
                "code", "code", "scenario_behavioral", "scenario_hr",
                "leadership", "teamwork", "adaptability", "conclusion"
            ]
            print(f"ð¡ï¸ [FLOW] Full Flow for Proctor Elite Plan (Plan 3)")
        elif self.plan_id == 4:
            # Ultimate Bundle (Plan 4): The exhaustive "Elite Ultra" flow
            self.interview_flow = self._get_default_flow()
            print(f"ð [FLOW] Full Elite Flow Activated (Plan {self.plan_id})")
        else:
            # Default/Free/Unknown: Very short demo flow (Appx 3-4 questions)
            self.interview_flow = [
                "greeting",
                "warmup",
                "resume_skills",
                "technical_core",
                "conclusion"
            ]
            print(f"ð [FLOW] Demo Flow Activated (Plan {self.plan_id})")
        with self.lock:
            self.history = []
            self.evaluations = []
            self.submitted_solutions = []
            self.violations = []
            self.proctor_score = 100
            self.evidence_path = None
            self.start_time = datetime.datetime.now()
            self.asked_topics = []
            self.icebreaker_count = 0
            self.icebreaker_stage = 'start'
            self.current_step = 0 # Reset flow step
            self.session_id = str(int(time.time())) # New session ID on reset
            print("ð Interview State Reset Successfully")

    def get_next_category(self):
        """STRICT FLOW CONTROLLER: Decides next stage and increments step"""
        with self.lock:
            if self.current_step >= len(self.interview_flow):
                return "conclusion"
            category = self.interview_flow[self.current_step]
            self.current_step += 1
            return category

    def generate_icebreaker_response(self, user_reply):
        """Generate a polite, brief acknowledgement to user's small talk"""
        if not self.client: return "That's good to hear. Let's proceed."
        try:
            prompt = f"""
            You are a professional, friendly AI interviewer. The candidate just replied to your small talk question.
            Candidate's Reply: "{user_reply}"
            Generate a brief, warm, natural response (1 sentence only).
            Example: "That sounds great, I'm glad to hear it." or "I understand, these interviews can be nervous."
            Do not ask another question yet. Just acknowledge.
            """
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=30,
                timeout=10.0
            )
            return response.choices[0].message.content.strip()
        except:
            return "That's good. Moving on."
    def load_resume(self, file_path):
        """Extracts text and metadata from PDF resume."""
        if not os.path.exists(file_path):
            return False, "File not found"
        
        text = ""
        try:
            # 1. Text Extraction with fitz (PyMuPDF)
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text()
            
            # 2. Extract Candidate Photo
            for page_index in range(len(doc)):
                page = doc[page_index]
                image_list = page.get_images(full=True)
                if image_list:
                    xref = image_list[0][0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    self.candidate_photo = base64.b64encode(image_bytes).decode('utf-8')
                    break
            doc.close()
            
            self.resume_text = text
            self.resume_path = file_path
            self._extract_entities(text)
            return True, "Resume loaded successfully"
        except Exception as e:
            print(f"Error loading resume: {e}")
            return False, str(e)

    def _extract_entities(self, text):
        """Parses resume text for skills and projects."""
        if not self.client: return
        prompt = f"Extract skills, projects, and subjects from: {text[:3000]}. Return JSON: {{\"skills\":[], \"projects\":[], \"subjects\":[]}}"
        try:
            response = self.client.chat.completions.create(model=self.model_name, messages=[{"role": "user", "content": prompt}], temperature=0.1)
            data = json.loads(re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group())
            self.skills_mentioned = data.get('skills', [])
            self.projects_mentioned = data.get('projects', [])
            self.core_subjects = data.get('subjects', [])
        except: pass

    def verify_candidate_match(self, name, resume_text):
        """Checks if registration name matches resume content."""
        if not name or not resume_text: return False, "Missing info"
        if name.lower() in resume_text.lower(): return True, name
        if not self.client: return False, "Unknown"
        prompt = f"Does '{name}' match any name in this resume? Snippet: {resume_text[:400]}. Return 'YES: [Name]' or 'NO'."
        try:
            res = self.client.chat.completions.create(model=self.model_name, messages=[{"role": "user", "content": prompt}]).choices[0].message.content
            if 'YES' in res.upper():
                return True, res.split(':')[-1].strip() if ':' in res else name
            return False, "Mismatch"
        except: return False, "Error"

    def analyze_resume(self):
        """Runs background ATS analysis."""
        if not self.resume_text: return
        try:
            results = resume_analyzer.analyze_resume_ats(self.resume_text, self.skills_mentioned)
            self.resume_analysis_results = results
            self.resume_score = results.get('score', 0)
        except Exception as e:
            print(f"Error in analyze_resume: {e}")

    def calculate_score(self):
        """Calculates final score by averaging evaluations and coding results."""
        total_score = 0
        points_count = 0
        # 1. Answer Evaluations (each worth up to 10 points)
        if self.evaluations:
            with self.lock:
                for e in self.evaluations:
                    s = self.sf(e.get('score', 0))
                    total_score += s
                    points_count += 1
        # 2. Coding Submissions (each worth up to 10 points)
        if self.submitted_solutions:
            for s in self.submitted_solutions:
                # If not already analyzed, analyze now
                if 'analysis' not in s:
                    try:
                        res = self.analyze_coding_submission(s)
                        s['analysis'] = res
                        # Extract a single score (Correctness is usually 1-10)
                        s['score'] = res.get('breakdown', {}).get('Correctness', 5)
                        # Carry over test case info if provided by frontend
                        s['test_cases_passed'] = res.get('test_cases_passed', s.get('test_cases_passed', 0))
                        s['total_test_cases'] = res.get('total_test_cases', s.get('total_test_cases', 0))
                    except:
                        s['score'] = 5 # Fallback
                total_score += self.sf(s.get('score', 0))
                points_count += 1
        if points_count == 0: return 0
        # Final Score as Percentage (total / (max_possible_10_per_item)) * 100
        percentage = (total_score / (points_count * 10)) * 100
        return int(percentage)

    def sf(self, v):
        """Safe Float converter - handles None and strings with numbers"""
        try:
            if v is None: return 0.0
            if isinstance(v, str):
                m = re.search(r'(\d+(\.\d+)?)', v)
                return float(m.group(1)) if m else 0.0
            return float(v)
        except: return 0.0

    def sj(self, v):
        """Safe Jump/Int converter - handles None"""
        try:
            if v is None: return 0
            if isinstance(v, str):
                m = re.search(r'\d+', v)
                return int(m.group()) if m else 0
            return int(v)
        except: return 0

    def create_performance_chart(self, filename="performance_chart.png"):
        """Create performance visualization chart"""
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
        fig = Figure(figsize=(8, 4))
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)
        categories = []
        scores = []
        with self.lock:
            for eval_item in self.evaluations:
                q_type = eval_item.get('type', 'General')
                score = self.sf(eval_item.get('score', 0))
                categories.append(q_type)
                scores.append(score)
        if not scores: return None
        # Aggregate by category
        from collections import defaultdict
        cat_scores = defaultdict(list)
        for cat, score in zip(categories, scores):
            cat_scores[cat].append(score)
        cat_names = list(cat_scores.keys())
        cat_avgs = [sum(v)/len(v) for v in cat_scores.values()]
        colors_list = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
        ax.barh(cat_names, cat_avgs, color=colors_list[:len(cat_names)])
        ax.set_xlabel('Average Score', fontsize=11, fontweight='bold')
        ax.set_title('Performance by Category', fontsize=13, fontweight='bold')
        ax.set_xlim(0, 10)
        ax.grid(axis='x', alpha=0.3)
        for i, v in enumerate(cat_avgs):
            ax.text(v + 0.2, i, f'{v:.1f}', va='center', fontweight='bold')
        fig.tight_layout()
        fig.savefig(filename, dpi=300, bbox_inches='tight')
        return filename

    def create_coding_chart(self, filename="coding_performance_chart.png"):
        """Create coding performance chart"""
        if not self.submitted_solutions: return None
        titles = [s.get('title', f"Prob {i+1}") for i, s in enumerate(self.submitted_solutions)]
        norm_scores = []
        for s in self.submitted_solutions:
             # Use AI score if test cases strictly not run, else use test cases
             passed = self.sj(s.get('test_cases_passed', 0))
             total = self.sj(s.get('total_test_cases', 0))
             if total > 0:
                 score = (passed / total) * 10
             else:
                 # Fallback to AI Correctness score if available
                 analysis = s.get('analysis', {})
                 score = analysis.get('breakdown', {}).get('Correctness', s.get('score', 5))
             norm_scores.append(self.sf(score))
        if not norm_scores: return None
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
        fig = Figure(figsize=(6, 4))
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)
        colors = ['#2ecc71' if s >= 7 else '#e74c3c' for s in norm_scores]
        ax.bar(titles, norm_scores, color=colors, width=0.5)
        ax.set_ylabel('Score (out of 10)')
        ax.set_title('Coding Problem Scores')
        ax.set_ylim(0, 10)
        fig.autofmt_xdate(rotation=45)
        fig.tight_layout()
        fig.savefig(filename, dpi=300)
        return filename

    def create_coding_skills_chart(self, filename="coding_skills_chart.png"):
        """Create coding skills breakdown chart based on actual metrics"""
        if not self.submitted_solutions: return None
        # Aggregating metrics across all solutions
        metrics = {
            "Code Quality": [],
            "Edge Cases": [],
            "Space Complexity": [],
            "Time Complexity": [],
            "Algorithm": [],
            "Correctness": []
        }
        for s in self.submitted_solutions:
            analysis = s.get('analysis', {})
            breakdown = analysis.get('breakdown', {})
            for key in metrics.keys():
                val = breakdown.get(key)
                if val is not None:
                    metrics[key].append(self.sf(val))
        # Calculate averages for each metric
        final_metrics = {}
        for k, v in metrics.items():
            if v:
                final_metrics[k] = sum(v) / len(v)
            else:
                # If no analysis, fallback to test case score
                passed = sum(self.sj(s.get('test_cases_passed', 0)) for s in self.submitted_solutions)
                total = sum(self.sj(s.get('total_test_cases', 0)) for s in self.submitted_solutions)
                final_metrics[k] = (passed / total * 10) if total > 0 else 5
        names = list(final_metrics.keys())
        values = [max(0, m) for m in final_metrics.values()]
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
        fig = Figure(figsize=(6, 4))
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)
        y_pos = range(len(names))
        ax.barh(y_pos, values, align='center', color='#3498db')
        ax.set_yticks(y_pos)
        ax.set_yticklabels(names)
        ax.invert_yaxis()  # labels read top-to-bottom
        ax.set_xlabel('Score')
        ax.set_title('Coding Skills Breakdown')
        ax.set_xlim(0, 10)
        ax.grid(axis='x', linestyle='--', alpha=0.7)
        for i, v in enumerate(values):
            ax.text(v + 0.1, i, f'{v:.1f}', va='center', fontweight='bold', fontsize=9)
        fig.tight_layout()
        fig.savefig(filename, dpi=300)
        return filename

    def create_cfk_chart(self, filename="cfk_chart.png"):
        """Create Confidence, Accuracy, Communication Skills chart"""
        if not self.evaluations: return None
        # Calculate averages
        total = len(self.evaluations)
        if total == 0: return None
        def safe_float(val, default=0.0):
            try:
                if val is None: return default
                return float(val)
            except (ValueError, TypeError):
                return default
        with self.lock:
            avg_conf = sum(safe_float(e.get('confidence', 0)) for e in self.evaluations) / total
            # Accuracy: Use technical_accuracy if available, else overall_score/score
            acc_sum = 0
            for e in self.evaluations:
                val = e.get('technical_accuracy')
                if val is None: val = e.get('score', e.get('overall_score', 0))
                acc_sum += safe_float(val)
            avg_acc = acc_sum / total
            # Communication
            avg_comm = sum(safe_float(e.get('communication_clarity', e.get('fluency', 0))) for e in self.evaluations) / total
        labels = ['Confidence', 'Accuracy', 'Comm Skills']
        values = [avg_conf, avg_acc, avg_comm]
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
        fig = Figure(figsize=(6, 4))
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)
        colors_list = ['#f1c40f', '#e67e22', '#3498db']
        bars = ax.bar(labels, values, color=colors_list)
        ax.set_ylim(0, 10)
        ax.set_ylabel('Score (0-10)')
        ax.set_title('Performance Metrics')
        for bar in bars:
            yval = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, yval + 0.1, f'{yval:.1f}', ha='center', fontweight='bold')
        fig.tight_layout()
        fig.savefig(filename, dpi=300)
        return filename
        return filename

    def create_overall_pie_chart(self, filename="overall_pie_chart.png"):
        """Create a pie chart showing Score Distribution by Topic"""
        if not self.evaluations and not self.submitted_solutions: return None
        # Aggregate scores by Topic
        topic_scores = {}
        total_possible = 0
        # 1. Theory Topics
        with self.lock:
            for e in self.evaluations:
                topic = e.get('type', 'General').replace('_', ' ').title()
                s = e.get('score', e.get('overall_score', 0))
                if s is None: s = 0
                if isinstance(s, str):
                    try:
                        match = re.search(r'(\d+(?:\.\d+)?)', s)
                        s = float(match.group(1)) if match else 0
                    except: s = 0
                topic_scores[topic] = topic_scores.get(topic, 0) + float(s)
                total_possible += 10
        # 2. Coding Topic
        if self.submitted_solutions:
             coding_total = 0
             for s in self.submitted_solutions:
                 passed = s.get('test_cases_passed', 0)
                 total = s.get('total_test_cases', 1) or 1
                 coding_total += (passed / total) * 10
                 total_possible += 10
             if coding_total > 0:
                topic_scores['Coding'] = topic_scores.get('Coding', 0) + coding_total
        if not topic_scores or total_possible == 0: return None
        # Prepare Data for Pie Chart (Grouped by major Category)
        # Mapping to consolidate 20+ sub-tags into 5 readable domains
        category_map = {
            'Technical': ['Technical', 'Technical Core', 'Technical Advanced', 'Technical Hr'],
            'Behavioral': ['Behavioral', 'Hr/Behavioral', 'Teamwork', 'Leadership', 'Adaptability', 'Future Goals', 'Scenario Hr', 'Scenario Behavioral'],
            'Resume & Projects': ['Resume Overview', 'Resume Skills', 'Resume Projects', 'Project', 'Internship'],
            'Coding': ['Coding'],
            'Intro/Basics': ['Intro', 'Warmup', 'Conclusion', 'Case Study']
        }
        grouped_scores = {}
        for category, sub_tags in category_map.items():
            s = 0
            for tag in sub_tags:
                tag_title = tag.title()
                if tag_title in topic_scores:
                    s += topic_scores.pop(tag_title)
            if s > 0:
                grouped_scores[category] = s
        # Any remaining topics not in map
        for topic, score in topic_scores.items():
            grouped_scores[topic] = grouped_scores.get(topic, 0) + score
        labels = list(grouped_scores.keys())
        sizes = list(grouped_scores.values())
        # Use a professional, consistent color palette
        colors_list = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#e74c3c']
        # Calculate overall gap
        remaining = total_possible - sum(sizes)
        if remaining > 0:
            labels.append('Gap')
            sizes.append(remaining)
            colors_list = colors_list[:len(labels)-1] + ['#ecf0f1'] # Light gray for gap
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
        fig = Figure(figsize=(8, 6)) # Larger canvas for legend
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)
        # Create Donut Chart (wedgeprops width creates the hole)
        wedges, texts, autotexts = ax.pie(
            sizes,
            autopct='%1.1f%%',
            startangle=140,
            colors=colors_list,
            pctdistance=0.75,
            wedgeprops=dict(width=0.4, edgecolor='w', linewidth=2)
        )
        # Clean up autotexts
        for i, a in enumerate(autotexts):
            if sizes[i] < (total_possible * 0.05): # Hide labels for tiny slivers
                a.set_text("")
            else:
                a.set_color('#1E3A5F')
                a.set_weight('bold')
                a.set_size(9)
        # Add Professional Legend at the side
        ax.legend(wedges, labels, title="Score Categories", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
        ax.set_title("Overall Score Percentage", pad=20, fontsize=14, weight='bold')
        fig.tight_layout()
        fig.subplots_adjust(right=0.75) # Make room for legend
        fig.savefig(filename, dpi=300, bbox_inches='tight')
        return filename
        return filename

    def generate_final_recommendation(self):
        """Generate a structured final recommendation using LLM"""
        if not self.client:
            return {
                "summary": "Review pending (Offline Mode).",
                "improvements": ["Ensure API key is set."],
                "next_steps": ["Check configuration."]
            }
        security_status_text = "Clean"
        if len(self.violations) >= 3:
            security_status_text = "TERMINATED due to multiple security violations"
        elif self.violations:
            security_status_text = "Warnings Issued"
        summary_prompt = f"""
        You are an expert AI Technical Interviewer creating a final report for candidate "{self.candidate_name}".
        Analyze the following interview performance data and generate a structured recommendation.
        Interview Data:
        - Overall Score: {self.calculate_score()}/100
        - Questions Answered: {len(self.evaluations)}
        - Coding Problems Solved: {len(self.submitted_solutions)}
        - Security Status: {security_status_text}
        Evaluations:
        {json.dumps([{'q': e.get('question'), 'score': e.get('score'), 'type': e.get('type')} for e in self.evaluations], indent=2)}
        Return a VALID JSON object with exactly these keys:
        {{
            "summary": "A balanced 100-word executive summary of performance and hiring recommendation.",
            "improvements": ["List of 3-4 specific areas where the candidate needs improvement (technical or soft skills)."],
            "next_steps": ["List of 3-4 actionable next steps or learning resources for the candidate to grow."]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "summary": "Candidate assessment complete. Performance data is available in the detailed report.",
                "improvements": ["Review technical concepts.", "Practice coding problems."],
                "next_steps": ["Focus on weak areas identified in the charts."]
            }

    def generate_pdf_report(self, filename, plan_id=0):
        """Generate a high-end corporate assessment report with premium styling."""
        ai_data = self.generate_final_recommendation()
        ai_summary = ai_data.get('summary', 'Evaluation complete.')
        
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph as RLParagraph, Spacer, Table, TableStyle, Image, PageBreak, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        import datetime
        import os
        import uuid

        margin = 0.6 * inch
        doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=margin, bottomMargin=margin, leftMargin=margin, rightMargin=margin)
        styles = getSampleStyleSheet()
        story = []
        temp_files = [] # To clean up charts
        
        # CORPORATE PALETTE
        C_MAIN = colors.HexColor('#1E293B')   # Navy Slate
        C_ACCENT = colors.HexColor('#2563EB') # Blue
        C_SUCCESS = colors.HexColor('#059669')# Emerald
        C_DANGER = colors.HexColor('#DC2626') # Red
        C_MUTED = colors.HexColor('#64748B')
        C_BG_LIGHT = colors.HexColor('#F8FAFC')
        C_BORDER = colors.HexColor('#E2E8F0')

        def safe_para(text, style, allow_xml=False):
            if not text: return RLParagraph("", style)
            if allow_xml: return RLParagraph(str(text), style)
            clean_text = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            return RLParagraph(clean_text, style)

        s_title = ParagraphStyle('Title', fontSize=22, leading=26, textColor=C_MAIN, fontName='Helvetica-Bold', spaceAfter=10)
        s_subtitle = ParagraphStyle('Sub', fontSize=10, textColor=C_MUTED, fontName='Helvetica-Bold', tracking=2)
        s_head = ParagraphStyle('Head', fontSize=14, leading=18, textColor=C_MAIN, fontName='Helvetica-Bold', spaceBefore=20, spaceAfter=8)
        s_norm = ParagraphStyle('Norm', fontSize=10, leading=14, textColor=colors.HexColor('#334155'), fontName='Helvetica')
        s_bold = ParagraphStyle('Bold', fontSize=10, leading=14, textColor=C_MAIN, fontName='Helvetica-Bold')
        s_badge = ParagraphStyle('Badge', fontSize=10, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER)
        
        # HEADER
        header_data = [[safe_para("ASSESSMENT REPORT", s_subtitle), safe_para(datetime.datetime.now().strftime("%d %b, %Y"), s_subtitle)]]
        header_tab = Table(header_data, colWidths=[5.3*inch, 2.1*inch])
        header_tab.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('BOTTOMPADDING', (0,0), (-1,-1), 12)]))
        story.append(header_tab)
        story.append(HRFlowable(width="100%", thickness=1.5, color=C_ACCENT, spaceAfter=20))

        # HERO SECTION
        ov_score = (self.calculate_score() / 10.0) if hasattr(self, 'calculate_score') else 0
        is_sec_fail = any(v.get('severity') == 'CRITICAL' for v in self.violations) or (hasattr(self, 'proctor_score') and self.proctor_score == 0)
        status_text, status_color = ("QUALIFIED", C_ACCENT)
        if is_sec_fail: status_text, status_color = ("SECURITY REJECTED", C_DANGER)
        elif ov_score >= 8.5: status_text, status_color = ("EXCEPTIONAL HIRE", C_SUCCESS)
        elif ov_score < 5.5: status_text, status_color = ("NOT RECOMMENDED", C_DANGER)

        story.append(safe_para((self.candidate_name or "CANDIDATE NAME").upper(), s_title))
        badge_tab = Table([[safe_para(status_text, s_badge)]], colWidths=[2.2*inch])
        badge_tab.setStyle(TableStyle([('BACKGROUND', (0,0), (0,0), status_color), ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6)]))
        story.append(badge_tab)
        story.append(Spacer(1, 0.3*inch))

        # STATS GRID
        with self.lock: evals_copy = list(self.evaluations)
        t_q = len(evals_copy) or 1
        avg_tech = sum(self.sf(e.get('score', 0)) for e in evals_copy) / t_q
        avg_comm = sum(self.sf(e.get('fluency', 0)) for e in evals_copy) / t_q
        stats_data = [
            [safe_para("OVERALL SCORE", s_subtitle), safe_para("TECHNICAL", s_subtitle), safe_para("COMMUNICATION", s_subtitle), safe_para("INTEGRITY", s_subtitle)],
            [safe_para(f'{ov_score:.1f}', s_title), safe_para(f'{avg_tech:.1f}', s_title), safe_para(f'{avg_comm:.1f}', s_title), safe_para(f'{getattr(self, "proctor_score", 100)}%', s_title)],
        ]
        stats_tab = Table(stats_data, colWidths=[1.8*inch]*4)
        stats_tab.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'LEFT'), ('TOPPADDING', (0,1), (-1,1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
        story.append(stats_tab)

        # EXECUTIVE SUMMARY
        story.append(safe_para("EXECUTIVE SUMMARY", s_head))
        sum_tab = Table([[safe_para(ai_summary, s_norm)]], colWidths=[7.2*inch])
        sum_tab.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), C_BG_LIGHT), ('BOX', (0,0), (-1,-1), 1, C_BORDER), ('PADDING', (0,0), (-1,-1), 20)]))
        story.append(sum_tab)

        # COMPETENCY MATRIX
        story.append(safe_para("DOMAIN SPECIFIC COMPETENCY", s_head))
        mat_data = [[safe_para("Domain / Competency", s_bold), safe_para("Rating", s_bold), safe_para("Evaluation", s_bold)]]
        groups = {"Technical Theory": [], "System Thinking": [], "Practical Coding": [], "Soft Skills": []}
        for e in evals_copy:
            cat = e.get('type', 'General').lower()
            val = self.sf(e.get('score', 0))
            if 'tech' in cat or 'theory' in cat: groups['Technical Theory'].append(val)
            elif 'case' in cat or 'scenario' in cat: groups['System Thinking'].append(val)
            elif 'code' in cat: groups['Practical Coding'].append(val)
            else: groups['Soft Skills'].append(val)
        for k, v in groups.items():
            avg = sum(v)/len(v) if v else 0
            label = "Expert" if avg >= 9 else "Proficient" if avg >= 7.5 else "Competent" if avg >= 5 else "Learning"
            if not v: label = "N/A"
            mat_data.append([safe_para(k, s_norm), safe_para(f'{avg:.1f}/10', s_bold), safe_para(label, s_norm)])
        mat_tab = Table(mat_data, colWidths=[3*inch, 1.5*inch, 2.7*inch])
        mat_tab.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,0), 2, C_MAIN), ('GRID', (0,0), (-1,-1), 0.5, C_BORDER), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]), ('PADDING', (0,0), (-1,-1), 10)]))
        story.append(mat_tab)

        if int(plan_id) <= 1:
            doc.build(story)
            return True

        # PAGE 2: PERFORMANCE VISUALIZATION (Plan 2+)
        try:
            story.append(PageBreak())
            story.append(safe_para("PERFORMANCE ANALYTICS", s_head))
            chart_file = f"temp_perf_{uuid.uuid4().hex}.png"
            if self.create_performance_chart(chart_file):
                story.append(Image(chart_file, width=6.5*inch, height=3.2 * inch))
                temp_files.append(chart_file)
            
            story.append(Spacer(1, 0.2*inch))
            story.append(safe_para("DETAILED BEHAVIORAL LOG", s_head))
            for i, ev in enumerate(evals_copy[:8], 1): # Limit log slightly for Page 2
                story.append(safe_para(f'ROUND {i:02d} • {ev.get("type", "General").upper()}', s_subtitle))
                story.append(safe_para(f"<b>Q:</b> {ev.get('question', '')}", s_norm, True))
                story.append(safe_para(f"<b>A:</b> {ev.get('answer', '')}", s_norm, True))
                story.append(safe_para(f"Segment Score: {ev.get('score', 0)}/10 | Fluency: {ev.get('fluency', 0)}/10", ParagraphStyle('Sc', fontSize=8, alignment=TA_RIGHT, textColor=C_ACCENT)))
                story.append(HRFlowable(width="100%", thickness=0.3, color=C_BORDER, spaceAfter=8))
        except: pass

        if int(plan_id) <= 1: # Basic fallback
            doc.build(story)
            for f in temp_files: 
                try: os.remove(f)
                except: pass
            return True

        # PAGE 3: ATS & RESUME INSIGHTS (Plan 2+)
        if int(plan_id) >= 2:
            story.append(PageBreak())
            story.append(safe_para("ATS & RESUME OPTIMIZATION", s_head))
            res_data = [
                [safe_para("ATS SCORE", s_subtitle), safe_para("RECOGNIZED FIELD", s_subtitle), safe_para("EXP LEVEL", s_subtitle)],
                [safe_para(f"{self.resume_score or 0}/100", s_title), safe_para(getattr(self, 'resume_analysis_results', {}).get('field', 'General'), s_title), safe_para(getattr(self, 'resume_analysis_results', {}).get('level', 'N/A'), s_title)]
            ]
            res_tab = Table(res_data, colWidths=[2.4*inch]*3)
            story.append(res_tab)
            story.append(Spacer(1, 0.2*inch))
            
            check = getattr(self, 'resume_analysis_results', {}).get('checklist', [])
            if check:
                story.append(safe_para("ATS COMPLIANCE CHECKLIST", s_subtitle))
                check_rows = []
                for item in check:
                    status = "YES" if item.get('found') else "NO"
                    color = C_SUCCESS if item.get('found') else C_DANGER
                    check_rows.append([safe_para(item.get('item'), s_norm), safe_para(status, ParagraphStyle('St', textColor=color, fontName='Helvetica-Bold'))])
                check_tab = Table(check_rows, colWidths=[5.5*inch, 1.2*inch])
                check_tab.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, C_BORDER), ('PADDING', (0,0), (-1,-1), 5)]))
                story.append(check_tab)

        if int(plan_id) <= 2:
            doc.build(story)
            for f in temp_files: 
                try: os.remove(f)
                except: pass
            return True

        # PAGE 4-5: CODING ANALYSIS (Plan 3+)
        if int(plan_id) >= 3 and self.submitted_solutions:
            story.append(PageBreak())
            story.append(safe_para("PRACTICAL CODING ANALYSIS", s_head))
            c_chart = f"temp_code_{uuid.uuid4().hex}.png"
            if self.create_coding_chart(c_chart):
                story.append(Image(c_chart, width=5.5*inch, height=3*inch))
                temp_files.append(c_chart)
            
            s_chart = f"temp_skills_{uuid.uuid4().hex}.png"
            if self.create_coding_skills_chart(s_chart):
                story.append(Image(s_chart, width=5.5*inch, height=3*inch))
                temp_files.append(s_chart)
            
            for sol in self.submitted_solutions:
                story.append(PageBreak())
                story.append(safe_para(f"SOLUTION: {sol.get('title', 'Unknown')}", s_head))
                story.append(safe_para(f"Language: {sol.get('language', 'N/A')} | Status: {sol.get('status', 'Completed')}", s_subtitle))
                code_bg = Table([[safe_para(f"<code>{sol.get('code', '')[:1500]}...</code>", ParagraphStyle('Code', fontName='Courier', fontSize=8, leading=10), True)]], colWidths=[7*inch])
                code_bg.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')), ('PADDING', (0,0), (-1,-1), 10)]))
                story.append(code_bg)
                
                # AI Feedback for code
                feedback = sol.get('analysis', {})
                if feedback:
                    story.append(safe_para("AI EVALUATION FEEDBACK", s_subtitle))
                    story.append(safe_para(feedback.get('feedback', ''), s_norm))
                    story.append(safe_para("<b>Key Improvements:</b> " + ", ".join(feedback.get('improvements', [])), s_norm, True))

        # PAGE 6-8: PROCTORING & SECURITY (Plan 3+)
        if int(plan_id) >= 3:
            self.collect_evidence()
            if self.evidence_images:
                story.append(PageBreak())
                story.append(safe_para("PROCTORING & FIDELITY LOG", s_head))
                rows = []
                # Limit images for Plan 3 (e.g. first 6), Plan 4 gets more (up to 15)
                max_imgs = 6 if int(plan_id) == 3 else 15
                for i in range(0, len(self.evidence_images[:max_imgs]), 3):
                    chunk = self.evidence_images[i:i+3]
                    img_row, lbl_row = [], []
                    for img_p, lbl in chunk:
                        try:
                            if os.path.exists(img_p):
                                img_row.append(Image(img_p, width=2.2*inch, height=1.6*inch))
                                lbl_row.append(safe_para(lbl, ParagraphStyle('L', fontSize=8, alignment=TA_CENTER, fontName='Helvetica-Bold', textColor=C_MUTED)))
                        except: continue
                    while len(img_row) < 3: img_row.append(None); lbl_row.append(None)
                    rows.extend([img_row, lbl_row, [Spacer(1, 0.2*inch)]*3])
                ev_tab = Table(rows, colWidths=[2.4*inch]*3)
                ev_tab.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
                story.append(ev_tab)

        doc.build(story)
        # Cleanup
        for f in temp_files:
            try: os.remove(f)
            except: pass
        return True

    def collect_evidence(self):
        """Finds evidence images captured during the proctoring session."""
        if not hasattr(self, 'evidence_path') or not self.evidence_path or not os.path.exists(self.evidence_path):
            return []
        
        found = []
        try:
            for f in os.listdir(self.evidence_path):
                if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                    full_path = os.path.join(self.evidence_path, f)
                    # Label based on filename patterns
                    label = "Monitor Flag"
                    if "multi_face" in f.lower(): label = "Multiple Faces"
                    elif "no_face" in f.lower(): label = "No Face Detected"
                    elif "phone" in f.lower(): label = "Device Usage"
                    elif "looking_away" in f.lower(): label = "Attention Warning"
                    found.append((full_path, label))
            
            # Sort by filename (timestamp approx)
            found.sort(key=lambda x: x[0])
            self.evidence_images = found
            return found
        except Exception as e:
            print(f"Error collecting evidence: {e}")
            return []

    def cleanup_session(self):
        """Removes sensitive files (resume, proctored images) from the server to save space and ensure privacy."""
        # 1. Delete Candidate Resume
        if hasattr(self, 'resume_path') and self.resume_path and os.path.exists(self.resume_path):
            try:
                os.remove(self.resume_path)
                print(f"🗑️ [CLEANUP] Deleted resume: {self.resume_path}")
            except Exception as e:
                print(f"⚠️ [CLEANUP] Could not delete resume: {e}")
            finally:
                self.resume_path = None
        
        # 2. Delete Proctoring Evidence (Directory or Specific Image)
        if hasattr(self, 'evidence_path') and self.evidence_path and os.path.exists(self.evidence_path):
            try:
                if os.path.isdir(self.evidence_path):
                    import shutil
                    shutil.rmtree(self.evidence_path)
                    print(f"🗑️ [CLEANUP] Deleted evidence folder: {self.evidence_path}")
                else:
                    os.remove(self.evidence_path)
                    print(f"🗑️ [CLEANUP] Deleted specific evidence image: {self.evidence_path}")
            except Exception as e:
                print(f"⚠️ [CLEANUP] Could not delete evidence at {self.evidence_path}: {e}")
            finally:
                self.evidence_path = None
        
        # 3. Clear transient data
        self.evidence_images = []
        self.candidate_photo = None
        self.violations = [] # Clear violations so next session starts fresh
    def analyze_coding_submission(self, submission):
        """
        Generates deep analysis for a coding submission using LLM.
        Returns a dictionary with structured feedback.
        """
        if not self.client:
            return {
                "breakdown": {"Correctness": 5, "Algorithm": 5, "Time Complexity": 5, "Space Complexity": 5, "Edge Cases": 5, "Code Quality": 5},
                "strengths": ["Code submitted successfully."],
                "improvements": ["Review logic for edge cases."],
                "feedback": "Detailed analysis unavailable in offline mode."
            }
        code = submission.get('code', '')
        title = submission.get('title', 'Unknown Problem')
        lang = submission.get('language', 'Unknown')
        prompt = f"""
        Act as a Senior Technical Interviewer. Analyze this candidate's code submission.
        Problem: {title}
        Language: {lang}
        Candidate's Code:
        ```
        {code[:3000]}
        ```
        Task: Provide a strict, critical assessment in JSON format.
        1. Evaluate 6 metrics (1-10 scores): Correctness, Algorithm, Time Complexity, Space Complexity, Edge Cases, Code Quality.
        2. "strengths": List 2-3 specific good points.
        3. "improvements": List 2-3 specific areas to improve (variable naming, efficiency, edge cases).
        4. "feedback": A 3-4 sentence professional summary of the code quality and approach.
        Return JSON ONLY:
        {{
            "breakdown": {{
                "Correctness": int,
                "Algorithm": int,
                "Time Complexity": int,
                "Space Complexity": int,
                "Edge Cases": int,
                "Code Quality": int
            }},
            "strengths": ["point 1", "point 2"],
            "improvements": ["point 1", "point 2"],
            "feedback": "summary text"
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                timeout=18.0
            )
            json_str = re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group()
            return json.loads(json_str)
        except Exception as e:
            print(f"Coding Analysis Error: {e}")
            return {
                "breakdown": {"Correctness": 0, "Algorithm": 0, "Time Complexity": 0, "Space Complexity": 0, "Edge Cases": 0, "Code Quality": 0},
                "strengths": ["Could not analyze."],
                "improvements": ["System error during analysis."],
                "feedback": "Analysis failed."
            }

    def generate_question(self, category='general', previous_answer=None):
        """Dynamic question generation based on real-time evaluation and resume parsing."""
        if not hasattr(self, 'model_name') or self.model_name == "llama-3.1-8b-instant":
            self.model_name = "llama-3.3-70b-versatile"
        self.current_category = category
        with self.lock:
            # Shared State Critical Section
            history_copy = list(self.history)
            previous_questions = [h.get('question') for h in history_copy if h.get('question')]
            eval_copy = list(self.evaluations)
            asked_topics_copy = list(self.asked_topics)
            resume_text_copy = self.resume_text
            candidate_name_copy = self.candidate_name
        if not self.resume_text or not self.client:
            # Category-aware fallback even in offline mode
            fallbacks = {
                'greeting': [f"Hello {self.candidate_name}. Welcome to your interview! How are you doing today?"],
                'warmup': [
                    "Great to have you here. Did you face any issues while reaching or connecting today?",
                    "How has your day been treating you so far?"
                ],
                'intro': ["To get us started, could you please provide a brief introduction about yourself and your background?"],
                'resume_overview': ["Looking at your profile, could you give me a high-level overview of your career and the key achievements you're most proud of?"],
                'resume_skills': ["I see several impressive skills listed. Which of these do you consider your primary expertise, and how have you applied it recently?"],
                'resume_projects': ["Your projects caught my eye. Can you walk me through the architecture and the most challenging technical part of your favorite project?"],
                'technical_core': ["Let's dive into some core concepts. How do you ensure your code is both efficient and maintainable in a production environment?"],
                'technical_advanced': ["Moving to advanced topics, what are your thoughts on modern system design patterns and how do you choose between them?"],
                'coding': [
                    "Let's transition to the coding round. Please check the editor for your first challenge. Good luck!",
                    "Now, let's move on to the second coding problem. You're doing well, please proceed."
                ],
                'case_study': [
                    "Let's look at a scenario. If you were task with scaling an application for millions of users, what would be your first steps?",
                    "How would you approach designing a system that requires extremely high availability?"
                ],
                'scenario_behavioral': ["Can you describe a situation where you had to adapt quickly to a major change in project scope or direction?"],
                'leadership': ["Have you ever had to lead a task or mentor a peer? How did you handle that responsibility and what was the outcome?"],
                'scenario_hr': ["Suppose you have a very tight deadline for a project. How do you manage your tasks and stress in such a situation?"],
                'teamwork': ["Tell me about your experience working in a team. How do you handle disagreements with colleagues?"],
                'adaptability': ["Tell me about a time when you received critical feedback. How did you process it and what changes did you make?"],
                'future_goals': ["Where do you see yourself in the next three to five years, and how does this role align with your professional goals?"],
                'conclusion': ["Thank you for participating in the interview. We will evaluate your responses and get back to you soon. Have a great day!"]
            }
            opts = fallbacks.get(category, ["Could you please tell me more about your recent professional experience?"])
            # Avoid repetition
            for opt in opts:
                if opt not in previous_questions:
                    with self.lock:
                        self.history.append({"question": opt, "category": category, "topic": "Fallback"})
                    return opt
            with self.lock:
                self.history.append({"question": opts[-1], "category": category, "topic": "Fallback"})
            return opts[-1]
        # 1. ADAPTIVE DIFFICULTY LOGIC
        avg_score = 0
        if eval_copy:
            avg_score = sum([e.get('score', 0) for e in eval_copy]) / len(eval_copy)
        # Difficulty Buckets: < 4 (Basic), 5-7 (Intermediate), > 8 (Expert/Arch)
        if avg_score < 4.5:
            difficulty_instruction = "Difficulty Level: BASIC/FUNDAMENTAL. The candidate is struggling; ask clear, foundational questions."
        elif avg_score >= 8.0:
            difficulty_instruction = "Difficulty Level: ADVANCED/ARCHITECTURE. The candidate is performing exceptionally; ask about implementation details, trade-offs, and system design."
        else:
            difficulty_instruction = "Difficulty Level: INTERMEDIATE. Focus on practical application and conceptual understanding."
        # Keep resume text within safe LLM limits
        trimmed_resume = resume_text_copy[:4000] if resume_text_copy else ""
        # 2. STEP-BASED CATEGORIZATION (Strict 9-Step Flow)
        if category == 'greeting':
            context = "Step 1: Greeting"
            context_instruction = f"Greet the candidate '{self.candidate_name}' warmly by name. Ask a single welcoming question, e.g., 'Hello, welcome to the interview. How are you doing today?'"
            self.current_topic = "Greeting"
        elif category == 'warmup':
            context = "Step 2: Basic Warm-up Questions"
            warmup_options = ["How has your day been so far?", "Did you face any challenges reaching here today?", "Are you ready to start the interview?"]
            remaining = [o for o in warmup_options if o not in previous_questions]
            topic_to_ask = remaining[0] if remaining else random.choice(warmup_options)
            context_instruction = f"Ask a casual warm-up question to make the candidate comfortable: {topic_to_ask}"
            self.current_topic = "Warm-up"
        elif category == 'intro':
            context = "Step 3: Self Introduction (MANDATORY)"
            context_instruction = "Ask the candidate: 'Please introduce yourself.' (MANDATORY)"
            self.current_topic = "Self Introduction"
        elif category in ['resume_overview', 'resume_skills', 'resume_projects', 'technical_core', 'technical_advanced', 'resume', 'technical']:
            # MODALITY OVERRIDE: If a specialized Assessment Module (Topic) is selected, prioritize it!
            if self.module_topic:
                context = f"Step: {category.upper()} [SPECIALIZED MODULE: {self.module_topic}]"
            else:
                context = f"Step: {category.upper().replace('_', ' ')}"
            all_topics = []
            # Module-Specific Topic Injection
            if self.module_topic:
                module_mapping = {
                    'Technical Core': ["Fundamental Logic", "Data Structures Efficiency", "Algorithm Choices", "Big O Complexity"],
                    'System Design': ["Microservices Architecture", "Load Balancing Strategies", "Database Sharding", "Caching Layers", "API Rate Limiting"],
                    'HR & Leadership': ["Conflict Resolution", "Strategic Vision", "Mentorship Experience", "Handling Resistance"],
                    'Data Intelligence': ["Neural Network Architecture", "Feature Engineering", "Data Pipeline Scalability", "Model Evaluation Metrics"],
                    'Project Deep-Dive': ["Detailed Architecture Walkthrough", "Technical Trade-offs", "Production Challenges", "Security Implementation"],
                    'Frontend Mastery': ["Web Performance Optimization", "State Management Patterns", "CSS/Layout Engineering", "React/Framework Internals"]
                }
                # If specific mapping exists, use it. Else use the topic string itself.
                module_topics = module_mapping.get(self.module_topic, [self.module_topic])
                all_topics.extend(module_topics)
            # Sub-category filtering (Always mix in some resume context if available, but keep module dominant)
            if 'resume' in category or 'overview' in category:
                if getattr(self, 'projects_mentioned', None): all_topics.extend([f"Project: {p}" for p in self.projects_mentioned])
                if not all_topics: all_topics.append("Your Overall Professional Journey")
            if 'skills' in category or 'technical' in category:
                if getattr(self, 'skills_mentioned', None): all_topics.extend([f"Skill: {s}" for s in self.skills_mentioned])
                if getattr(self, 'technologies_mentioned', None): all_topics.extend([f"Technology: {t}" for t in self.technologies_mentioned])
                if not all_topics: all_topics.append("Core Programming Principles")
            if 'advanced' in category:
                all_topics = ["System Architecture", "Performance Optimization", "Scalability Patterns", "Security Best Practices", "Distributed Systems"]
            if 'projects' in category:
                if getattr(self, 'projects_mentioned', None):
                    all_topics = [f"Project: {p}" for p in self.projects_mentioned]
                else:
                    all_topics = ["Major Technical Accomplishments", "Solving Complex Problems"]
            # SMART FALLBACK: If no topics found in resume, use diversified technical areas
            if not all_topics:
                fallback_tech_areas = [
                    "Problem Solving Approach", "Code Quality & Maintenance",
                    "Team Collaboration in Tech", "Learning New Technologies",
                    "Debugging Strategies", "System Reliability", "Scalability Concepts",
                    "Version Control Best Practices", "Testing Philosophy"
                ]
                all_topics = fallback_tech_areas
            remaining = [t for t in all_topics if t not in asked_topics_copy]
            # Prioritize fresh topics, then shuffle remaining to avoid predictable loops
            if remaining:
                topic_to_ask = remaining[0]
            else:
                shuffled_all = list(all_topics)
                random.shuffle(shuffled_all)
                topic_to_ask = shuffled_all[0]
            context_instruction = f"Generate a unique technical question about: {topic_to_ask}. DO NOT ask for a general 'tell me about your background'. Ask a specific 'How would you...' or 'Explain a time...' question."
            self.current_topic = topic_to_ask
        elif category == 'case_study':
            context = "Step 6: Case Study Questions"
            case_options = ["Scalability (Millions of users)", "Debugging (Production failure)", "API Design", "Data Consistency in Distributed Systems"]
            remaining = [o for o in case_options if o not in previous_questions]
            topic_to_ask = remaining[0] if remaining else random.choice(case_options)
            context_instruction = f"Ask a short real-world case study question related to {topic_to_ask}. Focus on technical thinking and problem-solving."
            self.current_topic = f"Case Study: {topic_to_ask}"
        elif category in ['behavioral', 'scenario_behavioral', 'scenario_hr', 'leadership', 'adaptability', 'teamwork', 'future_goals']:
            # HR MODULE OVERRIDE
            if self.module_topic == 'HR & Leadership':
                context = f"Phase: {category.upper()} [SPECIALIZED HR MODULE]"
                topic_options = {
                    'behavioral': ["Strategic Decision Making", "Handling Team Resistance", "Visionary Leadership"],
                    'scenario_behavioral': ["Budget/Resource Crisis", "Interpersonal Conflict", "Organizational Change"],
                    'leadership': ["Defining Technical Roadmaps", "Delegation Philosophy", "Building Engineering Culture"],
                    'teamwork': ["Stakeholder Negotiation", "Cross-team Collaboration"],
                    'future_goals': ["Professional Legacy", "Building Scalable Teams"]
                }
            else:
                context = f"Phase: {category.upper().replace('_', ' ')}"
                topic_options = {
                    'behavioral': ["Handling pressure", "Dealing with failure", "Learning from mistakes"],
                    'scenario_behavioral': ["Adapting to change", "Complex decision making", "Conflict with stakeholders"],
                    'scenario_hr': ["Company culture fit", "Long-term commitment", "Motivation"],
                    'leadership': ["Mentoring others", "Taking initiative", "Project ownership"],
                    'adaptability': ["Learning new tech", "Fast-paced environment"],
                    'teamwork': ["Collaborative coding", "Receiving feedback", "Team communication"],
                    'future_goals': ["Career growth", "Technical mastery", "Contribution to the field"]
                }
            # Use specific options if mapped, else default
            current_options = topic_options.get(category, ["Professional growth", "Team collaboration"])
            remaining = [o for o in current_options if o not in asked_topics_copy]
            topic_to_ask = remaining[0] if remaining else random.choice(current_options)
            context_instruction = f"Ask a {category.replace('_', ' ')} question about: {topic_to_ask}. Focus on real-world impact and candidate's specific behavior."
            self.current_topic = topic_to_ask
        elif category == 'coding':
            coding_count = sum(1 for h in self.history if h.get('category') == 'coding')
            self.current_topic = f"Coding Problem {coding_count + 1}"
            if coding_count == 0:
                return "Let's transition to the coding round. Please check the editor for your first challenge. Good luck!"
            else:
                return "Now, let's move on to the second coding problem. You're doing well, please proceed."
        elif category == 'conclusion':
            context = "Final Step: Conclusion"
            context_instruction = "Politely conclude the interview. Example: 'Thank you for participating. We will evaluate your responses.'"
            self.current_topic = "Conclusion"
        else:
            context = "Interview Interaction"
            context_instruction = "Continue the conversation naturally based on the interview progress."
            self.current_topic = "General"
        # 3. LLM PROMPT WITH STRICT MANDATE
        prompt = f"""
        Act as "Atlas", a professional senior-level male Technical Interviewer.
        Your persona is calm, authoritative but encouraging, and strictly masculine in tone and address.
        Generate a concise, natural-sounding interview question.
        CATEGORY: {category}
        TOPIC: {getattr(self, 'current_topic', 'General')}
        KNOWLEDGE CONTEXT: {context}
        # TRANSITION GUARD:
        # If this is the FIRST question of a new category, start with a professional transition.
        # Check if the previous question was in a different category.
        {f"TRANSITION REQUIRED: You are moving to a new part of the interview. Use a professional transition phrase like 'Moving on...' or 'Next, I'd like to ask...' before your question. DO NOT mention internal category names like '{category.upper()}' to the candidate." if self.history and self.history[-1]['category'] != category else ""}
        INSTRUCTION: {context_instruction}
        STRICT INTERACTION RULES:
        1. BE INTERACTIVE: If there is a "PREVIOUS ANSWER", you MUST acknowledge it warmly and naturally before asking the next question (e.g., "That sounds interesting," "I see," "Great point. Now..."). THIS IS VERY IMPORTANT.
        2. NO EVALUATION FEEDBACK: Do NOT tell the candidate if they are right or wrong. Do NOT give feedback on technical correctness. Just acknowledge conversationally.
        3. STRICT ORDER AND QUESTIONS: Ask ONLY ONE question at a time. Do not stack questions.
        4. NEVER REPEAT: Ensure the question is entirely different from the PREVIOUS QUESTIONS.
        5. BREVITY: Keep the response natural and under 40 words total.
        PREVIOUS ANSWER GIVEN BY CANDIDATE: {previous_answer if previous_answer else 'None provided or start of interview'}
        PREVIOUS QUESTIONS ALREADY ASKED: {previous_questions}
        RESUME TEXT: {trimmed_resume[:3000]}
        Return ONLY the exact text to be spoken by the interviewer. Do NOT wrap in quotes. No technical feedback. No acknowledgement like "Correct".
        Acknowledgement allowed ONLY if "PREVIOUS ANSWER" is provided (e.g., "Interesting point...").
        """
        try:
            # 3. LLM INVOCATION WITH REPETITION GUARD
            for attempt in range(3): # Max 3 attempts to get a non-duplicate
                try:
                    response = self.client.chat.completions.create(
                        model=self.model_name,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.85, # Slightly higher for more variety
                        max_tokens=150,
                        timeout=10.0
                    )
                    question_text = response.choices[0].message.content.strip().strip('"').strip()
                    # Prefix cleanup
                    if ":" in question_text[:20]:
                        question_text = question_text.split(":", 1)[1].strip()
                    # SEMANTIC REPETITION CHECK
                    is_duplicate = False
                    q_clean = re.sub(r'[^a-zA-Z0-9]', '', question_text.lower())
                    for prev in previous_questions:
                        prev_clean = re.sub(r'[^a-zA-Z0-9]', '', str(prev).lower())
                        # Check for high similarity or containment
                        if q_clean in prev_clean or prev_clean in q_clean or len(q_clean) < 15:
                            is_duplicate = True
                            break
                    if not is_duplicate:
                        break # Success!
                    else:
                        print(f"ð LLM Repeat Detected (Attempt {attempt+1}). Regenerating...")
                        # Update prompt for retry
                        prompt += "\n\nCRITICAL: The previous suggestion was a duplicate. You MUST generate a different question NOW."
                except Exception as e:
                    print(f"â Attempt {attempt+1} failed: {e}")
                    if attempt == 2: raise e
            # Track results
            with self.lock:
                if hasattr(self, 'current_topic') and self.current_topic not in self.asked_topics:
                    self.asked_topics.append(self.current_topic)
                self.history.append({"question": question_text, "category": category, "topic": getattr(self, 'current_topic', 'General')})
            return question_text
        except Exception as e:
            print(f"â Question Generation Error: {e}")
            fallback_options = [
                f"Could you elaborate on your experience with {getattr(self, 'current_topic', 'your core technologies')}?",
                f"Can you walk me through a complex problem you solved while working on {getattr(self, 'current_topic', 'your projects')}?",
                "What were the most significant technical challenges you faced in your most recent project?",
                f"How would you approach optimizing the performance of a task related to {getattr(self, 'current_topic', 'your field')}?",
                "Can you tell me more about your recent technical background?"
            ]
            # Repetition prevention in exception fallback too
            for opt in fallback_options:
                if opt not in previous_questions:
                    with self.lock:
                        self.history.append({"question": opt, "category": category, "topic": "Critical Fallback"})
                    return opt
            with self.lock:
                self.history.append({"question": fallback_options[-1], "category": category, "topic": "Critical Fallback"})
            return fallback_options[-1]

    def evaluate_answer(self, question, answer):
        """Evaluate the answer with CFK metrics"""
        # --- ICEBREAKER HANDLING REMOVED ---
        # Guard clause: Do not evaluate if question is missing
        if not question or not question.strip():
            return {"score": 0, "feedback": "System Error: Missing Question", "ignore": True}
        lower_ans = answer.lower().strip()
        # Taking "whatever they say" - removing strict 3-word filter and negative trigger zero-marks
        # Even short answers or "I don't know" will now be passed to the LLM for a natural conversational transition
        if not answer or len(answer.strip()) == 0:
            result = {
                "score": 0,
                "confidence": 0,
                "fluency": 0,
                "knowledge": 0,
                "feedback": "No response provided by the candidate.",
                "question": question,
                "answer": "No response",
                "type": getattr(self, 'current_category', "General"),
                "grammar_issues": "N/A"
            }
            self.evaluations.append(result)
            return result
        prompt = f"""
        Evaluate this interview answer.
        IMPORTANT: This text is a raw transcript from a browser's Speech-to-Text engine.
        It WILL have missing punctuation, phonetic errors (e.g., 'React JS' might be 'react choice', 'API' might be 'e-p-i'), and run-on sentences.
        TASK:
        1. RECOVER MEANING (CRITICAL): The candidate may be speaking in a LOW PITCH or LOW VOLUME. The transcript might be extremely whisper-like or fragmented. Extract EVERY technical keyword and intent even from single syllables.
        2. HIGH TOLERANCE: Do NOT penalize for "Noisy" or "Broken" text. These are expected due to low-volume capture. Focus on the raw intelligence of the response.
        3. BIAS TOWARDS CANDIDATE: If you detect even a hint of the correct technical concept, assume knowledge and give credit.
        4. "fluency" should measure the LOGICAL FLOW, not the capture quality.
        5. "confidence" should be derived from the correctness, NOT the loudness or text volume.
        6. Provide "feedback" that summarizes their technical strength.
        7. In "grammar_issues", list only MAJOR technical misstatements. Ignore all phonetic and transcription errors.
        Question: {question}
        Answer: {answer}
        Return JSON ONLY:
        {{
            "score": 0-10,
            "accuracy": 0-10,
            "depth": 0-10,
            "clarity": 0-10,
            "confidence": 0-10,
            "fluency": 0-10,
            "knowledge": 0-10,
            "feedback": "Constructive, professional feedback analyzing the candidate's answer strength.",
            "grammar_issues": "Major technical misstatements only."
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=300
            )
            json_str = re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group()
            result = json.loads(json_str)
            # Ensure full data structure is returned
            result['question'] = question
            result['answer'] = answer
            result['type'] = self.current_category if hasattr(self, 'current_category') else "General"
            # Defaults if missing
            if 'confidence' not in result: result['confidence'] = 5
            if 'fluency' not in result: result['fluency'] = 5
            if 'accuracy' not in result: result['accuracy'] = result.get('score', 5)
            if 'depth' not in result: result['depth'] = 5
            if 'clarity' not in result: result['clarity'] = 5
            if 'knowledge' not in result: result['knowledge'] = result.get('score', 5)
            # CRITICAL: Store in object state for tracking and reports
            with self.lock:
                self.evaluations.append(result)
            # UPDATE HISTORY for Adaptive Follow-ups
            # Find the last entry in history with this question and attach the answer
            for entry in reversed(self.history):
                if entry.get('question') == question:
                    entry['answer'] = answer
                    break
            return result
        except:
            return {
                "score": 5,
                "confidence": 5,
                "fluency": 5,
                "knowledge": 5,
                "feedback": "Could not evaluate automatically.",
                "grammar_issues": "N/A",
                "question": question,
                "answer": answer,
                "type": "General"
            }
