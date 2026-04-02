import React from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { 
  MessageCircle, 
  Globe, 
  TrendingUp,
  Send,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3
} from 'lucide-react';

const SENTIMENT_COLORS = {
  positivo: '#10b981',
  negativo: '#ef4444',
  neutral: '#6b7280'
};

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

// Skeleton loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-lg ${className}`} />
);

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, sublabel, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="bg-card rounded-2xl border border-border p-5 shadow-soft hover:shadow-medium transition-all duration-300"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

// Source Card Component
const SourceCard = ({ icon: Icon, label, total, sentiment, color, bgColor, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    className={`rounded-2xl border border-border p-5 shadow-soft hover:shadow-medium transition-all duration-300 ${bgColor}`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="font-bold text-foreground text-lg">{label}</p>
        <p className="text-sm text-muted-foreground">Feedbacks recibidos</p>
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold text-foreground">{total}</span>
      <span className="text-muted-foreground">total</span>
    </div>
    {sentiment && Object.keys(sentiment).length > 0 && (
      <div className="flex gap-2 mt-4">
        {sentiment.positivo > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
            <ThumbsUp className="w-3 h-3" /> {sentiment.positivo}
          </span>
        )}
        {sentiment.negativo > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium">
            <ThumbsDown className="w-3 h-3" /> {sentiment.negativo}
          </span>
        )}
        {sentiment.neutral > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
            <Minus className="w-3 h-3" /> {sentiment.neutral}
          </span>
        )}
      </div>
    )}
  </motion.div>
);

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground">{payload[0].name || label}</p>
        <p className="text-sm text-muted-foreground">
          Cantidad: <span className="font-bold text-foreground">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const InsightsDashboard = ({ insights, loading }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!insights || insights.total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-2xl border border-border p-12 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No hay datos disponibles</h3>
        <p className="text-muted-foreground">
          Comienza agregando feedbacks para ver las estadisticas aqui.
        </p>
      </motion.div>
    );
  }

  // Prepare chart data
  const sentimentData = Object.entries(insights.sentimiento || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SENTIMENT_COLORS[name.toLowerCase()] || '#6b7280'
  }));

  const categoryData = Object.entries(insights.categorias || {}).map(([name, value], index) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  }));

  // Telegram sentiment data
  const telegramSentiment = insights.telegram?.sentimiento || {};
  const telegramSentimentData = Object.entries(telegramSentiment).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SENTIMENT_COLORS[name.toLowerCase()] || '#6b7280'
  }));

  // Web sentiment data  
  const webSentiment = insights.web?.sentimiento || {};
  const webSentimentData = Object.entries(webSentiment).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SENTIMENT_COLORS[name.toLowerCase()] || '#6b7280'
  }));

  return (
    <div className="space-y-8">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total de Feedbacks"
          value={insights.total}
          sublabel="Clasificados con IA"
          color="bg-gradient-to-br from-primary to-primary/80"
          delay={0}
        />
        <SourceCard
          icon={Send}
          label="Telegram"
          total={insights.telegram?.total || 0}
          sentiment={insights.telegram?.sentimiento}
          color="bg-gradient-to-br from-sky-500 to-sky-600"
          bgColor="bg-sky-50/50"
          delay={0.1}
        />
        <SourceCard
          icon={Globe}
          label="Web"
          total={insights.web?.total || 0}
          sentiment={insights.web?.sentimiento}
          color="bg-gradient-to-br from-violet-500 to-violet-600"
          bgColor="bg-violet-50/50"
          delay={0.2}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Sentiment Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-soft"
        >
          <h3 className="text-lg font-bold text-foreground mb-6">Sentimiento General</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Categories Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-soft"
        >
          <h3 className="text-lg font-bold text-foreground mb-6">Categorias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 6, 6, 0]}
                  animationBegin={0}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Telegram Sentiment */}
        {telegramSentimentData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-soft"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 rounded-lg bg-sky-100">
                <Send className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sentimiento (Telegram)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={telegramSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {telegramSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Web Sentiment */}
        {webSentimentData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-soft"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 rounded-lg bg-violet-100">
                <Globe className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sentimiento (Web)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={webSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {webSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Recurring Themes */}
      {insights.temas_recurrentes && insights.temas_recurrentes !== "No hay datos suficientes" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-gradient-to-br from-card to-secondary/20 rounded-2xl border border-border p-6 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Temas Recurrentes Detectados por IA</h3>
              <p className="text-sm text-muted-foreground">Patrones identificados automaticamente en los feedbacks</p>
            </div>
          </div>
          <div className="bg-card/80 rounded-xl border border-border p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {insights.temas_recurrentes}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsDashboard;
