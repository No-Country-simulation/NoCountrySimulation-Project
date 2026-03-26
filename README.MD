
# Feedback Classifier IA

Proyecto: Análisis automático de feedback (WhatsApp, web, encuestas).

## Tecnologías
- OpenAI (gpt-4o-mini + embeddings)
- LangChain
- FastAPI
- React + Recharts
- Pinecone + SQLite

## Cómo correr

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env
# Agrega tus claves
uvicorn app.main:app --reload