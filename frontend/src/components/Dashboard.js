
// Components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#00C49F', '#FF8042', '#8884d8'];

const Dashboard = () => {
  const [insights, setInsights] = useState({});

  useEffect(() => {
    axios.get('http://localhost:8000/insights')
      .then(res => setInsights(res.data))
      .catch(err => console.error(err));
  }, []);

  const sentimentData = Object.entries(insights.sentimiento || {}).map(([name, value]) => ({ name, value }));
  const categoriaData = Object.entries(insights.categorias || {}).map(([name, value]) => ({ name, value }));

  const telegramData = insights.telegram || {};
  const webData = insights.web || {};

  return (
    <div className="dashboard">
      <h2>Dashboard de Insights</h2>
      <p>Total de feedbacks: <strong>{insights.total || 0}</strong></p>
      
      <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginTop: '20px' }}>
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px' }}>
          <h3>📱 Telegram</h3>
          <p>Total: <strong>{telegramData.total || 0}</strong></p>
        </div>

        <div style={{ background: '#f1f8e9', padding: '15px', borderRadius: '10px' }}>
          <h3>🌐 Web</h3>
          <p>Total: <strong>{webData.total || 0}</strong></p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center' }}>
        <div>
          <h3>Sentimiento</h3>
          <ResponsiveContainer width={300} height={300}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3>Categorías</h3>
          <ResponsiveContainer width={400} height={300}>
            <BarChart data={categoriaData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3> Sentimiento (Telegram)</h3>
        <ResponsiveContainer width={300} height={300}>
          <PieChart>
            <Pie
              data={Object.entries(telegramData.sentimiento || {}).map(([name, value]) => ({ name, value }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
            >
              {Object.entries(telegramData.sentimiento || {}).map((entry, index) => (
                <Cell key={`cell-telegram-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {insights.temas_recurrentes && (
        <div style={{ marginTop: '30px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h3>Temas Recurrentes Detectados por IA</h3>
          <p>{insights.temas_recurrentes}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;