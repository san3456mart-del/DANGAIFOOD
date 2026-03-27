(function () {
  const sizes = {
    personal: { label: 'Pizzas personales', shortLabel: 'Personal', subtitle: '27 cm' },
    small: { label: 'Pizzas small', shortLabel: 'Small', subtitle: '35 cm' },
    medium: { label: 'Pizzas medium', shortLabel: 'Medium', subtitle: '40 cm' }
  };

  const additionalIngredients = [
    'jamón', 'tocineta', 'pollo desmenuzado', 'salami', 'chorizo', 'butifarra',
    'pepperoni', 'salchicha suiza', 'maíz', 'pimentón', 'cebolla', 'champiñones',
    'piña', 'bocadillo', 'papa chongo'
  ];

  const menuBase = [
    {
      name: 'Pizza Margarita',
      ingredients: 'Salsa, mozzarella y orégano opcional.',
      removableOptions: ['orégano'],
      prices: { personal: 15500, small: 26500, medium: 39500 }
    },
    {
      name: 'Bocadillo',
      ingredients: 'Salsa, mozzarella y bocadillo.',
      removableOptions: ['bocadillo'],
      prices: { personal: 17000, small: 27500, medium: 42500 }
    },
    {
      name: 'Napolitana',
      ingredients: 'Salsa, mozzarella, tomates picados, aceite de oliva y orégano al gusto.',
      removableOptions: ['tomates picados', 'aceite de oliva', 'orégano'],
      prices: { personal: 18000, small: 28500, medium: 43500 }
    },
    {
      name: 'Jamón y queso',
      ingredients: 'Salsa, mozzarella y jamón.',
      removableOptions: ['jamón'],
      prices: { personal: 18000, small: 28500, medium: 43500 }
    },
    {
      name: 'Salami',
      ingredients: 'Salsa, mozzarella y salami.',
      removableOptions: ['salami'],
      prices: { personal: 18500, small: 29000, medium: 44000 }
    },
    {
      name: 'Hawaiana',
      ingredients: 'Salsa, mozzarella, jamón y piña.',
      removableOptions: ['jamón', 'piña'],
      prices: { personal: 18500, small: 29000, medium: 44000 }
    },
    {
      name: 'Hawaiana especial',
      ingredients: 'Salsa, mozzarella, jamón, piña y queso costeño.',
      removableOptions: ['jamón', 'piña', 'queso costeño'],
      prices: { personal: 20000, small: 30000, medium: 45500 }
    },
    {
      name: 'Quillera',
      ingredients: 'Salsa, mozzarella, chorizo, butifarra y salchichón cervecero.',
      removableOptions: ['chorizo', 'butifarra', 'salchichón cervecero'],
      prices: { personal: 20000, small: 30000, medium: 45500 }
    },
    {
      name: 'Pollo',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado y orégano.',
      removableOptions: ['pollo desmenuzado', 'orégano'],
      prices: { personal: 20000, small: 30000, medium: 45500 }
    },
    {
      name: 'Pizza RS',
      ingredients: 'Salsa, mozzarella, jamón, tocineta y maíz.',
      removableOptions: ['jamón', 'tocineta', 'maíz'],
      prices: { personal: 20500, small: 30500, medium: 46000 }
    },
    {
      name: '3 Sabores',
      ingredients: 'Salsa, mozzarella, jamón, pollo desmenuzado y maíz.',
      removableOptions: ['jamón', 'pollo desmenuzado', 'maíz'],
      prices: { personal: 20500, small: 30500, medium: 46000 }
    },
    {
      name: 'Pepperoni',
      ingredients: 'Salsa, mozzarella, pepperoni y orégano.',
      removableOptions: ['pepperoni', 'orégano'],
      prices: { personal: 20500, small: 30500, medium: 46000 }
    },
    {
      name: 'Pizza Suiza',
      ingredients: 'Salsa, mozzarella, salchicha suiza y orégano.',
      removableOptions: ['salchicha suiza', 'orégano'],
      prices: { personal: 20500, small: 30500, medium: 46000 }
    },
    {
      name: 'Vegetariana',
      ingredients: 'Salsa, mozzarella, champiñones, cebolla, pimentón, maíz y tomates picados.',
      removableOptions: ['champiñones', 'cebolla', 'pimentón', 'maíz', 'tomates picados'],
      prices: { personal: 21000, small: 31000, medium: 46500 }
    },
    {
      name: 'Pizza Perro',
      ingredients: 'Salsa, mozzarella, jamón, queso costeño, papa chongo y tártara.',
      removableOptions: ['jamón', 'queso costeño', 'papa chongo', 'tártara'],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: 'Pizza Pupi',
      ingredients: 'Salsa, mozzarella, pepperoni y piña.',
      removableOptions: ['pepperoni', 'piña'],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: '4 Estaciones',
      ingredients: 'Salsa, mozzarella y 4 ingredientes de tu elección divididos en 4 partes iguales.',
      removableOptions: [],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: 'Pizza Deli',
      ingredients: 'Salsa, mozzarella, tocineta, pollo desmenuzado y piña.',
      removableOptions: ['tocineta', 'pollo desmenuzado', 'piña'],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: 'Todo Abajo',
      ingredients: 'Salsa y 2 ingredientes de tu elección bañados en mozzarella.',
      removableOptions: [],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: 'Pollo Champiñones',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado, champiñones y orégano.',
      removableOptions: ['pollo desmenuzado', 'champiñones', 'orégano'],
      prices: { personal: 21500, small: 31500, medium: 47000 }
    },
    {
      name: 'Pizza Mexicana',
      ingredients: 'Salsa, mozzarella, chorizo, carne molida y picante en polvo.',
      removableOptions: ['chorizo', 'carne molida', 'picante en polvo'],
      prices: { personal: 22000, small: 32500, medium: 48000 }
    },
    {
      name: 'Caprichosa',
      ingredients: 'Salsa, mozzarella, jamón, champiñones y maíz.',
      removableOptions: ['jamón', 'champiñones', 'maíz'],
      prices: { personal: 22500, small: 33500, medium: 48500 }
    },
    {
      name: 'Pizza Mona',
      ingredients: 'Salsa, mozzarella, tocineta, salami y queso cheddar.',
      removableOptions: ['tocineta', 'salami', 'queso cheddar'],
      prices: { personal: 22500, small: 33500, medium: 48500 }
    },
    {
      name: '3 Quesos',
      ingredients: 'Salsa, mozzarella, queso de la casa, queso parmesano, aceite de oliva y orégano.',
      removableOptions: ['queso de la casa', 'queso parmesano', 'aceite de oliva', 'orégano'],
      prices: { personal: 23000, small: 37500, medium: 51000 }
    },
    {
      name: '4 Quesos',
      ingredients: 'Salsa, mozzarella, queso de la casa, queso parmesano, queso cheddar, aceite de oliva y orégano.',
      removableOptions: ['queso de la casa', 'queso parmesano', 'queso cheddar', 'aceite de oliva', 'orégano'],
      prices: { personal: 23500, small: 38500, medium: 52000 }
    },
    {
      name: '5 Carnes',
      ingredients: 'Salsa, mozzarella, jamón, tocineta, salami, chorizo y butifarra.',
      removableOptions: ['jamón', 'tocineta', 'salami', 'chorizo', 'butifarra'],
      prices: { personal: 24000, small: 39000, medium: 52500 }
    },
    {
      name: 'Pizza Piñua',
      ingredients: 'Salsa, mozzarella, pollo desmenuzado, carne molida, champiñones y maíz.',
      removableOptions: ['pollo desmenuzado', 'carne molida', 'champiñones', 'maíz'],
      prices: { personal: 24000, small: 39000, medium: 52500 }
    },
    {
      name: 'Pizza Dangai',
      ingredients: 'Salsa, mozzarella, jamón, tocineta, salami, carne molida, cebolla, pimentón y maíz.',
      removableOptions: ['jamón', 'tocineta', 'salami', 'carne molida', 'cebolla', 'pimentón', 'maíz'],
      prices: { personal: 25000, small: 40000, medium: 53000 }
    }
  ];

  function deriveCosts(prices) {
    return Object.fromEntries(
      Object.entries(prices).map(([key, value]) => [key, Math.round((value * 0.48) / 100) * 100])
    );
  }

  const defaultProducts = menuBase.map((item) => ({
    id: crypto.randomUUID(),
    category: 'pizza',
    name: item.name,
    ingredients: item.ingredients,
    removableOptions: item.removableOptions,
    prices: item.prices,
    costs: deriveCosts(item.prices),
    stock: { personal: 12, small: 12, medium: 12 }
  }));

  window.RestaurantAppConfig = {
    restaurantName: 'Dangai Food',
    whatsappNumber: '573506876430',
    deliveryFee: 5000,
    adminCredentials: {
      username: 'admin',
      password: '123456'
    },
    sizes,
    additionalIngredients,
    storageKeys: {
      profile: 'restaurant_profile_v2',
      products: 'restaurant_products_v2',
      orders: 'restaurant_orders_v2',
      users: 'restaurant_users_v2',
      adminSession: 'restaurant_admin_session_v2',
      lastOrderSound: 'restaurant_last_order_sound_v2'
    },
    defaultProducts
  };
})();
