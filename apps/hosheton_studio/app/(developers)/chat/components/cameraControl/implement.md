بله. چیزی که در تصویر می‌بینید در اصل یک **3D Camera Angle Controller / Camera Pose Selector** است؛ یعنی کاربر روی یک کره‌ی سه‌بعدی drag می‌کند و پارامترهایی مثل **Rotation / Tilt / Zoom** تغییر می‌کنند.

برای ساخت دقیقاً چنین چیزی در **Next.js**، پیشنهاد اصلی من:

### بهترین Stack

* **Next.js**
* **React Three Fiber (`@react-three/fiber`)** → رندر 3D با Three.js در React
* **Three.js** → موتور 3D
* **`@react-three/drei`** → کنترل‌های آماده مثل `OrbitControls`
* **Zustand** → نگهداری state زاویه‌ها، اگر پروژه بزرگ است
* Tailwind CSS → برای ساخت پنل سمت راست

معماری تقریباً این شکلی می‌شود:

```text
Next.js
│
├── ImageViewer
│
└── CameraAngleController
     │
     ├── Three.js / React Three Fiber
     │    ├── Wireframe Sphere
     │    ├── Camera
     │    ├── Target Image
     │    └── Interaction
     │
     └── Controls
          ├── Rotation: 315°
          ├── Tilt: 30°
          └── Zoom: 0
```

### برای خود کره‌ی سمت راست

مثلاً با `react-three-fiber`:

```tsx
<Canvas>
  <ambientLight />

  <mesh>
    <sphereGeometry args={[1, 32, 32]} />
    <meshBasicMaterial
      wireframe
      transparent
      opacity={0.25}
    />
  </mesh>

  <OrbitControls
    enableZoom={false}
    enablePan={false}
  />
</Canvas>
```

اما نکته مهم این است که **`OrbitControls` به تنهایی کافی نیست**. برای چیزی که در تصویر می‌بینید، بهتر است interaction را خودتان کنترل کنید تا:

```text
drag →
   azimuth / rotation
   elevation / tilt
   zoom
```

به مقادیر مشخص تبدیل شود.

مثلاً state:

```ts
const [camera, setCamera] = useState({
  rotation: 315,
  tilt: 30,
  zoom: 0,
});
```

و سپس:

```ts
const x = radius * Math.cos(tilt) * Math.sin(rotation);
const y = radius * Math.sin(tilt);
const z = radius * Math.cos(tilt) * Math.cos(rotation);
```

و موقع drag، این مقادیر را تغییر می‌دهید.

---

### اگر منظورتان بخش AI تصویر است

یک نکته خیلی مهم وجود دارد.

تصویر شما احتمالاً فقط یک **3D UI برای انتخاب زاویه** نیست. اگر هدف نهایی این است که مثلاً:

> «این عکس را از زاویه 315° و Tilt=30° دوباره تولید کن»

آن‌وقت معماری باید دو قسمت داشته باشد:

```text
                Next.js
                   │
       ┌───────────┴───────────┐
       │                       │
  Angle Controller         Image Preview
       │                       │
 rotation / tilt / zoom       image
       │
       ▼
    API Route
       │
       ▼
 AI Image Model
```

یعنی Three.js فقط **pose دوربین** را تعیین می‌کند؛ خودش عکس جدید تولید نمی‌کند.

برای چنین سیستمی می‌توانید مثلاً از یک مدل image-generation/editing که **camera/pose conditioning** را پشتیبانی می‌کند استفاده کنید. این قسمت وابسته به مدل AI انتخابی شماست.

---

### اگر فقط می‌خواهید UI تصویر را بسازید

حتی لازم نیست کل Three.js را وارد کنید. می‌شود یک **Canvas/WebGL component** کوچک ساخت:

```text
┌──────────────────────────────┐
│                              │
│       3D wireframe           │
│          sphere              │
│             ●                │
│        ↗ camera              │
│                              │
│ Rotation ─────────── 315°    │
│ Tilt     ─────────── 30°     │
│ Zoom     ─────────── 0       │
└──────────────────────────────┘
```

و با drag کردن نقطه‌ی camera روی sphere، مقدارهای `rotation` و `tilt` را محاسبه کنیم.

**برای چیزی که در screenshot شماست، من `React Three Fiber + Drei` را انتخاب می‌کنم.** هم کنترل سه‌بعدی واقعی دارید، هم بعداً می‌توانید camera، grid، image plane و حتی preview زنده را به آن اضافه کنید.

اگر بخواهید، می‌توانم **همین UI سمت راست تصویر را به صورت یک کامپوننت آماده Next.js + TypeScript + Tailwind + Three.js** برایتان پیاده‌سازی کنم، با **کره‌ی wireframe قابل drag، Rotation/Tilt/Zoom و ظاهر تقریباً مشابه همین screenshot**.
