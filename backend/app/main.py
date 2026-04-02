

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import os
import httpx
from typing import List
from .schemas import FeedbackSchema
from fastapi.responses import StreamingResponse
import io
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

from .pipeline import llm, chain, vectorstore, parser
from .database import SessionLocal, engine
from .models import Base, Feedback
from .schemas import FeedbackCreate, Clasificacion

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Feedback Classifier IA - Híbrido (Manual + Telegram)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================== DB ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ====================== FUNCIÓN PRINCIPAL ======================
def procesar_feedback(texto: str, fuente: str, db: Session) -> Clasificacion:
    try:
        resultado = chain.invoke({
            "texto": texto,
            "fuente": fuente,
            "format_instructions": parser.get_format_instructions()
        })

        nuevo_feedback = Feedback(
            texto=texto,
            fuente=fuente,
            sentimiento=resultado.sentimiento,
            categoria=resultado.categoria,
            urgencia=resultado.urgencia,
            resumen=resultado.resumen
        )

        db.add(nuevo_feedback)
        db.commit()
        db.refresh(nuevo_feedback)

        vectorstore.add_texts(
            texts=[texto],
            metadatas=[{
                "feedback_id": nuevo_feedback.id,
                "sentimiento": resultado.sentimiento
            }]
        )

        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ====================== TELEGRAM SEND ======================
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

# ====================== ENDPOINT MANUAL ======================
@app.post("/clasificar", response_model=Clasificacion)
def clasificar_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    return procesar_feedback(feedback.texto, feedback.fuente, db)

# ====================== WEBHOOK TELEGRAM ======================
@app.post("/webhook/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update = await request.json()

    if "message" in update and "text" in update["message"]:
        texto = update["message"]["text"]
        chat_id = update["message"]["chat"]["id"]
        fuente = "telegram"

        resultado = procesar_feedback(texto, fuente, db)

        # Mensaje para ADMIN (tú)
        admin_chat_id = os.getenv("ADMIN_CHAT_ID")

        reply = (
            f" Nuevo feedback recibido\n\n"
            f" Usuario: {chat_id}\n"
            f" Texto: {texto}\n\n"
            f" Sentimiento: {resultado.sentimiento.upper()}\n"
            f" Categoría: {resultado.categoria}\n"
            f" Urgencia: {resultado.urgencia.upper()}\n"
            f" Resumen: {resultado.resumen}"
        )

        #  Responder al usuario (simple)
        await send_telegram_message(chat_id, "✅ Gracias por tu feedback")

        #  Enviar resultado al ADMIN
        if admin_chat_id:
            await send_telegram_message(int(admin_chat_id), reply)
        else:
            print("Falta ADMIN_CHAT_ID en .env")

        return {"status": "procesado"}

    return {"status": "ignorado"}

# ====================== CONFIG WEBHOOK ======================
@app.get("/set-webhook")
async def set_telegram_webhook(ngrok_url: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")

    if not token:
        return {"error": "Falta TELEGRAM_BOT_TOKEN"}

    webhook_url = f"{ngrok_url.rstrip('/')}/webhook/telegram"

    set_url = (
        f"https://api.telegram.org/bot{token}/setWebhook"
        f"?url={webhook_url}&drop_pending_updates=true"
    )

    async with httpx.AsyncClient() as client:
        resp = await client.get(set_url)
        return resp.json()

# ====================== INSIGHTS ======================
@app.get("/insights")
def obtener_insights(db: Session = Depends(get_db)):
    df = pd.read_sql("SELECT * FROM feedbacks", engine)

    if df.empty:
        return {"total": 0, "mensaje": "No hay feedbacks aún"}

    # ================= GENERAL =================
    total = len(df)

    sentiment_count = df['sentimiento'].value_counts().to_dict()
    categoria_count = df['categoria'].value_counts().to_dict()
    urgencia_count = df['urgencia'].value_counts().to_dict()

    # ================= POR FUENTE =================
    df_web = df[df["fuente"] == "web"]
    df_telegram = df[df["fuente"] == "telegram"]

    telegram_stats = {
        "total": len(df_telegram),
        "sentimiento": df_telegram['sentimiento'].value_counts().to_dict(),
        "categorias": df_telegram['categoria'].value_counts().to_dict(),
        "urgencia": df_telegram['urgencia'].value_counts().to_dict(),
    }

    web_stats = {
        "total": len(df_web),
        "sentimiento": df_web['sentimiento'].value_counts().to_dict(),
        "categorias": df_web['categoria'].value_counts().to_dict(),
        "urgencia": df_web['urgencia'].value_counts().to_dict(),
    }

    # ================= TEMAS (solo Telegram opcional) =================
    docs = vectorstore.similarity_search(
        "problemas y quejas más frecuentes de clientes",
        k=15
    )

    temas = (
        llm.invoke(
            f"Resume en máximo 6 temas claros:\n{[d.page_content for d in docs]}"
        ).content
        if docs else "No hay datos suficientes"
    )

    return {
        "total": total,

        # 🔹 Global
        "sentimiento": sentiment_count,
        "categorias": categoria_count,
        "urgencia": urgencia_count,

        # 🔹 Por canal
        "web": web_stats,
        "telegram": telegram_stats,

        # 🔹 IA
        "temas_recurrentes": temas
    }

# ====================== LISTAR ======================
@app.get("/feedbacks", response_model=List[FeedbackSchema])
def listar_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).all()

# ====================== EXPORT ======================
@app.get("/export/csv")
def exportar_csv():
    df = pd.read_sql("SELECT * FROM feedbacks", engine)
    
    # Crear buffer en memoria
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    # Devolver como archivo descargable
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedbacks_export.csv"}
    )

# ====================== SOLO TELEGRAM ======================
@app.get("/mensajes")
def obtener_mensajes_telegram(db: Session = Depends(get_db)):
    return db.query(Feedback).filter(Feedback.fuente == "telegram").all()