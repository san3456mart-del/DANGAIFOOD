const cfg = window.RestaurantAppConfig;
const storage = cfg.storageKeys;
const sizes = cfg.sizes;
const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0));
const getJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
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

const toast = document.getElementById('toast');
const loginSection = document.getElementById('loginSection');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const ordersList = document.getElementById('ordersList');
const salesTableBody = document.getElementById('salesTableBody');
const inventoryList = document.getElementById('inventoryList');
const inventoryCount = document.getElementById('inventoryCount');
const productForm = document.getElementById('productForm');
const newProductBtn = document.getElementById('newProductBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const settingsForm = document.getElementById('settingsForm');
const qrImageInput = document.getElementById('qrImageInput');
const qrImagePreview = document.getElementById('qrImagePreview');
const brebImageInput = document.getElementById('brebImageInput');
const brebImagePreview = document.getElementById('brebImagePreview');
const activeOrdersCount = document.getElementById('activeOrdersCount');
const deliveredOrdersCount = document.getElementById('deliveredOrdersCount');
const incomeValue = document.getElementById('incomeValue');
const profitValue = document.getElementById('profitValue');
const pendingPaymentsList = document.getElementById('pendingPaymentsList');
const deliveryFeeInput = document.getElementById('deliveryFeeInput');
const customersTableBody = document.getElementById('customersTableBody');
const customersCount = document.getElementById('customersCount');
const ordersSearchInput = document.getElementById('ordersSearchInput');

let lastKnownOrderId = localStorage.getItem(storage.lastOrderSound) || null;
let soundArmed = false;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function getOrders() { return getJson(storage.orders, []); }
function getProducts() {
  const current = getJson(storage.products, []);
  if (!current.length) {
    setJson(storage.products, cfg.defaultProducts);
    return cfg.defaultProducts;
  }
  return current;
}
function saveProducts(products) { setJson(storage.products, products); }
function saveOrders(orders) { setJson(storage.orders, orders); }

function renderSettings() {
  const settings = getJson(storage.settings, {});
  if (settings.qrImage && qrImagePreview) {
    qrImagePreview.src = settings.qrImage;
    qrImagePreview.style.display = 'block';
  }
  if (settings.brebImage && brebImagePreview) {
    brebImagePreview.src = settings.brebImage;
    brebImagePreview.style.display = 'block';
  }
  if (deliveryFeeInput) {
    deliveryFeeInput.value = settings.deliveryFee !== undefined ? settings.deliveryFee : cfg.deliveryFee;
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => resolve(r.result);
    r.onerror = (e) => reject(e);
  });
}

function formatDate(date) {
  return new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function maybePlaySound(newestOrderId) {
  if (!soundArmed || !newestOrderId || newestOrderId === lastKnownOrderId) return;
  
  const audio = new Audio('public/new-order.mp3');
  audio.play().catch(e => console.error("Error reproduciendo sonido:", e));
  
  lastKnownOrderId = newestOrderId;
  localStorage.setItem(storage.lastOrderSound, newestOrderId);
}

function badge(status) {
  const label = { pendiente: 'Pendiente', preparacion: 'Preparación', encamino: 'En camino', entregado: 'Entregado' }[status] || status;
  return `<span class="badge ${status}">${label}</span>`;
}

function setStatus(orderId, status) {
  const orders = getOrders().map((order) => order.id === orderId ? { ...order, status } : order);
  saveOrders(orders);
  renderAll();
  showToast(`Pedido ${orderId} actualizado a ${status}.`);
}

window.confirmPayment = (orderId) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    orders[idx].paymentConfirmed = true;
    saveOrders(orders);
    renderAll();
    showToast('Pago de pedido confirmado.');
  }
};

function deleteOrder(orderId) {
  saveOrders(getOrders().filter((order) => order.id !== orderId));
  renderAll();
  showToast(`Pedido ${orderId} eliminado.`);
}

