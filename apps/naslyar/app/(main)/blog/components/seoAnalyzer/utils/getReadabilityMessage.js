import React from "react";

export function getReadabilityMessage(type, value) {
    const transitionWordsDesc =
`
<h6>واژه های انتقالی - Transition Words</h6>
<p>📘 <strong>توضیح:</strong><br />
    این واژه‌ها مثل پل، جملات و پاراگراف‌ها را به هم وصل می‌کنند تا متن روان‌تر و منطقی‌تر شود. مثل "اما"، "بنابراین"، "از طرفی"، "در نتیجه"، "به همین دلیل".</p>

<p>✅ <strong>هدف:</strong><br />
    افزایش انسجام و جریان متن برای خواننده.</p>

<p> <strong>مثال‌ها:</strong><br />
    فارسی:</p>

<p>❌ <strong>قبل:</strong><br />
    این محصول قیمت بالایی دارد. مشتریان زیادی آن را خریدند.</p>

<p>✅ <strong>بعد:</strong><br />
    این محصول قیمت بالایی دارد، اما مشتریان زیادی آن را خریدند.</p>
`;
    const passiveVoiceDesc =
`
<h6>جملات مجهول - Passive Voice</h6>
<p>📘 <strong>توضیح:</strong><br />
    در جملات مجهول، فاعل مشخص نیست یا اهمیت ندارد. این ساختار باعث می‌شود متن رسمی و خشک به نظر برسد. جملات معلوم (فاعل‌محور) روان‌تر و مستقیم‌تر هستند.</p>

<p>✅ <strong>هدف:</strong><br />
    استفاده بیشتر از ساختار معلوم برای روانی و شفافیت متن.</p>

<p><strong>📎 مثال‌ها:</strong><br />
    <strong>فارسی:</strong></p>

<p>❌ <strong>قبل:</strong><br />
    تصمیم گرفته شد که جلسه لغو شود.</p>

<p>✅ <strong>بعد:</strong><br />
    مدیر تصمیم گرفت جلسه را لغو کند.</p>

<p><strong>English:</strong></p>

<p>❌ <strong>Before:</strong><br />
    The task was completed by the team.</p>

<p>✅ <strong>After:</strong><br />
    The team completed the task.</p>
`;
    const sentenceLengthDesc =
`
<h6>طول جمله - Sentence Length</h6>
<p>📘 <strong>توضیح:</strong><br />
    جملات بسیار طولانی باعث خستگی خواننده می‌شوند و فهم مطلب را سخت می‌کنند. Yoast پیشنهاد می‌دهد جملات زیر ۲۰ کلمه باشند، مگر در موارد خاص.</p>

<p>✅ <strong>هدف:</strong><br />
    ساختار جمله‌های کوتاه‌تر، شفاف‌تر و قابل فهم‌تر.</p>

<p><strong>📎 مثال‌ها:</strong><br />
    <strong>فارسی:</strong></p>

<p>❌ <strong>قبل:</strong><br />
    با توجه به تغییرات عمده‌ای که در ساختار مدیریتی شرکت اتفاق افتاده، نیاز به بازنگری در سیاست‌های داخلی به‌شدت احساس می‌شود.</p>

<p>✅ <strong>بعد:</strong><br />
    تغییرات زیادی در ساختار مدیریتی شرکت اتفاق افتاده است. به همین دلیل، باید سیاست‌های داخلی بازنگری شوند.</p>

<p><strong>English:</strong></p>

<p>❌ <strong>Before:</strong><br />
    Due to the extensive restructuring that has taken place within the organization, there is a pressing need to reevaluate the current internal policies.</p>

<p>✅ <strong>After:</strong><br />
    The company has gone through major changes. So, it’s time to review internal policies.</p>
`;
    const paragraphLengthDesc =
`
<h6>طول پاراگراف - Paragraph Length</h6>
<p>📘 <strong>توضیح:</strong><br />
    پاراگراف‌های طولانی خواننده را خسته می‌کنند و اسکن سریع متن را سخت می‌سازند. بهتر است هر پاراگراف فقط یک ایده اصلی داشته باشد و کمتر از 150 کلمه باشد.</p>

<p>✅ <strong>هدف:</strong><br />
    تقسیم ایده‌ها به پاراگراف‌های کوچک‌تر برای سهولت در خواندن و فهم.</p>

<p><strong>📎 مثال‌ها:</strong><br />
    <strong>فارسی:</strong></p>

<p>❌ <strong>قبل:</strong><br />
    [یک پاراگراف ۲۰ خطی درباره‌ی موضوعات مختلف بدون فاصله]</p>

<p>✅ <strong>بعد:</strong><br />
    [پاراگراف اول درباره‌ی معرفی موضوع]<br />
    [پاراگراف دوم درباره‌ی جزئیات اصلی]<br />
    [پاراگراف سوم نتیجه‌گیری]</p>
`;
    const consecutiveSentencesDesc =
`
<h6>جملات متوالی مشابه - Consecutive Sentences</h6>
<p>📘 <strong>توضیح:</strong><br />
    اگر چند جمله پشت سر هم به یک شکل یا کلمه شروع شوند، متن کسل‌کننده و یکنواخت به نظر می‌رسد. تنوع در شروع جملات به خوانایی کمک می‌کند.</p>

<p>✅ <strong>هدف:</strong><br />
    ایجاد تنوع ساختاری در شروع جملات.</p>

<p><strong>📎 مثال‌ها:</strong><br />
    <strong>فارسی:</strong></p>

<p>❌ <strong>قبل:</strong><br />
    این اپلیکیشن مفید است. این اپلیکیشن کاربردی است. این اپلیکیشن سرعت بالایی دارد.</p>

<p>✅ <strong>بعد:</strong><br />
    این اپلیکیشن مفید و کاربردی است. همچنین، از سرعت بالایی برخوردار است.</p>

<p><strong>English:</strong></p>

<p>❌ <strong>Before:</strong><br />
    This tool is helpful. This tool is fast. This tool is user-friendly.</p>

<p>✅ <strong>After:</strong><br />
    This tool is helpful, fast, and user-friendly.</p>
`;
    const wordComplexityDesc =
`
<h6>پیچیدگی واژگان - Word Complexity</h6>
<p>📘 <strong>توضیح:</strong><br />
    این معیار بررسی می‌کند که آیا از واژه‌های ساده و قابل فهم استفاده کرده‌اید یا خیر. استفاده‌ی زیاد از کلمات تخصصی، سنگین یا ناآشنا باعث می‌شود کاربران عادی نتوانند به راحتی با متن ارتباط برقرار کنند.</p>

<p>✅ <strong>هدف:</strong><br />
    استفاده از واژگان ساده، روزمره و قابل فهم برای مخاطب عمومی.</p>

<p><strong>📎 مثال‌ها:</strong><br />
    <strong>فارسی:</strong></p>

<p>❌ <strong>قبل:</strong><br />
    بهره‌مندی از سیستم‌های پیشرفته‌ی انکودینگ در پردازش داده‌ها ضروری است.</p>

<p>✅ <strong>بعد:</strong><br />
    استفاده از سیستم‌های پیشرفته‌ی رمزگذاری در پردازش اطلاعات ضروری است.</p>

<p><strong>English:</strong></p>

<p>❌ <strong>Before:</strong><br />
    Utilizing multifaceted technological infrastructures is imperative for organizational scalability.</p>

<p>✅ <strong>After:</strong><br />
    Using advanced technology systems is important for business growth.</p>
`;


    switch (type) {
        case "transitionWords":
            if (value >= 30) {
                return { level: "good", value: value, message: "شما به اندازه‌ی کافی از واژه‌های انتقالی (transition words) استفاده کرده‌اید. آفرین!", description: transitionWordsDesc, type: 'transitionWords' };
            } else if (value >= 10) {
                return { level: "ok", value: value, message: "فقط تعداد کمی از جملات حاوی واژه‌های انتقالی  (transition words) هستند." , description: transitionWordsDesc, type: 'transitionWords' };
            } else {
                return { level: "bad", value: value, message: "تقریباً هیچ واژه‌ی انتقالی  (transition words) در متن وجود ندارد. برای بهبود جریان متن، از آن‌ها بیشتر استفاده کنید.", description: transitionWordsDesc, type: 'transitionWords'  };
            }

        case "passiveVoice":
            if (value < 10) {
                return { level: "good", value: value, message: "شما به اندازه کافی از جملات معلوم (active voice) استفاده کرده‌اید. عالیه!", description: passiveVoiceDesc, type: 'passiveVoice' };
            } else if (value < 20) {
                return { level: "ok", value: value, message: "بیش از ۱۰٪ جملات به صورت مجهول (passive voice) نوشته شده‌اند. سعی کنید آن‌ها را کاهش دهید.", description: passiveVoiceDesc, type: 'passiveVoice'  };
            } else {
                return { level: "bad", value: value, message: "تعداد زیادی از جملات به صورت مجهول  (passive voice) هستند. بهتر است آن‌ها را به صورت معلوم بازنویسی کنید.", description: passiveVoiceDesc, type: 'passiveVoice'  };
            }

        case "sentenceLength":
            if (value <= 25) {
                return { level: "good", value: value, message: "تعداد کمی از جملات بیش از حد طولانی هستند. بسیار خوب!", description: sentenceLengthDesc, type: 'sentenceLength'  };
            } else if (value <= 40) {
                return { level: "ok", value: value, message: "برخی از جملات طولانی هستند که ممکن است خوانایی را کاهش دهد.", description: sentenceLengthDesc, type: 'sentenceLength' };
            } else {
                return { level: "bad", value: value, message: "تعداد زیادی از جملات بیش از حد طولانی هستند. سعی کنید آن‌ها را کوتاه‌تر کنید.", description: sentenceLengthDesc, type: 'sentenceLength' };
            }

        case "paragraphLength":
            if (value <= 2) {
                return { level: "good", value: value, message: "هیچ‌یک از پاراگراف‌ها بیش از حد طولانی نیستند. عالیه!" , description: paragraphLengthDesc, type: 'paragraphLength' };
            } else if (value <= 4) {
                return { level: "ok", value: value, message: "برخی پاراگراف‌ها طولانی هستند. پیشنهاد می‌شود آن‌ها را تقسیم کنید." , description: paragraphLengthDesc, type: 'paragraphLength' };
            } else {
                return { level: "bad", value: value, message: "پاراگراف‌های زیادی بیش از حد طولانی هستند. آن‌ها را به بخش‌های کوچک‌تر تقسیم کنید." , description: paragraphLengthDesc, type: 'paragraphLength' };
            }

        case "consecutiveSentences":
            if (value < 2) {
                return { level: "good", value: value, message: "تنوع مناسبی در شروع جملات شما وجود دارد. بسیار خوب!" , description: consecutiveSentencesDesc, type: 'consecutiveSentences'};
            } else if (value <= 3) {
                return { level: "ok", value: value, message: "برخی جملات پشت سر هم به یک شکل شروع شده‌اند. سعی کنید تنوع بیشتری ایجاد کنید." , description: consecutiveSentencesDesc, type: 'consecutiveSentences'};
            } else {
                return { level: "bad", value: value, message: "تعداد زیادی از جملات به شکل مشابه شروع شده‌اند. این موضوع ممکن است خواننده را خسته کند." , description: consecutiveSentencesDesc, type: 'consecutiveSentences'};
            }

        case "wordComplexity":
            if (value < 10) {
                return { level: "good", value: value, message: "از واژه‌های پیچیده زیادی استفاده نکرده‌اید. آفرین!" , description: wordComplexityDesc, type: 'wordComplexity'};
            } else if (value < 20) {
                return { level: "ok", value: value, message: "برخی از واژه‌ها بسیار پیچیده هستند. بهتر است آن‌ها را ساده‌تر کنید." , description: wordComplexityDesc, type: 'wordComplexity'};
            } else {
                return { level: "bad", value: value, message: "واژه‌های زیادی در متن شما دشوار هستند. این موضوع خوانایی را کاهش می‌دهد." , description: wordComplexityDesc, type: 'wordComplexity'};
            }

        default:
            return { level: "ok", value: value, message: "نوع معیار ناشناخته است." };
    }
}
