
// Front/src/components/InsightsDashboard.js
import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, Users, MessageSquare, Zap } from 'lucide-react';

const COLORS = {
  positivo: '#10b981',
  negativo: '#ef4444',
  neutral: '#6b7280'
};

const getSentimentColor = (sentiment) => {
  return COLORS[sentiment] || COLORS.neutral;
};

const InsightsDashboard = ({ insights, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!insights || insights.total === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border">
        <p className="text-muted-foreground">No hay feedbacks aún. Agrega uno para ver estadísticas.</p>
      </div>
    );
  }

  // Calcular manual stats (web + whatsapp + encuesta)
  const manualTotal = insights.total - (insights.telegram?.total || 0);
  
  // Combinar sentimientos de web, whatsapp y encuesta
  const webSentiment = insights.web?.sentimiento || {};
  const manualSentiment = { ...webSentiment };
  
  // Datos para gráficos
  const generalSentimentData = Object.entries(insights.sentimiento || {}).map(([name, value]) => ({ 
    name: name === 'positivo' ? 'Positivo' : name === 'negativo' ? 'Negativo' : 'Neutral',
    value,
    color: getSentimentColor(name)
  }));
  
  const categoriaData = Object.entries(insights.categorias || {}).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value 
  }));
  
  const manualSentimentData = Object.entries(manualSentiment).map(([name, value]) => ({
    name: name === 'positivo' ? 'Positivo' : name === 'negativo' ? 'Negativo' : 'Neutral',
    value,
    color: getSentimentColor(name)
  }));
  
  const telegramSentimentData = Object.entries(insights.telegram?.sentimiento || {}).map(([name, value]) => ({
    name: name === 'positivo' ? 'Positivo' : name === 'negativo' ? 'Negativo' : 'Neutral',
    value,
    color: getSentimentColor(name)
  }));

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">{insights.total}</span>
          </div>
          <h3 className="text-muted-foreground text-sm font-medium">Total Feedbacks</h3>
          <p className="text-xs text-muted-foreground mt-2">Todos los canales</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <span className="text-2xl font-bold text-foreground">{manualTotal}</span>
          </div>
          <h3 className="text-muted-foreground text-sm font-medium">Web / WhatsApp / Encuesta</h3>
          <p className="text-xs text-muted-foreground mt-2">Feedbacks manuales</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/10">
              <Zap className="w-5 h-5 text-sky-500" />
            </div>
            <span className="text-2xl font-bold text-foreground">{insights.telegram?.total || 0}</span>
          </div>
          <h3 className="text-muted-foreground text-sm font-medium">Telegram</h3>
          <p className="text-xs text-muted-foreground mt-2">Feedbacks automáticos</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">Sentimiento General</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={generalSentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {generalSentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">Categorías</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoriaData}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Sentiment by Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Sentimiento (Web + WhatsApp + Encuesta)</h3>
          <p className="text-sm text-muted-foreground mb-6">Total: {manualTotal}</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={manualSentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {manualSentimentData.map((entry, index) => (
                  <Cell key={`manual-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-soft"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Sentimiento (Telegram)</h3>
          <p className="text-sm text-muted-foreground mb-6">Total: {insights.telegram?.total || 0}</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={telegramSentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {telegramSentimentData.map((entry, index) => (
                  <Cell key={`telegram-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Temas Recurrentes */}
      {insights.temas_recurrentes && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 border border-primary/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Temas Recurrentes Detectados por IA</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {insights.temas_recurrentes}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsDashboard;