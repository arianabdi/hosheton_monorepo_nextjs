پروژه را از استودیو، API و پنل ادمین می‌خوانم تا ببینم مدل‌ها الان کجا تعریف می‌شوند و پیش‌نمایش صدا باید کجا اضافه شود.

جای درست این کار ریشه مدل نیست. باید روی خودِ هر صدای پیش‌فرض داخل `settingsSchema` همان مدل TTS برود؛ دقیقاً همان جایی که الان `value / label / iconSvg` برای آپشن‌های select ذخیره می‌شود.

الان معماری‌تان data-driven است: صدا یک فیلد select روی مدل است، نه یک موجودیت جدا. اگر نمونه پخش را جای دیگری بگذارید، هم در چت گم می‌شود هم با انتخاب `voiceId` هم‌تراز نمی‌ماند.

------

## منبع حقیقت: آپشن فیلد صدا، نه خود مدل

مدل در `ProviderModel.settingsSchema` فیلدهای vendor-specific را نگه می‌دارد. برای TTS معمولاً چیزی شبیه `voiceId` است. هر آپشن الان فقط این شکل را دارد:

node-setting-field.model.tsLines 24-29

export interface NodeSettingFieldOption {

​    value: string;

​    label: string;

​    */** Studio-only SVG markup for select chips. Not sent to providers. \*/*

​    iconSvg?: string;

}

`iconSvg` همین الان metadata مخصوص Studio است و به provider نمی‌رود. نمونه صدا باید همین نقش را داشته باشد: یک فیلد Studio-only کنار همان آپشن، مثلاً `previewUrl`.

شکل درست داده:

{

  "key": "voiceId",

  "type": "select",

  "label": "Voice",

  "labelFa": "صدا",

  "default": "21m00Tcm4TlvDq8ikWAM",

  "payloadPath": "voice_id",

  "options": [

​    {

​      "value": "21m00Tcm4TlvDq8ikWAM",

​      "label": "Rachel",

​      "previewUrl": "https://cdn.yoursite.com/tts-previews/rachel.mp3"

​    },

​    {

​      "value": "EXAVITQu4vr4xnSDxMaL",

​      "label": "Bella",

​      "previewUrl": "https://cdn.yoursite.com/tts-previews/bella.mp3"

​    }

  ]

}

`value` همان شناسه‌ای است که به API صدا می‌رود. `previewUrl` فقط برای پخش در UI است.

لیست مدل‌ها همین `settingsSchema` را کامل به Studio برمی‌گرداند، پس چت بدون endpoint جدید به این URLها دسترسی دارد.

------

## کجا در پنل ادمین Naslyar

صفحه فعلی: `naslyar/app/(main)/(hosheton)/(core)/models/[id]` → تب تنظیمات مدل.

همین‌جا ادمین ردیف‌های `value / label / iconSvg` را می‌سازد:

page.tsxLines 4355-4425

{field.type === 'select' && (

    <div>

​        <span>گزینه‌های ساختاری (value / label / iconSvg)</span>

​        {(field.optionsRows || []).map((row, rowIdx) => (

​            *// value, label, iconSvg*

​        ))}

​    </div>

)}

برای TTS، کنار هر ردیف یک فیلد `previewUrl` اضافه کنید (ترجیحاً آپلود mp3 + پخش‌کننده کوچک)، نه یک باکس جدا بالای صفحه مدل.

فایل‌هایی که باید هم‌زمان این فیلد را بشناسند:

| لایه            | فایل                                        | کار                                                          |
| :-------------- | :------------------------------------------ | :----------------------------------------------------------- |
| تایپ مشترک API  | `node-setting-field.model.ts`               | `previewUrl?: string` روی option                             |
| ذخیره/لود ادمین | `models/[id]/page.tsx`                      | `toOptionRows` / `buildSettingFieldPayload` / `syncRowsFromText` |
| تایپ Studio     | `hosheton_studio/.../types/node-catalog.ts` | همان فیلد روی `NodeSettingFieldOption`                       |

