(function() {
  'use strict';
  
  console.log('BlackOrbit Widget: Starting...');
  
  // ========== LOAD TAILWIND ==========
  function loadTailwind() {
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      console.log('BlackOrbit Widget: Loading Tailwind...');
      const script = document.createElement('script');
      script.src = 'https://cdn.tailwindcss.com';
      script.onload = function() {
        console.log('BlackOrbit Widget: Tailwind loaded!');
      };
      document.head.appendChild(script);
    } else {
      console.log('BlackOrbit Widget: Tailwind already loaded');
    }
  }
  
  // ========== CREATE SIMPLE WIDGET ==========
  function createWidget() {
    console.log('BlackOrbit Widget: Creating widget...');
    
    const widget = document.createElement('div');
    widget.id = 'blackorbit-test-widget';
    
    // Solo el botón flotante con el ícono exacto de Figma
    widget.innerHTML = `
      <div class="fixed bottom-5 right-5 z-[99999]">
        <div class="p-4 bg-sky-500 rounded-full shadow-[0px_12px_24px_0px_rgba(94,118,144,0.20)] inline-flex justify-center items-center gap-2 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
          <div class="w-4 h-4 relative overflow-hidden">
            <div class="w-3.5 h-3.5 left-[1.33px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white"></div>
            <div class="w-[0.01px] h-0 left-[5.33px] top-[8px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white"></div>
            <div class="w-[0.01px] h-0 left-[8px] top-[8px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white"></div>
            <div class="w-[0.01px] h-0 left-[10.67px] top-[8px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white"></div>
          </div>
        </div>
      </div>
    `;
    
    return widget;
  }
  
  // ========== INIT ==========
  function init() {
    console.log('BlackOrbit Widget: Initializing...');
    
    loadTailwind();
    
    // Esperar a que Tailwind cargue
    setTimeout(() => {
      const widget = createWidget();
      document.body.appendChild(widget);
      console.log('BlackOrbit Widget: Widget added to page!');
    }, 500);
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
