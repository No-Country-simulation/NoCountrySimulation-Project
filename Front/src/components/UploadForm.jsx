import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Sparkles, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  Tag,
  FileText,
  Globe,
  Loader2,
  CheckCircle2
} from 'lucide-react';

const UploadForm = ({ onSuccess, apiBase }) => {
  const [texto, setTexto] = useState('');
  const [fuente, setFuente] = useState('web');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setLoading(true);
    setResultado(null);
    try {
      const res = await axios.post(`${apiBase}/clasificar`, {
        texto,
        fuente
      });
      setResultado(res.data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onSuccess?.();
      setTexto('');
    } catch (error) {
      alert('Error al clasificar: ' + error.message);
    }
    setLoading(false);
  };

  const getSentimentConfig = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return { 
          icon: ThumbsUp, 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-50', 
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-700'
        };
      case 'negativo':
        return { 
          icon: ThumbsDown, 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700'
        };
      default:
        return { 
          icon: Minus, 
          color: 'text-slate-600', 
          bg: 'bg-slate-50', 
          border: 'border-slate-200',
          badge: 'bg-slate-100 text-slate-700'
        };
    }
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'alta':
        return { bg: 'bg-red-100 text-red-700' };
      case 'media':
        return { bg: 'bg-amber-100 text-amber-700' };
      default:
        return { bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const sentimentConfig = resultado ? getSentimentConfig(resultado.sentimiento) : null;
  const urgencyConfig = resultado ? getUrgencyConfig(resultado.urgencia) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Cargar Feedback Manual</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ingresa el texto del mensaje para clasificarlo con IA
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Mensaje de feedback
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega aqui el mensaje del cliente..."
              className="w-full min-h-[140px] px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 resize-none"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Fuente del feedback
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select 
                  value={fuente} 
                  onChange={(e) => setFuente(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="web">Web</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="encuesta">Encuesta</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex items-end">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading || !texto.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Clasificando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Clasificar con IA</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Feedback clasificado exitosamente</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {resultado && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mt-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-bold text-foreground">Resultado de la IA</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sentimiento */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-xl border ${sentimentConfig.border} ${sentimentConfig.bg} p-4`}
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <sentimentConfig.icon className={`h-4 w-4 ${sentimentConfig.color}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Sentimiento</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${sentimentConfig.badge}`}>
                    {resultado.sentimiento}
                  </span>
                </motion.div>
                
                {/* Categoria */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Tag className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Categoria</span>
                  </div>
                  <span className="inline-flex px-3 py-1 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground">
                    {resultado.categoria}
                  </span>
                </motion.div>
                
                {/* Urgencia */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Urgencia</span>
                  </div>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${urgencyConfig.bg}`}>
                    {resultado.urgencia}
                  </span>
                </motion.div>
                
                {/* Resumen */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-xl border border-border bg-secondary/30 p-4 sm:col-span-2 lg:col-span-1"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Resumen</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {resultado.resumen}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default UploadForm;
