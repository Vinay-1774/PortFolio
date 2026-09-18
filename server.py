import html
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional
import httpx
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("portfolio")


class Settings(BaseSettings):
    resend_api_key: str = Field(..., alias="RESEND_API_KEY")
    recipient_email: EmailStr = Field(..., alias="RECIPIENT_EMAIL")
    port: int = Field(default=8000, alias="PORT")
    host: str = Field(default="0.0.0.0", alias="HOST")
    environment: str = Field(default="production", alias="ENVIRONMENT")
    allowed_origins: str = Field(default="https://port-folio-vert-three.vercel.app", alias="ALLOWED_ORIGINS")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()


class ContactMessageRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.http_client.aclose()


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Portfolio API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins_list = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "font-src 'self' https://fonts.gstatic.com; "
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "img-src 'self' data:;"
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    loc = " -> ".join(str(item) for item in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation error")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"success": False, "error": f"{loc}: {msg}", "detail": exc.errors()}
    )


async def get_http_client() -> httpx.AsyncClient:
    client = getattr(app.state, "http_client", None)
    if client is None or client.is_closed:
        app.state.http_client = httpx.AsyncClient(timeout=10.0)
    return app.state.http_client


async def dispatch_resend(to: str, subject: str, html: str, reply_to: Optional[str] = None):
    api_key = settings.resend_api_key.strip()
    if not api_key:
        logger.error("Resend API key is missing or unconfigured in .env")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "Failed to send message, please try again later."}
        )

    payload = {
        "from": "onboarding@resend.dev",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        client = await get_http_client()
        response = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Portfolio-FastAPI/1.0"
            }
        )
        if response.status_code in (200, 201):
            return {"success": True, "message": "Email dispatched successfully", "data": response.json()}
        logger.error(f"Resend API error ({response.status_code}): {response.text}")
        return JSONResponse(
            status_code=response.status_code,
            content={"success": False, "error": "Failed to send message, please try again later."}
        )
    except httpx.RequestError as exc:
        logger.error(f"Failed to connect to email service provider: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"success": False, "error": "Failed to send message, please try again later."}
        )


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "portfolio-api", "version": "1.0.0"}


@app.post("/api/send-email")
@limiter.limit("5/minute")
async def send_email(request: Request, payload: ContactMessageRequest):
    clean_name = html.escape(payload.name)
    clean_email = html.escape(str(payload.email))
    clean_subject = html.escape(payload.subject)
    clean_message = html.escape(payload.message)

    html_content = f"""<div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">New Contact Message</h2>
      <p><strong>Sender:</strong> {clean_name} ({clean_email})</p>
      <p><strong>Subject:</strong> {clean_subject}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <div style="background: #f9fafb; padding: 12px; border-radius: 6px; white-space: pre-wrap;">{clean_message}</div>
    </div>"""

    return await dispatch_resend(
        to=settings.recipient_email,
        subject=f"[Portfolio Contact] {clean_subject}",
        html=html_content,
        reply_to=payload.email
    )


if os.path.exists("css"):
    app.mount("/css", StaticFiles(directory="css"), name="css")

if os.path.exists("js"):
    app.mount("/js", StaticFiles(directory="js"), name="js")

if os.path.exists("images"):
    app.mount("/images", StaticFiles(directory="images"), name="images")


@app.api_route("/", methods=["GET", "HEAD"])
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")


@app.api_route("/favicon.ico", methods=["GET", "HEAD"], include_in_schema=False)
async def favicon_ico():
    ico_path = os.path.join(os.path.dirname(__file__), "favicon.ico")
    if os.path.exists(ico_path):
        return FileResponse(ico_path, media_type="image/x-icon")
    raise HTTPException(status_code=404)


@app.api_route("/favicon.png", methods=["GET", "HEAD"], include_in_schema=False)
async def favicon_png():
    png_path = os.path.join(os.path.dirname(__file__), "favicon.png")
    if os.path.exists(png_path):
        return FileResponse(png_path, media_type="image/png")
    raise HTTPException(status_code=404)


@app.api_route("/apple-touch-icon.png", methods=["GET", "HEAD"], include_in_schema=False)
async def apple_touch_icon():
    apple_path = os.path.join(os.path.dirname(__file__), "apple-touch-icon.png")
    if os.path.exists(apple_path):
        return FileResponse(apple_path, media_type="image/png")
    raise HTTPException(status_code=404)


if __name__ == "__main__":
    import uvicorn
    is_dev = settings.environment.lower() == "development"
    uvicorn.run("server:app", host=settings.host, port=settings.port, reload=is_dev)