function renderOrders() {
  const orders = getOrders();
  const newestId = orders[0]?.id;
  if (!orders.length) {
    ordersList.innerHTML = `
      <div class="empty-state" style="padding:60px 24px;">
        <div style="font-size:3rem;margin-bottom:12px;">🍕</div>
        <strong style="display:block;font-size:1.1rem;color:var(--secondary);margin-bottom:6px;">Sin pedidos por ahora</strong>
        <span>Los nuevos pedidos aparecerán aquí en tiempo real.</span>
      </div>`;
    return;
  }
  maybePlaySound(newestId);

  const query = (ordersSearchInput?.value || '').toLowerCase().trim();
  const filtered = query
    ? orders.filter(o =>
        (o.id || '').toLowerCase().includes(query) ||
        (o.customer?.name || '').toLowerCase().includes(query) ||
        (o.customer?.apartment || '').toLowerCase().includes(query) ||
        (o.customer?.tower || '').toLowerCase().includes(query) ||
        (o.customer?.complex || '').toLowerCase().includes(query) ||
        (o.status || '').toLowerCase().includes(query)
      )
    : orders;

  if (!filtered.length && query) {
    ordersList.innerHTML = `<div class="empty-state">❌ Sin resultados para "<strong>${escapeHTML(query)}</strong>".</div>`;
    return;
  }

  const statusPriority = { preparacion: 0, encamino: 1, pendiente: 2, entregado: 3 };
  const statusMeta = {
    pendiente:   { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   icon: '🕐', border: 'rgba(245,158,11,0.25)' },
    preparacion: { label: 'En preparación', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '👨‍🍳', border: 'rgba(16,185,129,0.25)' },
    encamino:    { label: 'En camino',    color: '#ff4500', bg: 'rgba(255,69,0,0.07)',    icon: '🛵', border: 'rgba(255,69,0,0.25)' },
    entregado:   { label: 'Entregado',    color: '#6b7280', bg: 'rgba(107,114,128,0.06)', icon: '✅', border: 'rgba(107,114,128,0.2)' },
  };

  const sorted = [...filtered]
    .reverse()
    .sort((a, b) => (statusPriority[a.status] ?? 2) - (statusPriority[b.status] ?? 2));

  const paymentLabel = m => m === 'qr' ? '📱 QR' : m === 'breb' ? '🔑 Bre-B' : '💵 Efectivo';

  ordersList.innerHTML = sorted.map((order, idx) => {
    const sm = statusMeta[order.status] || statusMeta.pendiente;
    const isActive = order.status !== 'entregado';
    const discount = order.discount > 0 ? `<span style="color:var(--success);font-weight:700;">-${money(order.discount)}</span>` : '';

    // Items list
    const itemsList = order.items.map(item =>
      `<div class="oc-item-row">
        <span class="oc-item-dot" style="background:${sm.color};"></span>
        <span class="oc-item-name">${escapeHTML(item.name)}</span>
        <span class="oc-item-size">${escapeHTML(item.sizeLabel || '')}</span>
        ${item.removed?.length ? `<span class="oc-item-removed">sin ${escapeHTML(item.removed.join(', '))}</span>` : ''}
        <span class="oc-item-price">${money(item.price)}</span>
      </div>`
    ).join('');

    // Payment block
    const payBlock = `
      <div class="oc-pay-row">
        <span>${paymentLabel(order.paymentMethod)}</span>
        ${order.paymentMethod && order.paymentMethod !== 'efectivo'
          ? order.paymentConfirmed
            ? `<span class="oc-tag success">✅ Pago confirmado</span>`
            : `<span class="oc-tag warning">⏳ Pendiente</span>
               <button class="oc-action-btn" onclick="confirmPayment('${order.id}')">Validar pago</button>`
          : ''}
        ${order.receiptBase64
          ? `<a href="javascript:void(0)" onclick="const w=window.open('','_blank');w.document.write('<img src=\\'${order.receiptBase64}\\' style=\\'max-width:100%;\\'/>');return false;"
              class="oc-action-btn">🖼️ Comprobante</a>`
          : ''}
      </div>`;

    // Coupon
    const couponBlock = order.couponId ? `
      <div class="oc-info-row">
        <span class="oc-label">🎟️ Cupón</span>
        <span style="color:var(--success);font-weight:600;">${order.couponId} &mdash; Descuento: ${money(order.discount || 0)}</span>
      </div>` : '';

    // Rating
    const ratingBlock = order.rating ? `
      <div class="oc-rating-bar">
        <span style="font-weight:700;color:var(--warning)">${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)}</span>
        ${order.review ? `<em style="color:var(--muted);font-size:0.85rem;">"${escapeHTML(order.review)}"</em>` : ''}
      </div>` : '';

    // Status buttons
    const statusBtns = ['pendiente','preparacion','encamino','entregado'].map(s => {
      const active = order.status === s;
      const sm2 = statusMeta[s];
      return `<button class="oc-status-btn ${active ? 'oc-status-active' : ''}"
        style="${active ? `background:${sm2.color};color:#fff;border-color:${sm2.color};` : ''}"
        data-status="${s}" data-order-id="${order.id}">
        ${sm2.icon} ${sm2.label}
      </button>`;
    }).join('');

    return `
    <article class="oc-card" style="border-left:4px solid ${sm.color};">
      <!-- HEADER -->
      <div class="oc-header" style="background:${sm.bg};">
        <div class="oc-header-left">
          <span class="oc-num" style="background:${sm.color};">${idx + 1}</span>
          <div>
            <div class="oc-id">${escapeHTML(order.id)}</div>
            <div class="oc-meta">${formatDate(order.createdAt)}</div>
          </div>
        </div>
        <div class="oc-header-right">
          <span class="oc-status-pill" style="background:${sm.bg};color:${sm.color};border:1px solid ${sm.border};">
            ${sm.icon} ${sm.label}
          </span>
          <span class="oc-total">${money(order.total)}</span>
        </div>
      </div>

      <!-- BODY: Two columns -->
      <div class="oc-body">
        <!-- LEFT: Client & location -->
        <div class="oc-col">
          <p class="oc-col-title">👤 Cliente</p>
          <div class="oc-info-row"><span class="oc-label">Nombre</span><strong>${escapeHTML(order.customer.name)}</strong></div>
          <div class="oc-info-row"><span class="oc-label">Ubicación</span><span>${escapeHTML(order.customer.complex)}, T${escapeHTML(order.customer.tower)}, Apto ${escapeHTML(order.customer.apartment)}</span></div>
          ${order.customer.phone ? `<div class="oc-info-row"><span class="oc-label">Teléfono</span><a href="https://wa.me/57${order.customer.phone.replace(/\D/g,'')}" target="_blank" style="color:var(--success);font-weight:600;text-decoration:none;">💬 ${escapeHTML(order.customer.phone)}</a></div>` : ''}
          ${order.notes ? `<div class="oc-info-row"><span class="oc-label">Nota</span><em style="color:var(--muted);">${escapeHTML(order.notes)}</em></div>` : ''}
          ${couponBlock}
        </div>

        <!-- RIGHT: Items & payment -->
        <div class="oc-col">
          <p class="oc-col-title">🍕 Pedido</p>
          <div class="oc-items-list">${itemsList}</div>
          <div class="oc-price-summary">
            ${order.discount > 0 ? `<div class="oc-price-row"><span>Descuento</span>${discount}</div>` : ''}
            <div class="oc-price-row oc-price-total"><span>Total</span><strong>${money(order.total)}</strong></div>
          </div>
          <p class="oc-col-title" style="margin-top:12px;">💳 Pago</p>
          ${payBlock}
        </div>
      </div>

      ${ratingBlock}

      <!-- FOOTER: Status + Delete -->
      <div class="oc-footer">
        <div class="oc-status-group">${statusBtns}</div>
        <button class="oc-delete-btn" data-delete-id="${order.id}">🗑️ Eliminar</button>
      </div>
    </article>`;
  }).join('');

  ordersList.querySelectorAll('[data-status]').forEach(btn =>
    btn.addEventListener('click', () => setStatus(btn.dataset.orderId, btn.dataset.status)));
  ordersList.querySelectorAll('[data-delete-id]').forEach(btn =>
    btn.addEventListener('click', () => deleteOrder(btn.dataset.deleteId)));
}

function renderSales() {
  const delivered = getOrders().filter((order) => order.status === 'entregado');
  salesTableBody.innerHTML = delivered.length ? delivered.map((order) => `
    <tr>
      <td>${escapeHTML(order.id)}</td>
      <td>${escapeHTML(order.customer.name)}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${money(order.total)}</td>
      <td>${money(order.cost)}</td>
      <td>${money(order.estimatedProfit)}</td>
    </tr>
  `).join('') : '<tr><td colspan="6">Aún no hay pedidos entregados.</td></tr>';
}

function fillProductForm(product) {
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('productName').value = product?.name || '';
  document.getElementById('productIngredients').value = product?.ingredients || '';
  document.getElementById('productOptions').value = (product?.removableOptions || []).join(', ');
  document.getElementById('pricePersonal').value = product?.prices?.personal || 0;
  document.getElementById('costPersonal').value = product?.costs?.personal || 0;
  document.getElementById('stockPersonal').value = product?.stock?.personal || 0;
  document.getElementById('priceSmall').value = product?.prices?.small || 0;
  document.getElementById('costSmall').value = product?.costs?.small || 0;
  document.getElementById('stockSmall').value = product?.stock?.small || 0;
  document.getElementById('priceMedium').value = product?.prices?.medium || 0;
  document.getElementById('costMedium').value = product?.costs?.medium || 0;
  document.getElementById('stockMedium').value = product?.stock?.medium || 0;
}

function resetProductForm() {
  fillProductForm(null);
}

function adjustStock(productId, sizeKey, change) {
  const products = getProducts().map((product) => {
    if (product.id !== productId) return product;
    return {
      ...product,
      stock: {
        ...product.stock,
        [sizeKey]: Math.max(0, Number(product.stock?.[sizeKey] || 0) + change)
      }
    };
  });
  saveProducts(products);
  renderInventory();
  renderDashboard();
}

function renderInventory() {
  const products = getProducts();
  inventoryCount.textContent = `${products.length} sabores`;

  inventoryList.innerHTML = products.length ? products.map((product) => `
    <div class="inventory-row inventory-row-stacked">
      <div class="inventory-main">
        <strong>${escapeHTML(product.name)}</strong>
        <div class="menu-meta">${escapeHTML(product.ingredients)}</div>
        <div class="inventory-sizes">
          ${Object.entries(sizes).map(([key, info]) => `
            <div class="inventory-size-pill">
              <span>${escapeHTML(info.shortLabel)}</span>
              <strong>${money(product?.prices?.[key] || 0)}</strong>
              <small>costo ${money(product?.costs?.[key] || 0)} · stock ${Number(product?.stock?.[key] || 0)}</small>
              <div class="inventory-actions compact">
                <button class="mini-btn" data-stock-change="1" data-size-key="${key}" data-product-id="${product.id}">+1</button>
                <button class="mini-btn" data-stock-change="-1" data-size-key="${key}" data-product-id="${product.id}">-1</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="menu-meta">Ingredientes removibles: ${(product.removableOptions || []).length ? escapeHTML(product.removableOptions.join(', ')) : 'No configurados'}</div>
      </div>
      <div class="inventory-actions">
        <button class="mini-btn" data-edit-product-id="${product.id}">Editar</button>
        <button class="mini-btn danger" data-remove-product-id="${product.id}">Borrar</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state">No hay productos creados.</div>';

  inventoryList.querySelectorAll('[data-stock-change]').forEach((btn) => {
    btn.addEventListener('click', () => adjustStock(btn.dataset.productId, btn.dataset.sizeKey, Number(btn.dataset.stockChange)));
  });

  inventoryList.querySelectorAll('[data-edit-product-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = getProducts().find((item) => item.id === btn.dataset.editProductId);
      fillProductForm(product);
      showToast(`Editando ${product?.name || 'producto'}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  inventoryList.querySelectorAll('[data-remove-product-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      saveProducts(getProducts().filter((product) => product.id !== btn.dataset.removeProductId));
      renderInventory();
      renderDashboard();
      showToast('Producto eliminado.');
    });
  });
}

function renderDashboard() {
  const orders = getOrders();
  const active = orders.filter((o) => o.status !== 'entregado').length;
  const delivered = orders.filter((o) => o.status === 'entregado');
  const totalIncome   = delivered.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const cashIncome    = delivered.filter(o => o.paymentMethod === 'efectivo').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const digitalIncome = totalIncome - cashIncome;
  const totalProfit   = Math.round(totalIncome * (cfg.profitRate || 0.30));

  activeOrdersCount.textContent    = active;
  deliveredOrdersCount.textContent = delivered.length;
  incomeValue.textContent          = money(totalIncome);
  profitValue.textContent          = money(totalProfit);

  const cashEl    = document.getElementById('cashIncomeValue');
  const digitalEl = document.getElementById('digitalIncomeValue');
  if (cashEl)    cashEl.textContent    = money(cashIncome);
  if (digitalEl) digitalEl.textContent = money(digitalIncome);
}

function renderPendingPayments() {
  if (!pendingPaymentsList) return;
  const orders = getOrders();
  const pending = orders.filter(o => o.paymentMethod !== 'efectivo' && !o.paymentConfirmed && o.receiptBase64);
  
  if (!pending.length) {
    pendingPaymentsList.innerHTML = '<div class="empty-state">No hay comprobantes pendientes por validar.</div>';
    return;
  }
  
  pendingPaymentsList.innerHTML = pending.map(order => `
    <article class="order-card">
      <div class="order-header">
        <div>
          <h3>${escapeHTML(order.id)}</h3>
          <div class="menu-meta">${formatDate(order.createdAt)} · ${escapeHTML(order.customer.name)}</div>
        </div>
        ${badge(order.status)}
      </div>
      <div class="order-body">
        <div><strong>Método:</strong> ${order.paymentMethod === 'qr' ? '📱 App/QR' : '🔑 Bre-B'}</div>
        <div><strong>Total:</strong> <span style="color:var(--primary); font-weight:bold;">${money(order.total)}</span></div>
        <div style="margin-top:8px;">
          <a href="javascript:void(0)" onclick="const w=window.open('','_blank');w.document.write('<img src=\\'${order.receiptBase64}\\' style=\\'max-width:100%;\\'/>');" style="color:var(--primary); text-decoration:underline; font-weight:bold; font-size:0.9rem;">🖼️ Ver comprobante de pago</a>
        </div>
        <div style="margin-top:12px; display:flex; justify-content:flex-end;">
          <button class="primary-btn mt-2" onclick="confirmPayment('${order.id}')">Confirmar Pago</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderCustomers() {
  if (!customersTableBody) return;
  const users = getJson(storage.users, []);
  const coupons = getJson('restaurant_coupons_v2', {});
  if (customersCount) customersCount.textContent = `${users.length} clientes`;

  if (!users.length) {
    customersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aún no hay clientes registrados.</td></tr>';
    return;
  }

  customersTableBody.innerHTML = users.map(user => {
    const userCoupons = coupons[user.clientId] || [];
    const now = Date.now();
    const activeCoupons = userCoupons.filter(c => new Date(c.expiresAt).getTime() > now);
    const expiredCount = userCoupons.length - activeCoupons.length;

    const couponChips = userCoupons.length
      ? userCoupons.map(c => {
          const isExpired = new Date(c.expiresAt).getTime() <= now;
          return `<span class="coupon-chip ${isExpired ? 'expired' : ''}" title="Vence: ${new Date(c.expiresAt).toLocaleString('es-CO')}">
            ${c.type === 'percent' ? `${c.value}% OFF` : `$${Number(c.value).toLocaleString('es-CO')}`}
            ${isExpired ? '⌛' : '✅'}
            <button class="chip-del" data-delete-coupon="${c.id}" data-client-id="${user.clientId}" title="Eliminar cupón">×</button>
          </span>`;
        }).join('')
      : '<span style="color:var(--muted);font-size:0.82rem;">Sin cupones</span>';

    return `
      <tr>
        <td><strong>${escapeHTML(user.name)}</strong></td>
        <td>${escapeHTML(user.username)}</td>
        <td>
          ${user.phone
            ? `<a href="https://wa.me/57${user.phone.replace(/\D/g, '')}" target="_blank" style="color:var(--primary);font-weight:bold;text-decoration:underline;">&#128172; ${escapeHTML(user.phone)}</a>`
            : '<span style="color:var(--muted)">Sin teléfono</span>'}
        </td>
        <td>${escapeHTML(user.complex)}, ${escapeHTML(user.tower)}</td>
        <td>${escapeHTML(user.apartment)}</td>
        <td style="text-align:center;">
          <div class="customer-row-coupons">${couponChips}</div>
        </td>
        <td style="text-align:center;">
          <button class="mini-btn" style="background:linear-gradient(135deg,rgba(255,69,0,0.1),rgba(255,107,53,0.06));color:var(--primary);border:1px solid rgba(255,69,0,0.2);border-radius:12px;padding:8px 14px;white-space:nowrap;"
            data-send-coupon-client-id="${user.clientId}"
            data-send-coupon-client-name="${escapeHTML(user.name)}">
            🎟️ Enviar cupón
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Delete coupon chips
  customersTableBody.querySelectorAll('[data-delete-coupon]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { deleteCoupon, clientId } = btn.dataset;
      deleteCouponForClient(clientId, deleteCoupon === 'true' ? btn.dataset.deleteCoupon : btn.dataset.deleteCoupon);
    });
  });

  // Send coupon buttons
  customersTableBody.querySelectorAll('[data-send-coupon-client-id]').forEach(btn => {
    btn.addEventListener('click', () => openCouponModal(btn.dataset.sendCouponClientId, btn.dataset.sendCouponClientName));
  });
}

function renderAll() {
  renderOrders();
  renderSales();
  renderInventory();
  renderDashboard();
  renderSettings();
  renderPendingPayments();
  renderCustomers();
  renderAdditionals();
}

function checkSession() {
  const session = localStorage.getItem(storage.adminSession);
  const loggedIn = session === 'true';
  loginSection.classList.toggle('hidden', loggedIn);
  adminPanel.classList.toggle('hidden', !loggedIn);
  logoutBtn.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    renderAll();
    soundArmed = true;
  }
}

