# Portfolio

Personal portfolio site — static HTML/CSS/JS frontend served by a FastAPI backend that also handles the contact form (email via Resend).

## Live

- Frontend: https://port-folio-vert-three.vercel.app/
- Backend API: https://portfolio-2a9m.onrender.com/

## Setup

```bash
git clone https://github.com/Vinay-1774/PortFolio.git
cd PortFolio

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# create a .env file in the project root with your config
```

## Run

```bash
python3 server.py
```

Serves the full site (frontend + `/api` routes) at `http://localhost:8000`.

In production, frontend (Vercel) and backend (Render) are deployed separately — `js/script.js` points to the Render URL for `/api/send-email`, and `ALLOWED_ORIGINS` on the backend must include the Vercel domain.

## Commands

| Command | Description |
|---|---|
| `python3 server.py` | Run backend + serve frontend |
| `uvicorn server:app --reload --port 8000` | Run backend with auto-reload (dev) |
| `npm run dev` | Vite dev server (frontend only) |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview production build |

## Project structure

```
PortFolio/
├── css/
│   └── styles.css
├── js/
│   └── script.js
├── index.html
├── server.py
├── requirements.txt
└── package.json
```
