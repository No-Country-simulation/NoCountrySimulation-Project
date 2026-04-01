import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  MessageSquare, 
  Sparkles,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react';

import Header from './components/Header';
import UploadForm from './components/UploadForm';
import InsightsDashboard from './components/InsightsDashboard';
import FeedbackTable from './components/FeedbackTable';

const API_BASE = 'http://localhost:8000';

function App() {
  const [insights, setInsights] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsRes, feedbacksRes] = await Promise.all([
        axios.get(`${API_BASE}/insights`),
        axios.get(`${API_BASE}/feedbacks`)
      ]);
      setInsights(insightsRes.data);
      setFeedbacks(feedbacksRes.data);
    } catch (err) {
      setError('Error al cargar datos. Verifica que el backend este corriendo en localhost:8000');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNewFeedback = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center py-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Potenciado por Inteligencia Artificial
            </motion.div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
              Feedback <span className="gradient-text">Classifier</span> IA
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Clasificacion automatica de feedback de clientes. 
              Analiza sentimientos, categorias y urgencias en segundos con IA.
            </p>
          </motion.section>

          {/* Upload Form Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <UploadForm onSuccess={handleNewFeedback} apiBase={API_BASE} />
          </motion.section>

          {/* Refresh Button */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-medium hover:border-primary/40 hover:shadow-medium transition-all duration-300 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar Dashboard'}
            </motion.button>
          </motion.div>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dashboard Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard de Insights</h2>
            </div>
            <InsightsDashboard insights={insights} loading={loading} />
          </motion.section>

          {/* Feedbacks Table Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/20">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Lista de Feedbacks Clasificados</h2>
            </div>
            <FeedbackTable feedbacks={feedbacks} loading={loading} apiBase={API_BASE} />
          </motion.section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border bg-card/60 backdrop-blur-sm mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-foreground">Feedback Classifier IA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Clasificacion inteligente de feedback con IA - Telegram + Web
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
