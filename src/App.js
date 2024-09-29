import React, { useState, useRef } from 'react';
import './App.css'; 

function App() {
  const [query, setQuery] = useState('');  
  const [messages, setMessages] = useState([]);  
  const [isListening, setIsListening] = useState(false);  
  const [error, setError] = useState(null);  
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [port, setPort] = useState(8080); // Puerto configurable
  const [isHelpOpen, setIsHelpOpen] = useState(false); // Estado para controlar la pantalla de ayuda
  const [isInfoOpen, setIsInfoOpen] = useState(false); // Estado para controlar la pantalla de información
  const textareaRef = useRef(null); // Referencia para el textarea

  // Función para identificar si el mensaje es un menú
  const isMenuMessage = (text) => {
    return text.includes('Desayuno') || text.includes('Almuerzo') || text.includes('Cena');
  };

  // Función para procesar el mensaje del menú y agregar formato
  const formatMenuMessage = (text) => {
    const items = text.split(', ');
    const formatted = items.map((item, index) => {
      if (item.match(/Desayuno|Almuerzo|Cena|Merienda/)) {
        return <h2 key={index}>{item}</h2>;  // Los títulos del menú
      } else if (item === '****************') {
        return <hr key={index}/>;  // Las separaciones de sección
      } else {
        return <p key={index}>{item}</p>;  // Los ítems del menú
      }
    });
    return formatted;
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto'; // Reinicia la altura para recalcular
    textarea.style.height = `${textarea.scrollHeight}px`; // Ajusta la altura al contenido
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Evita el salto de línea
      sendQuery(query); // Envía la consulta al pulsar Enter
    }
  };

  const sendQuery = async (queryText) => {
    const trimmedQuery = queryText.trim();
    if (trimmedQuery === '') return;

    const userMessage = { text: trimmedQuery, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      const res = await fetch(`http://localhost:${port}/chat`, { // Cambiamos la URL según el puerto
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),  
      });

      if (!res.ok) {
        throw new Error(`Error en la respuesta: ${res.status}`);
      }

      const data = await res.json();
      const botMessage = { text: data.response, sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (isTTSActive) {
        speakText(data.response);
      }

    } catch (error) {
      console.error("Error al hacer la consulta:", error);
      const botMessage = { text: 'Error al conectar con el servidor.', sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (isTTSActive) {
        speakText('Error al conectar con el servidor.');
      }
    }

    setQuery(''); // Limpia el textarea después de enviar

    // Restablece el tamaño del textarea después de enviar el mensaje
    const textarea = textareaRef.current;
    textarea.style.height = 'auto'; // Restablecer a su tamaño mínimo
  };

  const handleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';  
    recognition.interimResults = false; // Devuelve el resultado completo
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Error en el reconocimiento de voz:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('No se detectó ninguna voz. Inténtalo de nuevo.');
      } else if (event.error === 'audio-capture') {
        setError('No se detectó micrófono. Asegúrate de tener uno conectado.');
      } else if (event.error === 'not-allowed') {
        setError('Permiso de micrófono denegado. Habilita el acceso al micrófono.');
      } else {
        setError(`Error de reconocimiento: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;  
      setQuery(transcript);  // Pon el texto en el input
      sendQuery(transcript); // Envía automáticamente el texto transcrito
      setError(null);
    };

    recognition.start();
  };

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (synth) {
      const cleanedText = text.replace(/\*+/g, ''); // Eliminar asteriscos
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'es-CR'; // Configura el idioma del habla
      synth.speak(utterance);
    }
  };

  const toggleTTS = () => {
    setIsTTSActive(!isTTSActive);
  };

  // Funciones para abrir/cerrar las pantallas de ayuda e información
  const toggleHelp = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen);
  };

  return (
    <div className="container">
      {/* Menú lateral */}
      <div className="sidebar">
        <h2>Nutribot</h2>
        <div className="sidebar-item">
          <label htmlFor="portInput">Puerto:</label>
          <input
            id="portInput"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="sidebar-item">
          <button onClick={toggleTTS}>
            {isTTSActive ? '🔊 Desactivar TTS' : '🔈 Activar TTS'}
          </button>
        </div>
        <div className="sidebar-footer">
          <button onClick={toggleInfo}>Información</button>
          <button onClick={toggleHelp}>Ayuda</button>
        </div>
      </div>

      {/* Caja de chat */}
      <div className="chat-container">
        <div className="chat-box">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="sender">{message.sender === 'user' ? 'Usuario' : 'Nutribot'}</div>
              {isMenuMessage(message.text) ? formatMenuMessage(message.text) : <span>{message.text}</span>}
            </div>
          ))}
        </div>
        <div className="input-box">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              adjustTextareaHeight(); // Ajustar altura dinámicamente
            }}
            placeholder="Escribe tu mensaje..."
            rows="1"
            onKeyPress={handleKeyPress}
          />
          <button onClick={handleSpeechRecognition}>
            {isListening ? '🎤 Escuchando...' : '🎤'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Pantalla de ayuda */}
      {isHelpOpen && (
        <div className="help-screen">
          <h2>Instrucciones de uso</h2>
          <ul>
            <li><strong>Enviando texto:</strong> Escribe tu mensaje en el cuadro de texto y presiona Enter para enviar.</li>
            <li><strong>Usando el micrófono (navegadores basados en Chrome):</strong> Presiona el ícono del micrófono y habla para que se transcriba tu mensaje.</li>
            <li><strong>Usar TTS para leer en voz alta el texto:</strong> Activa el Text-to-Speech (TTS) para que Nutribot lea en voz alta las respuestas.</li>
          </ul>
          <button className="close-help" onClick={toggleHelp}>Cerrar Ayuda</button>
        </div>
      )}

      {/* Pantalla de información */}
      {isInfoOpen && (
        <div className="info-screen">
          <h2>Información</h2>
          <h3>Instituto Tecnológico de Costa Rica</h3>
          <h3>Tarea 3 - NutriTec</h3>
          <h4>Paradigmas de Programación (CE1106)</h4>
          <p>Este programa está bajo MIT License. Copyright (c) 2024</p>
          <p>Consulta el archivo LICENSE para más detalles.</p>
          <p><strong>Autores:</strong></p>
          <ul>
            <li>José Bernardo Barquero Bonilla, Jose Eduardo Campos Salazar, Jimmy Feng Feng,Alexander Montero Vargas </li>
          </ul>
          <button className="close-info" onClick={toggleInfo}>Cerrar Información</button>
        </div>
      )}
    </div>
  );
}

export default App;
