module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'pro_subscriptions_secret_key_2026',
  
  // بيانات الـ 2 أدمن الاستاتيك
  ADMINS: [
    {
      id: 'admin_1',
      email: 'admin1@pro.com',
      password: 'admin1234@password',
      name: 'أدمن 1 (رئيسي)'
    },
    {
      id: 'admin_2',
      email: 'admin2@pro.com',
      password: 'admin5678@password',
      name: 'أدمن 2'
    }
  ],

  // الإعدادات الافتراضية للدفع والدعم (يمكن تعديلها من لوحة التحكم أيضاً)
  DEFAULT_SETTINGS: {
    siteName: 'برو ستور - اشتراكات الذكاء الاصطناعي والتصميم',
    vodafoneCash: '01012345678',
    instapayAccount: 'prostore@instapay',
    whatsappSupport: '201012345678',
    activationTimeNotice: 'من 15 إلى 30 دقيقة خلال ساعات العمل'
  }
};
