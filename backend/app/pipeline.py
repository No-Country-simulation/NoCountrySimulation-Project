
# backend/app/pipeline.py
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_pinecone import PineconeVectorStore
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from .schemas import TextNormalizer
import os

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

class Clasificacion(BaseModel):
    sentimiento: str = Field(..., description="positivo, negativo o neutral")
    categoria: str = Field(..., description="producto, servicio, entrega, atencion, precio, calidad, etc.")
    urgencia: str = Field(..., description="alta, media o baja")
    resumen: str = Field(..., description="resumen corto en una frase")

parser = PydanticOutputParser(pydantic_object=Clasificacion)

prompt = ChatPromptTemplate.from_template(
    """Eres un experto analista de feedback de clientes para un negocio.
    Analiza el mensaje y clasifícalo de forma precisa.

    {format_instructions}

    Mensaje del cliente: {texto}
    Fuente: {fuente}
    """
)

chain = prompt | llm | parser

# Pinecone Vector Store para almacenar los embeddings de los feedbacks
vectorstore = PineconeVectorStore(
    index_name=os.getenv("PINECONE_INDEX_NAME", "feedbacks"),
    embedding=embeddings
)

# Instancia del normalizador de texto
text_normalizer = TextNormalizer()