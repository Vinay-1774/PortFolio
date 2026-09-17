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


class Settings(BaseSettings):
    resend_api_key: str = Field(default="re_xxxxxxxxx", alias="RESEND_API_KEY")
    recipient_email: str = Field(default="vinaypratap4017@gmail.com", alias="RECIPIENT_EMAIL")
    port: int = Field(default=8000, alias="PORT")
    host: str = Field(default="0.0.0.0", alias="HOST")

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


app = FastAPI(title="Portfolio API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    loc = " -> ".join(str(item) for item in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation error")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"success": False, "error": f"{loc}: {msg}", "detail": exc.errors()}
    )


async def dispatch_resend(to: str, subject: str, html: str, reply_to: Optional[str] = None):
    api_key = settings.resend_api_key.strip()
    if not api_key or api_key == "re_xxxxxxxxx":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "RESEND_API_KEY is missing or unconfigured in .env"}
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
        response = await app.state.http_client.post(
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
        return JSONResponse(
            status_code=response.status_code,
            content={"success": False, "error": response.text}
        )
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "portfolio-api", "version": "1.0.0"}


@app.post("/api/send-email")
async def send_email(payload: ContactMessageRequest):
    html = f"""<div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">New Contact Message</h2>
      <p><strong>Sender:</strong> {payload.name} ({payload.email})</p>
      <p><strong>Subject:</strong> {payload.subject}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <div style="background: #f9fafb; padding: 12px; border-radius: 6px; white-space: pre-wrap;">{payload.message}</div>
    </div>"""
    return await dispatch_resend(
        to=settings.recipient_email,
        subject=f"[Portfolio Contact] {payload.subject}",
        html=html,
        reply_to=payload.email
    )


@app.post("/api/test-email")
async def test_email_endpoint():
    return await dispatch_resend(
        to=settings.recipient_email,
        subject="Hello World",
        html="<p>Congrats on sending your <strong>first email</strong>!</p>"
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
    uvicorn.run("server:app", host=settings.host, port=settings.port, reload=True)
