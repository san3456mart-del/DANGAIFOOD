const fs = require('fs');

let content = fs.readFileSync('data.js', 'utf8');

// Replace sizes
content = content.replace(/const sizes = \{[\s\S]*?\};/, `const sizes = {
    pizzas_personal: { label: 'Pizzas Personales', shortLabel: 'Personal', subtitle: 'Pizzas 27 cm' },
    pizzas_small: { label: 'Pizzas Small', shortLabel: 'Small', subtitle: 'Pizzas 35 cm' },
    pizzas_medium: { label: 'Pizzas Medium', shortLabel: 'Medium', subtitle: 'Pizzas 40 cm' },
    perros: { label: 'Perros', shortLabel: 'Perros', subtitle: 'Calientes' },
    hamburguesas: { label: 'Hamburguesas', shortLabel: 'Hamburguesas', subtitle: 'Con papas' },
    desgranados: { label: 'Desgranados', shortLabel: 'Desgranados', subtitle: '' },
    sandwich: { label: 'Sandwich', shortLabel: 'Sandwich', subtitle: 'Con papas' },
    salchipapas: { label: 'Salchipapas', shortLabel: 'Salchipapas', subtitle: '' },
    salvajadas: { label: 'Salvajadas', shortLabel: 'Salvajadas', subtitle: 'Para compartir' },
    asado: { label: 'Asado', shortLabel: 'Asado', subtitle: 'Carnes Asadas' },
    infantil: { label: 'Menú Infantil', shortLabel: 'Infantil', subtitle: '' },
    bebidas: { label: 'Bebidas', shortLabel: 'Bebidas', subtitle: 'Refrescos' }
  };`);

// Replace keys in pizzas
content = content.replace(/personal: (\d+), small: (\d+), medium: (\d+)/g, 'pizzas_personal: $1, pizzas_small: $2, pizzas_medium: $3');