async function hashPass(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPassword').value.trim();
  const btn = loginForm.querySelector('button[type="submit"]');
  
  if (!user || !pass) return showToast('Ingresa usuario y contraseña.');
  
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  
  try {
    const hash = await hashPass(pass);
    // Verificar que el usuario sea admin y que la contraseña coincida con familia12 a través de su hash
    if (user === 'admin' && hash === '8072db95acfdbcc1ba779cc6738253eb8fd3b05b691dc181af6ab1fe41f802f3') {
      localStorage.setItem(storage.adminSession, 'true');
      soundArmed = true;
      showToast('Bienvenido al panel.');
      checkSession();
    } else {
      showToast('Usuario o contraseña incorrectos.');
    }
  } catch (err) {
    showToast('Error interno validando contraseña.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(storage.adminSession);
  checkSession();
});

productForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value.trim();
  const product = {
    id: id || crypto.randomUUID(),
    category: 'pizza',
    name: document.getElementById('productName').value.trim(),
    ingredients: document.getElementById('productIngredients').value.trim(),
    removableOptions: document.getElementById('productOptions').value.split(',').map((item) => item.trim()).filter(Boolean),
    prices: {
      personal: Number(document.getElementById('pricePersonal').value || 0),
      small: Number(document.getElementById('priceSmall').value || 0),
      medium: Number(document.getElementById('priceMedium').value || 0)
    },
    costs: {
      personal: Number(document.getElementById('costPersonal').value || 0),
      small: Number(document.getElementById('costSmall').value || 0),
      medium: Number(document.getElementById('costMedium').value || 0)
    },
    stock: {
      personal: Number(document.getElementById('stockPersonal').value || 0),
      small: Number(document.getElementById('stockSmall').value || 0),
      medium: Number(document.getElementById('stockMedium').value || 0)
    }
  };

  const products = getProducts();
  const exists = products.some((item) => item.id === product.id);
  const updated = exists
    ? products.map((item) => item.id === product.id ? product : item)
    : [product, ...products];

  saveProducts(updated);
  resetProductForm();
  renderInventory();
  showToast(exists ? 'Producto actualizado.' : 'Producto creado.');
});

