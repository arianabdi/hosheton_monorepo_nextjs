# قیمت‌گذاری و تنظیمات مدل‌های LLM (متن) — Atlas Cloud

این مستند ۱۸ مدل زبانی (کلاس `text`) اضافه‌شده به دیتابیس `hosheton.providermodels` را توضیح می‌دهد.
منبع قیمت‌ها، بلوک‌های قیمت توکار (embedded price blocks) صفحه رسمی فهرست LLM های Atlas Cloud است:

- منبع: https://www.atlascloud.ai/models/list/llm
- دیتای کانونیکال استخراج‌شده: `Projects/db-backups/atlas-llm-canonical.json` (بدون تایپ دستی قیمت)
- پروتکل همه مدل‌ها: `openai.chat.completions` — endpoint: `chat/completions` روی `https://api.atlascloud.ai/v1`

## جدول مدل‌ها و قیمت (USD به ازای هر ۱ میلیون توکن)

| مدل (name در DB) | نمایش | ورودی | خروجی | کش خواندن | کش نوشتن | پله‌ای | کانتکست | ورودی تصویر |
|---|---|---|---|---|---|---|---|---|
| `zai-org/glm-5.3-flash` | GLM 5.3 Flash | 0.15 | 0.5 | 0.03 | — | — | 1M | ✅ |
| `zai-org/glm-5.3` | GLM 5.3 | 1.4 | 4.4 | 0.26 | — | — | 1M | — |
| `moonshotai/kimi-k3` | Kimi K3 | 3 | 15 | 0.3 | — | — | 1M | ✅ |
| `minimaxai/minimax-m3` | MiniMax M3 | 0.3 | 1.2 | 0.06 | — | ≥512K | 512K | — |
| `xai/grok-4.6` | Grok 4.6 | 2 | 6 | 0.5 | — | ≥200K | 500K | ✅ |
| `deepseek-ai/deepseek-v4.1-flash` | DeepSeek V4.1 Flash | 0.3 | 1.2 | 0.03 | — | — | 1M | ✅ |
| `deepseek-ai/deepseek-v4-pro` | DeepSeek V4 Pro | 1.68 | 3.38 | 0.13 | — | — | 1M | — |
| `deepseek-ai/deepseek-v4-flash` | DeepSeek V4 Flash | 0.14 | 0.28 | 0.028 | — | — | 1M | — |
| `deepseek-ai/deepseek-ocr` | DeepSeek OCR | 0.04 | 0.08 | — | — | — | 8K | ✅ (OCR) |
| `qwen/qwen3.8-max` | Qwen3.8 Max | 2 | 6 | 0.25 | 2.5 | — | 1M | ✅ |
| `google/gemini-3.8-flash` | Gemini 3.8 Flash | 0.75 | 3.75 | 0.075 | 0.042 | — | 1M | ✅ (+صوت) |
| `google/gemini-3.5-flash` | Gemini 3.5 Flash | 1.5 | 9 | 0.15 | 0.083 | — | 1M | ✅ (+صوت) |
| `google/gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview | 2 | 12 | 0.2 | — | ≥200K | 1M | ✅ |
| `google/gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | 0.25 | 1.5 | 0.025 | — | — | 1M | ✅ |
| `openai/gpt-5.6-sol` | GPT 5.6 Sol | 5 | 30 | 0.5 | 6.25 | ≥272K | 1.05M | ✅ |
| `openai/gpt-5.6-terra` | GPT 5.6 Terra | 2 | 12 | 0.2 | 2.5 | ≥272K | 1.05M | ✅ |
| `openai/gpt-6-astra` | GPT 6 Astra | 10 | 50 | 1 | 12.5 | ≥272K | 1.05M | ✅ |
| `openai/gpt-5.6-luna` | GPT 5.6 Luna | 0.2 | 1.2 | 0.02 | 0.25 | ≥272K | 1.05M | ✅ |

## ساختار قیمت‌گذاری

همه مدل‌ها با `pricing.mode = 'token'` درج شدند — همان ساختاری که موتور هزینه
(`model-cost.engine.ts` → شاخه `mode === 'token'`) و `media-cost.service.ts`
(نرمال‌سازی `prompt_tokens`/`completion_tokens`/`cached_tokens`) مستقیماً صورتحساب می‌کنند:

```
pricing = {
  currency: 'USD',
  mode: 'token',
  rates: {
    inputPer1M:  <ورودی>,
    outputPer1M: <خروجی>,
    cacheTiers: [
      { id: 'cached_input',   label: 'Cached input',   ratePer1M: <کش خواندن> },   // در صورت انتشار
      { id: 'cache_creation', label: 'Cache creation', ratePer1M: <کش نوشتن> },   // در صورت انتشار
    ],
  },
}
```

- فیلدهای legacy (`input` / `output` / `cachedInput`) با نرخ‌های پایه همگام شدند تا
  `resolveModelPricing` (fallback قدیمی) هم نرخ درست ببیند.
- راستی‌آزمایی با موتور واقعی: `Projects/db-backups/verify-llm-pricing.js` — ۱۸/۱۸ پاس
  (سناریو: ۱۰۰K توکن ورودی + ۵۰K خروجی + کش؛ مثلاً gpt-6-astra: vendor=$3.645 → charged=$4.374 با مارک‌آپ ۲۰٪).

## قیمت پله‌ای (Prompt Thresholds) — محدودیت موتور

