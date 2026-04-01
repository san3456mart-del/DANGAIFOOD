const cfg = window.RestaurantAppConfig;
const storage = cfg.storageKeys;
const sizes = cfg.sizes;

const guestForm = document.getElementById('guestForm');
const editProfileBtn = document.getElementById('editProfileBtn');
const skipToMenuBtn = document.getElementById('skipToMenuBtn');
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
let appliedCouponId = null;  // currently applied coupon ID

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

function getExtras() {
  const stored = getJson(storage.extras, null);
  if (stored && Array.isArray(stored) && stored.length) return stored;
  return cfg.defaultExtras;
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
  if (statusEl) {
    statusEl.textContent = profile.isGuest ? `Invitado: ${profile.name}` : profile.username;
  }
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
          ${stock < 5 && stock > 0 ? `<div class="menu-stock-warning">Solo quedan ${stock} disponibles</div>` : ''}
        </div>
      </div>
      <button class="primary-btn add-btn" data-id="${product.id}" data-size-key="${activeSize}" ${stock < 1 ? 'disabled' : ''}>
        ${stock < 1 ? '🚫 Agotado' : '➕ Personalizar y añadir'}
      </button>
    `;
    menuGrid.appendChild(card);
  });

  menuGrid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPizzaModal(btn.dataset.id, btn.dataset.sizeKey));
  });
}

// ─── PIZZA MODAL STATE ───────────────────────────────────────────
let _modalProduct  = null;  // product being customized
let _modalSizeKey  = null;  // size being customized
let _modalHalf2    = null;  // second half product (or null)
let _modalExtras   = {};    // { extId: qty }
let _modalRemoved  = [];    // removed ingredients

const pizzaModalOverlay  = document.getElementById('pizzaModalOverlay');
const pmProductName      = document.getElementById('pmProductName');
const pmProductIngredients = document.getElementById('pmProductIngredients');
const pmRemovables       = document.getElementById('pmRemovables');
const pmHalfGrid         = document.getElementById('pmHalfGrid');
const pmHalf1Name        = document.getElementById('pmHalf1Name');
const pmHalf2Name        = document.getElementById('pmHalf2Name');
const pmExtrasList       = document.getElementById('pmExtrasList');
const pmFinalPrice       = document.getElementById('pmFinalPrice');
const pmTabs             = document.querySelectorAll('.pm-tab');
const pmPanels           = document.querySelectorAll('.pm-panel');
const pizzaModalAddBtn   = document.getElementById('pizzaModalAddBtn');
const pizzaModalCancelBtn = document.getElementById('pizzaModalCancelBtn');

function openPizzaModal(productId, sizeKey) {
  const product = getProducts().find(p => p.id === productId);
  const sizeInfo = sizes[sizeKey];
  if (!product || !sizeInfo) return toastMessage('Producto no encontrado.');
  const stock = Number(product?.stock?.[sizeKey] || 0);
  if (stock < 1) return toastMessage('Ese sabor está agotado en ese tamaño.');

  _modalProduct = product;
  _modalSizeKey = sizeKey;
  _modalHalf2   = null;
  _modalExtras  = {};
  _modalRemoved = [];

  // --- Normal tab ---
  pmProductName.textContent = product.name;
  pmProductIngredients.textContent = product.ingredients;
  pmRemovables.innerHTML = '';
  if (product.removableOptions && product.removableOptions.length) {
    product.removableOptions.forEach(opt => {
      const lbl = document.createElement('label');
      lbl.className = 'checkbox-chip';
      lbl.innerHTML = `<input type="checkbox" value="${escapeHTML(opt)}"> Sin ${escapeHTML(opt)}`;
      lbl.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) { if (!_modalRemoved.includes(opt)) _modalRemoved.push(opt); }
        else { _modalRemoved = _modalRemoved.filter(r => r !== opt); }
      });
      pmRemovables.appendChild(lbl);
    });
  } else {
    pmRemovables.innerHTML = '<div class="pm-no-opts">Este sabor no tiene ingredientes removibles.</div>';
  }

  // --- Half & Half tab ---
  pmHalf1Name.textContent = product.name;
  pmHalf2Name.textContent = 'Elige abajo';
  _renderHalfGrid(sizeKey, productId);

  // --- Extras tab ---
  _renderExtrasTab();

  // Switch to Normal tab
  _switchPmTab('normal');
  _updateModalPrice();
  pizzaModalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePizzaModal() {
  pizzaModalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function _switchPmTab(tabName) {
  pmTabs.forEach(t => t.classList.toggle('active', t.dataset.pmTab === tabName));
  pmPanels.forEach(p => p.classList.toggle('active', p.id === `pmTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`));
  pmPanels.forEach(p => p.classList.toggle('hidden', p.id !== `pmTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`));
}

function _renderHalfGrid(sizeKey, excludeId) {
  const products = getProducts().filter(p => p.id !== excludeId && Number(p?.prices?.[sizeKey] || 0) > 0);
  pmHalfGrid.innerHTML = '';
  products.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pm-half-option';
    btn.dataset.pid = p.id;
    btn.innerHTML = `
      <span class="pho-icon">🍕</span>
      <strong>${escapeHTML(p.name)}</strong>
      <span class="pho-price">${money(p.prices[sizeKey])}</span>
    `;
    btn.addEventListener('click', () => {
      _modalHalf2 = p;
      pmHalf2Name.textContent = p.name;
      pmHalfGrid.querySelectorAll('.pm-half-option').forEach(b => b.classList.toggle('selected', b.dataset.pid === p.id));
      _updateModalPrice();
      toastMessage(`2ª mitad: ${p.name}`);
    });
    pmHalfGrid.appendChild(btn);
  });
}

function _renderExtrasTab() {
  const extras = getExtras();
  pmExtrasList.innerHTML = '';
  // Group by category
  const groups = {};
  extras.forEach(ex => {
    const cat = ex.category || 'Otros';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ex);
  });
  Object.entries(groups).forEach(([cat, items]) => {
    const heading = document.createElement('div');
    heading.className = 'pm-extras-category';
    heading.textContent = cat;
    pmExtrasList.appendChild(heading);
    items.forEach(ex => {
      const row = document.createElement('div');
      row.className = 'pm-extra-row';
      const qty = _modalExtras[ex.id] || 0;
      row.dataset.extId = ex.id;
      row.innerHTML = `
        <div class="per-left">
          <span class="per-name">${escapeHTML(ex.name)}</span>
          <span class="per-price">${money(ex.price)} c/u</span>
        </div>
        <div class="per-qty">
          <button type="button" class="per-btn per-dec" data-ext-id="${ex.id}">−</button>
          <span class="per-count" id="pec-${ex.id}">${qty}</span>
          <button type="button" class="per-btn per-inc" data-ext-id="${ex.id}">+</button>
        </div>
      `;
      pmExtrasList.appendChild(row);
    });
  });
  pmExtrasList.querySelectorAll('.per-inc').forEach(btn => {
    btn.addEventListener('click', () => _changeExtra(btn.dataset.extId, 1));
  });
  pmExtrasList.querySelectorAll('.per-dec').forEach(btn => {
    btn.addEventListener('click', () => _changeExtra(btn.dataset.extId, -1));
  });
}

function _changeExtra(extId, delta) {
  const qty = Math.max(0, (_modalExtras[extId] || 0) + delta);
  if (qty === 0) delete _modalExtras[extId]; else _modalExtras[extId] = qty;
  const span = document.getElementById(`pec-${extId}`);
  if (span) span.textContent = qty;
  const btn = pmExtrasList.querySelector(`.per-dec[data-ext-id="${extId}"]`);
  if (btn) btn.disabled = qty === 0;
  _updateModalPrice();
}

function _calcModalPrice() {
  if (!_modalProduct || !_modalSizeKey) return 0;
  const basePrice = Number(_modalProduct.prices[_modalSizeKey] || 0);
  let price = basePrice;
  // Half & Half: max of both halves
  if (_modalHalf2) {
    const half2Price = Number(_modalHalf2.prices[_modalSizeKey] || 0);
    price = Math.max(basePrice, half2Price);
  }
  // Extras
  const extras = getExtras();
  Object.entries(_modalExtras).forEach(([extId, qty]) => {
    const ex = extras.find(e => e.id === extId);
    if (ex) price += ex.price * qty;
  });
  return price;
}

function _updateModalPrice() {
  pmFinalPrice.textContent = money(_calcModalPrice());
}

// Tab switching
pmTabs.forEach(tab => {
  tab.addEventListener('click', () => _switchPmTab(tab.dataset.pmTab));
});

// Close modal
pizzaModalCancelBtn.addEventListener('click', closePizzaModal);
pizzaModalOverlay.addEventListener('click', e => { if (e.target === pizzaModalOverlay) closePizzaModal(); });

// Add to cart from modal
pizzaModalAddBtn.addEventListener('click', addToCartFromModal);

function addToCartFromModal() {
  if (!_modalProduct || !_modalSizeKey) return;
  const product  = _modalProduct;
  const sizeKey  = _modalSizeKey;
  const sizeInfo = sizes[sizeKey];
  const products = getProducts();
  const stock    = Number(products.find(p => p.id === product.id)?.stock?.[sizeKey] || 0);
  if (stock < 1) return toastMessage('Ese sabor está agotado.');

  const extras    = getExtras();
  const extrasArr = Object.entries(_modalExtras)
    .filter(([, qty]) => qty > 0)
    .map(([extId, qty]) => {
      const ex = extras.find(e => e.id === extId);
      return ex ? { id: extId, name: ex.name, qty, unitPrice: ex.price, totalPrice: ex.price * qty } : null;
    })
    .filter(Boolean);

  const isHalf  = !!_modalHalf2;
  const basePrice = Number(product.prices[sizeKey] || 0);
  const half2Price = isHalf ? Number(_modalHalf2.prices[sizeKey] || 0) : 0;
  const pizzaPrice = isHalf ? Math.max(basePrice, half2Price) : basePrice;
  const extrasPrice = extrasArr.reduce((s, e) => s + e.totalPrice, 0);
  const totalPrice = pizzaPrice + extrasPrice;

  const baseCost  = Number(product?.costs?.[sizeKey] || 0);

  let displayName = product.name;
  if (isHalf) displayName = `½ ${product.name} + ½ ${_modalHalf2.name}`;

  cart.push({
    lineId:    crypto.randomUUID(),
    productId: product.id,
    name:      displayName,
    sizeKey,
    sizeLabel: `${sizeInfo.shortLabel} (${sizeInfo.subtitle})`,
    price:     totalPrice,
    cost:      baseCost,
    removed:   [..._modalRemoved],
    extras:    extrasArr,
    isHalf,
    half1Name: isHalf ? product.name : null,
    half2Name: isHalf ? _modalHalf2.name : null,
  });

  renderCart();
  closePizzaModal();
  const label = isHalf ? 'Pizza mitad y mitad' : product.name;
  toastMessage(`${label} ${sizeInfo.shortLabel.toLowerCase()} agregada al pedido. 🍕`);
}

// Legacy placeholder to avoid reference errors from old code
function addToCart() {}

function removeFromCart(lineId) {
  cart = cart.filter((item) => item.lineId !== lineId);
  renderCart();
}

function getCouponDiscount(subtotal) {
  if (!appliedCouponId) return 0;
  const profile = getJson(storage.profile, null);
  if (!profile) return 0;
  const coupons = getJson('restaurant_coupons_v2', {});
  const userCoupons = coupons[profile.clientId] || [];
  const coupon = userCoupons.find(c => c.id === appliedCouponId);
  if (!coupon || new Date(coupon.expiresAt).getTime() <= Date.now()) { appliedCouponId = null; return 0; }
  if (coupon.type === 'percent') return Math.round(subtotal * coupon.value / 100);
  return Math.min(coupon.value, subtotal);
}

function renderCart() {
  if (!cart.length) {
    cartItems.className = 'cart-items empty-state';
    cartItems.textContent = 'Aún no has agregado productos.';
  } else {
    cartItems.className = 'cart-items';
    cartItems.innerHTML = cart.map((item) => {
      const extrasHtml = item.extras && item.extras.length
        ? `<div class="cart-extras">${item.extras.map(e => `<span class="cart-extra-chip">+${e.qty} ${escapeHTML(e.name)} <em>${money(e.totalPrice)}</em></span>`).join('')}</div>`
        : '';
      const halfBadge = item.isHalf
        ? `<span class="half-badge">🍕 Mitad y Mitad</span>`
        : '';
      const removedStr = item.removed && item.removed.length
        ? `<div class="menu-meta">Sin: ${escapeHTML(item.removed.join(', '))}</div>`
        : '';
      return `
      <div class="cart-row">
        <div class="order-header">
          <div>
            ${halfBadge}
            <strong>${escapeHTML(item.name)}</strong>
            <div class="menu-meta">${escapeHTML(item.sizeLabel)}</div>
          </div>
          <button class="mini-btn danger" data-remove-id="${item.lineId}">Quitar</button>
        </div>
        ${removedStr}
        ${extrasHtml}
        <div class="order-footer"><span>${money(item.price)}</span></div>
      </div>`;
    }).join('');
    cartItems.querySelectorAll('[data-remove-id]').forEach((btn) => btn.addEventListener('click', () => removeFromCart(btn.dataset.removeId)));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const delivery = cart.length ? getDeliveryFee() : 0;
  const discount = getCouponDiscount(subtotal);
  const total = subtotal + delivery - discount;

  cartCount.textContent = `${cart.length} items`;
  subtotalValue.textContent = money(subtotal);
  deliveryValue.textContent = money(delivery);
  totalValue.textContent = money(total);

  const discountLine = document.getElementById('discountLine');
  const discountValue = document.getElementById('discountValue');
  if (discountLine && discountValue) {
    if (discount > 0) {
      discountLine.classList.remove('hidden');
      discountValue.textContent = `-${money(discount)}`;
    } else {
      discountLine.classList.add('hidden');
    }
  }

  updateFloatingCart();
  renderCoupons();
}

function renderCoupons() {
  const profile = getJson(storage.profile, null);
  const couponSection = document.getElementById('couponSection');
  const couponCards = document.getElementById('couponCards');
  if (!couponSection || !couponCards || !profile) return;

  const coupons = getJson('restaurant_coupons_v2', {});
  const userCoupons = (coupons[profile.clientId] || []).filter(c => !c.redeemed);
  const now = Date.now();

  if (!userCoupons.length) {
    couponSection.classList.add('hidden');
    return;
  }
  couponSection.classList.remove('hidden');

  couponCards.innerHTML = userCoupons.map(c => {
    const isExpired = new Date(c.expiresAt).getTime() <= now;
    const isApplied = c.id === appliedCouponId;
    const label = c.type === 'percent' ? `${c.value}% de descuento` : `${money(c.value)} de descuento`;
    const expiryStr = new Date(c.expiresAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="coupon-card ${isApplied ? 'applied' : ''} ${isExpired ? 'expired-card' : ''}">
        <div class="cc-left">
          <span class="cc-pct">Cupón Dangai Food${isExpired ? ' (vencido)' : ''}</span>
          <span class="cc-amount">${c.type === 'percent' ? `${c.value}% OFF` : money(c.value)}</span>
          <span class="cc-exp">${escapeHTML(c.description)} &mdash; Vence: ${expiryStr}</span>
        </div>
        <div class="cc-right">
          ${!isExpired ? `<button class="cc-apply-btn" data-apply-coupon="${c.id}">${isApplied ? '✔️ Aplicado' : 'Aplicar'}</button>` : '<span style="color:rgba(255,255,255,0.7);font-size:0.8rem;">⌛ Vencido</span>'}
        </div>
      </div>`;
  }).join('');

  couponCards.querySelectorAll('[data-apply-coupon]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.applyCoupon;
      if (appliedCouponId === id) {
        appliedCouponId = null;
        toastMessage('Cupón removido.');
      } else {
        appliedCouponId = id;
        toastMessage('🎟️ ¡Cupón aplicado!');
      }
      renderCart();
    });
  });
}

