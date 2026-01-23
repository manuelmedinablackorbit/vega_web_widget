(function() {
  'use strict';
  
  // Get configuration from window or use defaults
  const userConfig = window.BlackOrbitConfig || {};
  
  // Widget Configuration with defaults (SIMPLIFIED - only essential variables)
  const CONFIG = {
    webhookUrl: userConfig.webhookUrl || '',
    primaryColor: userConfig.primaryColor || '#0EA5E9',
    chatTitle: userConfig.chatTitle || 'Asistente AI',
    inputPlaceholder: userConfig.inputPlaceholder || 'Escribe tu mensaje...',
    termsMessage: userConfig.termsMessage || 'Al utilizar este chat aceptas nuestra Política de Privacidad de Datos, la cual puedes consultar',
    termsLinkText: userConfig.termsLinkText || 'Aquí',
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/'
  };

  // Derived colors (automatically calculated from primaryColor)
  const secondaryColor = '#f8f9fa';
  const textColor = '#0f172a';
  const backgroundColor = '#ffffff';
  const buttonIconColor = '#ffffff';

  // Validate webhook URL
  if (!CONFIG.webhookUrl) {
    console.error('BlackOrbit Widget Error: webhookUrl is required in BlackOrbitConfig');
    return;
  }

  // Generate unique session ID that persists until page refresh
  const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // ========== MARKDOWN PARSER FUNCTION ==========
  function parseMarkdown(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Basic HTML sanitization - remove potentially dangerous tags
    const sanitize = (str) => {
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '');
    };
    
    let html = text;
    
    // Convert line breaks to <br> first (but preserve double line breaks for paragraphs)
    html = html.replace(/\r\n/g, '\n');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs if we have paragraph breaks
    if (html.includes('</p><p>')) {
      html = '<p>' + html + '</p>';
    }
    
    // Headers (must come before bold to avoid conflicts)
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Bold text (** or __)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Inline code (single backticks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Code blocks (triple backticks)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Images FIRST (before links to avoid conflict) - ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0;" />');
    
    // Links [text](url) - process after images
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Blockquotes
    html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Unordered lists
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    
    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> tags in <ul> or <ol>
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, function(match) {
      // Check if this was originally a numbered list
      const originalText = text.substring(text.indexOf(match.replace(/<[^>]*>/g, '').trim()));
      if (/^\d+\./.test(originalText)) {
        return '<ol>' + match + '</ol>';
      } else {
        return '<ul>' + match + '</ul>';
      }
    });
    
    // Auto-link URLs (simple version that won't conflict with existing links)
    html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    
    return sanitize(html);
  }

  // Create and inject CSS - FIGMA DESIGN (Tailwind converted to CSS)
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    #n8n-chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: 'Poppins', sans-serif;
    }
    
    /* Toggle Button - bg-sky-500 rounded-full p-4 */
    #n8n-chat-toggle {
      width: 56px;
      height: 56px;
      background: ${CONFIG.primaryColor};
      border-radius: 9999px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 24px rgba(94,118,144,0.2);
      transition: all 0.3s ease;
      border: none;
      outline: none;
      padding: 16px;
    }
    
    #n8n-chat-toggle:hover {
      transform: scale(1.05);
      box-shadow: 0 16px 32px rgba(94,118,144,0.3);
    }
    
    /* Chat Window - w-80 h-[500px] bg-white rounded-2xl shadow border border-slate-200 */
    #n8n-chat-window {
      position: absolute;
      bottom: 76px;
      right: 0;
      width: 320px;
      height: 500px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 12px 24px rgba(94,118,144,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    
    /* Header - pl-4 pr-3 py-3 flex items-center gap-2 */
    #n8n-chat-header {
      background: #ffffff;
      padding: 12px 16px 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    /* Header Left - flex-1 flex items-center gap-2 */
    #n8n-header-left {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Chat Title - text-slate-950 text-sm font-semibold leading-6 */
    #n8n-chat-title {
      color: #0f172a;
      font-size: 14px;
      font-weight: 600;
      line-height: 24px;
    }
    
    /* Status Dot - w-2 h-2 bg-green-500 rounded-full */
    #n8n-status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 9999px;
    }
    
    /* Header Right - flex items-center gap-2 */
    #n8n-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Theme Toggle - w-10 p-0.5 bg-slate-200 rounded-full */
    #n8n-theme-toggle {
      width: 40px;
      height: 20px;
      padding: 2px;
      background: #e2e8f0;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background 0.2s ease;
    }
    
    /* Theme Circle - w-5 h-5 bg-white rounded-full */
    #n8n-theme-circle {
      width: 20px;
      height: 20px;
      background: #ffffff;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    
    /* Close Button - w-8 h-8 px-2 py-[5px] rounded-lg */
    #n8n-close-btn {
      width: 32px;
      height: 32px;
      padding: 8px 8px 5px;
      background: none;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    
    #n8n-close-btn:hover {
      background: #f1f5f9;
    }
    
    /* Messages Wrapper - flex-1 flex */
    #n8n-messages-wrapper {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    
    /* Messages Container - flex-1 p-3 bg-white overflow-y-auto */
    #n8n-messages {
      flex: 1;
      padding: 12px;
      background: #ffffff;
      overflow-y: auto;
      position: relative;
    }
    
    /* Scrollbar - p-1 bg-white flex flex-col gap-2 */
    #n8n-scrollbar {
      padding: 4px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      gap: 8px;
    }
    
    /* Scrollbar Track - w-1.5 flex-1 bg-slate-200 rounded-full */
    #n8n-scrollbar-track {
      width: 6px;
      flex: 1;
      background: #e2e8f0;
      border-radius: 9999px;
    }
    
    /* Terms Banner */
    #n8n-terms-banner {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 80px 0 20px 0;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    
    #n8n-terms-banner svg {
      margin-bottom: 12px;
      opacity: 0.6;
    }
    
    #n8n-terms-banner p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
    
    #n8n-terms-banner a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #n8n-terms-banner a:hover {
      text-decoration: underline;
    }
    
    #n8n-messages.has-messages #n8n-terms-banner {
      display: none;
    }
    
    /* Input Area - p-3 flex flex-col gap-3 */
    #n8n-input-area {
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 12px;
      background: #ffffff;
    }
    
    /* Input Container - w-full flex items-center gap-2 */
    #n8n-input-container {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Input Wrapper - flex-1 h-10 p-2 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2 */
    #n8n-input-wrapper {
      flex: 1;
      height: 40px;
      padding: 8px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }
    
    /* Message Input - flex-1 text-slate-500 text-sm bg-transparent */
    #n8n-message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: #64748b;
      font-size: 14px;
      font-family: 'Poppins', sans-serif;
      line-height: 24px;
    }
    
    #n8n-message-input::placeholder {
      color: #94a3b8;
    }
    
    #n8n-input-wrapper:focus-within {
      border-color: ${CONFIG.primaryColor};
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
    
    /* Attachment Icon - w-4 h-4 text-slate-500 */
    #n8n-attachment-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    
    /* Send Button - w-10 h-10 p-2 bg-sky-500 rounded-lg */
    #n8n-send-btn {
      width: 40px;
      height: 40px;
      padding: 8px;
      background: ${CONFIG.primaryColor};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-center: center;
      gap: 8px;
      overflow: hidden;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    #n8n-send-btn:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
    
    #n8n-typing {
      padding: 8px 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: none;
      font-size: 12px;
      color: #64748b;
    }
    
    #n8n-powered-by {
      padding: 8px 16px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    
    #n8n-powered-by a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #n8n-powered-by a:hover {
      text-decoration: underline;
    }
    
    /* Messages */
    .n8n-message {
      margin-bottom: 12px;
      display: flex;
    }
    
    .n8n-message.user {
      justify-content: flex-end;
    }
    
    .n8n-message-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    
    .n8n-message.user .n8n-message-bubble {
      background: ${CONFIG.primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .n8n-message.bot .n8n-message-bubble {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    
    /* Markdown Styling */
    .n8n-message-bubble h1,
    .n8n-message-bubble h2,
    .n8n-message-bubble h3 {
      margin: 8px 0 4px 0;
      line-height: 1.2;
      font-weight: 600;
    }
    
    .n8n-message-bubble h1 { font-size: 18px; }
    .n8n-message-bubble h2 { font-size: 16px; }
    .n8n-message-bubble h3 { font-size: 14px; }
    .n8n-message-bubble p { margin: 8px 0; }
    .n8n-message-bubble strong { font-weight: 600; }
    .n8n-message-bubble em { font-style: italic; }
    
    .n8n-message-bubble code {
      background: rgba(0,0,0,0.05);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
    }
    
    .n8n-message.user .n8n-message-bubble code {
      background: rgba(255,255,255,0.2);
    }
    
    .n8n-message-bubble pre {
      background: rgba(0,0,0,0.05);
      padding: 8px;
      border-radius: 6px;
      margin: 8px 0;
      overflow-x: auto;
    }
    
    .n8n-message.user .n8n-message-bubble pre {
      background: rgba(255,255,255,0.2);
    }
    
    .n8n-message-bubble pre code {
      background: none;
      padding: 0;
      font-size: 12px;
      display: block;
      white-space: pre;
    }
    
    .n8n-message-bubble blockquote {
      border-left: 3px solid #ddd;
      padding-left: 12px;
      margin: 8px 0;
      font-style: italic;
      opacity: 0.8;
    }
    
    .n8n-message.user .n8n-message-bubble blockquote {
      border-left-color: rgba(255,255,255,0.4);
    }
    
    .n8n-message-bubble ul,
    .n8n-message-bubble ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .n8n-message-bubble li {
      margin: 4px 0;
    }
    
    .n8n-message-bubble a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.8;
    }
    
    .n8n-message-bubble a:hover {
      opacity: 1;
    }
    
    .n8n-message-bubble img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 4px 0;
      display: block;
    }
    
    .n8n-typing-dots {
      display: flex;
      gap: 2px;
      align-items: center;
    }
    
    .n8n-typing-dots div {
      width: 4px;
      height: 4px;
      background: #64748b;
      border-radius: 50%;
      animation: n8n-typing 1.4s infinite ease-in-out;
    }
    
    .n8n-typing-dots div:nth-child(1) { animation-delay: -0.32s; }
    .n8n-typing-dots div:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes n8n-typing {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    
    #n8n-messages::-webkit-scrollbar { width: 6px; }
    #n8n-messages::-webkit-scrollbar-track { background: transparent; }
    #n8n-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
    #n8n-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
    
    @media (max-width: 1200px) {
      #n8n-chat-window {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        border-radius: 0 !important;
        border: none !important;
      }
      
      #n8n-chat-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-top: calc(env(safe-area-inset-top) + 12px) !important;
      }
      
      #n8n-input-area {
        position: fixed !important;
        bottom: calc(32px + env(safe-area-inset-bottom)) !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-bottom: 12px !important;
      }
      
      #n8n-powered-by {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-bottom: calc(env(safe-area-inset-bottom) + 8px) !important;
      }
      
      #n8n-messages-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        padding-top: calc(60px + env(safe-area-inset-top)) !important;
        padding-bottom: calc(120px + env(safe-area-inset-bottom)) !important;
      }
      
      #n8n-messages {
        padding: 12px 16px !important;
      }
      
      #n8n-typing {
        position: fixed !important;
        bottom: calc(104px + env(safe-area-inset-bottom)) !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1001 !important;
      }
    }
  `;

  // Create widget HTML - FIGMA DESIGN
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'n8n-chat-widget';
    
    widget.innerHTML = `
      <div id="n8n-chat-toggle">
        <svg id="n8n-chat-icon" width="20" height="20" fill="${buttonIconColor}" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <circle cx="9" cy="10" r="1" fill="${buttonIconColor}"/>
          <circle cx="12" cy="10" r="1" fill="${buttonIconColor}"/>
          <circle cx="15" cy="10" r="1" fill="${buttonIconColor}"/>
        </svg>
        <svg id="n8n-close-icon" width="20" height="20" fill="${buttonIconColor}" viewBox="0 0 24 24" style="display: none;">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      
      <div id="n8n-chat-window">
        <div id="n8n-chat-header">
          <div id="n8n-header-left">
            <span id="n8n-chat-title">${CONFIG.chatTitle}</span>
            <div id="n8n-status-dot"></div>
          </div>
          <div id="n8n-header-right">
            <button id="n8n-theme-toggle" type="button">
              <div id="n8n-theme-circle">
                <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24" stroke-width="1.33">
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
            </button>
            <button id="n8n-close-btn" type="button">
              <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24" stroke-width="1.33">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div id="n8n-messages-wrapper">
          <div id="n8n-messages">
            <div id="n8n-terms-banner">
              <svg width="24" height="24" fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" rel="noopener noreferrer">${CONFIG.termsLinkText}</a></p>
            </div>
          </div>
          <div id="n8n-scrollbar">
            <div id="n8n-scrollbar-track"></div>
          </div>
        </div>
        
        <div id="n8n-input-area">
          <div id="n8n-input-container">
            <div id="n8n-input-wrapper">
              <input type="text" id="n8n-message-input" placeholder="${CONFIG.inputPlaceholder}" />
              <svg id="n8n-attachment-icon" fill="none" stroke="#64748b" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </div>
            <button type="button" id="n8n-send-btn">
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="1.33">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div id="n8n-typing">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="n8n-typing-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
            Assistant is typing...
          </div>
        </div>
        
        <div id="n8n-powered-by">
          Powered by <a href="https://blackorbitai.com/" target="_blank">BlackOrbitAI</a>
        </div>
      </div>
    `;
    
    return widget;
  }

  // Widget functionality
  function initWidget() {
    // Inject CSS
    const styleSheet = document.createElement('style');
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
    
    // Create and append widget
    const widget = createWidget();
    document.body.appendChild(widget);
    
    // Get elements
    const chatToggle = document.getElementById('n8n-chat-toggle');
    const chatWindow = document.getElementById('n8n-chat-window');
    const chatIcon = document.getElementById('n8n-chat-icon');
    const closeIcon = document.getElementById('n8n-close-icon');
    const closeBtn = document.getElementById('n8n-close-btn');
    const messageInput = document.getElementById('n8n-message-input');
    const sendBtn = document.getElementById('n8n-send-btn');
    const messagesContainer = document.getElementById('n8n-messages');
    const typingIndicator = document.getElementById('n8n-typing');
    
    let isOpen = false;
    let hasMessages = false;
    let whatsAppIsClicked = 'no';
    
    // Toggle chat window
    function toggleChat() {
      isOpen = !isOpen;
      
      if (isOpen) {
        chatWindow.style.display = 'flex';
        chatIcon.style.display = 'none';
        closeIcon.style.display = 'block';
        if (window.innerWidth <= 1200) {
          document.body.style.overflow = 'hidden';
        }
        setTimeout(() => {
          messageInput.focus();
          scrollToBottom();
        }, 100);
      } else {
        chatWindow.style.display = 'none';
        chatIcon.style.display = 'block';
        closeIcon.style.display = 'none';
        document.body.style.overflow = '';
      }
    }
    
    // Add message to chat with markdown support
    function addMessage(content, isUser = false) {
      // Mark that we have messages and hide the banner
      if (!hasMessages) {
        hasMessages = true;
        messagesContainer.classList.add('has-messages');
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = `n8n-message ${isUser ? 'user' : 'bot'}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'n8n-message-bubble';
      
      if (isUser) {
        // User messages stay as plain text
        bubble.textContent = content;
      } else {
        // Bot messages get markdown parsing
        bubble.innerHTML = parseMarkdown(content);
      }
      
      messageEl.appendChild(bubble);
      messagesContainer.appendChild(messageEl);
      scrollToBottom();
    }
    
    // Scroll to bottom
    function scrollToBottom() {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
    
    // Show typing indicator
    function showTyping() {
      typingIndicator.style.display = 'block';
      scrollToBottom();
    }
    
    // Hide typing indicator
    function hideTyping() {
      typingIndicator.style.display = 'none';
    }
    
    // Send message to n8n webhook
    async function sendMessage(message) {
      console.log('Sending message:', message);
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
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const reply = await response.text();
          console.log('Reply received:', reply);
          if (reply && reply.trim()) {
            addMessage(reply.trim(), false);
          } else {
            addMessage('Received empty response from server.', false);
          }
        } else {
          console.error('HTTP Error:', response.status, response.statusText);
          addMessage(`Server error (${response.status}): ${response.statusText}`, false);
        }
      } catch (error) {
        hideTyping();
        console.error('Network error:', error);
        addMessage(`Connection error: ${error.message}. Check console for details.`, false);
      }
    }

    // Send WhatsApp click tracking to webhook
    async function sendWhatsAppClickTracking(url) {
      console.log('Sending WhatsApp click tracking for:', url);
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
        console.log('WhatsApp click tracking sent successfully');
      } catch (error) {
        console.error('Failed to send WhatsApp click tracking:', error);
      }
    }
    
    // Handle send message
    function handleSendMessage() {
      const message = messageInput.value.trim();
      console.log('Handling send message:', message);
      if (message) {
        addMessage(message, true);
        messageInput.value = '';
        sendMessage(message);
      }
    }
    
    // Event listeners
    chatToggle.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Toggle clicked');
      toggleChat();
    });
    
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Close clicked');
      toggleChat();
    });
    
    sendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Send button clicked');
      handleSendMessage();
    });
    
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('Enter pressed');
        // Blur the input first to close mobile keyboard
        messageInput.blur();
        setTimeout(() => {
          handleSendMessage();
        }, 50);
      }
    });
    
    // Mobile keyboard handling
    messageInput.addEventListener('focus', function() {
      if (window.innerWidth <= 1200) {
        setTimeout(scrollToBottom, 300);
      }
    });

    // WhatsApp link click tracking
    messagesContainer.addEventListener('click', function(e) {
      // Check if the clicked element is a link or inside a link
      let target = e.target;
      
      // Traverse up to find if we clicked on or inside an anchor tag
      while (target && target !== messagesContainer) {
        if (target.tagName === 'A') {
          const href = target.href;
          console.log('Link clicked:', href);
          
          // Check if it's a wa.me link
          if (href && href.includes('wa.me/')) {
            console.log('WhatsApp link detected! Sending tracking...');
            whatsAppIsClicked = 'yes';
            // Immediately send tracking to webhook
            sendWhatsAppClickTracking(href);
            // Let the link open normally
          }
          break;
        }
        target = target.parentElement;
      }
    });
    
    console.log('BlackOrbit Chat Widget initialized with session ID:', SESSION_ID);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
