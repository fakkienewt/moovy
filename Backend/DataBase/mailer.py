import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')

def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"

def send_verification_code(to_email: str, code: str) -> bool:
    msg = MIMEMultipart()
    msg['Subject'] = 'Moovy — подтверждение регистрации'
    msg['From'] = SMTP_USER
    msg['To'] = to_email

    html = f"""
    <div style="font-family: cursive; color:#4682b4; padding:20px;">
        <h2 style="color:#4682b4;">Moovy</h2>
        <p>Ваш код подтверждения:</p>
        <div style="font-size:32px; font-weight:bold; letter-spacing:8px;
                    background:#f0f8ff; border:2px solid #b3e0ff;
                    border-radius:15px; padding:15px 25px; display:inline-block;">
            {code}
        </div>
        <p style="margin-top:20px; color:#87CEEB;">
            Код действует 10 минут.
        </p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[MAIL ERROR] {e}")
        return False