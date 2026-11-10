اگر هدفت ساختن یک هسته حسابداری (Accounting Engine) در سطح سپیدار، هلو و حتی ERPهایی مثل SAP Business One یا Odoo باشد، پیشنهاد من این است که از ابتدا پروژه را به شکل Accounting Platform / Financial Operating System طراحی کنی، نه صرفاً «چند جدول برای سند حسابداری».

این پاسخ را مثل یک Software Architecture Document می‌نویسم؛ یعنی چیزی که بتوانی مستقیماً مبنای طراحی دیتابیس، API و ماژول‌ها قرار بدهی.

> هدف: سیستم حسابداری ایرانی، Multi-Company، Multi-Year، بسیار سریع، Audit-safe، Event-driven، Double Entry، و قابل توسعه تا ERP کامل.

# نقشه راه معماری سیستم (نسخه Enterprise)

# Financial OS برای شرکت‌های ایرانی

Double Entry

Append Only

Multi Company

Audit Safe

این سیستم از حدود ۲۰ ماژول اصلی تشکیل می‌شود که همه روی یک Ledger Engine مشترک کار می‌کنند. تمام عملیات مالی در نهایت به سند حسابداری تبدیل می‌شوند؛ هیچ ماژولی اجازه تغییر مستقیم مانده حساب را ندارد. این معماری یکی از مهم‌ترین Best Practiceهای سیستم‌های مالی مدرن است.

![](https://www.google.com/s2/favicons?domain=https://hamdullahhamdard.com\&sz=32)

Hamdullah Hamdard+2

# معماری کلان سیستم

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20540%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%2220%22%20y%3D%2215%22%20width%3D%22720%22%20height%3D%2255%22%20rx%3D%2212%22%20fill%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2248%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2222%22%20font-weight%3D%22bold%22%3EPresentation%20Layer%20\(Web%20%2F%20Mobile%20%2F%20API\)%3C%2Ftext%3E%3Crect%20x%3D%2240%22%20y%3D%2295%22%20width%3D%22680%22%20height%3D%2270%22%20rx%3D%2210%22%20fill%3D%22%232563eb%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22135%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2218%22%3EWorkflow%20%2B%20Permission%20%2B%20Business%20Services%3C%2Ftext%3E%3Crect%20x%3D%2230%22%20y%3D%22190%22%20width%3D%22700%22%20height%3D%2295%22%20rx%3D%2212%22%20fill%3D%22%237c3aed%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22220%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2218%22%3EAccounting%20Engine%20\(Double%20Entry%20Ledger\)%3C%2Ftext%3E%3Ctext%20x%3D%22380%22%20y%3D%22245%22%20text-anchor%3D%22middle%22%20fill%3D%22%23EDE9FE%22%20font-size%3D%2213%22%3EJournal%20%E2%80%A2%20Voucher%20%E2%80%A2%20Posting%20%E2%80%A2%20Cost%20Center%20%E2%80%A2%20Currency%3C%2Ftext%3E%3Crect%20x%3D%2230%22%20y%3D%22310%22%20width%3D%22220%22%20height%3D%22180%22%20rx%3D%2212%22%20fill%3D%22%23EA580C%22%2F%3E%3Ctext%20x%3D%22140%22%20y%3D%22338%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EOperational%20Modules%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22360%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ESales%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22378%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EPurchase%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22396%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EInventory%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22414%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EPayroll%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22432%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EAssets%3C%2Ftext%3E%3Ctext%20x%3D%2245%22%20y%3D%22450%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ECRM%20%2F%20Projects%3C%2Ftext%3E%3Crect%20x%3D%22270%22%20y%3D%22310%22%20width%3D%22220%22%20height%3D%22180%22%20rx%3D%2212%22%20fill%3D%22%230EA5E9%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22338%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EFinance%20Modules%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22360%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ETreasury%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22378%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EBank%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22396%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ECheque%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22414%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EAR%2FAP%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22432%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EBudget%3C%2Ftext%3E%3Ctext%20x%3D%22285%22%20y%3D%22450%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ECash%20Flow%3C%2Ftext%3E%3Crect%20x%3D%22510%22%20y%3D%22310%22%20width%3D%22220%22%20height%3D%22180%22%20rx%3D%2212%22%20fill%3D%22%23DC2626%22%2F%3E%3Ctext%20x%3D%22620%22%20y%3D%22338%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EInfrastructure%3C%2Ftext%3E%3Ctext%20x%3D%22525%22%20y%3D%22360%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EAudit%20Log%3C%2Ftext%3E%3Ctext%20x%3D%22525%22%20y%3D%22378%22%20fill%3D%22white%22%20font-size%3D%2212%22%3ENotification%3C%2Ftext%3E%3Ctext%20x%3D%22525%22%20y%3D%22396%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EAutomation%3C%2Ftext%3E%3Ctext%20x%3D%22525%22%20y%3D%22414%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EAPI%20%2F%20Integration%3C%2Ftext%3E%3Ctext%20x%3D%22525%22%20y%3D%22432%22%20fill%3D%22white%22%20font-size%3D%2212%22%3EMoadian%20%2F%20VAT%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%22165%22%20x2%3D%22380%22%20y2%3D%22190%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cline%20x1%3D%22140%22%20y1%3D%22285%22%20x2%3D%22140%22%20y2%3D%22310%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%22285%22%20x2%3D%22380%22%20y2%3D%22310%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cline%20x1%3D%22620%22%20y1%3D%22285%22%20x2%3D%22620%22%20y2%3D%22310%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E)

# ساختار ماژول‌ها (۲۰ ماژول اصلی)

| ماژول | قابلیت‌ها |
| ----- | --------- |
|       |           |

1. هسته حسابداری

| دفتر کل، سند، دفتر روزنامه، تراز، مانده حساب، سال مالی، دوره مالی |
|

2. خزانه

| صندوق، تنخواه، دریافت و پرداخت |
|

3. بانک

| حساب بانکی، مغایرت بانکی، انتقال وجه |
|

4. چک و سفته

| چک دریافتی، پرداختی، واگذاری، وصول، برگشتی |
|

5. فروش

| پیش‌فاکتور، فاکتور، مرجوعی، تخفیف، مالیات |
|

6. خرید

| سفارش خرید، رسید کالا، فاکتور خرید |
|

7. انبار

| کاردکس، حواله، رسید، انتقال بین انبار |
|

8. کالا

| کد کالا، بارکد، سریال، بچ، واحد اندازه‌گیری |
|

9. مشتری و تامین‌کننده

| اشخاص، مانده، اعتبار، قرارداد |
|

10. حقوق و دستمزد

| فیش حقوق، بیمه، مالیات حقوق |
|

11. دارایی ثابت

| استهلاک، خرید، فروش دارایی |
|

12. پروژه

| مرکز هزینه، درآمد پروژه |
|

13. بودجه

| بودجه سالانه، کنترل هزینه |
|

14. چند ارزی

| نرخ ارز، سود و زیان تسعیر |
|

15. سامانه مودیان

| صورتحساب الکترونیکی، شناسه کالا، CSR |
|

16. مالیات ارزش افزوده

| VAT خرید و فروش، اظهارنامه |
|

17. گزارشات

| تراز آزمایشی، سود و زیان، جریان وجوه نقد |
|

18. اتوماسیون

| Workflow تایید، وظایف، اعلان |
|

19. API

| REST/GraphQL/Webhook |
|

20. مدیریت سیستم

| کاربران، نقش‌ها، شعب، شرکت‌ها |

# فاز اول: هسته حسابداری (مهم‌ترین بخش)

این قلب سیستم است.

## قابلیت‌ها

