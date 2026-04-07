/* ─── NÚCLEO DE CONFIGURACIÓN Y UTILIDADES ─────────────────────────── */
const cfg = window.RestaurantAppConfig;
if (!cfg) {
  console.error("ERROR CRÍTICO: RestaurantAppConfig no encontrado en el objeto window.");
}

const storage = cfg?.storageKeys || {};
const sizes = cfg?.sizes || {};

// Formateadores estándar
const money = (n) => new Intl.NumberFormat('es-CO', { 
  style: 'currency', currency: 'COP', maximumFractionDigits: 0 
}).format(Number(n || 0));

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
};

const escapeHTML = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ─── GESTIÓN DE PERSISTENCIA (LOCAL & NUBE) ───────────────────────── */

const getJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    let data = JSON.parse(raw);
    
    const arrayKeys = [
      storage.products, storage.orders, storage.users, 
      storage.expenses, storage.extras, storage.cashCounts
    ];

    if (arrayKeys.includes(key)) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = Object.values(data);
      }
      if (!Array.isArray(data)) return fallback;

      if (key === storage.orders) {
        data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        const seen = new Set();
        data = data.filter(o => {
          const id = String(o?.id || '');
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      }
    }
    return data;
  } catch(e) {
    console.error(`Error leyendo ${key}:`, e);
    return fallback;
  }
};

const setJson = (key, value) => {
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);

    if (window.FirebaseDB) {
      if (key === storage.orders) return; 
      window.FirebaseDB.save(key, value).catch(err => {
        console.warn(`Error en respaldo Firebase (${key}):`, err);
      });
    }
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      showToast('⚠️ Almacenamiento local lleno. Limpia comprobantes antiguos.');
    }
    console.error(`Error guardando ${key}:`, err);
  }
};

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
const dynamicSizeCards = document.getElementById('dynamicSizeCards');
const productCategorySelect = document.getElementById('productCategorySelect');

if (productCategorySelect) {
  // Build category options from cfg.categories (the real category names)
  const allCats = Object.keys(cfg.categories || {});
  productCategorySelect.innerHTML = '<option value="all">Todas las categorías</option>' + 
    allCats.map(c => `<option value="${c}">${cfg.categories[c]?.label || c}</option>`).join('');

  window.filterCategoryCards = () => {
    const sVal = productCategorySelect.value;
    document.querySelectorAll('.size-edit-card').forEach(card => {
      if (sVal === 'all') { card.style.display = 'flex'; }
      else {
        // card's category key is either 'perros', 'pizzas_personal', etc.
        const cCat = card.dataset.cardCat;
        // Match exact key or prefix (e.g. 'pizzas' matches 'pizzas_personal')
        const matches = cCat === sVal || cCat.startsWith(sVal + '_');
        card.style.display = matches ? 'flex' : 'none';
      }
    });
  };
}

if (dynamicSizeCards) {
  dynamicSizeCards.innerHTML = Object.entries(sizes).map(([key, info]) => `
    <div class="size-edit-card" data-card-cat="${key}">
      <h3 style="color:var(--primary);">${info.shortLabel || info.label || key}</h3>
      <label>Precio<input id="price_${key}" type="number" min="0" step="100" value="0" /></label>
      <label>Costo<input id="cost_${key}" type="number" min="0" step="100" value="0" /></label>
      <label>Stock<input id="stock_${key}" type="number" min="0" step="1" value="0" /></label>
    </div>
  `).join('');
  if(window.filterCategoryCards) window.filterCategoryCards();
}

let lastKnownOrderId = localStorage.getItem(storage.lastOrderSound) || null;
let soundArmed = false;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function getOrders() { return getJson(storage.orders, []); }
function getProducts() { return getJson(storage.products, []); }
function saveProducts(products) { setJson(storage.products, products); }
function saveOrders(orders) { setJson(storage.orders, orders); }

function renderSettings() {
  const settings = getJson(storage.settings, {});
  if (settings.qrImage && qrImagePreview) { qrImagePreview.src = settings.qrImage; qrImagePreview.style.display = 'block'; }
  if (settings.brebImage && brebImagePreview) { brebImagePreview.src = settings.brebImage; brebImagePreview.style.display = 'block'; }
  if (deliveryFeeInput) { deliveryFeeInput.value = settings.deliveryFee !== undefined ? settings.deliveryFee : cfg.deliveryFee; }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => resolve(r.result);
    r.onerror = (e) => reject(e);
  });
}

