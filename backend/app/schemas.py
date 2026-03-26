
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FeedbackCreate(BaseModel):
    texto: str
    fuente: str = "whatsapp"

class Clasificacion(BaseModel):
    sentimiento: str
    categoria: str
    urgencia: str
    resumen: str

class FeedbackResponse(Clasificacion):
    id: int
    texto: str
    fuente: str
    fecha: datetime