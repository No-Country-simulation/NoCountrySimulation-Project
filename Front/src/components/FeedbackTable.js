
// Front/src/components/FeedbackTable.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import axios from 'axios';

const getSentimentBadge = (sentiment) => {
  const styles = {
    positivo: 'bg-success/10 text-success border-success/20',
    negativo: 'bg-destructive/10 text-destructive border-destructive/20',
    neutral: 'bg-neutral/10 text-neutral border-neutral/20'
  };
  return styles[sentiment] || styles.neutral;
};

const getUrgencyBadge = (urgency) => {
  const styles = {
    alta: 'bg-destructive/10 text-destructive border-destructive/20',
    media: 'bg-warning/10 text-warning border-warning/20',
    baja: 'bg-success/10 text-success border-success/20'
  };
  return styles[urgency] || styles.baja;
};

const FeedbackTable = ({ feedbacks, loading, apiBase }) => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${apiBase}/export/csv`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedbacks_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar CSV:', error);
      alert('Error al descargar el archivo CSV');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 bg-card rounded-2xl border border-border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border">
        <p className="text-muted-foreground">No hay feedbacks aún. Agrega uno para ver la lista.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Fecha</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Fuente</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Texto</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Sentimiento</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Categoría</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Urgencia</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Resumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {feedbacks.map((fb, index) => (
              <motion.tr 
                key={fb.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-muted/30 transition-colors duration-200"
              >
                <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                  {fb.fecha ? new Date(fb.fecha).toLocaleString() : "N/A"}
                </td>
                <td className="px-5 py-4 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      fb.fuente === 'telegram' ? 'bg-sky-500' : 'bg-accent'
                    }`} />
                    {fb.fuente}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-foreground max-w-xs truncate">
                  {fb.texto?.substring(0, 100)}...
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getSentimentBadge(fb.sentimiento)}`}>
                    {fb.sentimiento}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  {fb.categoria}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getUrgencyBadge(fb.urgencia)}`}>
                    {fb.urgencia}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground max-w-xs">
                  {fb.resumen?.substring(0, 80)}...
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-5 border-t border-border bg-muted/30">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-success to-success/80 text-white font-medium hover:shadow-glow-success transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? 'Descargando...' : 'Descargar CSV'}
        </motion.button>
      </div>
    </div>
  );
};

export default FeedbackTable;