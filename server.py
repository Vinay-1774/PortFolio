import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
import httpx
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    resend_api_key: str = Field(default="re_xxxxxxxxx", alias="RESEND_API_KEY")
    recipient_email: str = Field(default="vinaypsr212@gmail.com", alias="RECIPIENT_EMAIL")
    port: int = Field(default=8000, alias="PORT")
    host: str = Field(default="0.0.0.0", alias="HOST")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()


class ContactMessageRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


class ContactMessageResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ProjectItem(BaseModel):
    id: str
    title: str
    badge: str
    year: str
    summary: str
    architecture: str
    decisions: List[str]
    tech: List[str]
    github: str


PROJECTS_REGISTRY: List[ProjectItem] = [
    ProjectItem(
        id="nexus-auth",
        title="Nexus — Auth Portal",
        badge="FastAPI · Vanilla JS · Solo Project",
        year="Featured Project",
        summary="Full-stack authentication portal featuring a FastAPI backend and vanilla HTML/CSS/JS frontend served directly via Uvicorn static files with secure cookie-based JWTs.",
        architecture="""[Client Web Browser (HTML/CSS/JS)]
                 │
         (HTTPS / Cookie Credentials)
                 ▼
      [Uvicorn Static & API Server]
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
[joserfc JWT Engine]   [Argon2 / Passlib Hashing]
(HttpOnly & SameSite)  (Pydantic v2 Validations)
     │                       │
     └───────────┬───────────┘
                 ▼
   [SQLAlchemy ORM + SQLite DB]""",
        decisions=[
            "Built a full-stack authentication portal with FastAPI backend and plain HTML/CSS/JS frontend, served directly via Uvicorn as static files.",
            "Implemented secure cookie-based JWT authentication using joserfc with HttpOnly, SameSite=Lax, configurable expiry, and production Secure flag.",
            "Used Argon2 via Passlib for password hashing and Pydantic v2 for API-level validation including mobile number, EmailStr, and password rules.",
            "Added password strength meter, authentication tabs, toast notifications, real-time session countdown, and warning/critical states.",
            "Configured CORS for same-origin and Live Server development with credentials support for cookie passthrough."
        ],
        tech=["FastAPI", "joserfc JWT", "SQLAlchemy", "SQLite", "Argon2", "Passlib", "Pydantic v2", "Cookie Auth"],
        github="https://github.com/Vinay-1774"
    ),
    ProjectItem(
        id="terminal-chat",
        title="Private Chat App — Terminal WebSocket DM System",
        badge="FastAPI · asyncio · Solo Project",
        year="Featured Project",
        summary="Terminal-based private DM application enabling concurrent user connections via WebSockets to select online peers and exchange real-time messages in isolated rooms.",
        architecture="""[Terminal / WebSocket Clients] ── (WS Handshake) ──> [FastAPI WebSocket Endpoint]
                                                              │
                                                    [ConnectionManager]
                                               ┌──────────────┴──────────────┐
                                               ▼                             ▼
                                    [User Registry / Lobby]       [Isolated Room Registry]
                                               │                             │
                                               └──────────────┬──────────────┘
                                                              ▼
                                                  [Deterministic Symmetric Room ID]
                                                  (Sorted User Pair Hashing)
                                                              │
                                                              ▼
                                               [asyncio.wait(FIRST_COMPLETED)]
                                               (Concurrent Send/Recv Coroutines)
                                                              │
                                                              ▼
                                        [Redis + async SQLAlchemy + SQLite (aiosqlite)]""",
        decisions=[
            "Built a terminal-based private DM application where users connect via WebSocket, select an online peer, and exchange messages in isolated rooms.",
            "Designed a ConnectionManager with separate user, lobby, and room registries for clean room isolation without cross-talk.",
            "Implemented deterministic symmetric room IDs using sorted user pairs, preventing duplicate rooms for the same users.",
            "Used asyncio.wait(FIRST_COMPLETED) to concurrently handle receive/send coroutines and cleanly cancel the remaining task on disconnect.",
            "Added lobby-wide online-user broadcasts, duplicate username detection, and /leave and /quit commands for session management.",
            "Configured Redis, database, and server URLs through pydantic-settings and environment variables without code changes."
        ],
        tech=["FastAPI", "WebSockets", "async SQLAlchemy", "Redis", "SQLite (aiosqlite)", "pydantic-settings", "asyncio"],
        github="https://github.com/Vinay-1774"
    )
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="Vinay Pratap Raghuwanshi Portfolio API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    loc = " -> ".join(str(item) for item in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation error")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "success": False,
            "message": f"Validation error at {loc}: {msg}",
            "error": f"{loc}: {msg}",
            "detail": errors
        }
    )


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="vinay-portfolio-api",
        version="1.0.0"
    )


