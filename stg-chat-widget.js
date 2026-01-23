(function() {
  'use strict';
  
  const userConfig = window.BlackOrbitConfig || {};
  
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    primaryColor: userConfig.primaryColor || '#0EA5E9',
    chatTitle: userConfig.chatTitle || 'Asistente AI',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Widget Error: webhookUrl is required');
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
      const originalText = text.substring(text.indexOf(match.replace(/<[^>]*>/g, '').trim()));
      return /^\d+\./.test(originalText) ? '<ol>' + match + '</ol>' : '<ul>' + match + '</ul>';
    });
    
    html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    return sanitize(html);
  }

  // ========== CSS ==========
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    
    #bo-widget * { margin: 0; padding: 0; box-sizing: border-box; }
    #bo-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Poppins', sans-serif; }
    
    #bo-toggle { width: 56px; height: 56px; background: ${CONFIG.primaryColor}; border-radius: 50%; border: none; cursor: pointer; 
      display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 24px rgba(94,118,144,0.2); transition: all 0.3s; }
    #bo-toggle:hover { transform: scale(1.05); box-shadow: 0 16px 32px rgba(94,118,144,0.3); }
    #bo-toggle svg { width: 24px; height: 24px; }
    
    #bo-window { position: absolute; bottom: 76px; right: 0; width: 320px; height: 500px; background: white; border-radius: 16px;
      box-shadow: 0 12px 24px rgba(94,118,144,0.2); border: 1px solid #e2e8f0; display: none; flex-direction: column; overflow: hidden; }
    #bo-window.open { display: flex; }
    
    #bo-header { padding: 12px 16px 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; 
      border-bottom: 1px solid #e2e8f0; }
    #bo-header-left { flex: 1; display: flex; align-items: center; gap: 8px; }
    #bo-title { font-size: 14px; font-weight: 600; color: #0f172a; line-height: 24px; }
    #bo-status { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
    #bo-header-right { display: flex; align-items: center; gap: 8px; }
    
    #bo-theme { width: 40px; height: 20px; padding: 2px; background: #e2e8f0; border-radius: 20px; border: none; cursor: pointer; display: flex; }
    #bo-theme-circle { width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; align-items: center; 
      justify-content: center; transition: transform 0.2s; }
    #bo-theme-circle svg { width: 16px; height: 16px; color: #64748b; }
    
    #bo-close { width: 32px; height: 32px; padding: 8px 8px 5px; border-radius: 8px; border: none; background: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    #bo-close:hover { background: #f1f5f9; }
    #bo-close svg { width: 16px; height: 16px; color: #64748b; }
    
    #bo-messages-wrap { flex: 1; display: flex; }
    #bo-messages { flex: 1; padding: 12px; background: white; overflow-y: auto; }
    #bo-scrollbar { padding: 4px; background: white; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; }
    #bo-scrollbar-track { width: 6px; flex: 1; background: #e2e8f0; border-radius: 10px; }
    
    #bo-terms { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-top: 80px; }
    #bo-terms.hidden { display: none; }
    #bo-terms svg { width: 24px; height: 24px; margin: 0 auto 12px; }
    #bo-terms p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; }
    #bo-terms a { color: ${CONFIG.primaryColor}; font-weight: 500; text-decoration: none; }
    #bo-terms a:hover { text-decoration: underline; }
    
    #bo-input-area { padding: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; }
    #bo-input-wrap { width: 100%; display: flex; justify-content: flex-start; align-items: center; gap: 8px; }
    #bo-input-box { flex: 1; height: 40px; padding: 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;
      display: flex; align-items: center; gap: 8px; overflow: hidden; }
    #bo-input { flex: 1; background: transparent; border: none; outline: none; color: #64748b; font-size: 14px; font-family: 'Poppins', sans-serif; }
    #bo-input::placeholder { color: #94a3b8; }
    #bo-input-box svg { width: 16px; height: 16px; color: #64748b; flex-shrink: 0; }
    
    #bo-send { width: 40px; height: 40px; padding: 8px; background: ${CONFIG.primaryColor}; border-radius: 8px; border: none; cursor: pointer;
      display: flex; justify-content: center; align-items: center; gap: 8px; overflow: hidden; transition: all 0.2s; }
    #bo-send:hover { transform: scale(1.05); opacity: 0.9; }
    #bo-send svg { width: 16px; height: 16px; color: white; }
    
    .bo-msg { margin-bottom: 12px; display: flex; }
    .bo-msg.user { justify-content: flex-end; }
    .bo-bubble { max-width: 80%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .bo-msg.user .bo-bubble { background: ${CONFIG.primaryColor}; color: white; border-bottom-right-radius: 4px; }
    .bo-msg.bot .bo-bubble { background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }
    
    .bo-bubble h1, .bo-bubble h2, .bo-bubble h3 { margin: 8px 0 4px 0; line-height: 1.2; font-weight: 600; }
    .bo-bubble h1 { font-size: 18px; }
    .bo-bubble h2 { font-size: 16px; }
    .bo-bubble h3 { font-size: 14px; }
    .bo-bubble p { margin: 8px 0; }
    .bo-bubble strong { font-weight: 600; }
    .bo-bubble code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; }
    .bo-msg.user .bo-bubble code { background: rgba(255,255,255,0.2); }
    .bo-bubble pre { background: rgba(0,0,0,0.05); padding: 8px; border-radius: 6px; margin: 8px 0; overflow-x: auto; }
    .bo-msg.user .bo-bubble pre { background: rgba(255,255,255,0.2); }
    .bo-bubble pre code { background: none; padding: 0; display: block; white-space: pre; }
    .bo-bubble blockquote { border-left: 3px solid #ddd; padding-left: 12px; margin: 8px 0; font-style: italic; opacity: 0.8; }
    .bo-bubble ul, .bo-bubble ol { margin: 8px 0; padding-left: 20px; }
    .bo-bubble li { margin: 4px 0; }
    .bo-bubble a { color: inherit; text-decoration: underline; opacity: 0.8; }
    .bo-bubble a:hover { opacity: 1; }
    
    #bo-typing { padding: 8px 12px; background: white; border-top: 1px solid #e2e8f0; display: none; font-size: 12px; color: #64748b; }
    #bo-typing.show { display: block; }
    .bo-dots { display: flex; gap: 4px; align-items: center; }
    .bo-dot { width: 8px; height: 8px; background: #64748b; border-radius: 50%; animation: bo-bounce 1.4s infinite ease-in-out; }
    .bo-dot:nth-child(1) { animation-delay: -0.32s; }
    .bo-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bo-bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
    
    #bo-messages::-webkit-scrollbar { width: 6px; }
    #bo-messages::-webkit-scrollbar-track { background: transparent; }
    #bo-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
    #bo-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
    
    @media (max-width: 768px) {
      #bo-window { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        width: 100vw !important; height: 100vh !important; border-radius: 0 !important; }
    }
  `;

  // ========== CREATE WIDGET ==========
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'bo-widget';
    
    widget.innerHTML = `
      <div id="bo-window">
        <div id="bo-header">
          <div id="bo-header-left">
            <div id="bo-title">${CONFIG.chatTitle}</div>
            <div id="bo-status"></div>
          </div>
          <div id="bo-header-right">
            <button id="bo-theme">
              <div id="bo-theme-circle">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </div>
            </button>
            <button id="bo-close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div id="bo-messages-wrap">
          <div id="bo-messages">
            <div id="bo-terms">
              <svg fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank">${CONFIG.termsLinkText}</a></p>
            </div>
          </div>
          <div id="bo-scrollbar">
            <div id="bo-scrollbar-track"></div>
          </div>
        </div>
        
        <div id="bo-typing">
          <div class="bo-dots">
            <div class="bo-dot"></div>
            <div class="bo-dot"></div>
            <div class="bo-dot"></div>
            <span style="margin-left: 8px;">Escribiendo...</span>
          </div>
        </div>
        
        <div id="bo-input-area">
          <div id="bo-input-wrap">
            <div id="bo-input-box">
              <input id="bo-input" type="text" placeholder="${CONFIG.inputPlaceholder}" />
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </div>
            <button id="bo-send">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <button id="bo-toggle">
        <svg id="bo-chat-icon" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="1.33">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <circle cx="9" cy="10" r="1" fill="white"/>
          <circle cx="12" cy="10" r="1" fill="white"/>
          <circle cx="15" cy="10" r="1" fill="white"/>
        </svg>
        <svg id="bo-close-icon" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" style="display:none;">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    
    return widget;
  }

  // ========== INIT ==========
  function init() {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    const widget = createWidget();
    document.body.appendChild(widget);
    
    const toggle = document.getElementById('bo-toggle');
    const window = document.getElementById('bo-window');
    const closeBtn = document.getElementById('bo-close');
    const chatIcon = document.getElementById('bo-chat-icon');
    const closeIcon = document.getElementById('bo-close-icon');
    const input = document.getElementById('bo-input');
    const sendBtn = document.getElementById('bo-send');
    const messages = document.getElementById('bo-messages');
    const terms = document.getElementById('bo-terms');
    const typing = document.getElementById('bo-typing');
    
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
        terms.classList.add('hidden');
      }
      
      const msgEl = document.createElement('div');
      msgEl.className = `bo-msg ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'bo-bubble';
      
      if (isUser) {
        bubble.textContent = content;
      } else {
        bubble.innerHTML = parseMarkdown(content);
      }
      
      msgEl.appendChild(bubble);
      messages.appendChild(msgEl);
      messages.scrollTop = messages.scrollHeight;
    }
    
    function showTyping() { typing.classList.add('show'); }
    function hideTyping() { typing.classList.remove('show'); }
    
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
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', handleSend);
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
    
    console.log('BlackOrbit Widget loaded:', SESSION_ID);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
