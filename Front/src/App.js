import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import Dashboard from './components/Dashboard';
import FeedbackTable from './components/FeedbackTable';
import { 
  BarChart3, 
  MessageSquare, 
  Sparkles,
  Github
} from 'lucide-react';

function App() {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleFeedbackAdded = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Feedback Classifier</h1>
                <p className="text-xs text-muted-foreground">Powered by IA</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('feedbacks')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'feedbacks'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Feedbacks
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('feedbacks')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'feedbacks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Feedbacks
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2 text-balance">
              Clasificación Inteligente de Feedback
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
              Analiza automáticamente mensajes de WhatsApp, formularios web y encuestas 
              con inteligencia artificial para detectar sentimiento, categorías y urgencia.
            </p>
          </div>

          {/* Upload Form */}
          <UploadForm onFeedbackAdded={handleFeedbackAdded} />

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <Dashboard key={`dashboard-${refresh}`} />
              </div>
            )}
            
            {activeTab === 'feedbacks' && (
              <div className="animate-fade-in">
                <FeedbackTable key={`table-${refresh}`} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Feedback Classifier IA</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Clasificación automática de feedback con inteligencia artificial
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
