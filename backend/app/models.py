
from sqlalchemy import Column, Integer, String, Text, DateTime
from .database import Base
import datetime

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(Text, nullable=False)
    fuente = Column(String(50), default="whatsapp")
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    sentimiento = Column(String(20))
    categoria = Column(String(100))
    urgencia = Column(String(20))
    resumen = Column(Text)
    embedding_id = Column(String(100))