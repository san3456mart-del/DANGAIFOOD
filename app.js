const cfg = window.RestaurantAppConfig;
const storage = cfg.storageKeys;
const sizes = cfg.sizes;

const profileForm = document.getElementById('profileForm');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const loginFormClient = document.getElementById('loginFormClient');
const editProfileBtn = document.getElementById('editProfileBtn');
const profileStatus = document.getElementById('profileStatus');
const sizeTabs = document.getElementById('sizeTabs');
const activeSizeTitle = document.getElementById('activeSizeTitle');
const activeSizeSubtitle = document.getElementById('activeSizeSubtitle');
const menuCountLabel = document.getElementById('menuCountLabel');
const menuGrid = document.getElementById('menuGrid');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const subtotalValue = document.getElementById('subtotalValue');
const deliveryValue = document.getElementById('deliveryValue');
const totalValue = document.getElementById('totalValue');
const submitOrderBtn = document.getElementById('submitOrderBtn');
const toast = document.getElementById('toast');
const notesInput = document.getElementById('orderNotes');
const goToConfirmBtn = document.getElementById('goToConfirmBtn');
const backToProfileBtn = document.getElementById('backToProfileBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const floatingCartBtn = document.getElementById('floatingCartBtn');
const floatingCartCount = document.getElementById('floatingCartCount');
const floatingCartTotal = document.getElementById('floatingCartTotal');
const floatingCartGoBtn = document.getElementById('floatingCartGoBtn');
const goToOrdersBtn = document.getElementById('goToOrdersBtn');
const historyBackBtn = document.getElementById('historyBackBtn');
const historyToMenuBtn = document.getElementById('historyToMenuBtn');
const clientOrdersList = document.getElementById('clientOrdersList');
const paymentTabs = document.querySelectorAll('.payment-tab');
const paymentDigitalSection = document.getElementById('paymentDigitalSection');
const paymentImageDisplay = document.getElementById('paymentImageDisplay');
const paymentHelperText = document.getElementById('paymentHelperText');
const clientReceiptInput = document.getElementById('clientReceiptInput');

const panels = Array.from(document.querySelectorAll('.wizard-panel'));
const indicators = Array.from(document.querySelectorAll('.wizard-step'));

let cart = [];
let currentStep = 1;
let previousStep = 2;
let activeSize = 'personal';
let paymentMethod = 'efectivo';
let paymentReceiptBase64 = null;

const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0));
const getJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  // Fire-and-forget to Firebase – never block the UI
  if (window.FirebaseDB) {
    window.FirebaseDB.save(key, value).catch(err => console.warn('Firebase sync error:', err));
  }
};
const escapeHTML = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function getDeliveryFee() {
  const settings = getJson(storage.settings, {});
  return settings.deliveryFee !== undefined ? Number(settings.deliveryFee) : Number(cfg.deliveryFee || 0);
}

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function ensureProducts() {
  const current = getJson(storage.products, []);
  if (!current.length) setJson(storage.products, cfg.defaultProducts);
}

function getProducts() {
  ensureProducts();
  return getJson(storage.products, []);
}

function setStep(step) {
  if (step === 4 && currentStep !== 4) previousStep = currentStep;
  currentStep = step;
  panels.forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
  indicators.forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle('active', indicatorStep === step);
    indicator.classList.toggle('done', indicatorStep < step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateFloatingCart();
  if (step === 4) renderOrdersHistory();
}

function updateFloatingCart() {
  if (currentStep === 2 && cart.length > 0) {
    floatingCartCount.textContent = `${cart.length} items`;
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const total = subtotal + getDeliveryFee();
    floatingCartTotal.textContent = money(total);
    floatingCartBtn.classList.remove('hidden');
  } else {
    floatingCartBtn.classList.add('hidden');
  }
}

function loadProfile() {
  const profile = getJson(storage.profile, null);
  const statusEl = document.getElementById('profileStatus');
  if (!profile) {
    if (statusEl) statusEl.textContent = 'Desconectado';
    if (editProfileBtn) editProfileBtn.classList.add('hidden');
    return false;
  }
  if (statusEl) statusEl.textContent = profile.username;
  if (editProfileBtn) editProfileBtn.classList.remove('hidden');
  return true;
}

function renderSizeTabs() {
  sizeTabs.innerHTML = Object.entries(sizes).map(([key, value]) => `
    <button type="button" class="size-tab ${activeSize === key ? 'active' : ''}" data-size-key="${key}">
      <strong>${escapeHTML(value.label)}</strong>
      <span>${escapeHTML(value.subtitle)}</span>
    </button>
  `).join('');

  sizeTabs.querySelectorAll('[data-size-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSize = btn.dataset.sizeKey;
      renderSizeTabs();
      renderMenu();
    });
  });
}

