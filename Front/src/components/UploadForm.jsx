import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Spinner } from './ui/Spinner';
import { 
  MessageSquare, 
  Sparkles, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  Tag,
  FileText
} from 'lucide-react';

const UploadForm = ({ onFeedbackAdded }) => {
  const [texto, setTexto] = useState('');
  const [fuente, setFuente] = useState('whatsapp');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/clasificar', {
        texto,
        fuente
      });
      setResultado(res.data);
      onFeedbackAdded();
      setTexto('');
    } catch (error) {
      alert('Error al clasificar: ' + error.message);
    }
    setLoading(false);
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo':
        return <ThumbsUp className="h-4 w-4" />;
      case 'negativo':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

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

  const getUrgencyVariant = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'alta':
        return 'destructive';
      case 'media':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Cargar Feedback Manual</CardTitle>
            <CardDescription>
              Ingresa el texto del mensaje para clasificarlo con IA
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Mensaje
            </label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega aquí el mensaje de WhatsApp, formulario web o encuesta..."
              className="min-h-[140px]"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fuente
              </label>
              <Select 
                value={fuente} 
                onChange={(e) => setFuente(e.target.value)}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Formulario Web</option>
                <option value="encuesta">Encuesta</option>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={loading || !texto.trim()}
                className="w-full sm:w-auto gap-2"
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Clasificando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Clasificar con IA</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {resultado && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Resultado de la IA</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {getSentimentIcon(resultado.sentimiento)}
                  <span className="text-xs font-medium uppercase tracking-wide">Sentimiento</span>
                </div>
                <Badge variant={getSentimentVariant(resultado.sentimiento)} className="text-sm">
                  {resultado.sentimiento}
                </Badge>
              </div>
              
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Tag className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Categoría</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {resultado.categoria}
                </Badge>
              </div>
              
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Urgencia</span>
                </div>
                <Badge variant={getUrgencyVariant(resultado.urgencia)} className="text-sm">
                  {resultado.urgencia}
                </Badge>
              </div>
              
              <div className="rounded-lg border border-border bg-background/50 p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Resumen</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {resultado.resumen}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadForm;
