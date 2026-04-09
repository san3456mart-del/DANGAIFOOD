(function () {
  const categories = {
    pizzas: { label: 'Pizzas', icon: '🍕', subtitle: 'Personal, Small o Medium' },
    perros: { label: 'Perros', icon: '🌭', subtitle: 'Calientes' },
    hamburguesas: { label: 'Hamburguesas', icon: '🍔', subtitle: 'Con papas' },
    desgranados: { label: 'Desgranados', icon: '🌽', subtitle: '' },
    sandwich: { label: 'Sandwich', icon: '🥪', subtitle: 'Con papas' },
    salchipapas: { label: 'Salchipapas', icon: '🍟', subtitle: '' },
    salvajadas: { label: 'Salvajadas', icon: '🌋', subtitle: 'Para compartir' },
    asado: { label: 'Asado', icon: '🍖', subtitle: 'Carnes Asadas' },
    infantil: { label: 'Menú Infantil', icon: '🎁', subtitle: '' },
    bebidas: { label: 'Bebidas', icon: '🥤', subtitle: 'Refrescos' }
  };

  const pizzaSizes = {
    pizzas_personal: { label: 'Pizzas Personales', shortLabel: 'Personal', subtitle: 'Pizzas 27 cm' },
    pizzas_small: { label: 'Pizzas Small', shortLabel: 'Small', subtitle: 'Pizzas 35 cm' },
    pizzas_medium: { label: 'Pizzas Medium', shortLabel: 'Medium', subtitle: 'Pizzas 40 cm' }
  };

  const additionalIngredients = [
    'jamón', 'tocineta', 'pollo desmenuzado', 'salami', 'chorizo', 'butifarra',
    'pepperoni', 'salchicha suiza', 'maíz', 'pimentón', 'cebolla', 'champiñones',
    'piña', 'bocadillo', 'papa chongo'
  ];

  const defaultExtras = [
    { id: 'ext-jamon',      name: 'Jamón',               price: 2000, category: 'Proteína'  },
    { id: 'ext-tocineta',   name: 'Tocineta',             price: 2500, category: 'Proteína'  },
    { id: 'ext-pollo',      name: 'Pollo desmenuzado',    price: 2500, category: 'Proteína'  },
    { id: 'ext-salami',     name: 'Salami',               price: 2000, category: 'Proteína'  },
    { id: 'ext-chorizo',    name: 'Chorizo',              price: 2000, category: 'Proteína'  },
    { id: 'ext-butifarra',  name: 'Butifarra',            price: 2000, category: 'Proteína'  },
    { id: 'ext-pepperoni',  name: 'Pepperoni',            price: 2000, category: 'Proteína'  },
    { id: 'ext-suiza',      name: 'Salchicha suiza',      price: 2000, category: 'Proteína'  },
    { id: 'ext-maiz',       name: 'Maíz',                 price: 1000, category: 'Vegetal'   },
    { id: 'ext-pimenton',   name: 'Pimentón',             price: 1000, category: 'Vegetal'   },
    { id: 'ext-cebolla',    name: 'Cebolla',              price: 1000, category: 'Vegetal'   },
    { id: 'ext-champis',    name: 'Champiñones',          price: 1500, category: 'Vegetal'   },
    { id: 'ext-pina',       name: 'Piña',                 price: 1000, category: 'Fruta'     },
    { id: 'ext-bocadillo',  name: 'Bocadillo',            price: 1500, category: 'Especial'  },
    { id: 'ext-papa',       name: 'Papa chongo',          price: 1500, category: 'Especial'  },
    { id: 'ext-qcosten',    name: 'Queso costeño',        price: 2000, category: 'Queso'     },
    { id: 'ext-qcheddar',   name: 'Queso cheddar',        price: 2000, category: 'Queso'     },
    { id: 'ext-qparme',     name: 'Queso parmesano',      price: 2000, category: 'Queso'     },
    { id: 'ext-extramozz',  name: 'Extra mozzarella',     price: 2000, category: 'Queso'     },
  ];

  const menuBase = [
    {
      name: 'Pizza Margarita',
      ingredients: 'Salsa, mozzarella y orégano opcional.',
      removableOptions: ['orégano'],
      prices: { pizzas_personal: 15500, pizzas_small: 26500, pizzas_medium: 39500 }
    },
    {
      name: 'Bocadillo',
      ingredients: 'Salsa, mozzarella y bocadillo.',
      removableOptions: ['bocadillo'],
      prices: { pizzas_personal: 17000, pizzas_small: 27500, pizzas_medium: 42500 }
    },
    {
      name: 'Napolitana',
      ingredients: 'Salsa, mozzarella, tomates picados, aceite de oliva y orégano al gusto.',
      removableOptions: ['tomates picados', 'aceite de oliva', 'orégano'],
      prices: { pizzas_personal: 18000, pizzas_small: 28500, pizzas_medium: 43500 }
    },
    {
      name: 'Jamón y queso',
      ingredients: 'Salsa, mozzarella y jamón.',
      removableOptions: ['jamón'],
      prices: { pizzas_personal: 18000, pizzas_small: 28500, pizzas_medium: 43500 }
    },
    {
      name: 'Salami',
      ingredients: 'Salsa, mozzarella y salami.',
      removableOptions: ['salami'],
      prices: { pizzas_personal: 18500, pizzas_small: 29000, pizzas_medium: 44000 }
    },
    {
      name: 'Hawaiana',
      ingredients: 'Salsa, mozzarella, jamón y piña.',
      removableOptions: ['jamón', 'piña'],
      prices: { pizzas_personal: 18500, pizzas_small: 29000, pizzas_medium: 44000 }
    },
    {
      name: 'Hawaiana especial',
      ingredients: 'Salsa, mozzarella, jamón, piña y queso costeño.',
      removableOptions: ['jamón', 'piña', 'queso costeño'],
      prices: { pizzas_personal: 20000, pizzas_small: 30000, pizzas_medium: 45500 }
    },
    {
      name: 'Quillera',
      ingredients: 'Salsa, mozzarella, chorizo, butifarra y salchichón cervecero.',
      removableOptions: ['chorizo', 'butifarra', 'salchichón cervecero'],
      prices: { pizzas_personal: 20000, pizzas_small: 30000, pizzas_medium: 45500 }
    },
    {
      name: 'Pollo',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado y orégano.',
      removableOptions: ['pollo desmenuzado', 'orégano'],
      prices: { pizzas_personal: 20000, pizzas_small: 30000, pizzas_medium: 45500 }
    },
    {
      name: 'Pizza RS',
      ingredients: 'Salsa, mozzarella, jamón, tocineta y maíz.',
      removableOptions: ['jamón', 'tocineta', 'maíz'],
      prices: { pizzas_personal: 20500, pizzas_small: 30500, pizzas_medium: 46000 }
    },
    {
      name: '3 Sabores',
      ingredients: 'Salsa, mozzarella, jamón, pollo desmenuzado y maíz.',
      removableOptions: ['jamón', 'pollo desmenuzado', 'maíz'],
      prices: { pizzas_personal: 20500, pizzas_small: 30500, pizzas_medium: 46000 }
    },
    {
      name: 'Pepperoni',
      ingredients: 'Salsa, mozzarella, pepperoni y orégano.',
      removableOptions: ['pepperoni', 'orégano'],
      prices: { pizzas_personal: 20500, pizzas_small: 30500, pizzas_medium: 46000 }
    },
    {
      name: 'Pizza Suiza',
      ingredients: 'Salsa, mozzarella, salchicha suiza y orégano.',
      removableOptions: ['salchicha suiza', 'orégano'],
      prices: { pizzas_personal: 20500, pizzas_small: 30500, pizzas_medium: 46000 }
    },
    {
      name: 'Vegetariana',
      ingredients: 'Salsa, mozzarella, champiñones, cebolla, pimentón, maíz y tomates picados.',
      removableOptions: ['champiñones', 'cebolla', 'pimentón', 'maíz', 'tomates picados'],
      prices: { pizzas_personal: 21000, pizzas_small: 31000, pizzas_medium: 46500 }
    },
    {
      name: 'Pizza Perro',
      ingredients: 'Salsa, mozzarella, jamón, queso costeño, papa chongo y tártara.',
      removableOptions: ['jamón', 'queso costeño', 'papa chongo', 'tártara'],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: 'Pizza Pupi',
      ingredients: 'Salsa, mozzarella, pepperoni y piña.',
      removableOptions: ['pepperoni', 'piña'],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: '4 Estaciones',
      ingredients: 'Salsa, mozzarella y 4 ingredientes de tu elección divididos en 4 partes iguales.',
      removableOptions: [],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: 'Pizza Deli',
      ingredients: 'Salsa, mozzarella, tocineta, pollo desmenuzado y piña.',
      removableOptions: ['tocineta', 'pollo desmenuzado', 'piña'],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: 'Todo Abajo',
      ingredients: 'Salsa y 2 ingredientes de tu elección bañados en mozzarella.',
      removableOptions: [],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: 'Pollo Champiñones',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado, champiñones y orégano.',
      removableOptions: ['pollo desmenuzado', 'champiñones', 'orégano'],
      prices: { pizzas_personal: 21500, pizzas_small: 31500, pizzas_medium: 47000 }
    },
    {
      name: 'Pizza Mexicana',
      ingredients: 'Salsa, mozzarella, chorizo, carne molida y picante en polvo.',
      removableOptions: ['chorizo', 'carne molida', 'picante en polvo'],
      prices: { pizzas_personal: 22000, pizzas_small: 32500, pizzas_medium: 48000 }
    },
    {
      name: 'Caprichosa',
      ingredients: 'Salsa, mozzarella, jamón, champiñones y maíz.',
      removableOptions: ['jamón', 'champiñones', 'maíz'],
      prices: { pizzas_personal: 22500, pizzas_small: 33500, pizzas_medium: 48500 }
    },
    {
      name: 'Pizza Mona',
      ingredients: 'Salsa, mozzarella, tocineta, salami y queso cheddar.',
      removableOptions: ['tocineta', 'salami', 'queso cheddar'],
      prices: { pizzas_personal: 22500, pizzas_small: 33500, pizzas_medium: 48500 }
    },
    {
      name: '3 Quesos',
      ingredients: 'Salsa, mozzarella, queso de la casa, queso parmesano, aceite de oliva y orégano.',
      removableOptions: ['queso de la casa', 'queso parmesano', 'aceite de oliva', 'orégano'],
      prices: { pizzas_personal: 23000, pizzas_small: 37500, pizzas_medium: 51000 }
    },
    {
      name: '4 Quesos',
      ingredients: 'Salsa, mozzarella, queso de la casa, queso parmesano, queso cheddar, aceite de oliva y orégano.',
      removableOptions: ['queso de la casa', 'queso parmesano', 'queso cheddar', 'aceite de oliva', 'orégano'],
      prices: { pizzas_personal: 23500, pizzas_small: 38500, pizzas_medium: 52000 }
    },
    {
      name: '5 Carnes',
      ingredients: 'Salsa, mozzarella, jamón, tocineta, salami, chorizo y butifarra.',
      removableOptions: ['jamón', 'tocineta', 'salami', 'chorizo', 'butifarra'],
      prices: { pizzas_personal: 24000, pizzas_small: 39000, pizzas_medium: 52500 }
    },
    {
      name: 'Pizza Piñua',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado, carne molida, champiñones y maíz.',
      removableOptions: ['pollo desmenuzado', 'carne molida', 'champiñones', 'maíz'],
      prices: { pizzas_personal: 24000, pizzas_small: 39000, pizzas_medium: 52500 }
    },
    {
      name: 'Pizza Dangai',
      ingredients: 'Salsa, mozzarella, jamón, tocineta, salami, carne molida, cebolla, pimentón y maíz.',
      removableOptions: ['jamón', 'tocineta', 'salami', 'carne molida', 'cebolla', 'pimentón', 'maíz'],
      prices: { pizzas_personal: 25000, pizzas_small: 40000, pizzas_medium: 53000 }
    },
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
  ];
  function deriveCosts(prices) {
    // Costo de referencia = 70% del precio (ganancia = 30%)
    return Object.fromEntries(
      Object.entries(prices).map(([key, value]) => [key, Math.round((value * 0.70) / 100) * 100])
    );
  }

  const defaultProducts = menuBase.map((item) => {
    const priceKeys = Object.keys(item.prices);
    let category = priceKeys[0];
    if (category.startsWith('pizzas_')) category = 'pizzas';

    return {
      id: crypto.randomUUID(),
      category: category,
      name: item.name,
      ingredients: item.ingredients,
      removableOptions: item.removableOptions,
      prices: item.prices,
      costs: deriveCosts(item.prices),
      stock: Object.keys(item.prices).reduce((acc, k) => { acc[k] = 12; return acc; }, {})
    };
  });

  window.RestaurantAppConfig = {
    restaurantName: 'Dangai Food',
    whatsappNumber: '573018116410',
    deliveryFee: 0,
    categories,
    pizzaSizes,
    sizes: { ...categories, ...pizzaSizes },
    additionalIngredients,
    defaultExtras,
    profitRate: 0.30,   // 30 % de la venta total
    storageKeys: {
      profile: 'restaurant_profile_v2',
      deviceId: 'restaurant_device_id_v2',
      products: 'restaurant_products_v3',
      orders: 'restaurant_orders_v2',
      users: 'restaurant_users_v2',
      settings: 'restaurant_settings_v2',
      adminSession: 'restaurant_admin_session_v2',
      lastOrderSound: 'restaurant_last_order_sound_v2',
      extras: 'restaurant_extras_v2',
      expenses: 'restaurant_expenses_v2',
      cashCounts: 'restaurant_cash_counts_v2'
    },
    defaultProducts
  };
})();
