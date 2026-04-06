
# backend/app/schemas.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional
import re
import unicodedata

class TextNormalizer:
    @staticmethod
    def normalize_text(text: str) -> str:
        """Normaliza texto: lowercase, sin espacios extra, sin caracteres raros, acentos normalizados"""
        if not text or not isinstance(text, str):
            return ""
        
        # Convertir a lowercase
        text = text.lower()
        
        # Normalizar acentos (convertir áéíóú a aeiou)
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(c for c in text if not unicodedata.combining(c))
        
        # Reemplazar caracteres especiales comunes
        replacements = {
            'ñ': 'n', 'Ñ': 'n',
            '¿': '', '?': '?',
            '¡': '', '!': '!',
            ',': ' ', '.': ' ',
            ';': ' ', ':': ' ',
            '(': ' ', ')': ' ',
            '[': ' ', ']': ' ',
            '{': ' ', '}': ' ',
            '<': ' ', '>': ' ',
            '/': ' ', '\\': ' ',
            '|': ' ', '·': ' ',
            '~': ' ', '`': ' ',
            '+': ' ', '=': ' ',
            '*': ' ', '&': ' ',
            '%': ' ', '$': ' ',
            '#': ' ', '@': ' ',
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Eliminar caracteres que no sean letras, números, espacios o puntuación básica
        text = re.sub(r'[^a-z0-9\s\?\!\.]', ' ', text)
        
        # Eliminar espacios múltiples y trim
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    @staticmethod
    def emojis_to_text(text: str) -> str:
        """Convierte emojis comunes a texto"""
        emoji_map = {
            '😀': 'feliz', '😃': 'feliz', '😄': 'feliz', '😁': 'feliz', '😆': 'feliz',
            '😅': 'feliz', '😂': 'riendo', '🤣': 'riendo', '😊': 'contento', '😇': 'angelical',
            '🙂': 'sonriente', '🙃': 'boca arriba', '😉': 'guiño', '😌': 'aliviado',
            '😍': 'amor', '🥰': 'amor', '😘': 'beso', '😗': 'beso', '😙': 'beso',
            '😚': 'beso', '😋': 'delicioso', '😛': 'lengua', '😜': 'lengua', '😝': 'lengua',
            '🤑': 'dinero', '🤗': 'abrazar', '🤭': 'risa', '🤫': 'silencio', '🤔': 'pensando',
            '🤐': 'silencio', '🤨': 'duda', '😐': 'neutral', '😑': 'neutral', '😶': 'silencio',
            '😏': 'sarcasmo', '😒': 'fastidiado', '🙄': 'rodar ojos', '😬': 'mueca',
            '🤥': 'mentiroso', '😌': 'aliviado', '😔': 'triste', '😪': 'somnoliento',
            '🤤': 'baboso', '😴': 'dormido', '😷': 'mascarilla', '🤒': 'fiebre',
            '🤕': 'herido', '🤑': 'dinero', '🤠': 'vaquero', '😈': 'diablo',
            '👿': 'diablo', '👹': 'ogro', '👺': 'demonio', '💀': 'muerto',
            '👻': 'fantasma', '👽': 'alien', '🤖': 'robot', '😺': 'gato',
            '😸': 'gato', '😹': 'gato', '😻': 'gato', '😼': 'gato', '😽': 'gato',
            '🙀': 'gato', '😿': 'gato', '😾': 'gato', '🙈': 'mono', '🙉': 'mono',
            '🙊': 'mono', '💋': 'beso', '💌': 'carta', '💘': 'corazon', '💝': 'corazon',
            '💖': 'corazon', '💗': 'corazon', '💓': 'corazon', '💞': 'corazon', '💕': 'corazon',
            '💟': 'corazon', '❣️': 'exclamacion', '💔': 'corazon roto', '❤️': 'amor',
            '🧡': 'amor', '💛': 'amor', '💚': 'amor', '💙': 'amor', '💜': 'amor',
            '🤎': 'amor', '🖤': 'amor', '🤍': 'amor', '💯': 'cien', '💢': 'enojo',
            '💥': 'explosion', '💫': 'estrella', '💦': 'sudor', '💨': 'viento',
            '🕳️': 'hoyo', '💣': 'bomba', '💬': 'dialogo', '🗯️': 'dialogo',
            '💭': 'pensamiento', '💤': 'zzz', '👋': 'hola', '🤚': 'mano',
            '🖐️': 'mano', '✋': 'mano', '🖖': 'saludo', '👌': 'ok', '🤌': 'pizca',
            '🤏': 'pizca', '✌️': 'victoria', '🤞': 'suerte', '🤟': 'te quiero',
            '🤘': 'cuernos', '🤙': 'llamame', '👈': 'izquierda', '👉': 'derecha',
            '👆': 'arriba', '🖕': 'groseria', '👇': 'abajo', '☝️': 'arriba',
            '👍': 'pulgar arriba', '👎': 'pulgar abajo', '✊': 'punio', '👊': 'punio',
            '🤛': 'punio', '🤜': 'punio', '👏': 'aplauso', '🙌': 'alegria',
            '👐': 'abierto', '🤲': 'manos', '🤝': 'apreton', '🙏': 'gracias',
        }
        
        for emoji, text_replacement in emoji_map.items():
            text = text.replace(emoji, f' {text_replacement} ')
        
        return text

class FeedbackCreate(BaseModel):
    texto: str = Field(..., min_length=3, max_length=2000, description="Texto del feedback")
    fuente: str = Field(default="web", description="Fuente del feedback: web, whatsapp, encuesta, telegram")
    
    @validator('texto')
    def validar_texto(cls, v):
        # Normalizar texto primero
        normalizer = TextNormalizer()
        
        # Convertir emojis a texto
        v = normalizer.emojis_to_text(v)
        
        # Normalizar: lowercase, sin espacios extra, sin caracteres raros, acentos normalizados
        v = normalizer.normalize_text(v)
        
        # Validar longitud mínima después de normalización
        if len(v) < 3:
            raise ValueError('El texto debe tener al menos 3 caracteres significativos')
        
        return v
    
    @validator('fuente')
    def validar_fuente(cls, v):
        fuentes_validas = ['web', 'whatsapp', 'encuesta', 'telegram']
        if v not in fuentes_validas:
            raise ValueError(f'Fuente debe ser una de: {", ".join(fuentes_validas)}')
        return v

class Clasificacion(BaseModel):
    sentimiento: str = Field(..., description="positivo, negativo o neutral")
    categoria: str = Field(..., description="producto, servicio, entrega, atencion, precio, calidad, etc.")
    urgencia: str = Field(..., description="alta, media o baja")
    resumen: str = Field(..., min_length=5, max_length=200, description="resumen corto en una frase")

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
        from_attributes = True

class FeedbackDuplicateCheck(BaseModel):
    is_duplicate: bool
    existing_feedback_id: Optional[int] = None
    existing_text: Optional[str] = None
    existing_date: Optional[datetime] = None

class RAGQuery(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)