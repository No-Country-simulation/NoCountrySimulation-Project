import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  MessageSquare,
  Calendar,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  Tag,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  TableIcon,
  Download
} from 'lucide-react';

// Skeleton loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-lg ${className}`} />
);

const FeedbackTable = ({ feedbacks = [], loading, apiBase }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const itemsPerPage = 10;

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      window.open(`${apiBase}/export/csv`, '_blank');
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
    setTimeout(() => setDownloading(false), 1000);
  };

  const getSentimentConfig = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return { 
          icon: ThumbsUp, 
          bg: 'bg-emerald-100', 
          text: 'text-emerald-700',
          border: 'border-emerald-200'
        };
      case 'negativo':
        return { 
          icon: ThumbsDown, 
          bg: 'bg-red-100', 
          text: 'text-red-700',
          border: 'border-red-200'
        };
      default:
        return { 
          icon: Minus, 
          bg: 'bg-slate-100', 
          text: 'text-slate-700',
          border: 'border-slate-200'
        };
    }
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'alta':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'media':
        return { bg: 'bg-amber-100', text: 'text-amber-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const getSourceConfig = (source) => {
    switch (source?.toLowerCase()) {
      case 'telegram':
        return { icon: Send, bg: 'bg-sky-100', text: 'text-sky-700' };
      case 'whatsapp':
        return { icon: MessageSquare, bg: 'bg-emerald-100', text: 'text-emerald-700' };
      default:
        return { icon: Globe, bg: 'bg-violet-100', text: 'text-violet-700' };
    }
  };

  // Pagination
  const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFeedbacks = feedbacks.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-accent/5 to-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
              <TableIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Lista de Feedbacks Clasificados</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {feedbacks.length} registros en total
              </p>
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadCSV}
            disabled={downloading || feedbacks.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-foreground font-medium hover:border-primary/40 hover:bg-secondary/50 transition-all duration-300 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar CSV
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {feedbacks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-5">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Sin feedbacks</h3>
            <p className="text-muted-foreground max-w-sm">
              Aun no hay feedbacks clasificados. Carga uno usando el formulario de arriba para comenzar.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Fecha
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        Fuente
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Texto
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sentimiento
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5" />
                        Categoria
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Urgencia
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resumen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginatedFeedbacks.map((fb, index) => {
                      const sentimentConfig = getSentimentConfig(fb.sentimiento);
                      const urgencyConfig = getUrgencyConfig(fb.urgencia);
                      const sourceConfig = getSourceConfig(fb.fuente);
                      const SentimentIcon = sentimentConfig.icon;
                      const SourceIcon = sourceConfig.icon;

                      return (
                        <motion.tr 
                          key={fb.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors duration-200"
                        >
                          <td className="py-4 px-4">
                            <span className="text-sm text-foreground whitespace-nowrap font-medium">
                              {fb.fecha ? new Date(fb.fecha).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 'N/A'}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {fb.fecha ? new Date(fb.fecha).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sourceConfig.bg} ${sourceConfig.text}`}>
                              <SourceIcon className="h-3 w-3" />
                              {fb.fuente}
                            </span>
                          </td>
                          <td className="py-4 px-4 max-w-[280px]">
                            <p className="text-sm text-foreground line-clamp-2" title={fb.texto}>
                              {fb.texto}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sentimentConfig.bg} ${sentimentConfig.text}`}>
                              <SentimentIcon className="h-3 w-3" />
                              {fb.sentimiento}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground">
                              {fb.categoria}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${urgencyConfig.bg} ${urgencyConfig.text}`}>
                              {fb.urgencia}
                            </span>
                          </td>
                          <td className="py-4 px-4 max-w-[220px]">
                            <p className="text-sm text-muted-foreground line-clamp-2" title={fb.resumen}>
                              {fb.resumen}
                            </p>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              <AnimatePresence>
                {paginatedFeedbacks.map((fb, index) => {
                  const sentimentConfig = getSentimentConfig(fb.sentimiento);
                  const urgencyConfig = getUrgencyConfig(fb.urgencia);
                  const sourceConfig = getSourceConfig(fb.fuente);
                  const SentimentIcon = sentimentConfig.icon;
                  const SourceIcon = sourceConfig.icon;

                  return (
                    <motion.div 
                      key={fb.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3 hover:border-primary/30 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sourceConfig.bg} ${sourceConfig.text}`}>
                          <SourceIcon className="h-3 w-3" />
                          {fb.fuente}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {fb.fecha ? new Date(fb.fecha).toLocaleDateString('es-AR') : 'N/A'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground line-clamp-3">
                        {fb.texto}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sentimentConfig.bg} ${sentimentConfig.text}`}>
                          <SentimentIcon className="h-3 w-3" />
                          {fb.sentimiento}
                        </span>
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground">
                          {fb.categoria}
                        </span>
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${urgencyConfig.bg} ${urgencyConfig.text}`}>
                          {fb.urgencia}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Resumen:</span> {fb.resumen}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, feedbacks.length)}</span> de <span className="font-semibold text-foreground">{feedbacks.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </motion.button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`inline-flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === pageNum
                              ? 'bg-primary text-white shadow-lg'
                              : 'border border-border bg-card text-foreground hover:bg-secondary'
                          }`}
                        >
                          {pageNum}
                        </motion.button>
                      );
                    })}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackTable;
