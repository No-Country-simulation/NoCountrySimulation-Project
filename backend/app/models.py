
# backend/app/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from .database import Base
import datetime
import hashlib

class Feedback(Base):
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    texto = Column(Text, nullable=False)
    texto_normalizado = Column(Text, nullable=True)  # Texto normalizado para búsqueda
    texto_hash = Column(String(64), unique=True, nullable=True, index=True)  # SHA-256 hash para deduplicación
    fuente = Column(String(50), default="whatsapp")
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    sentimiento = Column(String(20))
    categoria = Column(String(100))
    urgencia = Column(String(20))
    resumen = Column(Text)
    embedding_id = Column(String(100), nullable=True)  # ID en Pinecone
    
    def generate_hash(self):
        """Genera un hash SHA-256 del texto normalizado para deduplicación"""
        if self.texto_normalizado:
            return hashlib.sha256(self.texto_normalizado.encode('utf-8')).hexdigest()
        return None
    
    __table_args__ = (
        Index('ix_feedbacks_texto_hash', 'texto_hash'),
        Index('ix_feedbacks_fecha', 'fecha'),
    )