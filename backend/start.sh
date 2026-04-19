#!/bin/bash
echo "🚀 Starting FocusRoom AI Backend..."
cd "$(dirname "$0")"
pip install -r requirements.txt -q
uvicorn main:app --reload --host 0.0.0.0 --port 8000
