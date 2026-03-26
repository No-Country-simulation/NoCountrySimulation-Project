
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import os
import httpx

from .database import SessionLocal, engine
from .models import Base, Feedback
from .schemas import FeedbackCreate, Clasificacion
from .pipeline import chain, vectorstore, parser

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Feedback Classifier IA - Híbrido (Manual + Telegram)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ====================== FUNCIÓN ÚNICA DE PROCESAMIENTO ======================
def procesar_feedback(texto: str, fuente: str, db: Session) -> Clasificacion:
    """Aquí converge TODO: manual y Telegram. Es el único lugar donde se hace IA + guardado."""
    try:
        resultado = chain.invoke({
            "texto": texto,
            "fuente": fuente,
            "format_instructions": parser.get_format_instructions()
        })

        # Guardar en SQLite
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

        # Guardar embedding en Pinecone
        vectorstore.add_texts(
            texts=[texto],
            metadatas=[{"feedback_id": nuevo_feedback.id, "sentimiento": resultado.sentimiento}]
        )

        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====================== ENDPOINT MANUAL  ======================
@app.post("/clasificar", response_model=Clasificacion)
def clasificar_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    return procesar_feedback(feedback.texto, feedback.fuente, db)


# ====================== ENDPOINT TELEGRAM (tiempo real) ======================
@app.post("/webhook/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update = await request.json()

    # Solo procesamos mensajes de texto
    if "message" in update and "text" in update["message"]:
        texto = update["message"]["text"]
        chat_id = update["message"]["chat"]["id"]
        fuente = "telegram"

        resultado = procesar_feedback(texto, fuente, db)

        # Respuesta automática al usuario en Telegram
        reply = (
            f" ¡Feedback clasificado automáticamente!\n\n"
            f" Sentimiento: {resultado.sentimiento.upper()}\n"
            f" Categoría: {resultado.categoria}\n"
            f" Urgencia: {resultado.urgencia.upper()}\n"
            f" Resumen: {resultado.resumen}"
        )
        await send_telegram_message(chat_id, reply)
        return {"status": "procesado"}

    return {"status": "ignorado"}


async def send_telegram_message(chat_id: int, text: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": chat_id, "text": text})


# ====================== ENDPOINT PARA CONFIGURAR WEBHOOK ======================
@app.get("/set-webhook")
async def set_telegram_webhook(ngrok_url: str):
    """Llama a este endpoint después de correr ngrok"""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return {"error": "Falta TELEGRAM_BOT_TOKEN en .env"}

    webhook_url = f"{ngrok_url.rstrip('/')}/webhook/telegram"
    set_url = f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}&drop_pending_updates=true"

    async with httpx.AsyncClient() as client:
        resp = await client.get(set_url)
        return resp.json()


# ====================== ENDPOINTS EXISTENTES ======================
@app.get("/insights")
def obtener_insights(db: Session = Depends(get_db)):
    df = pd.read_sql("SELECT * FROM feedbacks", engine)
    if df.empty:
        return {"total": 0, "mensaje": "No hay feedbacks aún"}

    sentiment_count = df['sentimiento'].value_counts().to_dict()
    categoria_count = df['categoria'].value_counts().to_dict()
    urgencia_count = df['urgencia'].value_counts().to_dict()

    docs = vectorstore.similarity_search("problemas y quejas más frecuentes de clientes", k=15)
    temas = llm.invoke(f"Resume en máximo 6 temas claros:\n{[d.page_content for d in docs]}").content if docs else "No hay datos suficientes"

    return {
        "total": len(df),
        "sentimiento": sentiment_count,
        "categorias": categoria_count,
        "urgencia": urgencia_count,
        "temas_recurrentes": temas
    }

@app.get("/feedbacks")
def listar_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).all()

@app.get("/export/csv")
def exportar_csv():
    df = pd.read_sql("SELECT * FROM feedbacks", engine)
    df.to_csv("feedbacks_export.csv", index=False)
    return {"mensaje": "Archivo generado: feedbacks_export.csv"}
