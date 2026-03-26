# Este código es un ejemplo de cómo crear un bot de Telegram usando FastAPI y almacenar los mensajes recibidos. El bot responde a los mensajes de texto y guarda el contenido en una base de datos SQLite. También incluye una ruta para configurar el webhook y otra para ver los mensajes guardados.

from fastapi import FastAPI, Request
import os
import httpx
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base

# ====================== DB SIMPLE ======================
DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String)
    fuente = Column(String)
    fecha = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ====================== APP ======================
app = FastAPI(title="Test Telegram Bot")

# ====================== TELEGRAM WEBHOOK ======================
@app.get("/webhook/telegram")
def test_webhook():
    return {"mensaje": "Webhook activo"}

@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    update = await request.json()

    if "message" in update and "text" in update["message"]:
        texto = update["message"]["text"]
        chat_id = update["message"]["chat"]["id"]

        # Guardar en DB
        db = SessionLocal()
        nuevo = Feedback(texto=texto, fuente="telegram")
        db.add(nuevo)
        db.commit()
        db.close()

        # Responder al usuario
        reply = f"Mensaje recibido: {texto}"
        await send_telegram_message(chat_id, reply)

        return {"status": "ok"}

    return {"status": "ignored"}

# ====================== ENVIAR MENSAJE ======================
async def send_telegram_message(chat_id: int, text: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Falta TELEGRAM_BOT_TOKEN")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    async with httpx.AsyncClient() as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "text": text
        })

# ====================== CONFIGURAR WEBHOOK ======================
@app.get("/set-webhook")
async def set_webhook(ngrok_url: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")

    webhook_url = f"{ngrok_url}/webhook/telegram"
    url = f"https://api.telegram.org/bot{token}/setWebhook"

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"url": webhook_url})
        return resp.json()

# ====================== VER MENSAJES GUARDADOS ======================
@app.get("/mensajes")
def ver_mensajes():
    db = SessionLocal()
    data = db.query(Feedback).all()
    db.close()

    return [
        {"id": f.id, "texto": f.texto, "fecha": f.fecha}
        for f in data
    ]