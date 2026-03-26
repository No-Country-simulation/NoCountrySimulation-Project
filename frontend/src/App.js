
import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import Dashboard from './components/Dashboard';
import FeedbackTable from './components/FeedbackTable';
import './App.css';

function App() {
  const [refresh, setRefresh] = useState(0);

  const handleFeedbackAdded = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="App">
      <header>
        <h1>📊 Feedback Classifier IA</h1>
        <p>Clasificación automática de feedback de WhatsApp y más</p>
      </header>

      <UploadForm onFeedbackAdded={handleFeedbackAdded} />

      <Dashboard key={refresh} />

      <FeedbackTable key={refresh} />
    </div>
  );
}

export default App;