function getProductsForSize(sizeKey) {
  return getProducts().filter((product) => Number(product?.prices?.[sizeKey] || 0) > 0);
}

function renderMenu() {
  const sizeInfo = sizes[activeSize];
  const products = getProductsForSize(activeSize);
  activeSizeTitle.textContent = sizeInfo.label;
  activeSizeSubtitle.textContent = sizeInfo.subtitle;
  menuCountLabel.textContent = `${products.length} productos`;
  menuGrid.innerHTML = '';

  if (!products.length) {
    menuGrid.innerHTML = '<div class="empty-state">No hay productos configurados para este tamaño todavía.</div>';
    return;
  }

  products.forEach((product) => {
    const stock = Number(product?.stock?.[activeSize] || 0);
    const options = Array.isArray(product.removableOptions) && product.removableOptions.length
      ? `<div class="options-box"><strong>Quitar ingredientes:</strong><div>${product.removableOptions.map((item) => `
          <label class="checkbox-chip"><input type="checkbox" value="${escapeHTML(item)}" data-product-id="${product.id}" data-size-key="${activeSize}" /> Sin ${escapeHTML(item)}</label>`).join('')}</div></div>`
      : '<div class="menu-meta">Este sabor no tiene ingredientes removibles configurados.</div>';

    const card = document.createElement('article');
    card.className = 'menu-item';
    card.innerHTML = `
      <div class="rappi-menu-row">
        <div class="menu-image-placeholder">🍕</div>
        <div class="menu-details">
          <div class="pizza-size-badge">${escapeHTML(sizeInfo.shortLabel)} · ${escapeHTML(sizeInfo.subtitle)}</div>
          <h3>${escapeHTML(product.name)}</h3>
          <div class="menu-price">${money(product.prices[activeSize])}</div>
          <div class="menu-meta">${escapeHTML(product.ingredients)}</div>
          ${stock < 5 ? `<div class="menu-stock-warning">Solo quedan ${stock} disponibles</div>` : ''}
        </div>
      </div>
      ${options}
      <button class="primary-btn add-btn" data-id="${product.id}" data-size-key="${activeSize}" ${stock < 1 ? 'disabled' : ''}>${stock < 1 ? 'Agotado' : 'Añadir'}</button>
    `;
    menuGrid.appendChild(card);
  });

  menuGrid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id, btn.dataset.sizeKey));
  });
}

function addToCart(productId, sizeKey) {
  const product = getProducts().find((p) => p.id === productId);
  const sizeInfo = sizes[sizeKey];
  if (!product || !sizeInfo) return toastMessage('Producto no encontrado.');
  const stock = Number(product?.stock?.[sizeKey] || 0);
  if (stock < 1) return toastMessage('Ese sabor está agotado en ese tamaño.');

  const removed = Array.from(document.querySelectorAll(`input[data-product-id="${productId}"][data-size-key="${sizeKey}"]:checked`)).map((el) => el.value);

  cart.push({
    lineId: crypto.randomUUID(),
    productId: product.id,
    name: product.name,
    sizeKey,
    sizeLabel: `${sizeInfo.shortLabel} (${sizeInfo.subtitle})`,
    price: Number(product.prices[sizeKey] || 0),
    cost: Number(product?.costs?.[sizeKey] || 0),
    removed
  });
  renderCart();
  toastMessage(`${product.name} ${sizeInfo.shortLabel.toLowerCase()} agregada.`);
}

