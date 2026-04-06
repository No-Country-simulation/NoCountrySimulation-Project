
# backend/app/rag.py
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_pinecone import PineconeVectorStore
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

class RAGSystem:
    """Sistema RAG para consultas inteligentes sobre feedbacks"""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vectorstore = PineconeVectorStore(
            index_name=os.getenv("PINECONE_INDEX_NAME", "feedbacks"),
            embedding=self.embeddings
        )
        
    def buscar_feedbacks_similares(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Busca feedbacks similares usando búsqueda semántica"""
        try:
            results = self.vectorstore.similarity_search_with_score(query, k=k)
            return [
                {
                    "texto": doc.page_content,
                    "metadata": doc.metadata,
                    "score": score,
                    "relevancia": "alta" if score > 0.8 else "media" if score > 0.6 else "baja"
                }
                for doc, score in results
            ]
        except Exception as e:
            print(f"Error en búsqueda semántica: {e}")
            return []
    
    def consultar_tendencias(self, pregunta: str, top_k: int = 10) -> str:
        """Responde preguntas sobre tendencias de feedback usando RAG"""
        
        # Buscar feedbacks relevantes
        relevant_feedbacks = self.buscar_feedbacks_similares(pregunta, top_k)
        
        if not relevant_feedbacks:
            return "No hay suficientes feedbacks para responder esta pregunta."
        
        # Construir contexto
        context = "\n\n".join([
            f"Feedback {i+1}: {fb['texto']} (relevancia: {fb['relevancia']})"
            for i, fb in enumerate(relevant_feedbacks)
        ])
        
        # Prompt para respuesta inteligente
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Eres un analista de feedback de clientes. Usa los siguientes feedbacks para responder 
            la pregunta del usuario de manera clara, concisa y basada en evidencia.
            
            Reglas:
            1. Basa tu respuesta ÚNICAMENTE en los feedbacks proporcionados
            2. Si no hay suficiente información, indícalo claramente
            3. Menciona la cantidad de feedbacks que respaldan tu respuesta
            4. Destaca patrones o tendencias importantes
            
            Contexto de feedbacks:
            {context}
            """),
            ("human", "{pregunta}")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        respuesta = chain.invoke({
            "context": context,
            "pregunta": pregunta
        })
        
        return respuesta
    
    def analizar_sentimiento_tendencia(self, periodo_dias: int = 30) -> Dict[str, Any]:
        """Analiza tendencias de sentimiento usando RAG"""
        pregunta = f"Analiza la evolución del sentimiento en los últimos {periodo_dias} días. ¿Qué patrones observas?"
        respuesta = self.consultar_tendencias(pregunta, top_k=20)
        
        # También buscar problemas comunes
        problemas = self.consultar_tendencias(
            "¿Cuáles son los principales problemas o quejas recurrentes?",
            top_k=15
        )
        
        return {
            "tendencia_sentimiento": respuesta,
            "problemas_comunes": problemas,
            "total_feedbacks_analizados": len(self.buscar_feedbacks_similares("todos los feedbacks", 50))
        }
    
    def recomendar_acciones(self) -> str:
        """Recomienda acciones basadas en feedbacks negativos y urgencias altas"""
        pregunta = """Basado en los feedbacks negativos y de alta urgencia, ¿qué acciones concretas 
        recomendarías para mejorar la satisfacción del cliente? Prioriza las 3 acciones más importantes."""
        
        return self.consultar_tendencias(pregunta, top_k=25)
    
    def buscar_por_tema(self, tema: str, k: int = 10) -> List[Dict[str, Any]]:
        """Busca feedbacks relacionados con un tema específico"""
        query = f"feedbacks relacionados con {tema}"
        return self.buscar_feedbacks_similares(query, k)

# Instancia global
rag_system = RAGSystem()