۷ مدل (MiniMax M3، Grok 4.6، Gemini 3.1 Pro Preview، GPT 5.6 Sol/Terra/Astra/Luna) روی Atlas
قیمت پله‌ای دارند: برای پرامپت‌های بزرگ‌تر از آستانه، نرخ‌ها تغییر می‌کند. موتور فرمول فعلی
عملگر مقایسه ندارد و شاخه token آن تک‌نرخه است؛ بنابراین:

- **نرخ پایه (زیر آستانه)** در `pricing.rates` درج شده و صورتحساب فعلی با همان انجام می‌شود.
- پله‌ها برای شفافیت ادمین در `metadata.pricingTiers` (JSON) و `pricing.notesMarkdown`
  (جدول Markdown) ثبت شده‌اند. در بروزرسانی بعدی موتور، می‌توان از این metadata برای
  پیاده‌سازی نرخ پله‌ای استفاده کرد.

## ورودی‌ها (settingsSchema + modes)

هر مدل یک mode با شناسه `text-to-text` دارد:

| ویژگی | مقدار |
|---|---|
| `requiredInputs` | `['prompt']` |
| `optionalInputs` | `['image']` — فقط مدل‌های vision (ورودی تصویر در مستندات Atlas) |
| binding تصویر | `source: image → payloadPath: image`، حداکثر ۴ تصویر |
| endpoint مسیر (route) | `chat/completions` (نسبت به baseUrl پروایدر atlascloud) |

تنظیمات هر مدل (`settingsSchema` با `payloadPath` و `sendToProvider: true`) عیناً از
`supported_sampling_parameters` صفحه Atlas برداشته شده است: temperature، max_tokens، top_p،
top_k، min_p، frequency_penalty، presence_penalty، repetition_penalty، seed، stop.

- `logit_bias` (نوع object) در پنل پشتیبانی نمی‌شود و درج نشد — مثل `target_formats` در Meshy.
- برای مدل‌هایی که Atlas لیست sampling منتشر نکرده (Gemini ها، GPT ها، Qwen، Grok، MiniMax)،
  زیرمجموعه استاندارد OpenAI-compatible درج شده: temperature، max_tokens، top_p،
  frequency_penalty، presence_penalty، stop، seed — و در `notesMarkdown` هر مدل توضیح داده شده.
- `min_p` و `repetition_penalty` (غیراستاندارد OpenAI) فقط برای مدل‌هایی درج شده که Atlas
  صراحتاً لیست کرده (GLM/Kimi/DeepSeek).

## متادیتا

هر مدل `metadata` شامل `contextLength`، `maxCompletionTokens` و در صورت انتشار
`knowledgeCutoff` و `inputModalities` دارد.

## پشتیبانی کلاس text در کد

برخلاف 3D، بیشتر union ها `text` را از قبل داشتند (DTOها، validation سرویس، پنل naslyar،
فرانت studio، ۱۰ زبان ترجمه با کلید `catalog_text`). تغییرات لازم این بار:

- هسته (`libs/hosheton_core`):
  - `ai-modes.defaults.ts` → `AiModeMediaClass` الان `'video' | 'image' | '3d' | 'text' | 'any'`
  - `ai-mode.schema.ts` → enum `mediaClass` شامل `text`
  - `ai-modes.service.ts` → برچسب فارسی «تولید متن» در پیام ناسازگاری کلاس
  - `model-settings-catalog.ts` → entry جدید `atlas-llm` (providerHints: atlascloud، classHints:
    text) با `ATLAS_LLM_SETTINGS_SCHEMA` برای Settings Sync پنل — بدون modelNamePattern تا با
    مدل‌های gpt/gemini سایر پروایدرها اشتباه نشود.
- بیلینگ توکنی از قبل end-to-end کار می‌کند (`pricing.mode === 'token'` در موتور +
  `computeAndLogGenerationCost` در media-worker).

## اسکریپت‌ها و بک‌آپ

| فایل | کار |
|---|---|
| `Projects/db-backups/atlas-llm-page.html` | HTML رندرشده صفحه فهرست LLM Atlas (منبع قیمت) |
| `Projects/db-backups/atlas-llm-raw-payload.json` | payload توکار صفحه (رکوردهای کامل مدل) |
| `Projects/db-backups/build-atlas-llm-data.js` | استخراج دیتای کانونیکال از payload |
| `Projects/db-backups/atlas-llm-canonical.json` | دیتای کانونیکال ۱۸ مدل (منبع اسکریپت درج) |
| `Projects/db-backups/add-llm-models.js` | اسکریپت درج (فلگ `--dry` برای پیش‌نمایش) |
| `Projects/db-backups/llm-models-after-insert.json` | بک‌آپ بعد از درج |
| `Projects/db-backups/verify-llm-pricing.js` | راستی‌آزمایی موتور هزینه واقعی (۱۸/۱۸ پاس) |

## نکات

- مدل‌های `deepseek-v4-flash` و `deepseek-v4-pro` بدون پیشوند vendor از قبل (پروایدر deepseek)
  در DB موجود بودند؛ نسخه‌های Atlas با نام کامل vendor (`deepseek-ai/...`) جداگانه درج شدند
  تا مسیر پروایدر هرکدام مستقل بماند.
- قیمت‌های صوتی مجزا (مثلاً `input_audio_price` برای gemini-3.1-flash-lite) فعلاً با نرخ
  ورودی متنی محاسبه می‌شوند؛ در `notesMarkdown` ثبت شده است.
- قیمت `deepseek-ocr` روی صفحه Atlas «dynamic_discount» است؛ نرخ لحظه درج (0.04/0.08) مبنای DB است.
