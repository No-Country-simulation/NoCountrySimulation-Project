
from pydantic import BaseModel
from datetime import datetime
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

class FeedbackSchema(BaseModel):
    id: int
    texto: str
    fuente: str
    sentimiento: str
    categoria: str
    urgencia: str
    resumen: str
    fecha: datetime

class Config:
    from_attributes = True  # 👈 IMPORTANTE (antes orm_mode)