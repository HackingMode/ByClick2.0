from app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(destinatario: str, assunto: str, corpo_html: str):
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASSWORD
    email_from = settings.EMAIL_FROM

    if not all([smtp_server, smtp_port, smtp_user, smtp_pass, email_from]):
        print("AVISO: Credenciais SMTP não configuradas no .env. Email não enviado.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = email_from
    msg["To"] = destinatario

    part = MIMEText(corpo_html, "html")
    msg.attach(part)

    try:
        server = smtplib.SMTP(smtp_server, int(smtp_port), timeout=15)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(email_from, destinatario, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

def enviar_otp_recuperacao(email_destinatario: str, codigo_otp: str):
    assunto = "Código de Recuperação de Senha - Kitanda"
    corpo = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Recuperação de Palavra-passe</h2>
        <p>Recebemos um pedido para alterar a palavra-passe da sua conta Kitanda.</p>
        <p>O seu código de verificação é: <strong><span style="font-size: 24px; color: #0D8ABC;">{codigo_otp}</span></strong></p>
        <p>Este código expira em 30 minutos.</p>
        <br>
        <p>Se não pediu esta alteração, por favor ignore este e-mail.</p>
        <p>A equipa Kitanda</p>
    </body>
    </html>
    """
    return send_email(email_destinatario, assunto, corpo)


def enviar_otp_verificacao(email_destinatario: str, codigo_otp: str):
    return send_email(
        email_destinatario,
        'Confirma o teu e-mail — ByClick',
        f'<h2>Bem-vindo ao ByClick</h2><p>O teu código de verificação é <strong>{codigo_otp}</strong>.</p><p>O código expira em 30 minutos.</p>',
    )
