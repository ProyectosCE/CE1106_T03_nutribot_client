import React, { useState } from 'react';
import './App.css'; // Asegúrate de tener este archivo para los estilos

function App() {
  const [query, setQuery] = useState('');  // Estado para almacenar la consulta del usuario
  const [messages, setMessages] = useState([]);  // Estado para almacenar los mensajes
  const [isListening, setIsListening] = useState(false);  // Estado para saber si está grabando o no
  const [error, setError] = useState(null);  // Estado para errores del reconocimiento de voz
  const [isTTSActive, setIsTTSActive] = useState(false); // Estado para activar/desactivar Text-to-Speech

  // Función para enviar la consulta al servidor Nutribot
  const sendQuery = async (queryText) => {
    const trimmedQuery = queryText.trim();
    if (trimmedQuery === '') return; // No enviar si el input está vacío

    const userMessage = { text: trimmedQuery, sender: 'user' };

    // Primero agregar el mensaje del usuario
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      // Hacer una solicitud al servidor Nutribot
      const res = await fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),  // Enviar la consulta al servidor
      });

      if (!res.ok) {
        throw new Error(`Error en la respuesta: ${res.status}`);
      }

      const data = await res.json();  // Obtener la respuesta en formato JSON
      const botMessage = { text: data.response, sender: 'bot' };

      // Solo agregar la respuesta del bot después de obtener la respuesta
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // Si el modo Text-to-Speech está activado, leer en voz alta la respuesta
      if (isTTSActive) {
        speakText(data.response);
      }

    } catch (error) {
      console.error("Error al hacer la consulta:", error);
      const botMessage = { text: 'Error al conectar con el servidor.', sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // Si el modo Text-to-Speech está activado, leer en voz alta el error
      if (isTTSActive) {
        speakText('Error al conectar con el servidor.');
      }
    }

    setQuery(''); // Limpiar el input después de enviar
  };

  // Función para activar el reconocimiento de voz
  const handleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';  // Idioma de reconocimiento de voz

    recognition.onstart = () => {
      setIsListening(true);  // Cambiar el estado para indicar que está grabando
      setError(null);  // Limpiar cualquier error anterior
    };

    recognition.onend = () => {
      setIsListening(false);  // Detener la grabación
    };

    recognition.onerror = (event) => {
      console.error('Error en el reconocimiento de voz:', event.error);
      setIsListening(false);
      setError('Hubo un error con el reconocimiento de voz. Inténtalo de nuevo.');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;  // Obtener el texto reconocido

      // Enviar automáticamente la transcripción como si fuera un mensaje del usuario
      sendQuery(transcript);  // Enviar el mensaje reconocido al servidor

      setError(null);  // Limpiar cualquier error anterior
    };

    recognition.start();  // Comenzar a escuchar
  };

  // Función para hablar el texto usando Text-to-Speech
  const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CR';  // Configurar el idioma de la voz
      synth.speak(utterance);
    }
  };

  // Función para cambiar el estado de Text-to-Speech
  const toggleTTS = () => {
    setIsTTSActive(!isTTSActive);
  };

  return (
    <div className="chat-container">
      <div className="chat-box">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <span>{message.text}</span>
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe tu mensaje o usa el micrófono..."
          onKeyPress={(e) => e.key === 'Enter' && sendQuery(query)} // Enviar con Enter
        />
        <button onClick={() => sendQuery(query)}>Enviar</button>
        <button onClick={handleSpeechRecognition}>
          {isListening ? '🎤 Escuchando...' : '🎤'}
        </button>
      </div>
      <div className="tts-toggle">
        <label>
          <input 
            type="checkbox" 
            checked={isTTSActive} 
            onChange={toggleTTS} 
          />
          Activar Text-to-Speech
        </label>
      </div>
      {error && <div className="error-message">{error}</div>} {/* Mostrar errores de reconocimiento de voz */}
    </div>
  );
}

export default App;
