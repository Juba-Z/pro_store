// حالة الأدمن الحالية
let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupAdminEvents();
});

// 1. التحقق من جلسة الأدمن
async function checkAuth() {
  try {
    const res = await fetch('/api/admin/me');
    const data = await res.json();
    if (data.success && data.admin) {
      currentAdmin = data.admin;
      showDashboard();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardLayout').classList.remove('active');
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardLayout').classList.add('active');
  document.getElementById('adminNameDisplay').textContent = `المدير: ${currentAdmin.name}`;
  loadAdminData();
  loadAdminPackages();
  loadAdminSettings();
}

// 2. تسجيل الدخول
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    btn.disabled = true;
    btn.innerHTML = '<span>جاري التحقق...</span> <span>⏳</span>';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success && data.admin) {
        currentAdmin = data.admin;
        showDashboard();
      } else {
        alert('خطأ: ' + (data.message || 'بيانات الدخول غير صحيحة'));
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('تعذر الاتصال بالسيرفر، تأكد من تشغيل الخادم.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>دخول لوحة التحكم</span> <span>←</span>';
    }
  });
}

// تسجيل الخروج
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
      await fetch('/api/admin/logout', { method: 'POST' });
      currentAdmin = null;
      showLogin();
    }
  });
}

// 3. جلب الطلبات وتحديث الجداول والإحصائيات
async function loadAdminData() {
  try {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();

    if (data.success) {
      updateStats(data.stats);
      renderPendingOrders(data.pending || []);
      renderActivatedOrders(data.activated || []);

      // تحديث البادج في التبويبات
      document.getElementById('badgePendingCount').textContent = (data.pending || []).length;
      document.getElementById('badgeActivatedCount').textContent = (data.activated || []).length;
    }
  } catch (err) {
    console.error('Error fetching admin orders:', err);
  }
}

// تحديث كروت الإحصائيات
function updateStats(stats) {
  if (!stats) return;
  document.getElementById('statPending').textContent = stats.pendingCount || 0;
  document.getElementById('statActivated').textContent = stats.activatedCount || 0;
  document.getElementById('statRevenue').textContent = `${(stats.totalRevenue || 0).toLocaleString('ar-EG')} ج.م`;
  document.getElementById('statPackages').textContent = stats.packagesCount || 0;
}