newProductBtn.addEventListener('click', resetProductForm);
cancelEditBtn.addEventListener('click', resetProductForm);

if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = settingsForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    try {
      const settings = getJson(storage.settings, {});
      if (qrImageInput.files.length > 0) {
        settings.qrImage = await toBase64(qrImageInput.files[0]);
      }
      if (brebImageInput.files.length > 0) {
        settings.brebImage = await toBase64(brebImageInput.files[0]);
      }
      if (deliveryFeeInput && deliveryFeeInput.value !== '') {
        settings.deliveryFee = Number(deliveryFeeInput.value);
      }
      setJson(storage.settings, settings);
      showToast('Configuración guardada correctamente.');
      renderSettings();
      qrImageInput.value = '';
      brebImageInput.value = '';
    } catch (err) {
      showToast('Error subiendo imagen.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar imágenes y configuración';
    }
  });
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  });
});

if (ordersSearchInput) {
  ordersSearchInput.addEventListener('input', () => renderOrders());
}

window.addEventListener('storage', renderAll);
setInterval(() => {
  if (localStorage.getItem(storage.adminSession) === 'true') renderAll();
}, 2500);

/* ─── COUPON SYSTEM LOGIC ─────────────────────────────────────── */
const couponModal = document.getElementById('couponModalOverlay');
const couponModalClientName = document.getElementById('couponModalClientName');
const couponTypeInput = document.getElementById('couponTypeInput');
const couponValueInput = document.getElementById('couponValueInput');
const couponExpiryInput = document.getElementById('couponExpiryInput');
const couponDescInput = document.getElementById('couponDescInput');
const cpPreviewAmount = document.getElementById('cpPreviewAmount');
const cpPreviewDesc = document.getElementById('cpPreviewDesc');
const cpPreviewExpiry = document.getElementById('cpPreviewExpiry');
const couponValueLabel = document.getElementById('couponValueLabel');

