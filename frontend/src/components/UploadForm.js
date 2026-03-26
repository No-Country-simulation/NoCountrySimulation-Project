
import React, { useState } from 'react';
import axios from 'axios';

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

  return (
    <div className="upload-form">
      <h2>Cargar Feedback Manual</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pega aquí el mensaje de WhatsApp..."
          rows={6}
          style={{ width: '100%' }}
        />
        <select value={fuente} onChange={(e) => setFuente(e.target.value)}>
          <option value="whatsapp">WhatsApp</option>
          <option value="web">Formulario Web</option>
          <option value="encuesta">Encuesta</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Clasificando...' : 'Clasificar con IA'}
        </button>
      </form>

      {resultado && (
        <div className="resultado">
          <h3>Resultado de la IA:</h3>
          <p><strong>Sentimiento:</strong> {resultado.sentimiento}</p>
          <p><strong>Categoría:</strong> {resultado.categoria}</p>
          <p><strong>Urgencia:</strong> {resultado.urgencia}</p>
          <p><strong>Resumen:</strong> {resultado.resumen}</p>
        </div>
      )}
    </div>
  );
};

export default UploadForm;