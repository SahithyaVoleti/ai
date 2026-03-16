# AI Interviewer Platform

A comprehensive React (Next.js) and Python (Flask) powered AI interviewing application. The system features an automated, adaptive AI interviewer that dynamically generates questions based on a candidate's uploaded resume, conducts coding rounds, utilizes a facial/proctoring engine during the interview, and automatically generates detailed PDF score reports upon completion.

## 🌟 Key Features

*   **Resume-Tailored Questions:** Uses LLMs (via Groq) to analyze the uploaded resume and ask dynamic, context-specific questions.
*   **Adaptive Flow:** An introductory round, an extensive technical round based on the candidate's skills, and a live coding challenge.
*   **Live Proctoring Engine:** Uses OpenCV, MediaPipe, and Ultralytics (YOLO) to actively monitor candidates for security violations (gadget detection, multiple faces, tab switching, and looking away).
*   **Voice-Based Interaction:** Allows voice dictation using browser Speech Recognition and responds using Text-to-Speech mechanisms.
*   **Comprehensive Assessment Reports:** Auto-generates detailed PDF reports post-interview showing strength breakdowns, coding performance, interview transcripts, and any security infringements caught on camera.
*   **Real-time Coding Environment:** Built-in Monaco editor supporting live code execution and problem-solving tracking.

---

## 💻 Tech Stack & Dependencies

### Frontend
- **Framework & Libraries**: Next.js 16+, React 19+
- **Styling**: Tailwind CSS v4
- **Components & Icons**: Lucide React
- **Animations**: Framer Motion
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Visuals**: Recharts (for dashboards)

### Backend
- **Framework**: Flask, Werkzeug
- **AI / LLM Integration**: Groq API
- **Computer Vision / Proctoring**: OpenCV, Mediapipe, DeepFace, Ultralytics (YOLOv8)
- **PDF Generation**: ReportLab, PyPDF2
- **Audio Processing**: PyAudio, SpeechSynthesis
- **Database**: SQLite / PostgreSQL (via `psycopg2-binary`)
- **Authentication**: `flask-bcrypt`

---

## 🛠️ Installation & Setup

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18.x or newer strongly recommended)
- **Python** (3.8+ recommended)
- **A valid Groq API Key** for LLM functionality

### Quick Start (Windows)
We provide an automated batch script to install the dependencies and run both servers simultaneously.
1. Double click `start_interview.bat`
2. Wait for the python dependencies to install and the backend terminal to launch.
3. The script will automatically cd into the `frontend` folder, install npm modules, and start the development server.

### Manual Setup

If you prefer to start them individually:

**1. Database and Environment Configuration**
In the root directory, create a `.env` file (if not automatically created) and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

**2. Start the Backend (Flask server)**
Open a terminal in the root directory and run:
```bash
pip install -r requirements.txt
python api.py
```
*The backend API will run on `http://127.0.0.1:5000`*

**3. Start the Frontend (Next.js server)**
Open a new terminal window, navigate to the `frontend` directory, and run:
```bash
cd frontend
npm install
npm run dev
```
*The web interface will be available at `http://localhost:3000`*

---

## 📂 Project Structure

- `api.py`: Main Flask application handling all API routes, authentication, and orchestrating the backend.
- `manager.py`: The `InterviewManager` class responsible for LLM logic, generating questions, evaluating answers, calculating scores, and piecing together the final PDF report.
- `proctoring_engine/`: Computer vision logic leveraging OpenCV and YOLO for checking background integrity.
- `database.py`: Database queries for users, score-keeping, and interview history.
- `frontend/app/page.tsx`: The primary Next.js page holding the core interview states (landing, upload, calibration, interview loops, coding editor, and report generation).





cd f:\ai-interviewer
uv run python api.py






cd f:\ai-interviewer\frontend
npm run dev