![Conceptual Overview of Certinia Accounting & Terminologies](https://images.openai.com/static-rsc-4/jqowIIvw6wcsMwpACTyfXlGcboEX9wNSuACOEg1vGWfdKmLqyFH-4h8bN7VEjwHQBEC0AvoL4suvanzaV-bZ9DVvBe2ardeKTOehDIvQqdGY_Egs6JGy-ClO9iSgQQDBIVZ0lNUTVyuGYlHIeasK2ptxQAWVtWjt3OWSbIpI52o?purpose=inline)

![Modular Open Source ERP Software | NotrinosERP](https://images.openai.com/static-rsc-4/nDWLnavXjV_FymdOpdSaf8HL-uSSa-dmdjYrUuiHNNQtgc6zXPH2RAQXJQkbJL8WOYm5oJmtaoxFPf3W-cY8CHfOrMX14gOuu_JTMRFbv7gvZ1g7xNrlIabCQ8DXEDPeLw0aRNKFTj3f4Wvwe7O4f7PRGeE4pe309L1LRv2QHPY?purpose=inline)

![APD Customer Community](https://images.openai.com/static-rsc-4/y91-o7bsQiwEJbZXekE9zJvR6y2UUbkEyFpU8iiTZbOrbmB-gRegtJwi7hlzJ0wc-fCP6tqPxQdxQ9eU6pzMTDMRen-YCD8NMXqMJoc4gl6xk1xnBhIiX-jg-9Ny9xATLILlLCb2b94X2hEhD_dihL9NYMj0DnpkJf47f4NF0BY?purpose=inline)

6

| امکان              | جزئیات                        |
| ------------------ | ----------------------------- |
| دفتر روزنامه       | ثبت تمامی رویدادهای مالی      |
| دفتر کل            | گردش هر حساب                  |
| دفتر معین          | حساب‌های زیرمجموعه            |
| دفتر تفصیلی        | اشخاص، پروژه، مرکز هزینه      |
| سند حسابداری       | Draft / Posted / Reversed     |
| شماره سند اتوماتیک | بر اساس سال مالی و سری سند    |
| دوره مالی          | ماه، فصل، سال                 |
| بستن حساب‌ها       | Closing Entry / Opening Entry |
| ثبت اصلاحیه        | بدون حذف سند قبلی             |

## چرخه عمر سند حسابداری

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20120%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%22120%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23F59E0B%22%2F%3E%3Ctext%20x%3D%2280%22%20y%3D%2250%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EDraft%3C%2Ftext%3E%3Crect%20x%3D%22200%22%20y%3D%2220%22%20width%3D%22120%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%232563EB%22%2F%3E%3Ctext%20x%3D%22260%22%20y%3D%2250%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EApproved%3C%2Ftext%3E%3Crect%20x%3D%22380%22%20y%3D%2220%22%20width%3D%22120%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%2316A34A%22%2F%3E%3Ctext%20x%3D%22440%22%20y%3D%2250%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EPosted%3C%2Ftext%3E%3Crect%20x%3D%22560%22%20y%3D%2220%22%20width%3D%22150%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DC2626%22%2F%3E%3Ctext%20x%3D%22635%22%20y%3D%2250%22%20text-anchor%3D%22middle%22%20fill%3D%22white%22%20font-size%3D%2216%22%3EReversed%3C%2Ftext%3E%3Cpath%20d%3D%22M140%2045%20L200%2045%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20marker-end%3D%22url\(%23a\)%22%2F%3E%3Cpath%20d%3D%22M320%2045%20L380%2045%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20marker-end%3D%22url\(%23a\)%22%2F%3E%3Cpath%20d%3D%22M500%2045%20L560%2045%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20marker-end%3D%22url\(%23a\)%22%2F%3E%3Cdefs%3E%3Cmarker%20id%3D%22a%22%20markerWidth%3D%2210%22%20markerHeight%3D%2210%22%20refX%3D%228%22%20refY%3D%223%22%20orient%3D%22auto%22%3E%3Cpath%20d%3D%22M0%2C0%20L0%2C6%20L9%2C3%20z%22%20fill%3D%22%2364748B%22%2F%3E%3C%2Fmarker%3E%3C%2Fdefs%3E%3C%2Fsvg%3E)

Best Practice

* Draft قابل ویرایش.

* Posted غیرقابل ویرایش.

* اصلاح فقط با سند معکوس (Reverse Voucher).

  ![](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

  GitHub+1

# طراحی درخت حساب‌ها (Chart of Accounts)

## ساختار حسابداری ایران

![Common Financial Model Structure for CFOs | Josh Aharonoff, CPA posted on the topic | LinkedIn](https://images.openai.com/static-rsc-4/u-ZI8wnHMojLqh9j7Nj5tNZdZPl7inMEStyvXvxsKzHdk7MIQHmaH-L8LuxEbuZ5IW8SLdrvb9kmvA17uUmZuy5QdBYAIw_QoIEM7Y8kfNsmZ2wiVgPIQCU82GuRD6KV9YRTyy8xOwbUVc17GMrQEbXhYQXHWlU5zY19i2MEw8o?purpose=inline)

![Chart of Accounts Hierarchy -Ragged & Skipped Oracle BI Apps Solutions](https://images.openai.com/static-rsc-4/ngAC9FJWLu0ka_-5YQ1hPI7Rv9a97dpw1lWIB1nlFVr7sBKPMdlIHxqSqUtAtyUtltF4gZAhKl_Co8xIks7GkkU5Tz6K6Rh1A_dA-61Xs10Ke-Vqx3wyM7eA8J9NFsdmd_ob6-HXPfbfkVerk2v8amnqNtJR1Twp3wvLlQEw_T4?purpose=inline)

![PPT - Accounting Information Systems PowerPoint Presentation, free download - ID:5109035](https://images.openai.com/static-rsc-4/xQJ1l2BgK0I_Y2IRx-s0wNMfuYoYdsvq0647jmJk6PnMp0zuUehO3LC68Lhh0r4vIr_cNxMpJ6NqB566mfVygEkYWW92Chzspxh6yf8NxPbWAlbq0eOJn6_3sr1IZcwWhxVMPPFVGDKBJYbGZgEGmBiDQ4s1BWN5EO5m1odmkQU?purpose=inline)

5

| سطح          | نمونه                |
| ------------ | -------------------- |
| کل           | دارایی جاری          |
| معین         | بانک ملت             |
| تفصیلی شناور | حساب مشتری علی رضایی |
| مرکز هزینه   | شعبه تهران           |
| پروژه        | پروژه X              |

## قابلیت‌های درخت حساب

| ویژگی             | توضیح                              |
| ----------------- | ---------------------------------- |
| نامحدود بودن عمق  | Recursive Tree                     |
| کد حساب           | 100101001                          |
| نوع حساب          | دارایی، بدهی، سرمایه، درآمد، هزینه |
| ماهیت حساب        | Debit / Credit                     |
| فعال یا غیرفعال   | Archive                            |
| حساب کنترلی       | Control Account                    |
| تفصیلی اجباری     | الزام اتصال شخص                    |
| مرکز هزینه اجباری | برای برخی حساب‌ها                  |

# موتور دوبل (Double Entry Engine)

این مهم‌ترین قسمت طراحی است.

## هر رویداد مالی فقط Journal می‌سازد

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20320%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%2240%22%20y%3D%2215%22%20width%3D%22680%22%20height%3D%2245%22%20rx%3D%2210%22%20fill%3D%22%23DBEAFE%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2243%22%20text-anchor%3D%22middle%22%20fill%3D%22%231E40AF%22%20font-size%3D%2218%22%3EBusiness%20Event%3C%2Ftext%3E%3Crect%20x%3D%22250%22%20y%3D%2285%22%20width%3D%22260%22%20height%3D%2255%22%20rx%3D%2210%22%20fill%3D%22%23C4B5FD%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22118%22%20text-anchor%3D%22middle%22%20fill%3D%22%234C1D95%22%20font-size%3D%2218%22%3EJournal%20Transaction%3C%2Ftext%3E%3Crect%20x%3D%2240%22%20y%3D%22185%22%20width%3D%22300%22%20height%3D%2290%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%2F%3E%3Ctext%20x%3D%22190%22%20y%3D%22215%22%20text-anchor%3D%22middle%22%20fill%3D%22%23166534%22%20font-size%3D%2216%22%3EDebit%20Entries%3C%2Ftext%3E%3Ctext%20x%3D%2260%22%20y%3D%22238%22%20fill%3D%22%23166534%22%20font-size%3D%2213%22%3EInventory%3C%2Ftext%3E%3Ctext%20x%3D%2260%22%20y%3D%22258%22%20fill%3D%22%23166534%22%20font-size%3D%2213%22%3EBank%3C%2Ftext%3E%3Crect%20x%3D%22420%22%20y%3D%22185%22%20width%3D%22300%22%20height%3D%2290%22%20rx%3D%2210%22%20fill%3D%22%23FEE2E2%22%2F%3E%3Ctext%20x%3D%22570%22%20y%3D%22215%22%20text-anchor%3D%22middle%22%20fill%3D%22%23991B1B%22%20font-size%3D%2216%22%3ECredit%20Entries%3C%2Ftext%3E%3Ctext%20x%3D%22440%22%20y%3D%22238%22%20fill%3D%22%23991B1B%22%20font-size%3D%2213%22%3EAccounts%20Payable%3C%2Ftext%3E%3Ctext%20x%3D%22440%22%20y%3D%22258%22%20fill%3D%22%23991B1B%22%20font-size%3D%2213%22%3ERevenue%3C%2Ftext%3E%3Cpath%20d%3D%22M380%2060%20V85%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M320%20140%20L180%20185%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M440%20140%20L580%20185%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E)

## قوانین غیرقابل شکستن

| قانون                     | توضیح                      |
| ------------------------- | -------------------------- |
| جمع بدهکار = جمع بستانکار | Database Constraint        |
| Transaction Atomic        | همه خطوط یا هیچ            |
| Append Only               | ویرایش ممنوع               |
| Idempotency               | ثبت دوباره سند ممنوع       |
| Voucher Number Sequence   | شماره سند بدون شکست        |
| Period Lock               | بعد از بستن دوره ثبت ممنوع |

این اصول دقیقاً همان چیزی هستند که در سیستم‌های مالی حرفه‌ای توصیه می‌شوند.

![](https://www.google.com/s2/favicons?domain=https://paprel.com\&sz=32)

Paprel+2

# سیستم اشخاص (Party Management)

تمام موجودیت‌های حقیقی و حقوقی.

## Entity واحد

| نوع شخص      | کاربرد        |
| ------------ | ------------- |
| مشتری        | حساب دریافتنی |
| تامین‌کننده  | حساب پرداختنی |
| کارمند       | حقوق          |
| سهامدار      | سرمایه        |
| بانک         | حساب بانکی    |
| نماینده فروش | پورسانت       |

## ویژگی‌ها

* کد اقتصادی

* شناسه ملی

* کد ملی

* شماره ثبت

* چند آدرس

* چند شماره تماس

* حساب بانکی

* سقف اعتبار

* مانده اول دوره

* گروه مشتری

* دسته‌بندی تامین‌کننده

# سیستم کالا و خدمات

## مدیریت کالا

![Aplikasi Inventory Barang: Ini Rekomendasi Terbaiknya](https://images.openai.com/static-rsc-4/bLb5RXt6c7YU85y72o1UrkgP0U51YbPTUlpyh21tINdPAUGTimNj3pzBtuAa_jmtP7la0ykIz4PjXQH8Gc_A0IgLkdhrIqGsu129tq9xlxmbZUkVLAgzdNqmzt6DPLAxLPWEGe1iGTVzM5zUpLXjguPvenp6NRhFY8OCGmr1p90?purpose=inline)

![A Guide to Barcode Inventory Management Systems](https://images.openai.com/static-rsc-4/ce5NLbASIPQHwM9-49uOy4jz6yIcIMBuAyqmbPsz5uMop4kKqpOoLaBKbC2xIuaVBerHmH8i9alLQV56ytJPuQSbkB1y03ThFnTk60TC68oVnxxO13xglLPHGAz_Iq2eTvXLdZBvAi8fs0HSZ3uIuynK_586Ms0mWfZvYGhla-w?purpose=inline)

![قارئ الباركود: الفوائد والاستخدامات التي لا تعرفها في  2024 - شركة رحاب التنمية للتجاره و الانظمة الامنية المتكاملة](https://images.openai.com/static-rsc-4/UMKp0lYKR28RVsu-2Y3u4AAGy0eyqQT1GIgqekqPtc-EBri1CidOK02CABvIzjfaEMsrSOQyR9T3oY9PYRakgJKrkuYF3xURQhj4K7_i2lw4zITGkCv3rD5V2pp9KIWRlC70KHewY0vcqnzvFBCDVrtz1aEApQ6l2XlLS6j6JH8?purpose=inline)

7

| قابلیت       | جزئیات            |
| ------------ | ----------------- |
| کد کالا      | Unique SKU        |
| بارکد        | EAN / QR          |
| واحد اصلی    | عدد، کیلو، متر... |
| واحد فرعی    | کارتن، بسته       |
| سریال        | IMEI / SN         |
| Batch        | شماره بچ          |
| تاریخ انقضا  | مواد غذایی / دارو |
| کالای خدماتی | بدون انبار        |

## قیمت‌گذاری کالا

| روش           | پشتیبانی      |
| ------------- | ------------- |
| FIFO          | بله           |
| LIFO          | اختیاری       |
| میانگین موزون | Perpetual     |
| استاندارد     | Standard Cost |
| آخرین خرید    | Last Purchase |

میانگین موزون دائمی در نرم‌افزارهای ایرانی رایج است.

![](https://www.google.com/s2/favicons?domain=https://freeamir.ir\&sz=32)

مستندات امیر

# سیستم انبار

![5 Strategies to Improve Order Picking Accuracy - Warehouse One, Inc.](https://images.openai.com/static-rsc-4/Po5AHsNgwLgYmTYukUUzM1-fSx-VUnNFLNU1ex3Afg4hvF9_RUbbwUpH6FoCy5Ify5vp4I671ykE2hJpcZa-yJ9ZHXAm46elHknqd0rSMSNVCL8Ae5c6LCHtRBe2o8pl9K5MT8Atnt3n7WLQlPAxjA3TTTaMMWcdMTON_i-X1hw?purpose=inline)

![Peacksoft Warehouse Management System manages stock control in warehouse.](https://images.openai.com/static-rsc-4/X66sx5jCSjbuBOxz3Xs39iLZuuE_kVh3-s5X82IX4rrfsv2J0b6v20DYEELA5JXl3totcLh_zbDwfmXfX2pwEldjVB6d3cuyqcMXu0T3WGcbQLfOArar4nsXepamhlq5e8ESr5QkvtzVkEozfd3Tk1AOroaCCZVHKVLE4aUN20U?purpose=inline)

![Lidl Scraping API - Scrape Lidl Product Data API](https://images.openai.com/static-rsc-4/dsuqx11THKE4ydsqtqcbl_IKuFJzNEotIJfF65HSlJSVOeeIVnl1mgYK0Ihz1xB2UqaoXugU_SOt6P0NoyJvz4jqi--ptUk6k9joWUxYADC0LxE4Ng4rRg48PLY1nUYJli3FS3WaOnQE8NH8-oRlkPLKMRDL2B-Fg14VFg1Qrig?purpose=inline)

6

## قابلیت‌ها

* چند انبار

* شعب مختلف

* انتقال بین انبار

* حواله خروج

* رسید ورود

* موجودی رزرو شده

* موجودی در راه

* موجودی قابل فروش

* نقطه سفارش

* حداقل موجودی

* انبار امانی

* انبار پروژه

## کاردکس لحظه‌ای

| نمایش          | شرح             |
| -------------- | --------------- |
| ورودی          | رسید خرید       |
| خروجی          | فروش            |
| انتقال         | بین انبارها     |
| اصلاح موجودی   | انبارگردانی     |
| موجودی لحظه‌ای | Running Balance |

# فروش

![Invoicing software | GST & non-GST Invoices - mybillbook](https://images.openai.com/static-rsc-4/nTb9_ErM3Oir-5_rMmgpUcuP-e7r-HbkztdlTD6LSA1JZ0cJ1mgLKMRey8EzcbdHYyGf060CLnMqahSQTsUJxlLF9aWFzKb4DZtLwX5uQQGYvrqq87iJ0Ws6ZbzHF8U_-HfpXSCHzRpOT4Ucz66V9g0tjq3nS6GCNmtu_pl3cDc?purpose=inline)

![Finakle ERP - Leading ERP Systems & POS Solutions in Sri Lanka](https://images.openai.com/static-rsc-4/l0UL6ADYY5h7lENC3SdnF8slAO6OgWSnDcyBAW0A3NGaoBFQ0MQUgffofoTQsHfZqAgUf1kA4c5YD1cWs0UFSPWZNCahbUar_N0hJ-QZ5CovMMfkPi6yG7DOftBNIgQ8-Me_0zRvKl7FiKyPSjiuKV_1oR5gMLgcnHAIdW3jLZI?purpose=inline)

![Rapid Retailer — POS for Modern Retail](https://images.openai.com/static-rsc-4/MSXeIePNS-zuiJ_hpK91AdwbWktG1ZBp19zGRtlgyuteT4aolU0Iwadz8y5rigIzGcBuq_m95YeCBt7jcBuG3d4T-wubbQez3Vxd3ZvQ_nyjXPVxlcM1Yvii36EjS6SSRMnDoDbnIqNkrvsTMFqyCvPTtgyNb9FpUBRMVpYJUQY?purpose=inline)

7

## چرخه فروش

* پیش فاکتور

  بدون اثر مالی.

* سفارش فروش

  رزرو موجودی.

* فاکتور فروش

  ایجاد سند حسابداری.

* مرجوعی فروش

  سند اصلاحی.

* دریافت وجه

  تسویه حساب.

## امکانات فروش

| امکان           | توضیح                       |
| --------------- | --------------------------- |
| تخفیف سطری      | در هر آیتم                  |
| تخفیف کلی       | کل فاکتور                   |
| مالیات          | VAT                         |
| عوارض           | درصدی                       |
| چند روش پرداخت  | نقد، کارت، چک               |
| پورسانت فروشنده | Rule Engine                 |
| سری فاکتور      | Online / Retail / Wholesale |

# خرید

![Purchase | Norksys](https://images.openai.com/static-rsc-4/zsrFa1gt3ubiGmX6CZ6bVq6DDOeUNu-adlRpArNQe0X8-KiPFAtmJSvyyN5MsefCidSCHUjTgv8a15N8lpJ5JK3Ro-mTRAvEzEKgsdYsx-ZLs3eaiM-ngkA6EsQi9Fc_pnE2ELRBNIh-OyD9UdialFp8slmdFHro__CxVfEAt9w?purpose=inline)

![Accounts Payable Invoice
Event Based Holds](https://images.openai.com/static-rsc-4/gRgRHZC8g3PRrozWSu9g4ZvgCjX9ReaQSE-aWYNHGyuoCdpXlQJdwfbWYgK7EUha5MCfCX1e_OrfZxCWCC48bSTwnZC3gtykbbI2DFIMBTbJi9-wGgN99KudU2yVZtmI87re7ilb4KogUH-R6u2ycp8dfjvF4EO3e1Ibnd5_WYc?purpose=inline)

![How to Set Up Approval Workflows in Odoo 19 Purchase Orders](https://images.openai.com/static-rsc-4/7ujGlt8jM76t8qElk1reOr_dJUYGsXjAVu0Vv_XxP8gwdFIkhQrtT_lpsQhIygWbcCYT4urMLjgGQEpsmt_aFuCrzT5NdHlkhDTsuQDW8CrLcPBd534Iwq7XJOvbrBCo5lmE6lwN4o_48AiBjC6g1wZ-bqCU9YKsfI7sAtKzqP4?purpose=inline)

5

چرخه خرید:

1. درخواست خرید.

2. تایید مدیر.

3. سفارش خرید.

4. رسید کالا.

5. فاکتور خرید.

6. پرداخت.

## امکانات

* تامین‌کننده‌های متعدد

* ارز خرید

* هزینه حمل

* هزینه گمرک

* هزینه جانبی

* تخصیص هزینه به موجودی

# خزانه و صندوق

![Cash Register Logging Software](https://images.openai.com/static-rsc-4/HrEljA4c_3pDF4kqXHMYDyCU_yWi_DX3Y_q732GbLuhtEJKjYYIMjrJHa10kuJk03g3w54dZpWPflO3q4Zav7o6uQUPUKN9iDAJrG6fiUEfI4jEjyRkTB6OzbQQor84-DGuf0BxSEevYUu78Iwqzx6jeLB8GeAoPetWtFzwo-vk?purpose=inline)

![Petty Cash Log Templates | 9+ Free Printable Word, Excel & PDF Formats, Samples, Examples, Forms, Sheets, Registe… | Budgeting money, Budgeting, Budget planner free](https://images.openai.com/static-rsc-4/Xb_91p6NprOHbWwhXAKoDMQCie6QXm8Py_WehZn5NgGoU-eqB1THNypn94c--eSjIsz_gSUkxMqrPLeCTs50wq7QyXeZM_gIQQTxBkHDRrOytNxdcxHf-MlTxFwft_Q1JE5vfjDCNA0ZM-1gXBoYASHU-72g-9ZpFaeShtgL_k0?purpose=inline)

![La caja chica se refiere a una cantidad pequeña de dinero en efectivo que las empresas establecen y destinan a gastos moderados que puedan surgir de imprevisto. Este tipo de consumos se caracteriza… | Kateryn J. Jarquín](https://images.openai.com/static-rsc-4/kaTF8jApDUxmCXR-i_xS2TaBws5-KkmJ31bv4r0SRzzlr1aA3Zw0mUyFMC5urflG0cSqBcAsVWgCoqZs5n1OREzu0UpxLzTMUzNhMBqIckOh34dNYtkmx1Qb7iKVfug5rgR6BqJMRxncjZpV-R5O8SmtVF8V5tl1WCwotu7vzlA?purpose=inline)

6

## امکانات

| ویژگی         | شرح                  |
| ------------- | -------------------- |
| چند صندوق     | شعب مختلف            |
| تنخواه        | کارمند               |
| پرداخت تنخواه | تسویه                |
| رسید دریافت   | Receipt              |
| رسید پرداخت   | Payment Voucher      |
| گردش صندوق    | Running Cash Balance |

# بانک

![The Basics of VAT for Amazon sellers \[2026 Update\] 📊📈](https://images.openai.com/static-rsc-4/VaoBfS52ZB5pH3dxeylMWBRtx1avGABkJoPkY-ffJ9ykeNjKSylKrt9BFaNj7hF3qIlXhli_JsaXCDQDn8PYHg8L3HcCXzSjLtSZNxikBKBc7DEbX9U1ld_oifhNkzSqvtDrGhmrWw3oR6K2Sd-L47_2XN4yq5MSz9LzrRSQohI?purpose=inline)

![Free Bank Reconciliation Templates for Excel & GSheets - WordLayouts](https://images.openai.com/static-rsc-4/XwZ6lLCRr-L7m1--DP4DKxWlU9TB_7H7szM0EFqSGRfA2wl6SxzGAgOoJCkWTnKoA1VdtGrBoCYN1H706ZWMgks9WPkvoDDJwWipV6qLVwfFuxSqZYXOagiCgiRqHXLMlnz3ywefqSRIspwt_Q5MrbBExM-UnB7hbh79v4I9eds?purpose=inline)

![Streamlining Bank Reconciliation: From Chaos to Clarity by Pennylane on Dribbble](https://images.openai.com/static-rsc-4/8Yr7KACNkFLFxXJB8rawyF51f4OE2vwwitVaxq8Q09mQ8yhbarS-eeN0dsIZ14FaG1T5VJ4Aer3Qfnd9DEQd1Iwiqg3ZfiND6ObnoIl6bDrhcE6VjPC2x1veOOB0KLuIG2-rk7mXFV60wylc9vliZ3YFMQQHLaKIWW0Yt6YF4rw?purpose=inline)

4

## امکانات حرفه‌ای

* چند بانک.

* چند حساب.

* شبا.

* شماره کارت.

* انتقال داخلی.

* انتقال بین بانک.

* مغایرت بانکی.

* Import فایل بانک.

* دسته چک بانکی.

## مغایرت بانکی

| ویژگی        | شرح                  |
| ------------ | -------------------- |
| Import CSV   | گردش بانک            |
| Match خودکار | بر اساس مبلغ و تاریخ |
| Manual Match | اصلاح دستی           |
| Outstanding  | چک‌های باز           |

# سیستم چک (بسیار مهم در ایران)

![دعوای الزام به ثبت چک در سامانه صیاد، قابلیت رسیدگی قضایی ندارد!](https://images.openai.com/static-rsc-4/A8KZcaoePjF3GxTBznMUWGWFpxQh1A1lXNssenKUUPs4VatE2p5IZ80bcex1w1t7NUxsrCHQvpAIBudjOuBFEAmzT5j7lkifudBlPcgrVZgJSIys5-cZ04Rmz--IwoeNKuu5Zy6T9Js7tcH4EoA4rWRqYmyjMqsgXLZglrF7DQE?purpose=inline)

![Business man in suit,  hand writing and signing cheque book with cup of coffee  on the wooden desk at modern home office](https://images.openai.com/static-rsc-4/ytFtq03R20XV4HIFJajAzD0uWg4Fh4suHVmLXLhjDl_gG07qh3TCYuoCjD7zyXXqEcmaoavyLKe_4ghHebTBGnBOOmhFKtZxT2v16vVnyQ4G-ySsgJRfiKOcLGFS7pC8voFNJg-Cn2AMk5FLM3_gMHeyN8y9fO2DEfp3gwYy2NEqpinIiSmYnQq8okRgGZ86?purpose=inline)

![Sign cheque](https://images.openai.com/static-rsc-4/Mn9OCMl-wWNFj-71q-Rj4eWyD_ZdxYq6ABXbVEe1z0lT5k8ZITYpdv1EhFYWjzQ6Q4DACcSPVLFG6hWafzeCS4JgTXyoXhl_e7h2tlnNn2889TIzoFwTpq8n35QOnN3gNGJUpRJDe2BvUeeB7P5NSwnL5S7qgAktryQnh6oyyvWGh9YzGZgmiSShzch4tAZo?purpose=inline)

4

## چرخه چک دریافتی

* دریافت

* نزد صندوق

* واگذاری به بانک

* وصول

* برگشتی

## وضعیت‌های چک

| وضعیت         | ثبت مالی            |
| ------------- | ------------------- |
| دریافت شده    | حساب اسناد دریافتنی |
| در جریان وصول | انتقال به بانک      |
| وصول شده      | بانک بدهکار         |
| برگشتی        | برگشت سند           |
| باطل شده      | Reverse             |

# حساب‌های دریافتنی و پرداختنی (AR/AP)

![Accounts Receivable Aging](https://images.openai.com/static-rsc-4/j2d7QH8AQ-gogpicIKyk-LE3--PitHANK9mDQEnn7bM_FzIGCMuE_NFp1pGcTszZJuWy495BsU-bgtt01alwcm5qyCdA7FNh0t9N4VmQggrzvPZ1yB6EB6KUXYRdTZtr1d8LCjsd0rXwiT38wT8xqieQmVFms1sI3TZNOP2AtsQ?purpose=inline)

![Top 26 Financial Dashboard Examples and Templates | Coupler.io Blog](https://images.openai.com/static-rsc-4/sLZw5SRnwELwwEYZgpjw6oU0vdqMxQQRoaAyOnRAVIcRlMGmEp8ZP7_wvMNQtY8SIqyMwBauLEi4TjiGI0y8xJ27qJz39iQ9EIfrAs2SqxP3RF816hF8PwKN8oY1WhYUZd6R6E7cg9K9V5XvNd-lpB6_kMhto8-5IC6F5zgJIos?purpose=inline)

![Blog | What Is An Accounts Receivable (AR) Aging Report And How To Use It?](https://images.openai.com/static-rsc-4/JtGrL9lPIsdgj9zsgoAyYPXUsZm2-R_gsS-SYRsK8d8rPNbd5S5iowEbrgtOn-EKlUqoB8yBrO04wrQLzFUs0r0mnnaESYxiSpGj4y16hO9zqcq9TipY02XcJH-WDWt8dTrwtVZtOJRzd5VvUYzKi3t0zTb6AF1ufV-uFmOVPow?purpose=inline)

6

## امکانات

* مانده مشتری.

* مانده تامین‌کننده.

* صورتحساب.

* گردش حساب.

* سررسید.

* Aging Report.

* تسویه جزئی.

* تسویه کامل.

* تهاتر.

## گزارش سنی مطالبات

| بازه  | مبلغ |
| ----- | ---- |
| 0-30  | ...  |
| 31-60 | ...  |
| 61-90 | ...  |
| 90+   | ...  |

# مالیات ایران

این بخش باید دقیق مطابق قوانین ایران باشد.

## ارزش افزوده

| ویژگی      | شرح            |
| ---------- | -------------- |
| VAT خرید   | اعتبار مالیاتی |
| VAT فروش   | مالیات خروجی   |
| اظهارنامه  | گزارش دوره‌ای  |
| معافیت     | کالاهای معاف   |
| مالیات صفر | صادرات         |

# سامانه مودیان

![آموزش سامانه مودیان صفر تا صد](https://images.openai.com/static-rsc-4/WfO0god_ejVymL7TKY7yb7O5FGdU7CEq984_d5E7e_BwclXLpfV1vXaaF7F7YuBiiKFvR7bVxFzJlivQQJClPCY0PjIkJ-A1fhAM9V_NY9_sEVI1AWRVXE-H3Hp_UPGIdnxQQ6Jiwcrmq_4eOuwT_4bwkFICJ1YzgSVBJUneAak?purpose=inline)

![طریقه دریافت خروجی اکسل از صورتحساب سامانه مودیان 1404](https://images.openai.com/static-rsc-4/v2PCP7MMbJtSFTZ_sUkW039ewfZat_qftYZZqo4MUr276g9GXderTdJMzHfvn2RTQTwcfytnth0GE06tvKTbN3RmHm_xhLz2xViuJoWVISirIGqq5nuJR5chpHGENhWUSCBEySZkOEmywcyuKVnVLbn4DOv9B6K8eLPbuoH3Vy0?purpose=inline)

![سامانه مودیان - ترازسامانه](https://images.openai.com/static-rsc-4/btJboSWPjfe7-l5_cW27A51dHUJwLUlRyisggAGZBeeqPciJ6n2tr6UKoNnvkyhk2qKfvE2liTS1IBuq1dz1lrC5USWZPBaT5iGyhQAasiyPiLPlxKYkZa4KMin8IXXXybKw_AXXRBOcWPl3c_YIQvbTTddKsGYePYro01iWAEc?purpose=inline)

## امکانات ضروری

* شناسه یکتا کالا.

* شناسه خدمت.

* CSR.

* Certificate.

* Private Key.

* ارسال صورتحساب.

* استعلام وضعیت.

* اصلاح.

* ابطال.

* برگشت از فروش.

![](https://www.google.com/s2/favicons?domain=https://freeamir.ir\&sz=32)

مستندات امیر

# حقوق و دستمزد

![10 Essential Types of Accounting Software](https://images.openai.com/static-rsc-4/Egk_vPrSZ4Zm2X15OV88f_5r3DIsGaQxHXwgysWtUmlB9UpaYrRMXW75lQIywmd29L2XZtgqsCbNzRZjUxWlpdK1z4HsOmPsf8UqA4wF1665BPj8BF43xupSbBax11i4IJxkQOKfNyXAiE9_wJ-iiNb3pHnntBTdxCcss5c31yY?purpose=inline)

![Payroll Mauritius](https://images.openai.com/static-rsc-4/RQZLlFRjdtNbi_2djrS7dE6oRRvBigMOmx1lmybNIMFwtBh0mqRdLpAsgDpdEYP-RzJXLI1LS-AwZl9fA0W6kaBsyci9OSlQniQEOCbhPXz0i4u7jBy8d3vkol-6UcnfRSPicjENC5mQtQb9_0EnuV2paavENpPa-kvBMoLNKVU?purpose=inline)

![Software Upgrade - BrightPay UK Blog](https://images.openai.com/static-rsc-4/HIEhgkbsuw0Ul4tBmSBJ91FYTu4SnRo-3ixRzpE16-t_l1LhKelIWpuMTZOfEDmrZSNwQDLSTn8pBsfDT2jlckOHYC92TM4IwKpFfcbKxtfIfiFAEJ2WO7dMlCYNCOTfuY3FDOQDDfyeziZxFNF0Zjv-rDjfkicY0snGqG9J4zE?purpose=inline)

4

## امکانات

| امکان              | شرح            |
| ------------------ | -------------- |
| تعریف کارمند       | پرونده کامل    |
| حکم حقوق           | حقوق پایه      |
| مزایا              | حق مسکن، بن... |
| کسورات             | وام، بیمه...   |
| مالیات حقوق        | محاسبه پلکانی  |
| بیمه تامین اجتماعی | لیست بیمه      |
| سند حقوق           | ثبت خودکار     |

# دارایی ثابت

![Fixed Asset Register Excel Template - SampleTemplatess - SampleTemplatess](https://images.openai.com/static-rsc-4/gfRwJKQ2C1nHZRH-c9vmkHKxF3yTTlNClivzEPR_KGM5UL3tKpdEYuKqXW1I1d47WRZjZBeHaIbSoDZ1XjWTtA-vVg0pO8ikz0i-_tPRk0QzYmDAFLAdZjLjcHlplk4nPNr7eO36SkxLBVWn93-_pdSQalqKx3vj_oOAYsmfcIU?purpose=inline)

![Free Depreciation Schedule for Excel & Google Sheets | FinancialAha!](https://images.openai.com/static-rsc-4/dwhI6T4aPFpFthIlzP4h5xYafrsugfKhxThs9zlYneKK8t4iZjjZLZFt7lcEG9CR--fLdt0jCXTFgA5J3bm93NOihLtFPiJBjn4UEWbJMGPP9bU08xGw-go51-B-ubX7Uo4ysLLTBUQSVrTirjfMdW_hb4PXKDO7j7gg7RC__Uo?purpose=inline)

![AutoCount](https://images.openai.com/static-rsc-4/7gr4bHOKrZwxxElV6LCwh2Xnn8nySDflyPBH-2V2i9yu8EdOmhTRt74ryDy9TrhtWjXi8Wjyn8wJ5tkwIzwEOcS_5Yolowm8Z7HKWwWcRqT9MziZxo8nNonTXCkW5e6P7qZ0sjVQIAWFaLF17bZaeEi8Uvz_z6zDCMPcPm1xFyo?purpose=inline)

6

## امکانات

* خرید دارایی.

* شماره اموال.

* محل استقرار.

* مسئول دارایی.

* استهلاک.

* فروش.

* اسقاط.

* انتقال.

## روش استهلاک

| روش       | پشتیبانی |
| --------- | -------- |
| خط مستقیم | بله      |
| نزولی     | بله      |
| تولیدی    | اختیاری  |

# پروژه و مرکز هزینه

![How to build a culture of financial data analytics | Brian Kalish | Finance Alliance](https://images.openai.com/static-rsc-4/pzrAEDn3gt-iQGIJ53YpxJLJOlcHy4LG3nP9WAkDK5oD3W1zbmqqzGNYWun1hbGp5QblmmhHanntJRhITV44FOVCfEB-WiNfghsykH5E5v8sGHUG_oDXzN6V1btLFfLhrJEW6PavnknEK79TwO-bEK6kvKEMaNtAlsebChGanGg?purpose=inline)

![Project Cost Allocation](https://images.openai.com/static-rsc-4/_B68pF1jR0gtCS4JJxHq8dGLPG5HcjIceZAqXqXqddNpw5byHmZquyFAe2T7bpLW3UJqynMo3niu1Ha1_yJ2F0wcauQb7cAq7vjRmczgnfyO7wzLhdbW-_uA2fQ_x_lRxb68j-ljgdlFK1FNGKX6SNgsAppASBoYvx8fMjxtAzY?purpose=inline)

![Cost Center Reporting in SAP Is a Headache - Here's How Power BI Makes It Simple - Zentrix](https://images.openai.com/static-rsc-4/ax3VDA9TnWFQuUSNJ718axgZ6Lo9rT6TQEYkyxrg7ezlXEhoK6D1jDyeKDJZtbc1aN0lULlEO0zkIe5riyg1XHeDnttXFX3mOZENISiHm3Mn_sVp5BR-AdNdpaxxGxTrXoupBXRZmvHmyQQslF_AuabDHdegIjrfNrl5T7ORZPQ?purpose=inline)

5

## امکانات

* مرکز هزینه.

* پروژه.

* شعبه.

* دپارتمان.

* تخصیص درصدی هزینه.

* درآمد پروژه.

* سود پروژه.

# چند شرکت و چند شعبه

![Phương pháp quản lý chi nhánh cho doanh nghiệp hiệu quả](https://images.openai.com/static-rsc-4/Rrb8hiNjwPkFNw2vTOhq5cEbEZR4vU1nrsrEdYXWskJpjK3Ad4WOEXlHlf9gRrqWr77zVJlTBOH-UXbkCHrfuRiSimSHAcs_H6ryYzNuGUkhEXYfU1lm_beEEVA2j-JF_7F6DjdhQDVfWUVuCulEmSyTXPG2EmsBumd42Jg-728?purpose=inline)

![Company Branches – RMS Help Center](https://images.openai.com/static-rsc-4/trNi9_EKUPo99ABj29xeM_bulqKXEh4KmW0LSzXz0VJwrW5yMqEM7YvXb-vNJ2-PDegqN26Ezf9uGVry7Ko6SOimlMLE6feBWKOVXR-oNN5As5FBevtqzLBPn4wINEPCUnWWELwQNlShBmsdaxDvLBm4rfonQ-_ckmF-oCrEVZ8?purpose=inline)

![Shaping Hubbing LATAM's HR transformation from scratch with PeopleForce](https://images.openai.com/static-rsc-4/MXA7AvbPBjNPsy-90_Zav_ORAgIQTNGFyeZGiBsP44IOpbHkr8vHVWsV4r7Lk_9N45kfmsZemae1BTscT8Kkdv7vsYdn-ZZrjBSU0cNJWCrAuSOWpsHYh7Ny8NU6EW1oL3Q-1qmvpOvVSzGHnRkBGx6jr8DnFNKgxjIENtDDXhQ?purpose=inline)

6

## ساختار

* شرکت

* شعبه

* انبار

* کاربران

## قابلیت‌ها

| ویژگی           | توضیح             |
| --------------- | ----------------- |
| Multi Tenant    | company_id        |
| سال مالی مستقل  | برای هر شرکت      |
| شماره سند مستقل | هر شرکت           |
| درخت حساب مستقل | یا Template مشترک |

# سیستم چند ارزی

![Deskera Accounting Software - Automate Accounting Processes](https://images.openai.com/static-rsc-4/oLij8sCtpku73K1dTRprlSEGs143FvRR7EXP_U3auYH5XF52sYnHczXTYIl_WNf5sFuV7VOaO0XfIWJBfgyCLXfoBm0oonjbk9IMntCsJpezhN-QTWW8d6oMdsQ5_Ugkw4oEhzWS9fRpvgEJKMTg4SwrTi12726adWv-8kgJIeQ?purpose=inline)

![Workcube Finance & Cash Management | Integrated ERP Solution](https://images.openai.com/static-rsc-4/kohzhX32YUsi_tSZYKiQ7HgRhycujblLVkTSuV_vFWVL1_QrwkTeEwVd9RYhHd9SqZIInEu4NuOj1sVcu4u7SdkDslRFjwuACFdXutiapCj8uYevBYJQIbYorIEMgBRSER7xiyZ1NfKe1JDYJqfPjYW1ZJSOZaAyS3FqRAPRVXM?purpose=inline)

![Dynamics GP Vs Dynamics 365 Business Central  – Multi currency revaluation / Adjust Exchange Rates](https://images.openai.com/static-rsc-4/4v-MqXg7_pTQV9fPXxjlXrepVsM30ZSi3gYGRfO49K4rL0MQucY9y2uJ6ueTM4PR4WtpSNN1d6F2wMdqnexKESvL6VkPl70aZ8BQqcd1Y8PPEn8DnT7nQx5-kyzjGOiiAA-Xllu8AcK39dB3FaWQ7_tKmBrk7LPFwMx0nAhPDjc?purpose=inline)

5

## امکانات

* ارز پایه IRR.

* ارز عملیاتی.

* نرخ روز.

* نرخ توافقی.

* نرخ حواله.

* نرخ فروش.

## اطلاعات ذخیره شده

| فیلد           | چرا ذخیره شود؟ |
| -------------- | -------------- |
| foreign_amount | مبلغ اصلی      |
| exchange_rate  | نرخ همان روز   |
| base_amount    | ریال           |

ذخیره نرخ تاریخی برای گزارش‌های سال‌های آینده ضروری است.

![](https://www.google.com/s2/favicons?domain=https://syedfaiezahmed.vercel.app\&sz=32)

Syed Faiez Ahmed+1

# بودجه و کنترل هزینه

![This item is unavailable - Etsy](https://images.openai.com/static-rsc-4/FN9l342SMb6Lhoiwmjyyzhq2Q6nsOOLU6oZqoXQG38CH7sZqEP-9aaDyn9PkqvC2Isowx19xPs9BdRT7oUQL5VlvpYjVcp3ioOTNMs0yo0w4e6jr8kniUNCVZG6zsNzPAlEGWp-RVWW1XgJ3i-BUZleiKHvJsP8Zx8PhJq5e-Sw?purpose=inline)

![24 Best Excel Data Analysis Services To Buy Online | Fiverr](https://images.openai.com/static-rsc-4/mXPn0srLmtHB1Z-k6x87-98M7p30HahjYiintbkLaYlTBMRYPS7n6UWjeXnjyEevInr3Yxs_CPd8T7XQX5tnlVz_NFubSrIiwy3c7a7v0Rl3YX3M9I2c_TERfvFJ_V2PRXEeMPBlbAk_HHeaBAYlgZ6s5b55UIj7Sh403gXFF4o?purpose=inline)

![Pastel Monthly Budget Template | Google Sheets (digital Download) - Etsy](https://images.openai.com/static-rsc-4/e2MyvMN4-ENpeswOQrbVYbSBhq90zhPAfesHsLzFqEMjD7jN8EP_r8guGPE6sydT_OydpEulEkHSFuvAleHf6my_sQYZimwiBSjapEXXKozzcN7VsqL4_MzV6XrqfQM33RRRaZNH5J1E-eQDHCb2hmrsZJ3yMVgPOCoCRUqYyU0?purpose=inline)

5

## امکانات

* بودجه سالانه.

* بودجه ماهانه.

* بودجه پروژه.

* بودجه مرکز هزینه.

* مقایسه واقعی با بودجه.

* هشدار تجاوز.

# گزارشات مالی (۳۰+ گزارش)

## گزارشات پایه

![AccountMate](https://images.openai.com/static-rsc-4/WTzCty2XOIoTDPFEggIrbKwxfLK8M897CPkXGpjkREMvML6ClzKrUQNOyS1EGPZ3Hi4MJ8C6dR0iczeenbg413eewOEBtN_oXKO7MGhBT_dyq7tKMFlY962zRYdQJoIgvEfiK3scpFQ-fb0Dr6vliLTLy-LiXjJIKYrDD7k1GSw?purpose=inline)

![What Is a Balance Sheet? | Definition, Example, & More](https://images.openai.com/static-rsc-4/QBq_gBNm63ZQQhpEb0bh3C1rISzwIMHd7-X2rI-urKdD-NV2M59i5KYn_Tl5GlmUXinUOI0qOdFzbcqe_V5Urbs4UuNUKpn69v60C67RU6Yki8lWvV3gpdrEp1k2EctgGas0t9me1BO4CGeEq1sffCpER54uPTkrLPakxbVnI2E?purpose=inline)

![Free Profit And Loss Statement Template - Venngage](https://images.openai.com/static-rsc-4/PPEPfp2Z6VvVz3B-IrmXqlL3DvCbARyLbIQPcTFKl34NAcmjawChjn6R8tPJlXnkfhG5rblw4WSl9xRwKdctsBoWVc5SbMiO1gKaecB9Wkq9_1hafUFUBP9nl7mp8MyCaOIN9gOX11eITnkqX99mIvvU5r9BeZmVxTJ--3MTHuE?purpose=inline)

7

| گزارش           | شرح                                       |
| --------------- | ----------------------------------------- |
| تراز آزمایشی    | دو ستونه، چهار ستونه، شش ستونه، هشت ستونه |
| دفتر روزنامه    | کامل                                      |
| دفتر کل         | گردش حساب                                 |
| دفتر معین       | جزئیات                                    |
| دفتر تفصیلی     | اشخاص                                     |
| صورت سود و زیان | استاندارد                                 |
| ترازنامه        | دارایی و بدهی                             |
| جریان وجوه نقد  | Cash Flow                                 |

## گزارشات مدیریتی

* سود کالا.

* سود مشتری.

* سود پروژه.

* فروش بر اساس شعبه.

* فروش بر اساس فروشنده.

* کالاهای راکد.

* گردش موجودی.

* موجودی منفی.

* حاشیه سود.

# داشبورد مدیریتی

![What is Enterprise Data Analytics and How Does it Work?](https://images.openai.com/static-rsc-4/JyNl10ctv94KBYC8ZXwHPXnWW0TrFnpizEcEyqX4vQYDgVz6d7Tz5Ug1GoR8W1U8ukvWYtTfSA6pTbKaOImeqVAdI7eenWcFBOjiUUw_yCc8UuXYZLAbvo2iwgBsZtckxED8NcC6ZpytIflQW-gXr2ekeU-l38xNbZ2xFjZLlpk?purpose=inline)

![Collaborative Budget Planning Software | Aleph](https://images.openai.com/static-rsc-4/C9hLlXrdz-ly3rclfVryaAeRDtPzJDxg1-GH_ohPvHnV7RJxJ8ccVSs84TZhcTpxs7CpPp1zetae_gB0F8qF2T5mcUwaJSxZxvNapm-wgYL_i9zDTtWo_SPmmlVdyEtStRAAUAWGZPEyZfIMn4hm6-Yb7zlSF4DKuReji2BwVq0?purpose=inline)

![Creating A Dashboard To Track Financial Milestones](https://images.openai.com/static-rsc-4/oxsv5sz6xIaqS0g-nvRUdrp0rq7zblqBBzIsNsNloYqFHIAXupKonbH8ntje7TTt1hseSYZ0Rh-hrYsp2pn3O-NTHswXjBDozhnILHrZOptZOEGY_xhuhVI4vy64eBZQiOZkO6BnrphxETDtCTVT8JA5ZZouB0b39Wv7L0v2IZo?purpose=inline)

5

## KPI ها

| شاخص         | مثال |
| ------------ | ---- |
| درآمد امروز  | ...  |
| هزینه امروز  | ...  |
| موجودی بانک  | ...  |
| موجودی صندوق | ...  |
| مطالبات      | ...  |
| بدهی‌ها      | ...  |
| فروش ماه     | ...  |
| سود ناخالص   | ...  |

# Workflow و تایید اسناد

![Sales Compensation Automation | Everstage](https://images.openai.com/static-rsc-4/MByJ211Kn9epQ9_pSgyH_tXiL6f3bFG8I9uOwqBqTthxkOSI2Xhx-8p1O_613P-j03tYkARJBccWa-A6BvVMr_ZRYOUIIzxwrK1HrKOsNw-RdjfHv0MbaUwGjIG_bne_HHgNmJPX7NMCenw2WBpW4hk6mDTTRszE8agHUSUA_t0?purpose=inline)

![Business Rule là gì? | AGILEAN Solutions](https://images.openai.com/static-rsc-4/sT_nBOry9w5z0FcgoYdqm_DY7dn-fFNmTzmZ-vIVmTQWt4i16XGtExLYXuMoZ-mXYDm0UrRQbkbOXR4qyAcqbPTCLVcc327dZguqnxTPnfY8xHa_43ZeopJ5LQe6VPiUuTfKkH4Z5lBxqcvh5DXZs74z3eOb5zZ9NiNClgJ6fyU?purpose=inline)

![Workflow d’approbation : transformez la gestion de vos approbations d'achats en levier stratégique](https://images.openai.com/static-rsc-4/-js8mSQ4m9Oz5pG_e13g--VeK8XhuYA7JkVKdjX-29DEE8pfSySOiBp6XtSUCTMov0_v3EQ4aMqMVMqHEaHAtgEE52l2gUuPKzw7eFokv-wqDTpiChyx-tbOPJ34qsyPVCH2lndRm4_YlSpvITnboyAwVNsi5ikw7JLINso5ifQ?purpose=inline)

6

## نمونه Workflow

* درخواست خرید

* مدیر واحد

* مدیر مالی

* ثبت سند

## امکانات Workflow

* Rule Engine

* Approval Matrix

* Delegation

* SLA

* Notification

* Reject Reason

# سیستم کاربران و دسترسی

![Role Based Access (RBAC) | PlexTrac Documentation](https://images.openai.com/static-rsc-4/v-dPf2U2dtpHfB4f-IhdeIPczRu908nQiatyrPILdWXUQ6YroXC8yDEdDt9m1K3fLJ139ZSePCtB5yiM2G9jus5IkuYsreQNuUTtCsrPSj064ghOl_q3_U3imzHf7zQhW5q2pDADNz-ogdV0AOr_3mlRFIJL1hicYtHokacw3Zw?purpose=inline)

![Cannot register iOS device on apple developer - Stack Overflow](https://images.openai.com/static-rsc-4/VXGJczGLiLKzWLi9OEuYj2LbaUj06ahLEE9zzvGDsa0K7acbS1KuM24giKDOWYbcrb9X-xqfmFpdPdDxKXmrcYjQ-BA7AYZBKQiTPNvmzY5tTmDN4F1xNgybU6_sYa_WcuoOaw33mfRwOXdZxYnJcEAHWBswpRbuA1DC6p7vyVM?purpose=inline)

![How to secure your ERPNext with role-based permissions | Shalindra Aporiya posted on the topic | LinkedIn](https://images.openai.com/static-rsc-4/S3aEVQz5V1VjGB-W9P_LVWoujNI0eLyaS3C-zQscUuGiq-1goD0KoZivUzicrF4uvjPe5M2sfEnSoPFI6xcGE95ACxws1NxOg5hrfc0CZWn7WdjSjTzCd7ecTNnlXEicSc5ypHahOB1bcJsM5AGKfC7HtrmXEIfRtm-KwSsaVDA?purpose=inline)

5

## Role Based Access Control

| دسترسی        | مثال        |
| ------------- | ----------- |
| مشاهده        | دفتر کل     |
| ثبت           | فاکتور فروش |
| ویرایش Draft  | بله         |
| حذف Draft     | اختیاری     |
| Post سند      | مدیر مالی   |
| بستن سال مالی | مدیر سیستم  |

# Audit Trail

این بخش حیاتی است.

![Lexora Systems – Legal Document Management for Ghana's Courts & Law Firms](https://images.openai.com/static-rsc-4/syzJHUoOFh_AGO0QdhmIJ-dOG8ypuJRsWYshjfPFfiLxlehZBMmURj0B_k6e5Ivk53P-PnnwxJlOW4EBbUeBZa2UgSn3WJX64AYsbIOeM1zIjaNtWt8Qp-3BwPHKObkQ7m-bEw7MMHENC4r1j2TmTh78MYjhqe7OZyBkDMJkMXk?purpose=inline)

![Audit Trails: Ensuring Data Security and Compliance](https://images.openai.com/static-rsc-4/Kb4nAQ4GUCoTfPdTPS_HwQAB9JzKeDLeSxS4nJNF9766KmDr5ua6IeKNNng0FojzxVfCTjh2d5iGy9gnC4vraq73o9hGgrbNPz6MngPCfEOnfTxv7qLTic0Hf8-aDrITSMP1Cbgz3yP0ZR4l1xyV-nr6pEWB9a47Jrq-62jL8vM?purpose=inline)

![SQL Table Audit - Download - Softpedia](https://images.openai.com/static-rsc-4/yqildHiKCPRQ09Rp44WY0PbezuXNNoAdN2vuEhkFtVMND4emmRHDoIvtMclTNXtaLv0fLbJF3phMmKnUdUVuc8o5wKbZZ42639hahgRUwmMFWsiKYZUZEau_nnSLaEDW5JtQwrVtToqjUjfqqtM3EzFUSw4xxPEDix93ip4Dfls?purpose=inline)

5

## هر تغییر ذخیره شود

| فیلد      | شرح       |
| --------- | --------- |
| User      | چه کسی    |
| Old Value | قبل       |
| New Value | بعد       |
| IP        | از کجا    |
| Device    | مرورگر    |
| Reason    | علت تغییر |

## قوانین امنیتی

* حذف واقعی ممنوع.

* Soft Delete فقط داده‌های غیرمالی.

* Posted Document قابل حذف نیست.

* فایل ضمیمه حذف نمی‌شود.

* دوره بسته Lock می‌شود.

  ![](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

  GitHub+1

# سیستم اسناد و فایل‌ها

![Easily convert invoices into accounting data | Scan2Invoice](https://images.openai.com/static-rsc-4/s-mpnyDaEYRndNz_gZ3Qb_1dOaQWQ0LYhmgnwyoEe2x7Kj0QeKax-BCj__xEduht-56p0NE0OrEKVpmyJxUAgGoKGe5GTqN3NDAlC73WmyGVZdbtZFrH8phftuHteecqfUzMwU8595UYpjXBcKOCnLa-m-WKodsXC2aKuBrQkYs?purpose=inline)

![Our Software Stack](https://images.openai.com/static-rsc-4/bZBolrqxSblp492XSwSuJCRvdOpclyTYgrDxe3Gc8gxEQGzTxA8RM3Wvy4cA1ned7dOifgVz0fnrkEVdk26pnv8ipPe8DaFnhI7qasjV4IqGWbMV0BKhjkuTl1j_YrYytK6EoBaOEGKa4MXz7bC94OVaQ1f50G7dwArr2p-nwv4?purpose=inline)

![How to use neat receipt scanner without plan - jolostellar](https://images.openai.com/static-rsc-4/Lk6eEMaU5RDeNlx3fwB6lbtw1VVBtvPKlGtT2gzv-mMq2H_Wma9PRwQto00Psjef5YLGbnn2C-aKLdcI4Nn4Oh2TZ6DdxhWOSUZlez0GSjANBhVnELJMaURXo7oBNQcVaJS2xSCz6lwujdhkYNJgDEC9LnlydW5oEiFerCxyxig?purpose=inline)

5

## امکانات

* ضمیمه PDF.

* تصویر فاکتور.

* OCR.

* دسته‌بندی اسناد.

* نسخه‌بندی فایل.

* ارتباط فایل با سند.

# Notification Engine

![PHP Framework for ACL, Notifications incl. UI - Software Recommendations Stack Exchange](https://images.openai.com/static-rsc-4/2X2h4R6YQ0vJMj-Uq8FxjLfKRbP6U8il-TJ_h9dVitGYrNUb-KKg1pfZa6uhj1ser3aWjWf09cZgdSGedWluFxfSYRZ3Y2jqVDT06_laCl6voXABn_esqpoEzVkdCPbAYQ4zMlIiEZRpI57Z3m8t2YlrTZ1TVNULVCuF_numePQ?purpose=inline)

![The best solution for sending product & customer emails](https://images.openai.com/static-rsc-4/VS11e1kQs8DIqtKxhr-JYZo5rHkhTp_a0ozX1n-CHWjNJPiF8OvCATK-Oh8WVDKYdOjdDjudhwnTRA_zsCUoMye13pdGWP34lRIgy3_Eg8owKyYbBWvY8kriJYm9qXEspM3kiWn4CTCZbMqgM60lxIt_XCy6F5bwrk72WxoLbZ4?purpose=inline)

![5 High-Ticket AI Automations Small Businesses Are Desperate For Right Now | by NAJEEB | The Hackers Magazine | Mar, 2026 | Medium](https://images.openai.com/static-rsc-4/VC3tNOou60d7oivK6bL6wgcT21QJ0RcmCfj7Ayq9_v2VwR6DEB1hFo3psL7PA98w6HyXmRaO4GraTzlkpHH5XQKJqtslKuH3q3HAen46sCJelz4udc-5_5wiBeViuQy-7hq6_qCjMLI2QDcBUd5Ev37HtMXKybTYxti-Np_LioA?purpose=inline)

5

* پیامک.

* ایمیل.

* Push.

* Webhook.

* Reminder چک.

* Reminder بدهی.

* Reminder مالیات.

# Automation Engine

![Top 10 Best Digital Process Automation Software To Consider in 2026](https://images.openai.com/static-rsc-4/Qhh2G3eI7Ii0SWDzxluE-YClFn5K_2ffjS0BxAyQ59YEkiVKD_mw5Q-aeyw8IlH8wiTL0pE9t8wF2nu8Wfnt25XUIYS-Ut1nkNPMhjlDxlomPsUfggSbteo0mJjMGqrICdXVebkzO9qEfdjuvCEs8k66pjx6l9w6BE35-hWj-NA?purpose=inline)

![Marketing Automation Services | Addax Solutions](https://images.openai.com/static-rsc-4/T-UWfSC7P_AK6K0V0OOsIN-hV9NjmG-S3q-SpfuP6eLcGv-ztQdAt_K3CoT52alb3Ze8O-DGlxRd9UmH0mcSQ7ezWpSWukpafZ6E4M9pfIu2CUbe5Y4uHdVPZYJfvRbbYlFGhX9o3sMnPH2CT2WUFRbzy0rwhsoS-E7KKwscLFQ?purpose=inline)

![FlowApp Studio | Features](https://images.openai.com/static-rsc-4/sWQGtUUyoaPX9ZCNH0fKUWLIymsXj1A_FQD4ySO_Xu56v9hPt8ID6HYSokBGv7s7hWBvVC2YSlTjXdbo15R6za1eBdgGMovmeJraXnMRj3CC11JvvgtfInfpzBYWLjVyDI5uDYR-Y8MWzkwhdUHflrpxLmYiCa1GHth8LvM3BJo?purpose=inline)

5

## Rule Engine

مثلاً:

> اگر مبلغ خرید بالاتر از ۱ میلیارد بود → تایید مدیرعامل.

یا:

> اگر موجودی کمتر از حداقل شد → درخواست خرید.

# API و Integration

![GraphQL vs. REST APIs: A Comprehensive Comparison for Modern Development](https://images.openai.com/static-rsc-4/tQ6NxmlnFvDeVmKvt4PGx6aVTTH3r4F2ZiGO6x5YuB3I5yb0ANERa3qOuEKzLumk2J7E5tBrPUdIoDjijinjRfhvIhy4dmO3-UTaJdWCzZLWSMHdZH7fDaPgFg2fpGmcEeQYFfs0nneqBVZOChJUXeMWUDfS9w-h-EPojsvpX_g?purpose=inline)

![Webhooks for QuickBooks Online API - Intuit Developer Community Blog](https://images.openai.com/static-rsc-4/uGcGpsGqyyU8YKpQ1bz1u6vtlvLWP-kNmjU5HCrhwxE6W8s4uLO1TxX9BiP0i8Tbla9BjdS5A9Uw572GkzrLy0OlGBL7pQfZjqv0G6ujRxQ-dam74TsY56REv98DIMzU_YzdoOWNFz6Q_tAClp0_avoPuKr33I_ivMi3NtdRyDM?purpose=inline)

![How to setup webhook request from Google Form to Integromat | by Ness Li | Medium](https://images.openai.com/static-rsc-4/fL2DK_IgznyfFGQnUThZ_2qVxVGTErA1aPpJGygbo3E2yEJKz5A-QP825vGksnkPN-jlZfYtTfqglBkUhjQb56yhKtDDDjNIyHqBXoqjGlwh0RmwbPVRTdKyjhW6-qWpbRkT2TQ1w78A_FHF43B4t4nZekJhcasHIINm5x1vlmM?purpose=inline)

5

## API ها

| دسته           | امکانات   |
| -------------- | --------- |
| Accounting API | ثبت سند   |
| Sales API      | ثبت سفارش |
| Inventory API  | موجودی    |
| Party API      | مشتری     |
| Webhook        | رویدادها  |

## اتصال به

* فروشگاه اینترنتی.

* POS.

* CRM.

* بانک.

* سامانه مودیان.

* پیامک.

* اکسل Import/Export.

# طراحی Database (Best Practice)

## مهم‌ترین جدول‌های سیستم

![mysql - Double entry accounting: data types for efficiency? - Stack Overflow](https://images.openai.com/static-rsc-4/31U72m106u-6_HOWl_yYMr4_A180AxSiXSRc-FR1xQrLfA7CtrJANWEnwxQ-Vp7SfZkzcdANYJbo7fbhNX8q8JU2Hbqkn16VHzAFZyS0qURoXpG8oO1ZcyhBftZr76NvM0UbScAp32xW4YGv4Ueei-3ZorDnRU_6xK5x6bcEwA4?purpose=inline)

![Database for Financial Accounting Application II: Infrastructure - CodeProject](https://images.openai.com/static-rsc-4/LVMpv66VUl9QTi6uhfVMWs_FjMXzkCQ3AddghgALwe4Glmoxl1MmshKxX4KQIWIT0xrxbqCqlgFRz_GECy6yWzJVZmv5sSOq_QBE8Yyx_l_KbRpVRrJOnhLUbDz9mdlGeHwpF6ceoKTzhN9GvItQVs15XFXpxdbFxj48Zaq1mqU?purpose=inline)

![Entity Relationship Diagram | Download Scientific Diagram](https://images.openai.com/static-rsc-4/fUruf-Tk0WkmojQzc4izkmU5amO-6a5BI3TLxyf_E-VqFF8lrjKEooxj7KyKyRPaLRc1Lh4PFFkJHgfgfJ4GR1tp0P5wMSZoeYvo-r4GkM57JeJF1oX8f9jjcKjCYeBBlOg-xi7-kxZ9js4r1JV7iE8vw0rk6Tt1anfSJZFQySk?purpose=inline)

6

| Table                | وظیفه                      |
| -------------------- | -------------------------- |
| companies            | شرکت‌ها                    |
| fiscal_years         | سال مالی                   |
| chart_of_accounts    | درخت حساب                  |
| journal_transactions | سند مادر                   |
| journal_entries      | آرتیکل‌های بدهکار/بستانکار |
| parties              | اشخاص                      |
| products             | کالا                       |
| warehouses           | انبار                      |
| inventory_movements  | کاردکس                     |
| sales_invoices       | فروش                       |
| purchase_invoices    | خرید                       |
| payments             | دریافت و پرداخت            |
| banks                | حساب بانکی                 |
| cheques              | چک                         |
| cost_centers         | مرکز هزینه                 |
| projects             | پروژه                      |
| audit_logs           | Audit                      |

# اصول طراحی دیتابیس (حتماً رعایت شوند)

| Best Practice                    | چرا؟          |
| -------------------------------- | ------------- |
| Append Only Ledger               | امنیت مالی    |
| UUID Primary Key                 | توزیع‌شده     |
| company_id همه جداول             | Multi Tenant  |
| fiscal_year_id                   | سال مالی      |
| created_at / updated_at          | Audit         |
| posted_at                        | زمان ثبت قطعی |
| deleted_at فقط غیرمالی           | Soft Delete   |
| Materialized View گزارش‌ها       | سرعت بالا     |
| Partition Journal by Fiscal Year | مقیاس‌پذیری   |

![](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+2

# Performance (برای میلیون‌ها سند)

| روش               | نتیجه                          |
| ----------------- | ------------------------------ |
| Partitioning      | سال مالی                       |
| Composite Index   | company_id + account_id + date |
| Materialized View | ترازها                         |
| Caching           | Redis                          |
| Event Queue       | Kafka/RabbitMQ                 |
| Snapshot Balance  | سرعت گزارش                     |

![](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+2

# امنیت و پایداری

## ویژگی‌های ضروری

| ویژگی              | توضیح           |
| ------------------ | --------------- |
| ACID Transaction   | ثبت مالی        |
| Optimistic Lock    | ویرایش Draft    |
| Row Level Security | شرکت‌ها         |
| Encryption         | اطلاعات حساس    |
| Backup PITR        | بازیابی لحظه‌ای |
| Immutable Audit    | غیرقابل تغییر   |

# قابلیت‌های خاص بازار ایران (باید حتماً وجود داشته باشد)

| قابلیت ایرانی      | اهمیت           |
| ------------------ | --------------- |
| تقویم شمسی         | همه اسناد       |
| سال مالی شمسی      | 1405، 1406...   |
| شماره اقتصادی      | مودیان          |
| شناسه ملی          | اشخاص حقوقی     |
| کد ملی             | اشخاص حقیقی     |
| سامانه مودیان      | ارسال صورتحساب  |
| مالیات ارزش افزوده | اظهارنامه       |
| چک صیادی           | ثبت شناسه صیادی |
| شماره شبا          | بانک            |
| شناسه کالا و خدمت  | مودیان          |

# نسخه Enterprise (فراتر از سپیدار)

اگر بخواهی از سپیدار هم جلو بزنی، این امکانات را اضافه کن:

| ماژول پیشرفته      | شرح                        |
| ------------------ | -------------------------- |
| Workflow Builder   | گردش کار Drag & Drop       |
| Report Builder     | گزارش‌ساز بدون کدنویسی     |
| Formula Engine     | فرمول‌های سفارشی           |
| Custom Fields      | فیلد دلخواه روی هر موجودیت |
| Tagging System     | برچسب اسناد                |
| Automation Rules   | IF/THEN مالی               |
| AI OCR             | تشخیص فاکتور               |
| REST + GraphQL API | اتصال سایر سیستم‌ها        |
| Plugin System      | ماژول‌های نصب‌شدنی         |

# معماری پیشنهادی من برای این پروژه (Production Grade)

# Accounting OS Architecture (نسخه پیشنهادی)

| لایه          | فناوری پیشنهادی                                  |
| ------------- | ------------------------------------------------ |
| Database      | PostgreSQL 16+                                   |
| Ledger Engine | Stored Procedures + Constraints                  |
| API           | NestJS / Fastify                                 |
| ORM           | Drizzle ORM (یا Prisma فقط برای بخش‌های غیرمالی) |
| Cache         | Redis                                            |
| Queue         | RabbitMQ یا Kafka                                |
| Search        | Postgres Full Text + Trigram                     |
| Storage       | S3 Compatible (MinIO)                            |
| Audit         | Append Only Events                               |
| Reporting     | Materialized Views + OLAP Views                  |

این معماری کاملاً با اصول طراحی سیستم‌های مالی مدرن (Double Entry، Append-Only Ledger، Multi-Tenant، Period Locking و Audit Trail) هم‌راستا است.

![](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+2

# نقشه راه پیاده‌سازی (بهترین ترتیب توسعه)

| فاز     | ماژول‌ها                                                              |
| ------- | --------------------------------------------------------------------- |
| Phase 1 | Ledger Engine، Chart of Accounts، Fiscal Year، Journal، Trial Balance |
| Phase 2 | Party، Cash، Bank، Cheque، AR/AP                                      |
| Phase 3 | Products، Inventory، Purchase، Sales، Pricing                         |
| Phase 4 | VAT، Moadian، Payroll، Fixed Assets                                   |
| Phase 5 | Budget، Projects، Cost Centers، BI Dashboard                          |
| Phase 6 | Workflow Engine، Automation، API، Plugin SDK، Mobile                  |

# نتیجه: این سیستم چه سطحی خواهد داشت؟

| نرم‌افزار مرجع   | پوشش قابلیت‌ها               |
| ---------------- | ---------------------------- |
| هلو              | ✅ کامل + فراتر               |
| سپیدار           | ✅ کامل + Workflow و API بهتر |
| پارمیس           | ✅ کامل                       |
| تدبیر            | ✅ کامل                       |
| Odoo Accounting  | ✅ تقریباً هم‌سطح             |
| SAP Business One | حدود ۸۵–۹۰٪ قابلیت‌های مالی  |

## پیشنهاد ویژه برای ادامه این پروژه

به نظر من این پروژه باید به صورت یک مستند طراحی ۲۰۰ تا ۳۰۰ صفحه‌ای نوشته شود، نه صرفاً چند جدول دیتابیس. من می‌توانم آن را در قالب یک Accounting System Blueprint طراحی کنم که شامل موارد زیر باشد:

1. طراحی کامل دیتابیس PostgreSQL (حدود ۱۵۰ تا ۲۰۰ جدول) با تمام Foreign Keyها، Indexها، Constraintها، Triggerها و Partitioning.

2. ER Diagram حرفه‌ای در سطح Enterprise (مانند SAP/Oracle Financials) با نمایش ارتباط تمام موجودیت‌ها.

3. Accounting Engine Specification شامل الگوریتم Posting، Reverse، Closing Year، Trial Balance، Multi-Currency، Cost Center و Audit Trail.

4. مستند قوانین حسابداری ایران (مودیان، ارزش افزوده، چک صیادی، سال مالی شمسی، شناسه کالا و خدمت و ...).

5. API Design (REST + Event Bus + Webhook) و معماری سرویس‌ها.

6. Best Practices Performance & Security برای دیتابیسی که بتواند ده‌ها میلیون سند حسابداری را بدون افت سرعت مدیریت کند.

این می‌تواند به یک مرجع کامل برای ساخت یک نرم‌افزار حسابداری در سطح سپیدار یا حتی یک ERP ایرانی تبدیل شود.
