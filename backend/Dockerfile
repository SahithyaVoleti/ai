FROM python:3.10-slim

# Install system dependencies for OpenCV and AI libraries
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from parent directory (since it's at root)
# Alternatively, we could move requirements.txt into backend/
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
# Copy other necessary folders for the backend
COPY code_engine/ ./code_engine/
# Check if proctoring_engine is in backend or root.
# Based on api.py line 28: from proctoring_engine.service import ProctoringService
# Based on list_dir backend: proctoring_engine is in backend/
# Wait, let me check where proctoring_engine is.
# list_dir backend/ showed: "proctoring_engine","isDir":true
# list_dir root showed: "backend","isDir":true, but also "requirements.txt" etc.

COPY .env .
# If static files are needed
COPY static/ ./static/

# The api.py is inside backend/
EXPOSE 5000

ENV FLASK_APP=backend/api.py
CMD ["python", "backend/api.py"]
