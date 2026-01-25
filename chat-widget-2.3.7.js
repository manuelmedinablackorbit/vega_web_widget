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
    termsLinkUrl: userConfig.termsLinkUrl || 'https://www.google.com/',
    darkMode: userConfig.darkMode || false
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
          bottom: 40px;
          right: 40px;
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
          bottom: 96px;
          right: 40px;
          width: 320px;
          height: 500px;
          background: white;
          box-shadow: 0 12px 24px rgba(94,118,144,0.2);
          border-radius: 16px;
          border: 1px solid #E1E8F2;
          display: none;
          flex-direction: column;
          overflow: hidden;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .bo-window.open { display: flex; }
        
        /* DARK MODE */
        .bo-window.dark {
          background: #010618;
          border-color: #18293F;
          box-shadow: 0 12px 24px rgba(11,23,45,0.2);
        }
        
        /* HEADER */
        .bo-header {
          flex-shrink: 0;
          padding: 12px 16px 12px 12px;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          display: flex;
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
          transition: color 0.3s;
        }
        .bo-window.dark .bo-title {
          color: #F9FAFC;
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
          transition: background 0.3s, justify-content 0.3s;
        }
        .bo-window.dark .bo-theme-toggle {
          background: #18293F;
          justify-content: flex-end;
        }
        .bo-theme-circle {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s;
        }
        .bo-window.dark .bo-theme-circle {
          background: #010618;
        }
        .bo-theme-icon {
          width: 16px;
          height: 16px;
        }
        .bo-theme-icon-sun {
          display: block;
        }
        .bo-theme-icon-moon {
          display: none;
        }
        .bo-window.dark .bo-theme-icon-sun {
          display: none;
        }
        .bo-window.dark .bo-theme-icon-moon {
          display: block;
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
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .bo-messages {
          height: 100%;
          padding: 12px;
          background: white;
          overflow-y: auto;
          transition: background 0.3s;
        }
        .bo-window.dark .bo-messages {
          background: #010618;
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
          flex-shrink: 0;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bo-input-container {
          width: 100%;
          display: flex;
          gap: 8px;
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
          transition: background 0.3s, border-color 0.3s;
        }
        .bo-window.dark .bo-input-wrapper {
          background: #18293F;
          border-color: #2E425A;
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
          transition: color 0.3s;
        }
        .bo-input::placeholder { 
          color: #5E7690;
          transition: color 0.3s;
        }
        .bo-input-wrapper:focus-within {
          border-color: ${CONFIG.primaryColor};
        }
        .bo-window.dark .bo-input-wrapper:focus-within {
          background: #18293F;
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
          transition: background 0.3s, border-color 0.3s, color 0.3s;
        }
        .bo-window.dark .bo-message.bot .bo-bubble {
          background: #18293F;
          border-color: #2E425A;
          color: #F9FAFC;
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
        .bo-bubble img { 
          max-width: 100%; 
          height: auto; 
          border-radius: 8px; 
          margin: 8px 0; 
          padding: 8px;
          background: white;
          border: 1px solid #E1E8F2;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.2s ease;
          display: block;
        }
        .bo-bubble img:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        .bo-window.dark .bo-bubble img {
          background: #18293F;
          border-color: #2E425A;
        }
        
        /* SCROLLBAR */
        .bo-messages::-webkit-scrollbar { width: 6px; }
        .bo-messages::-webkit-scrollbar-track { background: transparent; }
        .bo-messages::-webkit-scrollbar-thumb { 
          background: #E1E8F2; 
          border-radius: 3px;
          transition: background 0.3s;
        }
        .bo-window.dark .bo-messages::-webkit-scrollbar-thumb { 
          background: #18293F; 
        }
        .bo-messages::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .bo-window.dark .bo-messages::-webkit-scrollbar-thumb:hover { background: #2E425A; }
        
        /* IMAGE MODAL */
        .bo-image-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 100000;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .bo-image-modal.open {
          display: flex;
        }
        .bo-image-modal-content {
          max-width: 90%;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .bo-image-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .bo-image-modal-close:hover {
          background: white;
          transform: scale(1.1);
        }
        .bo-image-modal-close svg {
          width: 20px;
          height: 20px;
        }
        
        /* TYPING */
        .bo-typing {
          padding: 8px 12px;
          background: white;
          border-top: 1px solid #E1E8F2;
          display: none;
          font-size: 12px;
          color: #5E7690;
        }
        .bo-window.dark .bo-typing {
          background: #010618;
          border-top-color: #18293F;
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
        
        /* POWERED BY */
        .bo-powered {
          position: fixed;
          bottom: 68px;
          right: 216px;
          font-size: 11px;
          color: #5E7690;
          font-family: 'Poppins', sans-serif;
          z-index: 99998;
          display: none;
          align-items: center;
          gap: 4px;
        }
        .bo-window.open ~ .bo-powered {
          display: flex;
        }
        .bo-powered a {
          color: ${CONFIG.primaryColor};
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .bo-powered a:hover {
          opacity: 0.8;
        }
        
        /* MOBILE FULLSCREEN */
        @media (max-width: 1200px) {
          .bo-window {
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
            box-shadow: none !important;
          }
          
          .bo-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: white;
          }
          .bo-window.dark .bo-header {
            background: #010618;
          }
          
          .bo-messages-wrapper {
            position: fixed;
            top: 49px;
            left: 0;
            right: 0;
            bottom: 64px;
            padding-top: 0;
          }
          
          .bo-input-area {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: white;
          }
          .bo-window.dark .bo-input-area {
            background: #010618;
          }
          
          .bo-typing {
            position: fixed;
            bottom: 64px;
            left: 0;
            right: 0;
            z-index: 999;
          }
          
          .bo-powered {
            position: fixed;
            bottom: 68px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            z-index: 1001;
          }
        }
      </style>

      <!-- TOGGLE BUTTON -->
      <button class="bo-toggle" id="bo-toggle">
        <svg id="bo-icon-chat" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <g clip-path="url(#clip0_502_594)">
            <path d="M1.99465 10.8946C2.09268 11.1419 2.1145 11.4128 2.05732 11.6726L1.34732 13.866C1.32444 13.9772 1.33036 14.0924 1.3645 14.2007C1.39865 14.309 1.4599 14.4068 1.54243 14.4848C1.62497 14.5628 1.72606 14.6184 1.83612 14.6464C1.94618 14.6744 2.06156 14.6738 2.17132 14.6446L4.44665 13.9793C4.6918 13.9307 4.94567 13.9519 5.17932 14.0406C6.60291 14.7054 8.21557 14.8461 9.73275 14.4378C11.2499 14.0295 12.5742 13.0984 13.4718 11.8089C14.3694 10.5193 14.7827 8.95423 14.6389 7.38966C14.495 5.82509 13.8031 4.3616 12.6854 3.25742C11.5676 2.15324 10.0958 1.47932 8.52958 1.35456C6.96336 1.2298 5.40341 1.66221 4.12495 2.57552C2.84649 3.48882 1.93167 4.82432 1.54192 6.34638C1.15216 7.86845 1.3125 9.47926 1.99465 10.8946Z" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.33334 8H5.34001" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 8H8.00667" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10.6667 8H10.6733" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <defs>
            <clipPath id="clip0_502_594">
              <rect width="16" height="16" fill="white"/>
            </clipPath>
          </defs>
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
            <button class="bo-theme-toggle" id="bo-theme-toggle">
              <div class="bo-theme-circle">
                <!-- Sun Icon -->
                <svg class="bo-theme-icon bo-theme-icon-sun" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g clip-path="url(#clip0_502_570)">
                    <path d="M8.00001 10.6666C9.47277 10.6666 10.6667 9.47268 10.6667 7.99992C10.6667 6.52716 9.47277 5.33325 8.00001 5.33325C6.52725 5.33325 5.33334 6.52716 5.33334 7.99992C5.33334 9.47268 6.52725 10.6666 8.00001 10.6666Z" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 1.33325V2.66659" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 13.3333V14.6666" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3.28665 3.28662L4.22665 4.22662" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11.7733 11.7734L12.7133 12.7134" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M1.33334 8H2.66668" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.3333 8H14.6667" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4.22665 11.7734L3.28665 12.7134" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12.7133 3.28662L11.7733 4.22662" stroke="#8CA3BB" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_502_570">
                      <rect width="16" height="16" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                <!-- Moon Icon -->
                <svg class="bo-theme-icon bo-theme-icon-moon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 3.33325H14.6667" stroke="#40576E" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.3334 2V4.66667" stroke="#40576E" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.9901 8.32394C13.9276 9.48137 13.5312 10.5959 12.8488 11.5329C12.1664 12.4698 11.2272 13.1891 10.1447 13.6036C9.0623 14.0182 7.88294 14.1104 6.74924 13.869C5.61554 13.6276 4.57603 13.063 3.75636 12.2434C2.9367 11.4238 2.37198 10.3844 2.13047 9.25068C1.88895 8.117 1.98099 6.93764 2.39544 5.85515C2.8099 4.77266 3.52903 3.8334 4.46591 3.1509C5.40279 2.4684 6.5173 2.07188 7.67472 2.00927C7.94472 1.99461 8.08606 2.31594 7.94272 2.54461C7.46332 3.31164 7.25804 4.21852 7.36039 5.11724C7.46274 6.01596 7.86667 6.85346 8.50627 7.49306C9.14587 8.13266 9.98337 8.53659 10.8821 8.63894C11.7808 8.74129 12.6877 8.53601 13.4547 8.05661C13.6841 7.91327 14.0047 8.05394 13.9901 8.32394Z" stroke="#40576E" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </button>
            <button class="bo-close-btn" id="bo-close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12" stroke="#5E7690" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 4L12 12" stroke="#5E7690" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
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
        </div>

        <!-- INPUT -->
        <div class="bo-input-area">
          <div class="bo-input-container">
            <div class="bo-input-wrapper">
              <input type="text" class="bo-input" id="bo-input" placeholder="${CONFIG.inputPlaceholder}">
            </div>
            <button class="bo-send-btn" id="bo-send">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <g clip-path="url(#clip0_502_517)">
                  <path d="M9.69067 14.4575C9.716 14.5206 9.76003 14.5744 9.81685 14.6118C9.87368 14.6492 9.94057 14.6683 10.0086 14.6665C10.0766 14.6648 10.1424 14.6423 10.1972 14.6021C10.2521 14.5618 10.2933 14.5058 10.3153 14.4415L14.6487 1.77479C14.67 1.71571 14.6741 1.65179 14.6604 1.59049C14.6467 1.52919 14.6159 1.47305 14.5715 1.42864C14.5271 1.38423 14.4709 1.35338 14.4096 1.33971C14.3483 1.32604 14.2844 1.33012 14.2253 1.35145L1.55867 5.68479C1.49433 5.70685 1.43829 5.74806 1.39805 5.8029C1.35781 5.85774 1.33532 5.92357 1.33357 5.99156C1.33183 6.05955 1.35093 6.12645 1.38831 6.18327C1.42568 6.24009 1.47955 6.28412 1.54267 6.30945L6.82934 8.42945C6.99646 8.49636 7.1483 8.59643 7.27571 8.72361C7.40312 8.85079 7.50346 9.00245 7.57067 9.16945L9.69067 14.4575Z" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14.5693 1.4314L7.276 8.72406" stroke="white" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_502_517">
                    <rect width="16" height="16" fill="white"/>
                  </clipPath>
                </defs>
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
      
      <!-- IMAGE MODAL -->
      <div class="bo-image-modal" id="bo-image-modal">
        <button class="bo-image-modal-close" id="bo-image-modal-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <img class="bo-image-modal-content" id="bo-image-modal-img" src="" alt="">
      </div>
      
      <!-- POWERED BY -->
      <div class="bo-powered" id="bo-powered">
        Powered by <a href="https://blackorbitai.com/" target="_blank" rel="noopener noreferrer">Black Orbit</a>
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
    const themeToggle = document.getElementById('bo-theme-toggle');
    const imageModal = document.getElementById('bo-image-modal');
    const imageModalImg = document.getElementById('bo-image-modal-img');
    const imageModalClose = document.getElementById('bo-image-modal-close');
    
    let isOpen = false;
    let hasMessages = false;
    let whatsAppClicked = 'no';
    let isDark = CONFIG.darkMode;
    
    // Apply dark mode on init if enabled
    if (isDark) {
      window.classList.add('dark');
    }
    
    function toggleDarkMode() {
      isDark = !isDark;
      if (isDark) {
        window.classList.add('dark');
      } else {
        window.classList.remove('dark');
      }
    }
    
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
    themeToggle.addEventListener('click', toggleDarkMode);
    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
    
    messages.addEventListener('click', (e) => {
      let target = e.target;
      
      // Check if clicked on image
      if (target.tagName === 'IMG' && target.closest('.bo-bubble')) {
        imageModalImg.src = target.src;
        imageModal.classList.add('open');
        return;
      }
      
      // Check for WhatsApp links
      while (target && target !== messages) {
        if (target.tagName === 'A' && target.href && target.href.includes('wa.me/')) {
          whatsAppClicked = 'yes';
          trackWhatsApp(target.href);
          break;
        }
        target = target.parentElement;
      }
    });
    
    // Close image modal
    imageModalClose.addEventListener('click', () => {
      imageModal.classList.remove('open');
    });
    
    // Close modal when clicking background
    imageModal.addEventListener('click', (e) => {
      if (e.target === imageModal) {
        imageModal.classList.remove('open');
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
