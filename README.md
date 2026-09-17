# Portfolio

Minimal portfolio web application with a FastAPI backend and vanilla HTML/CSS/JS frontend.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
python3 server.py
```

The application will be available at `http://localhost:8000`.

## Commands Cheat Sheet

- **Start server**: `python3 server.py`
- **Start with uvicorn**: `uvicorn server:app --reload --port 8000`
- **Run with npm**: `npm run server`
- **Interactive API Docs**: `http://localhost:8000/docs`
- **Health Check**: `curl http://localhost:8000/api/health`

## Project Structure

```
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
├── requirements.txt
├── server.py
├── css/
│   └── styles.css
└── js/
    └── script.js
```
