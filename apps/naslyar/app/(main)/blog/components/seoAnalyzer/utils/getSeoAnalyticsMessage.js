import React from "react";

export function GetSeoAnalyticsMessage(type, value) {
    const internalLinksDesc= `
        <h6>لینک داخلی - Internal Links</h6>
        <p>📘 <strong>توضیح:</strong><br />
            لینک‌های داخلی، صفحاتی از داخل وب‌سایت شما را به یکدیگر متصل می‌کنند. این لینک‌ها به کاربران و موتورهای جستجو کمک می‌کنند ساختار وب‌سایت را بهتر درک کنند.</p>
        <p>✅ <strong>هدف:</strong><br />
            بهبود ساختار سایت، توزیع ارزش لینک، و هدایت کاربران به صفحات مهم‌تر.</p>
        <p><strong>📎 مثال:</strong><br />
            لینک به صفحه “درباره ما” یا یک مقاله مرتبط در بلاگ.</p>
      `;

    const externalLinksDesc= `
        <h6>لینک خارجی - External Links</h6>
        <p>📘 <strong>توضیح:</strong><br />
            لینک به وب‌سایت‌های دیگر که اطلاعات بیشتری فراهم می‌کنند یا منبع هستند. این لینک‌ها اعتبار متن را بالا می‌برند.</p>
        <p>✅ <strong>هدف:</strong><br />
            ارائه منابع قابل استناد و افزایش اعتبار محتوای شما.</p>
        <p><strong>📎 مثال:</strong><br />
            لینک به Wikipedia یا وب‌سایت رسمی یک برند.</p>
      `;

    const metaDescriptionDesc= `
        <h6>توضیحات متا - Meta Description</h6>
        <p>📘 <strong>توضیح:</strong><br />
            متا دیسکریپشن خلاصه‌ای از محتوای صفحه است که در نتایج جستجوی گوگل نمایش داده می‌شود.</p>
        <p>✅ <strong>هدف:</strong><br />
            ترغیب کاربر برای کلیک کردن بر روی لینک سایت در نتایج جستجو.</p>
        <p><strong>📎 مثال:</strong><br />
            یک جمله ۱۵۰ کاراکتری که خلاصه‌ی مفید و جذابی از صفحه ارائه می‌دهد.</p>
      `;

    const keywordDensityDesc = `
        <h6>چگالی کلمات کلیدی – Keyword Density</h6>
        
        <p>📘 <strong>توضیح:</strong><br />
        چگالی کلمه کلیدی به نسبت تعداد دفعاتی که یک کلمه کلیدی در متن ظاهر شده نسبت به کل تعداد کلمات گفته می‌شود. اگر این مقدار خیلی پایین باشد، گوگل متوجه نمی‌شود صفحه در چه موردی است. اگر خیلی زیاد باشد، ممکن است به عنوان keyword stuffing (سوءاستفاده از کلمات کلیدی) شناخته شود.</p>
        
        <p>✅ <strong>هدف:</strong><br />
        استفاده منطقی و متعادل از کلمه کلیدی در متن (بین ۰.۵٪ تا ۲.۵٪).</p>
        
        <p><strong>📎 مثال‌ها:</strong></p>
        
        <p><strong>فارسی:</strong></p>
        
        <p>❌ <strong>قبل:</strong><br />
        ما بهترین فروشگاه موبایل هستیم. فروشگاه موبایل ما موبایل می‌فروشد. اگر موبایل می‌خواهید، از فروشگاه موبایل ما بخرید!</p>
        
        <p>✅ <strong>بعد:</strong><br />
        اگر به دنبال خرید یک گوشی هوشمند جدید هستید، فروشگاه ما گزینه‌های متنوعی از موبایل‌های روز دنیا را ارائه می‌دهد.</p>
        
        <p><strong>English:</strong></p>
        
        <p>❌ <strong>Before:</strong><br />
        Our mobile store is the best mobile store. Visit our mobile store to buy mobile phones from our mobile store!</p>
        
        <p>✅ <strong>After:</strong><br />
        If you're looking for a new smartphone, our store offers a wide selection of the latest mobile phones.</p>
    `;

    const keywordsDesc= `
        <h6>کلمات کلیدی - Focus Keywords</h6>
        <p>📘 <strong>توضیح:</strong><br />
            کلمات یا عباراتی که کاربران برای پیدا کردن محتوای شما جستجو می‌کنند. استفاده‌ی مناسب از آن‌ها در متن، تیتر، URL و متا اهمیت دارد.</p>
        <p>✅ <strong>هدف:</strong><br />
            افزایش شانس دیده‌شدن در نتایج جستجوی مرتبط.</p>
        <p><strong>📎 مثال:</strong><br />
            "خرید کفش ورزشی" یا "آموزش سئو رایگان".</p>
      `;

    const imagesDesc= `
        <h6>تصاویر و متن جایگزین - Images and Alt Text</h6>
        <p>📘 <strong>توضیح:</strong><br />
            تصاویر بدون متن جایگزین (alt) توسط موتورهای جستجو درک نمی‌شوند. alt برای سئو و دسترسی‌پذیری اهمیت دارد.</p>
        <p>✅ <strong>هدف:</strong><br />
            توصیف معنای تصویر برای کاربران و موتورهای جستجو.</p>
        <p><strong>📎 مثال:</strong><br />
            alt="کفش ورزشی قرمز نایک" برای تصویر محصول.</p>
      `;

    const wordCountDesc= `
    <h6>تعداد کلمات - Word Count</h6>
    <p>📘 <strong>توضیح:</strong><br />
        محتوای بسیار کوتاه نمی‌تواند نیاز اطلاعاتی کاربر را برطرف کند. محتوای غنی‌تر معمولاً رتبه بهتری می‌گیرد.</p>
    <p>✅ <strong>هدف:</strong><br />
        ایجاد محتوای جامع و کافی برای پوشش دادن موضوع.</p>
    <p><strong>📎 مثال:</strong><br />
        یک مقاله وبلاگی با حداقل ۳۰۰ تا ۵۰۰ کلمه.</p>
  `;

    const headingsDesc= `
    <h6>تیترها - Headings (H1, H2, ...)</h6>
    <p>📘 <strong>توضیح:</strong><br />
        تیترها ساختار متن را مشخص می‌کنند و به کاربران و موتورهای جستجو کمک می‌کنند موضوع هر بخش را درک کنند.</p>
    <p>✅ <strong>هدف:</strong><br />
        ساختاردهی به متن برای خوانایی و سئوی بهتر.</p>
    <p><strong>📎 مثال:</strong><br />
        استفاده از H1 برای عنوان اصلی و H2 برای زیرعنوان‌ها بسیار اهمیت دارد.</p>
  `;



    switch (type) {
        case "internalLinks":
            console.log('internalLinks', value)
            if (value >= 3 && value <= 10) {
                return {level: "good", value: value, message: "شما از تعداد مناسبی از لینک‌های داخلی استفاده کرده‌اید. این باعث بهبود ساختار سایت و تجربه کاربر می‌شود.", description: internalLinksDesc, type: "internalLinks"};
            } else if (value > 10) {
                return {level: "ok", value: value, message: "تعداد لینک‌های داخلی شما زیاد است. ممکن است باعث گیج شدن کاربر شود. بهتر است لینک‌دهی را هدفمندتر کنید.", description: internalLinksDesc, type: "internalLinks"};
            } else {
                return {level: "bad", value: value, message: "تعداد لینک‌های داخلی شما کم است. لینک دادن به صفحات دیگر سایت باعث افزایش بازدید و سئو بهتر می‌شود.", description: internalLinksDesc, type: "internalLinks"};
            }

        case "externalLinks":
            console.log('externalLinks', value)
            if (value >= 3 && value <= 10) {
                return {level: "good", value: value, message: "تعداد لینک‌های خارجی صفحه شما مناسب است و به اعتبار صفحه کمک می‌کند.", description: externalLinksDesc, type: "externalLinks"};
            } else if (value > 10) {
                return {level: "ok", value: value, message: "لینک‌های خارجی بیش از حد ممکن است باعث کاهش تمرکز بر صفحه شما شود. سعی کنید تعداد آن‌ها را کمتر کنید.", description: externalLinksDesc, type: "externalLinks"};
            } else {
                return {level: "bad", value: value, message: "صفحه شما فاقد لینک خارجی است یا تعداد کمی دارد. لینک دادن به منابع معتبر می‌تواند اعتبار محتوای شما را افزایش دهد.", description: externalLinksDesc, type: "externalLinks"};
            }

        case "metaDescription":
            if (!value || value === 0) {
                return {level: "bad", value: value, message: "توضیحات متا برای این صفحه نوشته نشده است. این بخش در نتایج گوگل نمایش داده می‌شود و تاثیر زیادی در نرخ کلیک دارد.", description: metaDescriptionDesc, type: "metaDescription"};
            } else if (value < 120 || value > 160) {
                return {level: "ok", value: value, message: "توضیحات متا وجود دارد، اما طول آن مناسب نیست. بهتر است بین 120 تا 160 کاراکتر باشد.", description: metaDescriptionDesc, type: "metaDescription"};
            } else {
                return {level: "good", value: value, message: "توضیحات متای صفحه به درستی تنظیم شده است. هم از نظر طول و هم از نظر تاثیرگذاری مناسب است.", description: metaDescriptionDesc, type: "metaDescription"};
            }
        case "keywordDensity":

            /*
                [
                      { keyword: "سئو", density: 1.2 },
                      { keyword: "کلمات کلیدی", density: 0.3 }
                ]
            */
            if (!value || value.length === 0) {
                return {
                    level: "bad",
                    message: "هیچ کلمه کلیدی انتخاب نشده است. بدون کلمات کلیدی، گوگل نمی‌فهمد صفحه درباره چیست.",
                    description: keywordDensityDesc,
                    type: "focusKeywords"
                };
            }

            console.log('value', value);
            const totalKeywords = value.length;
            const strongKeywords = value?.filter(kw => kw.density >= 0.5).length;

            if (strongKeywords >= totalKeywords) {
                return {level: "good", value: value.count, message: "کلمات کلیدی به‌درستی در متن تکرار شده‌اند و چگالی خوبی دارند.", description: keywordDensityDesc, type: "focusKeywords"};
            } else if (strongKeywords >= totalKeywords / 2) {
                return {level: "ok", value: value.count, message: "بعضی از کلمات کلیدی به اندازه کافی در متن تکرار نشده‌اند.", description: keywordDensityDesc, type: "focusKeywords"};
            } else {
                return {level: "bad", value: value.count, message: "اکثر کلمات کلیدی به‌خوبی در متن استفاده نشده‌اند. این موضوع به سئوی صفحه آسیب می‌زند.", description: keywordDensityDesc, type: "focusKeywords"};
            }
        case "keywords":
            if (!value || value.length === 0) {
                return {level: "bad", value: value.length, message: "هیچ کلمه کلیدی انتخاب نشده است. بدون کلمه کلیدی، موتورهای جست‌وجو نمی‌توانند موضوع اصلی محتوا را درک کنند.", description: keywordsDesc, type: "keywords"};
            } else if (value.length > 3) {
                return {level: "ok", value: value.length, message: "شما تعداد زیادی کلمه کلیدی انتخاب کرده‌اید. بهتر است روی ۱ تا ۳ کلمه کلیدی اصلی تمرکز کنید تا نتیجه‌ی بهتری بگیرید.", description: keywordsDesc, type: "keywords"
                };
            } else {
                return {level: "good", value: value.length, message: "کلمات کلیدی به درستی انتخاب شده‌اند. حالا مطمئن شوید در بخش‌های مهم متن ظاهر شوند.", description: keywordsDesc, type: "keywords"};
            }

        case "images":
            if (value.total === 0) {
                return {level: "bad", value: `کل: ${value.total}- با Alt: ${value.withAlt}`, message: "هیچ تصویری در این پست وجود ندارد. استفاده از تصویر باعث جذابیت بیشتر و درک بهتر محتوا می‌شود.", description: imagesDesc, type: "images"};
            }

            const altRatio = (value.withAlt / value.total) * 100;

            if (altRatio >= 90) {
                return {level: "good", value: `کل: ${value.total}- با Alt: ${value.withAlt}`, message: "بیشتر تصاویر دارای ویژگی alt هستند. عالیه! این به سئو و دسترسی کمک می‌کند.", description: imagesDesc, type: "images"};
            } else if (altRatio >= 50) {
                return {level: "ok", value: `کل: ${value.total}- با Alt: ${value.withAlt}`, message: "برخی از تصاویر ویژگی alt ندارند. بهتر است همه تصاویر دارای توضیح باشند.", description: imagesDesc, type: "images"};
            } else {
                return {level: "bad", value: `کل: ${value.total}- با Alt: ${value.withAlt}`, message: "تعداد زیادی از تصاویر بدون ویژگی alt هستند. این بر سئو تأثیر منفی می‌گذارد.", description: imagesDesc, type: "images"
                };
            }

        case "wordCount":
            if (value >= 900) {
                return {level: "good", value: value, message: "تعداد کلمات شما عالی است. محتوای شما از نظر سئو جامع به نظر می‌رسد.", description: wordCountDesc, type: 'wordCount'};
            } else if (value >= 300) {
                return {level: "ok", value: value, message: "تعداد کلمات قابل قبول است، اما برای رتبه‌گیری بهتر ممکن است نیاز به گسترش داشته باشد.", description: wordCountDesc, type: 'wordCount'};
            } else if (value > 0) {
                return {level: "bad", value: value, message: "تعداد کلمات متن خیلی کم است. برای داشتن یک محتوای ارزشمند، حداقل ۳۰۰ کلمه توصیه می‌شود.", description: wordCountDesc, type: 'wordCount'};
            } else {
                return {level: "bad", value: value, message: "هیچ محتوایی وارد نشده است. برای تحلیل سئو نیاز به متن داریم.", description: wordCountDesc, type: 'wordCount'};
            }

        case "headings":
            if (value >= 5 && value <= 15) {
                return {level: "good", value: value, message: "ساختار تیترهای شما مناسب است. متن به خوبی بخش‌بندی شده و قابل اسکن است.", description: headingsDesc, type: 'headings'};
            } else if (value >= 2 && value < 5) {
                return {level: "ok", value: value, message: "تعداد تیترها کمی کمتر از حد ایده‌آل است. بهتر است متن را با تیترهای بیشتری ساختاردهی کنید.", description: headingsDesc, type: 'headings'};
            } else if (value === 0 || value === 1) {
                return {level: "bad", value: value, message: "تقریباً هیچ تیتری در متن وجود ندارد. برای بهبود خوانایی و سئو، از تیترهای H1، H2 و H3 استفاده کنید.", description: headingsDesc, type: 'headings'};
            } else {
                return {level: "ok", value: value, message: "تعداد تیترها بیشتر از حد معمول است. اگر همه آن‌ها ضروری‌اند مشکلی نیست، اما در غیر این صورت ممکن است باعث سردرگمی شود.", description: headingsDesc, type: 'headings'};
            }

        default:
            return { level: "ok", value: value, message: "نوع معیار ناشناخته است." };
    };
}
