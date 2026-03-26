import os
import re
import json
import time
import threading
import datetime
import PyPDF2
import random
from groq import Groq

# Report Generation Imports
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xml.sax.saxutils import escape as xml_escape

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
            print("⚠️ Warning: GROQ_API_KEY is missing or invalid. Running in Offline/Demo Mode.")
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
        self.resume_path = None # Path to original resume PDF for auto-deletion
        
        self.icebreaker_stage = 'start'
        self.icebreaker_count = 0 
        self.max_icebreakers = 2 
        self.asked_topics = []
        
        # STRICT INTERVIEW FLOW (Requested)
        self.current_step = 0
        self.interview_flow = [
            "greeting",
            "warmup",
            "warmup",
            "intro",
            "resume_overview",
            "resume_skills",
            "resume_projects",
            "technical_core",
            "technical_advanced",
            "coding",
            "coding",
            "case_study",
            "scenario_behavioral",
            "scenario_hr",
            "leadership",
            "teamwork",
            "adaptability",
            "future_goals",
            "conclusion"
        ]

    def reset(self):
        """Reset the interview context for a fresh session"""
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
            print("🔄 Interview State Reset Successfully")

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

        # Logic for normal flow...
        # Since the original get_next_question logic is complex and relies on interview_flow/state which isn't fully visible here, 
        # I will assume the caller handles the 'real' questions if not returned here.
        # BUT wait, this function REPLACES the logic. I need to see the original logic to wrap it.
        # I don't see get_next_question in the provided view. I only see init and create_charts.
        # I will return a special marker or need to read the file deeper to find get_next_question.
        pass


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
                a.set_color('#2c3e50')
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

    def generate_pdf_report(self, filename):
        """Generate detailed PDF report matching provided template"""
        # Fetch AI Summary data
        ai_data = self.generate_final_recommendation()
        ai_summary = ai_data.get('summary', 'Evaluation complete.')
        ai_improvements = ai_data.get('improvements', [])
        ai_next_steps = ai_data.get('next_steps', [])

        doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []
        
        import uuid
        u_id = str(uuid.uuid4())[:8]
        
        # Styles
        def safe_para(text, style, allow_xml=False):
            """Helper to escape text for reportlab Paragraph to prevent XML parsing errors"""
            if not text: return RLParagraph("", style)
            if allow_xml:
                return RLParagraph(str(text), style)
            # Escape common XML characters that break reportlab
            clean_text = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            return RLParagraph(clean_text, style)
        
        # Redefine Paragraph locally to use RLParagraph but we'll use safe_para for dynamic content
        from reportlab.platypus import Paragraph as RLParagraph

        # Advanced Styles for Professional PDF
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, fontSize=28, spaceAfter=20, textColor=colors.HexColor('#001F3F'), fontName='Helvetica-Bold')
        header_bar_style = ParagraphStyle('HeaderBar', parent=styles['Normal'], alignment=1, fontSize=12, textColor=colors.white, fontName='Helvetica-Bold', leftIndent=0, rightIndent=0, spaceBefore=0, spaceAfter=0)
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=18, spaceBefore=20, spaceAfter=12, textColor=colors.HexColor('#2C3E50'), fontName='Helvetica-Bold')
        subheading_style = ParagraphStyle('SubHeading', parent=styles['Heading3'], fontSize=14, spaceBefore=12, spaceAfter=8, textColor=colors.HexColor('#34495E'), fontName='Helvetica-Bold')
        normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, leading=16, textColor=colors.HexColor('#333333'))
        label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#7F8C8D'), fontName='Helvetica-Bold')
        bold_text_style = ParagraphStyle('BoldText', parent=styles['Normal'], fontSize=11, leading=16, fontName='Helvetica-Bold', textColor=colors.HexColor('#333333'))
        
        box_content_style = ParagraphStyle('BoxContent', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#2C3E50'))
        justification_style = ParagraphStyle('Justification', parent=styles['Normal'], fontSize=10.5, leading=15, italic=True, textColor=colors.HexColor('#2C3E50'), leftIndent=10)
        
        # New styles for distinct boxes
        answer_box_style = ParagraphStyle('AnswerBox', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#1A2521'), leftIndent=8, rightIndent=8)
        interviewer_q_style = ParagraphStyle('InterviewerQ', parent=styles['Normal'], fontSize=11, leading=16, fontName='Helvetica-Bold', textColor=colors.HexColor('#001F3F'))
        round_header_style = ParagraphStyle('RoundHeader', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_LEFT)

        # 1. Page Header (Navy Bar)
        header_data = [[safe_para("OFFICIAL ASSESSMENT REPORT - CONFIDENTIAL", header_bar_style)]]
        header_table = Table(header_data, colWidths=[7.5*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#001F3F')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.4*inch))
        
        # 2. Main Title & Identity Card
        story.append(safe_para("AI CANDIDATE ASSESSMENT", title_style))
        story.append(Spacer(1, 0.1*inch))
        
        # THREAD SAFETY: Copy evaluations before starting PDF generation
        with self.lock:
            evals_copy = list(self.evaluations)
            
        # Calculate scores early to avoid duplication
        overall_score_raw = 0
        if evals_copy:
            overall_score_raw = self.calculate_score() / 10
        
        is_security_fail = any(v.get('severity') == 'CRITICAL' for v in self.violations) or self.proctor_score == 0
        
        status_text = "REVIEW REQUIRED"
        status_color = colors.HexColor('#F39C12') # Orange
        
        if is_security_fail:
            status_text = "FAILED (SECURITY)"
            status_color = colors.HexColor('#C0392B') # Dark Red
        elif overall_score_raw >= 8.5:
            status_text = "HIGHLY RECOMMENDED"
            status_color = colors.HexColor('#27AE60') # Green
        elif overall_score_raw >= 7.0:
            status_text = "QUALIFIED"
            status_color = colors.HexColor('#2ECC71') # Light Green
        elif overall_score_raw < 5.0:
            status_text = "NOT RECOMMENDED"
            status_color = colors.HexColor('#E74C3C') # Red

        # Identity Card Table - Premium Assessing Style
        # Identity Card Table - Vertically Stacked to match template
        identity_data = [
            [safe_para("Candidate Name:", label_style), safe_para(self.candidate_name or "N/A", bold_text_style)],
            [safe_para("Interview Date:", label_style), safe_para(self.start_time.strftime("%B %d, %Y"), bold_text_style)],
            [safe_para("Interview Time:", label_style), safe_para(self.start_time.strftime("%I:%M %p"), bold_text_style)],
            [safe_para("Total Questions:", label_style), safe_para(str(len(evals_copy)), bold_text_style)],
            [safe_para("Coding Problems:", label_style), safe_para(str(len(self.submitted_solutions)), bold_text_style)],
            [safe_para("Coding Correct:", label_style), safe_para(f"{sum(1 for s in self.submitted_solutions if s.get('status') == 'Correct')}/{len(self.submitted_solutions)}", bold_text_style)],
            [safe_para("Assessment Status:", label_style), safe_para(status_text, ParagraphStyle('Status', parent=bold_text_style, textColor=status_color, fontSize=11))],
            [safe_para("Overall Performance Score:", label_style), safe_para(f"{overall_score_raw:.1f}/10", bold_text_style)],
        ]
        
        id_table = Table(identity_data, colWidths=[2.5*inch, 2.5*inch, 2.4*inch])
        id_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F7F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D5DBDB')),
            ('GRID', (0,1), (-1,1), 0.5, colors.HexColor('#D5DBDB')), 
            ('GRID', (0,3), (-1,3), 0.5, colors.HexColor('#D5DBDB')), 
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,2), (-1,2), 8),
        ]))
        story.append(id_table)
        story.append(Spacer(1, 0.3*inch))
        # 3. Decision Justification (Beautifully Arranged)
        story.append(safe_para("EXECUTIVE SUMMARY", subheading_style))
        
        # Determine specific recommendation text
        justification_text = ai_summary
        rec_title = "QUALIFIED / SELECT"

        if is_security_fail:
            rec_title = "REJECTED (SECURITY VIOLATION)"
            justification_text = "CRITICAL: Multiple security violations detected. Proctored images indicate unauthorized assistance or identity mismatch. Immediate rejection recommended."
        elif overall_score_raw >= 8.5:
            rec_title = "HIGHLY RECOMMENDED (EXCEPTIONAL)"
        elif overall_score_raw >= 7.0:
            rec_title = "RECOMMENDED (STRONG CANDIDATE)"
        else:
            rec_title = "NOT RECOMMENDED (TECH GAPS)"

        # Recommendation Card (Big and Bold)
        rec_card_data = [
            [safe_para(f"<font size='14'><b>HIRING DECISION:</b> {rec_title}</font>", ParagraphStyle('RecTitleBig', parent=normal_style, textColor=status_color, alignment=1), allow_xml=True)],
            [safe_para(justification_text, ParagraphStyle('JustContent', parent=normal_style, fontSize=11, leading=15, alignment=1))]
        ]
        
        rt_table = Table(rec_card_data, colWidths=[7.4*inch])
        rt_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FDFEFE')),
            ('BOX', (0,0), (-1,-1), 2, status_color), # Border matching status color
            ('PADDING', (0,0), (-1,-1), 15),
            ('TOPPADDING', (0,0), (-1,0), 10),
        ]))
        story.append(rt_table)
        story.append(Spacer(1, 0.2*inch))
        
        # 3b. Areas of Growth (From AI Analysis)
        growth_data = [
            [safe_para("<b>KEY IMPROVEMENTS</b>", label_style, allow_xml=True), safe_para("<b>RECOMMENDED NEXT STEPS</b>", label_style, allow_xml=True)]
        ]
        
        imp_list = "\n".join([f"• {x}" for x in ai_improvements])
        next_list = "\n".join([f"• {x}" for x in ai_next_steps])
        
        growth_data.append([
            safe_para(imp_list.replace('\n', '<br/>'), normal_style, allow_xml=True),
            safe_para(next_list.replace('\n', '<br/>'), normal_style, allow_xml=True)
        ])
        
        growth_table = Table(growth_data, colWidths=[3.7*inch, 3.7*inch])
        growth_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D5D8DC')),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8F9F9')),
            ('PADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(growth_table)
        story.append(Spacer(1, 0.4*inch))

        # 4. Performance Dashboard (Key Metrics)
        story.append(safe_para("PERFORMANCE SCORECARD", subheading_style))
        
        # Metric Calculations
        total_qs = len(evals_copy)
        
        avg_accurcy = sum(self.sf(e.get('score', 0)) for e in evals_copy) / (total_qs or 1)
        avg_fluency = sum(self.sf(e.get('fluency', 0)) for e in evals_copy) / (total_qs or 1)
        avg_conf = sum(self.sf(e.get('confidence', 0)) for e in evals_copy) / (total_qs or 1)
        avg_comm = avg_fluency # Using fluency as comm score proxy
        trust_score = self.proctor_score
        
        metric_cards = [
            [
                safe_para(f"<font color='#001F3F' size='22'><b>{overall_score_raw:.1f}</b></font><br/><font color='#7F8C8D'>OVERALL PERFORMANCE</font>", ParagraphStyle('Card', alignment=1, leading=18), allow_xml=True),
                safe_para(f"<font color='#001F3F' size='22'><b>{avg_accurcy:.1f}</b></font><br/><font color='#7F8C8D'>TECH ACCURACY</font>", ParagraphStyle('Card', alignment=1, leading=18), allow_xml=True),
                safe_para(f"<font color='#001F3F' size='22'><b>{avg_fluency:.1f}</b></font><br/><font color='#7F8C8D'>COMM. SCORE</font>", ParagraphStyle('Card', alignment=1, leading=18), allow_xml=True),
                safe_para(f"<font color='#{'27AE60' if trust_score > 80 else 'E67E22' if trust_score > 50 else 'C0392B'}' size='22'><b>{trust_score}%</b></font><br/><font color='#7F8C8D'>TRUST ASST.</font>", ParagraphStyle('Card', alignment=1, leading=18), allow_xml=True)
            ]
        ]
        
        dash_table = Table(metric_cards, colWidths=[1.85*inch] * 4)
        dash_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#EFEFEF')),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FBFCFC')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 15),
            ('TOPPADDING', (0,0), (-1,-1), 15),
        ]))
        story.append(dash_table)
        story.append(Spacer(1, 0.4*inch))

        # PAGE BREAK FOR DETAILS
        story.append(PageBreak())
        
        # 5. TECHNICAL SKILLS ANALYSIS
        story.append(safe_para("TECHNICAL SKILLS ANALYSIS", heading_style))
        
        total_coding = len(self.submitted_solutions)
        coding_correct = sum(1 for s in self.submitted_solutions if s.get('test_cases_passed') == s.get('total_test_cases'))
        
        coding_avg = 0
        if total_coding > 0:
            total_ratio = sum(s.get('test_cases_passed', 0) / (s.get('total_test_cases', 1) or 1) for s in self.submitted_solutions)
            coding_avg = (total_ratio / total_coding) * 10
        
        skills_summary_data = [
            ["SKILL DOMAIN", "SCORE", "ASSESSMENT", "JUSTIFICATION"],
            ["Technical Accuracy", f"{avg_accurcy:.1f}/10", "EXCELLENT" if avg_accurcy >= 8.5 else "GOOD" if avg_accurcy >= 7.0 else "AVERAGE", "Response correctness across all modules."],
            ["Coding Proficiency", f"{coding_avg:.1f}/10", "PROFFICIENT" if coding_avg >= 8.0 else "DEVELOPING" if coding_avg >= 5.0 else "CRITICAL", "Test cases and logic complexity."],
            ["Speech & Formulation", f"{avg_fluency:.1f}/10", "PROFESSIONAL" if avg_fluency >= 8.0 else "CLEAR" if avg_fluency >= 6.0 else "SUPPORT NEEDED", "Verbal clarity and structural delivery."]
        ]
        
        skills_table = Table(skills_summary_data, colWidths=[2.2*inch, 1.2*inch, 1.3*inch, 2.7*inch])
        skills_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F4F6F7')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#2C3E50')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#DEDFE0')),
            ('PADDING', (0,0), (-1,-1), 10),
            ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ]))
        story.append(skills_table)
        story.append(Spacer(1, 0.4*inch))

        # 3b. SKILLS ASSESSMENT (Replacing Topic-Wise)
        from collections import defaultdict
        
        # Define categories explicitly
        skill_categories = {
            "Self-Introduction": [],
            "Project": [],
            "Internship": [],
            "Technical": [],
            "Coding": [],
            "HR/Behavioral": []
        }
        
        # Populate from Evaluations
        for e in evals_copy:
            cat = e.get('type', 'General')
            s = e.get('score', 0)
            if isinstance(s, str): 
                try: s = float(re.search(r'\d+', s).group())
                except: s = 0
                
            # Map API categories to Report Categories
            # Map API categories to Report Categories (9-step flow)
            if cat in ['intro', 'greeting', 'warmup']: skill_categories["Self-Introduction"].append(s)
            elif cat in ['project', 'resume']: skill_categories["Project"].append(s)
            elif cat == 'internship': skill_categories["Internship"].append(s)
            elif cat in ['technical', 'case_study']: skill_categories["Technical"].append(s)
            elif cat in ['hr_behavioral', 'behavioral', 'hr_scenario', 'teamwork', 'scenario']: 
                skill_categories["HR/Behavioral"].append(s)
            
        # Populate Coding Score
        if self.submitted_solutions:
             # Calculate avg passing rate * 10
             for s in self.submitted_solutions:
                 passed = s.get('test_cases_passed', 0)
                 total = s.get('total_test_cases', 1) or 1
                 skill_categories["Coding"].append((passed/total)*10)
        
        skills_data = [["Skill Area", "Average Score", "Assessment", "Justification"]]
        
        for skill, scores in skill_categories.items():
            avg = 0
            if scores:
                avg = sum(scores)/len(scores)
            
            # Determine assessment text
            assessment = "Not Attempted"
            just = "Phase not reached"
            if not scores: 
                assessment = "Not Attempted"
                just = "Candidate did not reach this stage."
            elif avg >= 8.5: 
                assessment = "Excellent"
                just = "Mastery demonstrated with precise answers."
            elif avg >= 7.0: 
                assessment = "Good"
                just = "Consistent performance with minor gaps."
            elif avg >= 5.0: 
                assessment = "Needs Improvement"
                just = "Conceptual understanding is fragmented."
            else: 
                assessment = "Critical"
                just = "Failed to answer fundamental questions."
            
            # ALWAYS add the row, even if empty
            skills_data.append([skill, f"{avg:.1f}/10", assessment, just])
            
        # Always append the table since we force rows now
        story.append(safe_para("SKILLS ASSESSMENT (BY MODULE)", heading_style))
        t_skills = Table(skills_data, colWidths=[1.8*inch, 1.2*inch, 1.4*inch, 3.0*inch], hAlign='LEFT')
        t_skills.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F3A52')), 
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'), 
            ('PADDING', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F9FBFC'), colors.white]), # Alternating stripes
            ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#1F3A52')),
        ]))
        story.append(t_skills)
        story.append(Spacer(1, 0.2*inch))
        
        # Main Performance Chart
        u_id = str(int(time.time())) + "_" + str(random.randint(1000, 9999))
        chart_file = self.create_performance_chart(f"perf_{u_id}.png")
        cfk_chart_file = self.create_cfk_chart(f"cfk_{u_id}.png")
        pie_chart_file = self.create_overall_pie_chart(f"pie_{u_id}.png")
        
        # Layout: Main Bar Chart (Top), CFK + Pie (Bottom Side-by-Side)
        if chart_file and os.path.exists(chart_file):
             story.append(Image(chart_file, width=5*inch, height=2.5*inch))
             story.append(Spacer(1, 0.1*inch))
             
        if cfk_chart_file and pie_chart_file and os.path.exists(cfk_chart_file) and os.path.exists(pie_chart_file):
            img_cfk = Image(cfk_chart_file, width=3.3*inch, height=2.2*inch)
            img_pie = Image(pie_chart_file, width=3.3*inch, height=2.2*inch)
            story.append(Table([[img_cfk, img_pie]], colWidths=[3.5*inch, 3.5*inch]))
        elif cfk_chart_file and os.path.exists(cfk_chart_file):
             story.append(Image(cfk_chart_file, width=4*inch, height=2.8*inch))
        elif pie_chart_file and os.path.exists(pie_chart_file):
             story.append(Image(pie_chart_file, width=4*inch, height=2.8*inch))
        
        # Track for cleanup
        temp_images = [chart_file, cfk_chart_file, pie_chart_file]
        
        story.append(Spacer(1, 0.2*inch))
        
        # STRENGTHS & WEAKNESSES SECTION
        story.append(safe_para("STRENGTHS & WEAKNESSES ANALYSIS", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Calculate key strengths/weaknesses dynamically
        strengths = []
        weaknesses = []
        
        # 1. Analyze Categories
        cat_scores = defaultdict(list)
        for e in evals_copy:
            cat = e.get('type', 'General').replace('_', ' ').title()
            # Handle score variation
            val = e.get('score', e.get('overall_score', 0))
            if isinstance(val, str):
                 try: val = float(re.search(r'\d+', val).group())
                 except: val = 0
            cat_scores[cat].append(float(val))
            
        # Add coding to categories
        if self.submitted_solutions:
             code_scores = []
             for s in self.submitted_solutions:
                 passed = s.get('test_cases_passed', 0)
                 total = s.get('total_test_cases', 1) or 1
                 code_scores.append((passed/total)*10)
             cat_scores['Coding Implementation'] = code_scores
             
        for cat, scores in cat_scores.items():
            avg = sum(scores)/len(scores)
            if avg >= 8.0: strengths.append(f"{cat} (Avg: {avg:.1f}/10)")
            elif avg < 6.0: weaknesses.append(f"{cat} (Avg: {avg:.1f}/10)")
            
        # 2. Analyze Specific Skills (Confidence, etc)
        # Reuse avg_conf, avg_comm from earlier
        if avg_conf >= 8.0: strengths.append(f"High Confidence ({avg_conf:.1f}/10)")
        elif avg_conf < 6.0: weaknesses.append(f"Low Confidence ({avg_conf:.1f}/10)")
        
        if avg_comm >= 8.0: strengths.append(f"Excellent Communication ({avg_comm:.1f}/10)")
        elif avg_comm < 6.0: weaknesses.append(f"Communication Gaps ({avg_comm:.1f}/10)")

        # Fallback if empty
        if not strengths: strengths.append("No specific strong areas identified yet.")
        if not weaknesses: weaknesses.append("No critical weaknesses detected.")

        # Create Two-Column Layout for S&W
        s_text = [safe_para("<b>STRONG IN:</b>", subheading_style, allow_xml=True)]
        for s in strengths[:5]: # Limit to top 5
            s_text.append(safe_para(f" • {s}", normal_style))
            
        w_text = [safe_para("<b>WEAK IN:</b>", subheading_style, allow_xml=True)]
        for w in weaknesses[:5]:
             w_text.append(safe_para(f" • {w}", normal_style))
             
        # Combine into a table
        sw_table = Table([[s_text, w_text]], colWidths=[3.5*inch, 3.5*inch])
        sw_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#e8f5e9')), # Greenish for Strength
            ('BACKGROUND', (1,0), (1,0), colors.HexColor('#ffebee')), # Reddish for Weakness
            ('PADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(sw_table)
        
        story.append(Spacer(1, 0.2*inch))

        story.append(Spacer(1, 0.2*inch))

        # 7. DETAILED INTERVIEW BREAKDOWN (Professional Interaction Log)
        story.append(safe_para("INTERACTION LOG & TRANSCRIPTS", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        if not evals_copy:
            story.append(safe_para("No verbal interaction data recorded.", normal_style))
        else:
            for i, eval_item in enumerate(evals_copy, 1):
                q_text = eval_item.get('question', 'N/A')
                a_text = eval_item.get('answer', 'No response recorded.')
                score = eval_item.get('score', 0)
                justification = eval_item.get('feedback', 'No detailed assessment provided.')
                q_cat = str(eval_item.get('type', 'General')).upper()
                
                # Interaction Block - Modern Styled Layout
                # 1. Round Header (Category + Number)
                round_header_table = Table([[safe_para(f"ROUND {i} | {q_cat}", round_header_style)]], colWidths=[7.2*inch])
                round_header_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#001F3F')),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                    ('TOPPADDING', (0,0), (-1,-1), 4),
                    ('LEFTPADDING', (0,0), (-1,-1), 10),
                ]))
                story.append(round_header_table)
                story.append(Spacer(1, 0.1*inch))
                
                # 2. Question Row
                story.append(safe_para(f"<b>INTERVIEWER:</b> {q_text}", interviewer_q_style, allow_xml=True))
                story.append(Spacer(1, 0.08*inch))
                
                # 3. Candidate Answer Box (Distinct Boxed Style)
                ans_box_data = [[safe_para("<b>CANDIDATE RESPONSE:</b>", label_style, allow_xml=True)],
                                [safe_para(a_text, answer_box_style)]]
                ans_table = Table(ans_box_data, colWidths=[7.0*inch])
                ans_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F7F6')), # Light mint/grey
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D1D8D6')),
                    ('TOPPADDING', (0,0), (-1,0), 6),
                    ('BOTTOMPADDING', (0,1), (-1,1), 10),
                    ('LEFTPADDING', (0,0), (-1,-1), 12),
                    ('RIGHTPADDING', (0,0), (-1,-1), 12),
                ]))
                story.append(ans_table)
                story.append(Spacer(1, 0.1*inch))
                
                # 4. Assessment Section
                # Score Badge
                numeric_score = self.sf(score)
                score_color = colors.HexColor('#27AE60') if numeric_score >= 8 else colors.HexColor('#F39C12') if numeric_score >= 6 else colors.HexColor('#C0392B')
                
                eval_data = [
                    [
                        safe_para(f"<b>JUSTIFICATION:</b> {justification}", justification_style, allow_xml=True),
                        Table([[safe_para(f"SCORE: {score}/10", ParagraphStyle('B', parent=bold_text_style, fontSize=9, textColor=colors.white, alignment=1))]], 
                              colWidths=[1.4*inch], style=[
                                  ('BACKGROUND', (0,0), (-1,-1), score_color),
                                  ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                                  ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                                  ('PADDING', (0,0), (-1,-1), 4),
                              ])
                    ]
                ]
                
                eval_table = Table(eval_data, colWidths=[5.4*inch, 1.6*inch])
                eval_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('ALIGN', (1,0), (1,0), 'RIGHT'),
                ]))
                story.append(eval_table)
                
                story.append(Spacer(1, 0.2*inch))
                story.append(Table([[""]], colWidths=[7.2*inch], rowHeights=[1], style=[('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7'))]))
                story.append(Spacer(1, 0.2*inch))

        # 7b. COMMUNICATION & GRAMMAR ANALYSIS
        story.append(safe_para("COMMUNICATION & GRAMMAR ANALYSIS", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        grammar_issues = [e.get('grammar_issues', 'None') for e in evals_copy if e.get('grammar_issues') and e.get('grammar_issues') != 'None']
        if grammar_issues:
             story.append(safe_para("<b>Analysis of Grammatical Accuracy and Fluency:</b>", subheading_style, allow_xml=True))
             for i, issue in enumerate(grammar_issues[:5]): # Top 5 issues
                 story.append(safe_para(f" • {issue}", normal_style))
        else:
             story.append(safe_para(" • No significant grammatical or fluency issues detected. Candidate maintains clear communication.", normal_style))
        story.append(Spacer(1, 0.2*inch))

        # 8. SECURITY VIOLATIONS SECTION (Summary Warning Only)
        if self.violations and len(self.violations) >= 3:
             story.append(safe_para("<b>CRITICAL: Security violations detected. See Proctoring Report at the end for details.</b>", ParagraphStyle('Warn', parent=styles['Normal'], textColor=colors.red), allow_xml=True))
             story.append(Spacer(1, 0.2*inch))

        # Coding Performance Analysis
        if self.submitted_solutions:
            story.append(safe_para("Coding Performance Analysis", heading_style))
            story.append(Spacer(1, 0.1*inch))
            
            # Create two charts side by side logic or stacked if easier
            # Chart 1: Problem Scores
            coding_chart_1 = self.create_coding_chart(f"code_p_{u_id}.png")
            # Chart 2: Skills Breakdown (New)
            coding_chart_2 = self.create_coding_skills_chart(f"code_s_{u_id}.png")
            
            # Table for side-by-side images
            if coding_chart_1 and coding_chart_2 and os.path.exists(coding_chart_1) and os.path.exists(coding_chart_2):
                img1 = Image(coding_chart_1, width=3.3*inch, height=2.4*inch)
                img2 = Image(coding_chart_2, width=3.3*inch, height=2.4*inch)
                chart_table = Table([[img1, img2]], colWidths=[3.5*inch, 3.5*inch])
                story.append(chart_table)
            elif coding_chart_1 and os.path.exists(coding_chart_1):
                story.append(Image(coding_chart_1, width=5*inch, height=3*inch))
            
            # Add to cleanup
            temp_images.extend([coding_chart_1, coding_chart_2])

            story.append(Spacer(1, 0.2*inch))

            # Detailed Coding Table
            # DETAILED CODING ANALYSIS (Deep Dive)
        # Only break page if coding section was significant
        if len(self.submitted_solutions) > 1:
            story.append(PageBreak())
        else:
            story.append(Spacer(1, 0.4*inch))
            story.append(safe_para("TECHNICAL CODING EVALUATION", title_style))
            story.append(Spacer(1, 0.2*inch))
            story.append(Spacer(1, 0.1*inch))
            
            for index, s in enumerate(self.submitted_solutions, 1):
                title = s.get('title', f'Problem {index}')
                lang = s.get('language', 'Unknown')
                # Use cached analysis if available
                analysis = s.get('analysis')
                if not analysis and self.client:
                    analysis = self.analyze_coding_submission(s)
                    s['analysis'] = analysis
                
                if not analysis:
                    analysis = {"breakdown": {}, "strengths": [], "improvements": [], "feedback": "Evaluation unavailable."}

                # 1. Problem Header
                story.append(safe_para(f"Problem {index}: {title}", subheading_style))
                
                # Calculate metrics for the coding submission
                passed = s.get('test_cases_passed', 0)
                total = s.get('total_test_cases', 1) or 1
                score = s.get('score', 0)
                status = "COMPLETED" if passed == total else "PARTIAL" if passed > 0 else "FAILED"

                # 2. Key Metrics Table
                metrics_data = [
                    ["Difficulty:", "Medium (Est)"], 
                    ["Status:", status], 
                    ["Score:", f"{score}/10"],
                    ["Test Cases:", f"{passed}/{total}"],
                    ["Language:", str(lang).capitalize()]
                ]
                m_table = Table(metrics_data, colWidths=[2*inch, 4.5*inch], hAlign='LEFT')
                m_table.setStyle(TableStyle([
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f0f0f0')),
                    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                    ('PADDING', (0,0), (-1,-1), 6),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ]))
                story.append(m_table)
                story.append(Spacer(1, 0.1*inch))

                # 2b. Submitted Code Box
                code_label_style = ParagraphStyle('SmallBoldCodeLabel', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', spaceAfter=5)
                story.append(safe_para("<b>SUBMITTED SOLUTION:</b>", code_label_style, allow_xml=True))
                code_body = s.get('code', '// No code was submitted.')
                # Formatting code with basic syntax-like indent handling
                formatted_code = code_body.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>').replace('  ', '&nbsp;&nbsp;')
                
                code_style = ParagraphStyle('CodeBox', parent=styles['Normal'], fontName='Courier', fontSize=8, leading=10, textColor=colors.white)
                
                c_table = Table([[safe_para(formatted_code, code_style, allow_xml=True)]], colWidths=[6.7*inch])
                c_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1e1e1e')), # Visual Studio Dark style
                    ('PADDING', (0,0), (-1,-1), 12),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.black),
                ]))
                story.append(c_table)
                story.append(Spacer(1, 0.15*inch))

                # 3. Evaluation Breakdown & Feedback
                story.append(safe_para("<b>EVALUATION & TECHNICAL FEEDBACK</b>", code_label_style))
                
                breakdown = analysis.get('breakdown', {})
                bd_data = [["Metric", "Rating", "Observation"]]
                
                # Dynamic technical observations
                obs_map = {
                    "Correctness": "Logic accuracy and output verification.",
                    "Efficiency": "Time & Space complexity optimization.",
                    "Readability": "Naming conventions and clean code.",
                    "Logic": "Algorithmic thinking and approach."
                }
                
                for k, v in breakdown.items():
                    bd_data.append([k, f"{v}/10", obs_map.get(k, "Technical Assessment")])
                
                if len(bd_data) > 1:
                    bd_table = Table(bd_data, colWidths=[1.8*inch, 1.2*inch, 4.0*inch], hAlign='LEFT')
                    bd_table.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8F9F9')),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7')),
                        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                        ('ALIGN', (1,0), (1,-1), 'CENTER'),
                        ('PADDING', (0,0), (-1,-1), 8),
                    ]))
                    story.append(bd_table)
                    story.append(Spacer(1, 0.15*inch))
                
                # Feedback Box
                feedback_text = analysis.get('feedback', 'No detailed feedback available.')
                f_data = [[safe_para("<b>TECHNICAL SUMMARY:</b>", label_style, allow_xml=True)],
                        [safe_para(feedback_text, normal_style)]]
                f_table = Table(f_data, colWidths=[7.0*inch])
                f_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FDFEFE')),
                    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#D5DBDB')),
                    ('PADDING', (0,0), (-1,-1), 10),
                ]))
                story.append(f_table)
                
                story.append(Spacer(1, 0.3*inch))
            
            story.append(Spacer(1, 0.2*inch))

        story.append(PageBreak())

        # Question Breakdown removed to use new styled version
        
        story.append(PageBreak())

        # 6. Final Recommendation
        story.append(safe_para("FINAL RECOMMENDATION", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        rec_data = self.generate_final_recommendation()
        
        # A. Executive Summary
        if isinstance(rec_data, dict):
             summary_text = rec_data.get('summary', 'No summary available.')
             improvements = rec_data.get('improvements', [])
             next_steps = rec_data.get('next_steps', [])
        else:
             summary_text = str(rec_data)
             improvements = []
             next_steps = []

        # --- RECOMENDATION CONTAINER TABLE (Bordered) ---
        rec_box_data = []
        rec_box_data.append([safe_para("<b>Executive Summary:</b>", subheading_style, allow_xml=True)])
        rec_box_data.append([safe_para(summary_text, normal_style)])
        rec_box_data.append([Spacer(1, 0.08*inch)])
        
        # B. Areas for Improvement
        if improvements:
            rec_box_data.append([safe_para("<b>Areas for Improvement:</b>", subheading_style, allow_xml=True)])
            for item in improvements:
                rec_box_data.append([safe_para(f"• {item}", normal_style)])
            rec_box_data.append([Spacer(1, 0.08*inch)])
            
        # C. Recommended Next Steps
        if next_steps:
             rec_box_data.append([safe_para("<b>Remarks & Next Steps:</b>", subheading_style, allow_xml=True)])
             for item in next_steps:
                 rec_box_data.append([safe_para(f"• {item}", normal_style)])

        # Single styled container covering all texts in a single frame box border
        rec_table = Table(rec_box_data, colWidths=[7.2*inch])
        rec_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D1D8D6')),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFFFF')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(rec_table)
        story.append(Spacer(1, 0.2*inch))

        # 6a. INTERVIEW RUBRIC (User Requested Format)
        story.append(safe_para("INTERVIEW RUBRIC ASSESSMENT", heading_style))
        story.append(Spacer(1, 0.1*inch))
        
        def calculate_category_score(cat):
            cat_items = [e for e in evals_copy if str(e.get('type', 'General')).upper() == cat.upper()]
            if not cat_items:
                return 0, "No questions evaluated in this category."
            
            avg_cat_score = sum([self.sf(e.get('score', 0)) for e in cat_items]) / len(cat_items)
            notes = "Needs Improvement" if avg_cat_score < 5 else "Satisfactory" if avg_cat_score < 7 else "Good" if avg_cat_score < 9 else "Excellent"
            return avg_cat_score, notes

        # Table Header
        rubric_data = [
            ["FACTORS", "Candidate Score (1-10)", "Assessment Notes"]
        ]
        
        categories = sorted(list(set([str(e.get('type', 'General')).capitalize() for e in evals_copy])))
        total_category_scores = []
        for f in categories:
            s, n = calculate_category_score(f)
            rubric_data.append([f, f"{s:.1f}/10", n])
            total_category_scores.append(s)
            
        # Add Average Row
        avg_rubric = sum(total_category_scores) / len(total_category_scores) if total_category_scores else 0
        rubric_data.append(["AVERAGE SCORE", f"{avg_rubric:.1f}/10", ""])

        rubric_table = Table(rubric_data, colWidths=[2.5*inch, 1.5*inch, 3*inch])
        rubric_tableStyle = TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.white),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#001F3F')), # Navy Header
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ALIGN', (1,0), (1,-1), 'CENTER'), # Center scores
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F2F4F7'), colors.white]),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'), # Footer Bold
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f0f0')), # Footer Grey
            ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#001F3F')), 
            ('PADDING', (0,0), (-1,-1), 8),
        ])
        rubric_table.setStyle(rubric_tableStyle)
        
        story.append(rubric_table)
        story.append(Spacer(1, 0.3*inch))
            
        
        # 7. PROCTORING REPORT (New Section)
        story.append(safe_para("PROCTORING & INTEGRITY REPORT", title_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Determine Risk Level
        risk_level = "LOW"
        risk_color = colors.green
        
        # Check for Critical Integrity Violations
        is_cheating = any(v.get('type') == 'CHEATING_DEVICE_DETECTED' for v in self.violations)
        
        if is_cheating or self.proctor_score == 0:
            self.proctor_score = 0
            risk_level = "FAILED – CHEATING"
            risk_color = colors.red
        elif self.proctor_score < 50:
            risk_level = "HIGH"
            risk_color = colors.red
        elif self.proctor_score < 80:
            risk_level = "MEDIUM"
            risk_color = colors.orange

        story.append(safe_para(f"<b>Trust Score:</b> {self.proctor_score}/100", subheading_style, allow_xml=True))
        story.append(safe_para(f"<b>Status:</b> <font color='{risk_color}'>{risk_level}</font>", subheading_style, allow_xml=True))
        if is_cheating:
             story.append(safe_para(f"<b>Reason:</b> Mobile device detected during session.", normal_style, allow_xml=True))
        story.append(Spacer(1, 0.2*inch))

        if self.violations:
             # Aggregate violations by Type + Clean Message
             violation_counts = {}
             for v in self.violations:
                 # Ensure v is treated as a dictionary
                 if isinstance(v, dict):
                     v_type = v.get('type', 'Violation')
                     msg = v.get('message', 'Unspecified violation')
                     sev = v.get('severity', 'MEDIUM')
                 else:
                     v_type = 'Violation'
                     msg = str(v)
                     sev = 'MEDIUM'

                 # Remove unique identifiers like "(Attempt X)" to allow grouping
                 clean_msg = re.sub(r' \(Attempt \d+\)', '', msg)
                 clean_msg = re.sub(r' \(\d+ attempts? remaining\)', '', clean_msg)
                 
                 key = (v_type, clean_msg, sev)
                 violation_counts[key] = violation_counts.get(key, 0) + 1
             
             # Table Data: Details | Severity | Justification | Count
             p_data = [["Violation Details", "Severity", "Justification", "Count"]]
             
             for (v_type, msg, sev), count in violation_counts.items():
                 # For display, combine type and message if they are different
                 display_text = f"{v_type}: {msg}" if v_type != 'Violation' and v_type not in msg else msg
                 
                 # Justification based on type
                 just = "Normal"
                 if 'phone' in display_text.lower() or 'gadget' in display_text.lower(): just = "Unauthorized Aid"
                 elif 'multiple' in display_text.lower(): just = "Person Match Failure"
                 elif 'look' in display_text.lower(): just = "Integrity Warning"
                 elif 'full screen' in display_text.lower(): just = "Browser Navigation"
                 elif 'tab' in display_text.lower(): just = "External Research"
                 elif 'voice' in display_text.lower(): just = "Third Party Assist"
                 
                 p_data.append([
                     display_text,
                     sev,
                     just,
                     str(count)
                 ])
             
             # Sort by Severity (CRITICAL > HIGH > MEDIUM > LOW)
             custom_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
             p_data[1:] = sorted(p_data[1:], key=lambda x: custom_order.get(x[1], 4))
 
             p_table = Table(p_data, colWidths=[2.8*inch, 1.2*inch, 2.2*inch, 0.8*inch])
             p_table.setStyle(TableStyle([
                 ('GRID', (0,0), (-1,-1), 0.5, colors.white),
                 ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#C0392B')), # Red Header for Proctoring
                 ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                 ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                 ('ALIGN', (0,0), (2,-1), 'LEFT'),
                 ('ALIGN', (3,0), (-1,-1), 'CENTER'), 
                 ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FDEDEC'), colors.white]),
                 ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#C0392B')),
                 ('PADDING', (0,0), (-1,-1), 8),
             ]))
             story.append(p_table)
        else:
             story.append(safe_para("No critical integrity violations detected during the session.", normal_style))

        # 8. SESSION SNAPSHOTS & EVIDENCE
        # Only PageBreak if proctoring had lots of content, else just add spacer
        if len(self.violations) > 5:
            story.append(PageBreak())
        else:
            story.append(Spacer(1, 0.3*inch))

        story.append(safe_para("SESSION MONITORING LOG", title_style))
        story.append(Spacer(1, 0.2*inch))
        story.append(safe_para("Identity verification and periodic monitor snapshots captured during the session:", normal_style))
        story.append(Spacer(1, 0.2*inch))

        # Collect all evidence images
        evidence_images = []
        evidence_dir = os.path.join(os.getcwd(), "evidence")
        if os.path.exists(evidence_dir):
            all_files = [os.path.join(evidence_dir, f) for f in os.listdir(evidence_dir) if f.endswith(".jpg")]
            
            significant_images = []
            seen_paths = set()

            # 1. Collect from Violations (Highest priority)
            for v in self.violations:
                img_path = v.get('image_path')
                if img_path and os.path.exists(img_path) and os.path.isfile(img_path) and img_path not in seen_paths:
                    v_type = v.get('type', 'Violation')
                    v_msg = v.get('message', 'Alert')
                    v_sev = v.get('severity', 'MEDIUM')
                    label = f"{v_type}: {v_msg} ({v_sev})"
                    significant_images.append((img_path, label))
                    seen_paths.add(img_path)

            # 2. Collect session-specific files from evidence folder
            sid_prefix = f"proof_{self.session_id}_"
            for f in all_files:
                f_basename = os.path.basename(f)
                if sid_prefix in f_basename and f not in seen_paths:
                    label = "Session Log"
                    # Try to extract context from filename
                    if "Identity_Verified" in f: label = "Identity Proof (Live)"
                    elif "Gains" in f: label = "Focus Gain"
                    elif "loss" in f: label = "Focus Loss"
                    
                    significant_images.append((f, label))
                    seen_paths.add(f)

            # 3. Last Fallback: Include any "default" prefix photos if they are recent
            default_files = [f for f in all_files if "proof_default_" in os.path.basename(f)]
            for df in default_files:
                # If file was created in the last 10 minutes, it likely belong to this user session (if start was missed)
                if (time.time() - os.path.getmtime(df)) < 600 and df not in seen_paths:
                    significant_images.append((df, "Early Session Proof"))
                    seen_paths.add(df)
            
            snapshots = [f for f in all_files if "snapshot" in f and f not in seen_paths]
            if len(snapshots) > 4:
                step = len(snapshots) // 4
                for i in range(0, len(snapshots), step):
                    if len(significant_images) < 10: 
                        significant_images.append((snapshots[i], "Routine Monitor"))
                        seen_paths.add(snapshots[i])
            else:
                 for s in snapshots:
                    if len(significant_images) < 10:
                        significant_images.append((s, "Routine Monitor"))
                        seen_paths.add(s)

            # Add all used evidence images to cleanup list (so they get deleted after PDF build)
            for p in seen_paths:
                if p and p not in temp_images:
                    temp_images.append(p)

            if significant_images:
                table_data = []
                row = []
                for path, label in significant_images[:12]: 
                    try:
                        if not os.path.isfile(path): continue
                        img = Image(path, width=2.4*inch, height=1.8*inch)
                        cell = [img, safe_para(label, normal_style)]
                        row.append(cell)
                        if len(row) == 2:
                            table_data.append(row)
                            row = []
                    except: continue
                
                if row: table_data.append(row)

                if table_data:
                    img_table = Table(table_data, colWidths=[3.5*inch, 3.5*inch])
                    img_table.setStyle(TableStyle([
                        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('PADDING', (0,0), (-1,-1), 10),
                    ]))
                    story.append(img_table)
            else:
                story.append(safe_para("No visual evidence recorded.", normal_style))
        else:
             story.append(safe_para("No visual evidence recorded.", normal_style))
             
        try:
            doc.build(story)
            # Comprehensive Cleanup: Delete ALL files for this session
            evidence_dir = os.path.join(os.getcwd(), "evidence")
            if os.path.exists(evidence_dir):
                sid_prefix = f"proof_{self.session_id}_"
                for f in os.listdir(evidence_dir):
                    if sid_prefix in f:
                        try:
                            os.remove(os.path.join(evidence_dir, f))
                        except Exception as e:
                            print(f"Error deleting evidence {f}: {e}")
            
            # Also cleanup charts
            for img in temp_images:
                if img and os.path.exists(img) and any(x in img for x in ["perf_", "cfk_", "pie_", "code_p_", "code_s_"]):
                    try: os.remove(img)
                    except: pass
            
            # 3. Resume Cleanup: Delete original resume to save space
            if self.resume_path and os.path.exists(self.resume_path):
                try:
                    os.remove(self.resume_path)
                    print(f"🧹 Resume deleted successfully: {self.resume_path}")
                except Exception as e:
                    print(f"Error deleting resume {self.resume_path}: {e}")
            
            return True
        except Exception as e:
            print(f"❌ PDF Build Error: {e}")
            return False

    def is_valid_resume(self, text):
        """
        STRICT VALIDATION: Checks if the extracted text belongs to a resume.
        Ignores metadata and filenames; focuses entirely on internal text structure.
        """
        if not text or len(text.strip()) < 150:
            return False, "The document content is too short to be a valid resume."
        
        text_lower = text.lower()
        
        # 1. Structural Indicators (Resume Headings)
        resume_sections = [
            "education", "work experience", "professional experience", 
            "technical skills", "projects", "certifications", 
            "academic profile", "internships", "achievements"
        ]
        section_matches = sum(1 for section in resume_sections if section in text_lower)
        
        # 2. Contact Information Patterns (Email/Phone)
        import re
        has_email = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))
        has_phone = bool(re.search(r'\+?\d[\d\s\-\(\)]{8,}\d', text))
        
        # Valid resume must have structural sections AND typically some contact info
        if section_matches >= 2 and (has_email or has_phone):
            return True, "Internal resume structure verified."
            
        # 3. LLM Final Strictly-Internal Audit
        if self.client:
            # We explicitly tell the LLM to ignore any external context and look only at the text dump
            prompt = f"""
            STRICT CONTENT AUDIT.
            Is the following text content a Resume or CV? 
            Check for: Work history, Education, Skills list.
            
            TEXT CONTENT:
            \"\"\"{text[:3000]}\"\"\"
            
            Return JSON ONLY: {{"is_resume": true/false, "confidence": 0-1}}
            """
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0,
                    max_tokens=100
                )
                res_data = json.loads(re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group())
                if res_data.get("is_resume") and res_data.get("confidence", 0) > 0.7:
                    return True, "LLM confirmed document content is a resume."
            except:
                pass
                
        return False, "This document content does not match a standard professional resume format (missing sections like Experience/Education or Contact Info)."

    def load_resume(self, file_path):
        # RESET ALL STATE ON NEW RESUME LOAD
        self.history = []
        self.evaluations = []
        self.submitted_solutions = []
        self.violations = []
        self.start_time = datetime.datetime.now()
        
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text()
            
            # 1. Content Validation: Is it actually a resume?
            is_resume, reason = self.is_valid_resume(text)
            if not is_resume:
                return False, reason

            self.resume_text = text
            return True, "Resume loaded and verified."
        except Exception as e:
            return False, f"Failed to read PDF: {str(e)}"

    def verify_candidate_match(self, name, resume_text):
        """Check if candidate name matches resume content structurally. Returns (match, detected_name)"""
        clean_name = name.strip() if name else ""
        if not clean_name or not resume_text:
            return False, "Name Not Found"
            
        # Only search the first 3000 chars where the name usually resides
        search_text = resume_text[:3000].lower()
        name_parts = clean_name.lower().split()
        
        # Stage 1: Exact Name Match
        if clean_name.lower() in search_text:
            return True, clean_name
            
        import re
        # Stage 2: Partial Split Match (Ensures First AND Last name are both present)
        matches = 0
        for part in name_parts:
            # Check length to avoid matching random single-letter initials
            if len(part) > 2 and re.search(r'\b' + re.escape(part) + r'\b', search_text):
                matches += 1
                
        # Require just 1 component (partial match) of the name to match for relaxed verification
        required_matches = 1
        
        if matches >= required_matches:
            print(f"✅ Partial/Full Match Accepted: Found '{clean_name}' parts in resume.")
            return True, clean_name
            
        print(f"Verify Failed: Could not locate '{clean_name}' completely in the resume.")
        return False, "Not Found In Resume"



    def analyze_resume(self):
        """Extract skills, projects, technologies and core subjects"""
        if not self.resume_text or not self.client: return

        prompt = f"""
        Analyze this resume comprehensively for a technical interview.
        Resume: {self.resume_text[:4000]}
        
        Identify:
        1. Projects: Notable projects mentioned.
        2. Skills: Broad skills (e.g., Web Development, Machine Learning).
        3. Technologies: Specific stacks (e.g., React, Node.js, Python, AWS).
        4. Core Subjects: Identify if they mention subjects like DBMS, OS, Computer Networks, DS & Algorithms.
        5. Experience Context: Years, level, and key roles.

        Return JSON:
        {{
            "projects": ["list of project titles"],
            "skills": ["list of broad skills"],
            "technologies": ["list of specific technologies"],
            "core_subjects": ["DBMS", "OS", "Networks", "DSA", "System Design"],
            "internships": ["list of company names/roles for internships"],
            "experience_level": "Beginner/Intermediate/Senior/Expert",
            "experience_years": "estimated years"
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                timeout=10.0
            )
            json_str = re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL).group()
            data = json.loads(json_str)
            self.projects_mentioned = data.get('projects', [])
            self.skills_mentioned = data.get('skills', [])
            self.technologies_mentioned = data.get('technologies', [])
            self.core_subjects = data.get('core_subjects', [])
            self.internships_mentioned = data.get('internships', [])
            self.experience_level = data.get('experience_level', 'Intermediate')
        except:
            pass
        if not hasattr(self, 'internships_mentioned'): self.internships_mentioned = []
        if not hasattr(self, 'asked_topics'): self.asked_topics = []
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
                temperature=0.2
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
            context = f"Step: {category.upper().replace('_', ' ')}"
            all_topics = []
            
            # Sub-category filtering
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
            context = f"Phase: {category.upper().replace('_', ' ')}"
            topic_options = {
                'behavioral': ["Handling pressure", "Dealing with failure", "Learning from mistakes"],
                'scenario_behavioral': ["Adapting to change", "Complex decision making", "Conflict with stakeholders"],
                'leadership': ["Mentoring others", "Taking initiative", "Project ownership", "Influencing without authority"],
                'adaptability': ["Learning new tools", "Pivoting strategy", "Handling ambiguity"],
                'teamwork': ["Collaborative success", "Solving team conflicts", "Cross-functional work"],
                'future_goals': ["Career aspirations", "Technical growth", "Life-long learning"],
                'scenario_hr': ["Tight deadlines", "Managing stress", "Work-life balance"]
            }
            options = topic_options.get(category, ["Professional growth"])
            remaining = [o for o in options if o not in asked_topics_copy]
            topic_to_ask = remaining[0] if remaining else random.choice(options)
            
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
        Act as a Professional Technical Interviewer conducting a realistic job interview. Generate a concise, natural-sounding interview question.
        
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
                        max_tokens=150
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
                        print(f"🔄 LLM Repeat Detected (Attempt {attempt+1}). Regenerating...")
                        # Update prompt for retry
                        prompt += "\n\nCRITICAL: The previous suggestion was a duplicate. You MUST generate a different question NOW."
                except Exception as e:
                    print(f"❌ Attempt {attempt+1} failed: {e}")
                    if attempt == 2: raise e

            # Track results
            with self.lock:
                if hasattr(self, 'current_topic') and self.current_topic not in self.asked_topics:
                    self.asked_topics.append(self.current_topic)
                self.history.append({"question": question_text, "category": category, "topic": getattr(self, 'current_topic', 'General')})
            return question_text

        except Exception as e:
            print(f"❌ Question Generation Error: {e}")
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
