import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Table, 
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
  ChevronRight
} from 'lucide-react';

const FeedbackTable = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:8000/feedbacks')
      .then(res => {
        setFeedbacks(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getSentimentVariant = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return 'success';
      case 'negativo':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return <ThumbsUp className="h-3 w-3" />;
      case 'negativo':
        return <ThumbsDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getUrgencyVariant = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'alta':
        return 'destructive';
      case 'media':
        return 'warning';
      default:
        return 'muted';
    }
  };

  const getFuenteIcon = (fuente) => {
    switch (fuente?.toLowerCase()) {
      case 'whatsapp':
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  // Pagination
  const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFeedbacks = feedbacks.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando feedbacks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Table className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Lista de Feedbacks Clasificados</CardTitle>
              <CardDescription>
                {feedbacks.length} registros en total
              </CardDescription>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="gap-2 w-full sm:w-auto"
            onClick={() => window.location.href = 'http://localhost:8000/export/csv'}
          >
            <FileDown className="h-4 w-4" />
            Descargar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Sin feedbacks</h3>
            <p className="text-sm text-muted-foreground">
              Aún no hay feedbacks clasificados. ¡Carga uno para comenzar!
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Fecha
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Fuente
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Texto
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Sentimiento
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        Categoría
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" />
                        Urgencia
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Resumen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFeedbacks.map((fb, index) => (
                    <tr 
                      key={fb.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(fb.fecha).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="gap-1">
                          {getFuenteIcon(fb.fuente)}
                          {fb.fuente}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 max-w-[250px]">
                        <p className="text-sm text-foreground truncate" title={fb.texto}>
                          {fb.texto.substring(0, 80)}...
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getSentimentVariant(fb.sentimiento)} className="gap-1">
                          {getSentimentIcon(fb.sentimiento)}
                          {fb.sentimiento}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{fb.categoria}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getUrgencyVariant(fb.urgencia)}>{fb.urgencia}</Badge>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate" title={fb.resumen}>
                          {fb.resumen}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {paginatedFeedbacks.map((fb) => (
                <div 
                  key={fb.id}
                  className="rounded-lg border border-border bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-1">
                      {getFuenteIcon(fb.fuente)}
                      {fb.fuente}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fb.fecha).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground line-clamp-2">
                    {fb.texto}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getSentimentVariant(fb.sentimiento)} className="gap-1">
                      {getSentimentIcon(fb.sentimiento)}
                      {fb.sentimiento}
                    </Badge>
                    <Badge variant="secondary">{fb.categoria}</Badge>
                    <Badge variant={getUrgencyVariant(fb.urgencia)}>{fb.urgencia}</Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Resumen:</span> {fb.resumen}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, feedbacks.length)} de {feedbacks.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackTable;
