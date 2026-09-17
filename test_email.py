import os
import resend
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("RESEND_API_KEY", "re_xxxxxxxxx").strip()
recipient = os.getenv("RECIPIENT_EMAIL", "vinaypratap4017@gmail.com").strip()

if not api_key or api_key == "re_xxxxxxxxx":
    print("Error: Please replace 're_xxxxxxxxx' with your actual Resend API Key in your .env file.")
    exit(1)

resend.api_key = api_key

try:
    response = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": [recipient],
        "subject": "Hello World",
        "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
    })
    print("Email sent successfully!")
    print("Response:", response)
except Exception as exc:
    print("Error sending email:", exc)
