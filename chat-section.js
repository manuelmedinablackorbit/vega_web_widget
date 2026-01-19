(function() {
  'use strict';
  
  const userConfig = window.BlackOrbitSectionConfig || {};
  
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    
    // SECTION DESIGN
    sectionTitle: userConfig.sectionTitle || 'Habla con nuestro asistente',
    sectionSubtitle: userConfig.sectionSubtitle || 'Estamos aquí para ayudarte. Pregúntanos lo que necesites.',
    showSectionHeader: userConfig.showSectionHeader !== false,
    
    // LAYOUT
    containerId: userConfig.containerId || 'blackorbit-chat-section',
    maxWidth: userConfig.maxWidth || '1200px',
    chatHeight: userConfig.chatHeight || '500px',
    
    // COLORS
    primaryColor: userConfig.primaryColor || '#212121',
    secondaryColor: userConfig.secondaryColor || '#ffffff',
    backgroundColor: userConfig.backgroundColor || '#f8f9fa',
    sectionBgColor: userConfig.sectionBgColor || '#ffffff',
    textColor: userConfig.textColor || '#333333',
    
    // BORDER RADIUS
    chatBorderRadius: userConfig.chatBorderRadius || '12px',
    messageBorderRadius: userConfig.messageBorderRadius || '18px',
    inputBorderRadius: userConfig.inputBorderRadius || '20px',
    
    // TYPOGRAPHY
    fontFamily: userConfig.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: userConfig.fontSize || '14px',
    titleFontSize: userConfig.titleFontSize || '32px',
    subtitleFontSize: userConfig.subtitleFontSize || '16px',
    
    // SPACING
    sectionPadding: userConfig.sectionPadding || '60px 20px',
    
    // CHAT CONFIG
    chatTitle: userConfig.chatTitle || 'Chat en vivo',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad',
    termsLinkText: userConfig.termsLinkText || 'Ver política',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit: webhookUrl is required');
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
      padding: ${CONFIG.sectionPadding};
      background: ${CONFIG.sectionBgColor};
      font-family: ${CONFIG.fontFamily};
    }
    
    .bo-section-container {
      max-width: ${CONFIG.maxWidth};
      margin: 0 auto;
    }
    
    ${CONFIG.showSectionHeader ? `
    .bo-section-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .bo-section-title {
      font-size: ${CONFIG.titleFontSize};
      font-weight: 700;
      color: ${CONFIG.textColor};
      margin: 0 0 12px 0;
      line-height: 1.2;
    }
    
    .bo-section-subtitle {
      font-size: ${CONFIG.subtitleFontSize};
      color: #666;
      margin: 0;
      line-height: 1.5;
    }
    ` : ''}
    
    .bo-chat-wrapper {
      background: ${CONFIG.backgroundColor};
      border-radius: ${CONFIG.chatBorderRadius};
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: ${CONFIG.chatHeight};
    }
    
    .bo-chat-header {
      background: ${CONFIG.primaryColor};
      color: white;
      padding: 16px 20px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      border-bottom: 2px solid rgba(255,255,255,0.1);
    }
    
    .bo-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: ${CONFIG.secondaryColor};
    }
    
    .bo-chat-terms {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px auto;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    .bo-chat-terms svg {
      margin-bottom: 12px;
      opacity: 0.6;
    }
    
    .bo-chat-terms p {
      margin: 0;
      color: ${CONFIG.textColor};
      font-size: 14px;
      line-height: 1.6;
    }
    
    .bo-chat-terms a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: border-bottom 0.2s;
    }
    
    .bo-chat-terms a:hover {
      border-bottom: 1px solid ${CONFIG.primaryColor};
    }
    
    .bo-chat-messages.has-messages .bo-chat-terms {
      display: none;
    }
    
    .bo-chat-typing {
      padding: 12px 20px;
      background: ${CONFIG.secondaryColor};
      border-top: 1px solid #e1e5e9;
      display: none;
      font-size: 13px;
      color: #666;
      text-align: center;
    }
    
    .bo-chat-input-area {
      padding: 20px;
      border-top: 1px solid #e1e5e9;
      background: white;
    }
    
    .bo-chat-input-container {
      display: flex;
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .bo-chat-input {
      flex: 1;
      padding: 14px 18px;
      border: 2px solid #e1e5e9;
      border-radius: ${CONFIG.inputBorderRadius};
      outline: none;
      font-size: ${CONFIG.fontSize};
      font-family: ${CONFIG.fontFamily};
      background: white;
      color: ${CONFIG.textColor};
      transition: all 0.2s;
    }
    
    .bo-chat-input:focus {
      border-color: ${CONFIG.primaryColor};
      box-shadow: 0 0 0 3px color-mix(in srgb, ${CONFIG.primaryColor} 15%, transparent);
    }
    
    .bo-chat-send-btn {
      background: ${CONFIG.primaryColor};
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .bo-chat-send-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .bo-chat-send-btn:active {
      transform: scale(0.95);
    }
    
    .bo-chat-powered {
      padding: 12px 20px;
      background: white;
      border-top: 1px solid #e1e5e9;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    
    .bo-chat-powered a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    
    .bo-chat-powered a:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
    
    .bo-message {
      margin-bottom: 16px;
      display: flex;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .bo-message.user {
      justify-content: flex-end;
    }
    
    .bo-message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: ${CONFIG.messageBorderRadius};
      font-size: ${CONFIG.fontSize};
      line-height: 1.5;
      word-wrap: break-word;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .bo-message.user .bo-message-bubble {
      background: ${CONFIG.primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .bo-message.bot .bo-message-bubble {
      background: white;
      color: ${CONFIG.textColor};
      border: 1px solid #e1e5e9;
      border-bottom-left-radius: 4px;
    }
    
    .bo-message-bubble h1,
    .bo-message-bubble h2,
    .bo-message-bubble h3 {
      margin: 10px 0 6px 0;
      line-height: 1.3;
    }
    
    .bo-message-bubble h1 { font-size: 20px; font-weight: 600; }
    .bo-message-bubble h2 { font-size: 18px; font-weight: 600; }
    .bo-message-bubble h3 { font-size: 16px; font-weight: 600; }
    
    .bo-message-bubble p {
      margin: 8px 0;
      line-height: 1.5;
    }
    
    .bo-message-bubble strong { font-weight: 600; }
    .bo-message-bubble em { font-style: italic; }
    
    .bo-message-bubble code {
      background: rgba(0,0,0,0.06);
      padding: 3px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }
    
    .bo-message.user .bo-message-bubble code {
      background: rgba(255,255,255,0.25);
    }
    
    .bo-message-bubble pre {
      background: rgba(0,0,0,0.06);
      padding: 12px;
      border-radius: 6px;
      margin: 10px 0;
      overflow-x: auto;
    }
    
    .bo-message.user .bo-message-bubble pre {
      background: rgba(255,255,255,0.25);
    }
    
    .bo-message-bubble pre code {
      background: none;
      padding: 0;
      font-size: 13px;
      display: block;
      white-space: pre;
    }
    
    .bo-message-bubble blockquote {
      border-left: 3px solid #ddd;
      padding-left: 12px;
      margin: 10px 0;
      font-style: italic;
      opacity: 0.85;
    }
    
    .bo-message.user .bo-message-bubble blockquote {
      border-left-color: rgba(255,255,255,0.5);
    }
    
    .bo-message-bubble ul,
    .bo-message-bubble ol {
      margin: 10px 0;
      padding-left: 24px;
    }
    
    .bo-message-bubble li {
      margin: 6px 0;
      line-height: 1.5;
    }
    
    .bo-message-bubble a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.85;
      transition: opacity 0.2s;
    }
    
    .bo-message-bubble a:hover {
      opacity: 1;
    }
    
    .bo-message-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
      display: block;
    }
    
    .bo-typing-dots {
      display: inline-flex;
      gap: 4px;
      margin-right: 8px;
    }
    
    .bo-typing-dots div {
      width: 6px;
      height: 6px;
      background: #666;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }
    
    .bo-typing-dots div:nth-child(1) { animation-delay: -0.32s; }
    .bo-typing-dots div:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    
    .bo-chat-messages::-webkit-scrollbar {
      width: 8px;
    }
    
    .bo-chat-messages::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    .bo-chat-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 4px;
    }
    
    .bo-chat-messages::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
    
    @media (max-width: 768px) {
      #${CONFIG.containerId} {
        padding: 40px 16px;
      }
      
      .bo-section-title {
        font-size: 28px;
      }
      
      .bo-section-subtitle {
        font-size: 15px;
      }
      
      .bo-chat-wrapper {
        height: 500px;
      }
      
      .bo-message-bubble {
        max-width: 85%;
      }
      
      .bo-chat-input {
        font-size: 16px;
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
      <div class="bo-section-container">
        ${CONFIG.showSectionHeader ? `
        <div class="bo-section-header">
          <h2 class="bo-section-title">${CONFIG.sectionTitle}</h2>
          <p class="bo-section-subtitle">${CONFIG.sectionSubtitle}</p>
        </div>
        ` : ''}
        
        <div class="bo-chat-wrapper">
          <div class="bo-chat-header">${CONFIG.chatTitle}</div>
          
          <div class="bo-chat-messages">
            <div class="bo-chat-terms">
              <svg width="24" height="24" fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" rel="noopener noreferrer">${CONFIG.termsLinkText}</a></p>
            </div>
          </div>
          
          <div class="bo-chat-typing">
            <div class="bo-typing-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
            Escribiendo...
          </div>
          
          <div class="bo-chat-input-area">
            <div class="bo-chat-input-container">
              <input type="text" class="bo-chat-input" placeholder="${CONFIG.inputPlaceholder}" />
              <button type="button" class="bo-chat-send-btn">
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="bo-chat-powered">
            Powered by <a href="https://blackorbitai.com/" target="_blank">BlackOrbitAI</a>
          </div>
        </div>
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
    
    const messageInput = section.querySelector('.bo-chat-input');
    const sendBtn = section.querySelector('.bo-chat-send-btn');
    const messagesContainer = section.querySelector('.bo-chat-messages');
    const typingIndicator = section.querySelector('.bo-chat-typing');
    
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
      messageEl.className = `bo-message ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'bo-message-bubble';
      
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
