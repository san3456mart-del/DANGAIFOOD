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
let activeSize = Object.keys(cfg.categories)[0] || 'pizzas';
let paymentMethod = 'efectivo';
let paymentReceiptBase64 = null;
let appliedCouponId = null;  // currently applied coupon ID
let _pendingWaUrl = null;    // URL de WhatsApp pendiente (para el modal de comprobante)

const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0));
const getJson = (key, fallback) => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch(e) {
    return fallback;
  }
  // Convert object to array if it's the orders or users key (handles granular Firebase updates)
  if ((key === storage.orders || key === storage.users) && data && !Array.isArray(data)) {
    if (key === storage.orders) {
      return Object.values(data).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return Object.values(data);
  }
  return data;
};

const setJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('¡Almacenamiento Local Lleno! Se guardará solo en Firebase.');
    } else {
      console.error('Error guardando en localStorage:', err);
    }
  }

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

function getDeviceId() {
  let id = localStorage.getItem(storage.deviceId);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = 'dev_' + crypto.randomUUID();
    } else {
      id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
    localStorage.setItem(storage.deviceId, id);
  }
  return id;
}

const deviceId = getDeviceId();

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
  let current = getJson(storage.products, []);

  // REPARACIÓN: Corregir singular 'pizza' a 'pizzas' plural
  let repairNeeded = false;
  current = current.map(p => {
    if (p.category === 'pizza') {
      p.category = 'pizzas';
      repairNeeded = true;
    }
    return p;
  });

  if (repairNeeded) {
    setJson(storage.products, current);
  }

  return current;
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

  const nameInput = document.getElementById('guestName');
  if (nameInput) {
    nameInput.value = profile.name || '';
    const phoneInput = document.getElementById('guestPhone');
    if (phoneInput) phoneInput.value = profile.phone || profile.whatsapp || '';
    const complexInput = document.getElementById('guestComplex');
    if (complexInput) complexInput.value = profile.complex || '';
    const towerInput = document.getElementById('guestTower');
    if (towerInput) towerInput.value = profile.tower || '';
    const apartmentInput = document.getElementById('guestApartment');
    if (apartmentInput) apartmentInput.value = profile.apartment || '';
  }

  return true;
}

/**
 * Busca un usuario existente en la base de datos global usando cel, torre y apto.
 */
function lookupUser() {
  const phoneInput = document.getElementById('guestPhone');
  const towerInput = document.getElementById('guestTower');
  const apartmentInput = document.getElementById('guestApartment');
  const nameInput = document.getElementById('guestName');
  const complexInput = document.getElementById('guestComplex');

  const phone = phoneInput ? phoneInput.value.trim() : '';
  const tower = towerInput ? towerInput.value.trim() : '';
  const apt = apartmentInput ? apartmentInput.value.trim() : '';

  // Necesitamos los 3 datos clave para identificarlo sin login
  if (phone.length >= 10 && tower && apt) {
    const users = getJson(storage.users, []);
    const match = users.find(u => 
      String(u.phone || u.whatsapp) === phone && 
      String(u.tower) === tower && 
      String(u.apartment) === apt
    );

    if (match) {
      if (nameInput && !nameInput.value) nameInput.value = match.name || '';
      if (complexInput && !complexInput.value) complexInput.value = match.complex || '';
      
      // Actualizamos perfil local para cargar cupones y otros datos
      const profile = {
        clientId: match.clientId || match.id || deviceId,
        username: match.username || ('invitado_' + phone),
        name: match.name,
        phone: match.phone || match.whatsapp,
        complex: match.complex,
        tower: match.tower,
        apartment: match.apartment,
        isGuest: true
      };
      
      localStorage.setItem(storage.profile, JSON.stringify(profile));
      toastMessage(`¡Bienvenido de nuevo, ${match.name}! 👋`);
      renderCoupons();
    }
  }
}

/**
 * Registra o actualiza al cliente en la base de datos global tras su compra.
 */
