// متغيرات الحالة العامة
let allPackages = [];
let siteSettings = {};

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadPackages();
  setupEventListeners();
});

// 1. جلب إعدادات الدفع والدعم
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      siteSettings = data.settings;
      
      // تحديث أرقام الدفع
      const cashEl = document.getElementById('cashNumberVal');
      if (cashEl && siteSettings.vodafoneCash) cashEl.textContent = siteSettings.vodafoneCash;

      const instaEl = document.getElementById('instapayAccountVal');
      if (instaEl && siteSettings.instapayAccount) instaEl.textContent = siteSettings.instapayAccount;

      // تحديث زر واتساب العائم
      const waFloat = document.getElementById('whatsappFloatBtn');
      if (waFloat && siteSettings.whatsappSupport) {
        const cleanNumber = siteSettings.whatsappSupport.replace(/\D/g, '');
        waFloat.href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent('السلام عليكم، محتاج استفسر عن اشتراكات برو ستور')}`;
      }
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
}

// 2. جلب الباقات المتاحة وعرضها
async function loadPackages() {
  const container = document.getElementById('packagesContainer');
  const select = document.getElementById('packageSelect');

  try {
    const res = await fetch('/api/packages');
    const data = await res.json();

    if (data.success && data.packages && data.packages.length > 0) {
      allPackages = data.packages;
      renderPackages(allPackages);
      populatePackageSelect(allPackages);
    } else {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">لا توجد باقات معروضة حالياً.</div>';
    }
  } catch (err) {
    console.error('Error loading packages:', err);
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--rose);">حدث خطأ أثناء تحميل الباقات، يرجى إعادة تحديث الصفحة.</div>';
  }
}

// عرض كروت الباقات في الصفحة
function renderPackages(packages) {
  const container = document.getElementById('packagesContainer');
  container.innerHTML = packages.map(pkg => {
    const featuresList = (pkg.features || []).map(f => `<li><span>✓</span> ${f}</li>`).join('');
    const discountPercent = pkg.originalPrice > pkg.discountedPrice
      ? Math.round(((pkg.originalPrice - pkg.discountedPrice) / pkg.originalPrice) * 100)
      : 0;

    return `
      <div class="package-card" id="card-${pkg.id}">
        ${discountPercent > 0 ? `<div class="package-badge-top">خصم ${discountPercent}% 🔥</div>` : ''}
        
        <div class="package-header">
          <img src="${pkg.image || '/assets/images/default-pkg.svg'}" alt="${pkg.name}" class="package-img" onerror="this.src='/assets/images/default-pkg.svg'">
          <div class="package-info">
            <span class="package-category">${pkg.category || 'اشتراك برو'}</span>
            <h3>${pkg.name}</h3>
          </div>
        </div>

        <p class="package-desc">${pkg.description || 'اشتراك رسمي ومميز مع كامل الصلاحيات والضمان.'}</p>

        ${featuresList ? `<ul class="package-features">${featuresList}</ul>` : ''}

        <div class="package-pricing">
          <div class="price-current">
            <span class="price-val">${pkg.discountedPrice}</span>
            <span class="price-curr">ج.م</span>
          </div>
          ${pkg.originalPrice && pkg.originalPrice > pkg.discountedPrice ? `
            <div class="price-old">${pkg.originalPrice} ج.م</div>
          ` : ''}
        </div>

        <button type="button" class="btn-select-package" onclick="selectPackage('${pkg.id}')">
          <span>اطلب الآن</span>
          <span>←</span>
        </button>
      </div>
    `;
  }).join('');
}

// ملء قائمة الاختيار في النموذج
function populatePackageSelect(packages) {
  const select = document.getElementById('packageSelect');
  select.innerHTML = '<option value="">-- اضغط لاختيار الباقة --</option>' +
    packages.map(pkg => `
      <option value="${pkg.id}" data-price="${pkg.discountedPrice}" data-name="${pkg.name}">
        ${pkg.name} - (${pkg.discountedPrice} ج.م)
      </option>
    `).join('');
}

// عند اختيار باقة معينة بالضغط على الزر
function selectPackage(pkgId) {
  const pkg = allPackages.find(p => p.id === pkgId);
  if (!pkg) return;

  const select = document.getElementById('packageSelect');
  select.value = pkg.id;
  updateSelectedPackageCard(pkg);

  // التمرير السلس للنموذج
  const orderSection = document.getElementById('order-form-section');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// تحديث كارت الملخص للباقة المختارة
function updateSelectedPackageCard(pkg) {
  const nameEl = document.getElementById('summaryPkgName');
  const priceEl = document.getElementById('summaryPkgPrice');

  if (pkg) {
    nameEl.textContent = pkg.name;
    priceEl.textContent = `${pkg.discountedPrice} ج.م`;
  } else {
    nameEl.textContent = 'برجاء اختيار باقة';
    priceEl.textContent = '- ج.م';
  }
}

// نسخ النصوص بضغطة زر
function copyText(elementId, btnElement) {
  const textEl = document.getElementById(elementId);
  if (!textEl) return;
  const text = textEl.textContent.trim();

  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<span>تم النسخ!</span> <span>✓</span>';
    btnElement.classList.add('copied');

    setTimeout(() => {
      btnElement.innerHTML = originalText;
      btnElement.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('تم نسخ: ' + text);
  });
}

// إعداد أحداث الصفحة
function setupEventListeners() {
  // تفاعل تغيير قائمة الباقات
  const packageSelect = document.getElementById('packageSelect');
  if (packageSelect) {
    packageSelect.addEventListener('change', (e) => {
      const pkg = allPackages.find(p => p.id === e.target.value);
      updateSelectedPackageCard(pkg);
    });
  }

  // رفع ومعاينة صورة التحويل
  const fileInput = document.getElementById('receiptFileInput');
  const previewWrap = document.getElementById('filePreviewWrap');
  const previewImg = document.getElementById('previewImage');
  const previewName = document.getElementById('previewName');
  const btnRemove = document.getElementById('btnRemoveFile');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        previewName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewWrap.style.display = 'flex';
        };
        reader.readAsDataURL(file);
      }
    });

    btnRemove.addEventListener('click', () => {
      fileInput.value = '';
      previewWrap.style.display = 'none';
      previewImg.src = '';
    });
  }

  // إرسال الطلب (Submit Order)
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btnSubmitOrder');
      const originalBtnHtml = btnSubmit.innerHTML;

      // تحقق إضافي
      if (!fileInput.files || !fileInput.files[0]) {
        alert('برجاء رفع صورة إيصال التحويل أولاً.');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span>جاري إرسال الطلب وحفظ البيانات...</span> <span>⏳</span>';

      const formData = new FormData(orderForm);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (data.success && data.order) {
          showSuccessModal(data.order);
          orderForm.reset();
          previewWrap.style.display = 'none';
          updateSelectedPackageCard(null);
        } else {
          alert('تنبيه: ' + (data.message || 'تعذر إرسال الطلب، تأكد من صحة البيانات.'));
        }
      } catch (err) {
        console.error('Order submission error:', err);
        alert('حدث خطأ بالاتصال بالسيرفر، برجاء المحاولة مجدداً.');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnHtml;
      }
    });
  }

  // تتبع الطلب (Track Order)
  const trackForm = document.getElementById('trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('trackInput');
      const resultsDiv = document.getElementById('trackResults');
      const query = input.value.trim();

      if (!query) return;

      resultsDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">جاري البحث...</div>';

      try {
        const res = await fetch(`/api/orders/track?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.orders && data.orders.length > 0) {
          renderTrackResults(data.orders);
        } else {
          resultsDiv.innerHTML = `
            <div style="background: var(--status-error-bg); border: 1px solid var(--status-error-border); color: var(--status-error); padding: 14px; border-radius: var(--radius-md); text-align: center; font-size: 0.9rem;">
              لم نجد أي طلبات مسجلة بهذا الرقم أو الكود. تأكد من إدخال نفس الرقم الذي سجلت به.
            </div>
          `;
        }
      } catch (err) {
        console.error('Track error:', err);
        resultsDiv.innerHTML = '<div style="color: var(--status-error); text-align: center; padding: 10px;">حدث خطأ أثناء البحث، حاول مجدداً.</div>';
      }
    });
  }
}

