APP HUGOLIN PIZZA PARA NETLIFY
==============================

1. Sube esta carpeta o el ZIP a Netlify.
2. Archivo principal del cliente: index.html
3. Archivo del panel admin: admin.html
4. Credenciales iniciales admin: admin / 123456
5. Para cambiar el número de WhatsApp, credenciales o el menú por defecto, edita data.js

IMPORTANTE
----------
- Esta versión queda lista para publicar como sitio estático.
- Los pedidos se guardan en el navegador usando localStorage.
- El panel admin verá los pedidos en tiempo real SI se usa en el mismo navegador/dispositivo o en equipos sincronizados por el mismo almacenamiento del navegador.
- El botón de pedido abre WhatsApp con el mensaje listo al número 573506876430.
- El envío 100% automático a WhatsApp NO puede hacerse solo con Netlify estático sin conectar una API oficial o un proveedor externo.
- Se dejaron imágenes de referencia del menú en public/menu-reference-1.jpg, menu-reference-2.jpg y menu-reference-3.jpg.

QUÉ INCLUYE
-----------
- Registro del cliente: nombre, conjunto, torre y apartamento.
- Flujo del cliente por pasos: registro -> menú -> confirmación.
- Menú separado en 3 secciones: personales (27 cm), small (35 cm) y medium (40 cm).
- 28 sabores cargados según las imágenes enviadas.
- Cada pizza con nombre, ingredientes y precio por tamaño.
- Opción de marcar ingredientes que el cliente no quiere.
- Panel admin con login.
- Estados del pedido: pendiente, preparación, en camino y entregado.
- Sonido al llegar un nuevo pedido en el panel.
- Panel de contabilidad para pedidos entregados.
- Inventario editable por sabor con stock, precio y costo por tamaño.
- El admin puede modificar nombre, ingredientes, ingredientes removibles, precios, costos y stock.
- Fondo visual con video de cocina y efectos de movimiento.

SIGUIENTE PASO RECOMENDADO
-------------------------
Para que el panel admin y los pedidos queden realmente compartidos entre varios dispositivos, conviene conectar:
- Supabase o Firebase para base de datos/autenticación.
- Meta WhatsApp Cloud API o Twilio para envío automático.