// Mensaje que manda el ADMIN al restaurante (notificación interna)
function buildWhatsappMessage(order) {
  const itemLines = order.items.map((item, index) => {
    let line = `${index + 1}. ${item.name} - ${item.sizeLabel}`;
    if (item.removed && item.removed.length) line += ` - Sin ${item.removed.join(', ')}`;
    if (item.extras && item.extras.length) line += ` - Extras: ${item.extras.map(e => `${e.qty}x ${e.name}`).join(', ')}`;
    line += ` - ${money(item.price)}`;
    return line;
  });
  return [
    `Hola, llegó un nuevo pedido para ${cfg.restaurantName}.`,
    `Pedido: ${order.id}`,
    `Cliente: ${order.customer.name}`,
    `Ubicación: ${order.customer.complex}, ${order.customer.tower}, apto ${order.customer.apartment}`,
    `Método de Pago: ${order.paymentMethod === 'efectivo' ? '💵 Efectivo' : (order.paymentMethod === 'qr' ? '📱 App/QR (Comprobante adjunto en el Admin Panel)' : '🔑 Bre-B (Comprobante adjunto en el Admin Panel)')}`,
    'Productos:',
    ...itemLines,
    `Notas: ${order.notes || 'Sin notas'}`,
    `Total: ${money(order.total)}`
  ].join('\n');
}

