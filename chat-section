(function() {
  'use strict';
  
  // Get configuration from window or use defaults
  const userConfig = window.BlackOrbitSectionConfig || {};
  
  // Section Configuration with extensive customization options
  const CONFIG = {
    // REQUIRED
    webhookUrl: userConfig.webhookUrl || '',
    
    // CONTAINER & LAYOUT
    containerId: userConfig.containerId || 'blackorbit-chat-section',
    maxWidth: userConfig.maxWidth || '1200px',
    height: userConfig.height || '600px',
    mobileHeight: userConfig.mobileHeight || '100vh',
    
    // BACKGROUND
    hasBackground: userConfig.hasBackground !== false, // default true
    backgroundColor: userConfig.backgroundColor || '#f8f9fa',
    
    // COLORS
    primaryColor: userConfig.primaryColor || '#212121',
    secondaryColor: userConfig.secondaryColor || '#ffffff',
    textColor: userConfig.textColor || '#333333',
    userMessageBg: userConfig.userMessageBg || null, // null = uses primaryColor
    botMessageBg: userConfig.botMessageBg || '#ffffff',
    
    // BORDER RADIUS
    containerBorderRadius: userConfig.containerBorderRadius || '12px',
    messageBorderRadius: userConfig.messageBorderRadius || '18px',
    inputBorderRadius: userConfig.inputBorderRadius || '20px',
    
    // TYPOGRAPHY
    fontFamily: userConfig.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: userConfig.fontSize || '14px',
    
    // HEADER (optional - if empty, no header is shown)
    showHeader: userConfig.showHeader !== false, // default true
    headerTitle: userConfig.headerTitle || 'Asistente AI',
    headerBg: userConfig.headerBg || null, // null = uses primaryColor
    headerTextColor: userConfig.headerTextColor || '#ffffff',
    
    // WELCOME MESSAGE (optional)
    showWelcome: userConfig.showWelcome !== false, // default true
    welcomeTitle: userConfig.welcomeTitle || '',
    welcomeMessage: userConfig.welcomeMessage || '',
    
    // INPUT
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    
    // TERMS BANNER
    showTerms: userConfig.showTerms !== false, // default true
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/',
    
    // POWERED BY
    showPoweredBy: userConfig.showPoweredBy !== false, // default true
    poweredByText: userConfig.poweredByText || 'Powered by',
    poweredByLink: userConfig.poweredByLink || 'https://blackorbitai.com/',
    poweredByName: userConfig.poweredByName || 'BlackOrbitAI'
  };

  // Validate webhook URL
  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Section Error: webhookUrl is required in BlackOrbitSectionConfig');
    return;
  }

  // Generate unique session ID
  const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Derived colors
  const finalUserMessageBg = CONFIG.userMessageBg || CONFIG.primaryColor;
  const finalHeaderBg = CONFIG.headerBg || CONFIG.primaryColor;

  // ========== MARKDOWN PARSER FUNCTION ==========
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

  // Create and inject CSS
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
      position: relative;
    }
    
    ${CONFIG.showHeader ? `
    #blackorbit-section-header {
      background: ${finalHeaderBg};
      color: ${CONFIG.headerTextColor};
      padding: 20px 24px;
      font-weight: 600;
      font-size: 18px;
      text-align: center;
      flex-shrink: 0;
    }
    ` : ''}
    
    #blackorbit-section-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : 'transparent'};
      position: relative;
    }
    
    /* Welcome Message */
    ${(CONFIG.showWelcome && (CONFIG.welcomeTitle || CONFIG.welcomeMessage)) ? `
    #blackorbit-welcome {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 12px;
      padding: 24px;
      margin: 20px auto;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    #blackorbit-welcome h2 {
      margin: 0 0 12px 0;
      color: ${CONFIG.primaryColor};
      font-size: 22px;
      font-weight: 600;
    }
    
    #blackorbit-welcome p {
      margin: 0;
      color: ${CONFIG.textColor};
      font-size: 15px;
      line-height: 1.6;
    }
    
    #blackorbit-section-messages.has-messages #blackorbit-welcome {
      display: none;
    }
    ` : ''}
    
    /* Terms Banner */
    ${CONFIG.showTerms ? `
    #blackorbit-terms {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 12px;
      padding: 20px;
      margin: 20px auto;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    #blackorbit-terms svg {
      margin-bottom: 12px;
      opacity: 0.6;
    }
    
    #blackorbit-terms p {
      margin: 0;
      color: ${CONFIG.textColor};
      font-size: 14px;
      line-height: 1.6;
    }
    
    #blackorbit-terms a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: border-bottom 0.2s ease;
    }
    
    #blackorbit-terms a:hover {
      border-bottom: 1px solid ${CONFIG.primaryColor};
    }
    
    #blackorbit-section-messages.has-messages #blackorbit-terms {
      display: none;
    }
    ` : ''}
    
    #blackorbit-section-input {
      padding: 20px;
      border-top: 1px solid #e1e5e9;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : 'transparent'};
      flex-shrink: 0;
    }
    
    #blackorbit-input-container {
      display: flex;
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    #blackorbit-message-input {
      flex: 1;
      padding: 14px 18px;
      border: 1px solid #e1e5e9;
      border-radius: ${CONFIG.inputBorderRadius};
      outline: none;
      font-size: ${CONFIG.fontSize};
      font-family: ${CONFIG.fontFamily};
      background: white;
      color: ${CONFIG.textColor};
      transition: all 0.2s ease;
    }
    
    #blackorbit-message-input:focus {
      border-color: ${CONFIG.primaryColor};
      box-shadow: 0 0 0 3px color-mix(in srgb, ${CONFIG.primaryColor} 20%, transparent);
    }
    
    #blackorbit-send-btn {
      background: ${CONFIG.primaryColor};
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    #blackorbit-send-btn:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
    
    #blackorbit-send-btn:active {
      transform: scale(0.95);
    }
    
    #blackorbit-typing {
      padding: 12px 20px;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : 'transparent'};
      border-top: 1px solid #e1e5e9;
      display: none;
      font-size: 13px;
      color: #666;
      text-align: center;
    }
    
    ${CONFIG.showPoweredBy ? `
    #blackorbit-powered {
      padding: 12px 20px;
      background: ${CONFIG.hasBackground ? CONFIG.secondaryColor : 'transparent'};
      border-top: 1px solid #e1e5e9;
      text-align: center;
      font-size: 12px;
      color: #888;
      flex-shrink: 0;
    }
    
    #blackorbit-powered a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #blackorbit-powered a:hover {
      text-decoration: underline;
    }
    ` : ''}
    
    .blackorbit-message {
      margin-bottom: 16px;
      display: flex;
      animation: messageSlideIn 0.3s ease;
    }
    
    @keyframes messageSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .blackorbit-message.user {
      justify-content: flex-end;
    }
    
    .blackorbit-message-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: ${CONFIG.messageBorderRadius};
      font-size: ${CONFIG.fontSize};
      line-height: 1.5;
      word-wrap: break-word;
    }
    
    .blackorbit-message.user .blackorbit-message-bubble {
      background: ${finalUserMessageBg};
      color: white;
      border-bottom-right-radius: 6px;
    }
    
    .blackorbit-message.bot .blackorbit-message-bubble {
      background: ${CONFIG.botMessageBg};
      color: ${CONFIG.textColor};
      border: 1px solid #e1e5e9;
      border-bottom-left-radius: 6px;
    }
    
    /* Markdown Styling */
    .blackorbit-message-bubble h1,
    .blackorbit-message-bubble h2,
    .blackorbit-message-bubble h3 {
      margin: 10px 0 6px 0;
      line-height: 1.3;
    }
    
    .blackorbit-message-bubble h1 { font-size: 20px; font-weight: 600; }
    .blackorbit-message-bubble h2 { font-size: 18px; font-weight: 600; }
    .blackorbit-message-bubble h3 { font-size: 16px; font-weight: 600; }
    
    .blackorbit-message-bubble p {
      margin: 8px 0;
      line-height: 1.5;
    }
    
    .blackorbit-message-bubble strong { font-weight: 600; }
    .blackorbit-message-bubble em { font-style: italic; }
    
    .blackorbit-message-bubble code {
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
    }
    
    .blackorbit-message.user .blackorbit-message-bubble code {
      background: rgba(255,255,255,0.25);
    }
    
    .blackorbit-message-bubble pre {
      background: rgba(0,0,0,0.06);
      padding: 12px;
      border-radius: 6px;
      margin: 10px 0;
      overflow-x: auto;
    }
    
    .blackorbit-message.user .blackorbit-message-bubble pre {
      background: rgba(255,255,255,0.25);
    }
    
    .blackorbit-message-bubble pre code {
      background: none;
      padding: 0;
      font-size: 13px;
      display: block;
      white-space: pre;
    }
    
    .blackorbit-message-bubble blockquote {
      border-left: 3px solid #ddd;
      padding-left: 12px;
      margin: 10px 0;
      font-style: italic;
      opacity: 0.85;
    }
    
    .blackorbit-message.user .blackorbit-message-bubble blockquote {
      border-left-color: rgba(255,255,255,0.5);
    }
    
    .blackorbit-message-bubble ul,
    .blackorbit-message-bubble ol {
      margin: 10px 0;
      padding-left: 24px;
    }
    
    .blackorbit-message-bubble li {
      margin: 6px 0;
      line-height: 1.5;
    }
    
    .blackorbit-message-bubble a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.85;
      transition: opacity 0.2s ease;
    }
    
    .blackorbit-message-bubble a:hover {
      opacity: 1;
    }
    
    .blackorbit-message-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
      display: block;
    }
    
    .blackorbit-typing-dots {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      margin-right: 8px;
    }
    
    .blackorbit-typing-dots div {
      width: 6px;
      height: 6px;
      background: #666;
      border-radius: 50%;
      animation: blackorbit-typing 1.4s infinite ease-in-out;
    }
    
    .blackorbit-typing-dots div:nth-child(1) { animation-delay: -0.32s; }
    .blackorbit-typing-dots div:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes blackorbit-typing {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    
    #blackorbit-section-messages::-webkit-scrollbar {
      width: 8px;
    }
    
    #blackorbit-section-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    
    #blackorbit-section-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 4px;
    }
    
    #blackorbit-section-messages::-webkit-scrollbar-thumb:hover {
      background: #aaa;
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      #${CONFIG.containerId} {
        height: ${CONFIG.mobileHeight};
        max-width: 100%;
        border-radius: 0;
      }
      
      #blackorbit-section-messages {
        padding: 16px;
      }
      
      .blackorbit-message-bubble {
        max-width: 85%;
      }
      
      #blackorbit-section-input {
        padding: 16px;
      }
      
      #blackorbit-message-input {
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }
  `;

  // Create section HTML
  function createSection() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) {
      console.error(`BlackOrbit Section Error: Container with id "${CONFIG.containerId}" not found`);
      return null;
    }
    
    let welcomeHTML = '';
    if (CONFIG.showWelcome && (CONFIG.welcomeTitle || CONFIG.welcomeMessage)) {
      welcomeHTML = `
        <div id="blackorbit-welcome">
          ${CONFIG.welcomeTitle ? `<h2>${CONFIG.welcomeTitle}</h2>` : ''}
          ${CONFIG.welcomeMessage ? `<p>${CONFIG.welcomeMessage}</p>` : ''}
        </div>
      `;
    }
    
    let termsHTML = '';
    if (CONFIG.showTerms) {
      termsHTML = `
        <div id="blackorbit-terms">
          <svg width="24" height="24" fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" rel="noopener noreferrer">${CONFIG.termsLinkText}</a></p>
        </div>
      `;
    }
    
    container.innerHTML = `
      ${CONFIG.showHeader ? `<div id="blackorbit-section-header">${CONFIG.headerTitle}</div>` : ''}
      
      <div id="blackorbit-section-messages">
        ${welcomeHTML}
        ${termsHTML}
      </div>
      
      <div id="blackorbit-typing">
        <div class="blackorbit-typing-dots">
          <div></div>
          <div></div>
          <div></div>
        </div>
        Escribiendo...
      </div>
      
      <div id="blackorbit-section-input">
        <div id="blackorbit-input-container">
          <input type="text" id="blackorbit-message-input" placeholder="${CONFIG.inputPlaceholder}" />
          <button type="button" id="blackorbit-send-btn">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
      
      ${CONFIG.showPoweredBy ? `
      <div id="blackorbit-powered">
        ${CONFIG.poweredByText} <a href="${CONFIG.poweredByLink}" target="_blank">${CONFIG.poweredByName}</a>
      </div>
      ` : ''}
    `;
    
    return container;
  }

  // Initialize section
  function initSection() {
    // Inject CSS
    const styleSheet = document.createElement('style');
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
    
    // Create section
    const section = createSection();
    if (!section) return;
    
    // Get elements
    const messageInput = document.getElementById('blackorbit-message-input');
    const sendBtn = document.getElementById('blackorbit-send-btn');
    const messagesContainer = document.getElementById('blackorbit-section-messages');
    const typingIndicator = document.getElementById('blackorbit-typing');
    
    let hasMessages = false;
    let whatsAppIsClicked = 'no';
    
    // Scroll to bottom
    function scrollToBottom() {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
    
    // Add message
    function addMessage(content, isUser = false) {
      if (!hasMessages) {
        hasMessages = true;
        messagesContainer.classList.add('has-messages');
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = `blackorbit-message ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'blackorbit-message-bubble';
      
      if (isUser) {
        bubble.textContent = content;
      } else {
        bubble.innerHTML = parseMarkdown(content);
      }
      
      messageEl.appendChild(bubble);
      messagesContainer.appendChild(messageEl);
      scrollToBottom();
    }
    
    // Show/hide typing
    function showTyping() {
      typingIndicator.style.display = 'block';
      scrollToBottom();
    }
    
    function hideTyping() {
      typingIndicator.style.display = 'none';
    }
    
    // Send message
    async function sendMessage(message) {
      try {
        showTyping();
        
        const response = await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
            addMessage('Respuesta vacía del servidor.', false);
          }
        } else {
          addMessage(`Error del servidor (${response.status}): ${response.statusText}`, false);
        }
      } catch (error) {
        hideTyping();
        addMessage(`Error de conexión: ${error.message}`, false);
      }
    }
    
    // WhatsApp tracking
    async function sendWhatsAppClickTracking(url) {
      try {
        await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'WhatsApp link clicked',
            sessionId: SESSION_ID,
            timestamp: new Date().toISOString(),
            whatsAppIsClicked: 'yes',
            whatsappUrl: url
          })
        });
      } catch (error) {
        console.error('Failed to send WhatsApp tracking:', error);
      }
    }
    
    // Handle send
    function handleSendMessage() {
      const message = messageInput.value.trim();
      if (message) {
        addMessage(message, true);
        messageInput.value = '';
        sendMessage(message);
      }
    }
    
    // Event listeners
    sendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleSendMessage();
    });
    
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
    });
    
    // WhatsApp link tracking
    messagesContainer.addEventListener('click', function(e) {
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
    
    console.log('BlackOrbit Chat Section initialized with session ID:', SESSION_ID);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSection);
  } else {
    initSection();
  }
})();
