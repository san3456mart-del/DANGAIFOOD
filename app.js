const cfg = window.RestaurantAppConfig;
const storage = cfg.storageKeys;
const sizes = cfg.sizes;

const profileForm = document.getElementById('profileForm');
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
const historyToProfileBtn = document.getElementById('historyToProfileBtn');
const historyToMenuBtn = document.getElementById('historyToMenuBtn');
const clientOrdersList = document.getElementById('clientOrdersList');
const panels = Array.from(document.querySelectorAll('.wizard-panel'));
const indicators = Array.from(document.querySelectorAll('.wizard-step'));

let cart = [];
let currentStep = 1;
let activeSize = 'personal';

const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0));
const getJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  if (window.FirebaseDB && (key === storage.products || key === storage.orders)) {
    window.FirebaseDB.save(key, value);
  }
};
const escapeHTML = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

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
    const total = subtotal + cfg.deliveryFee;
    floatingCartTotal.textContent = money(total);
    floatingCartBtn.classList.remove('hidden');
  } else {
    floatingCartBtn.classList.add('hidden');
  }
}

function lockProfileInputs(disabled) {
  Array.from(profileForm.elements).forEach((el) => {
    if (el.tagName === 'INPUT') el.disabled = disabled;
  });
}

function loadProfile() {
  const profile = getJson(storage.profile, null);
  if (!profile) {
    profileStatus.textContent = 'Pendiente';
    lockProfileInputs(false);
    return false;
  }
  document.getElementById('name').value = profile.name || '';
  document.getElementById('complex').value = profile.complex || '';
  document.getElementById('tower').value = profile.tower || '';
  document.getElementById('apartment').value = profile.apartment || '';
  lockProfileInputs(true);
  profileStatus.textContent = 'Guardado';
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
  const delivery = cart.length ? cfg.deliveryFee : 0;
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
    'Productos:',
    ...order.items.map((item, index) => `${index + 1}. ${item.name} - ${item.sizeLabel} - ${item.removed.length ? `Sin ${item.removed.join(', ')}` : 'Completa'} - ${money(item.price)}`),
    `Notas: ${order.notes || 'Sin notas'}`,
    `Total: ${money(order.total)}`
  ].join('\n');
}

function submitOrder() {
  const profile = getJson(storage.profile, null);
  if (!profile) return toastMessage('Primero guarda tus datos.');
  if (!cart.length) return toastMessage('Agrega por lo menos una pizza.');

  const products = getProducts();
  const stockCheck = cart.every((line) => Number(products.find((p) => p.id === line.productId)?.stock?.[line.sizeKey] || 0) > 0);
  if (!stockCheck) return toastMessage('Hay productos agotados. Actualiza el menú.');

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
    deliveryFee: cfg.deliveryFee,
    total: subtotal + cfg.deliveryFee,
    cost: totalCost,
    estimatedProfit: subtotal - totalCost
  };

  const orders = getJson(storage.orders, []);
  orders.unshift(order);
  setJson(storage.orders, orders);

  const updatedProducts = products.map((product) => {
    const nextStock = { ...(product.stock || {}) };
    cart.filter((item) => item.productId === product.id).forEach((item) => {
      nextStock[item.sizeKey] = Math.max(0, Number(nextStock[item.sizeKey] || 0) - 1);
    });
    return { ...product, stock: nextStock };
  });
  setJson(storage.products, updatedProducts);

  const url = `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
  window.open(url, '_blank');
  cart = [];
  notesInput.value = '';
  renderCart();
  renderMenu();
  setStep(4);
  toastMessage(`Pedido ${order.id} guardado. Puedes seguir su estado aquí.`);
}

profileForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const existing = getJson(storage.profile, null) || {};
  const profile = {
    ...existing,
    clientId: existing.clientId || crypto.randomUUID(),
    name: document.getElementById('name').value.trim(),
    complex: document.getElementById('complex').value.trim(),
    tower: document.getElementById('tower').value.trim(),
    apartment: document.getElementById('apartment').value.trim()
  };
  setJson(storage.profile, profile);
  loadProfile();
  setStep(2);
  toastMessage('Tus datos quedaron guardados.');
});

editProfileBtn.addEventListener('click', () => {
  lockProfileInputs(false);
  profileStatus.textContent = 'Editando';
  setStep(1);
});

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

if (historyToProfileBtn) historyToProfileBtn.addEventListener('click', () => setStep(1));
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

ensureProducts();
const hasProfile = loadProfile();

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

  clientOrdersList.innerHTML = myOrders.map(order => {
    let trackingHTML = '';
    
    if (order.status !== 'entregado') {
      const steps = ['pendiente', 'preparacion', 'encamino'];
      const labels = ['Pendiente', 'Preparación', 'En camino'];
      let currentIndex = steps.indexOf(order.status);
      if (currentIndex === -1) currentIndex = 0; // fallback just in case
      
      trackingHTML = `
        <div class="tracker-steps">
          ${steps.map((step, idx) => `
            <div class="tracker-step ${currentIndex >= idx ? 'active' : ''}">
              <div class="tracker-dot"></div>
              <span>${labels[idx]}</span>
            </div>
          `).join('')}
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

    return `
      <div class="order-card" style="margin-bottom: 20px; box-shadow: var(--shadow);">
        <div class="order-header" style="padding-bottom: 12px; border-bottom: 1px dashed var(--line); align-items: flex-start;">
          <div>
            <strong style="display:block; margin-bottom:4px; color:var(--text);">Pedido ${escapeHTML(order.id)}</strong>
            <div class="menu-meta">${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <strong style="color:var(--primary); font-size:1.15rem;">${money(order.total)}</strong>
        </div>
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