// Add new menu categories to menuBase right before `];` of menuBase
const newItems = `,
    { name: 'Perro Sencillo', ingredients: 'Pan artesanal, salchicha, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['lechuga', 'jamón', 'salsa'], prices: { perros: 8500 } },
    { name: 'Perro Gemelo', ingredients: 'Pan artesanal, salchicha, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['lechuga', 'jamón', 'salsa'], prices: { perros: 13500 } },
    { name: 'Perro-Pollo', ingredients: 'Pan artesanal, 100gr de pollo, salchicha, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['lechuga', 'jamón', 'salsa'], prices: { perros: 13500 } },
    { name: 'Perro Suizo', ingredients: 'Pan artesanal, salchicha suiza, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['lechuga', 'jamón', 'salsa'], prices: { perros: 16000 } },
    { name: 'Perro Ranchero', ingredients: 'Pan artesanal, salchicha ranchera, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['lechuga', 'jamón', 'salsa'], prices: { perros: 18000 } },
    { name: 'Perro Italosuizo', ingredients: 'Pan artesanal, salchicha suiza, tocineta, lechuga, papita ripio, queso costeño, queso mozarella, jamón y salsa', removableOptions: ['tocineta', 'lechuga', 'jamón', 'salsa'], prices: { perros: 16000 } },

    { name: 'Hamburguesa de Pollo', ingredients: 'Pan artesanal, 160gr de pollo, jamón, mozarella, lechuga crespa, tomate y salsa de la casa (Con papita francesa)', removableOptions: ['jamón', 'lechuga crespa', 'tomate', 'salsa de la casa'], prices: { hamburguesas: 19000 } },
    { name: 'Hamburguesa de Carne', ingredients: 'Pan artesanal, 160gr de carne, jamón, mozarella, lechuga crespa, tomate y salsa de la casa (Con papita francesa)', removableOptions: ['jamón', 'lechuga crespa', 'tomate', 'salsa de la casa'], prices: { hamburguesas: 21000 } },
    { name: 'Hamburguesa Doble Carne', ingredients: 'Pan artesanal, 160gr de pollo, 160gr de carne, jamón, mozarella, lechuga crespa, tomate y salsa de la casa (Con papita francesa)', removableOptions: ['jamón', 'lechuga crespa', 'tomate', 'salsa de la casa'], prices: { hamburguesas: 24000 } },
    { name: 'Hamburguesa Dangai', ingredients: 'Pan artesanal, 160gr de pollo, 160gr de carne, jamón, tocineta, chorizo, mozarella, lechuga crespa, tomate y salsa de la casa (Con papita francesa)', removableOptions: ['jamón', 'tocineta', 'chorizo', 'lechuga crespa', 'tomate', 'salsa de la casa'], prices: { hamburguesas: 25800 } },

    { name: 'Desgranado Choributi', ingredients: 'Bollo, chorizo, butifarra, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'maiz', 'salsa'], prices: { desgranados: 19000 } },
    { name: 'Desgranado de Pollo', ingredients: 'Bollo, pollo, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['lechuga', 'maiz', 'salsa'], prices: { desgranados: 21000 } },
    { name: 'Desgranado Mixto', ingredients: 'Bollo, carne, pollo o cerdo, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['lechuga', 'maiz', 'salsa'], prices: { desgranados: 24000 } },
    { name: 'Desgranado 4 Carnes', ingredients: 'Bollo, carne, pollo o cerdo, chorizo, butifarra, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'maiz', 'salsa'], prices: { desgranados: 26500 } },
    { name: 'Desgranado Dangai (2 Personas)', ingredients: 'Bollo, carne, pollo o cerdo, chorizo, butifarra, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'maiz', 'salsa'], prices: { desgranados: 36000 } },
    { name: 'Desgranado Dangai (3 Personas)', ingredients: 'Bollo, carne, pollo o cerdo, chorizo, butifarra, lechuga, papita ripio, maiz, queso costeño, salsa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'maiz', 'salsa'], prices: { desgranados: 44000 } },

    { name: 'Sandwich Jamón y Queso', ingredients: 'Pan tipo francés, jamón, queso mozarella, tocineta, lechuga, tomate, cebolla, salsa de la casa, papitas a la francesa', removableOptions: ['jamón', 'tocineta', 'lechuga', 'tomate', 'cebolla', 'salsa de la casa'], prices: { sandwich: 15000 } },
    { name: 'Sandwich de Carne', ingredients: 'Pan tipo francés, 150gr de pollo, mozarella, tocineta, lechuga, tomate, cebolla, salsa de la casa, papitas a la francesa', removableOptions: ['tocineta', 'lechuga', 'tomate', 'cebolla', 'salsa de la casa'], prices: { sandwich: 18800 } },

    { name: 'Salchipapa Sencilla', ingredients: 'Papas a la francesa, salchicha, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 13000 } },
    { name: 'Choripapa', ingredients: 'Papas a la francesa, salchicha, chorizo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 20000 } },
    { name: 'Butipapa', ingredients: 'Papas a la francesa, salchicha, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 19000 } },
    { name: 'Choributipapa', ingredients: 'Papas a la francesa, salchicha, butifarra, chorizo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['butifarra', 'chorizo', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 18500 } },
    { name: 'Salchipapa 3 Carnes', ingredients: 'Papas a la francesa, salchicha, butifarra, chorizo, carne o pollo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['butifarra', 'chorizo', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 22500 } },
    { name: 'Salchipapa Suiza', ingredients: 'Papas a la francesa, salchicha suiza, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 21000 } },
    { name: 'Salchipollo', ingredients: 'Papas a la francesa, salchicha, pollo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 22000 } },
    { name: 'Salchipapa Ranchera', ingredients: 'Papas a la francesa, salchicha ranchera, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 23500 } },
    { name: 'Salchipapa Mixta', ingredients: 'Papas a la francesa, salchicha, carne, pollo o cerdo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 25000 } },
    { name: 'Salchipapa 4 Carnes', ingredients: 'Papas a la francesa, salchicha, butifarra, chorizo, carne, pollo, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['butifarra', 'chorizo', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salchipapas: 26500 } },

    { name: 'Salvajada 2 Personas', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 35000 } },
    { name: 'Salvajada 2 Personas Gratinada', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, salsa de la casa, queso mozarella gratinado', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 40000 } },
    { name: 'Salvajada 3 Personas', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 49000 } },
    { name: 'Salvajada 3 Personas Gratinada', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, salsa de la casa, queso mozarella gratinado', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 58000 } },
    { name: 'Salvajada Dangai 4 Personas', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 58000 } },
    { name: 'Salvajada Dangai 4 Personas Gratinada', ingredients: 'Papas a la francesa, salchicha, pollo, carne, cerdo, chorizo, butifarra, tocineta, jamon, maiz, lechuga, papita ripio, queso costeño, salsa de piña, salsa de la casa, queso mozarella gratinado', removableOptions: ['chorizo', 'butifarra', 'tocineta', 'jamon', 'maiz', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 62000 } },
    { name: 'Salvajada Dangai 5 Personas', ingredients: 'Papas a la francesa, salchicha, pollo, carne o cerdo, chorizo, butifarra, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'butifarra', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 63000 } },
    { name: 'Salvajada Dangai 5 Personas Gratinada', ingredients: 'Papas a la francesa, salchicha, pollo, carne, cerdo, chorizo, butifarra, tocineta, jamon, maiz, lechuga, papita ripio, queso costeño, salsa de piña, salsa de la casa, queso mozarella gratinado', removableOptions: ['chorizo', 'butifarra', 'tocineta', 'jamon', 'maiz', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 70000 } },
    { name: 'Mega Dangai 6 Personas', ingredients: 'Papas a la francesa, salchicha, pollo, carne, cerdo, chorizo, butifarra, tocineta, jamon, maiz, lechuga, papita ripio, queso costeño, salsa de piña, y salsa de la casa', removableOptions: ['chorizo', 'butifarra', 'tocineta', 'jamon', 'maiz', 'lechuga', 'salsa de piña', 'salsa de la casa'], prices: { salvajadas: 80000 } },

    { name: 'Para los consentidos', ingredients: 'Nuggets de pollo o pechuga con papas a la francesa o bollo, salsa de la casa y bebida infantil', removableOptions: ['salsa de la casa'], prices: { infantil: 9000 } },

    { name: 'Asado Especial', ingredients: 'Corte de carne asado, papas a la francesa, ensalada', removableOptions: ['ensalada'], prices: { asado: 25000 } },

    { name: 'Coca-Cola PET 400', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 4500 } },
    { name: 'Coca-Cola 1.5LT', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 9000 } },
    { name: 'Postobón PET 400', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 4200 } },
    { name: 'Postobón 1.5LT', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 8500 } },
    { name: 'Econo-litro', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 6500 } },
    { name: 'Jugo Hit Personal', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 4500 } },
    { name: 'Jugo Hit Litro', ingredients: 'Bebida fría', removableOptions: [], prices: { bebidas: 8500 } }
  ];`;

content = content.replace(/\s*\];\s*function deriveCosts/, newItems + '\n  function deriveCosts');

// Now, replace stock default creation
content = content.replace(/stock: \{ personal: 12, small: 12, medium: 12 \}/, "stock: Object.keys(item.prices).reduce((acc, currentKey) => { acc[currentKey] = 120; return acc; }, {})");

// Save
fs.writeFileSync('data.js', content, 'utf8');
console.log("data.js successfully updated.");
