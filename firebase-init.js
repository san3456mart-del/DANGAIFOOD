(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBCRX9CTc9LRYYFJBdfoUY_cwH3lcF604Q",
    authDomain: "dangai-food.firebaseapp.com",
    projectId: "dangai-food",
    storageBucket: "dangai-food.firebasestorage.app",
    messagingSenderId: "42759109234",
    appId: "1:42759109234:web:64056ab9c358c2858de0eb",
    databaseURL: "https://dangai-food-default-rtdb.firebaseio.com"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  window.FirebaseDB = {
    /**
     * Reads the current value of a key ONCE from Firebase (not cached).
     * Returns a Promise that resolves with the value (or null).
     */
    readOnce: function (key) {
      return db.ref(key).once('value').then(function (snap) {
        return snap.val();
      });
    },

    /**
     * Listens to a Firebase key continuously and syncs to localStorage.
     * Dispatches a 'storage' event on change so the UI can react.
     */
    syncKey: function (key) {
      db.ref(key).on('value', function (snapshot) {
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

    /**
     * Updates an object or collection partially in Firebase.
     */
    update: function (key, updates) {
      return db.ref(key).update(updates).catch(function (err) {
        console.error('Firebase update error:', err);
        throw err;
      });
    },

    /**
     * Saves a value to Firebase and returns the Promise.
     */
    save: function (key, value) {
      return db.ref(key).set(value).catch(function (err) {
        console.error('Firebase save error:', err);
        throw err;
      });
    }
  };


  const keys = window.RestaurantAppConfig.storageKeys;
  // Sincronizar todos los módulos críticos con Firebase
  window.FirebaseDB.syncKey(keys.products);
  window.FirebaseDB.syncKey(keys.orders);
  window.FirebaseDB.syncKey(keys.users);
  window.FirebaseDB.syncKey(keys.settings);
  window.FirebaseDB.syncKey(keys.extras);
  window.FirebaseDB.syncKey(keys.expenses);
  window.FirebaseDB.syncKey(keys.cashCounts);
  window.FirebaseDB.syncKey(keys.profile);
  window.FirebaseDB.syncKey('restaurant_coupons_v2');
})();
