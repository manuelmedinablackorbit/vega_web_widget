(function() {
  'use strict';
  
  console.log('TEST WIDGET: Iniciando...');
  
  // Crear el widget INMEDIATAMENTE sin esperar nada
  function createWidget() {
    console.log('TEST WIDGET: Creando widget...');
    
    const widget = document.createElement('div');
    widget.id = 'test-widget';
    
    // Estilos inline para que funcione SIN Tailwind
    widget.innerHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; z-index: 99999;">
        <div style="width: 60px; height: 60px; background: #0EA5E9; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; color: white; font-weight: bold; font-size: 24px;">
          💬
        </div>
      </div>
    `;
    
    document.body.appendChild(widget);
    console.log('TEST WIDGET: Widget agregado al DOM!');
  }
  
  // Ejecutar INMEDIATAMENTE
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
  
  console.log('TEST WIDGET: Script cargado');
  
})();
