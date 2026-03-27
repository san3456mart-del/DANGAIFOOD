(function() {
  const firebaseConfig = {
    apiKey: "AIzaSyBCRX9CTc9LRYYFJBdfoUY_cwH3lcF604Q",
    authDomain: "dangai-food.firebaseapp.com",
    projectId: "dangai-food",
    storageBucket: "dangai-food.firebasestorage.app",
    messagingSenderId: "42759109234",
    appId: "1:42759109234:web:64056ab9c358c2858de0eb"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  window.FirebaseDB = {
    syncKey: function(key) {
      db.ref(key).on('value', function(snapshot) {
        const data = snapshot.val();
        if (data !== null) {
          const newData = JSON.stringify(data);
          const currentLocal = localStorage.getItem(key);
          if (currentLocal !== newData) {
            localStorage.setItem(key, newData);
            window.dispatchEvent(new Event('storage'));
          }
        }
      });
    },
    save: function(key, value) {
      db.ref(key).set(value).catch(function(err) {
        console.error("Firebase save error:", err);
      });
    }
  };

  const keys = window.RestaurantAppConfig.storageKeys;
  // Solo sincronizamos productos y ordenes para no cruzar perfiles de usuario
  window.FirebaseDB.syncKey(keys.products);
  window.FirebaseDB.syncKey(keys.orders);
})();
