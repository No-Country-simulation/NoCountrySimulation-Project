
# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
import pandas as pd
import os
import httpx
from typing import List, Optional
from .schemas import FeedbackSchema, FeedbackCreate, Clasificacion, RAGQuery, TextNormalizer, FeedbackDuplicateCheck
from fastapi.responses import StreamingResponse
import io
from dotenv import load_dotenv
from datetime import datetime, timedelta
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Cargar variables de entorno
load_dotenv()

from .pipeline import llm, chain, vectorstore, parser, text_normalizer
from .database import SessionLocal, engine
from .models import Base, Feedback

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
        
        # 5. Agregar a vectorstore si está disponible
        try:
            if vectorstore and texto_normalizado:
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
                nuevo_feedback.embedding_id = str(nuevo_feedback.id)
                db.commit()
        except Exception as e:
            print(f"Warning: No se pudo agregar a vectorstore: {e}")
        
        return resultado

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ====================== SISTEMA RAG ======================

def buscar_feedbacks_similares_sql(query: str, db: Session, k: int = 10) -> List[Feedback]:
    """Búsqueda simple basada en SQL para feedbacks relevantes"""
    # Dividir query en palabras clave (ignorar palabras comunes)
    palabras_comunes = {'que', 'como', 'cuales', 'cual', 'para', 'por', 'con', 'sin', 'una', 'una', 
                        'los', 'las', 'el', 'la', 'de', 'y', 'a', 'es', 'en', 'lo', 'del', 'al', 
                        'what', 'the', 'are', 'and', 'for', 'with', 'from', 'sobre', 'feedbacks'}
    
    palabras = [p.lower() for p in query.split() if len(p) > 3 and p.lower() not in palabras_comunes]
    
    if not palabras:
        # Si no hay palabras clave significativas, traer los más recientes
        return db.query(Feedback).order_by(desc(Feedback.fecha)).limit(k).all()
    
    # Construir condiciones de búsqueda - buscar en texto ORIGINAL (no normalizado)
    from sqlalchemy import func, or_
    
    conditions = []
    for palabra in palabras:
        # Buscar en texto original (este campo siempre tiene datos)
        conditions.append(Feedback.texto.ilike(f'%{palabra}%'))
        # Buscar en categoría
        conditions.append(Feedback.categoria.ilike(f'%{palabra}%'))
        # Buscar en resumen
        conditions.append(Feedback.resumen.ilike(f'%{palabra}%'))
        # Buscar en texto_normalizado si no es NULL
        conditions.append(Feedback.texto_normalizado.ilike(f'%{palabra}%'))
    
    # Búsqueda combinada
    feedbacks = db.query(Feedback).filter(or_(*conditions)).order_by(desc(Feedback.fecha)).limit(k).all()
    
    # Si no hay resultados, traer los más recientes
    if not feedbacks:
        feedbacks = db.query(Feedback).order_by(desc(Feedback.fecha)).limit(k).all()
    
    return feedbacks

