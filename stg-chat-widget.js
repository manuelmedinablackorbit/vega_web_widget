// Test super básico
console.log('========================================');
console.log('WIDGET TEST: El script se está ejecutando!');
console.log('========================================');

alert('WIDGET TEST: Si ves esta alerta, el script SÍ se cargó!');

// Crear círculo visible
var div = document.createElement('div');
div.innerHTML = 'WIDGET AQUÍ';
div.style.position = 'fixed';
div.style.bottom = '20px';
div.style.right = '20px';
div.style.width = '100px';
div.style.height = '100px';
div.style.background = 'red';
div.style.color = 'white';
div.style.display = 'flex';
div.style.alignItems = 'center';
div.style.justifyContent = 'center';
div.style.zIndex = '999999';
div.style.fontSize = '12px';
div.style.fontWeight = 'bold';

document.body.appendChild(div);

console.log('WIDGET TEST: Cuadrado rojo agregado!');