let _couponTargetClientId = null;

function openCouponModal(clientId, clientName) {
  _couponTargetClientId = clientId;
  couponModalClientName.textContent = `Para: ${clientName}`;

  // Set default expiry to 7 days from now
  const def = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  couponExpiryInput.value = def.toISOString().slice(0, 16);
  couponValueInput.value = '';
  couponDescInput.value = '';
  couponTypeInput.value = 'fixed';
  updateCouponLabel();
  updateCouponPreview();
  couponModal.classList.remove('hidden');
}

function closeCouponModal() {
  couponModal.classList.add('hidden');
  _couponTargetClientId = null;
}

function updateCouponLabel() {
  couponValueLabel.textContent = couponTypeInput.value === 'percent'
    ? 'Porcentaje de descuento (%)' : 'Valor del descuento ($)';
}

function updateCouponPreview() {
  const val = Number(couponValueInput.value) || 0;
  const type = couponTypeInput.value;
  const desc = couponDescInput.value.trim() || 'Descuento especial';
  const expiry = couponExpiryInput.value;

  cpPreviewAmount.textContent = type === 'percent'
    ? `${val}% OFF`
    : `$${val.toLocaleString('es-CO')}`;
  cpPreviewDesc.textContent = desc;
  cpPreviewExpiry.textContent = expiry
    ? `Vence: ${new Date(expiry).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Vence: —';
}

couponTypeInput.addEventListener('change', () => { updateCouponLabel(); updateCouponPreview(); });
[couponValueInput, couponDescInput, couponExpiryInput].forEach(el => el.addEventListener('input', updateCouponPreview));

function deleteCouponForClient(clientId, couponId) {
  const coupons = getJson('restaurant_coupons_v2', {});
  if (!coupons[clientId]) return;
  coupons[clientId] = coupons[clientId].filter(c => c.id !== couponId);
  setJson('restaurant_coupons_v2', coupons);
  renderCustomers();
  showToast('Cupón eliminado.');
}

document.getElementById('couponModalCancelBtn').addEventListener('click', closeCouponModal);
couponModal.addEventListener('click', e => { if (e.target === couponModal) closeCouponModal(); });

document.getElementById('couponModalSendBtn').addEventListener('click', () => {
  const val = Number(couponValueInput.value);
  const type = couponTypeInput.value;
  const expiry = couponExpiryInput.value;
  const desc = couponDescInput.value.trim() || 'Descuento especial';

  if (!val || val <= 0) return showToast('Ingresa un valor válido para el cupón.');
  if (!expiry) return showToast('Selecciona una fecha de vencimiento.');
  if (type === 'percent' && (val < 1 || val > 100)) return showToast('El porcentaje debe estar entre 1 y 100.');
  if (new Date(expiry).getTime() <= Date.now()) return showToast('La fecha de vencimiento debe ser en el futuro.');

  const coupons = getJson('restaurant_coupons_v2', {});
  if (!coupons[_couponTargetClientId]) coupons[_couponTargetClientId] = [];

  const newCoupon = {
    id: `CUP-${Date.now().toString().slice(-8)}`,
    type,
    value: val,
    description: desc,
    expiresAt: new Date(expiry).toISOString(),
    createdAt: new Date().toISOString(),
    redeemed: false
  };

  coupons[_couponTargetClientId].push(newCoupon);
  setJson('restaurant_coupons_v2', coupons);
  closeCouponModal();
  renderCustomers();
  showToast(`🎟️ Cupón enviado correctamente.`);
});


/* ─── ADDITIONALS SYSTEM ──────────────────────────────────────── */
const additionalForm    = document.getElementById('additionalForm');
const newAddlBtn        = document.getElementById('newAddlBtn');
const cancelAddlBtn     = document.getElementById('cancelAddlBtn');
const additionalsList   = document.getElementById('additionalsList');
const addlCount         = document.getElementById('addlCount');

function getExtras() {
  const stored = getJson(storage.extras, null);
  if (stored && Array.isArray(stored) && stored.length) return stored;
  return cfg.defaultExtras;
}

function saveExtras(extras) {
  setJson(storage.extras, extras);
}

function fillAddlForm(extra) {
  document.getElementById('addlId').value       = extra?.id || '';
  document.getElementById('addlName').value     = extra?.name || '';
  document.getElementById('addlPrice').value    = extra?.price || '';
  document.getElementById('addlCategory').value = extra?.category || '';
}

function resetAddlForm() { fillAddlForm(null); }

function renderAdditionals() {
  if (!additionalsList) return;
  const extras = getExtras();
  if (addlCount) addlCount.textContent = `${extras.length} adicionales`;

  if (!extras.length) {
    additionalsList.innerHTML = '<div class="empty-state">No hay adicionales configurados.</div>';
    return;
  }

  // Group by category
  const groups = {};
  extras.forEach(ex => {
    const cat = ex.category || 'Sin categoría';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ex);
  });

  additionalsList.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="addl-category-block">
      <div class="addl-cat-header">
        <span class="addl-cat-badge">${escapeHTML(cat)}</span>
        <span class="menu-meta">${items.length} ingrediente${items.length !== 1 ? 's' : ''}</span>
      </div>
      ${items.map(ex => `
        <div class="addl-row">
          <div class="addl-row-info">
            <strong>${escapeHTML(ex.name)}</strong>
            <span class="addl-price-badge">${money(ex.price)} c/u</span>
          </div>
          <div class="addl-row-actions">
            <button class="mini-btn" data-edit-addl="${ex.id}">✏️ Editar</button>
            <button class="mini-btn danger" data-del-addl="${ex.id}">🗑️ Borrar</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  additionalsList.querySelectorAll('[data-edit-addl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ex = getExtras().find(e => e.id === btn.dataset.editAddl);
      if (ex) { fillAddlForm(ex); showToast(`Editando: ${ex.name}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  });

  additionalsList.querySelectorAll('[data-del-addl]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveExtras(getExtras().filter(e => e.id !== btn.dataset.delAddl));
      renderAdditionals();
      showToast('Adicional eliminado.');
    });
  });
}

if (additionalForm) {
  additionalForm.addEventListener('submit', e => {
    e.preventDefault();
    const id   = document.getElementById('addlId').value.trim();
    const name = document.getElementById('addlName').value.trim();
    const price = Number(document.getElementById('addlPrice').value);
    const cat  = document.getElementById('addlCategory').value.trim();

    if (!name) return showToast('Ingresa el nombre del ingrediente.');
    if (!price || price < 0) return showToast('Ingresa un precio válido.');

    const extras = getExtras();
    const existing = extras.findIndex(e => e.id === id);
    const newExtra = { id: id || `ext-${Date.now()}`, name, price, category: cat || 'Otros' };

    if (existing >= 0) extras[existing] = newExtra;
    else extras.push(newExtra);

    saveExtras(extras);
    resetAddlForm();
    renderAdditionals();
    showToast(existing >= 0 ? `✅ "${name}" actualizado.` : `✅ "${name}" agregado.`);
  });
}

if (newAddlBtn)    newAddlBtn.addEventListener('click', resetAddlForm);
if (cancelAddlBtn) cancelAddlBtn.addEventListener('click', resetAddlForm);

resetProductForm();
checkSession();

/* ══════════════════════════════════════════════════════════════════════
   SISTEMA DE CIERRE DE CAJA DIARIO
══════════════════════════════════════════════════════════════════════ */

// ─── Helpers de fecha ───────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function dateStr(d) {
  // Returns YYYY-MM-DD from an ISO string or Date
  return new Date(d).toISOString().slice(0, 10);
}
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Storage helpers ─────────────────────────────────────────────────
function getExpenses() { return getJson(storage.expenses, []); }
function saveExpensesStore(arr) { setJson(storage.expenses, arr); }
function getCashCounts() { return getJson(storage.cashCounts, []); }
function saveCashCounts(arr) { setJson(storage.cashCounts, arr); }

// ─── DOM refs (declared lazily — only exist when page is loaded) ─────
const cashDateInput      = document.getElementById('cashDateInput');
const expenseForm        = document.getElementById('expenseForm');
const expenseDesc        = document.getElementById('expenseDesc');
const expenseAmt         = document.getElementById('expenseAmt');
const expenseCat         = document.getElementById('expenseCat');
const expensesList       = document.getElementById('expensesList');
const cashSummaryBox     = document.getElementById('cashSummaryBox');
const cashCountInput     = document.getElementById('cashCountInput');
const transferCountInput = document.getElementById('transferCountInput');
const closeCashBtn       = document.getElementById('closeCashBtn');
const cashHistoryList    = document.getElementById('cashHistoryList');

// ─── Core render ─────────────────────────────────────────────────────
function renderCashRegister() {
  if (!cashDateInput) return;
  const date = cashDateInput.value || todayStr();
  _renderDaySummary(date);
  _renderDayExpenses(date);
  _renderCashHistory();
}

function _renderDaySummary(date) {
  if (!cashSummaryBox) return;

  const RATE = cfg.profitRate || 0.30;
  const allOrders = getOrders();
  const dayOrders = allOrders.filter(o =>
    o.status === 'entregado' && dateStr(o.createdAt) === date
  );

  const totalSales    = dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const cashSales     = dayOrders.filter(o => o.paymentMethod === 'efectivo').reduce((s, o) => s + Number(o.total || 0), 0);
  const digitalSales  = totalSales - cashSales;
  const grossProfit   = Math.round(totalSales * RATE);
  const totalExpenses = getExpenses().filter(e => e.date === date).reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit     = grossProfit - totalExpenses;
  const cashCounted   = Number(cashCountInput?.value || 0);
  const cashDiff      = cashCounted - cashSales;

  const diffColor = cashDiff > 0 ? 'var(--success)' : cashDiff < 0 ? 'var(--danger)' : 'var(--muted)';
  const netColor  = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';

  cashSummaryBox.innerHTML = `
    <!-- ─ HEADER ─ -->
    <div class="cr-section-header">
      <span class="cr-date-badge">${formatDateLong(date)}</span>
      <span class="pill ${dayOrders.length ? 'success' : ''}">${dayOrders.length} pedido${dayOrders.length !== 1 ? 's' : ''} entregado${dayOrders.length !== 1 ? 's' : ''}</span>
    </div>

    <!-- ─ VENTAS ─ -->
    <div class="cr-block">
      <p class="cr-block-title">💰 Resumen de Ventas</p>
      <div class="cr-row"><span>Ingresos totales del día</span><strong>${money(totalSales)}</strong></div>
      <div class="cr-row accent"><span>📦 Efectivo recibido</span><strong>${money(cashSales)}</strong></div>
      <div class="cr-row"><span>📱 Pagos digitales (QR / Bre-B)</span><strong>${money(digitalSales)}</strong></div>
    </div>

    <!-- ─ RENTABILIDAD ─ -->
    <div class="cr-block">
      <p class="cr-block-title">📊 Rentabilidad (${Math.round(RATE * 100)}%)</p>
      <div class="cr-row"><span>Ganancia bruta (${Math.round(RATE * 100)}% de ventas)</span><strong style="color:var(--success)">${money(grossProfit)}</strong></div>
      <div class="cr-row"><span>Total gastos / insumos del día</span><strong style="color:var(--danger)">- ${money(totalExpenses)}</strong></div>
      <div class="cr-row cr-total"><span>Ganancia neta</span><strong style="color:${netColor}">${money(netProfit)}</strong></div>
    </div>

    <!-- ─ ARQUEO ─ -->
    <div class="cr-block">
      <p class="cr-block-title">🏦 Arqueo de Caja</p>
      <div class="cr-row"><span>Efectivo esperado en caja</span><strong>${money(cashSales)}</strong></div>
      <div class="cr-row"><span>Efectivo físico contado</span><strong>${money(cashCounted)}</strong></div>
      <div class="cr-row cr-diff" style="border-top:2px solid var(--line);margin-top:8px;padding-top:8px;">
        <span>Diferencia</span>
        <strong style="color:${diffColor}">${cashDiff >= 0 ? '+' : ''}${money(cashDiff)}</strong>
      </div>
      <div class="cr-diff-label" style="color:${diffColor}">
        ${cashDiff > 0 ? '✅ Hay sobrante en caja' : cashDiff < 0 ? '⚠️ Falta efectivo — revisar' : cashCounted > 0 ? '✅ Caja cuadrada exactamente' : '⏳ Ingresa el efectivo contado abajo'}
      </div>
    </div>

    <!-- ─ PEDIDOS DEL DÍA ─ -->
    ${dayOrders.length ? `
    <div class="cr-block">
      <p class="cr-block-title">🍕 Detalle de Pedidos</p>
      ${dayOrders.map(o => `
        <div class="cr-order-row">
          <div>
            <span class="cr-order-id">${escapeHTML(o.id)}</span>
            <span style="color:var(--muted);font-size:0.78rem;"> · ${escapeHTML(o.customer?.name || '—')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="cr-pay-chip ${o.paymentMethod === 'efectivo' ? 'cash' : 'digital'}">${o.paymentMethod === 'efectivo' ? '💵' : '📱'} ${o.paymentMethod === 'efectivo' ? 'Efectivo' : o.paymentMethod.toUpperCase()}</span>
            <strong>${money(o.total)}</strong>
          </div>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  // Store computed values for the close button
  cashSummaryBox.dataset.totalSales   = totalSales;
  cashSummaryBox.dataset.cashSales    = cashSales;
  cashSummaryBox.dataset.digitalSales = digitalSales;
  cashSummaryBox.dataset.grossProfit  = grossProfit;
  cashSummaryBox.dataset.totalExpenses = totalExpenses;
  cashSummaryBox.dataset.netProfit    = netProfit;
  cashSummaryBox.dataset.ordersCount  = dayOrders.length;
}

function _renderDayExpenses(date) {
  if (!expensesList) return;
  const dayExpenses = getExpenses().filter(e => e.date === date);
  const total = dayExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  if (!dayExpenses.length) {
    expensesList.innerHTML = '<div class="empty-state" style="padding:24px;">Sin gastos registrados para este día.</div>';
  } else {
    // Group by category
    const groups = {};
    dayExpenses.forEach(e => {
      const cat = e.category || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    });

    expensesList.innerHTML = Object.entries(groups).map(([cat, items]) => `
      <div class="exp-cat-header">${escapeHTML(cat)}</div>
      ${items.map(e => `
        <div class="exp-row">
          <div class="exp-info">
            <span class="exp-desc">${escapeHTML(e.description)}</span>
            <span class="exp-time">${new Date(e.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="exp-actions">
            <strong class="exp-amount">- ${money(e.amount)}</strong>
            <button class="mini-btn danger" data-del-expense="${e.id}" title="Eliminar">🗑️</button>
          </div>
        </div>
      `).join('')}
    `).join('');

    expensesList.querySelectorAll('[data-del-expense]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveExpensesStore(getExpenses().filter(e => e.id !== btn.dataset.delExpense));
        renderCashRegister();
        showToast('Gasto eliminado.');
      });
    });
  }

  // Total footer
  const totalEl = document.getElementById('expensesTotalLine');
  if (totalEl) totalEl.innerHTML = `Total gastos: <strong>${money(total)}</strong>`;
}

function _renderCashHistory() {
  if (!cashHistoryList) return;
  const counts = getCashCounts().slice().reverse();
  if (!counts.length) {
    cashHistoryList.innerHTML = '<div class="empty-state" style="padding:24px;">Sin cierres registrados.</div>';
    return;
  }
  cashHistoryList.innerHTML = counts.map(c => {
    const totalReceived = (c.totalReceived ?? (c.cashCounted + (c.transferCounted || 0)));
    const diff     = c.cashDifference;
    const diffColor = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--muted)';
    return `
    <div class="cr-history-card">
      <div class="chc-header">
        <span class="chc-date">${formatDateLong(c.date)}</span>
        <span class="chc-time">${new Date(c.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="chc-grid">
        <div class="chc-item"><span>Ventas totales</span><strong>${money(c.totalSales)}</strong></div>
        <div class="chc-item"><span>💵 Efectivo (esperado)</span><strong>${money(c.cashSales)}</strong></div>
        <div class="chc-item"><span>📱 Digital (esperado)</span><strong>${money(c.digitalSales)}</strong></div>
        <div class="chc-item"><span>💵 Efectivo contado</span><strong>${money(c.cashCounted)}</strong></div>
        <div class="chc-item"><span>📱 Transferencias contadas</span><strong>${money(c.transferCounted || 0)}</strong></div>
        <div class="chc-item"><span>Total recibido</span><strong>${money(totalReceived)}</strong></div>
        <div class="chc-item"><span>Gastos</span><strong style="color:var(--danger)">${money(c.totalExpenses)}</strong></div>
        <div class="chc-item"><span>Ganancia bruta (30%)</span><strong style="color:var(--success)">${money(c.grossProfit)}</strong></div>
        <div class="chc-item"><span>Ganancia neta</span><strong style="color:${c.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${money(c.netProfit)}</strong></div>
        <div class="chc-item ${diff !== 0 ? 'chc-highlight' : ''}"><span>Diferencia arqueo</span><strong style="color:${diffColor}">${diff >= 0 ? '+' : ''}${money(diff)}</strong></div>
        ${c.notes ? `<div class="chc-item full"><span>Notas</span><em>${escapeHTML(c.notes)}</em></div>` : ''}
      </div>
      <div class="chc-footer">
        <span class="pill">${c.ordersCount} pedido${c.ordersCount !== 1 ? 's' : ''}</span>
        <button class="mini-btn danger" data-del-closing="${c.id}" style="font-size:0.78rem;">🗑️ Eliminar registro</button>
      </div>
    </div>`;
  }).join('');

  cashHistoryList.querySelectorAll('[data-del-closing]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar este registro de cierre?')) return;
      saveCashCounts(getCashCounts().filter(c => c.id !== btn.dataset.delClosing));
      _renderCashHistory();
      showToast('Registro eliminado.');
    });
  });
}