function maybePlaySound(newestOrderId) {
  if (!soundArmed || !newestOrderId || newestOrderId === lastKnownOrderId) return;
  const audio = new Audio('public/new-order.mp3');
  audio.play().catch(e => console.error("Error reproduciendo sonido:", e));
  lastKnownOrderId = newestOrderId;
  localStorage.setItem(storage.lastOrderSound, newestOrderId);
}

function setStatus(orderId, status) {
  const orders = getOrders().map((order) => order.id === orderId ? { ...order, status } : order);
  saveOrders(orders);
  if (window.FirebaseDB) {
    const cleanId = String(orderId).replace(/[\.\$#\[\]\/]/g, '_');
    window.FirebaseDB.update(storage.orders + '/' + cleanId, { status })
      .catch(err => console.error('Error en actualización granular:', err));
  }
  renderAll();
  showToast(`Pedido ${orderId} actualizado.`);
}

window.confirmPayment = (orderId) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    orders[idx].paymentConfirmed = true;
    localStorage.setItem(storage.orders, JSON.stringify(orders));
    if (window.FirebaseDB) {
      const cleanId = String(orderId).replace(/[\.\$#\[\]\/]/g, '_');
      window.FirebaseDB.update(`${storage.orders}/${cleanId}`, { paymentConfirmed: true })
        .catch(err => console.error('Fallo sync pago:', err));
    }
    renderAll();
    showToast('✅ Pago validado.');
  }
};

function deleteOrder(orderId) {
  if (!confirm(`¿Estás seguro de eliminar permanentemente el pedido ${orderId}?`)) return;
  const orders = getOrders().filter(o => String(o.id) !== String(orderId));
  localStorage.setItem(storage.orders, JSON.stringify(orders));
  if (window.FirebaseDB) {
    const cleanId = String(orderId).replace(/[\.\$#\[\]\/]/g, '_');
    window.FirebaseDB.save(`${storage.orders}/${cleanId}`, null)
      .then(() => { showToast(`🗑️ Eliminado.`); renderAll(); })
      .catch(err => console.error(err));
  } else {
    renderAll();
    showToast(`Eliminado localmente.`);
  }
}

function renderOrders() {
  const orders = getOrders();
  if (!orders.length) {
    ordersList.innerHTML = `<div class="empty-state">Sin pedidos por ahora</div>`;
    return;
  }
  maybePlaySound(orders[0]?.id);

  const query = (ordersSearchInput?.value || '').toLowerCase().trim();
  const filtered = query ? orders.filter(o => 
    (o.id || '').toLowerCase().includes(query) || 
    (o.customer?.name || '').toLowerCase().includes(query) 
  ) : orders;

  const statusMeta = {
    pendiente:   { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '🕐' },
    preparacion: { label: 'Preparación', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '👨‍🍳' },
    encamino:    { label: 'En camino',   color: '#ff4500', bg: 'rgba(255,69,0,0.07)', icon: '🛵' },
    entregado:   { label: 'Entregado',   color: '#6b7280', bg: 'rgba(107,114,128,0.06)', icon: '✅' },
  };

  ordersList.innerHTML = filtered.map((order, idx) => {
    const sm = statusMeta[order.status] || statusMeta.pendiente;
    return `
      <article class="oc-card" style="border-left:4px solid ${sm.color}; margin-bottom:12px; padding:12px; background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>#${idx + 1} - ${escapeHTML(order.id)}</strong>
          <span style="background:${sm.bg}; color:${sm.color}; padding:4px 8px; border-radius:6px; font-size:0.85rem;">${sm.icon} ${sm.label}</span>
        </div>
        <div style="font-size:0.9rem; margin-bottom:8px;">
          <div>👤 <strong>${escapeHTML(order.customer?.name)}</strong></div>
          <div>📍 ${escapeHTML(order.customer?.complex)}, T${escapeHTML(order.customer?.tower)}, A${escapeHTML(order.customer?.apartment)}</div>
        </div>
        <div style="border-top:1px solid #eee; padding-top:8px; margin-top:8px;">
          ${(order.items || []).map(it => `<div>• ${escapeHTML(it.name)} (${escapeHTML(it.sizeLabel)}) - ${money(it.price)}</div>`).join('')}
          <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
             <span>Método: ${order.paymentMethod}</span>
             <strong style="font-size:1.1rem; color:var(--primary);">${money(order.total)}</strong>
          </div>
        </div>
        <div style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap;">
          ${['pendiente','preparacion','encamino','entregado'].map(s => `
            <button onclick="setStatus('${order.id}', '${s}')" style="padding:6px 10px; border-radius:8px; border:1px solid #ddd; background:${order.status===s ? statusMeta[s].color : '#f9f9f9'}; color:${order.status===s ? '#fff' : '#444'}; cursor:pointer; font-size:0.8rem;">
              ${statusMeta[s].label}
            </button>
          `).join('')}
          <button onclick="deleteOrder('${order.id}')" style="padding:6px 10px; border-radius:8px; border:1px solid #ff4444; background:#fff; color:#ff4444; cursor:pointer; font-size:0.8rem;">🗑️ Borrar</button>
        </div>
      </article>`;
  }).join('');
}

function renderSales() {
  const delivered = getOrders().filter((order) => order.status === 'entregado');
  if (!salesTableBody) return;
  salesTableBody.innerHTML = delivered.map((order) => `
    <tr>
      <td>${escapeHTML(order.id)}</td>
      <td>${escapeHTML(order.customer?.name)}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${money(order.total)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No hay ventas registradas.</td></tr>';
}

function renderInventory() {
  const products = getProducts();
  if (!inventoryList) return;
  inventoryCount.textContent = `${products.length} productos`;
  inventoryList.innerHTML = products.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
      <div>
        <strong>${escapeHTML(p.name)}</strong>
        <div style="font-size:0.8rem; color:#666;">${escapeHTML(p.ingredients)}</div>
      </div>
      <div>
        <button onclick="editProduct('${p.id}')" class="mini-btn">Editar</button>
        <button onclick="deleteProduct('${p.id}')" class="mini-btn danger">Borrar</button>
      </div>
    </div>
  `).join('') || '<div class="empty-state">No hay productos.</div>';
}

window.editProduct = (id) => {
  const p = getProducts().find(x => x.id === id);
  if (p) { fillProductForm(p); window.scrollTo({top:0, behavior:'smooth'}); }
};

window.deleteProduct = (id) => {
  if (confirm('¿Borrar producto?')) {
    saveProducts(getProducts().filter(p => p.id !== id));
    renderAll();
  }
};

function renderDashboard() {
  const orders = getOrders();
  const active = orders.filter((o) => o.status !== 'entregado').length;
  const delivered = orders.filter((o) => o.status === 'entregado');
  const totalIncome = delivered.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const cashIncome = delivered.filter(o => o.paymentMethod === 'efectivo').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const digitalIncome = totalIncome - cashIncome;
  const estimatedProfit = Math.round(totalIncome * (cfg.profitRate || 0.30));

  if (activeOrdersCount) activeOrdersCount.textContent = active;
  if (deliveredOrdersCount) deliveredOrdersCount.textContent = delivered.length;
  if (incomeValue) incomeValue.textContent = money(totalIncome);
  if (profitValue) profitValue.textContent = money(estimatedProfit);
  const cashIncomeEl = document.getElementById('cashIncomeValue');
  const digitalIncomeEl = document.getElementById('digitalIncomeValue');
  if (cashIncomeEl) cashIncomeEl.textContent = money(cashIncome);
  if (digitalIncomeEl) digitalIncomeEl.textContent = money(digitalIncome);
}

function renderCustomers() {
  const users = getJson(storage.users, []);
  if (!customersTableBody) return;
  customersCount.textContent = `${users.length} clientes`;
  customersTableBody.innerHTML = users.map(user => `
    <tr>
      <td>${escapeHTML(user.name)}</td>
      <td>${escapeHTML(user.phone)}</td>
      <td>${escapeHTML(user.complex)}, T${escapeHTML(user.tower)}, A${escapeHTML(user.apartment)}</td>
      <td><button onclick="deleteClient('${user.clientId}')" class="mini-btn danger">Borrar</button></td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center;">Sin clientes registrados.</td></tr>';
}

window.deleteClient = (id) => {
   if (confirm('¿Borrar cliente?')) {
     const users = getJson(storage.users, []).filter(u => u.clientId !== id);
     setJson(storage.users, users);
     renderAll();
   }
};

function renderAll() {
  const sessionKey = getSessionKey();
  if (localStorage.getItem(sessionKey) !== 'true') return;
  
  console.log('🔄 Renderizando panel completo...');
  renderDashboard();
  renderOrders();
  renderInventory();
  renderSales();
  renderCustomers();
  renderSettings();
  renderAdditionals();
  renderCashRegister();
  renderPendingPayments();
}

/* ─── INICIALIZACIÓN Y EVENTOS ────────────────────────────────────── */

function getSessionKey() {
  return (window.RestaurantAppConfig?.storageKeys?.adminSession) || 'restaurant_admin_session_v2';
}

function checkSession() {
  const sessionKey = getSessionKey();
  const session = localStorage.getItem(sessionKey);
  const loggedIn = session === 'true';
  
  const loginSection = document.getElementById('loginSection');
  const adminPanel = document.getElementById('adminPanel');
  const logoutBtn = document.getElementById('logoutBtn');

  console.log(`[Session] ID: ${sessionKey} | Status: ${loggedIn}`);

  if (loginSection) loginSection.classList.toggle('hidden', loggedIn);
  if (adminPanel) adminPanel.classList.toggle('hidden', !loggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    soundArmed = true;
    renderAll();
  }
}

async function hashPass(str) {
  try {
    if (!crypto?.subtle) return str; 
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return str; }
}

// El loginForm ya fue declarado arriba
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPassword').value.trim();
    const btn = loginForm.querySelector('button[type="submit"]');

    if (!user || !pass) return showToast('⚠️ Ingresa credenciales.');
    
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    try {
      const hash = await hashPass(pass);
      const expectedHash = '8072db95acfdbcc1ba779cc6738253eb8fd3b05b691dc181af6ab1fe41f802f3'; // familia12
      
      console.log(`[Login] Intento: ${user} | Match: ${user === 'dangai2026_admin' && (hash === expectedHash || pass === 'familia12')}`);

      if (user === 'dangai2026_admin' && (hash === expectedHash || pass === 'familia12')) {
        localStorage.setItem(getSessionKey(), 'true');
        showToast('🔓 Acceso concedido.');
        checkSession();
      } else {
        showToast('❌ Credenciales incorrectas.');
      }
    } catch (err) {
      console.error('Error login:', err);
      showToast('❌ Error de validación.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

const logoutBtnElement = document.getElementById('logoutBtn');
if (logoutBtnElement) {
  logoutBtnElement.addEventListener('click', () => {
    localStorage.removeItem(getSessionKey());
    checkSession();
    showToast('🔒 Sesión cerrada.');
  });
}

// selector de pestañas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    if (!tabId) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.remove('hidden');
    if (tabId === 'tabCashRegister') renderCashRegister();
  });
});

function startAutoRender() {
  setInterval(() => {
    if (document.visibilityState === 'visible' && localStorage.getItem(getSessionKey()) === 'true') {
      renderAll();
    }
  }, 10000);
}

window.addEventListener('storage', (e) => {
  if (e.key === getSessionKey()) { checkSession(); }
  if (document.visibilityState === 'visible' && localStorage.getItem(getSessionKey()) === 'true') {
    renderAll();
  }
});

// Inicio
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  startAutoRender();
});
// Fallback imediato si DOMContentLoaded ya pasó
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  checkSession();
  startAutoRender();
}

if (productForm) {
  productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value.trim();
    const cat = document.getElementById('productCategorySelect').value || 'pizzas';
    const product = {
      id: id || crypto.randomUUID(),
      category: cat,
      name: document.getElementById('productName').value.trim(),
      ingredients: document.getElementById('productIngredients').value.trim(),
      removableOptions: document.getElementById('productOptions').value.split(',').map(it => it.trim()).filter(Boolean),
      prices: Object.keys(sizes).reduce((acc, k) => { acc[k] = Number(document.getElementById(`price_${k}`)?.value || 0); return acc; }, {}),
      costs: Object.keys(sizes).reduce((acc, k) => { acc[k] = Number(document.getElementById(`cost_${k}`)?.value || 0); return acc; }, {}),
      stock: Object.keys(sizes).reduce((acc, k) => { acc[k] = Number(document.getElementById(`stock_${k}`)?.value || 0); return acc; }, {})
    };
    const products = getProducts();
    const exists = products.some(x => x.id === product.id);
    const updated = exists ? products.map(x => x.id === product.id ? product : x) : [product, ...products];
    saveProducts(updated); resetProductForm(); renderAll(); showToast('✅ Guardado.');
  });
}

function fillProductForm(p) {
  if (!p) { productForm.reset(); document.getElementById('productId').value=''; return; }
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productIngredients').value = p.ingredients;
  document.getElementById('productOptions').value = (p.removableOptions || []).join(', ');
  Object.keys(sizes).forEach(k => {
    if (document.getElementById(`price_${k}`)) document.getElementById(`price_${k}`).value = p.prices?.[k] || 0;
    if (document.getElementById(`cost_${k}`)) document.getElementById(`cost_${k}`).value = p.costs?.[k] || 0;
    if (document.getElementById(`stock_${k}`)) document.getElementById(`stock_${k}`).value = p.stock?.[k] || 0;
  });
}

function resetProductForm() { fillProductForm(null); }

/* ─── CIERRE DE CAJA Y ADICIONALES ──────────────────────────────── */

// Auxiliares para Caja
const getCashCounts = () => getJson(storage.cashCounts, []);
const saveCashCounts = (counts) => setJson(storage.cashCounts, counts);
const getExpenses = () => getJson(storage.expenses, []);
const saveExpensesStore = (exp) => setJson(storage.expenses, exp);

const todayStr = () => new Date().toISOString().split('T')[0];
const formatDateLong = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'long' });

const cashDateInput = document.getElementById('cashDateInput');
const cashSummaryBox = document.getElementById('cashSummaryBox');
const cashCountInput = document.getElementById('cashCountInput');
const transferCountInput = document.getElementById('transferCountInput');
const closeCashBtn = document.getElementById('closeCashBtn');
const cashHistoryList = document.getElementById('cashHistoryList');
const expenseForm = document.getElementById('expenseForm');
const expenseDesc = document.getElementById('expenseDesc');
const expenseAmt = document.getElementById('expenseAmt');
const expenseCat = document.getElementById('expenseCategory');
const expensesList = document.getElementById('expensesList');

function renderCashRegister() {
  const date = cashDateInput?.value || todayStr();
  _renderDaySummary(date);
  _renderDayExpenses(date);
  _renderCashHistory();
}

function _renderDaySummary(date) {
  if (!cashSummaryBox) return;
  const orders = getOrders();
  const dayOrders = orders.filter(o => o.status === 'entregado' && o.createdAt.startsWith(date));
  
  const totalSales   = dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const cashSales    = dayOrders.filter(o => o.paymentMethod === 'efectivo').reduce((s, o) => s + Number(o.total || 0), 0);
  const digitalSales = totalSales - cashSales;
  const totalCost    = dayOrders.reduce((s, o) => s + Number(o.cost || 0), 0);
  const totalExpenses = getExpenses().filter(e => e.date === date).reduce((s, e) => s + Number(e.amount || 0), 0);
  const grossProfit  = totalSales - totalCost;
  const netProfit    = grossProfit - totalExpenses;

  // Saldo de apertura (cierre del día anterior)
  const prevDate = new Date(new Date(date + 'T12:00:00').getTime() - 86400000).toISOString().split('T')[0];
  const lastClosing = getCashCounts().find(c => c.date === prevDate);
  const openingBal = lastClosing ? Number(lastClosing.cashDifference || 0) : 0;

  cashSummaryBox.innerHTML = `
    <div class="cr-stats-grid">
      <div class="cr-stat"><span>Ventas (${dayOrders.length})</span><strong>${money(totalSales)}</strong></div>
      <div class="cr-stat"><span>💵 Efectivo</span><strong>${money(cashSales)}</strong></div>
      <div class="cr-stat"><span>📱 Digital</span><strong>${money(digitalSales)}</strong></div>
      <div class="cr-stat"><span>📉 Gastos</span><strong style="color:var(--danger)">${money(totalExpenses)}</strong></div>
      <div class="cr-stat standout"><span>Ganancia Neta</span><strong style="color:var(--success)">${money(netProfit)}</strong></div>
    </div>
    ${dayOrders.length ? `
    <div class="cr-orders-list">
      ${dayOrders.map(o => `
        <div class="cr-order-item">
          <span>${escapeHTML(o.customer?.name)}</span>
          <span class="cr-pay-chip ${o.paymentMethod === 'efectivo' ? 'cash' : 'digital'}">${o.paymentMethod === 'efectivo' ? '💵 Efectivo' : '📱 Digital'}</span>
          <strong>${money(o.total)}</strong>
        </div>
      `).join('')}
    </div>` : '<p style="text-align:center; padding:12px; color:var(--muted);">Sin entregas este día.</p>'}
  `;

  Object.assign(cashSummaryBox.dataset, { totalSales, cashSales, digitalSales, grossProfit, totalExpenses, netProfit, ordersCount: dayOrders.length, openingBalance: openingBal });
  _updateArqueoBox();
}

function _renderDayExpenses(date) {
  if (!expensesList) return;
  const dayExpenses = getExpenses().filter(e => e.date === date);
  const total = dayExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  
  if (!dayExpenses.length) {
    expensesList.innerHTML = '<p style="text-align:center; padding:12px; color:var(--muted);">Sin gastos.</p>';
  } else {
    expensesList.innerHTML = dayExpenses.map(e => `
      <div class="cr-order-item">
        <span>${escapeHTML(e.description)}</span>
        <strong style="color:var(--danger)">-${money(e.amount)}</strong>
      </div>
    `).join('');
  }
}

function _renderCashHistory() {
  if (!cashHistoryList) return;
  const counts = getCashCounts().slice().reverse();
  cashHistoryList.innerHTML = counts.map(c => `
    <div class="oc-card" style="margin-bottom:8px; padding:10px; font-size:0.9rem;">
      <div style="display:flex; justify-content:space-between;">
        <strong>${c.date}</strong>
        <span style="color:var(${c.cashDifference >= 0 ? '--success' : '--danger'})">${money(c.cashDifference)}</span>
      </div>
      <div style="font-size:0.8rem; color:#666;">Ventas: ${money(c.totalSales)} · Recibido: ${money(c.totalReceived)}</div>
    </div>
  `).join('') || '<p style="text-align:center; color:var(--muted);">Sin historial.</p>';
}

function _updateArqueoBox() {
  const cash = Number(cashCountInput?.value || 0);
  const transfer = Number(transferCountInput?.value || 0);
  const total = cash + transfer;
  const expected = Number(cashSummaryBox?.dataset?.totalSales || 0);
  const diff = total - expected;
  
  const atbTotal = document.getElementById('atbTotal');
  const atbDiff = document.getElementById('atbDiff');
  if (atbTotal) atbTotal.textContent = money(total);
  if (atbDiff) {
    atbDiff.textContent = (diff >= 0 ? '+' : '') + money(diff);
    atbDiff.style.color = diff === 0 ? 'var(--success)' : 'var(--danger)';
  }
}

if (cashCountInput) cashCountInput.addEventListener('input', _updateArqueoBox);
if (transferCountInput) transferCountInput.addEventListener('input', _updateArqueoBox);
if (cashDateInput) {
  cashDateInput.value = todayStr();
  cashDateInput.addEventListener('change', renderCashRegister);
}

if (expenseForm) {
  expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    const amt = Number(expenseAmt?.value);
    const desc = expenseDesc?.value.trim();
    if (!amt || !desc) return showToast('⚠️ Datos incompletos.');
    const date = cashDateInput?.value || todayStr();
    const expenses = getExpenses();
    expenses.push({ id: Date.now(), date, description: desc, amount: amt, createdAt: new Date().toISOString() });
    saveExpensesStore(expenses);
    expenseDesc.value = ''; expenseAmt.value = '';
    renderCashRegister();
    showToast('✅ Gasto registrado.');
  });
}

if (closeCashBtn) {
  closeCashBtn.addEventListener('click', () => {
    const ds = cashSummaryBox.dataset;
    const date = cashDateInput?.value || todayStr();
    if (!Number(ds.ordersCount)) return showToast('⚠️ Sin entregas hoy.');
    if (!confirm('¿Cerrar caja hoy?')) return;
    
    const cashCounted = Number(cashCountInput?.value || 0);
    const transferCounted = Number(transferCountInput?.value || 0);
    const totalReceived = cashCounted + transferCounted;
    const diff = totalReceived - Number(ds.totalSales);
    
    const counts = getCashCounts();
    counts.push({
      id: Date.now(), date, totalSales: Number(ds.totalSales), cashCounted, transferCounted, totalReceived, cashDifference: diff, closedAt: new Date().toISOString()
    });
    saveCashCounts(counts);
    renderCashRegister(); showToast('✅ Caja cerrada.');
  });
}

function renderAdditionals() {
  const extras = getJson(storage.extras, cfg.defaultExtras || []);
  const addlCount = document.getElementById('addlCount');
  const additionalsList = document.getElementById('additionalsList');
  if (!additionalsList) return;
  if (addlCount) addlCount.textContent = `${extras.length} adicionales`;

  // Group by category
  const groups = {};
  extras.forEach(ex => {
    const cat = ex.category || 'Otros';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ex);
  });

  additionalsList.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div style="margin-bottom:20px;">
      <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; color:var(--muted); letter-spacing:.06em; margin-bottom:8px; padding:4px 0; border-bottom:1px solid var(--line);">${escapeHTML(cat)}</div>
      ${items.map(ex => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(0,0,0,0.04);">
          <div>
            <strong style="font-size:0.95rem;">${escapeHTML(ex.name)}</strong>
            <span style="font-size:0.82rem; color:var(--muted); margin-left:8px;">${money(ex.price)}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button onclick="editAddl('${ex.id}')" class="mini-btn">Editar</button>
            <button onclick="deleteAddl('${ex.id}')" class="mini-btn danger">Borrar</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('') || '<p style="color:var(--muted);text-align:center;padding:20px;">No hay adicionales configurados.</p>';
}

window.editAddl = (id) => {
  const extras = getJson(storage.extras, cfg.defaultExtras || []);
  const ex = extras.find(e => e.id === id);
  if (!ex) return;
  const nameEl = document.getElementById('addlName');
  const priceEl = document.getElementById('addlPrice');
  const catEl = document.getElementById('addlCategory');
  const idEl = document.getElementById('addlId');
  if (nameEl) nameEl.value = ex.name;
  if (priceEl) priceEl.value = ex.price;
  if (catEl) catEl.value = ex.category || '';
  if (idEl) idEl.value = ex.id;
  window.scrollTo({top: 0, behavior: 'smooth'});
};

window.deleteAddl = (id) => {
  if (!confirm('¿Eliminar este adicional?')) return;
  const extras = getJson(storage.extras, cfg.defaultExtras || []).filter(e => e.id !== id);
  setJson(storage.extras, extras);
  renderAdditionals();
  showToast('🗑️ Adicional eliminado.');
};

const additionalForm = document.getElementById('additionalForm');
if (additionalForm) {
  additionalForm.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('addlId')?.value?.trim();
    const name = document.getElementById('addlName')?.value?.trim();
    const price = Number(document.getElementById('addlPrice')?.value || 0);
    const category = document.getElementById('addlCategory')?.value?.trim() || 'Otros';
    if (!name || !price) return showToast('⚠️ Completa nombre y precio.');
    const extras = getJson(storage.extras, cfg.defaultExtras || []);
    const existing = id ? extras.findIndex(e => e.id === id) : -1;
    const item = { id: id || crypto.randomUUID(), name, price, category };
    if (existing > -1) { extras[existing] = item; } else { extras.push(item); }
    setJson(storage.extras, extras);
    additionalForm.reset();
    document.getElementById('addlId').value = '';
    renderAdditionals();
    showToast('✅ Adicional guardado.');
  });
}

const cancelAddlBtn = document.getElementById('cancelAddlBtn');
if (cancelAddlBtn) {
  cancelAddlBtn.addEventListener('click', () => {
    additionalForm?.reset();
    const idEl = document.getElementById('addlId');
    if (idEl) idEl.value = '';
  });
}

const newAddlBtn = document.getElementById('newAddlBtn');
if (newAddlBtn) {
  newAddlBtn.addEventListener('click', () => {
    additionalForm?.reset();
    const idEl = document.getElementById('addlId');
    if (idEl) idEl.value = '';
  });
}

/* ─── FUNCIONES FALTANTES ─────────────────────────────────────── */

// Limpiar comprobantes de recibos en pedidos entregados hace más de 24h
window.cleanupOldReceipts = () => {
  if (!confirm('¿Limpiar imágenes de pedidos entregados hace más de 24 horas?')) return;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const orders = getOrders().map(o => {
    if (o.status === 'entregado' && new Date(o.createdAt).getTime() < cutoff) {
      return { ...o, receiptBase64: null };
    }
    return o;
  });
  localStorage.setItem(storage.orders, JSON.stringify(orders));
  showToast('✅ Comprobantes antiguos limpiados.');
  renderAll();
};

// Renderizar comprobantes de pago pendientes en el panel de pagos
function renderPendingPayments() {
  if (!pendingPaymentsList) return;
  const orders = getOrders().filter(o => o.paymentMethod && o.paymentMethod !== 'efectivo' && !o.paymentConfirmed && o.status !== 'entregado');
  if (!orders.length) {
    pendingPaymentsList.innerHTML = '<div class="empty-state">No hay comprobantes pendientes por validar.</div>';
    return;
  }
  pendingPaymentsList.innerHTML = orders.map(o => `
    <article class="oc-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong>#${escapeHTML(o.id)} — ${escapeHTML(o.customer?.name)}</strong>
        <span style="font-weight:700;color:var(--primary);">${money(o.total)}</span>
      </div>
      <div style="font-size:0.85rem;color:var(--muted);margin-bottom:8px;">
        📍 ${escapeHTML(o.customer?.complex)}, T${escapeHTML(o.customer?.tower)}, A${escapeHTML(o.customer?.apartment)}
        · Método: ${o.paymentMethod === 'qr' ? '📱 QR' : '🔑 Bre-B'}
      </div>
      ${o.receiptBase64 ? `<img src="${o.receiptBase64}" style="width:100%;max-width:300px;border-radius:10px;margin-bottom:10px;display:block;" />` : '<p style="color:var(--muted);font-size:0.85rem;">Sin comprobante adjunto.</p>'}
      <button onclick="window.confirmPayment('${o.id}')" class="primary-btn" style="width:100%;">✅ Confirmar pago</button>
    </article>
  `).join('');
}

// settingsForm handler
if (settingsForm) {
  settingsForm.addEventListener('submit', async e => {
    e.preventDefault();
    const settings = getJson(storage.settings, {});
    if (deliveryFeeInput) settings.deliveryFee = Number(deliveryFeeInput.value || 0);
    if (qrImageInput?.files?.length) {
      try { settings.qrImage = await toBase64(qrImageInput.files[0]); } catch(err) { console.warn(err); }
    }
    if (brebImageInput?.files?.length) {
      try { settings.brebImage = await toBase64(brebImageInput.files[0]); } catch(err) { console.warn(err); }
    }
    setJson(storage.settings, settings);
    renderSettings();
    renderPendingPayments();
    showToast('✅ Configuración guardada.');
  });
}

// cancelEditBtn handler
if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', resetProductForm);
}

// newProductBtn handler
if (newProductBtn) {
  newProductBtn.addEventListener('click', resetProductForm);
}

// ordersSearchInput handler
if (ordersSearchInput) {
  ordersSearchInput.addEventListener('input', renderOrders);
}

// Inicio - solo si DOMContentLoaded no ha pasado todavía
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    startAutoRender();
  });
} else {
  // DOMContentLoaded ya ocurrió
  checkSession();
  startAutoRender();
}
