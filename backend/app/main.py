
# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
import pandas as pd
import os
import httpx
from typing import List, Optional
from .schemas import FeedbackSchema, FeedbackCreate, Clasificacion, RAGQuery, TextNormalizer, FeedbackDuplicateCheck
from fastapi.responses import StreamingResponse
import io
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Cargar variables de entorno
load_dotenv()

from .pipeline import llm, chain, vectorstore, parser, text_normalizer
from .database import SessionLocal, engine
from .models import Base, Feedback
from .rag import rag_system

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Feedback Classifier IA - Híbrido (Manual + Telegram)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ====================== DB ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ====================== FUNCIÓN DE DEDUPLICACIÓN ======================
def check_duplicate(texto_normalizado: str, db: Session) -> Optional[Feedback]:
    """Verifica si ya existe un feedback duplicado"""
    texto_hash = None
    if texto_normalizado:
        import hashlib
        texto_hash = hashlib.sha256(texto_normalizado.encode('utf-8')).hexdigest()
    
    if texto_hash:
        return db.query(Feedback).filter(Feedback.texto_hash == texto_hash).first()
    return None

# ====================== FUNCIÓN PRINCIPAL MODIFICADA ======================
def procesar_feedback(texto: str, fuente: str, db: Session) -> Clasificacion:
    try:
        # 1. Normalizar texto
        texto_con_emojis = text_normalizer.emojis_to_text(texto)
        texto_normalizado = text_normalizer.normalize_text(texto_con_emojis)
        
        # Validar que no esté vacío después de normalización
        if len(texto_normalizado) < 3:
            raise HTTPException(status_code=400, detail="El texto no contiene contenido significativo después de la normalización")
        
        # 2. Verificar duplicados
        duplicado = check_duplicate(texto_normalizado, db)
        if duplicado:
            raise HTTPException(
                status_code=409, 
                detail=f"Feedback duplicado detectado. ID original: {duplicado.id}, Fecha: {duplicado.fecha}"
            )
        
        # 3. Clasificar con IA usando texto original (preservando contexto)
        resultado = chain.invoke({
            "texto": texto,  # Usar texto original para mejor análisis
            "fuente": fuente,
            "format_instructions": parser.get_format_instructions()
        })
        
        # 4. Crear feedback con campos adicionales
        nuevo_feedback = Feedback(
            texto=texto,
            texto_normalizado=texto_normalizado,
            fuente=fuente,
            sentimiento=resultado.sentimiento,
            categoria=resultado.categoria,
            urgencia=resultado.urgencia,
            resumen=resultado.resumen
        )
        
        # Generar hash
        nuevo_feedback.texto_hash = nuevo_feedback.generate_hash()
        
        db.add(nuevo_feedback)
        db.commit()
        db.refresh(nuevo_feedback)
        
        # 5. Agregar a vectorstore con metadata mejorada
        vectorstore.add_texts(
            texts=[texto_normalizado],
            metadatas=[{
                "feedback_id": nuevo_feedback.id,
                "sentimiento": resultado.sentimiento,
                "categoria": resultado.categoria,
                "urgencia": resultado.urgencia,
                "fuente": fuente,
                "fecha": nuevo_feedback.fecha.isoformat()
            }]
        )
        
        # Actualizar embedding_id
        nuevo_feedback.embedding_id = str(nuevo_feedback.id)
        db.commit()
        
        return resultado

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ====================== NUEVOS ENDPOINTS ======================

