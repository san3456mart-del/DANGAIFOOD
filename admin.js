const cfg = window.RestaurantAppConfig;
const storage = cfg.storageKeys;
const sizes = cfg.sizes;
const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n || 0));
const getJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  if (window.FirebaseDB && (key === storage.products || key === storage.orders || key === storage.settings)) {
    window.FirebaseDB.save(key, value);
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
    ordersList.innerHTML = '<div class="empty-state">Aún no hay pedidos registrados.</div>';
    return;
  }
  maybePlaySound(newestId);

  ordersList.innerHTML = orders.map((order) => `
    <article class="order-card">
      <div class="order-header">
        <div>
          <h3>${escapeHTML(order.id)}</h3>
          <div class="menu-meta">${formatDate(order.createdAt)} · ${escapeHTML(order.customer.name)}</div>
        </div>
        ${badge(order.status)}
      </div>
      <div class="order-body">
        <div><strong>Ubicación:</strong> ${escapeHTML(order.customer.complex)}, ${escapeHTML(order.customer.tower)}, apto ${escapeHTML(order.customer.apartment)}</div>
        <div><strong>Items:</strong><br>${order.items.map((item) => `• ${escapeHTML(item.name)} - ${escapeHTML(item.sizeLabel || '')} ${item.removed?.length ? `(sin ${escapeHTML(item.removed.join(', '))})` : ''}`).join('<br>')}</div>
        <div><strong>Notas:</strong> ${escapeHTML(order.notes || 'Sin notas')}</div>
        <div><strong>Total:</strong> ${money(order.total)}</div>
        <div style="margin-top:4px; display: flex; align-items: center; gap: 8px;"><strong>Pago:</strong> ${order.paymentMethod === 'efectivo' ? '💵 Efectivo' : (order.paymentMethod === 'qr' ? '📱 QR' : (order.paymentMethod === 'breb' ? '🔑 Bre-B' : '💵 Efectivo'))}
          ${order.paymentMethod && order.paymentMethod !== 'efectivo' ? 
            (order.paymentConfirmed 
              ? `<span class="pill success" style="font-size:0.75rem; padding: 2px 6px;">✅ Confirmado</span>`
              : `<span class="pill warning" style="font-size:0.75rem; padding: 2px 6px;">⏳ Pendiente</span><button class="mini-btn success" onclick="confirmPayment('${order.id}')">Validar Pago</button>`)
            : ''}
        </div>
        ${order.receiptBase64 ? `<div style="margin-top:6px;"><a href="javascript:void(0)" onclick="const w=window.open('','_blank');w.document.write('<img src=\\'${order.receiptBase64}\\' style=\\'max-width:100%;\\'/>');" style="color:var(--primary); text-decoration:underline; font-weight:bold; font-size:0.9rem;">🖼️ Ver comprobante de pago</a></div>` : ''}
        ${order.rating ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--line);"><strong style="color:var(--warning)">Calificación del cliente:</strong> ${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)} ${order.review ? `<br><em>"${escapeHTML(order.review)}"</em>` : ''}</div>` : ''}
      </div>
      <div class="status-row">
        ${['pendiente', 'preparacion', 'encamino', 'entregado'].map((status) => `
          <button class="status-btn ${order.status === status ? 'active' : ''}" data-status="${status}" data-order-id="${order.id}">${status === 'preparacion' ? 'Preparación' : status === 'encamino' ? 'En camino' : status.charAt(0).toUpperCase() + status.slice(1)}</button>
        `).join('')}
        <button class="mini-btn danger" data-delete-id="${order.id}">Eliminar</button>
      </div>
    </article>
  `).join('');

  ordersList.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', () => setStatus(btn.dataset.orderId, btn.dataset.status)));
  ordersList.querySelectorAll('[data-delete-id]').forEach((btn) => btn.addEventListener('click', () => deleteOrder(btn.dataset.deleteId)));
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
  activeOrdersCount.textContent = active;
  deliveredOrdersCount.textContent = delivered.length;
  incomeValue.textContent = money(delivered.reduce((sum, o) => sum + Number(o.total || 0), 0));
  profitValue.textContent = money(delivered.reduce((sum, o) => sum + Number(o.estimatedProfit || 0), 0));
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

function renderAll() {
  renderOrders();
  renderSales();
  renderInventory();
  renderDashboard();
  renderSettings();
  renderPendingPayments();
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

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPassword').value.trim();
  if (user === cfg.adminCredentials.username && pass === cfg.adminCredentials.password) {
    localStorage.setItem(storage.adminSession, 'true');
    soundArmed = true;
    showToast('Bienvenido al panel.');
    checkSession();
  } else {
    showToast('Usuario o contraseña incorrectos.');
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

window.addEventListener('storage', renderAll);
setInterval(() => {
  if (localStorage.getItem(storage.adminSession) === 'true') renderAll();
}, 2500);

resetProductForm();
checkSession();