function updateUsersList(profile) {
  const users = getJson(storage.users, []);
  const phone = profile.phone || profile.whatsapp;
  const idx = users.findIndex(u => 
    String(u.phone || u.whatsapp) === String(phone) && 
    String(u.tower) === String(profile.tower) && 
    String(u.apartment) === String(profile.apartment)
  );

  const userData = {
    ...profile,
    id: profile.clientId || deviceId,
    updatedAt: new Date().toISOString()
  };

  if (idx === -1) {
    users.push(userData);
  } else {
    users[idx] = { ...users[idx], ...userData };
  }

  // Guardamos localmente (best effort)
  try {
    localStorage.setItem(storage.users, JSON.stringify(users));
  } catch(e) {}

  // Persistencia granular en Firebase para evitar sobrescrituras
  if (window.FirebaseDB) {
    const userKey = `${phone}_${profile.tower}_${profile.apartment}`.replace(/[\.\$#\[\]\/]/g, '_');
    window.FirebaseDB.update(storage.users + '/' + userKey, userData)
      .catch(err => console.warn('Error sincronizando usuario:', err));
  }
}

function renderSizeTabs() {
  sizeTabs.innerHTML = Object.entries(cfg.categories).map(([key, value]) => `
    <button type="button" class="size-tab ${activeSize === key ? 'active' : ''}" data-size-key="${key}">
      <strong>${value.icon} ${escapeHTML(value.label)}</strong>
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

function getProductsForCategory(catKey) {
  return getProducts().filter((product) => product.category === catKey);
}

function renderMenu() {
  const catInfo = cfg.categories[activeSize];
  const products = getProductsForCategory(activeSize);
  activeSizeTitle.textContent = catInfo.label;
  activeSizeSubtitle.textContent = catInfo.subtitle;
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
    const pricesArr = Object.values(product.prices || {}).filter(v => v > 0);
    const minPrice = Math.min(...pricesArr);
    const isMultiSize = pricesArr.length > 1;

    card.innerHTML = `
      <div class="rappi-menu-row">
        <div class="menu-image-placeholder">${catInfo.icon || '🍕'}</div>
        <div class="menu-details">
          <h3>${escapeHTML(product.name)}</h3>
          <div class="menu-price">${isMultiSize ? '<span style="font-size:0.75rem; color:var(--muted); font-weight:400; margin-right:4px;">Desde</span>' : ''}${money(minPrice)}</div>
          <div class="menu-meta">${escapeHTML(product.ingredients)}</div>
        </div>
      </div>
      <button class="primary-btn add-btn" data-id="${product.id}">
         ➕ Personalizar y añadir
      </button>
    `;
    menuGrid.appendChild(card);
  });

  menuGrid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPizzaModal(btn.dataset.id));
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
const pmSizeSelector     = document.getElementById('pmSizeSelector');
const pmSizeOptions      = document.getElementById('pmSizeOptions');
const pmHalfGrid         = document.getElementById('pmHalfGrid');
const pmHalf1Name        = document.getElementById('pmHalf1Name');
const pmHalf2Name        = document.getElementById('pmHalf2Name');
const pmExtrasList       = document.getElementById('pmExtrasList');
const pmFinalPrice       = document.getElementById('pmFinalPrice');
const pmTabs             = document.querySelectorAll('.pm-tab');
const pmPanels           = document.querySelectorAll('.pm-panel');
const pizzaModalAddBtn   = document.getElementById('pizzaModalAddBtn');
const pizzaModalCancelBtn = document.getElementById('pizzaModalCancelBtn');

function openPizzaModal(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) return toastMessage('Producto no encontrado.');

  const productSizes = Object.entries(product.prices || {}).filter(([key, val]) => val > 0);
  if (!productSizes.length) return toastMessage('Este producto no tiene precio configurado.');

  _modalProduct = product;
  _modalSizeKey = productSizes.length === 1 ? productSizes[0][0] : null;
  _modalHalf2   = null;
  _modalExtras  = {};
  _modalRemoved = [];

  // --- Normal tab ---
  pmProductName.textContent = product.name;
  pmProductIngredients.textContent = product.ingredients;

  // Render Size Selection if applicable
  pmSizeOptions.innerHTML = '';
  if (productSizes.length > 1) {
    pmSizeSelector.classList.remove('hidden');
    productSizes.forEach(([key, price]) => {
      const info = cfg.pizzaSizes[key] || cfg.categories[key] || { label: key, subtitle: '' };
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = `pm-size-option ${_modalSizeKey === key ? 'selected' : ''}`;
      opt.innerHTML = `
        <strong>${escapeHTML(info.shortLabel || info.label)}</strong>
        <span>${escapeHTML(info.subtitle)}</span>
        <em>${money(price)}</em>
      `;
      opt.addEventListener('click', () => {
        _modalSizeKey = key;
        pmSizeOptions.querySelectorAll('.pm-size-option').forEach(b => b.classList.toggle('selected', b === opt));
        _updateModalPrice();
        _renderHalfGrid(key, productId); // refresh half grid for this size
      });
      pmSizeOptions.appendChild(opt);
    });
  } else {
    pmSizeSelector.classList.add('hidden');
  }

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

  // --- Half & Half tab visibility ---
  const halfTabBtn = document.querySelector('[data-pm-tab="half"]');
  if (product.category === 'pizzas') {
    halfTabBtn.classList.remove('hidden');
    pmHalf1Name.textContent = product.name;
    pmHalf2Name.textContent = 'Elige abajo';
    if (_modalSizeKey) _renderHalfGrid(_modalSizeKey, productId);
    else pmHalfGrid.innerHTML = '<div class="pm-no-opts">Selecciona un tamaño primero.</div>';
  } else {
    halfTabBtn.classList.add('hidden');
  }

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
  if (!_modalProduct) return;
  if (!_modalSizeKey) return toastMessage('Por favor selecciona el tamaño antes de añadir.');
  
  const product  = _modalProduct;
  const sizeKey  = _modalSizeKey;
  const info     = cfg.sizes[sizeKey] || { label: '', shortLabel: '', subtitle: '' };
  const products = getProducts();
  const stock    = Number(products.find(p => p.id === product.id)?.stock?.[sizeKey] || 0);
  if (stock < 1) return toastMessage('Ese tamaño está agotado.');

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
    sizeLabel: `${info.shortLabel || info.label} ${info.subtitle ? `(${info.subtitle})` : ''}`,
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
  const label = isHalf ? 'Mitad y Mitad' : product.name;
  const sizeLabel = info.shortLabel || info.label || '';
  toastMessage(`${label}${sizeLabel ? ' (' + sizeLabel + ')' : ''} agregado al pedido. ✅`);
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

// Mensaje que envía el PEDIDO al restaurante por WhatsApp
function buildWhatsappMessage(order) {
  const itemLines = order.items.map((item, index) => {
    let line = `${index + 1}. ${item.name} - ${item.sizeLabel}`;
    if (item.removed && item.removed.length) line += ` (Sin ${item.removed.join(', ')})`;
    if (item.extras && item.extras.length) line += ` + Extras: ${item.extras.map(e => `${e.qty}x ${e.name}`).join(', ')}`;
    line += ` - ${money(item.price)}`;
    return line;
  });
  const payLabel = order.paymentMethod === 'efectivo'
    ? '💵 Efectivo'
    : order.paymentMethod === 'qr'
      ? '📱 App/QR (comprobante enviado por WhatsApp)'
      : '🔑 Nequi/Bre-B (comprobante enviado por WhatsApp)';
  return [
    `🍕 *NUEVO PEDIDO — ${cfg.restaurantName}*`,
    ``,
    `🔖 *Número:* ${order.id}`,
    `👤 *Cliente:* ${order.customer.name}`,
    `📞 *Celular:* ${order.customer.phone}`,
    `📍 *Ubicación:* ${order.customer.complex}, Torre ${order.customer.tower}, Apto ${order.customer.apartment}`,
    `💳 *Pago:* ${payLabel}`,
    ``,
    `📦 *Productos:*`,
    ...itemLines,
    ``,
    `📝 *Notas:* ${order.notes || 'Sin notas'}`,
    ``,
    `💰 *Total a cobrar: ${money(order.total)}*`
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
  let profile = getJson(storage.profile, null);

  const nameInput = document.getElementById('guestName');
  if (nameInput) {
    const name = nameInput.value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const complex = document.getElementById('guestComplex').value.trim();
    const tower = document.getElementById('guestTower').value.trim();
    const apartment = document.getElementById('guestApartment').value.trim();

    if (!name || !phone || !complex || !tower || !apartment) {
      return toastMessage('Por favor completa todos tus datos de entrega en la parte de arriba 🛵.');
    }

    profile = {
      clientId: profile ? profile.clientId : deviceId,
      username: profile ? profile.username : 'invitado_' + Date.now(),
      name,
      phone,
      complex,
      tower,
      apartment,
      isGuest: true
    };
    localStorage.setItem(storage.profile, JSON.stringify(profile));
    loadProfile();
  }

  if (!profile) return toastMessage('Por favor completa todos tus datos de entrega 🛵.');
  if (!cart.length) return toastMessage('Agrega por lo menos un producto al carrito.');
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
      receiptBase64: paymentReceiptBase64,
      deviceId: deviceId
    };

    const orders = getJson(storage.orders, []); // get current local orders
    orders.unshift(order);
    
    // Guardar en localStorage (best effort — puede fallar si está lleno)
    try {
      localStorage.setItem(storage.orders, JSON.stringify(orders));
    } catch(e) {
      console.warn('localStorage lleno, solo guardando en Firebase.');
    }

    // GUARDAR EN FIREBASE como objeto indexado por ID (NO como array)
    // Esto es compatible con el formato que usa deleteOrder en admin.js
    if (window.FirebaseDB) {
      const cleanId = String(order.id).replace(/[.$#[\]\/]/g, '_');
      window.FirebaseDB.update(storage.orders + '/' + cleanId, order)
        .catch(err => console.error('Error enviando pedido a Firebase:', err));
    }

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

    // Update global users list
    updateUsersList(profile);

    cart = [];
    notesInput.value = '';
    if (clientReceiptInput) clientReceiptInput.value = '';
    paymentReceiptBase64 = null;
    paymentMethod = 'efectivo';
    appliedCouponId = null;
    if (typeof updatePaymentUI === 'function') updatePaymentUI();
    
    renderCart();
    renderMenu();

    // Enviar pedido directamente por WhatsApp al restaurante
    const waMsg = encodeURIComponent(buildWhatsappMessage(order));
    const waUrl = `https://wa.me/${cfg.whatsappNumber}?text=${waMsg}`;
    _pendingWaUrl = waUrl;

    if (order.paymentMethod !== 'efectivo' && order.receiptBase64) {
      // Pago digital: abrir WA con el texto Y mostrar modal con comprobante
      window.open(waUrl, '_blank');
      showReceiptModal(order.receiptBase64, waUrl);
    } else {
      // Efectivo: solo abrir WA
      window.open(waUrl, '_blank');
    }

    previousStep = 2;
    setStep(2);
    toastMessage(`✅ Pedido ${order.id} enviado. ¡Redirigiendo a WhatsApp!`);
  } catch (err) {
    toastMessage('Hubo un error al enviar el pedido. Intenta nuevamente.');
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = 'Enviar pedido';
  }
}

// ─── MODAL COMPROBANTE DE PAGO ──────────────────────────────────────
function showReceiptModal(receiptBase64, waUrl) {
  const overlay = document.getElementById('receiptModalOverlay');
  const previewBox = document.getElementById('receiptPreviewBox');
  const previewImg = document.getElementById('receiptPreviewImg');
  const waBtn = document.getElementById('receiptModalWaBtn');
  const closeBtn = document.getElementById('receiptModalCloseBtn');

  if (!overlay) return;

  if (receiptBase64) {
    previewImg.src = receiptBase64;
    previewBox.style.display = 'flex';
  } else {
    previewBox.style.display = 'none';
  }

  waBtn.onclick = () => {
    window.open(waUrl, '_blank');
  };

  closeBtn.onclick = () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  };

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ─── GUEST FORM LOGIC ─────────────────────────────────────────────


if (guestForm) {
  guestForm.addEventListener('submit', (e) => {
    e.preventDefault();
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
  if (!cart.length) return toastMessage('Agrega por lo menos un producto antes de continuar.');
  setStep(3);
});

if (floatingCartGoBtn) {
  floatingCartGoBtn.addEventListener('click', () => {
    if (!cart.length) return toastMessage('Agrega por lo menos un producto antes de continuar.');
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

  const allOrders = getJson(storage.orders, []);
  let myOrders = [];
  
  // Filter by EXACT deviceId if available, OR by old clientId for backwards compatibility
  myOrders = allOrders.filter(o => 
    (o.deviceId && o.deviceId === deviceId) || 
    (o.customer && o.customer.clientId === deviceId) ||
    (profile && o.customer && o.customer.clientId === profile.clientId)
  );

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

// Attach listeners for auto-identification
['guestPhone', 'guestTower', 'guestApartment'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', lookupUser);
});

renderSizeTabs();
renderMenu();
renderCart();
setStep(1);

// Auto-refresh client order tracking when Firebase pushes status updates
window.addEventListener('storage', () => {
  renderOrdersHistory();
});

// Refresh order history every 5 seconds (reduced from 3s to limit Firebase reads)
setInterval(() => {
  renderOrdersHistory();
}, 5000);
