const fs = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = path.join(__dirname, 'data');
const PACKAGES_FILE = path.join(DATA_DIR, 'packages.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// التأكد من وجود مجلد البيانات
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// دالة مساعدة لقراءة ملف JSON
function readJSON(filePath, defaultData) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultData;
  }
}

// دالة مساعدة لكتابة ملف JSON بأمان
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// الباقات الافتراضية الأولية
const INITIAL_PACKAGES = [
  {
    id: 'pkg_gemini_pro',
    name: 'Google Gemini Advanced',
    category: 'ذكاء اصطناعي',
    description: 'وصول كامل لـ Gemini 1.5 Pro مع نافذة سياق 1M Tokens ومساحة 2TB Google One.',
    originalPrice: 850,
    discountedPrice: 280,
    image: '/assets/images/gemini.svg',
    createdBy: 'النظام الافتراضي',
    active: true,
    features: ['مساحة 2TB على Google Drive', 'نموذج Gemini 1.5 Pro فائق السرعة', 'دعم كتابة وبرمجة وتحليل ملفات'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pkg_adobe_cc',
    name: 'Adobe Creative Cloud (الكل)',
    category: 'تصميم ومونتاج',
    description: 'حساب رسمي لجميع برامج أدوبي (Photoshop, Illustrator, Premiere, After Effects) وميزات Firefly الذكاء الاصطناعي.',
    originalPrice: 1200,
    discountedPrice: 390,
    image: '/assets/images/adobe.svg',
    createdBy: 'النظام الافتراضي',
    active: true,
    features: ['أكثر من 20 برنامج احترافي', 'ميزات Firefly لتوليد الصور بالذكاء الاصطناعي', 'تحديثات مستمرة ومساحة سحابية'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pkg_chatgpt_plus',
    name: 'ChatGPT Plus (GPT-4o)',
    category: 'ذكاء اصطناعي',
    description: 'الوصول المتميز لنموذج GPT-4o وتوليد الصور DALL-E وتحليل البيانات والإنترنت المباشر.',
    originalPrice: 1000,
    discountedPrice: 350,
    image: '/assets/images/chatgpt.svg',
    createdBy: 'النظام الافتراضي',
    active: true,
    features: ['وصول أولوية لـ GPT-4o', 'توليد الصور DALL-E 3 بدقة عالية', 'تحليل البيانات والمستندات البرمجية'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pkg_canva_pro',
    name: 'Canva Pro (كانفا برو)',
    category: 'تصميم سريع',
    description: 'وصول غير محدود لجميع القوالب المدفوعة وإزالة الخلفية بضغطة زر وتنزيل بدقة 4K.',
    originalPrice: 350,
    discountedPrice: 99,
    image: '/assets/images/canva.svg',
    createdBy: 'النظام الافتراضي',
    active: true,
    features: ['أكثر من 100 مليون صورة وعنصر مدفوع', 'ميزة إزالة خلفية الصور والفيديوهات', 'تصدير بجودة فائقة وتغيير الأحجام بضغطة واحدة'],
    createdAt: new Date().toISOString()
  }
];

// تهيئة الملفات إذا لم تكن موجودة
if (!fs.existsSync(PACKAGES_FILE)) {
  writeJSON(PACKAGES_FILE, INITIAL_PACKAGES);
}
if (!fs.existsSync(ORDERS_FILE)) {
  writeJSON(ORDERS_FILE, []);
}
if (!fs.existsSync(SETTINGS_FILE)) {
  writeJSON(SETTINGS_FILE, config.DEFAULT_SETTINGS);
}

// دوال إدارة الباقات
const database = {
  // --- الباقات (Packages) ---
  getAllPackages: () => {
    return readJSON(PACKAGES_FILE, []);
  },

  getActivePackages: () => {
    const list = readJSON(PACKAGES_FILE, []);
    return list.filter(p => p.active !== false);
  },

  getPackageById: (id) => {
    const list = readJSON(PACKAGES_FILE, []);
    return list.find(p => p.id === id);
  },

  addPackage: (pkgData) => {
    const list = readJSON(PACKAGES_FILE, []);
    const newPackage = {
      id: 'pkg_' + Date.now(),
      name: pkgData.name,
      category: pkgData.category || 'اشتراكات عامة',
      description: pkgData.description,
      originalPrice: Number(pkgData.originalPrice) || 0,
      discountedPrice: Number(pkgData.discountedPrice) || 0,
      image: pkgData.image || '/assets/images/default-pkg.svg',
      createdBy: pkgData.createdBy || 'المدير',
      active: true,
      features: Array.isArray(pkgData.features) ? pkgData.features : (pkgData.features ? pkgData.features.split('\n').filter(Boolean) : []),
      createdAt: new Date().toISOString()
    };
    list.unshift(newPackage);
    writeJSON(PACKAGES_FILE, list);
    return newPackage;
  },

  updatePackage: (id, updateData) => {
    const list = readJSON(PACKAGES_FILE, []);
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updateData,
      originalPrice: updateData.originalPrice !== undefined ? Number(updateData.originalPrice) : list[index].originalPrice,
      discountedPrice: updateData.discountedPrice !== undefined ? Number(updateData.discountedPrice) : list[index].discountedPrice,
      updatedAt: new Date().toISOString()
    };
    writeJSON(PACKAGES_FILE, list);
    return list[index];
  },

  deletePackage: (id) => {
    const list = readJSON(PACKAGES_FILE, []);
    const filtered = list.filter(p => p.id !== id);
    writeJSON(PACKAGES_FILE, filtered);
    return true;
  },

  // --- الطلبات (Orders) ---
  getAllOrders: () => {
    return readJSON(ORDERS_FILE, []);
  },

  getOrderById: (id) => {
    const list = readJSON(ORDERS_FILE, []);
    return list.find(o => o.id === id || o.orderNumber === id);
  },

  getOrdersByPhone: (phone) => {
    const clean = String(phone).replace(/\D/g, '');
    const list = readJSON(ORDERS_FILE, []);
    return list.filter(o => {
      const oPhone = String(o.whatsapp).replace(/\D/g, '');
      const oSender = String(o.senderPhone).replace(/\D/g, '');
      return oPhone.includes(clean) || oSender.includes(clean);
    });
  },

  addOrder: (orderData) => {
    const list = readJSON(ORDERS_FILE, []);
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
      id: 'ord_' + Date.now(),
      orderNumber: orderNumber,
      customerName: (orderData.customerName || 'عميل مميز').trim(),
      whatsapp: orderData.whatsapp.trim(),
      email: orderData.email.trim(),
      senderPhone: orderData.senderPhone.trim(),
      packageId: orderData.packageId,
      packageName: orderData.packageName,
      packagePrice: orderData.packagePrice,
      receiptImage: orderData.receiptImage, // مسار الصورة المرفوعة
      status: 'pending', // pending | activated | rejected
      statusNote: '',
      activatedBy: null,
      activatedAt: null,
      createdAt: new Date().toISOString()
    };
    list.unshift(newOrder);
    writeJSON(ORDERS_FILE, list);
    return newOrder;
  },

  updateOrderStatus: (id, status, adminName, note = '') => {
    const list = readJSON(ORDERS_FILE, []);
    const index = list.findIndex(o => o.id === id || o.orderNumber === id);
    if (index === -1) return null;

    list[index].status = status;
    list[index].statusNote = note || list[index].statusNote;

    if (status === 'activated') {
      list[index].activatedBy = adminName;
      list[index].activatedAt = new Date().toISOString();
    } else if (status === 'rejected') {
      list[index].rejectedBy = adminName;
      list[index].rejectedAt = new Date().toISOString();
    }

    writeJSON(ORDERS_FILE, list);
    return list[index];
  },

  // --- الإحصائيات (Stats) ---
  getStats: () => {
    const orders = readJSON(ORDERS_FILE, []);
    const packages = readJSON(PACKAGES_FILE, []);

    const pending = orders.filter(o => o.status === 'pending');
    const activated = orders.filter(o => o.status === 'activated');
    const rejected = orders.filter(o => o.status === 'rejected');
    
    const totalRevenue = activated.reduce((sum, o) => sum + (Number(o.packagePrice) || 0), 0);

    return {
      totalOrders: orders.length,
      pendingCount: pending.length,
      activatedCount: activated.length,
      rejectedCount: rejected.length,
      totalRevenue: totalRevenue,
      packagesCount: packages.length
    };
  },

  // --- الإعدادات (Settings) ---
  getSettings: () => {
    return readJSON(SETTINGS_FILE, config.DEFAULT_SETTINGS);
  },

  updateSettings: (newSettings) => {
    const current = readJSON(SETTINGS_FILE, config.DEFAULT_SETTINGS);
    const updated = { ...current, ...newSettings };
    writeJSON(SETTINGS_FILE, updated);
    return updated;
  }
};

module.exports = database;
