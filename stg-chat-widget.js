(function() {
  'use strict';
  
  console.log('BlackOrbit Widget: Iniciando...');
  
  const userConfig = window.BlackOrbitConfig || {};
  
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    primaryColor: userConfig.primaryColor || '#0081FF',
    chatTitle: userConfig.chatTitle || 'Asistente AI',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Widget: webhookUrl requerido');
    return;
  }

  const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // ========== MARKDOWN PARSER ==========
  function parseMarkdown(text) {
    if (!text || typeof text !== 'string') return text;
    
    const sanitize = (str) => {
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '');
    };
    
    let html = text;
    html = html.replace(/\r\n/g, '\n');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    if (html.includes('</p><p>')) html = '<p>' + html + '</p>';
    
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px;margin:4px 0;"/>');
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, function(match) {
      const orig = text.substring(text.indexOf(match.replace(/<[^>]*>/g, '').trim()));
      return /^\d+\./.test(orig) ? '<ol>' + match + '</ol>' : '<ul>' + match + '</ul>';
    });
    
    html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    return sanitize(html);
  }

  // ========== LOAD POPPINS FONT ==========
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // ========== CREATE WIDGET ==========
  function createWidget() {
    console.log('BlackOrbit: Creando widget...');
    
    const widget = document.createElement('div');
    widget.id = 'blackorbit-widget';
    
    widget.innerHTML = `
      <style>
        #blackorbit-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
          font-family: 'Poppins', sans-serif;
        }
        #blackorbit-widget * { box-sizing: border-box; }
        
        /* TOGGLE BUTTON */
        .bo-toggle {
          width: 48px;
          height: 48px;
          padding: 16px;
          background: ${CONFIG.primaryColor};
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 12px 24px rgba(94,118,144,0.2);
          overflow: hidden;
          transition: transform 0.3s;
        }
        .bo-toggle:hover { transform: scale(1.05); }
        
        /* CHAT WINDOW */
        .bo-window {
          position: fixed;
          bottom: 82px;
          right: 20px;
          width: 320px;
          height: 500px;
          background: white;
          box-shadow: 0 12px 24px rgba(94,118,144,0.2);
          border-radius: 16px;
          border: 1px solid #E1E8F2;
          display: none;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
          overflow: hidden;
        }
        .bo-window.open { display: flex; }
        
        /* HEADER */
        .bo-header {
          align-self: stretch;
          padding: 12px 16px 12px 12px;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          display: inline-flex;
          border-bottom: 1px solid #E1E8F2;
        }
        .bo-header-left {
          flex: 1;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          display: flex;
        }
        .bo-title {
          color: #010618;
          font-size: 14px;
          font-weight: 600;
          line-height: 24px;
        }
        .bo-status {
          width: 8px;
          height: 8px;
          background: #00CD3B;
          border-radius: 9999px;
        }
        .bo-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bo-theme-toggle {
          width: 40px;
          padding: 2px;
          background: #E1E8F2;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }
        .bo-theme-circle {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bo-theme-icon {
          width: 16px;
          height: 16px;
        }
        .bo-close-btn {
          width: 32px;
          height: 32px;
          padding: 8px 8px 5px;
          border-radius: 8px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .bo-close-btn:hover { background: #f1f5f9; }
        
        /* MESSAGES WRAPPER */
        .bo-messages-wrapper {
          align-self: stretch;
          flex: 1;
          justify-content: flex-start;
          align-items: center;
          display: inline-flex;
        }
        .bo-messages {
          flex: 1;
          align-self: stretch;
          padding: 12px;
          background: white;
          overflow-y: auto;
        }
        .bo-scrollbar-area {
          align-self: stretch;
          padding: 4px;
          background: white;
          overflow: hidden;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 8px;
          display: inline-flex;
        }
        .bo-scrollbar-track {
          width: 6px;
          flex: 1;
          background: #E1E8F2;
          border-radius: 9999px;
        }
        
        /* TERMS BANNER */
        .bo-terms {
          background: white;
          border: 1px solid #E1E8F2;
          border-radius: 8px;
          padding: 16px;
          margin: 80px 0 20px 0;
          text-align: center;
        }
        .bo-terms p {
          margin: 0;
          color: #5E7690;
          font-size: 13px;
          line-height: 1.5;
        }
        .bo-terms a {
          color: ${CONFIG.primaryColor};
          text-decoration: none;
          font-weight: 500;
        }
        .bo-terms a:hover { text-decoration: underline; }
        .bo-messages.has-messages .bo-terms { display: none; }
        
        /* INPUT AREA */
        .bo-input-area {
          align-self: stretch;
          padding: 12px;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          display: flex;
        }
        .bo-input-container {
          align-self: stretch;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          display: inline-flex;
        }
        .bo-input-wrapper {
          flex: 1;
          height: 40px;
          padding: 8px;
          background: #F0F5F9;
          border-radius: 8px;
          border: 1px solid #E1E8F2;
          overflow: hidden;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          display: flex;
        }
        .bo-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #5E7690;
          font-size: 14px;
          font-family: 'Poppins';
          font-weight: 400;
          line-height: 24px;
        }
        .bo-input::placeholder { color: #5E7690; }
        .bo-input-wrapper:focus-within {
          border-color: ${CONFIG.primaryColor};
          background: white;
        }
        .bo-attach-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .bo-send-btn {
          width: 40px;
          height: 40px;
          padding: 8px;
          background: ${CONFIG.primaryColor};
          border-radius: 8px;
          border: none;
          cursor: pointer;
          overflow: hidden;
          justify-content: center;
          align-items: center;
          gap: 8px;
          display: flex;
          transition: transform 0.2s;
        }
        .bo-send-btn:hover { transform: scale(1.05); }
        
        /* MESSAGES */
        .bo-message {
          margin-bottom: 12px;
          display: flex;
        }
        .bo-message.user { justify-content: flex-end; }
        .bo-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }
        .bo-message.user .bo-bubble {
          background: ${CONFIG.primaryColor};
          color: white;
          border-bottom-right-radius: 4px;
        }
        .bo-message.bot .bo-bubble {
          background: #F0F5F9;
          color: #010618;
          border: 1px solid #E1E8F2;
          border-bottom-left-radius: 4px;
        }
        
        /* MARKDOWN */
        .bo-bubble code {
          background: rgba(0,0,0,0.05);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
        }
        .bo-message.user .bo-bubble code { background: rgba(255,255,255,0.2); }
        .bo-bubble pre {
          background: rgba(0,0,0,0.05);
          padding: 8px;
          border-radius: 6px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .bo-message.user .bo-bubble pre { background: rgba(255,255,255,0.2); }
        .bo-bubble pre code {
          background: none;
          padding: 0;
          display: block;
          white-space: pre;
        }
        .bo-bubble ul, .bo-bubble ol { margin: 8px 0; padding-left: 20px; }
        .bo-bubble li { margin: 4px 0; }
        .bo-bubble a { text-decoration: underline; opacity: 0.8; }
        .bo-bubble a:hover { opacity: 1; }
        .bo-bubble img { max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0; }
        
        /* SCROLLBAR */
        .bo-messages::-webkit-scrollbar { width: 6px; }
        .bo-messages::-webkit-scrollbar-track { background: transparent; }
        .bo-messages::-webkit-scrollbar-thumb { background: #E1E8F2; border-radius: 3px; }
        .bo-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        /* TYPING */
        .bo-typing {
          padding: 8px 12px;
          background: white;
          border-top: 1px solid #E1E8F2;
          display: none;
          font-size: 12px;
          color: #5E7690;
        }
        .bo-typing-dots {
          display: inline-flex;
          gap: 2px;
          margin-right: 8px;
        }
        .bo-typing-dot {
          width: 4px;
          height: 4px;
          background: #5E7690;
          border-radius: 50%;
          animation: bo-typing 1.4s infinite ease-in-out;
        }
        .bo-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .bo-typing-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bo-typing {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      </style>

      <!-- TOGGLE BUTTON -->
      <button class="bo-toggle" id="bo-toggle">
        <svg id="bo-icon-chat" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="9" cy="10" r="1" fill="white"/>
          <circle cx="12" cy="10" r="1" fill="white"/>
          <circle cx="15" cy="10" r="1" fill="white"/>
        </svg>
        <svg id="bo-icon-close" width="16" height="16" viewBox="0 0 24 24" fill="none" style="display:none;">
          <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <!-- CHAT WINDOW -->
      <div class="bo-window" id="bo-window">
        <!-- HEADER -->
        <div class="bo-header">
          <div class="bo-header-left">
            <div class="bo-title">${CONFIG.chatTitle}</div>
            <div class="bo-status"></div>
          </div>
          <div class="bo-header-right">
            <button class="bo-theme-toggle">
              <div class="bo-theme-circle">
                <svg class="bo-theme-icon" fill="none" stroke="#8CA3BB" viewBox="0 0 24 24" stroke-width="1.33">
                  <circle cx="12" cy="12" r="5.33"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </div>
            </button>
            <button class="bo-close-btn" id="bo-close">
              <svg width="16" height="16" fill="none" stroke="#5E7690" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- MESSAGES -->
        <div class="bo-messages-wrapper">
          <div class="bo-messages" id="bo-messages">
            <div class="bo-terms">
              <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank">${CONFIG.termsLinkText}</a></p>
            </div>
          </div>
          <div class="bo-scrollbar-area">
            <div class="bo-scrollbar-track"></div>
          </div>
        </div>

        <!-- INPUT -->
        <div class="bo-input-area">
          <div class="bo-input-container">
            <div class="bo-input-wrapper">
              <input type="text" class="bo-input" id="bo-input" placeholder="${CONFIG.inputPlaceholder}">
              <svg class="bo-attach-icon" fill="none" stroke="#5E7690" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </div>
            <button class="bo-send-btn" id="bo-send">
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- TYPING -->
        <div class="bo-typing" id="bo-typing">
          <span class="bo-typing-dots">
            <span class="bo-typing-dot"></span>
            <span class="bo-typing-dot"></span>
            <span class="bo-typing-dot"></span>
          </span>
          Escribiendo...
        </div>
      </div>
    `;
    
    return widget;
  }

  // ========== INIT ==========
  function init() {
    const widget = createWidget();
    document.body.appendChild(widget);
    
    const toggle = document.getElementById('bo-toggle');
    const window = document.getElementById('bo-window');
    const close = document.getElementById('bo-close');
    const input = document.getElementById('bo-input');
    const send = document.getElementById('bo-send');
    const messages = document.getElementById('bo-messages');
    const typing = document.getElementById('bo-typing');
    const chatIcon = document.getElementById('bo-icon-chat');
    const closeIcon = document.getElementById('bo-icon-close');
    
    let isOpen = false;
    let hasMessages = false;
    let whatsAppClicked = 'no';
    
    function toggleChat() {
      isOpen = !isOpen;
      if (isOpen) {
        window.classList.add('open');
        chatIcon.style.display = 'none';
        closeIcon.style.display = 'block';
        setTimeout(() => input.focus(), 100);
      } else {
        window.classList.remove('open');
        chatIcon.style.display = 'block';
        closeIcon.style.display = 'none';
      }
    }
    
    function addMessage(content, isUser = false) {
      if (!hasMessages) {
        hasMessages = true;
        messages.classList.add('has-messages');
      }
      
      const msg = document.createElement('div');
      msg.className = `bo-message ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'bo-bubble';
      
      if (isUser) {
        bubble.textContent = content;
      } else {
        bubble.innerHTML = parseMarkdown(content);
      }
      
      msg.appendChild(bubble);
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }
    
    function showTyping() {
      typing.style.display = 'block';
    }
    
    function hideTyping() {
      typing.style.display = 'none';
    }
    
    async function sendMessage(message) {
      try {
        showTyping();
        const response = await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            sessionId: SESSION_ID,
            timestamp: new Date().toISOString(),
            whatsAppIsClicked: whatsAppClicked
          })
        });
        hideTyping();
        
        if (response.ok) {
          const reply = await response.text();
          if (reply && reply.trim()) addMessage(reply.trim(), false);
        } else {
          addMessage(`Error: ${response.status}`, false);
        }
      } catch (error) {
        hideTyping();
        addMessage(`Error: ${error.message}`, false);
      }
    }
    
    async function trackWhatsApp(url) {
      try {
        await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'WhatsApp link clicked',
            sessionId: SESSION_ID,
            timestamp: new Date().toISOString(),
            whatsAppIsClicked: 'yes',
            whatsappUrl: url
          })
        });
      } catch (e) {}
    }
    
    function handleSend() {
      const msg = input.value.trim();
      if (msg) {
        addMessage(msg, true);
        input.value = '';
        sendMessage(msg);
      }
    }
    
    toggle.addEventListener('click', toggleChat);
    close.addEventListener('click', toggleChat);
    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
    
    messages.addEventListener('click', (e) => {
      let target = e.target;
      while (target && target !== messages) {
        if (target.tagName === 'A' && target.href && target.href.includes('wa.me/')) {
          whatsAppClicked = 'yes';
          trackWhatsApp(target.href);
          break;
        }
        target = target.parentElement;
      }
    });
    
    console.log('BlackOrbit Widget: Listo!', SESSION_ID);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