// Mensaje que manda el CLIENTE al restaurante para preguntar por su pedido
function buildClientWhatsappMessage(order) {
  const items = order.items.map((item, i) =>
    `${i + 1}. ${item.name} (${item.sizeLabel})${item.removed?.length ? ` sin ${item.removed.join(', ')}` : ''}`
  ).join('\n');
  return [
    `¡Hola! 👋 Soy *${order.customer.name}* y quisiera consultar el estado de mi pedido.`,
    ``,
    `🧾 *Número de orden:* ${order.id}`,
    `📦 *Lo que pedí:*`,
    items,
    ``,
    `💰 *Total:* ${money(order.total)}`,
    ``,
    `¿Me podrían indicar en qué estado va mi pedido? Muchas gracias 🙏`
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
    const discount = getCouponDiscount(subtotal);
    const order = {
      id: `PED-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
      customer: profile,
      items: [...cart],
      notes: notesInput.value.trim(),
      subtotal,
      deliveryFee: getDeliveryFee(),
      discount,
      couponId: appliedCouponId || null,
      total: subtotal + getDeliveryFee() - discount,
      cost: totalCost,
      estimatedProfit: Math.round((subtotal + getDeliveryFee() - discount) * (cfg.profitRate || 0.30)),
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

    // Mark coupon as redeemed if used
    if (appliedCouponId) {
      const coupons = getJson('restaurant_coupons_v2', {});
      if (coupons[profile.clientId]) {
        coupons[profile.clientId] = coupons[profile.clientId].map(c =>
          c.id === appliedCouponId ? { ...c, redeemed: true, redeemedAt: new Date().toISOString() } : c
        );
        setJson('restaurant_coupons_v2', coupons);
      }
    }

    cart = [];
    notesInput.value = '';
    if (clientReceiptInput) clientReceiptInput.value = '';
    paymentReceiptBase64 = null;
    paymentMethod = 'efectivo';
    appliedCouponId = null;
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

// ─── GUEST FORM LOGIC ─────────────────────────────────────────────


if (guestForm) {
  guestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = guestForm.querySelector('button[type="submit"]');
    const name = document.getElementById('guestName').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const complex = document.getElementById('guestComplex').value.trim();
    const tower = document.getElementById('guestTower').value.trim();
    const apartment = document.getElementById('guestApartment').value.trim();

    if (!name || !phone || !complex || !tower || !apartment) {
      return toastMessage('Por favor completa todos los campos.');
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const guestProfile = {
      clientId: crypto.randomUUID(),
      username: 'invitado_' + Date.now(),
      name,
      phone,
      complex,
      tower,
      apartment,
      isGuest: true
    };
    
    localStorage.setItem(storage.profile, JSON.stringify(guestProfile));
    loadProfile();
    setStep(2);
    toastMessage('¡Listo! Puedes hacer tu pedido. 🍕');
    
    btn.disabled = false;
    btn.textContent = 'Continuar al menú';
  });
}

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', () => {
    localStorage.removeItem(storage.profile);
    setStep(1);
    toastMessage('Sesión cerrada.');
    if (loginFormClient) loginFormClient.reset();
    if (profileForm) profileForm.reset();
    loadProfile();
  });
}

goToConfirmBtn.addEventListener('click', () => {
  if (!getJson(storage.profile, null)) {
    toastMessage('¡Para ordenar, primero dinos a dónde enviamos!');
    setStep(1);
    return;
  }
  if (!cart.length) return toastMessage('Agrega por lo menos una pizza antes de continuar.');
  setStep(3);
});

if (floatingCartGoBtn) {
  floatingCartGoBtn.addEventListener('click', () => {
    if (!getJson(storage.profile, null)) {
      toastMessage('¡Para ordenar, primero dinos a dónde enviamos!');
      setStep(1);
      return;
    }
    if (!cart.length) return toastMessage('Agrega por lo menos una pizza antes de continuar.');
    setStep(3);
  });
}

if (skipToMenuBtn) {
  skipToMenuBtn.addEventListener('click', () => {
    setStep(2);
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

const ORDER_LIMIT_MS = 45 * 60 * 1000; // 45 minutes

function getCountdownData(createdAt) {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const remaining = ORDER_LIMIT_MS - elapsed;
  if (remaining <= 0) return { text: '¡Tiempo superado!', urgent: true, exceeded: true };
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pad = n => String(n).padStart(2, '0');
  return { text: `${pad(mins)}:${pad(secs)}`, urgent: mins < 5, exceeded: false };
}

// Tick all countdown spans every second without re-rendering
setInterval(() => {
  document.querySelectorAll('.order-countdown[data-created]').forEach(el => {
    const data = getCountdownData(el.dataset.created);
    el.textContent = data.text;
    el.style.color = data.exceeded ? '#dc2626' : data.urgent ? '#f59e0b' : '#16a34a';
    el.style.borderColor = data.exceeded ? '#dc2626' : data.urgent ? '#f59e0b' : '#16a34a';
  });
}, 1000);

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
    // El número del restaurante para que el CLIENTE le escriba
    const restaurantNumber = '573022562953';
    const url = `https://wa.me/${restaurantNumber}?text=${encodeURIComponent(buildClientWhatsappMessage(order))}`;
    window.open(url, '_blank');
  };

  clientOrdersList.innerHTML = myOrders.map(order => {
    let trackingHTML = '';
    
    if (order.status !== 'entregado') {
      const steps = ['pendiente', 'preparacion', 'encamino'];
      const labels = ['Pendiente', 'Preparación', 'En camino'];
      let currentIndex = steps.indexOf(order.status);
      if (currentIndex === -1) currentIndex = 0;

      const showVideo = currentIndex === 1 || currentIndex === 2;
      const videoSrc = currentIndex === 1 ? 'public/en_preparacion.mp4' : 'public/en_camino.mp4';
      const videoBorder = currentIndex === 1 ? 'var(--success)' : 'var(--primary)';
      const videoGlow   = currentIndex === 1 ? 'rgba(16,185,129,0.3)' : 'rgba(255,69,0,0.3)';

      trackingHTML = `
        <div class="tracker-steps" style="margin-top:${showVideo ? '100px' : '16px'}; transition:margin 0.3s ease; padding-top: 8px;">
          ${steps.map((step, idx) => `
            <div class="tracker-step ${currentIndex >= idx ? 'active' : ''}" style="position:relative;">
              ${showVideo && idx === currentIndex ? `
                <div style="position:absolute; bottom:calc(100% + 14px); left:50%; transform:translateX(-50%);
                     width:84px; height:84px; border-radius:16px; overflow:hidden;
                     border:3px solid ${videoBorder};
                     box-shadow:0 8px 24px ${videoGlow}; z-index:10; background:#000;">
                  <video data-autoplay src="${videoSrc}"
                    loop muted playsinline
                    style="width:100%; height:100%; display:block; object-fit:cover;">
                  </video>
                </div>` : ''}
              <div class="tracker-dot"></div>
              <span>${labels[idx]}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px;display:flex;justify-content:center;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:8px 18px;">
            <span style="font-size:1.2rem;">⏱️</span>
            <div style="text-align:center;">
              <div style="font-size:0.72rem;color:#6b7280;font-weight:600;letter-spacing:0.05em;">TIEMPO RESTANTE</div>
              <span class="order-countdown" data-created="${order.createdAt}" style="font-size:1.4rem;font-weight:800;color:#16a34a;border:none;font-variant-numeric:tabular-nums;line-height:1.1;">45:00</span>
            </div>
          </div>
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

  // Force-play tracking videos (innerHTML doesn't trigger autoplay in mobile browsers)
  clientOrdersList.querySelectorAll('video[data-autoplay]').forEach(video => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    const promise = video.play();
    if (promise !== undefined) {
      promise.catch(() => {
        // Autoplay blocked — retry on first user interaction
        document.addEventListener('click', () => video.play(), { once: true });
        document.addEventListener('touchstart', () => video.play(), { once: true });
      });
    }
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
