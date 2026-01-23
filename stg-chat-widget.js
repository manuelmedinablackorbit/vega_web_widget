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

  // Create and inject CSS
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    #n8n-chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #n8n-chat-toggle {
      width: 56px;
      height: 56px;
      background: ${CONFIG.primaryColor};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 24px rgba(94, 118, 144, 0.2);
      transition: all 0.3s ease;
      border: none;
      outline: none;
    }
    
    #n8n-chat-toggle:hover {
      transform: scale(1.05);
      box-shadow: 0 16px 32px rgba(94, 118, 144, 0.25);
    }
    
    #n8n-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 320px;
      height: 500px;
      background: ${backgroundColor};
      border-radius: 16px;
      box-shadow: 0 12px 24px rgba(94, 118, 144, 0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    
    #n8n-chat-header {
      background: ${backgroundColor};
      color: ${textColor};
      padding: 12px 12px 12px 16px;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 1001;
      border-bottom: 1px solid #e2e8f0;
    }
    
    #n8n-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    #n8n-status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
    }
    
    #n8n-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    #n8n-theme-toggle {
      width: 40px;
      height: 20px;
      background: #e2e8f0;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      transition: background 0.2s ease;
      position: relative;
    }
    
    #n8n-theme-toggle-circle {
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    
    #n8n-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background 0.2s ease;
    }
    
    #n8n-close-btn:hover {
      background: #f1f5f9;
    }
    
    #n8n-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      background: ${backgroundColor};
      position: relative;
    }
    
    /* Terms Banner Styles */
    #n8n-terms-banner {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
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
      color: ${textColor};
      font-size: 13px;
      line-height: 1.5;
    }
    
    #n8n-terms-banner a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: border-bottom 0.2s ease;
    }
    
    #n8n-terms-banner a:hover {
      border-bottom: 1px solid ${CONFIG.primaryColor};
    }
    
    #n8n-messages.has-messages #n8n-terms-banner {
      display: none;
    }
    
    #n8n-input-area {
      padding: 12px;
      border-top: none;
      background: ${backgroundColor};
      position: relative;
      z-index: 1001;
    }
    
    #n8n-input-container {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    #n8n-message-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      outline: none;
      font-size: 14px;
      background: #f8fafc;
      color: ${textColor};
      font-family: 'Poppins', sans-serif;
      -webkit-appearance: none;
      height: 40px;
      transition: all 0.2s ease;
    }
    
    #n8n-message-input::placeholder {
      color: #94a3b8;
    }
    
    #n8n-message-input:focus {
      border-color: ${CONFIG.primaryColor};
      background: ${backgroundColor};
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
    
    #n8n-attachment-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background 0.2s ease;
    }
    
    #n8n-attachment-btn:hover {
      background: #f1f5f9;
    }
    
    #n8n-send-btn {
      background: ${CONFIG.primaryColor};
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    #n8n-send-btn:hover {
      transform: scale(1.05);
      opacity: 0.9;
    }
    
    #n8n-typing {
      padding: 8px 16px;
      background: ${backgroundColor};
      border-top: 1px solid #e2e8f0;
      display: none;
      font-size: 12px;
      color: #64748b;
    }
    
    #n8n-powered-by {
      padding: 8px 16px;
      background: ${backgroundColor};
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      position: relative;
      z-index: 1001;
    }
    
    #n8n-powered-by a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
      font-weight: 500;
    }
    
    #n8n-powered-by a:hover {
      text-decoration: underline;
    }
    
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
      color: ${textColor};
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    
    /* ========== MARKDOWN STYLING ========== */
    .n8n-message-bubble h1,
    .n8n-message-bubble h2,
    .n8n-message-bubble h3 {
      margin: 8px 0 4px 0;
      line-height: 1.2;
    }
    
    .n8n-message-bubble h1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .n8n-message-bubble h2 {
      font-size: 16px;
      font-weight: 600;
    }
    
    .n8n-message-bubble h3 {
      font-size: 14px;
      font-weight: 600;
    }
    
    .n8n-message-bubble p {
      margin: 8px 0;
      line-height: 1.5;
    }
    
    .n8n-message-bubble strong {
      font-weight: 600;
    }
    
    .n8n-message-bubble em {
      font-style: italic;
    }
    
    .n8n-message-bubble code {
      background: rgba(0,0,0,0.05);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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
      line-height: 1.5;
    }
    
    .n8n-message-bubble a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.8;
    }
    
    .n8n-message-bubble a:hover {
      opacity: 1;
    }
    
    /* Image styling */
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
    
    #n8n-messages::-webkit-scrollbar {
      width: 6px;
    }
    
    #n8n-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    
    #n8n-messages::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 3px;
    }
    
    #n8n-messages::-webkit-scrollbar-thumb:hover {
      background: #cbd5e1;
    }
    
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
        max-width: none !important;
        max-height: none !important;
        border: none !important;
        background: ${backgroundColor} !important;
      }
      
      #n8n-chat-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-top: calc(env(safe-area-inset-top) + 12px) !important;
        margin: 0 !important;
      }
      
      #n8n-input-area {
        position: fixed !important;
        bottom: calc(32px + env(safe-area-inset-bottom)) !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-bottom: 12px !important;
        margin: 0 !important;
        border-top: none !important;
      }
      
      #n8n-powered-by {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1002 !important;
        padding-bottom: calc(env(safe-area-inset-bottom) + 8px) !important;
        margin: 0 !important;
        border-top: none !important;
      }
      
      #n8n-messages {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        margin: 0 !important;
        padding: calc(60px + env(safe-area-inset-top)) 16px calc(120px + env(safe-area-inset-bottom)) 16px !important;
        height: 100vh !important;
        height: 100dvh !important;
        box-sizing: border-box !important;
      }
      
      #n8n-typing {
        position: fixed !important;
        bottom: calc(104px + env(safe-area-inset-bottom)) !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1001 !important;
        margin: 0 !important;
        border-top: none !important;
      }
    }
  `;

  // Create widget HTML
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'n8n-chat-widget';
    
    widget.innerHTML = `
      <div id="n8n-chat-toggle">
        <svg id="n8n-chat-icon" width="24" height="24" fill="${buttonIconColor}" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
        <svg id="n8n-close-icon" width="24" height="24" fill="${buttonIconColor}" viewBox="0 0 24 24" style="display: none;">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      
      <div id="n8n-chat-window">
        <div id="n8n-chat-header">
          <div id="n8n-header-left">
            <span>${CONFIG.chatTitle}</span>
            <div id="n8n-status-dot"></div>
          </div>
          <div id="n8n-header-actions">
            <button id="n8n-theme-toggle" type="button">
              <div id="n8n-theme-toggle-circle">
                <svg width="16" height="16" fill="#64748b" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                </svg>
              </div>
            </button>
            <button id="n8n-close-btn" type="button">
              <svg width="16" height="16" fill="#64748b" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div id="n8n-messages">
          <div id="n8n-terms-banner">
            <svg width="24" height="24" fill="${CONFIG.primaryColor}" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <p>${CONFIG.termsMessage} <a href="${CONFIG.termsLinkUrl}" target="_blank" rel="noopener noreferrer">${CONFIG.termsLinkText}</a></p>
          </div>
        </div>
        
        <div id="n8n-input-area">
          <div id="n8n-input-container">
            <input type="text" id="n8n-message-input" placeholder="${CONFIG.inputPlaceholder}" />
            <button type="button" id="n8n-attachment-btn">
              <svg width="16" height="16" fill="#64748b" viewBox="0 0 24 24">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
            </button>
            <button type="button" id="n8n-send-btn">
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
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
