
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FeedbackTable = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/feedbacks')
      .then(res => setFeedbacks(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Lista de Feedbacks Clasificados</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Fuente</th>
            <th>Texto</th>
            <th>Sentimiento</th>
            <th>Categoría</th>
            <th>Urgencia</th>
            <th>Resumen</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map(fb => (
            <tr key={fb.id}>
              <td>{new Date(fb.fecha).toLocaleString()}</td>
              <td>{fb.fuente}</td>
              <td style={{ maxWidth: '300px' }}>{fb.texto.substring(0, 100)}...</td>
              <td>{fb.sentimiento}</td>
              <td>{fb.categoria}</td>
              <td>{fb.urgencia}</td>
              <td>{fb.resumen}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => window.location.href = 'http://localhost:8000/export/csv'}>
        Descargar CSV
      </button>
    </div>
  );
};

export default FeedbackTable;