// ─── Event listeners ─────────────────────────────────────────────────
if (cashDateInput) {
  cashDateInput.value = todayStr();
  cashDateInput.addEventListener('change', renderCashRegister);
}

if (expenseForm) {
  expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const desc = expenseDesc?.value.trim();
    const amt  = Number(expenseAmt?.value);
    const cat  = expenseCat?.value.trim() || 'Otros';
    const date = cashDateInput?.value || todayStr();

    if (!desc) return showToast('Describe el gasto.');
    if (!amt || amt <= 0) return showToast('Ingresa un monto válido.');

    const expenses = getExpenses();
    expenses.push({ id: `exp-${Date.now()}`, date, description: desc, amount: amt, category: cat, createdAt: new Date().toISOString() });
    saveExpensesStore(expenses);
    expenseForm.reset();
    if (expenseCat) expenseCat.value = 'Insumos';
    renderCashRegister();
    showToast('Gasto registrado.');
  });
}

// Live arqueo box updater
function _updateArqueoBox() {
  const cash     = Number(cashCountInput?.value   || 0);
  const transfer = Number(transferCountInput?.value || 0);
  const total    = cash + transfer;
  const expected = Number(cashSummaryBox?.dataset?.totalSales || 0);
  const diff     = total - expected;
  const diffColor = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--muted)';

  const atbCash    = document.getElementById('atbCash');
  const atbDigital = document.getElementById('atbDigital');
  const atbTotal   = document.getElementById('atbTotal');
  const atbDiff    = document.getElementById('atbDiff');
  if (atbCash)    atbCash.textContent    = money(cash);
  if (atbDigital) atbDigital.textContent = money(transfer);
  if (atbTotal)   { atbTotal.textContent = money(total); atbTotal.style.color = 'var(--secondary)'; }
  if (atbDiff)    { atbDiff.textContent  = (diff >= 0 ? '+' : '') + money(diff); atbDiff.style.color = diffColor; }

  const box = document.getElementById('arqueoTotalBox');
  if (box) box.classList.toggle('arqueo-ok', diff === 0 && total > 0);
}

