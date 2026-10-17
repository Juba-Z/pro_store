const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const config = require('./config');
const database = require('./database');

const app = express();

// إعداد مجلد المرفوعات
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// تجهيز Multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('الملف المرفوع يجب أن يكون صورة فقط (JPG, PNG, WebP)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB حد أقصى
});

// الوسائط العامة (Middlewares)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// تقديم الملفات الثابتة وملفات الرفع
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// وسيط التحقق من هوية الأدمن (Admin Auth Middleware)
function adminAuth(req, res, next) {
  let token = req.cookies.admin_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح بالدخول، يرجى تسجيل الدخول كأدمن' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'جلسة الدخول منتهية أو غير صحيحة' });
  }
}

// ==========================================
// 1. مسارات العميل (Customer Endpoints)
// ==========================================

// جلب الإعدادات العامة (أرقام الدفع والدعم)
app.get('/api/settings', (req, res) => {
  const settings = database.getSettings();
  res.json({ success: true, settings });
});

// جلب الباقات المتاحة للزبائن
app.get('/api/packages', (req, res) => {
  const packages = database.getActivePackages();
  res.json({ success: true, packages });
});

// إرسال طلب جديد من العميل
app.post('/api/orders', upload.single('receiptImage'), (req, res) => {
  try {
    const { customerName, whatsapp, email, senderPhone, packageId } = req.body;

    if (!whatsapp || !email || !senderPhone || !packageId) {
      return res.status(400).json({
        success: false,
        message: 'برجاء ملء جميع الحقول الإجبارية (رقم الواتساب، البريد، الرقم المحول منه، واختيار الباقة).'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'برجاء رفع صورة إيصال التحويل للتأكيد.'
      });
    }

    // التحقق من صحة البريد
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'صيغة البريد الإلكتروني غير صحيحة.' });
    }

    // جلب الباقة
    const pkg = database.getPackageById(packageId);
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'الباقة المحددة غير موجودة أو تم حذفها.' });
    }

    const order = database.addOrder({
      customerName: customerName || 'عميل المتجر',
      whatsapp,
      email,
      senderPhone,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.discountedPrice,
      receiptImage: '/uploads/' + req.file.filename
    });

    res.json({
      success: true,
      message: 'تم استلام طلبك بنجاح! سيتم مراجعته وتفعيله في أقرب وقت.',
      order: order
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب، حاول مرة أخرى.' });
  }
});

// تتبع حالة الطلب برقم الهاتف أو رقم الطلب
app.get('/api/orders/track', (req, res) => {
  const query = req.query.query || req.query.phone;
  if (!query) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال رقم الواتساب أو كود الطلب للبحث.' });
  }

  const orderById = database.getOrderById(query.trim());
  if (orderById) {
    return res.json({ success: true, orders: [orderById] });
  }

  const ordersByPhone = database.getOrdersByPhone(query.trim());
  return res.json({ success: true, orders: ordersByPhone });
});

// ==========================================
// 2. مسارات الأدمن (Admin Endpoints)
// ==========================================

// تسجيل دخول الأدمن
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
  }

  // البحث في الأدمنز الاستاتيك
  const admin = config.ADMINS.find(
    a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  );

  if (!admin) {
    return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة!' });
  }

  // إنشاء JWT
  const token = jwt.sign(
    { adminId: admin.id, email: admin.email, name: admin.name },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // تخزين الكوكي
  res.cookie('admin_token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  });

  res.json({
    success: true,
    message: `مرحباً بك يا ${admin.name}`,
    admin: { id: admin.id, email: admin.email, name: admin.name },
    token: token
  });
});

// التحقق من حالة تسجيل دخول الأدمن
app.get('/api/admin/me', adminAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// تسجيل الخروج
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// جلب جميع الطلبات والإحصائيات
app.get('/api/admin/orders', adminAuth, (req, res) => {
  const allOrders = database.getAllOrders();
  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  const activatedOrders = allOrders.filter(o => o.status === 'activated');
  const rejectedOrders = allOrders.filter(o => o.status === 'rejected');
  const stats = database.getStats();

  res.json({
    success: true,
    orders: allOrders,
    pending: pendingOrders,
    activated: activatedOrders,
    rejected: rejectedOrders,
    stats: stats
  });
});

// تغيير حالة الطلب (تفعيل أو رفض)
app.patch('/api/admin/orders/:id/status', adminAuth, (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!['activated', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'حالة الطلب غير صالحة' });
  }

  const updatedOrder = database.updateOrderStatus(id, status, req.admin.name, note);
  if (!updatedOrder) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  res.json({
    success: true,
    message: status === 'activated' ? 'تم تفعيل الطلب بنجاح' : 'تم تحديث حالة الطلب',
    order: updatedOrder
  });
});

// جلب كل الباقات (بما فيها غير المفعلة) للأدمن
app.get('/api/admin/packages', adminAuth, (req, res) => {
  const packages = database.getAllPackages();
  res.json({ success: true, packages });
});

// إضافة باقة جديدة
app.post('/api/admin/packages', adminAuth, upload.single('packageImage'), (req, res) => {
  try {
    const { name, category, description, originalPrice, discountedPrice, features } = req.body;

    if (!name || !discountedPrice) {
      return res.status(400).json({ success: false, message: 'اسم الباقة والسعر بعد الخصم مطلوبان.' });
    }

    let imagePath = '/assets/images/default-pkg.svg';
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    } else if (req.body.imageUrl) {
      imagePath = req.body.imageUrl;
    }

    const newPkg = database.addPackage({
      name,
      category,
      description,
      originalPrice,
      discountedPrice,
      image: imagePath,
      createdBy: req.admin.name,
      features
    });

    res.json({ success: true, message: 'تمت إضافة الباقة بنجاح', package: newPkg });
  } catch (err) {
    console.error('Error adding package:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة الباقة' });
  }
});

// تعديل باقة
app.patch('/api/admin/packages/:id', adminAuth, upload.single('packageImage'), (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = '/uploads/' + req.file.filename;
    }

    if (updateData.active !== undefined) {
      updateData.active = updateData.active === 'true' || updateData.active === true;
    }

    const updated = database.updatePackage(id, updateData);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'الباقة غير موجودة' });
    }

    res.json({ success: true, message: 'تم تحديث الباقة بنجاح', package: updated });
  } catch (err) {
    console.error('Error updating package:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تعديل الباقة' });
  }
});

// حذف باقة
app.delete('/api/admin/packages/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  database.deletePackage(id);
  res.json({ success: true, message: 'تم حذف الباقة بنجاح' });
});

// تحديث الإعدادات (أرقام الدفع والواتساب)
app.put('/api/admin/settings', adminAuth, (req, res) => {
  const updated = database.updateSettings(req.body);
  res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', settings: updated });
});

// التعامل مع الصفحات الرئيسية
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل السيرفر
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Pro Subscriptions Server is running!`);
  console.log(`🌐 Customer Site: http://localhost:${PORT}`);
  console.log(`🛡️ Admin Panel:   http://localhost:${PORT}/admin`);
  console.log(`===============================================`);
});