function removeFromCart(lineId) {
  cart = cart.filter((item) => item.lineId !== lineId);
  renderCart();
}

function renderCart() {
  if (!cart.length) {
    cartItems.className = 'cart-items empty-state';
    cartItems.textContent = 'Aún no has agregado productos.';
  } else {
    cartItems.className = 'cart-items';
    cartItems.innerHTML = cart.map((item) => `
      <div class="cart-row">
        <div class="order-header">
          <div>
            <strong>${escapeHTML(item.name)}</strong>
            <div class="menu-meta">${escapeHTML(item.sizeLabel)}</div>
          </div>
          <button class="mini-btn danger" data-remove-id="${item.lineId}">Quitar</button>
        </div>
        <div class="menu-meta">${item.removed.length ? `Sin: ${escapeHTML(item.removed.join(', '))}` : 'Sin cambios'}</div>
        <div class="order-footer"><span>${money(item.price)}</span></div>
      </div>
    `).join('');
    cartItems.querySelectorAll('[data-remove-id]').forEach((btn) => btn.addEventListener('click', () => removeFromCart(btn.dataset.removeId)));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const delivery = cart.length ? getDeliveryFee() : 0;
  const total = subtotal + delivery;
  cartCount.textContent = `${cart.length} items`;
  subtotalValue.textContent = money(subtotal);
  deliveryValue.textContent = money(delivery);
  totalValue.textContent = money(total);
  updateFloatingCart();
}

function buildWhatsappMessage(order) {
  return [
    `Hola, llegó un nuevo pedido para ${cfg.restaurantName}.`,
    `Pedido: ${order.id}`,
    `Cliente: ${order.customer.name}`,
    `Ubicación: ${order.customer.complex}, ${order.customer.tower}, apto ${order.customer.apartment}`,
    `Método de Pago: ${order.paymentMethod === 'efectivo' ? '💵 Efectivo' : (order.paymentMethod === 'qr' ? '📱 App/QR (Comprobante adjunto en el Admin Panel)' : '🔑 Bre-B (Comprobante adjunto en el Admin Panel)')}`,
    'Productos:',
    ...order.items.map((item, index) => `${index + 1}. ${item.name} - ${item.sizeLabel} - ${item.removed.length ? `Sin ${item.removed.join(', ')}` : 'Completa'} - ${money(item.price)}`),
    `Notas: ${order.notes || 'Sin notas'}`,
    `Total: ${money(order.total)}`
  ].join('\n');
}

async function submitOrder() {
  const profile = getJson(storage.profile, null);
  if (!profile) return toastMessage('Primero guarda tus datos.');
  if (!cart.length) return toastMessage('Agrega por lo menos una pizza.');
  if (paymentMethod !== 'efectivo' && !paymentReceiptBase64) {
    return toastMessage('Debes subir el comprobante de pago para continuar.');
  }

  const products = getProducts();
  const stockCheck = cart.every((line) => Number(products.find((p) => p.id === line.productId)?.stock?.[line.sizeKey] || 0) > 0);
  if (!stockCheck) return toastMessage('Hay productos agotados. Actualiza el menú.');

  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = 'Enviando...';
  
  try {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const totalCost = cart.reduce((sum, item) => sum + item.cost, 0);
    const order = {
      id: `PED-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
      customer: profile,
      items: [...cart],
      notes: notesInput.value.trim(),
      subtotal,
      deliveryFee: getDeliveryFee(),
      total: subtotal + getDeliveryFee(),
      cost: totalCost,
      estimatedProfit: subtotal - totalCost,
      paymentMethod,
      receiptBase64: paymentReceiptBase64
    };

    const orders = getJson(storage.orders, []);
    orders.unshift(order);
    await setJson(storage.orders, orders);

    const updatedProducts = products.map((product) => {
      const nextStock = { ...(product.stock || {}) };
      cart.filter((item) => item.productId === product.id).forEach((item) => {
        nextStock[item.sizeKey] = Math.max(0, Number(nextStock[item.sizeKey] || 0) - 1);
      });
      return { ...product, stock: nextStock };
    });
    await setJson(storage.products, updatedProducts);

    cart = [];
    notesInput.value = '';
    if (clientReceiptInput) clientReceiptInput.value = '';
    paymentReceiptBase64 = null;
    paymentMethod = 'efectivo';
    if (typeof updatePaymentUI === 'function') updatePaymentUI();
    
    renderCart();
    renderMenu();
    previousStep = 2;
    setStep(4);
    toastMessage(`Pedido ${order.id} guardado. Puedes seguir su estado aquí.`);
  } catch (err) {
    toastMessage('Hubo un error al guardar el pedido. Intenta nuevamente.');
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = 'Enviar pedido';
  }
}

if (tabLoginBtn && tabRegisterBtn) {
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginView.classList.remove('hidden');
    registerView.classList.add('hidden');
  });
  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerView.classList.remove('hidden');
    loginView.classList.add('hidden');
  });
}

// Read users from Firebase with a timeout fallback to localStorage
async function readUsersSafe() {
  const local = getJson(storage.users, []);
  if (!window.FirebaseDB) return local;
  try {
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 5000));
    const fbRead = window.FirebaseDB.readOnce(storage.users);
    const result = await Promise.race([fbRead, timeout]);
    if (Array.isArray(result)) {
      localStorage.setItem(storage.users, JSON.stringify(result));
      return result;
    }
  } catch (e) { console.warn('Firebase read failed, using local cache:', e); }
  return local;
}

if (loginFormClient) {
  loginFormClient.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginFormClient.querySelector('button[type="submit"]');
    const loginUser = document.getElementById('loginUser').value.trim().toLowerCase();
    const loginPass = document.getElementById('loginPass').value.trim();
    if (!loginUser || !loginPass) return toastMessage('Completa usuario y contraseña.');

    btn.disabled = true;
    btn.textContent = 'Verificando...';
    try {
      const users = await readUsersSafe();
      const user = users.find(u => u.username === loginUser && u.password === loginPass);
      if (!user) return toastMessage('Usuario o contraseña incorrectos.');
      localStorage.setItem(storage.profile, JSON.stringify(user));
      loadProfile();
      setStep(2);
      toastMessage(`Bienvenido de vuelta, ${user.name} 👋`);
    } catch (err) {
      toastMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar y ordenar';
    }
  });
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = profileForm.querySelector('button[type="submit"]');
  const regUser = document.getElementById('regUser').value.trim().toLowerCase();
  const regPass = document.getElementById('regPass').value.trim();
  if (!regUser || regPass.length < 4) return toastMessage('Completa todos los campos. Contraseña mín. 4 caracteres.');

  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    const users = await readUsersSafe();
    if (users.some(u => u.username === regUser)) {
      return toastMessage('Ese usuario ya existe. Inicia sesión.');
    }
    const profile = {
      clientId: crypto.randomUUID(),
      username: regUser,
      password: regPass,
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('regPhone')?.value.trim() || '',
      complex: document.getElementById('complex').value.trim(),
      tower: document.getElementById('tower').value.trim(),
      apartment: document.getElementById('apartment').value.trim()
    };
    users.push(profile);
    setJson(storage.users, users);  // fire-and-forget to Firebase
    localStorage.setItem(storage.profile, JSON.stringify(profile));
    loadProfile();
    setStep(2);
    toastMessage('¡Cuenta creada! 🎉');
  } catch (err) {
    toastMessage('Error al guardar. Intenta nuevamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Registrarme y ordenar';
  }
});

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', () => {
    localStorage.removeItem(storage.profile);
    setStep(1);
    toastMessage('Sesión cerrada.');
    loadProfile();
  });
}

goToConfirmBtn.addEventListener('click', () => {
  if (!getJson(storage.profile, null)) return toastMessage('Primero guarda tus datos.');
  if (!cart.length) return toastMessage('Agrega por lo menos una pizza antes de continuar.');
  setStep(3);
});

if (floatingCartGoBtn) {
  floatingCartGoBtn.addEventListener('click', () => {
    if (!getJson(storage.profile, null)) return toastMessage('Primero guarda tus datos.');
    if (!cart.length) return toastMessage('Agrega por lo menos una pizza antes de continuar.');
    setStep(3);
  });
}

if (goToOrdersBtn) {
  goToOrdersBtn.addEventListener('click', () => {
    const profile = getJson(storage.profile, null);
    if (!profile || !profile.clientId) return toastMessage('Primero guarda tus datos para ver pedidos.');
    setStep(4);
  });
}

if (historyBackBtn) historyBackBtn.addEventListener('click', () => setStep(previousStep || 2));
if (historyToMenuBtn) historyToMenuBtn.addEventListener('click', () => setStep(2));
backToProfileBtn.addEventListener('click', () => setStep(1));
backToMenuBtn.addEventListener('click', () => setStep(2));
submitOrderBtn.addEventListener('click', submitOrder);
window.addEventListener('storage', () => {
  renderSizeTabs();
  renderMenu();
  renderCart();
  renderOrdersHistory();
});

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => resolve(r.result);
    r.onerror = (e) => reject(e);
  });
}

function updatePaymentUI() {
  if (!paymentTabs || !paymentDigitalSection) return;
  paymentTabs.forEach(btn => {
    const isActive = btn.dataset.method === paymentMethod;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text)';
    }
  });

  if (paymentMethod === 'efectivo') {
    paymentDigitalSection.classList.add('hidden');
    if (clientReceiptInput) clientReceiptInput.value = '';
    paymentReceiptBase64 = null;
  } else {
    paymentDigitalSection.classList.remove('hidden');
    const settings = getJson(storage.settings, {});
    const totalVal = document.getElementById('totalValue')?.textContent || '';
    if (paymentMethod === 'qr') {
      paymentImageDisplay.src = settings.qrImage || '';
      paymentImageDisplay.style.display = settings.qrImage ? 'block' : 'none';
      paymentHelperText.textContent = 'Envía el comprobante escaneando este código bancario.';
    } else if (paymentMethod === 'breb') {
      paymentImageDisplay.src = settings.brebImage || '';
      paymentImageDisplay.style.display = settings.brebImage ? 'block' : 'none';
      paymentHelperText.textContent = 'Abre tu app bancaria y paga ingresando a la Llave Bre-B mostrada arriba.';
    }
  }
}

if (paymentTabs) {
  paymentTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentMethod = btn.dataset.method;
      updatePaymentUI();
    });
  });
}

if (clientReceiptInput) {
  clientReceiptInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      try {
        paymentReceiptBase64 = await toBase64(e.target.files[0]);
      } catch (err) {
        toastMessage('Error leyendo comprobante.');
      }
    } else {
      paymentReceiptBase64 = null;
    }
  });
}

ensureProducts();
const hasProfile = loadProfile();
updatePaymentUI();

window.submitReview = (orderId) => {
  const text = document.getElementById(`reviewText-${orderId}`).value.trim();
  const box = document.getElementById(`ratingBox-${orderId}`);
  const activeStar = box.querySelector('.star-btn.selected');
  if (!activeStar) return toastMessage('Por favor selecciona las estrellas.');
  
  const rating = Number(activeStar.dataset.val);
  const orders = getJson(storage.orders, []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    orders[idx].rating = rating;
    orders[idx].review = text;
    setJson(storage.orders, orders);
    renderOrdersHistory();
    toastMessage('¡Gracias por tu reseña!');
  }
};

function renderOrdersHistory() {
  if (!clientOrdersList) return;
  const profile = getJson(storage.profile, null);
  if (!profile || !profile.clientId) return;

  const allOrders = getJson(storage.orders, []);
  const myOrders = allOrders.filter(o => o.customer && o.customer.clientId === profile.clientId);

  if (!myOrders.length) {
    clientOrdersList.innerHTML = '<div class="empty-state">No tienes pedidos recientes.</div>';
    return;
  }

  window.openWhatsappForOrder = (orderId) => {
    const orders = getJson(storage.orders, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const url = `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
    window.open(url, '_blank');
  };

  clientOrdersList.innerHTML = myOrders.map(order => {
    let trackingHTML = '';
    
    if (order.status !== 'entregado') {
      const steps = ['pendiente', 'preparacion', 'encamino'];
      const labels = ['Pendiente', 'Preparación', 'En camino'];
      let currentIndex = steps.indexOf(order.status);
      if (currentIndex === -1) currentIndex = 0;
      
      trackingHTML = `
        <div class="tracker-steps">
          ${steps.map((step, idx) => `
            <div class="tracker-step ${currentIndex >= idx ? 'active' : ''}">
              <div class="tracker-dot"></div>
              <span>${labels[idx]}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 16px; display:flex; justify-content:center;">
          <button class="primary-btn" style="background:#25D366; border-color:#25D366;" onclick="window.openWhatsappForOrder('${order.id}')">Escríbenos por WhatsApp</button>
        </div>
      `;
    } else {
      trackingHTML = `
        <div class="tracker-delivered">
          <strong>¡Pedido Entregado!</strong>
          ${!order.rating ? `
          <div class="rating-box" id="ratingBox-${order.id}">
            <p>¿Qué tal te pareció?</p>
            <div class="stars">
              <button type="button" class="star-btn" data-id="${order.id}" data-val="1">★</button>
              <button type="button" class="star-btn" data-id="${order.id}" data-val="2">★</button>
              <button type="button" class="star-btn" data-id="${order.id}" data-val="3">★</button>
              <button type="button" class="star-btn" data-id="${order.id}" data-val="4">★</button>
              <button type="button" class="star-btn" data-id="${order.id}" data-val="5">★</button>
            </div>
            <textarea id="reviewText-${order.id}" placeholder="Deja una observación..." rows="2"></textarea>
            <button type="button" class="primary-btn mt-2" onclick="submitReview('${order.id}')">Enviar calificación</button>
          </div>
          ` : `
          <div class="rating-done">
            <p>Calificación: <span style="color:var(--warning)">${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)}</span></p>
            ${order.review ? `<p class="menu-meta">"${escapeHTML(order.review)}"</p>` : ''}
          </div>
          `}
        </div>
      `;
    }

    let paymentNotification = '';
    if (order.paymentMethod && order.paymentMethod !== 'efectivo') {
      if (order.paymentConfirmed) {
        paymentNotification = `<div style="margin: 12px 0; padding: 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success); border-radius: 8px; color: var(--success); font-weight: 600; text-align: center; font-size: 0.9rem;">✅ ¡Tu pago ha sido confirmado!</div>`;
      } else {
        paymentNotification = `<div style="margin: 12px 0; padding: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning); border-radius: 8px; color: var(--warning); font-weight: 600; text-align: center; font-size: 0.9rem;">⏳ Validando comprobante de pago...</div>`;
      }
    }

    return `
      <div class="order-card" style="margin-bottom: 20px; box-shadow: var(--shadow);">
        <div class="order-header" style="padding-bottom: 12px; border-bottom: 1px dashed var(--line); align-items: flex-start;">
          <div>
            <strong style="display:block; margin-bottom:4px; color:var(--text);">Pedido ${escapeHTML(order.id)}</strong>
            <div class="menu-meta">${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <strong style="color:var(--primary); font-size:1.15rem;">${money(order.total)}</strong>
        </div>
        ${paymentNotification}
        ${trackingHTML}
      </div>
    `;
  }).join('');

  clientOrdersList.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.parentElement;
      parent.querySelectorAll('.star-btn').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
      const val = Number(btn.dataset.val);
      parent.querySelectorAll('.star-btn').forEach(s => {
        s.style.color = Number(s.dataset.val) <= val ? 'var(--warning)' : '#d1d5db';
      });
    });
  });
}

renderSizeTabs();
renderMenu();
renderCart();
setStep(hasProfile ? 2 : 1);

// Auto-refresh client order tracking when Firebase pushes status updates
window.addEventListener('storage', () => {
  renderOrdersHistory();
});

setInterval(() => {
  renderOrdersHistory();
}, 3000);