if (cashCountInput) {
  cashCountInput.addEventListener('input', () => {
    const date = cashDateInput?.value || todayStr();
    _renderDaySummary(date);
    _updateArqueoBox();
  });
}

if (transferCountInput) {
  transferCountInput.addEventListener('input', () => {
    _updateArqueoBox();
  });
}

if (closeCashBtn) {
  closeCashBtn.addEventListener('click', () => {
    const date = cashDateInput?.value || todayStr();
    const ds   = cashSummaryBox?.dataset;
    if (!ds || !Number(ds.ordersCount)) return showToast('No hay pedidos entregados en este día para cerrar.');
    if (!confirm(`¿Cerrar la caja del ${date}? Esta acción guarda el registro permanentemente.`)) return;

    const notesEl       = document.getElementById('cashClosingNotes');
    const cashCounted   = Number(cashCountInput?.value    || 0);
    const transferCounted = Number(transferCountInput?.value || 0);
    const totalReceived = cashCounted + transferCounted;
    const totalSales    = Number(ds.totalSales || 0);
    const totalDiff     = totalReceived - totalSales;

    const record = {
      id:              `close-${Date.now()}`,
      date,
      totalSales,
      cashSales:       Number(ds.cashSales     || 0),
      digitalSales:    Number(ds.digitalSales  || 0),
      grossProfit:     Number(ds.grossProfit   || 0),
      totalExpenses:   Number(ds.totalExpenses || 0),
      netProfit:       Number(ds.netProfit     || 0),
      cashCounted,
      transferCounted,
      totalReceived,
      cashDifference:  totalDiff,
      ordersCount:     Number(ds.ordersCount   || 0),
      notes:           notesEl?.value.trim() || '',
      closedAt:        new Date().toISOString()
    };

    const counts = getCashCounts();
    counts.push(record);
    saveCashCounts(counts);
    if (cashCountInput)    cashCountInput.value    = '';
    if (transferCountInput) transferCountInput.value = '';
    if (notesEl)           notesEl.value = '';
    _updateArqueoBox();
    renderCashRegister();
    showToast(`✅ Caja del ${date} cerrada y guardada.`);
  });
}

// Update renderAll to include cash register
const _origRenderAll = renderAll;