// عرض جدول الطلبات المعلقة (Pending)
function renderPendingOrders(orders) {
  const tbody = document.getElementById('pendingOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 35px;">
          🎉 لا توجد طلبات معلقة حالياً، تم فحص جميع الطلبات!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(ord => {
    const cleanPhone = ord.whatsapp.replace(/\D/g, '');
    const dateFormatted = new Date(ord.createdAt).toLocaleDateString('ar-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr id="row-${ord.id}">
        <td><strong style="color: var(--admin-primary); font-family: monospace;">${ord.orderNumber}</strong></td>
        <td><strong>${escapeHtml(ord.customerName)}</strong></td>
        <td>
          <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-whatsapp-chat" title="محادثة واتساب مباشرة">
            <span>${ord.whatsapp}</span>
            <span>💬</span>
          </a>
        </td>
        <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(ord.email)}</span></td>
        <td>
          <img src="${ord.receiptImage}" alt="إيصال" class="receipt-thumb" onclick="openImageModal('${ord.receiptImage}')" title="اضغط للتكبير">
        </td>
        <td><span style="font-family: monospace; font-weight: 700;">${ord.senderPhone}</span></td>
        <td><span style="color: var(--text-main); font-weight: 700;">${escapeHtml(ord.packageName)}</span></td>
        <td><strong>${ord.packagePrice} ج.م</strong></td>
        <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${dateFormatted}</span></td>
        <td>
          <div class="action-btn-group">
            <button type="button" class="btn-activate" onclick="markOrderActivated('${ord.id}', '${ord.orderNumber}')" title="تفعيل الاشتراك">
              <span>تفعيل الحساب ✅</span>
            </button>
            <button type="button" class="btn-reject" onclick="markOrderIssue('${ord.id}', '${ord.orderNumber}')" title="مشكلة في التحويل">
              <span>مشكلة ⚠️</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// عرض جدول الطلبات المفعلة (Activated)
function renderActivatedOrders(orders) {
  const tbody = document.getElementById('activatedOrdersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 35px;">
          لا توجد طلبات مفعلة حتى الآن.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(ord => {
    const cleanPhone = ord.whatsapp.replace(/\D/g, '');
    const orderDate = new Date(ord.createdAt).toLocaleDateString('ar-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const activatedDate = ord.activatedAt ? new Date(ord.activatedAt).toLocaleDateString('ar-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    return `
      <tr>
        <td><strong style="color: var(--admin-emerald); font-family: monospace;">${ord.orderNumber}</strong></td>
        <td><strong>${escapeHtml(ord.customerName)}</strong></td>
        <td>
          <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-whatsapp-chat">
            <span>${ord.whatsapp}</span>
            <span>💬</span>
          </a>
        </td>
        <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(ord.email)}</span></td>
        <td>
          <img src="${ord.receiptImage}" alt="إيصال" class="receipt-thumb" onclick="openImageModal('${ord.receiptImage}')" title="اضغط للتكبير">
        </td>
        <td><span style="font-family: monospace;">${ord.senderPhone}</span></td>
        <td><span style="color: var(--text-main); font-weight: 700;">${escapeHtml(ord.packageName)}</span></td>
        <td><strong>${ord.packagePrice} ج.م</strong></td>
        <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${orderDate}</span></td>
        <td><strong style="color: var(--admin-emerald); font-size: 0.85rem;">${activatedDate}</strong></td>
        <td>
          <span style="background: var(--admin-primary-tint); color: var(--admin-primary); border: 1px solid var(--admin-primary-border); padding: 3px 10px; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.8rem;">
            👤 ${escapeHtml(ord.activatedBy || 'المدير')}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// تفعيل الطلب
async function markOrderActivated(orderId, orderNum) {
  if (!confirm(`هل أنت متأكد من تفعيل الطلب (${orderNum}) وتسجيله باسمك؟`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'activated' })
    });

    const data = await res.json();
    if (data.success) {
      loadAdminData();
    } else {
      alert('خطأ: ' + data.message);
    }
  } catch (err) {
    console.error('Activation error:', err);
    alert('حدث خطأ أثناء التفعيل.');
  }
}

// تعليم الطلب بوجود مشكلة
async function markOrderIssue(orderId, orderNum) {
  const note = prompt(`اكتب سبب المشكلة للطلب (${orderNum}):\n(مثلاً: الإيصال غير واضح، المبلغ ناقص، لم يصل التحويل)`, 'لم يصل التحويل على المحفظة');
  if (note === null) return; // تم الإلغاء

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', note: note })
    });

    const data = await res.json();
    if (data.success) {
      loadAdminData();
    } else {
      alert('خطأ: ' + data.message);
    }
  } catch (err) {
    console.error('Error rejecting order:', err);
  }
}

// 4. إدارة الباقات (عرض وإضافة وحذف)
async function loadAdminPackages() {
  const container = document.getElementById('adminPackagesList');
  try {
    const res = await fetch('/api/admin/packages');
    const data = await res.json();

    if (data.success && data.packages) {
      renderAdminPackages(data.packages);
    }
  } catch (err) {
    console.error('Error fetching admin packages:', err);
  }
}

function renderAdminPackages(packages) {
  const container = document.getElementById('adminPackagesList');
  container.innerHTML = packages.map(pkg => {
    return `
      <div class="admin-pkg-card">
        <div>
          <div class="admin-pkg-header">
            <img src="${pkg.image || '/assets/images/default-pkg.svg'}" class="admin-pkg-thumb" onerror="this.src='/assets/images/default-pkg.svg'">
            <div>
              <h4 style="color: var(--text-main); font-size: 1.05rem; font-weight: 700;">${escapeHtml(pkg.name)}</h4>
              <span style="font-size: 0.8rem; color: var(--admin-primary); font-weight: 700;">${escapeHtml(pkg.category || 'عام')}</span>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">
            ${escapeHtml(pkg.description || '')}
          </p>
          <div style="display: flex; gap: 15px; margin-bottom: 12px; font-size: 0.9rem;">
            <span>السعر: <strong style="color: var(--admin-primary); font-weight: 800;">${pkg.discountedPrice} ج.م</strong></span>
            ${pkg.originalPrice ? `<span style="color: var(--text-muted); text-decoration: line-through;">${pkg.originalPrice} ج.م</span>` : ''}
          </div>
        </div>

        <div style="border-top: 1px solid var(--admin-border); padding-top: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.78rem; color: var(--text-secondary);">
            👤 أُضيفت بواسطة: <strong>${escapeHtml(pkg.createdBy || 'المدير')}</strong>
          </span>
          <button type="button" class="btn-reject" onclick="deletePackage('${pkg.id}', '${pkg.name}')" style="padding: 4px 10px;">
            حذف 🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// إضافة باقة جديدة
const addPackageForm = document.getElementById('addPackageForm');
if (addPackageForm) {
  addPackageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnAddPackage');
    const originalBtn = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span>جاري إضافة الباقة...</span> <span>⏳</span>';

    const formData = new FormData(addPackageForm);

    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert('تمت إضافة الباقة بنجاح!');
        addPackageForm.reset();
        loadAdminPackages();
        loadAdminData();
      } else {
        alert('خطأ: ' + data.message);
      }
    } catch (err) {
      console.error('Error adding package:', err);
      alert('حدث خطأ أثناء رفع الباقة.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtn;
    }
  });
}

// حذف باقة
async function deletePackage(id, name) {
  if (!confirm(`هل أنت متأكد من حذف باقة "${name}" نهائياً من المتجر؟`)) return;

  try {
    const res = await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadAdminPackages();
      loadAdminData();
    }
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// 5. إعدادات الموقع وأرقام الدفع
async function loadAdminSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      document.getElementById('settingVodafone').value = data.settings.vodafoneCash || '';
      document.getElementById('settingInstapay').value = data.settings.instapayAccount || '';
      document.getElementById('settingWhatsapp').value = data.settings.whatsappSupport || '';
      document.getElementById('settingNotice').value = data.settings.activationTimeNotice || '';
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    const bodyObj = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });
      const data = await res.json();
      if (data.success) {
        alert('تم حفظ وتحديث الإعدادات بنجاح!');
      } else {
        alert('حدث خطأ في حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Settings save error:', err);
    }
  });
}

// 6. معاينة صورة الإيصال بحجم كبير
function openImageModal(imgSrc) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('imageModalImg');
  img.src = imgSrc;
  modal.classList.add('active');
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeImageModal();
});

// 7. إدارة التبويبات
function setupAdminEvents() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.style.display = 'block';
      }
    });
  });
}

// دالة مساعدة لتفادي XSS
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