@app.get("/api/projects", response_model=List[ProjectItem])
async def get_projects():
    return PROJECTS_REGISTRY


@app.post("/api/send-email", response_model=ContactMessageResponse)
async def send_email(payload: ContactMessageRequest):
    api_key = settings.resend_api_key.strip()
    if not api_key or api_key == "re_xxxxxxxxx":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ContactMessageResponse(
                success=False,
                message="Resend API key is not configured in .env",
                error="RESEND_API_KEY is missing or invalid"
            ).model_dump()
        )

    resend_payload = {
        "from": "Portfolio Contact <onboarding@resend.dev>",
        "to": [settings.recipient_email],
        "reply_to": payload.email,
        "subject": f"[Portfolio Contact] {payload.subject}",
        "html": f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
              <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                New Contact Message from Portfolio
              </h2>
              <p><strong>Sender Name:</strong> {payload.name}</p>
              <p><strong>Sender Email:</strong> <a href="mailto:{payload.email}">{payload.email}</a></p>
              <p><strong>Subject:</strong> {payload.subject}</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <h3>Message Payload:</h3>
              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">
                {payload.message}
              </div>
            </div>
        """
    }

    client: httpx.AsyncClient = app.state.http_client
    try:
        response = await client.post(
            "https://api.resend.com/emails",
            json=resend_payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Portfolio-FastAPI/1.0"
            }
        )

        if response.status_code in (200, 201):
            return ContactMessageResponse(
                success=True,
                message="Email dispatched successfully",
                data=response.json()
            )

        return JSONResponse(
            status_code=response.status_code,
            content=ContactMessageResponse(
                success=False,
                message=f"Resend API error ({response.status_code})",
                error=response.text
            ).model_dump()
        )
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ContactMessageResponse(
                success=False,
                message="Failed to connect to email service provider",
                error=str(exc)
            ).model_dump()
        )


@app.post("/api/test-email", response_model=ContactMessageResponse)
async def test_email_endpoint():
    api_key = settings.resend_api_key.strip()
    if not api_key or api_key == "re_xxxxxxxxx":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ContactMessageResponse(
                success=False,
                message="Resend API key is not configured in .env",
                error="RESEND_API_KEY is missing or invalid"
            ).model_dump()
        )

    resend_payload = {
        "from": "onboarding@resend.dev",
        "to": [settings.recipient_email],
        "subject": "Hello World",
        "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
    }

    client: httpx.AsyncClient = app.state.http_client
    try:
        response = await client.post(
            "https://api.resend.com/emails",
            json=resend_payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Portfolio-FastAPI/1.0"
            }
        )

        if response.status_code in (200, 201):
            return ContactMessageResponse(
                success=True,
                message="Test email dispatched successfully",
                data=response.json()
            )

        return JSONResponse(
            status_code=response.status_code,
            content=ContactMessageResponse(
                success=False,
                message=f"Resend API error ({response.status_code})",
                error=response.text
            ).model_dump()
        )
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ContactMessageResponse(
                success=False,
                message="Failed to connect to email service provider",
                error=str(exc)
            ).model_dump()
        )


if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")

if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")


@app.api_route("/", methods=["GET", "HEAD"])
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