async def consultar_rag_con_sql(pregunta: str, db: Session, top_k: int = 10) -> str:
    """Responde preguntas usando búsqueda SQL y LLM"""
    
    # Buscar feedbacks relevantes en la BD
    relevant_feedbacks = buscar_feedbacks_similares_sql(pregunta, db, top_k)
    
    if not relevant_feedbacks:
        return "No hay suficientes feedbacks en la base de datos para responder esta pregunta. Agrega algunos feedbacks primero."
    
    # Construir contexto con más detalle
    context_parts = []
    for i, fb in enumerate(relevant_feedbacks[:top_k]):
        context_parts.append(
            f"Feedback {i+1}:\n"
            f"Texto: {fb.texto[:300]}\n"
            f"Categoría: {fb.categoria}\n"
            f"Sentimiento: {fb.sentimiento}\n"
            f"Urgencia: {fb.urgencia}\n"
            f"Resumen: {fb.resumen}\n"
            f"Fuente: {fb.fuente}\n"
            f"Fecha: {fb.fecha.strftime('%Y-%m-%d')}\n"
        )
    
    context = "\n---\n".join(context_parts)
    
    # Prompt mejorado para respuesta inteligente
    prompt = ChatPromptTemplate.from_messages([
        ("system", """Eres un analista experto en feedback de clientes. Usa los siguientes feedbacks para responder 
        la pregunta del usuario de manera clara, concisa y basada en evidencia.
        
        Reglas importantes:
        1. Basa tu respuesta ÚNICAMENTE en los feedbacks proporcionados
        2. Si no hay suficiente información para responder completamente, indícalo claramente
        3. Menciona la cantidad de feedbacks que respaldan tu respuesta
        4. Destaca patrones, tendencias o insights importantes que observes
        5. Sé específico y cita ejemplos cuando sea relevante
        6. Usa un tono profesional pero accesible
        7. Si la pregunta es sobre problemas, enfócate en feedbacks negativos
        8. Si la pregunta es sobre aspectos positivos, enfócate en feedbacks positivos
        
        Contexto de feedbacks analizados (total: {total_feedbacks}):
        {context}
        """),
        ("human", "{pregunta}")
    ])
    
    try:
        # Usar el LLM existente de pipeline
        chain_rag = prompt | llm | StrOutputParser()
        
        respuesta = await chain_rag.ainvoke({
            "context": context,
            "pregunta": pregunta,
            "total_feedbacks": len(relevant_feedbacks)
        })
        
        return respuesta
    except Exception as e:
        print(f"Error en LLM: {e}")
        # Fallback: respuesta basada en datos más detallada
        return analizar_respuesta_fallback_detallada(relevant_feedbacks, pregunta)

