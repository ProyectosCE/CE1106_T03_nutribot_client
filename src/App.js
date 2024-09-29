/* 
================================== LICENCIA ================================================== 
MIT License
Copyright (c) 2024 José Bernardo Barquero Bonilla,
                   Jose Eduardo Campos Salazar,
                   Jimmy Feng Feng,
                   Alexander Montero Vargas
Consulta el archivo LICENSE para más detalles.
==============================================================================================
*/

/* 
==================================REFERENCIAS================================================
Para este archivo se tomaron como referencia general las siguientes fuentes:

 * Documentación propia de JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript
 * Uso de la Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

 ===========================================================================================
*/

import React, { useState, useRef } from 'react';
import './App.css';  // Importing CSS for styling the application

// Main function component for the NutriBot app
function App() {
  // State variables for handling various application states
  const [query, setQuery] = useState('');  // User input (query)
  const [messages, setMessages] = useState([]);  // Messages between user and bot
  const [isListening, setIsListening] = useState(false);  // Speech recognition active state
  const [error, setError] = useState(null);  // Error handling
  const [isTTSActive, setIsTTSActive] = useState(false); // Text-to-Speech active state
  const [port, setPort] = useState(8080); // Configurable port for server connection
  const [isHelpOpen, setIsHelpOpen] = useState(false); // Help screen visibility state
  const [isInfoOpen, setIsInfoOpen] = useState(false); // Information screen visibility state
  const textareaRef = useRef(null); // Reference for the text input area

  // Function to check if a message contains menu-related keywords
  const isMenuMessage = (text) => {
    return text.includes('Desayuno') || text.includes('Almuerzo') || text.includes('Cena');
  };

  // Function to format menu messages for better display (e.g., add titles and separators)
  const formatMenuMessage = (text) => {
    const items = text.split(', '); // Split menu text by comma
    const formatted = items.map((item, index) => {
      if (item.match(/Desayuno|Almuerzo|Cena|Merienda/)) {
        return <h2 key={index}>{item}</h2>;  // Titles for the menu sections
      } else if (item === '****************') {
        return <hr key={index}/>;  // Section separator
      } else {
        return <p key={index}>{item}</p>;  // Regular menu items
      }
    });
    return formatted;
  };

  // Adjust the height of the textarea to match its content dynamically
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';  // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`;  // Set height to fit content
  };

  // Handle the "Enter" key press to send the query (message)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();  // Prevent default behavior (line break)
      sendQuery(query);  // Send the user query when Enter is pressed
    }
  };

  // Function to send the user query to the server
  const sendQuery = async (queryText) => {
    const trimmedQuery = queryText.trim();  // Remove whitespace
    if (trimmedQuery === '') return;

    // Add the user's message to the chat history
    const userMessage = { text: trimmedQuery, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      // Send the query to the backend server via POST request
      const res = await fetch(`http://localhost:${port}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),  // Send query in JSON format
      });

      if (!res.ok) {
        throw new Error(`Error en la respuesta: ${res.status}`);
      }

      // Process the response and add the bot's message to the chat
      const data = await res.json();
      const botMessage = { text: data.response, sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // Use Text-to-Speech (TTS) if activated
      if (isTTSActive) {
        speakText(data.response);
      }

    } catch (error) {
      // Handle any errors during the request
      console.error("Error al hacer la consulta:", error);
      const botMessage = { text: 'Error al conectar con el servidor.', sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (isTTSActive) {
        speakText('Error al conectar con el servidor.');
      }
    }

    setQuery('');  // Clear the textarea after sending the message

    // Reset textarea height
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
  };

  // Function to handle voice recognition using the browser's SpeechRecognition API
  const handleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.");
      return;
    }

    // Set up speech recognition instance
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';  // Set language to Spanish
    recognition.interimResults = false; // Only return final results

    // Event handlers for speech recognition
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      // Handle speech recognition errors
      console.error('Error en el reconocimiento de voz:', event.error);
      setIsListening(false);
      setError(event.error === 'no-speech'
        ? 'No se detectó ninguna voz. Inténtalo de nuevo.'
        : event.error === 'audio-capture'
        ? 'No se detectó micrófono. Asegúrate de tener uno conectado.'
        : event.error === 'not-allowed'
        ? 'Permiso de micrófono denegado. Habilita el acceso al micrófono.'
        : `Error de reconocimiento: ${event.error}`);
    };

    // Process speech recognition results and send query
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;  // Get recognized text
      setQuery(transcript);  // Set the recognized text as query
      sendQuery(transcript);  // Automatically send the query
      setError(null);
    };

    recognition.start();
  };

  // Function to speak a text using the browser's speech synthesis API
  const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (synth) {
      const cleanedText = text.replace(/\*+/g, ''); // Clean up text
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'es-CR';  // Set speech language to Costa Rican Spanish
      synth.speak(utterance);  // Speak the text
    }
  };

  // Toggle the Text-to-Speech functionality
  const toggleTTS = () => {
    setIsTTSActive(!isTTSActive);
  };

  // Toggle help screen visibility
  const toggleHelp = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  // Toggle information screen visibility
  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen);
  };

  // Render the main UI of the application
  return (
    <div className="container">
      {/* Sidebar for settings */}
      <div className="sidebar">
        <h2>Nutribot</h2>
        <div className="sidebar-item">
          <label htmlFor="portInput">Puerto:</label>
          <input
            id="portInput"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}  // Set the port number
          />
        </div>
        <div className="sidebar-item">
          <button onClick={toggleTTS}>
            {isTTSActive ? '🔊 Desactivar TTS' : '🔈 Activar TTS'}  {/* Toggle TTS button */}
          </button>
        </div>
        <div className="sidebar-footer">
          <button onClick={toggleInfo}>Información</button>  {/* Toggle info screen */}
          <button onClick={toggleHelp}>Ayuda</button>  {/* Toggle help screen */}
        </div>
      </div>

      {/* Chatbox UI */}
      <div className="chat-container">
        <div className="chat-box">
          {/* Display chat messages */}
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="sender">{message.sender === 'user' ? 'Usuario' : 'Nutribot'}</div>
              {isMenuMessage(message.text) ? formatMenuMessage(message.text) : <span>{message.text}</span>}
            </div>
          ))}
        </div>
        <div className="input-box">
          {/* Input textarea for sending messages */}
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              adjustTextareaHeight();  // Dynamically adjust textarea height
            }}
            placeholder="Escribe tu mensaje..."
            rows="1"
            onKeyPress={handleKeyPress}  // Handle key press for sending messages
          />
          <button onClick={handleSpeechRecognition}>
            {isListening ? '🎤 Escuchando...' : '🎤'}  {/* Button for speech recognition */}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}  {/* Display error messages */}
      </div>

      {/* Help screen */}
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

      {/* Information screen */}
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
            <li>José Bernardo Barquero Bonilla, Jose Eduardo Campos Salazar, Jimmy Feng Feng, Alexander Montero Vargas </li>
          </ul>
          <button className="close-info" onClick={toggleInfo}>Cerrar Información</button>
        </div>
      )}
    </div>
  );
}

export default App;
