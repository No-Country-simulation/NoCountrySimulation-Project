
// Front/src/components/UploadForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle } from 'lucide-react';

const UploadForm = ({ onSuccess, apiBase }) => {
  const [texto, setTexto] = useState('');
  const [fuente, setFuente] = useState('web');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

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
      if (onSuccess) onSuccess();
      setTexto('');
      
      // Limpiar resultado después de 5 segundos
      setTimeout(() => setResultado(null), 5000);
    } catch (error) {
      console.error('Error al clasificar:', error);
      alert('Error al clasificar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Cargar Feedback Manual</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pega aquí el mensaje de WhatsApp..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200 resize-none"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200 cursor-pointer"
            disabled={loading}
          >
            <option value="web">Formulario Web</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="encuesta">Encuesta</option>
          </select>

          <motion.button
            type="submit"
            disabled={loading || !texto.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold hover:shadow-glow-primary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Clasificando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Clasificar con IA
              </>
            )}
          </motion.button>
        </div>
      </form>

      <AnimatePresence>
        {resultado && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mt-6 p-5 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-success/20">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-3">Resultado de la IA:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sentimiento:</span>
                    <p className="font-medium text-foreground mt-1">{resultado.sentimiento}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoría:</span>
                    <p className="font-medium text-foreground mt-1">{resultado.categoria}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Urgencia:</span>
                    <p className="font-medium text-foreground mt-1">{resultado.urgencia}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-muted-foreground">Resumen:</span>
                    <p className="font-medium text-foreground mt-1">{resultado.resumen}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UploadForm;