def analizar_respuesta_fallback_detallada(feedbacks: List[Feedback], pregunta: str) -> str:
    """Respuesta de fallback más detallada cuando el LLM no está disponible"""
    if not feedbacks:
        return "No hay feedbacks disponibles para analizar."
    
    total = len(feedbacks)
    positivos = sum(1 for f in feedbacks if f.sentimiento == 'positivo')
    negativos = sum(1 for f in feedbacks if f.sentimiento == 'negativo')
    neutrales = sum(1 for f in feedbacks if f.sentimiento == 'neutral')
    
    # Categorías más comunes
    categorias = {}
    for f in feedbacks:
        categorias[f.categoria] = categorias.get(f.categoria, 0) + 1
    top_categorias = sorted(categorias.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Análisis según el tipo de pregunta
    pregunta_lower = pregunta.lower()
    
    if "problema" in pregunta_lower or "queja" in pregunta_lower or "negativo" in pregunta_lower:
        problemas = [f for f in feedbacks if f.sentimiento == 'negativo']
        if problemas:
            problemas_por_categoria = {}
            for p in problemas:
                problemas_por_categoria[p.categoria] = problemas_por_categoria.get(p.categoria, 0) + 1
            top_problemas = sorted(problemas_por_categoria.items(), key=lambda x: x[1], reverse=True)[:3]
            return f"He encontrado {len(problemas)} feedbacks negativos de un total de {total}. " \
                   f"Las principales categorías con problemas son: {', '.join([f'{cat} ({count})' for cat, count in top_problemas])}. " \
                   f"Ejemplo: '{problemas[0].texto[:100]}...'"
        else:
            return f"No se encontraron feedbacks negativos. De {total} feedbacks analizados, todos son positivos o neutrales."
    
    elif "positivo" in pregunta_lower or "bueno" in pregunta_lower or "gusta" in pregunta_lower:
        positivos_list = [f for f in feedbacks if f.sentimiento == 'positivo']
        if positivos_list:
            return f"He encontrado {len(positivos_list)} feedbacks positivos de un total de {total}. " \
                   f"Los clientes destacan especialmente la categoría '{positivos_list[0].categoria}'. " \
                   f"Ejemplo positivo: '{positivos_list[0].texto[:100]}...'"
        else:
            return f"No se encontraron feedbacks positivos en los {total} feedbacks analizados."
    
    else:
        # Respuesta general
        return f"He analizado {total} feedbacks. " \
               f"Resultados: {positivos} positivos, {negativos} negativos, {neutrales} neutrales. " \
               f"Categorías principales: {', '.join([f'{cat} ({count})' for cat, count in top_categorias])}. " \
               f"¿Te gustaría que profundice en algún aspecto específico?"

def analizar_respuesta_fallback(feedbacks: List[Feedback], pregunta: str) -> str:
    """Respuesta de fallback cuando el LLM no está disponible"""
    if not feedbacks:
        return "no hay suficientes datos para un análisis completo."
    
    # Estadísticas básicas
    total = len(feedbacks)
    positivos = sum(1 for f in feedbacks if f.sentimiento == 'positivo')
    negativos = sum(1 for f in feedbacks if f.sentimiento == 'negativo')
    
    # Categorías más comunes
    categorias = {}
    for f in feedbacks:
        categorias[f.categoria] = categorias.get(f.categoria, 0) + 1
    top_categoria = max(categorias.items(), key=lambda x: x[1]) if categorias else ("ninguna", 0)
    
    return f"de {total} feedbacks analizados, {positivos} son positivos y {negativos} negativos. " \
           f"La categoría más recurrente es '{top_categoria[0]}' con {top_categoria[1]} casos."

def analizar_tendencias_sql(db: Session, dias: int = 30) -> dict:
    """Analiza tendencias usando SQL directamente"""
    fecha_limite = datetime.utcnow() - timedelta(days=dias)
    
    feedbacks_periodo = db.query(Feedback).filter(Feedback.fecha >= fecha_limite).all()
    
    if not feedbacks_periodo:
        return {
            "tendencia_sentimiento": f"No hay feedbacks en los últimos {dias} días.",
            "problemas_comunes": "No hay datos suficientes para el análisis.",
            "total_feedbacks_analizados": 0
        }
    
    # Análisis de sentimiento
    sentimiento_counts = {}
    for f in feedbacks_periodo:
        sentimiento_counts[f.sentimiento] = sentimiento_counts.get(f.sentimiento, 0) + 1
    
    total = len(feedbacks_periodo)
    sentimiento_analisis = f"En los últimos {dias} días se han analizado {total} feedbacks. "
    
    if 'positivo' in sentimiento_counts:
        sentimiento_analisis += f"Positivos: {sentimiento_counts['positivo']} ({sentimiento_counts['positivo']*100/total:.1f}%). "
    if 'negativo' in sentimiento_counts:
        sentimiento_analisis += f"Negativos: {sentimiento_counts['negativo']} ({sentimiento_counts['negativo']*100/total:.1f}%). "
    if 'neutral' in sentimiento_counts:
        sentimiento_analisis += f"Neutrales: {sentimiento_counts['neutral']} ({sentimiento_counts['neutral']*100/total:.1f}%). "
    
    # Problemas comunes (feedback negativo)
    problemas = [f for f in feedbacks_periodo if f.sentimiento == 'negativo']
    if problemas:
        categorias_problemas = {}
        for p in problemas:
            categorias_problemas[p.categoria] = categorias_problemas.get(p.categoria, 0) + 1
        
        top_problemas = sorted(categorias_problemas.items(), key=lambda x: x[1], reverse=True)[:3]
        problemas_texto = "Los principales problemas identificados son: " + ", ".join([f"{cat} ({count} casos)" for cat, count in top_problemas])
    else:
        problemas_texto = "No se identificaron problemas significativos en el período analizado."
    
    return {
        "tendencia_sentimiento": sentimiento_analisis,
        "problemas_comunes": problemas_texto,
        "total_feedbacks_analizados": total
    }

# ====================== ENDPOINTS RAG CORREGIDOS ======================

@app.post("/rag/consultar")
async def consultar_rag(query: RAGQuery, db: Session = Depends(get_db)):
    """Consulta el sistema RAG sobre los feedbacks"""
    try:
        respuesta = await consultar_rag_con_sql(query.query, db, query.top_k)
        return {
            "query": query.query,
            "respuesta": respuesta,
            "top_k_utilizado": query.top_k
        }
    except Exception as e:
        print(f"Error en consulta RAG: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en consulta RAG: {str(e)}")

@app.get("/rag/tendencias")
async def obtener_tendencias(dias: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Obtiene análisis de tendencias de feedback"""
    try:
        tendencias = analizar_tendencias_sql(db, dias)
        return tendencias
    except Exception as e:
        print(f"Error al analizar tendencias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al analizar tendencias: {str(e)}")

@app.get("/rag/recomendaciones")
async def obtener_recomendaciones(db: Session = Depends(get_db)):
    """Obtiene recomendaciones automáticas basadas en feedbacks negativos y urgencias altas"""
    try:
        # Buscar feedbacks negativos o de alta urgencia
        feedbacks_criticos = db.query(Feedback).filter(
            or_(
                Feedback.sentimiento == 'negativo',
                Feedback.urgencia == 'alta'
            )
        ).order_by(desc(Feedback.fecha)).limit(20).all()
        
        if not feedbacks_criticos:
            recomendacion = "No hay feedbacks negativos o de alta urgencia en el sistema. ¡Sigue así!"
        else:
            # Analizar patrones
            categorias_problemas = {}
            for fb in feedbacks_criticos:
                categorias_problemas[fb.categoria] = categorias_problemas.get(fb.categoria, 0) + 1
            
            top_categorias = sorted(categorias_problemas.items(), key=lambda x: x[1], reverse=True)[:3]
            
            # Generar recomendaciones con LLM
            prompt_recomendaciones = ChatPromptTemplate.from_messages([
                ("system", """Eres un consultor de experiencia al cliente. Basado en los siguientes feedbacks críticos,
                genera 3 recomendaciones concretas y accionables para mejorar la satisfacción del cliente.
                
                Formato de respuesta: Usa viñetas (•) para cada recomendación y sé específico."""),
                ("human", f"""Feedbacks críticos encontrados:
                Total: {len(feedbacks_criticos)}
                Categorías con más problemas: {', '.join([f'{cat} ({count})' for cat, count in top_categorias])}
                
                Genera recomendaciones prioritarias.""")
            ])
            
            try:
                chain_rec = prompt_recomendaciones | llm | StrOutputParser()
                recomendacion = await chain_rec.ainvoke({})
            except:
                # Fallback
                recomendacion = f"• Priorizar atención a la categoría '{top_categorias[0][0]}' con {top_categorias[0][1]} feedbacks negativos.\n" \
                              f"• Revisar procesos relacionados con {', '.join([cat for cat, _ in top_categorias[:2]])}.\n" \
                              f"• Implementar seguimiento personalizado para feedbacks de alta urgencia."
        
        return {"recomendaciones": recomendacion}
    except Exception as e:
        print(f"Error al generar recomendaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al generar recomendaciones: {str(e)}")

@app.get("/rag/buscar/{tema}")
async def buscar_por_tema(tema: str, k: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    """Busca feedbacks relacionados con un tema específico"""
    try:
        resultados = buscar_feedbacks_similares_sql(tema, db, k)
        
        # Formatear resultados
        formatted_results = []
        for fb in resultados:
            formatted_results.append({
                "id": fb.id,
                "texto": fb.texto[:200],
                "categoria": fb.categoria,
                "sentimiento": fb.sentimiento,
                "urgencia": fb.urgencia,
                "resumen": fb.resumen,
                "fuente": fb.fuente,
                "fecha": fb.fecha.isoformat()
            })
        
        return {
            "tema": tema,
            "total_encontrados": len(formatted_results),
            "resultados": formatted_results
        }
    except Exception as e:
        print(f"Error en búsqueda: {str(e)}")
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

# ====================== ENDPOINTS EXISTENTES ======================

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
                await send_telegram_message(chat_id, "⚠️ Este feedback ya ha sido reportado anteriormente. ¡Gracias de todas formas!")
                return {"status": "duplicado"}
            else:
                await send_telegram_message(chat_id, "❌ Hubo un error procesando tu feedback. Por favor intenta más tarde.")
                raise

    return {"status": "ignorado"}

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

    # Temas recurrentes usando SQL
    feedbacks_textos = df['texto_normalizado'].dropna().head(20).tolist()
    
    temas = "Análisis de temas disponibles en el dashboard de insights"
    if feedbacks_textos:
        try:
            temas_prompt = ChatPromptTemplate.from_messages([
                ("system", "Resume en máximo 6 temas claros basado en los siguientes feedbacks:"),
                ("human", str(feedbacks_textos[:15]))
            ])
            temas_chain = temas_prompt | llm | StrOutputParser()
            temas = temas_chain.invoke({})
        except:
            temas = "Basado en los datos disponibles, revisa el dashboard para más detalles."

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