@app.post("/check-duplicate", response_model=FeedbackDuplicateCheck)
def verificar_duplicado(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Verifica si un feedback ya existe sin procesarlo"""
    texto_con_emojis = text_normalizer.emojis_to_text(feedback.texto)
    texto_normalizado = text_normalizer.normalize_text(texto_con_emojis)
    
    duplicado = check_duplicate(texto_normalizado, db)
    
    if duplicado:
        return FeedbackDuplicateCheck(
            is_duplicate=True,
            existing_feedback_id=duplicado.id,
            existing_text=duplicado.texto[:200],
            existing_date=duplicado.fecha
        )
    
    return FeedbackDuplicateCheck(is_duplicate=False)

@app.post("/rag/consultar")
async def consultar_rag(query: RAGQuery):
    """Consulta el sistema RAG sobre los feedbacks"""
    try:
        respuesta = await rag_system.consultar_tendencias(query.query, query.top_k)
        return {
            "query": query.query,
            "respuesta": respuesta,
            "top_k_utilizado": query.top_k
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en consulta RAG: {str(e)}")

@app.get("/rag/tendencias")
async def obtener_tendencias(dias: int = Query(30, ge=1, le=365)):
    """Obtiene análisis de tendencias de feedback"""
    try:
        tendencias = rag_system.analizar_sentimiento_tendencia(dias)
        return tendencias
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar tendencias: {str(e)}")

@app.get("/rag/recomendaciones")
async def obtener_recomendaciones():
    """Obtiene recomendaciones automáticas basadas en feedbacks"""
    try:
        recomendaciones = rag_system.recomendar_acciones()
        return {"recomendaciones": recomendaciones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar recomendaciones: {str(e)}")

@app.get("/rag/buscar/{tema}")
async def buscar_por_tema(tema: str, k: int = Query(10, ge=1, le=50)):
    """Busca feedbacks relacionados con un tema específico"""
    try:
        resultados = rag_system.buscar_por_tema(tema, k)
        return {
            "tema": tema,
            "total_encontrados": len(resultados),
            "resultados": resultados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en búsqueda: {str(e)}")

@app.get("/insights/avanzado")
async def insights_avanzados(db: Session = Depends(get_db)):
    """Obtiene insights avanzados incluyendo estadísticas de duplicados"""
    
    total = db.query(Feedback).count()
    
    # Estadísticas de duplicados (basado en hash)
    from sqlalchemy import func
    duplicados_stats = db.query(
        Feedback.texto_hash,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.texto_hash).having(func.count(Feedback.id) > 1).all()
    
    # Feedbacks en los últimos 7 días
    semana_pasada = datetime.utcnow() - timedelta(days=7)
    feedbacks_recientes = db.query(Feedback).filter(Feedback.fecha >= semana_pasada).count()
    
    # Fuentes más activas
    fuentes_stats = db.query(
        Feedback.fuente,
        func.count(Feedback.id).label('total')
    ).group_by(Feedback.fuente).all()
    
    return {
        "total_feedbacks": total,
        "feedbacks_ultima_semana": feedbacks_recientes,
        "posibles_duplicados": len([d for d in duplicados_stats if d.count > 1]),
        "distribucion_fuentes": {f[0]: f[1] for f in fuentes_stats},
        "tasa_crecimiento_diario": feedbacks_recientes / 7 if total > 0 else 0
    }

# ====================== ENDPOINTS EXISTENTES (MODIFICADOS) ======================

@app.post("/clasificar", response_model=Clasificacion)
def clasificar_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Clasifica feedback con validación, normalización y deduplicación"""
    return procesar_feedback(feedback.texto, feedback.fuente, db)

@app.post("/webhook/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update = await request.json()

    if "message" in update and "text" in update["message"]:
        texto = update["message"]["text"]
        chat_id = update["message"]["chat"]["id"]
        fuente = "telegram"

        try:
            resultado = procesar_feedback(texto, fuente, db)

            admin_chat_id = os.getenv("ADMIN_CHAT_ID")

            reply = (
                f"🤖 Nuevo feedback recibido\n\n"
                f"👤 Usuario: {chat_id}\n"
                f"💬 Texto: {texto}\n\n"
                f"🎯 Sentimiento: {resultado.sentimiento.upper()}\n"
                f"📂 Categoría: {resultado.categoria}\n"
                f"⚡ Urgencia: {resultado.urgencia.upper()}\n"
                f"📝 Resumen: {resultado.resumen}"
            )

            await send_telegram_message(chat_id, "✅ ¡Gracias por tu feedback! Ha sido procesado correctamente.")

            if admin_chat_id:
                await send_telegram_message(int(admin_chat_id), reply)

            return {"status": "procesado"}
            
        except HTTPException as e:
            if e.status_code == 409:
                # Feedback duplicado
                await send_telegram_message(chat_id, "⚠️ Este feedback ya ha sido reportado anteriormente. ¡Gracias de todas formas!")
                return {"status": "duplicado"}
            else:
                await send_telegram_message(chat_id, "❌ Hubo un error procesando tu feedback. Por favor intenta más tarde.")
                raise

    return {"status": "ignorado"}

# ====================== FUNCIONES EXISTENTES (SIN CAMBIOS) ======================

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

@app.get("/insights")
def obtener_insights(db: Session = Depends(get_db)):
    df = pd.read_sql("SELECT * FROM feedbacks", engine)

    if df.empty:
        return {"total": 0, "mensaje": "No hay feedbacks aún"}

    total = len(df)

    sentiment_count = df['sentimiento'].value_counts().to_dict()
    categoria_count = df['categoria'].value_counts().to_dict()
    urgencia_count = df['urgencia'].value_counts().to_dict()

    df_web = df[df["fuente"] == "web"]
    df_telegram = df[df["fuente"] == "telegram"]
    df_whatsapp = df[df["fuente"] == "whatsapp"]
    df_encuesta = df[df["fuente"] == "encuesta"]

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
    
    whatsapp_stats = {
        "total": len(df_whatsapp),
        "sentimiento": df_whatsapp['sentimiento'].value_counts().to_dict(),
        "categorias": df_whatsapp['categoria'].value_counts().to_dict(),
        "urgencia": df_whatsapp['urgencia'].value_counts().to_dict(),
    }
    
    encuesta_stats = {
        "total": len(df_encuesta),
        "sentimiento": df_encuesta['sentimiento'].value_counts().to_dict(),
        "categorias": df_encuesta['categoria'].value_counts().to_dict(),
        "urgencia": df_encuesta['urgencia'].value_counts().to_dict(),
    }

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
        "sentimiento": sentiment_count,
        "categorias": categoria_count,
        "urgencia": urgencia_count,
        "web": web_stats,
        "whatsapp": whatsapp_stats,
        "encuesta": encuesta_stats,
        "telegram": telegram_stats,
        "temas_recurrentes": temas
    }

@app.get("/feedbacks", response_model=List[FeedbackSchema])
def listar_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.fecha.desc()).all()

@app.get("/export/csv")
def exportar_csv():
    df = pd.read_sql("SELECT * FROM feedbacks", engine)
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedbacks_export.csv"}
    )

@app.get("/mensajes")
def obtener_mensajes_telegram(db: Session = Depends(get_db)):
    return db.query(Feedback).filter(Feedback.fuente == "telegram").all()