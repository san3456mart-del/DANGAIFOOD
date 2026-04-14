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

window.confirmPayment = (orderId) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    orders[idx].paymentConfirmed = true;
    localStorage.setItem(storage.orders, JSON.stringify(orders));
    if (window.FirebaseDB) {
      const cleanId = String(orderId).replace(/[.$#[\]\/]/g, '_');
      window.FirebaseDB.update(`${storage.orders}/${cleanId}`, { paymentConfirmed: true })
        .catch(err => console.error('Fallo sync pago:', err));
    }
    scheduleRenderOrders();
    renderDashboard();
    showToast('✅ Pago validado.');
  }
};

function deleteOrder(orderId) {
  if (!confirm(`¿Eliminar el pedido ${orderId}? Esta acción no se puede deshacer.`)) return;

  const filtered = getOrders().filter(o => String(o.id) !== String(orderId));

  // 1. Actualizar localStorage inmediatamente (UI reactiva)
  localStorage.setItem(storage.orders, JSON.stringify(filtered));
  scheduleRenderOrders();
  renderDashboard();
  showToast('🗑️ Pedido eliminado.');

  if (window.FirebaseDB) {
    // 2. Convertir array a objeto indexado por ID para Firebase
    //    Esto reemplaza TODO el nodo (borra índices numéricos viejos y claves PED-xxx)
    //    Garantiza que solo queden los pedidos actuales, sin fantasmas.
    const ordersAsObject = {};
    filtered.forEach(o => {
      const key = String(o.id).replace(/[.$#[\]\/]/g, '_');
      ordersAsObject[key] = o;
    });

    // set() reemplaza COMPLETAMENTE el nodo — esto es intencional aquí
    window.FirebaseDB.save(storage.orders, ordersAsObject)
      .catch(err => {
        console.error('Error sincronizando eliminación con Firebase:', err);
        showToast('⚠️ Eliminado localmente, pero falló sincronización en nube.');
      });
  }
}

/**
 * Limpia los datos fantasma de Firebase:
 * convierte la estructura mixta (array+indices numericos) a solo objeto indexado por ID.
 * Ejecutar una sola vez para sanar la base de datos existente.
 */
window.repairFirebaseOrders = async () => {
  if (!window.FirebaseDB) return showToast('⚠️ Firebase no disponible.');
  showToast('🔄 Reparando pedidos en Firebase...');
  try {
    const raw = await window.FirebaseDB.readOnce(storage.orders);
    if (!raw) { showToast('✅ Sin datos que reparar.'); return; }

    let arr = Array.isArray(raw) ? raw : Object.values(raw);
    // Deduplicar por ID
    const seen = new Set();
    arr = arr.filter(o => {
      if (!o || !o.id) return false;
      if (seen.has(String(o.id))) return false;
      seen.add(String(o.id));
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Guardar como objeto indexado por ID
    const obj = {};
    arr.forEach(o => {
      const key = String(o.id).replace(/[.$#[\]\/]/g, '_');
      obj[key] = o;
    });

    await window.FirebaseDB.save(storage.orders, obj);
    localStorage.setItem(storage.orders, JSON.stringify(arr));
    scheduleRenderOrders();
    renderDashboard();
    showToast(`✅ Reparados ${arr.length} pedidos sin duplicados.`);
  } catch (err) {
    console.error('Error reparando Firebase:', err);
    showToast('❌ Error al reparar. Ver consola.');
  }
};

// ─── debounce render para evitar re-renders duplicados de Firebase ───
let _renderOrdersTimeout = null;
function scheduleRenderOrders() {
  clearTimeout(_renderOrdersTimeout);
  _renderOrdersTimeout = setTimeout(renderOrders, 80);
}

function setStatus(orderId, newStatus) {
  // Update locally first (optimistic)
  const orders = getOrders().map(o => o.id === orderId ? { ...o, status: newStatus } : o);
  localStorage.setItem(storage.orders, JSON.stringify(orders));

  // Granular Firebase update (won't trigger full overwrite)
  if (window.FirebaseDB) {
    const cleanId = String(orderId).replace(/[.$#[\]\/]/g, '_');
    window.FirebaseDB.update(storage.orders + '/' + cleanId, { status: newStatus })
      .catch(err => console.error('Error actualizando estado:', err));
  }

  // Re-render only the orders panel (not full renderAll)
  scheduleRenderOrders();
  renderDashboard();
  showToast(`✅ Pedido ${orderId} → ${STATUS_META[newStatus]?.label || newStatus}`);
}

const STATUS_META = {
  pendiente:   { label: 'Pendiente',    color: '#d97706', bg: '#fef3c7', icon: '🕐', next: 'preparacion', nextLabel: '👨‍🍳 Iniciar preparación' },
  preparacion: { label: 'Preparación',  color: '#059669', bg: '#d1fae5', icon: '👨‍🍳', next: 'encamino',    nextLabel: '🛵 Marcar en camino' },
  encamino:    { label: 'En camino',    color: '#dc2626', bg: '#fee2e2', icon: '🛵', next: 'entregado',   nextLabel: '✅ Marcar entregado' },
  entregado:   { label: 'Entregado',    color: '#6b7280', bg: '#f3f4f6', icon: '✅', next: null,          nextLabel: null },
};

const PAY_META = {
  efectivo: { label: '💵 Efectivo', color: '#059669', bg: '#d1fae5' },
  qr:       { label: '📱 QR',       color: '#7c3aed', bg: '#ede9fe' },
  breb:     { label: '🔑 Bre-B',    color: '#1d4ed8', bg: '#dbeafe' },
};

// ─── COUNTDOWN (igual al cliente: 45 min) ────────────────────────
const ADMIN_ORDER_LIMIT_MS = 45 * 60 * 1000;

function getAdminCountdown(createdAt) {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const remaining = ADMIN_ORDER_LIMIT_MS - elapsed;
  if (remaining <= 0) return { text: '¡Tiempo superado!', urgent: true, exceeded: true };
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pad = n => String(n).padStart(2, '0');
  return { text: `${pad(mins)}:${pad(secs)}`, urgent: mins < 5, exceeded: false };
}

// Ticker: actualiza todos los countdowns del admin cada segundo
setInterval(() => {
  document.querySelectorAll('.admin-order-countdown[data-created]').forEach(el => {
    const data = getAdminCountdown(el.dataset.created);
    el.textContent = data.text;
    const color = data.exceeded ? '#dc2626' : data.urgent ? '#f59e0b' : '#059669';
    el.style.color = color;
    el.style.borderColor = color;
    const wrap = el.closest('.admin-countdown-wrap');
    if (wrap) {
      wrap.style.borderColor = color;
      wrap.style.background = data.exceeded ? '#fef2f2' : data.urgent ? '#fffbeb' : '#f0fdf4';
    }
  });
}, 1000);

function renderOrders() {
  if (!ordersList) return;
  const allOrders = getOrders();

  if (!allOrders.length) {
    ordersList.innerHTML = `<div class="empty-state" style="padding:48px 24px;">
      <div style="font-size:3rem;margin-bottom:12px;">📭</div>
      <strong style="font-size:1.1rem;color:var(--secondary);">Sin pedidos por ahora</strong>
      <p style="color:var(--muted);margin:6px 0 0;font-size:0.9rem;">Los nuevos pedidos aparecerán aquí automáticamente.</p>
    </div>`;
    return;
  }

  maybePlaySound(allOrders[0]?.id);

  const query = (ordersSearchInput?.value || '').toLowerCase().trim();
  const active = allOrders.filter(o => o.status !== 'entregado');
  const delivered = allOrders.filter(o => o.status === 'entregado');

  // Show active first, then delivered collapsed
  const filtered = query
    ? allOrders.filter(o =>
        (o.id || '').toLowerCase().includes(query) ||
        (o.customer?.name || '').toLowerCase().includes(query) ||
        (o.customer?.tower || '').toLowerCase().includes(query) ||
        (o.customer?.apartment || '').toLowerCase().includes(query)
      )
    : [...active, ...delivered];

  ordersList.innerHTML = filtered.map((order, idx) => {
    const sm = STATUS_META[order.status] || STATUS_META.pendiente;
    const pm = PAY_META[order.paymentMethod] || { label: order.paymentMethod || '—', color: '#6b7280', bg: '#f3f4f6' };
    const isDelivered = order.status === 'entregado';
    const orderNum = allOrders.findIndex(o => o.id === order.id) + 1;
    const timeAgo = _timeAgo(order.createdAt);

    // Payment confirmed badge
    const payConfirmed = order.paymentMethod !== 'efectivo'
      ? order.paymentConfirmed
        ? `<span style="background:#d1fae5;color:#059669;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;">✅ Pago confirmado</span>`
        : `<span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;">⏳ Pago pendiente</span>
           <button onclick="window.confirmPayment('${order.id}')" style="background:#d1fae5;color:#059669;border:none;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:inherit;">✔ Validar</button>`
      : '';

    // Next status button
    const nextBtn = sm.next
      ? `<button onclick="setStatus('${order.id}','${sm.next}')"
           style="flex:1;padding:12px 16px;border-radius:14px;border:none;
                  background:${STATUS_META[sm.next].color};color:#fff;
                  font-weight:800;font-size:0.88rem;cursor:pointer;font-family:inherit;
                  transition:.15s;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
           ${sm.nextLabel}
         </button>`
      : `<span style="padding:12px 16px;font-size:0.85rem;color:var(--muted);font-weight:600;">✔ Pedido completado</span>`;

    // Items list
    const itemsHtml = (order.items || []).map(it => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 12px;
                  background:var(--bg);border-radius:10px;gap:8px;margin-bottom:4px;">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--secondary);">${escapeHTML(it.name)}</div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">${escapeHTML(it.sizeLabel || '')}</div>
          ${it.removed?.length ? `<div style="font-size:0.75rem;color:var(--danger);margin-top:2px;">Sin: ${escapeHTML(it.removed.join(', '))}</div>` : ''}
          ${it.extras?.length ? `<div style="font-size:0.75rem;color:#7c3aed;margin-top:2px;">+${it.extras.map(e=>`${e.qty}× ${escapeHTML(e.name)}`).join(', ')}</div>` : ''}
        </div>
        <strong style="font-size:0.9rem;color:var(--primary);white-space:nowrap;">${money(it.price)}</strong>
      </div>
    `).join('');

    // Notes
    const notesHtml = order.notes
      ? `<div style="margin-top:8px;padding:10px 12px;background:#fffbf0;border:1px dashed #f59e0b;border-radius:10px;font-size:0.82rem;color:#92400e;">
           📝 <em>${escapeHTML(order.notes)}</em>
         </div>`
      : '';

    // Status progress bar
    const steps = ['pendiente','preparacion','encamino','entregado'];
    const stepLabels = ['Pendiente','Preparación','En camino','Entregado'];
    const curIdx = steps.indexOf(order.status);
    const progressBar = `
      <div style="display:flex;align-items:center;gap:0;border-top:1px solid var(--line);padding:14px 20px;background:#fcfcfd;">
        ${steps.map((s, i) => {
          const done = i <= curIdx;
          const active = i === curIdx;
          return `
            ${i > 0 ? `<div style="flex:1;height:3px;background:${i <= curIdx ? STATUS_META[steps[curIdx]].color : 'var(--line)'};transition:.3s;border-radius:2px;opacity:${done?1:.3};"></div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:60px;">
              <div style="width:28px;height:28px;border-radius:50%;
                          background:${done ? STATUS_META[steps[curIdx]].color : 'var(--line)'};
                          display:flex;align-items:center;justify-content:center;
                          font-size:${active?'0.85rem':'0.7rem'};
                          box-shadow:${active?`0 0 0 3px ${STATUS_META[steps[curIdx]].bg}`:'none'};
                          transition:.3s;">
                ${done ? (active ? STATUS_META[s].icon : '✓') : ''}
              </div>
              <span style="font-size:0.65rem;font-weight:700;color:${done?STATUS_META[steps[curIdx]].color:'var(--muted)'};text-align:center;line-height:1.2;">${stepLabels[i]}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    return `
      <article style="background:#fff;border-radius:20px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:14px;
                      border:1.5px solid ${sm.color}22;
                      transition:box-shadow .2s;position:relative;"
               onmouseover="this.style.boxShadow='0 6px 24px rgba(0,0,0,0.1)'"
               onmouseout="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'">

        <!-- STATUS STRIPE -->
        <div style="height:5px;background:${sm.color};width:100%;"></div>

        <!-- HEADER -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:12px;background:${sm.bg};
                        display:flex;align-items:center;justify-content:center;
                        font-size:1.3rem;flex-shrink:0;">
              ${sm.icon}
            </div>
            <div>
              <div style="font-size:1rem;font-weight:800;color:var(--secondary);">#${orderNum} · ${escapeHTML(order.id)}</div>
              <div style="font-size:0.75rem;color:var(--muted);margin-top:1px;">${timeAgo}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="background:${sm.bg};color:${sm.color};padding:5px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;">
              ${sm.icon} ${sm.label}
            </span>
            <strong style="font-size:1.3rem;font-weight:800;color:var(--secondary);">${money(order.total)}</strong>
          </div>
          ${!isDelivered ? (() => {
            const cd = getAdminCountdown(order.createdAt);
            const cdColor = cd.exceeded ? '#dc2626' : cd.urgent ? '#f59e0b' : '#059669';
            const cdBg    = cd.exceeded ? '#fef2f2' : cd.urgent ? '#fffbeb' : '#f0fdf4';
            return `<div class="admin-countdown-wrap" style="display:inline-flex;align-items:center;gap:7px;
                    background:${cdBg};border:2px solid ${cdColor};border-radius:12px;padding:5px 13px;
                    transition:background .3s,border-color .3s;">
              <span style="font-size:1rem;">⏱️</span>
              <div style="text-align:center;line-height:1.1;">
                <div style="font-size:0.6rem;font-weight:800;color:${cdColor};text-transform:uppercase;letter-spacing:.06em;">Tiempo restante</div>
                <span class="admin-order-countdown" data-created="${order.createdAt}"
                  style="font-size:1.05rem;font-weight:800;color:${cdColor};font-variant-numeric:tabular-nums;">${cd.text}</span>
              </div>
            </div>`;
          })() : ''}
        </div>

        <!-- PROGRESS BAR -->
        ${progressBar}

        <!-- BODY -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--line);">

          <!-- LEFT: Customer info -->
          <div style="padding:16px 20px;border-right:1px solid var(--line);">
            <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;">👤 Cliente</div>
            <div style="font-weight:800;font-size:1rem;color:var(--secondary);margin-bottom:4px;">${escapeHTML(order.customer?.name || '—')}</div>
            <div style="font-size:0.85rem;color:var(--muted);margin-bottom:3px;">📍 ${escapeHTML(order.customer?.complex || '')}</div>
            <div style="font-size:0.85rem;color:var(--muted);margin-bottom:6px;">🏢 Torre ${escapeHTML(order.customer?.tower || '')} · Apto ${escapeHTML(order.customer?.apartment || '')}</div>
            ${order.customer?.phone ? `<a href="https://wa.me/57${String(order.customer.phone).replace(/\D/g,'')}"
              target="_blank"
              style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#fff;padding:5px 12px;border-radius:999px;font-size:0.8rem;font-weight:700;text-decoration:none;margin-bottom:8px;">💬 ${escapeHTML(order.customer.phone)}</a>` : ''}
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="background:${pm.bg};color:${pm.color};padding:4px 10px;border-radius:999px;font-size:0.78rem;font-weight:700;">${pm.label}</span>
              ${payConfirmed}
            </div>
          </div>

          <!-- RIGHT: Items -->
          <div style="padding:16px 20px;">
            <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;">🍕 Productos</div>
            ${itemsHtml}
            ${notesHtml}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px dashed var(--line);">
              <span style="font-size:0.8rem;color:var(--muted);">Subtotal</span>
              <span style="font-weight:700;font-size:0.9rem;">${money(order.subtotal || order.total)}</span>
            </div>
            ${order.deliveryFee ? `<div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:0.8rem;color:var(--muted);">Domicilio</span>
              <span style="font-weight:700;font-size:0.9rem;">+${money(order.deliveryFee)}</span>
            </div>` : ''}
            ${order.discount ? `<div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:0.8rem;color:var(--success);">🎟️ Descuento</span>
              <span style="font-weight:700;font-size:0.9rem;color:var(--success);">-${money(order.discount)}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div style="display:flex;align-items:center;gap:10px;padding:14px 20px;
                    background:var(--bg);border-top:1px solid var(--line);flex-wrap:wrap;">
          ${nextBtn}
          <button onclick="deleteOrder('${order.id}')"
            style="padding:12px 16px;border-radius:14px;border:1.5px solid rgba(220,38,38,0.25);
                   background:rgba(220,38,38,0.06);color:#dc2626;font-weight:700;
                   font-size:0.82rem;cursor:pointer;font-family:inherit;white-space:nowrap;transition:.15s;"
            onmouseover="this.style.background='rgba(220,38,38,0.12)'"
            onmouseout="this.style.background='rgba(220,38,38,0.06)'">
            🗑️ Borrar
          </button>
        </div>

      </article>
    `;
  }).join('');
}

function _timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return new Date(dateStr).toLocaleDateString('es-CO', { dateStyle: 'short' });
}


function renderSales() {
  const delivered = getOrders().filter((order) => order.status === 'entregado');
  if (!salesTableBody) return;
  salesTableBody.innerHTML = delivered.map((order) => {
    const pm = PAY_META[order.paymentMethod] || { label: order.paymentMethod || '—', color: '#6b7280', bg: '#f3f4f6' };
    const cost = Number(order.cost || 0);
    const profit = Number(order.total || 0) - cost;
    return `<tr>
      <td><strong>${escapeHTML(order.id)}</strong></td>
      <td>${escapeHTML(order.customer?.name || '—')}</td>
      <td><span style="background:${pm.bg};color:${pm.color};padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:700;">${pm.label}</span></td>
      <td>${formatDate(order.createdAt)}</td>
      <td><strong>${money(order.total)}</strong></td>
      <td style="color:var(--muted);">${cost > 0 ? money(cost) : '—'}</td>
      <td style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">${cost > 0 ? money(profit) : '—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted);">No hay ventas registradas.</td></tr>';
}

function renderInventory() {
  const products = getProducts();
  if (!inventoryList) return;
  inventoryCount.textContent = `${products.length} productos`;
  inventoryList.innerHTML = products.map(p => {
    const enabled = p.enabled !== false; // true por defecto
    return `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #eee; gap:10px; flex-wrap:wrap;">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="${enabled ? '' : 'color:#9ca3af; text-decoration:line-through;'}">${escapeHTML(p.name)}</strong>
          <span style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:999px;
            background:${enabled ? '#d1fae5' : '#fee2e2'}; color:${enabled ? '#059669' : '#dc2626'};">
            ${enabled ? '✅ Activo' : '🚫 Desactivado'}
          </span>
        </div>
        <div style="font-size:0.8rem; color:#666; margin-top:2px;">${escapeHTML(p.ingredients)}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; align-items:center;">
        <button onclick="toggleProductEnabled('${p.id}')" class="mini-btn"
          style="background:${enabled ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)'};
                 color:${enabled ? '#dc2626' : '#059669'};
                 border-color:${enabled ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)'};
                 font-weight:700;">
          ${enabled ? '🚫 Desactivar' : '✅ Activar'}
        </button>
        <button onclick="editProduct('${p.id}')" class="mini-btn">✏️ Editar</button>
        <button onclick="deleteProduct('${p.id}')" class="mini-btn danger">🗑️ Borrar</button>
      </div>
    </div>
  `;
  }).join('') || '<div class="empty-state">No hay productos.</div>';
}

window.toggleProductEnabled = (id) => {
  const products = getProducts();
  const updated = products.map(p => {
    if (p.id !== id) return p;
    const newState = p.enabled === false ? true : false;
    return { ...p, enabled: newState };
  });
  saveProducts(updated);
  renderInventory();
  const product = updated.find(p => p.id === id);
  showToast(product?.enabled !== false
    ? `✅ "${product?.name}" activado en el menú.`
    : `🚫 "${product?.name}" desactivado del menú.`);
};

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
  customersTableBody.innerHTML = users.map(user => {
    const phone = user.phone || user.whatsapp || '—';
    const waUrl = `https://wa.me/57${String(phone).replace(/\D/g, '')}`;
    return `<tr>
      <td><strong>${escapeHTML(user.name || '—')}</strong></td>
      <td><a href="${waUrl}" target="_blank" style="color:var(--primary);font-weight:700;text-decoration:none;">📱 ${escapeHTML(phone)}</a></td>
      <td>${escapeHTML(user.complex || '—')}</td>
      <td>T${escapeHTML(user.tower || '—')} · Apto ${escapeHTML(user.apartment || '—')}</td>
      <td style="text-align:center;"><button onclick="window.openCouponModal('${user.clientId}')" class="mini-btn" title="Enviar cupón">🎟️</button>
          <button onclick="deleteClient('${user.clientId}')" class="mini-btn danger">Borrar</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted);">Sin clientes registrados.</td></tr>';
}

window.deleteClient = (id) => {
   if (confirm('¿Borrar cliente?')) {
     const users = getJson(storage.users, []).filter(u => u.clientId !== id);
     setJson(storage.users, users);
     renderAll();
   }
};

let _renderAllTimeout = null;
function renderAll() {
  const sessionKey = getSessionKey();
  if (localStorage.getItem(sessionKey) !== 'true') return;
  
  // Debounce: si se llama varias veces en 150ms, solo ejecuta una vez
  clearTimeout(_renderAllTimeout);
  _renderAllTimeout = setTimeout(() => {
    renderDashboard();
    scheduleRenderOrders(); // usa debounce interno también
    renderInventory();
    renderSales();
    renderCustomers();
    renderSettings();
    renderAdditionals();
    renderCashRegister();
    renderPendingPayments();
  }, 150);
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
const expenseCat = document.getElementById('expenseCat');
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
  // Filtrar por fecha en zona horaria de Colombia (UTC-5)
  const dayOrders = orders.filter(o => {
    if (o.status !== 'entregado') return false;
    const localDate = new Date(o.createdAt);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const orderDate = localDate.toISOString().split('T')[0];
    return orderDate === date;
  });
  
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
