# ModalHelper

مودال مشترک همه اپ‌ها — **وب:** مودال وسط صفحه، **موبایل (زیر ۵۷۶px):** BottomSheet با [Vaul](https://vaul.emilkowal.ski/).
هر مودال/دیالوگ/BottomSheet جدید در پروژه‌ها باید با همین کامپوننت ساخته شود (قاعده در `AGENTS.md` ریشه).

```tsx
import { ModalHelper } from '@my-workspace/components';

<ModalHelper
  open={open}
  onClose={() => setOpen(false)}
  size="lg"
  sheetTitle="گزارش جدید"
  component={open ? <CreateReportForm onDone={() => setOpen(false)} /> : null}
/>
```

## Props

| prop | نوع | پیش‌فرض | توضیح |
|---|---|---|---|
| `open` | `boolean` | — | باز/بسته بودن |
| `onClose` | `() => void` | — | بستن (دکمه ✕، کلیک بیرون، Escape، کشیدن شیت به پایین) |
| `component` | `ReactNode` | — | محتوای مودال؛ اگر نبود `children` نمایش داده می‌شود |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `md` | عرض دسکتاپ: ۳۰۰ / ۵۰۰ / ۸۰۰ / ۱۱۴۰ پیکسل (همیشه حداکثر ۹۶vw) |
| `sheetTitle` | `string` | `'Modal Options'` | عنوان BottomSheet و `aria-label` مودال |
| `hideCloseBtn` | `boolean` | `false` | حذف دکمه ✕ (اگر هدر اختصاصی داری، `ModalCloseButton` را خودت بگذار) |
| `forceSheet` | `boolean` | `false` | همیشه BottomSheet، حتی در دسکتاپ |
| `mobileCentered` | `boolean` | `false` | موبایل: مودال وسط صفحه به‌جای BottomSheet (popup هم وسط باز می‌شود) — برای منوهای کوتاه |
| `sheetClassName` | `string` | — | کلاس اضافه روی BottomSheet |
| `closeOnOverlayClick` | `boolean` | `true` | بستن با کلیک روی پس‌زمینه (popup: کلیک بیرون) |
| `closeOnEsc` | `boolean` | `true` | بستن با Escape |
| `onOpen` | `() => void` | — | هنگام باز شدن صدا زده می‌شود |
| `props` | `HTMLAttributes<div>` | — | props اضافه روی کادر مودال دسکتاپ (مثل `className`) |
| `type` | `'modal' \| 'popup'` | `modal` | `popup` = کادر کوچک کنار یک المان |
| `targetElement` | `HTMLElement \| MouseEvent` | — | فقط popup: المان یا رویداد کلیکی که popup کنارش باز می‌شود |
| `height` | `number` | `40` | فقط popup: حداکثر ارتفاع (vh) |
| `popupPlacement` | `'auto' \| 'below'` | `auto` | فقط popup: `below` = همیشه زیر المان (برای dropdown فیلترها) مگر پایین جا نباشد |
| `popupWidth` | `number \| 'anchor'` | — | فقط popup: عرض ثابت (px) یا `anchor` = هم‌عرض المان هدف (حداقل ۲۲۰px) |

## رفتارها

- **Escape** فقط بالاترین مودال باز را می‌بندد (مودال‌های تو در تو امن‌اند).
- **کلیک روی پس‌زمینه** فقط وقتی می‌بندد که فشردن و رها کردن هر دو روی پس‌زمینه باشد (درگ انتخاب متن از داخل مودال آن را نمی‌بندد).
- **اسکرول body** تا وقتی مودالی باز است قفل می‌شود و بعد از بسته شدن آخرین مودال برمی‌گردد.
- **فوکوس** هنگام باز شدن به مودال می‌رود و بعد از بستن به المان قبلی برمی‌گردد.
- **popup** با اندازه واقعی‌اش جای‌گذاری می‌شود، از لبه صفحه بیرون نمی‌زند و اگر بالای المان جا نبود زیر آن باز می‌شود.
- کلیک داخل پاپ‌اورهای پورتال‌شده‌ای که `data-modal-popover` دارند مودال/شیت را نمی‌بندد.

## استایل

- رنگ‌ها از متغیرهای تم اپ (`--plan-card-background-color`، `--body-text-color`، `--border-color`) خوانده می‌شوند؛ تم تیره خودکار درست است.
- BottomSheet استایل پیش‌فرض کامل دارد. اپ‌ها می‌توانند با کلاس‌های global `.drawer-overlay` و `.drawer-content` در `globals.css` آن را شخصی‌سازی کنند (پیش‌فرض پکیج وزن صفر دارد و همیشه override می‌شود).
- محتوای مودال کادر/سایه/overlay نمی‌خواهد؛ این‌ها را `ModalHelper` می‌دهد. برای ساختار آماده: `ModalHeader`، `ModalBody` (اسکرول داخلی)، `ModalFooter`.

## دکمه بستن — `ModalCloseButton`

دکمه ✕ مشترک (مربع با گوشه گرد، آیکون SVG). `ModalHelper` خودش از آن استفاده می‌کند؛ در هدر اختصاصی (`hideCloseBtn`) همین را بگذار و دکمه دستی نساز.

```tsx
import { ModalCloseButton } from '@my-workspace/components';

<ModalCloseButton placement="inline" onClick={onClose} />   // داخل هدر/نوار ابزار
<ModalCloseButton onClick={onClose} />                      // floating: گوشه بالای مودال (چپ در RTL)
<ModalCloseButton size="sm" placement="inline" onClick={onClose} />
```
