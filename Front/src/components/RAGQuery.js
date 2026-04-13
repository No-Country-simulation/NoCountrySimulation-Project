
// Front/src/components/RAGQuery.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  TrendingUp, 
  Lightbulb,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

const RAGQuery = ({ apiBase }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('consultar');
  const [expanded, setExpanded] = useState(true);

  const handleConsult = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`${apiBase}/rag/consultar`, {
        query: query,
        top_k: 5
      });
      setResponse({
        type: 'consult',
        data: res.data
      });
    } catch (error) {
      console.error('Error en consulta RAG:', error);
      setResponse({ 
        type: 'error',
        error: true, 
        data: { respuesta: 'Error al consultar el sistema RAG. Verifica que el backend esté corriendo.' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTendencias = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/rag/tendencias?dias=30`);
      setResponse({
        type: 'tendencias',
        data: res.data
      });
    } catch (error) {
      console.error('Error obteniendo tendencias:', error);
      setResponse({ 
        type: 'error',
        error: true, 
        data: { respuesta: 'Error al obtener tendencias.' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecomendaciones = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/rag/recomendaciones`);
      setResponse({
        type: 'recomendaciones',
        data: res.data
      });
    } catch (error) {
      console.error('Error obteniendo recomendaciones:', error);
      setResponse({ 
        type: 'error',
        error: true, 
        data: { respuesta: 'Error al obtener recomendaciones.' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConsult();
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Limpiar respuesta al cambiar de tab para evitar errores de estructura
    setResponse(null);
  };

  const preguntasSugeridas = [
    "¿Cuáles son los principales problemas que reportan los clientes?",
    "¿Qué opinan los clientes sobre el servicio?",
    "¿Cómo podemos mejorar la satisfacción del cliente?",
    "¿Qué productos generan más quejas?",
    "¿Qué aspectos positivos destacan más los clientes?"
  ];

  // Función para renderizar el contenido según el tipo de respuesta
  const renderResponseContent = () => {
    if (!response) return null;

    if (response.type === 'error') {
      return (
        <div className="space-y-3 text-sm">
          <p className="text-destructive">{response.data.respuesta}</p>
        </div>
      );
    }

    if (response.type === 'tendencias') {
      const data = response.data;
      return (
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground mb-1">Tendencia de sentimiento:</p>
            <p className="text-muted-foreground">{data.tendencia_sentimiento || 'No hay datos disponibles'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Problemas comunes:</p>
            <p className="text-muted-foreground">{data.problemas_comunes || 'No se identificaron problemas'}</p>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            📊 Total feedbacks analizados: {data.total_feedbacks_analizados || 0}
          </div>
        </div>
      );
    }

    if (response.type === 'recomendaciones') {
      const data = response.data;
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
            {data.recomendaciones || 'No hay recomendaciones disponibles'}
          </p>
        </div>
      );
    }

    if (response.type === 'consult') {
      const data = response.data;
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
            {data.respuesta || 'No se pudo generar una respuesta'}
          </p>
          {data.top_k_utilizado && (
            <div className="text-xs text-muted-foreground mt-2">
              🔍 Basado en los {data.top_k_utilizado} feedbacks más relevantes
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Función para obtener el título de la respuesta
  const getResponseTitle = () => {
    if (!response) return '';
    if (response.type === 'error') return '❌ Error';
    if (response.type === 'recomendaciones') return '💡 Recomendaciones IA';
    if (response.type === 'tendencias') return '📊 Análisis de Tendencias';
    if (response.type === 'consult') return '🔍 Respuesta';
    return '';
  };

  // Función para obtener el ícono de la respuesta
  const getResponseIcon = () => {
    if (!response) return null;
    if (response.type === 'recomendaciones') return <Lightbulb className="w-5 h-5 text-warning" />;
    if (response.type === 'tendencias') return <TrendingUp className="w-5 h-5 text-primary" />;
    if (response.type === 'consult') return <MessageSquare className="w-5 h-5 text-primary" />;
    if (response.type === 'error') return null;
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden"
    >
      {/* Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Asistente IA - Consulta Inteligente</h3>
            <p className="text-sm text-muted-foreground">Haz preguntas sobre tus feedbacks usando IA avanzada</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-5 space-y-5">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-border">
                <button
                  onClick={() => handleTabChange('consultar')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                    activeTab === 'consultar'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Consultar
                </button>
                <button
                  onClick={() => handleTabChange('tendencias')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                    activeTab === 'tendencias'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Tendencias
                </button>
                <button
                  onClick={() => handleTabChange('recomendaciones')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                    activeTab === 'recomendaciones'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 inline mr-2" />
                  Recomendaciones
                </button>
              </div>

              {/* Contenido según tab */}
              {activeTab === 'consultar' && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ejemplo: ¿Cuáles son los principales problemas que reportan los clientes?"
                      rows={3}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
                      disabled={loading}
                    />
                    <button
                      onClick={handleConsult}
                      disabled={loading || !query.trim()}
                      className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">📌 Preguntas sugeridas:</p>
                    <div className="flex flex-wrap gap-2">
                      {preguntasSugeridas.map((sugerencia, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(sugerencia)}
                          className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                        >
                          {sugerencia}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tendencias' && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Analiza automáticamente las tendencias de sentimiento y problemas recurrentes
                  </p>
                  <button
                    onClick={handleTendencias}
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-glow-primary transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <TrendingUp className="w-4 h-4 inline mr-2" />}
                    Analizar tendencias (últimos 30 días)
                  </button>
                </div>
              )}

              {activeTab === 'recomendaciones' && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Obtén recomendaciones accionables basadas en feedbacks negativos y urgencias altas
                  </p>
                  <button
                    onClick={handleRecomendaciones}
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-warning to-warning/80 text-white font-medium hover:shadow-glow-warning transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Lightbulb className="w-4 h-4 inline mr-2" />}
                    Generar recomendaciones
                  </button>
                </div>
              )}

              {/* Respuesta */}
              <AnimatePresence>
                {response && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/20">
                        {getResponseIcon()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-2">
                          {getResponseTitle()}
                        </h4>
                        {renderResponseContent()}
                      </div>
                      <button
                        onClick={() => setResponse(null)}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RAGQuery;