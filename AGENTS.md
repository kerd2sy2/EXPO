# قواعد هندسة وتطوير التطبيق (Application Architecture & Engineering Guidelines)

## 1. تقسيم التطبيق إلى Modules
- يجب تقسيم التطبيق إلى Modules واضحة ومستقلة حسب الوظيفة، وعدم وضع جميع وظائف التطبيق داخل ملف واحد.
- كل Module مسؤول عن وظيفة أو نطاق محدد فقط، ويجب أن يكون قابلاً للتطوير والتعديل دون التأثير غير الضروري على باقي أجزاء التطبيق.

## 2. كل Feature في ملفات مستقلة
عند إضافة Feature جديدة:
- لا تضع الكود داخل ملف ضخم موجود مسبقاً.
- أنشئ ملفات جديدة مناسبة للـ Feature.
- افصل الـ UI عن الـ Business Logic.
- افصل الـ API/Database logic عن الواجهة.
- افصل الـ Types والـ Interfaces عن التنفيذ عندما يكون ذلك مناسباً.
- اجعل كل ملف مسؤولاً عن شيء واحد واضح (Single Responsibility).

## 3. ممنوع Monolithic Files (الملفات الضخمة)
ممنوع نهائياً إنشاء ملف واحد يحتوي على:
- جميع الـ Components
- جميع الـ API calls
- جميع الـ Business Logic
- جميع الـ State management
- جميع الـ Validation
- جميع الـ Utilities
- جميع الـ Features

## 4. إضافة كل Feature بشكل مستقل
- فهم الـ Feature ومتطلباتها.
- إنشاء المجلد والملفات المطلوبة وتصدير الـ Entry Point.
- عدم تعديل ملفات غير مرتبطة بالميزة إلا عند الضرورة القصوى.
- تجنب تكرار الكود (DRY Principle).

## 5. فصل المسؤوليات (Separation of Concerns)
- **UI**: عرض البيانات وتفاعل المستخدم فقط.
- **Services**: مسؤولة عن API requests والـ External integrations.
- **Business Logic**: مفصولة في Hooks أو Controllers ومستقلة عن الـ UI.
- **Types**: في ملفات منظمة وقابلة لإعادة الاستخدام.
- **Utils**: الدوال والمساعدات العامة.

## 6. اتجاه الاعتماديات (Dependency Direction)
```text
UI (Views / Screens)
  ↓
Hooks / Controllers
  ↓
Services / APIs
  ↓
Data / Network Layer
```

## 7. الهدف الأساسي
**Clean Architecture + Modular Structure + Separation of Concerns + Reusable Code + Easy Maintenance**

## 8. القاعدة الذهبية للتطوير المستقبلي (Golden Rule)
- **إلزامية المعمارية النمطية (Modular by Default):**
  أي Feature جديدة بعد هذه المرحلة يجب أن تتبع نفس الـ Modular Architecture تلقائيًا، ولا يجوز مطلقاً الرجوع إلى نمط Monolithic Files حتى لو كان أسرع في التنفيذ.
- **مرحلة المشروع الحالية:**
  المشروع انتقل رسمياً وبشكل دائم إلى مرحلة **Maintenance & Feature Development** بدلاً من إعادة الهيكلة المستمرة.
- **هيكل أي Feature جديدة:**
  ```text
  src/features/<feature-name>/
  ├── components/
  ├── hooks/
  ├── services/
  ├── types/
  ├── <FeatureContainer>.tsx
  └── index.ts
  ```