// عرض نتائج تتبع الطلب للعميل
function renderTrackResults(orders) {
  const container = document.getElementById('trackResults');
  
  const statusLabels = {
    pending: { text: 'قيد المراجعة والتأكيد ⏳', class: 'status-pending' },
    activated: { text: 'تم التفعيل بنجاح ✅', class: 'status-activated' },
    rejected: { text: 'مشكلة في الإيصال / مرفوض ⚠️', class: 'status-rejected' }
  };

  container.innerHTML = orders.map(ord => {
    const statusObj = statusLabels[ord.status] || statusLabels.pending;
    const dateFormatted = new Date(ord.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="track-card">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="color: var(--text-main); font-size: 1.05rem;">${ord.packageName}</strong>
            <span style="font-size: 0.8rem; color: var(--text-secondary); font-family: monospace;">(${ord.orderNumber})</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">تاريخ الطلب: ${dateFormatted}</div>
          ${ord.statusNote ? `<div style="font-size: 0.82rem; color: var(--status-warning); margin-top: 4px; font-weight: 600;">ملاحظة الإدارة: ${ord.statusNote}</div>` : ''}
        </div>
        <div>
          <span class="track-status-badge ${statusObj.class}">${statusObj.text}</span>
        </div>
      </div>
    `;
  }).join('');
}

// إظهار نافذة النجاح
function showSuccessModal(order) {
  const modal = document.getElementById('successModal');
  const orderNumEl = document.getElementById('modalOrderNumber');
  const waLink = document.getElementById('modalWhatsappLink');

  orderNumEl.textContent = order.orderNumber;

  // إعداد رسالة الواتساب الجاهزة
  const supportNum = (siteSettings.whatsappSupport || '201012345678').replace(/\D/g, '');
  const messageText = `مرحباً، قمت بإرسال طلب اشتراك جديد على الموقع:
📌 كود الطلب: ${order.orderNumber}
📦 الباقة: ${order.packageName} (${order.packagePrice} ج.م)
📱 رقم الواتساب: ${order.whatsapp}
💳 الرقم المحول منه: ${order.senderPhone}
📧 البريد: ${order.email}

برجاء مراجعة الإيصال وتفعيل الحساب. شكراً لكم!`;

  waLink.href = `https://wa.me/${supportNum}?text=${encodeURIComponent(messageText)}`;
  modal.classList.add('active');
}

// إغلاق نافذة النجاح
function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  modal.classList.remove('active');
}
