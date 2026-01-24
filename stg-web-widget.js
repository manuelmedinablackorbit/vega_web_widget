(function() {
  'use strict';
  
  // Get configuration from window or use defaults
  const userConfig = window.BlackOrbitConfig || {};
  
  // Widget Configuration
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    primaryColor: userConfig.primaryColor || '#0EA5E9',
    chatTitle: userConfig.chatTitle || 'Asistente AI',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  // Validate webhook URL
  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Widget Error: webhookUrl is required in BlackOrbitConfig');
    return;
  }

  // Generate unique session ID
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

  // ========== LOAD DEPENDENCIES ==========
  function loadDependencies() {
    // Load Tailwind CSS
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(tailwindScript);
    }
    
    // Load Poppins Font
    if (!document.querySelector('link[href*="Poppins"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    // Custom CSS for things Tailwind can't handle
    const customCSS = `
      <style>
        #blackorbit-widget { font-family: 'Poppins', sans-serif; }
        #blackorbit-messages::-webkit-scrollbar { width: 6px; }
        #blackorbit-messages::-webkit-scrollbar-track { background: transparent; }
        #blackorbit-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
        #blackorbit-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        #blackorbit-messages.has-messages #blackorbit-terms-banner { display: none; }
        .blackorbit-typing-dot { animation: blackorbit-typing 1.4s infinite ease-in-out; }
        .blackorbit-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .blackorbit-typing-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes blackorbit-typing {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        .blackorbit-message-bubble code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; }
        .blackorbit-message-bubble pre { background: rgba(0,0,0,0.05); padding: 8px; border-radius: 6px; margin: 8px 0; overflow-x: auto; }
        .blackorbit-message-bubble pre code { background: none; padding: 0; display: block; white-space: pre; }
        .blackorbit-message-bubble ul, .blackorbit-message-bubble ol { margin: 8px 0; padding-left: 20px; }
        .blackorbit-message-bubble li { margin: 4px 0; }
        .blackorbit-message-bubble a { text-decoration: underline; opacity: 0.8; }
        .blackorbit-message-bubble a:hover { opacity: 1; }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', customCSS);
  }

  // ========== CREATE WIDGET HTML ==========
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'blackorbit-widget';
    widget.className = 'fixed bottom-5 right-5 z-[99999]';
    
    widget.innerHTML = `
      <!-- Chat Window -->
      <div id="blackorbit-chat-window" class="w-80 mb-3 hidden">
        <div class="h-[500px] bg-white rounded-2xl shadow-[0px_12px_24px_0px_rgba(94,118,144,0.20)] border border-slate-200 flex flex-col overflow-hidden">
          
          <!-- Header -->
          <div class="px-4 pr-3 py-3 flex justify-start items-center gap-2">
            <div class="flex-1 flex justify-start items-center gap-2">
              <div class="text-slate-950 text-sm font-semibold leading-6">${CONFIG.chatTitle}</div>
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            
            <!-- Theme Toggle -->
            <div class="w-10 p-0.5 bg-slate-200 rounded-full flex justify-start items-center gap-2">
              <div class="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                  <circle cx="12" cy="12" r="5.5"/>
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
            </div>
            
            <!-- Close Button -->
            <button id="blackorbit-close-btn" class="w-8 h-8 px-2 py-[5px] rounded-lg flex justify-start items-center gap-2 hover:bg-slate-100 transition-colors">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Messages Area -->
          <div class="flex-1 flex">
            <div id="blackorbit-messages" class="flex-1 p-3 bg-white overflow-y-auto">
              <!-- Terms Banner -->
              <div id="blackorbit-terms-banner" class="bg-white border border-slate-200 rounded-lg p-4 my-5 text-center">
                <svg class="w-6 h-6 mx-auto mb-3" style="color: ${CONFIG.primaryColor};" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <p class="text-slate-600 text-sm">${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" class="font-medium hover:underline" style="color: ${CONFIG.primaryColor};">${CONFIG.termsLinkText}</a></p>
              </div>
            </div>
            
            <!-- Scrollbar -->
            <div class="p-1 bg-white flex flex-col justify-center items-start gap-2">
              <div class="w-1.5 flex-1 bg-slate-200 rounded-full"></div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="p-3 flex flex-col justify-center items-center gap-3">
            <div class="w-full flex justify-start items-center gap-2">
              <div class="flex-1 h-10 p-2 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2">
                <input id="blackorbit-input" type="text" placeholder="${CONFIG.inputPlaceholder}" class="flex-1 bg-transparent text-slate-500 text-sm outline-none" />
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </div>
              <button id="blackorbit-send-btn" class="w-10 h-10 p-2 rounded-lg flex justify-center items-center hover:scale-105 transition-transform" style="background-color: ${CONFIG.primaryColor};">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Toggle Button -->
      <button id="blackorbit-toggle-btn" class="p-4 rounded-full shadow-[0px_12px_24px_0px_rgba(94,118,144,0.20)] flex justify-center items-center hover:scale-105 transition-transform" style="background-color: ${CONFIG.primaryColor};">
        <svg id="blackorbit-chat-icon" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.33">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <circle cx="9" cy="10" r="1" fill="currentColor"/>
          <circle cx="12" cy="10" r="1" fill="currentColor"/>
          <circle cx="15" cy="10" r="1" fill="currentColor"/>
        </svg>
        <svg id="blackorbit-close-icon" class="w-6 h-6 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Typing Indicator -->
      <div id="blackorbit-typing" class="hidden px-3 py-2 text-xs text-slate-500">
        <div class="flex items-center gap-2">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-slate-400 rounded-full blackorbit-typing-dot"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full blackorbit-typing-dot"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full blackorbit-typing-dot"></div>
          </div>
          <span>Escribiendo...</span>
        </div>
      </div>
    `;
    
    return widget;
  }

  // ========== INITIALIZE ==========
  function init() {
    loadDependencies();
    
    // Wait for Tailwind to load
    setTimeout(() => {
      const widget = createWidget();
      document.body.appendChild(widget);
      
      const toggleBtn = document.getElementById('blackorbit-toggle-btn');
      const chatWindow = document.getElementById('blackorbit-chat-window');
      const closeBtn = document.getElementById('blackorbit-close-btn');
      const chatIcon = document.getElementById('blackorbit-chat-icon');
      const closeIcon = document.getElementById('blackorbit-close-icon');
      const input = document.getElementById('blackorbit-input');
      const sendBtn = document.getElementById('blackorbit-send-btn');
      const messagesContainer = document.getElementById('blackorbit-messages');
      const termsBanner = document.getElementById('blackorbit-terms-banner');
      const typingIndicator = document.getElementById('blackorbit-typing');
      
      let isOpen = false;
      let hasMessages = false;
      let whatsAppClicked = 'no';
      
      function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
          chatWindow.classList.remove('hidden');
          chatIcon.classList.add('hidden');
          closeIcon.classList.remove('hidden');
          setTimeout(() => input.focus(), 100);
        } else {
          chatWindow.classList.add('hidden');
          chatIcon.classList.remove('hidden');
          closeIcon.classList.add('hidden');
        }
      }
      
      function addMessage(content, isUser = false) {
        if (!hasMessages) {
          hasMessages = true;
          messagesContainer.classList.add('has-messages');
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = `mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `max-w-[80%] px-3 py-2 rounded-xl text-sm blackorbit-message-bubble ${
          isUser 
            ? 'rounded-br-sm text-white' 
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        }`;
        
        if (isUser) {
          bubble.style.backgroundColor = CONFIG.primaryColor;
          bubble.textContent = content;
        } else {
          bubble.innerHTML = parseMarkdown(content);
        }
        
        messageEl.appendChild(bubble);
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      
      function showTyping() {
        typingIndicator.classList.remove('hidden');
      }
      
      function hideTyping() {
        typingIndicator.classList.add('hidden');
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
      
      toggleBtn.addEventListener('click', toggleChat);
      closeBtn.addEventListener('click', toggleChat);
      sendBtn.addEventListener('click', handleSend);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSend();
        }
      });
      
      messagesContainer.addEventListener('click', (e) => {
        let target = e.target;
        while (target && target !== messagesContainer) {
          if (target.tagName === 'A' && target.href && target.href.includes('wa.me/')) {
            whatsAppClicked = 'yes';
            trackWhatsApp(target.href);
            break;
          }
          target = target.parentElement;
        }
      });
      
      console.log('BlackOrbit Widget loaded:', SESSION_ID);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
