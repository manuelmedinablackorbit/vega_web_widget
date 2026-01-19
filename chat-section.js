(function() {
  'use strict';
  
  const userConfig = window.BlackOrbitSectionConfig || {};
  
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    
    // LAYOUT
    containerId: userConfig.containerId || 'blackorbit-chat-section',
    maxWidth: userConfig.maxWidth || '1200px',
    height: userConfig.height || '600px',
    
    // BACKGROUND  
    hasBackground: userConfig.hasBackground !== false,
    backgroundColor: userConfig.backgroundColor || '#f8f9fa',
    
    // COLORS
    primaryColor: userConfig.primaryColor || '#212121',
    secondaryColor: userConfig.secondaryColor || '#ffffff',
    textColor: userConfig.textColor || '#333333',
    
    // BORDER RADIUS
    containerBorderRadius: userConfig.containerBorderRadius || '12px',
    messageBorderRadius: userConfig.messageBorderRadius || '18px',
    inputBorderRadius: userConfig.inputBorderRadius || '20px',
    
    // TYPOGRAPHY
    fontFamily: userConfig.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: userConfig.fontSize || '14px',
    
    // ORIGINAL WIDGET CONFIG (don't touch these)
    chatTitle: userConfig.chatTitle || 'Asistente AI',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Section Error: webhookUrl is required');
    return;
  }

  const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // ========== MARKDOWN PARSER (EXACT COPY FROM WIDGET) ==========
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
    
    if (html.includes('</p><p>')) {
      html = '<p>' + html + '</p>';
    }
    
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0;" />');
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, function(match) {
      const originalText = text.substring(text.indexOf(match.replace(/<[^>]*>/g, '').trim()));
      if (/^\d+\./.test(originalText)) {
        return '<ol>' + match + '</ol>';
      } else {
        return '<ul>' + match + '</ul>';
      }
    });
    html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    
    return sanitize(html);
  }

  // ========== CSS ==========
  const css = `
    #${CONFIG.containerId} {
      width: 100%;
      max-width: ${CONFIG.maxWidth};
      height: ${CONFIG.height};
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      font-family: ${CONFIG.fontFamily};
      ${CONFIG.hasBackground ? `background: ${CONFIG.backgroundColor};` : ''}
      ${CONFIG.hasBackground ? `border-radius: ${CONFIG.containerBorderRadius};` : ''}
      ${CONFIG.hasBackground ? 'box-shadow: 0 2px 12px rgba(0,0,0,0.08);' : ''}
      overflow: hidden;
    }
    
    #bo-section-header {
      background: ${CONFIG.primaryColor};
      color: white;
      padding: 16px 20px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    
    #bo-section-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: ${CONFIG.secondaryColor};
    }
    
    #bo-section-terms {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    #bo-section-terms svg {
      margin-bottom: 12px;
      opacity: 0.6;
    }
    
    #bo-section-terms p {
      margin: 0;
      color: ${CONFIG.textColor};
      font-size: 13px;
      line-height: 1.5;
    }
    
    #bo-section-terms a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #bo-section-terms a:hover {
      text-decoration: underline;
    }
    
    #bo-section-messages.has-messages #bo-section-terms {
      display: none;
    }
    
    #bo-section-input {
      padding: 16px;
      border-top: 1px solid #e1e5e9;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : '#ffffff'};
    }
    
    #bo-section-input-container {
      display: flex;
      gap: 8px;
    }
    
    #bo-section-message-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #e1e5e9;
      border-radius: ${CONFIG.inputBorderRadius};
      outline: none;
      font-size: ${CONFIG.fontSize};
      font-family: ${CONFIG.fontFamily};
      background: white;
      color: ${CONFIG.textColor};
    }
    
    #bo-section-message-input:focus {
      border-color: ${CONFIG.primaryColor};
      box-shadow: 0 0 0 3px color-mix(in srgb, ${CONFIG.primaryColor} 20%, transparent);
    }
    
    #bo-section-send-btn {
      background: ${CONFIG.primaryColor};
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    #bo-section-send-btn:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
    
    #bo-section-typing {
      padding: 8px 16px;
      background: ${CONFIG.secondaryColor};
      border-top: 1px solid #e1e5e9;
      display: none;
      font-size: 12px;
      color: #666;
    }
    
    #bo-section-powered {
      padding: 8px 16px;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : '#ffffff'};
      border-top: 1px solid #e1e5e9;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
    
    #bo-section-powered a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #bo-section-powered a:hover {
      text-decoration: underline;
    }
    
    .bo-section-message {
      margin-bottom: 12px;
      display: flex;
    }
    
    .bo-section-message.user {
      justify-content: flex-end;
    }
    
    .bo-section-message-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: ${CONFIG.messageBorderRadius};
      font-size: ${CONFIG.fontSize};
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .bo-section-message.user .bo-section-message-bubble {
      background: ${CONFIG.primaryColor};
      color: white;
      border-bottom-right-radius: 6px;
    }
    
    .bo-section-message.bot .bo-section-message-bubble {
      background: white;
      color: ${CONFIG.textColor};
      border: 1px solid #e1e5e9;
      border-bottom-left-radius: 6px;
    }
    
    .bo-section-message-bubble h1,
    .bo-section-message-bubble h2,
    .bo-section-message-bubble h3 {
      margin: 8px 0 4px 0;
      line-height: 1.2;
    }
    
    .bo-section-message-bubble h1 { font-size: 18px; font-weight: 600; }
    .bo-section-message-bubble h2 { font-size: 16px; font-weight: 600; }
    .bo-section-message-bubble h3 { font-size: 14px; font-weight: 600; }
    
    .bo-section-message-bubble p {
      margin: 8px 0;
      line-height: 1.4;
    }
    
    .bo-section-message-bubble strong { font-weight: 600; }
    .bo-section-message-bubble em { font-style: italic; }
    
    .bo-section-message-bubble code {
      background: rgba(0,0,0,0.05);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    }
    
    .bo-section-message.user .bo-section-message-bubble code {
      background: rgba(255,255,255,0.2);
    }
    
    .bo-section-message-bubble pre {
      background: rgba(0,0,0,0.05);
      padding: 8px;
      border-radius: 6px;
      margin: 8px 0;
      overflow-x: auto;
    }
    
    .bo-section-message.user .bo-section-message-bubble pre {
      background: rgba(255,255,255,0.2);
    }
    
    .bo-section-message-bubble pre code {
      background: none;
      padding: 0;
      font-size: 12px;
      display: block;
      white-space: pre;
    }
    
    .bo-section-message-bubble blockquote {
      border-left: 3px solid #ddd;
      padding-left: 12px;
      margin: 8px 0;
      font-style: italic;
      opacity: 0.8;
    }
    
    .bo-section-message.user .bo-section-message-bubble blockquote {
      border-left-color: rgba(255,255,255,0.4);
    }
    
    .bo-section-message-bubble ul,
    .bo-section-message-bubble ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .bo-section-message-bubble li {
      margin: 4px 0;
      line-height: 1.4;
    }
    
    .bo-section-message-bubble a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.8;
    }
    
    .bo-section-message-bubble a:hover {
      opacity: 1;
    }
    
    .bo-section-message-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 4px 0;
      display: block;
    }
    
    .bo-section-typing-dots {
      display: flex;
      gap: 2px;
      align-items: center;
    }
    
    .bo-section-typing-dots div {
      width: 4px;
      height: 4px;
      background: #666;
      border-radius: 50%;
      animation: bo-typing 1.4s infinite ease-in-out;
    }
    
    .bo-section-typing-dots div:nth-child(1) { animation-delay: -0.32s; }
    .bo-section-typing-dots div:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bo-typing {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    
    #bo-section-messages::-webkit-scrollbar {
      width: 6px;
    }
    
    #bo-section-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    
    #bo-section-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }
    
    #bo-section-messages::-webkit-scrollbar-thumb:hover {
      background: #aaa;
    }
    
    @media (max-width: 768px) {
      #${CONFIG.containerId} {
        height: 100vh;
        max-width: 100%;
        border-radius: 0;
      }
    }
  `;

  // ========== CREATE SECTION HTML ==========
  function createSection() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) {
      console.error(`BlackOrbit: Container "${CONFIG.containerId}" not found`);
      return null;
    }
    
    container.innerHTML = `
      <div id="bo-section-header">${CONFIG.chatTitle}</div>
      
      <div id="bo-section-messages">
        <div id="bo-section-terms">
          <svg width="24" height="24" fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" rel="noopener noreferrer">${CONFIG.termsLinkText}</a></p>
        </div>
      </div>
      
      <div id="bo-section-typing">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="bo-section-typing-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          Assistant is typing...
        </div>
      </div>
      
      <div id="bo-section-input">
        <div id="bo-section-input-container">
          <input type="text" id="bo-section-message-input" placeholder="${CONFIG.inputPlaceholder}" />
          <button type="button" id="bo-section-send-btn">
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div id="bo-section-powered">
        Powered by <a href="https://blackorbitai.com/" target="_blank">BlackOrbitAI</a>
      </div>
    `;
    
    return container;
  }

  // ========== INITIALIZE ==========
  function initSection() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
    
    const section = createSection();
    if (!section) return;
    
    const messageInput = document.getElementById('bo-section-message-input');
    const sendBtn = document.getElementById('bo-section-send-btn');
    const messagesContainer = document.getElementById('bo-section-messages');
    const typingIndicator = document.getElementById('bo-section-typing');
    
    let hasMessages = false;
    let whatsAppIsClicked = 'no';
    
    function scrollToBottom() {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
    
    function addMessage(content, isUser = false) {
      if (!hasMessages) {
        hasMessages = true;
        messagesContainer.classList.add('has-messages');
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = `bo-section-message ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'bo-section-message-bubble';
      
      if (isUser) {
        bubble.textContent = content;
      } else {
        bubble.innerHTML = parseMarkdown(content);
      }
      
      messageEl.appendChild(bubble);
      messagesContainer.appendChild(messageEl);
      scrollToBottom();
    }
    
    function showTyping() {
      typingIndicator.style.display = 'block';
      scrollToBottom();
    }
    
    function hideTyping() {
      typingIndicator.style.display = 'none';
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
            whatsAppIsClicked: whatsAppIsClicked
          })
        });
        
        hideTyping();
        
        if (response.ok) {
          const reply = await response.text();
          if (reply && reply.trim()) {
            addMessage(reply.trim(), false);
          } else {
            addMessage('Received empty response from server.', false);
          }
        } else {
          addMessage(`Server error (${response.status}): ${response.statusText}`, false);
        }
      } catch (error) {
        hideTyping();
        addMessage(`Connection error: ${error.message}`, false);
      }
    }
    
    async function sendWhatsAppClickTracking(url) {
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
      } catch (error) {
        console.error('WhatsApp tracking failed:', error);
      }
    }
    
    function handleSendMessage() {
      const message = messageInput.value.trim();
      if (message) {
        addMessage(message, true);
        messageInput.value = '';
        sendMessage(message);
      }
    }
    
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleSendMessage();
    });
    
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
    
    messagesContainer.addEventListener('click', (e) => {
      let target = e.target;
      while (target && target !== messagesContainer) {
        if (target.tagName === 'A') {
          const href = target.href;
          if (href && href.includes('wa.me/')) {
            whatsAppIsClicked = 'yes';
            sendWhatsAppClickTracking(href);
          }
          break;
        }
        target = target.parentElement;
      }
    });
    
    console.log('BlackOrbit Chat Section initialized:', SESSION_ID);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSection);
  } else {
    initSection();
  }
})();