اگر فقط در UI ادمین بگذارید و در `buildSettingFieldPayload` ذخیره نکنید، بعد از Save پاک می‌شود. الان `iconSvg` دقیقاً همین مسیر را طی می‌کند.

------

## کجا در Studio دیده شود

دو سطح UI صدا را نشان می‌دهند؛ هر دو باید از همان `option.previewUrl` بخوانند.

۱. چت (مهم‌تر برای مدل‌های پیش‌فرض)
`CompactChatToolbar.tsx` فقط `field.options` استاتیک را نشان می‌دهد. `urlSource` را اصلاً fetch نمی‌کند. برای همین صداهای پیش‌فرض باید استاتیک داخل settingsSchema باشند، وگرنه در چت نه لیست می‌آیند نه پیش‌نمایش.

الان چیپ‌ها فقط SVG دارند. برای TTS کنار هر چیپ یک دکمه پخش بگذارید. منطق `previewOption` که الان اولین option دارای `iconSvg` را برمی‌دارد، برای صدا مناسب نیست.

۲. تنظیمات نود کانواس
`NodeSettingsPanel.tsx` الان یک `<select>` ساده است و preview ندارد. اگر صدا از `urlSource` / `optionsSource` هم بیاید، باز هم باید `previewUrl` روی هر option باشد تا کنار dropdown پخش شود.

------

## این کار را این‌جا نگذارید

| جا                                        | چرا اشتباه است                                               |
| :---------------------------------------- | :----------------------------------------------------------- |
| ریشه مدل (`iconSvg` / metadata)           | آن‌جا هویت مدل است، نه چند صدای مختلف                         |
| `capabilityModes` و `guideImages`         | راهنمای تصویری capability است (مثل text-to-video)، نه نمونه voice |
| فایل hardcoded فرانت                      | با پنل مدل‌ها و معماری data-driven جور درنمی‌آید               |
| تولید زنده با خود TTS هنگام باز کردن لیست | هزینه و تأخیر دارد؛ picker باید فایل ازپیش‌ساخته پخش کند      |

HeyGen در بک‌اند همین ایده را دارد (`previewAudioUrl`) ولی در `GET /api/ai/:provider/options/voices` دور ریخته می‌شود و فقط `{ value, label }` برمی‌گردد. ElevenLabs هم `preview_url` دارد ولی `listVoices` فقط id و name را نگه می‌دارد. پس کاتالوگ زنده فعلاً برای preview آماده نیست.

------

## دو حالت را قاطی نکنید

حالت درست برای «چند نمونه پیش‌فرض»:
روی مدل TTS، فیلد `voiceId` را با ۳ تا ۶ صدای curated پر کنید و برای هر کدام یک mp3 ثابت بگذارید. چت همین‌ها را نشان می‌دهد. لینک موقت vendor نگذارید؛ فایل را در storage خودتان آپلود کنید (مثل preview قالب‌ها) و URL عمومی ذخیره کنید.

حالت بعدی (کاتالوگ کامل ElevenLabs/HeyGen):
بعداً `urlSource` را با چیزی مثل `previewPath: 'preview_url'` گسترش دهید و mapper بک‌اند هم `previewUrl` برگرداند. این کار جداست و برای مدل‌های پیش‌فرض لازم نیست.

اگر منظورتان «چند نمونه کلی از خروجی مدل» باشد نه per-voice، باز هم توصیه نمی‌کنم روی خود مدل یک گالری جدا بسازید؛ کیفیت TTS به voice بستگی دارد و کاربر باید همان صدایی را بشنود که انتخاب می‌کند.

------

## ترتیب درست پیاده‌سازی

1. `previewUrl` را به `NodeSettingFieldOption` اضافه کنید.
2. در تب تنظیمات مدل Naslyar، کنار هر option فیلد URL/آپلود بگذارید و در payload ذخیره کنید.
3. در Studio چت و تنظیمات نود، دکمه پخش از همان فیلد بخواند.
4. بعداً اگر خواستید کاتالوگ زنده، `previewPath` و options API را وصل کنید.

اگر بخواهید، در Agent mode می‌توانم همین مسیر را روی تایپ‌ها، فرم ادمین و پخش‌کننده Studio پیاده کنم.