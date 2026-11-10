این پروژه‌ای که تو توصیف کردی، اگر درست طراحی شود، در واقع دیگر «جایگزین WooCommerce» نیست؛ بلکه یک Commerce Platform / Commerce Engine شبیه Shopify، Saleor، Medusa، Magento Commerce یا CommerceTools خواهد بود، ولی با نیازهای ایران (تومان، مالیات ایران، چند انبار، پیامک، درگاه‌های ایرانی، تقویم شمسی، فاکتور رسمی، قوانین تجارت ایران و B2B).

پیشنهاد من این است که از ابتدا سیستم را Domain-Driven + Modular Monolith طراحی کنی (نه Microservice در نسخه اول). یعنی یک دیتابیس PostgreSQL واحد با ماژول‌های مستقل و Event Bus داخلی. این معماری هم سبک است، هم سریع، هم بعداً قابلیت تبدیل به Microservice را دارد.

# Blueprint کامل سیستم E-Commerce ایران (Enterprise Grade)

هدف معماری

# Enterprise Commerce Engine مخصوص ایران

PostgreSQL

Multi Vendor Ready

Multi Warehouse

Headless API First

این پاسخ را به عنوان مستر داکیومنت طراحی دیتابیس و ماژول‌ها در نظر بگیر. اگر کامل پیاده شود، تقریباً تمام قابلیت‌های WooCommerce + Shopify + Digikala + B2B ERP Lite را پوشش می‌دهد.

# نقشه کل اکوسیستم

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20540%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%22240%22%20y%3D%2220%22%20width%3D%22280%22%20height%3D%2255%22%20rx%3D%2212%22%20fill%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2254%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%20font-size%3D%2218%22%3ECommerce%20Core%20Engine%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22110%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22140%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3ECatalog%3C%2Ftext%3E%3Crect%20x%3D%22210%22%20y%3D%22110%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22290%22%20y%3D%22140%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EInventory%3C%2Ftext%3E%3Crect%20x%3D%22400%22%20y%3D%22110%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22480%22%20y%3D%22140%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EOrders%3C%2Ftext%3E%3Crect%20x%3D%22590%22%20y%3D%22110%22%20width%3D%22150%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22665%22%20y%3D%22140%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EPayments%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22210%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22240%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3ECustomers%3C%2Ftext%3E%3Crect%20x%3D%22210%22%20y%3D%22210%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22290%22%20y%3D%22240%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EPricing%3C%2Ftext%3E%3Crect%20x%3D%22400%22%20y%3D%22210%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22480%22%20y%3D%22240%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EShipping%3C%2Ftext%3E%3Crect%20x%3D%22590%22%20y%3D%22210%22%20width%3D%22150%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22665%22%20y%3D%22240%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EMarketing%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22310%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3ESubscriptions%3C%2Ftext%3E%3Crect%20x%3D%22210%22%20y%3D%22310%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22290%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EBookings%3C%2Ftext%3E%3Crect%20x%3D%22400%22%20y%3D%22310%22%20width%3D%22160%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22480%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EMembership%3C%2Ftext%3E%3Crect%20x%3D%22590%22%20y%3D%22310%22%20width%3D%22150%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22665%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EAnalytics%3C%2Ftext%3E%3Crect%20x%3D%22150%22%20y%3D%22430%22%20width%3D%22180%22%20height%3D%2260%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22240%22%20y%3D%22460%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3ENotifications%3C%2Ftext%3E%3Crect%20x%3D%22430%22%20y%3D%22430%22%20width%3D%22180%22%20height%3D%2260%22%20rx%3D%2210%22%20fill%3D%22%23E8F5E9%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22520%22%20y%3D%22460%22%20text-anchor%3D%22middle%22%20font-size%3D%2214%22%3EIntegrations%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22100%22%20y2%3D%22110%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22290%22%20y2%3D%22110%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22480%22%20y2%3D%22110%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22665%22%20y2%3D%22110%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22100%22%20y2%3D%22210%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22290%22%20y2%3D%22210%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22480%22%20y2%3D%22210%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22665%22%20y2%3D%22210%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22100%22%20y2%3D%22310%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22290%22%20y2%3D%22310%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22480%22%20y2%3D%22310%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2275%22%20x2%3D%22665%22%20y2%3D%22310%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22290%22%20y1%3D%22370%22%20x2%3D%22240%22%20y2%3D%22430%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22470%22%20y1%3D%22370%22%20x2%3D%22520%22%20y2%3D%22430%22%20stroke%3D%22%2316a34a%22%2F%3E%3C%2Fsvg%3E)

# سطح‌بندی ماژول‌ها

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Domain</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">ماژول‌ها</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Catalog</td><td data-d-component="table-cell" data-d-valign="start">محصول، برند، دسته‌بندی، ویژگی، متغیرها، Bundle، Composite، Add-on</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Commerce</td><td data-d-component="table-cell" data-d-valign="start">سبد خرید، سفارش، پرداخت، مالیات، تخفیف، کوپن</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Inventory</td><td data-d-component="table-cell" data-d-valign="start">چند انبار، رزرو موجودی، سریال، بچ، تامین‌کننده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">CRM</td><td data-d-component="table-cell" data-d-valign="start">مشتری، آدرس، کیف پول، امتیاز، عضویت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Fulfillment</td><td data-d-component="table-cell" data-d-valign="start">ارسال، رهگیری، مرجوعی، بسته‌بندی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Marketing</td><td data-d-component="table-cell" data-d-valign="start">تخفیف پویا، گیفت کارت، Wishlist، کمپین</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">B2B</td><td data-d-component="table-cell" data-d-valign="start">قیمت همکاری، نقش سازمانی، پیش‌فاکتور، اعتبار مشتری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Iran Layer</td><td data-d-component="table-cell" data-d-valign="start">تومان، شمسی، درگاه ایرانی، پیامک، مالیات ارزش افزوده، کد ملی، شناسه ملی</td></tr></tbody></table>

# فصل ۱ — Catalog Module (قلب سیستم محصولات)

این مهم‌ترین ماژول است.

## ساختار دیتابیس Catalog

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20540%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%22280%22%20y%3D%2220%22%20width%3D%22200%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2247%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22120%22%20width%3D%22170%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22105%22%20y%3D%22147%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22220%22%20y%3D%22120%22%20width%3D%22150%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22295%22%20y%3D%22147%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22420%22%20y%3D%22120%22%20width%3D%22150%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22495%22%20y%3D%22147%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22590%22%20y%3D%22120%22%20width%3D%22150%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22665%22%20y%3D%22147%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22240%22%20width%3D%22170%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22105%22%20y%3D%22267%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22220%22%20y%3D%22240%22%20width%3D%22170%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22305%22%20y%3D%22267%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22430%22%20y%3D%22240%22%20width%3D%22170%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22515%22%20y%3D%22267%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Crect%20x%3D%22220%22%20y%3D%22360%22%20width%3D%22170%22%20height%3D%2244%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22305%22%20y%3D%22387%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3E44%3C%2Ftext%3E%3Cline%20x1%3D%22280%22%20y1%3D%2264%22%20x2%3D%22100%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22320%22%20y1%3D%2264%22%20x2%3D%22295%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22380%22%20y1%3D%2264%22%20x2%3D%22495%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22440%22%20y1%3D%2264%22%20x2%3D%22665%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22100%22%20y1%3D%22164%22%20x2%3D%22100%22%20y2%3D%22240%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22295%22%20y1%3D%22164%22%20x2%3D%22305%22%20y2%3D%22240%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22305%22%20y1%3D%22284%22%20x2%3D%22305%22%20y2%3D%22360%22%20stroke%3D%22%2316a34a%22%2F%3E%3Cline%20x1%3D%22455%22%20y1%3D%22164%22%20x2%3D%22505%22%20y2%3D%22240%22%20stroke%3D%22%2316a34a%22%2F%3E%3C%2Fsvg%3E)

## جدول Products

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Field</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">توضیح</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">id (UUID)</code></p></td><td data-d-component="table-cell" data-d-valign="start">شناسه اصلی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">slug</code></p></td><td data-d-component="table-cell" data-d-valign="start">لینک محصول</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">sku_prefix</code></p></td><td data-d-component="table-cell" data-d-valign="start">پیشوند SKU</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">title_fa / title_en</code></p></td><td data-d-component="table-cell" data-d-valign="start">چندزبانه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">short_description</code></p></td><td data-d-component="table-cell" data-d-valign="start">خلاصه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">description</code></p></td><td data-d-component="table-cell" data-d-valign="start">Rich Text / HTML / Markdown</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">brand_id</code></p></td><td data-d-component="table-cell" data-d-valign="start">برند</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">status</code></p></td><td data-d-component="table-cell" data-d-valign="start">Draft / Published / Archived / Hidden</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">visibility</code></p></td><td data-d-component="table-cell" data-d-valign="start">Public / Private / Members / B2B</td></tr><tr data-d-component="table-row"><td data-d-break-long-token="" data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">seo_title/meta_description</code></p></td><td data-d-component="table-cell" data-d-valign="start">SEO</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">created_by</code></p></td><td data-d-component="table-cell" data-d-valign="start">ادمین</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">published_at</code></p></td><td data-d-component="table-cell" data-d-valign="start">زمان انتشار</td></tr></tbody></table>

## Product Types (باید Enum نباشد)

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Type</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">کاربرد</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Simple</td><td data-d-component="table-cell" data-d-valign="start">محصول ساده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Variable</td><td data-d-component="table-cell" data-d-valign="start">سایز، رنگ، حافظه...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Bundle</td><td data-d-component="table-cell" data-d-valign="start">پکیج</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Composite</td><td data-d-component="table-cell" data-d-valign="start">اسمبل از چند بخش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Digital</td><td data-d-component="table-cell" data-d-valign="start">فایل دانلودی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Service</td><td data-d-component="table-cell" data-d-valign="start">خدمت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Booking</td><td data-d-component="table-cell" data-d-valign="start">رزرو</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Subscription</td><td data-d-component="table-cell" data-d-valign="start">اشتراک</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">GiftCard</td><td data-d-component="table-cell" data-d-valign="start">کارت هدیه</td></tr></tbody></table>

## Product Variants

مثل دیجی‌کالا.

![Color Swatches & Size Selectors for WooCommerce Variations](https://images.openai.com/static-rsc-4/m6Pt2sp4XhFu-I_fnzqz-Hm64ubP2T-OZfsvQiAgvsRHxI9AfTQ9_E7_juPSOZHpihmzs-ZYHEjHjYVsU-PV9zl6fsWj8gJ3DIHzg9fvJielqI4tYn79r_x55f56nDv2uwv587akQCaxiYRcxwX0DzUY5-X15Y71LE-ocHWIa1w?purpose=inline)

![Matrix product: Creating product variants – Xentral help center](https://images.openai.com/static-rsc-4/PZMwk7EvgzsFg_W83p2A7Deel1yT2W_A5VGmCm-jGnZTyphl1EaH6H7e-IGhkGcJV_K1lLFI8948R_HiIPlUju-58FuDa2kcw0AVQCyBpkzEKQxEsiyEVByj9TmwM6jIKks-4e0Yk8N-Km5OOzmMqlQvj9cPxVQ-VzOV5Y1zSU8?purpose=inline)

![How to Create Configurable Product in Bagisto? - Bagisto](https://images.openai.com/static-rsc-4/HnL-4oRqdL3R69pz6ZwI0cNa_v1-xVt93Ojp5O8dYbgDIx5Zg2YlLhPORUHPgMCHtAZNTI09L6mjtOETxFw3KJV9h6VFSj_4QoKLeRkLUjOHuxX-6eMWM-FWQkVvj74P8dW4vXeiO_KioE5H2SVbfdGNzRNmVmtnXxBe6JIkQoc?purpose=inline)

5

هر Variant مستقل است.

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Field</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">جزئیات</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">variant_id</td><td data-d-component="table-cell" data-d-valign="start">UUID</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">sku</td><td data-d-component="table-cell" data-d-valign="start">SKU یکتا</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">barcode</td><td data-d-component="table-cell" data-d-valign="start">GTIN / Barcode</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">price</td><td data-d-component="table-cell" data-d-valign="start">قیمت پایه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">sale_price</td><td data-d-component="table-cell" data-d-valign="start">قیمت ویژه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">cost_price</td><td data-d-component="table-cell" data-d-valign="start">قیمت خرید</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">weight</td><td data-d-component="table-cell" data-d-valign="start">وزن</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">dimensions</td><td data-d-component="table-cell" data-d-valign="start">ابعاد</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">media_id</td><td data-d-component="table-cell" data-d-valign="start">تصویر اختصاصی</td></tr></tbody></table>

## Attribute Engine (Best Practice)

هیچ ستون color یا size نداریم.

سه جدول:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Table</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">کاربرد</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">attributes</td><td data-d-component="table-cell" data-d-valign="start">رنگ، سایز، حافظه...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">attribute_values</td><td data-d-component="table-cell" data-d-valign="start">قرمز، آبی، XL، 256GB</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">variant_attribute_values</td><td data-d-component="table-cell" data-d-valign="start">اتصال Variant ↔ Attribute</td></tr></tbody></table>

مثال:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Variant</td><td data-d-component="table-cell" data-d-valign="start">Attributes</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">SKU-RED-XL</td><td data-d-component="table-cell" data-d-valign="start">Red + XL</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">SKU-BLUE-L</td><td data-d-component="table-cell" data-d-valign="start">Blue + L</td></tr></tbody></table>

پشتیبانی از:

* Swatch رنگ

* تصویر رنگ

* دکمه

* Dropdown

* Text

* Icon

## Categories

![Categories | Shopware Documentation](https://images.openai.com/static-rsc-4/RbfQzXCsE-GnNIzPinJV6ddSp-AL3MULcatGNmze9loDvPoOed_ekXa_5g2d7tMobvMIULGTVqNcrDBUcYyzlHHKk-HxEkFs85rbCAXrk9dnPFZ4ycP1Pk5Oy4CONj10j9jQKReFkbUaa4YU1p_MH63H1dnwuOT80czxF2qBLZY?purpose=inline)

![Free Shopping Cart Software | ecommerce software | online store builder](https://images.openai.com/static-rsc-4/FwKxLrauL9MRtBOHfGNRwPTZIm71AGM3XBiirbFkGYX6PtDrfToKPjYxGa7hXRKW_gGYjwjGZW-xfhP6y1R2iomuh04nxscpkL3czW6o6443M1AHBEgxJK0yBt1NvOa_33OgGyaP8ygevNSMET2WOv8qmEfcMSzFPjrsrcc5h44?purpose=inline)

![Hierarchies and Inheritance | AtroCore Help Center](https://images.openai.com/static-rsc-4/mj5GNLlTKRVMfowOjtv-PBfQICFr_JJ-EOc2SbdDGUKUTFQR6s6c_iUvjiCfKi2AOf5f05odjB1ka91ZwF0KzzFcP86ANVp7iguWpE4BJ0fR3JtxDUwFSCqdSJRoHFXTrU-HeOpqdINtj2cfVwMZzPGD1y4dEYJdxdEnTWR9Szo?purpose=inline)

6

ویژگی‌ها:

* نام فارسی و انگلیسی

* Tree (Nested Set یا Materialized Path)

* SEO

* تصویر

* ترتیب نمایش

* دسته‌بندی نامحدود

## Brands

ویژگی‌ها:

* لوگو

* توضیح

* وبسایت

* کشور

* Slug

* SEO

## Media Library

![20 Top Digital Asset Management Software For Archives 2026](https://images.openai.com/static-rsc-4/tmHiIkhuzufvscfa2-Os5sMDoNDNOPSzhkn_-t9Q070_OIYqf_PKZEMm30DgUJwoNJ5Dq7E8ZLvAEwq-8-HeLxu9SMyrl7yNQi9FC31S9p4WfjzLAa2sQu6-g3LhjVqy8Wmt_GGNEexL-Na_gCn5ceEp9lL6WXxHCn1xl_BGF2w?purpose=inline)

![Adicionar uma imagem a um produto](https://images.openai.com/static-rsc-4/FOpduB-s8LI5Uou-vdQx-tL4L4x-xWfvWRs6zN0qtvTY6RJyKreinOcueigeRLOEN1K9kxN0DRezQ62QSYpd2ExkpTG1RJLjU9iloMEtbEnG4YHui3rsjRoK0_gxO_aR-LU3o1fD5OG8upOyZi3H3Lar1dzcyzwdGjPy1D9l8I0?purpose=inline)

![WooCommerce Image Import - Assign WooCommerce Images Easily](https://images.openai.com/static-rsc-4/52seI_Uk1M4l1C873HGY45uwu1taiUk3txyv0nKQMjqwJmRhSBUZbyAivkXuAONbvHqjf7GwUowlOZg251cozHXgTq0-Yr0LAh7YeaJ60C_iUJ8Xdh7eW_0staKKqxiliM1lvs1sv4VwYUPQHPGkuoZPk5V89BQ-veNhpj0k_h8?purpose=inline)

6

پشتیبانی:

* تصویر

* ویدیو

* PDF

* فایل دانلودی

* مدل سه‌بعدی

* فایل‌های Add-on

Features:

* Alt Text

* Thumbnail

* Crop

* WebP

* AVIF

* CDN Ready

# فصل ۲ — Inventory Engine (سیستم انبار حرفه‌ای)

این بخش از ووکامرس بسیار قوی‌تر خواهد بود.

![WaailLab | Software Development Company Pakistan](https://images.openai.com/static-rsc-4/Y8WQy1roxknqDZqk35JojNnZoBFrJCkE24rjFfFI2uoq61zy0B3aD3lKqL9l4vOXvfD-CiTT5hrDxcfBkGPiOTZQ8eDBcPFFo8GjKGMpoi57moNAF8QPKDGDVpiSkE68olzsCx6CTAqJNXtiZpsDOyZHVcA6u7fHNXFDRmP4uYU?purpose=inline)

![eTowerOne Integrated logistics Warehouse Management System for Ecommerce - WallTech](https://images.openai.com/static-rsc-4/Z8ZOcw513Z15vF4IQ-0rshKTyJDf0wfSvWVHMvlCDmy_4WaQaYe7FnBtMuEMaGCw1nhLFWFyflc68jUhvdvhkC9Od2pFEiUgvOyb48H_zUP1va0P2YfjVBdqTEpcLQEGJzskhQSFbwFkKOyJQWq5ApXb7YWjITpincZGAsT6cKo?purpose=inline)

![](https://images.openai.com/static-rsc-4/6ngVxRj4M2z4VKNG8Yx857AB7VAgKBILPOU2EPPPxASUJ8PbFX9Dr4FomQmR9RBdyr3GGSVMSwIMjOT-yqu8LTI0d-_tJj2lDDgKjyRMF9i89qvNY6EvpMeDmh4ErWLZpVPr-6BsUFvX_h9nDUgfi1fNuB5mYOUfgFnTn6a3CMs?purpose=inline)

5

## Multi Warehouse

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Table</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">وظیفه</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">warehouses</td><td data-d-component="table-cell" data-d-valign="start">انبارها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">warehouse_inventory</td><td data-d-component="table-cell" data-d-valign="start">موجودی هر Variant</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">inventory_transactions</td><td data-d-component="table-cell" data-d-valign="start">Ledger موجودی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">stock_reservations</td><td data-d-component="table-cell" data-d-valign="start">رزرو هنگام Checkout</td></tr></tbody></table>

## Inventory Ledger

هیچ وقت quantity را مستقیم کم نکن.

هر تغییر Transaction است.

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Type</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">مثال</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Purchase</td><td data-d-component="table-cell" data-d-valign="start">ورود کالا</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Sale</td><td data-d-component="table-cell" data-d-valign="start">فروش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Return</td><td data-d-component="table-cell" data-d-valign="start">مرجوعی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Adjustment</td><td data-d-component="table-cell" data-d-valign="start">اصلاح دستی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Transfer</td><td data-d-component="table-cell" data-d-valign="start">انتقال بین انبارها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Reservation</td><td data-d-component="table-cell" data-d-valign="start">رزرو</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Release</td><td data-d-component="table-cell" data-d-valign="start">آزادسازی رزرو</td></tr></tbody></table>

## Stock Reservation

برای جلوگیری از Overselling.

Lifecycle:

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20120%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%2220%22%20y%3D%2230%22%20width%3D%22100%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%2270%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3ECart%3C%2Ftext%3E%3Cline%20x1%3D%22120%22%20y1%3D%2250%22%20x2%3D%22170%22%20y2%3D%2250%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22170%2C50%20162%2C44%20162%2C56%22%20fill%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22170%22%20y%3D%2230%22%20width%3D%22100%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22220%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EReserved%3C%2Ftext%3E%3Cline%20x1%3D%22270%22%20y1%3D%2250%22%20x2%3D%22320%22%20y2%3D%2250%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22320%2C50%20312%2C44%20312%2C56%22%20fill%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22340%22%20y%3D%2230%22%20width%3D%22100%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22390%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EPaid%3C%2Ftext%3E%3Cline%20x1%3D%22440%22%20y1%3D%2250%22%20x2%3D%22490%22%20y2%3D%2250%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22490%2C50%20482%2C44%20482%2C56%22%20fill%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22510%22%20y%3D%2230%22%20width%3D%22100%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22560%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EPacked%3C%2Ftext%3E%3Cline%20x1%3D%22610%22%20y1%3D%2250%22%20x2%3D%22660%22%20y2%3D%2250%22%20stroke%3D%22%2316a34a%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22660%2C50%20652%2C44%20652%2C56%22%20fill%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22650%22%20y%3D%2230%22%20width%3D%22100%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22700%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EShipped%3C%2Ftext%3E%3C%2Fsvg%3E)

## Batch / Serial Number

برای کالاهای خاص.

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Feature</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">مثال</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Batch</td><td data-d-component="table-cell" data-d-valign="start">دارو، مواد غذایی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Expiration Date</td><td data-d-component="table-cell" data-d-valign="start">تاریخ انقضا</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Serial Number</td><td data-d-component="table-cell" data-d-valign="start">لپتاپ، موبایل</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">IMEI</td><td data-d-component="table-cell" data-d-valign="start">موبایل</td></tr></tbody></table>

# فصل ۳ — Orders Engine (هسته سفارشات)

![E-commerce Order Management Dashboard Design by Nabil ✪ on Dribbble](https://images.openai.com/static-rsc-4/aWVVz4WRHeeQL2pCu5yDj1UthZG19Lh7wZbF8EXastxx_cT2sntzjhWRQPK7vZ439aIRCoeQkC7ZYT4tJaYiJDhMOrKQImpmx6jt8QxdqbCpuZSEsvpRqf46bTm1jfj3QUpSdGIiX4zjyUrqtr-P5xUIgY1YNntjUv2Yj-TYzCo?purpose=inline)

![Alignify - Order Management Dashboard UI by Wolfpixel UI/UX  for Wolfpixel Agency on Dribbble](https://images.openai.com/static-rsc-4/ajr_xFKp1QKBmOM84qfDRfTtGjjqfFK-ehUtQh2UnCmtJlKJRATmSWQWOHIH5qo8S2HRQ1g5N1twwcR1c-SRO4suV705Zc_z89u7VsMPUs2eSrWn7kJanUA14jlYFCWtxSp5mdAFtv9Xks2_7Heqza9PS2dy3KEGMA12ugIOk9M?purpose=inline)

![6 vấn đề thực hiện đơn hàng e-commerce phổ biến nhất và cách khắc phục | bởi Ecom Agency UpSell | Brands Vietnam](https://images.openai.com/static-rsc-4/X-GA0VRr-KKTQCe3FQFOU84UHrt4gIy1cqpBSywil0yHvATA2eF85uqRZKjNQng6qO1WoCEB07vX3Ma7ETaCGtjWJmios2lZddqdSqoTlpDEpvJO3LhLCJ-hUce3D9U7FPcQQyp6YEZ3kwgk1HmhZ8eg-h3xCQpNYeOX1nnry00?purpose=inline)

5

## Order Lifecycle

![Commerce (Ibexa Documentation)](https://images.openai.com/static-rsc-4/4g-35lEuePPmpptSJCB_GYwuvBMgk5z4EvJCYBkPK0gTLe0ZC-IhyjsTsvTzOCH5GKknSaluEfYF0n17yrFs8KkCgZ9K1Sr_2OkemtShZDre6FlaPK_1AvVW655SStkwF2xwAHWxUp3844CRDSzMCdnB2R7fYwfwufw7nCDJ9R0?purpose=inline)

![State Diagram Generator - Free AI State Machine Diagram Maker](https://images.openai.com/static-rsc-4/ZtvNaHHy5EclIHyBa3IXvs8RW6pm6fwfCLRrUz8Q-WMZegrNH54YS6e3DpxSMezTkxJoRvfbr4gYIf1cOx0yhzwmucTBB91zt2YoGekRjayQ-YSJfHe3WR2Sk_zhgqwM5MT0_kyYbTUTMl6bjlEvyyr37XHoYrCVAUoHFMdtPec?purpose=inline)

![Managing Magento 2 Order Status Effectively - Mageplaza](https://images.openai.com/static-rsc-4/0aIqJmpU7G1R71LEdUFDWRUsUC1brKWAcy9cK7zBN3Qu6-QKe-H-Gt2ain2rXoA1XCXd1on-MR4rovckqsvLf6xnkqudXZ1br4AdKU1jefpcfR2FFpJuQVeQu9_CRBBDPE0WF_t6yxoUywAd3YxVILeL400GEYP_d3GpfL_mItY?purpose=inline)

4

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Status</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">معنی</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Draft</td><td data-d-component="table-cell" data-d-valign="start">پیش سفارش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Pending Payment</td><td data-d-component="table-cell" data-d-valign="start">منتظر پرداخت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Paid</td><td data-d-component="table-cell" data-d-valign="start">پرداخت شده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Processing</td><td data-d-component="table-cell" data-d-valign="start">در حال آماده‌سازی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Packed</td><td data-d-component="table-cell" data-d-valign="start">بسته‌بندی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Shipped</td><td data-d-component="table-cell" data-d-valign="start">ارسال شده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Delivered</td><td data-d-component="table-cell" data-d-valign="start">تحویل شده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Cancelled</td><td data-d-component="table-cell" data-d-valign="start">لغو</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Returned</td><td data-d-component="table-cell" data-d-valign="start">مرجوعی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Refunded</td><td data-d-component="table-cell" data-d-valign="start">بازپرداخت</td></tr></tbody></table>

## Order Tables

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Table</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">وظیفه</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">orders</td><td data-d-component="table-cell" data-d-valign="start">اطلاعات اصلی سفارش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">order_items</td><td data-d-component="table-cell" data-d-valign="start">آیتم‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">order_addresses</td><td data-d-component="table-cell" data-d-valign="start">آدرس ارسال و صورتحساب</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">order_payments</td><td data-d-component="table-cell" data-d-valign="start">پرداخت‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">order_shipments</td><td data-d-component="table-cell" data-d-valign="start">مرسوله‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">order_notes</td><td data-d-component="table-cell" data-d-valign="start">تاریخچه و لاگ</td></tr></tbody></table>

## Sequential Order Number

مثلاً:

IR-1405-000001 IR-1405-000002 IR-1405-000003

قابل تنظیم:

* Prefix

* Year

* Branch

* Warehouse

# فصل ۴ — Payments Engine

![How online payments work: A breakdown of payment architecture | Priyank Vaghela posted on the topic | LinkedIn](https://images.openai.com/static-rsc-4/xbLzhYxiAY-QmyJ0Kgz5ets-OtAQa2u8bbtcgIS59WQ3hGyBAWKJty5aYH1UrbvTKwjUgJxUbn7E7XfzVGq8rAtSyjt5fFw9dLaXR-k5WuyL5o3D8rLG4vt6av0saFT77pB8iTRAaV7S2Q-EahZy6Os2nr61GsioUMz0SGtE17s?purpose=inline)

![Checkout page :: Behance](https://images.openai.com/static-rsc-4/UyGfLkJUE6He9FBl6LMQJmw9h9wCZvdYE6o1uAbFBe_p0Bt3TKLraRYgDdgwg00w0sAaNfalDZrWj6VlX9TTC-YMf4O76I51M4mGbmZljzIXLQkKAC67qWEILb-i1ESwmCVLwGMuPCgVOrlXRbRvso_vOWFWXuqBM5GWm8YGH_4?purpose=inline)

![Payment Gateway Integration \[Steps, Costs, Types & Benefits\]](https://images.openai.com/static-rsc-4/dQw824PAgntLlj7faasnPjApOalJRUt6GR8wcRkLGL7_9BoSnR4eW2qkBW50UdfFbS3uGvDkONPzgTgGHpBMT54UB2qKohyXuJG7snUNZA3XCCeE4QitcpJ9ilxU2-UGZkTaLZCo8B6RSk3pEbo6PGcQ166e9cC8obWMEMQlW8M?purpose=inline)

5

## Gateway Architecture

Interface واحد:

TypeScript

```
PaymentGateway
  authorize()
  capture()
  verify()
  refund()
  void()
```

## درگاه‌های ایران

![لوگو زرین‌پال - لوگویاب](https://images.openai.com/static-rsc-4/jU3aSHd9H9BMHHVIHHWPJQLIHZoFckNeeDg48a_PjZzpTMp9ejW1SOFrhDhPUG-PRnA_1frBF6Cn7pMAobFhwQbOtR68KBe1S3_XDSvGCfaedOA-JiQ6mAE7ChcwPlYCPj2GAMKdDVGflZPwK6FMxDMn2jnXV7HYeQmfCzrNXpk?purpose=inline)

![File.svg - Wikimedia Commons](https://images.openai.com/static-rsc-4/TX0FP72ZyeQxmfNGyjn-mhKnGBCcISzm_fK07gvhaFzfxpYpHdHtUNruQR31KQnEUGdmc4UJNj7SCazb5MRvb0-UpsopCn1ELhAWCDB1oh4gxxkJXy6ll7KpyQXc9Nso6DfMmUX0gUcrPmiM_L6Y8CuUgx-dfy2wJq1AkRDny1M?purpose=inline)

![Zarinpal | زرین‌پال (@zarinpal) on X](https://images.openai.com/static-rsc-4/QXI-YKuAZrEc0U13gLXi_oerkk9ag_tkAlkrihSkGKRqwgBVzq_cj1iK27M4k1LEJHkp9N5vXfmPhpDGHNgWLjQtN82WFRP_uFUkXfHuPMlThFUun5GKGAz_d9meV6TRQTzuK7AIqHaVVic88h6AOMHFpkHTwjtBlvY6QeQ6wyI?purpose=inline)

پشتیبانی:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Gateway</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">ویژگی</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">زرین پال</td><td data-d-component="table-cell" data-d-valign="start">Callback + Verify</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">زیبال</td><td data-d-component="table-cell" data-d-valign="start">PSP Aggregator</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">آیدی پی</td><td data-d-component="table-cell" data-d-valign="start">Merchant</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">نکست پی</td><td data-d-component="table-cell" data-d-valign="start">Callback</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">ملت، سامان، پارسیان...</td><td data-d-component="table-cell" data-d-valign="start">PSP مستقیم</td></tr></tbody></table>

## Payment Status

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Status</td><td data-d-component="table-cell" data-d-valign="start">توضیح</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Pending</td><td data-d-component="table-cell" data-d-valign="start">شروع پرداخت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Authorized</td><td data-d-component="table-cell" data-d-valign="start">تایید اولیه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Captured</td><td data-d-component="table-cell" data-d-valign="start">پرداخت موفق</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Failed</td><td data-d-component="table-cell" data-d-valign="start">ناموفق</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Refunded</td><td data-d-component="table-cell" data-d-valign="start">بازگشت وجه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Partially Refunded</td><td data-d-component="table-cell" data-d-valign="start">بخشی از مبلغ</td></tr></tbody></table>

## Wallet (کیف پول)

ویژگی‌ها:

* شارژ

* برداشت

* بازگشت وجه

* هدیه

* اعتبار خرید

Ledger کامل.

# فصل ۵ — Shipping Engine

![Tariff Surcharges Setup Video](https://images.openai.com/static-rsc-4/DP6edBgTKC7dtLzTDNA_qEoqs7D8Je9XNHOcpyb6RMbddEyax80U-bCCZtO7TvOr3hoX5EdawnYGo-5yjYuhvcDZyem6rF8JDtUt4jHK2S1Gp3trJkol8EMthGrSNvF0N7BUPxZV9ZxCw9tRWG1GZqj6yTjrWE6WdRiQeg1iA2U?purpose=inline)

![FedEx introduces Collaborative Shipping Tool to enhance import process and boost logistics efficiency - Payload Asia](https://images.openai.com/static-rsc-4/sVopJ3Y8EzfEb6mtUY91doSfGvEPzPhIq1xkwxZYZQza0fKlUTZe0NXKgHJPt5qXSPGP3MKYZwvuuxb-s2sseL33i_vRkDAzkI6p4Y_kXqHX3QmGKrwLnkMYIOIpDI8KcJnn1b8_dGomgUvHl8CFEDXBc4fo5HMAXYR8zleco8w?purpose=inline)

![Core Features of Shipping Management Software for Ecommerce](https://images.openai.com/static-rsc-4/w-p4FOkAJhIr3LSTJ-OHx9XZAeKPVI63liAfe6wacOTGJ8PefSz-jLwnOaF7lBZO5kn5tRg8f4Rlb2Fi151dQ3jb8Yn_IBaPG0pET583gSu85GTfix7bYnaqkwtYrgBaUJS6bkMj-GNINSRSTymLANv_xSK_oAhj68dpNIeaZh0?purpose=inline)

6

## Shipping Zones

ایران:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Zone</td><td data-d-component="table-cell" data-d-valign="start">مثال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">استان</td><td data-d-component="table-cell" data-d-valign="start">تهران</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شهر</td><td data-d-component="table-cell" data-d-valign="start">کرج</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">کد پستی</td><td data-d-component="table-cell" data-d-valign="start">14939...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">ناحیه سفارشی</td><td data-d-component="table-cell" data-d-valign="start">شمال تهران</td></tr></tbody></table>

## Shipping Methods

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Method</td><td data-d-component="table-cell" data-d-valign="start">جزئیات</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Flat</td><td data-d-component="table-cell" data-d-valign="start">هزینه ثابت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Weight Based</td><td data-d-component="table-cell" data-d-valign="start">بر اساس وزن</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Price Based</td><td data-d-component="table-cell" data-d-valign="start">بر اساس مبلغ خرید</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Free Shipping</td><td data-d-component="table-cell" data-d-valign="start">بالای مبلغ مشخص</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Express</td><td data-d-component="table-cell" data-d-valign="start">ارسال سریع</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Pickup</td><td data-d-component="table-cell" data-d-valign="start">تحویل حضوری</td></tr></tbody></table>

## Shipment Tracking

![tracking.post.ir at WI. سامانه رهگیری مرسولات پستی](https://images.openai.com/static-rsc-4/AixqUq2YcVhPI5FCWwb5xQEvw3XAUkjJC49a8iROJDXy1x_kjpJ9zSTGeqbXZtGnUbpzOvhebv30cUtFqSE9wDKzDyKnpNMG48giOVNPQkzhtGjjS9aEuwKvosBJbN1gkvylVg8RT3qC5rQHk8JK_rFkzVTwFA6tgGFH46SMKrY?purpose=inline)

![ShipNow Tracking Page - Shipping Management Dashboard by Ahmad S. Afandi for Peterdraw Studio on Dribbble](https://images.openai.com/static-rsc-4/qZlAjNJ0OmCSK8fsEdKBAjAmFetXg0_IcjidLqo-L1KA2b570FXABi62KiElaoZ5K0qW-oaHu5n92YtO9dyWdbawHjLsPW5E8LsYrdLc02Vr6VoAkGMfwxPOXpMopZ5mz2pcbPc_fCTO6-rYZxVSxcj86bAaIfuHW-uyJ2NNMoQ?purpose=inline)

![What is Order Tracking in eCommerce, and How It Works?](https://images.openai.com/static-rsc-4/s3WmPp0olDSNdOVVdPz0SuIK84ziQT8L61WIhvKkpxAk-R1hVuEmx_hrhbwjkcNtFY3IItqYqTWqokV3D4-WcijxBHpDIPZrlSak9J-z5fTyI9yteq1BQJNpHV7v1w2Hk8f9UScOXqV8XKWuzXYRJeoGVgHl4L50NWqMM0N6WFY?purpose=inline)

5

هر سفارش چند Shipment دارد.

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Field</td><td data-d-component="table-cell" data-d-valign="start">توضیح</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">tracking_number</td><td data-d-component="table-cell" data-d-valign="start">کد رهگیری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">carrier</td><td data-d-component="table-cell" data-d-valign="start">پست، تیپاکس...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">status</td><td data-d-component="table-cell" data-d-valign="start">In Transit...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">events</td><td data-d-component="table-cell" data-d-valign="start">Timeline</td></tr></tbody></table>

Carrier های ایران:

* پست

* تیپاکس

* چاپار

* الوپیک

* اسنپ باکس

* ماهکس

* باربری

# فصل ۶ — Pricing Engine

![Pricing Policy](https://images.openai.com/static-rsc-4/xSfEJI005uP9W9PGLA8Af7fAWzx96x_FdCDkDND5SF4lL4HrI1bQaG9W8CyX1dwUJu48SyHF0ZTlyVgKJm0mdPG5aShEVizpoS1dlgKrGGLvzbAwHfrFnB8xRRtu6ThVjkgYk4wqZcJJ7_OXOS5GSh1olpOLPjwbCsr_AM28p9Q?purpose=inline)

![Dynamic Pricing With Discount Rules for WooCommerce – WordPress plugin | WordPress.org](https://images.openai.com/static-rsc-4/juyl00dGL-xYP1BL4dYMH4uD46XJAlJL-DF5kDyFzcX0oiMzzY3YV1npj4zkEtD5-UskDAIiFgLDFAoutLFnKJgEBp8rzzBKkuAoTntrwfXh9nOSXTf2t51vpus__hzjavMrhCnFNFNZDOJw-FSlCrz-Qers7DcJ0izz3DbZnPI?purpose=inline)

![BigCommerce Help Center](https://images.openai.com/static-rsc-4/szKSN2DTx1Vz89q_UgyFvmaz3uBlhMgLkFqmXeZU76sWq2cBlYPH1b1tc6f-fmXfJnEhYKrX6c07HA7MK6fYGUWNAp8gitbfLV7EQXIDpiPGJwWjlyQDc8aspOpbQWkvLmS1AH2RoY7pMGYSqT-QpkViTSjoRfjkxARw8ukxLmM?purpose=inline)

6

## Price Lists

کاملاً مستقل از محصول.

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Price Type</td><td data-d-component="table-cell" data-d-valign="start">مثال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Retail</td><td data-d-component="table-cell" data-d-valign="start">مصرف‌کننده</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Wholesale</td><td data-d-component="table-cell" data-d-valign="start">همکار</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">VIP</td><td data-d-component="table-cell" data-d-valign="start">اعضای ویژه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Organization</td><td data-d-component="table-cell" data-d-valign="start">شرکت خاص</td></tr></tbody></table>

## Dynamic Pricing Rules

قوانین:

* Buy X Get Y

* Buy More Save More

* درصدی

* مبلغ ثابت

* اولین خرید

* تولد

* کمپین

* دسته‌بندی

* برند

* مشتری خاص

* استان خاص

* ساعت خاص

Engine باید Rule Based باشد.

# فصل ۷ — Coupons / Gift Cards

![WebToffee Gift Cards for WooCommerce – WordPress-Plugin | WordPress.org Deutsch](https://images.openai.com/static-rsc-4/POwjTZz7gh0k8F0hwTUYncscP0YVIQ2Nu52Zco65PlBvV5juXPokkrmQ6GkhUS1VWO8OjFGs2xb5ROeQUmOM8K_krzW_9etm3s2gt62TdSuDJ_FoiE2YJ3QUoHeUH-_DjgejLyYxw4J5LZhetfbPxHkmPmoS5g7idIxwv3lTywg?purpose=inline)

![](https://images.openai.com/static-rsc-4/8qOu8DVkdNBZX6UteN1HFjlWV3rljdjD5Q2nplriJlNZqjRMmo3JQlBgVVKy7iO45hiKanp1-v7XXVYNfO6bC3mMD8QXu9KMWyvk8mhd-YnNFQfPp3uuwPbEo6X_GvBNG-RhXIPpEv4xeg6g_4y1p3CmFvamWj_Rw0bOrFy-tRk?purpose=inline)

![WebToffee Gift Cards - WooCommerce Marketplace](https://images.openai.com/static-rsc-4/V9d3rylb2JoK9f9pU21Z7N5FJV-oA86FJj89m9ZoNv9xKux5AwBZeBhALVDrZJUwUpx4Zc3-d52nzV3meUxHR-7VZq1ZR0W3SAQ-6-QxYRNE9rXZNNHZstF-289UN03QVp8v9lm1GM4fthCbvoSsnW6c72LqmoKl8fT98d2lyag?purpose=inline)

5

## Coupon Types

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">نوع</td><td data-d-component="table-cell" data-d-valign="start">جزئیات</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">درصد</td><td data-d-component="table-cell" data-d-valign="start">۲۰٪</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">مبلغ ثابت</td><td data-d-component="table-cell" data-d-valign="start">۵۰ هزار تومان</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">ارسال رایگان</td><td data-d-component="table-cell" data-d-valign="start">✔</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">گیفت کارت</td><td data-d-component="table-cell" data-d-valign="start">اعتبار کیف پول</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">اعتبار خرید</td><td data-d-component="table-cell" data-d-valign="start">Wallet Credit</td></tr></tbody></table>

ویژگی‌ها:

* محدودیت مصرف

* محدودیت کاربر

* محدودیت دسته

* تاریخ شروع/پایان

* حداقل خرید

* ترکیب با سایر کوپن‌ها

# فصل ۸ — Membership Module

![How Do Free Apps Make Money Without Ads? All Strategies Explained - Purrweb](https://images.openai.com/static-rsc-4/pWN1E9g0M6qNmLvZKE539bx7dwLVgd36yF7T5-Z3dbIoE6WMQL6x1bDxIJ_LUZGCv8YlnolR33QMSuR36NjQjGDoGEruFyjVw2EuUEzlxJdYFcBJEH91ufjL8R-4bDaStbtVAY_3M8we0DzgtoI3_eY4ji9BIiicw-HwLyVpl8U?purpose=inline)

![Member-Based Organizations Strategies to Scale Up • Glue Up](https://images.openai.com/static-rsc-4/yWCRDdHS99-uxLIUV7R-sAXjVL22hZuPufD0lp-e5pmYEIVDoWDNyE_H9VoLOK6VWxDwjIbqft5ua75Luf_aCpKHGSe_HUwpsg8nKF0fPXhk1D3eiO3Vu4jqU_T523WigSX0voDpwg9eoLopNhxXPWACFxUAXZjHUxVYyMx1WGA?purpose=inline)

![Subscription Plan UI design by Awais Ali on Dribbble](https://images.openai.com/static-rsc-4/clnz9J1Wv4oMjCVu7aKI7d_I9fthF_5wdLyT47Ad_nx1fjdRXcAKh8osTr5bISQRrT_x2aFy8kYLQ24j3rOhNIGhY6TF-2acBToKj2bOa3fYY3NXMVSMtJ9kHEhwCrJebhjTyHorMi0f3usFXw61gU0TsIgRRQKfUsjcPpWRW5g?purpose=inline)

6

## Membership Features

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">قابلیت</td><td data-d-component="table-cell" data-d-valign="start">جزئیات</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">سطح عضویت</td><td data-d-component="table-cell" data-d-valign="start">Silver / Gold / Platinum</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">دسترسی محصول</td><td data-d-component="table-cell" data-d-valign="start">اعضای ویژه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">تخفیف اختصاصی</td><td data-d-component="table-cell" data-d-valign="start">Role Pricing</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">محتوا</td><td data-d-component="table-cell" data-d-valign="start">دوره‌ها، فایل‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">انقضا</td><td data-d-component="table-cell" data-d-valign="start">زمانی</td></tr></tbody></table>

# فصل ۹ — Subscription Module

![The role of a payment orchestration layer in global payments](https://images.openai.com/static-rsc-4/QwL2CdILf_xCSR90WB0wEiPOlOtLaNxDNP-lmi8OqNhlH7qcsuQNoPna6bXXveAEzHygnAXm5aJjYZknQX5KIbVYwRXd6f-pOHz7_NHo0VNO2gkDD_F0EdnA_n6WqQYPiSOPKvt4E7oE9EgFak5EXBVlnNhu0d-t7btyPi-3_5o?purpose=inline)

![](https://images.openai.com/static-rsc-4/gOIn_RN6vSc8ZwxEIDxxRLmJ_VkUgR9PNXI1Hd_Eml47p50yrQGOVIn2LSpS9WDFsv1cjGx9VXfa02QO6QBnH_cF88PTthxVnXLZ18qx0MK8LH6PoZ3dDg4FGDNyoUMx0bNLrTkrJ1TXA-wTC-n2OKEcrU5Ka0D3etSNyvLtGhI?purpose=inline)

![PayWhirl Subscriptions - Create custom subscription plans with powerful retention tools | Shopify App Store](https://images.openai.com/static-rsc-4/pb5JcVPoqYo9rqMqXL-0TX-TfjnJEFV5S5yYUs2GJeED22DBgn8a07gck8NV4VdZ3DXjJ5JZoeJ4c_EbtujWgvvKtXwYeNkG7FOdeKujQlIv278rQg1URdt55n2xNdOFRIatO_0O5a8YBt6ewtoXuu5NmA-9lWJB_qmu9tMBzto?purpose=inline)

5

## Subscription Lifecycle

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Status</td><td data-d-component="table-cell" data-d-valign="start">توضیح</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Trial</td><td data-d-component="table-cell" data-d-valign="start">دوره آزمایشی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Active</td><td data-d-component="table-cell" data-d-valign="start">فعال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Paused</td><td data-d-component="table-cell" data-d-valign="start">تعلیق</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Cancelled</td><td data-d-component="table-cell" data-d-valign="start">لغو</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Expired</td><td data-d-component="table-cell" data-d-valign="start">منقضی</td></tr></tbody></table>

ویژگی‌ها:

* تمدید خودکار

* پرداخت دوره‌ای

* صورتحساب دوره‌ای

* Retry پرداخت

* تغییر پلن

# فصل ۱۰ — Booking Module

![WCFM – Frontend Manager for WooCommerce along with Bookings Subscription Listings Compatible – WordPress plugin | WordPress.org](https://images.openai.com/static-rsc-4/0XwMlHmpYIvnAq1iqZQvx-bf5lkDEWR5dQg7-CxPjB_4PbR2IEHeri2iDLEpWur7hNzaaNYKcyAJ6-FEb5XpqtPSzH1ILxV9HT5a1T98UPhpDNNyLLCBMUXpNaph8FgMDULFbzIyT7wRokJGJZyk9aMKBigq2592MrclS7Cwe_k?purpose=inline)

![KeenzChillz Properties - Premium Rental Booking Platform by Sherifdeen Adebayo](https://images.openai.com/static-rsc-4/2AAxJm2k0ipUb7Gw_6XKrucV4DBMT6t3OS4qt2bYb44Myv1dlInZrwQZPD8FczHs-s2oC5qVoxt4qRNeGTGpq-H2A64OEIl5g7vOmL13peRTzWFy2UMINHk7tVPkW7pBKYTNe6HZLQVkx_Va4noSztDgyi6-DJlO7xDLkHXDRh8?purpose=inline)

![Digisuite Appointment - Clean Calendar View for Appointments by Waqar Khan on Dribbble](https://images.openai.com/static-rsc-4/Ttl-QXti2dV8TNmG76RY2QSs7saOpXm_ZqxqkX47DQbdOEKRQjN_cTVElE2evx65zdHe0i1GsSmbzKUix62T-DRSEhcrYuInu60Bse35yOk_OyikJBUR2XWRSMfQhRTlneqfFKtqBERUxU21ib8rYcu7K_oWXfADYfWE_wZfLyY?purpose=inline)

4

## Booking Database

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Table</td><td data-d-component="table-cell" data-d-valign="start">کاربرد</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">bookable_resources</td><td data-d-component="table-cell" data-d-valign="start">پزشک، کلاس، اتاق</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">availability_rules</td><td data-d-component="table-cell" data-d-valign="start">برنامه کاری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">bookings</td><td data-d-component="table-cell" data-d-valign="start">رزروها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">booking_slots</td><td data-d-component="table-cell" data-d-valign="start">Slot ها</td></tr></tbody></table>

پشتیبانی:

* تقویم شمسی

* ساعت کاری

* ظرفیت

* تعطیلات

* چند منبع رزرو

# فصل ۱۱ — Product Add-ons

![Ecommerce Website Templates - Free and Premium Themes for Your Online Store.](https://images.openai.com/static-rsc-4/-4P4rWezBOZXLq1b9UDArU70xjVO8MwSWiYc7e-X9XiLozJWWScK9PWMZ-JuvW51W46DBSO-YI31s9HKmi28_AiIvvimOFQY7fBr_e0WjmC-mS7BDGsNFSlbBUNdrUUKeemzAL53PIygJqyf49wQB3yP_dH6m_pqeDrALHcJxws?purpose=inline)

![How can I add a custom laser engraving option to my products?](https://images.openai.com/static-rsc-4/cWDLCF4iKb_ieSLZ3Ouw6Gj-Zh5GVxshK5ZWKFO5xW0Ato6ZVYxTigVRnUY2nf2LJY2w4jw6KNyYK6BCjXWIfaEvzZCYXY7uIZ-t-FfoAAmYEwXatslJ4B2aFe3FZmBC8CYL94IednXjV_glL0bADdKvRQrM9LMsmy9Aoiv7qLk?purpose=inline)

![Best WooCommerce Product Add-Ons Plugins (+ How to Use Them)](https://images.openai.com/static-rsc-4/jU4AhOTyq7RlDxdO2ZsPuABRwenoasglUlGsiuVAF5p2dCOC8hjXCxe2WsiW1AseQ-inJFeEfecvyCsvM0gNB1dCQFBsjHeIAy5-KKPjaCviA4a-zeEOXNiccbFd49lWzRv01UFEF4boiQjllj_zxyM3tp_5WUNOhGUBc8FpIME?purpose=inline)

6

قابلیت‌ها:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">نوع</td><td data-d-component="table-cell" data-d-valign="start">مثال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Text</td><td data-d-component="table-cell" data-d-valign="start">حک اسم</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Textarea</td><td data-d-component="table-cell" data-d-valign="start">پیام هدیه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Color Picker</td><td data-d-component="table-cell" data-d-valign="start">انتخاب رنگ</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Image Choice</td><td data-d-component="table-cell" data-d-valign="start">طرح چاپ</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">File Upload</td><td data-d-component="table-cell" data-d-valign="start">آپلود لوگو</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Date Picker</td><td data-d-component="table-cell" data-d-valign="start">تاریخ مراسم</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Checkbox</td><td data-d-component="table-cell" data-d-valign="start">بسته‌بندی هدیه</td></tr></tbody></table>

هر Add-on:

* Required

* Conditional

* Price Modifier

* Validation

# فصل ۱۲ — Bundle & Composite

## Bundles

![Concept – RoarTheme - Premium Shopify Themes, Apps and Services](https://images.openai.com/static-rsc-4/QA5Gi3127VhjbG8Owu3QAGPBpIcknbUjxc0CXrvyPHITUyEzrfGfh2OXbkzIay_6f7tpVjsphzKjJOTuAJHwzFeHA9XH9iHXqFSnHYYl5FqaaY3X5jPGDk1MFu7GP6gN8W_Zlq_qrBjFb40DxKZpo0TLZq9XzNUiWFZrNgKJ8WI?purpose=inline)

![Bundle MixMatch Builder - Mix, match & save with tiered bundle discounts | Shopify App Store](https://images.openai.com/static-rsc-4/vHCqbZjn-f6BBvwl7wBgRERozHgmkiALRW_kkR7lXbJPTUtklXDAud6vhPmKTB9AfpSgJ0X9GJPH1WQJsmcEM_2CT2QiXWP3jFLLHcXOev7eidQsMZR7mOgVyhr664t0ZatkzuoUHO58Pdsd8wwF2yIzRW9Gke0uDfrrItxIhjk?purpose=inline)

![BundleSuite Bundle Builder and Mix and Match Shopify App](https://images.openai.com/static-rsc-4/6byl3QiajCtqZTkU2fgn0NivL1K6mjrTc5kKh_2XpyWbCIB4i4sV_5DYtBRjwyk1A9oEA_Fx8YTUAZkDcs2umpgjqqoT6sckG2zvLmVbqAh5ty4b1HcK_5VmZtSiSVdX30OnHQ0P6TeINAtDpoaWlX53pPTWEzLjq-G83TuC2so?purpose=inline)

6

* چند محصول

* تخفیف پکیج

* موجودی مستقل

* انتخاب اجباری یا اختیاری

## Composite

![Customizing Category Pages - Eyeva BigCommerce Theme User Guide](https://images.openai.com/static-rsc-4/RwtQYmWWIpTxYO47GjPnsxPGKs8EGJY3524ZEpqWV309UrFbaMuRam6GknOTFa-w26NFaXW-cRNu-YWQ5Up0Gcpj2COzv_pABrpVR5JdwQLsPePyxOMZQ84A6E0t2zAy7xy18MTXNQBlUQYKRjFGbAJQUYHGSPhC4xwhr32H9HE?purpose=inline)

![Composite Products for WooCommerce by extendons | CodeCanyon](https://images.openai.com/static-rsc-4/KvOYWr5ZyVDwtEHaVjiRzYRiyX4uKTgnFEUiVtxKNQ0wAOucdEzbC6JVdY5PATnQcAw5evgmr0_Lu2jIoeHJMTpzjrB5MTFLKl6_EG-Wcwmkpa7Oe33ZVRvD2Jl-A-kJ4AZPLW_v-Mj8F2hzvZrokJjjbbzVzCjvoYc9fPWe-uk?purpose=inline)

![Productos compuestos de PrestaShop: Guía para la creación de productos](https://images.openai.com/static-rsc-4/CRGtsLKWlKD0Gxs_m80mLW0WPdNUXmA3T9AOhBAu3CxX1gAsUkcfwzBkRo0KHaTLXUyuy-MiS4ZxZytztWwLX8FtVFZcdqIGo0QuNec0dH2WGCkFNMPrLmyK-_RekMV0le6mB3OAw56L9HIyMTr9SEKA9dt4eJA7X0NhHvq43r0?purpose=inline)

6

مثل اسمبل کامپیوتر.

Component ها:

* CPU

* RAM

* GPU

* SSD

Rule Engine:

* Compatibility

* Required

* Quantity

# فصل ۱۳ — Wishlist

![Evira - Ecommerce React Native Expo App Ui Kit by lalaweb99 | CodeCanyon](https://images.openai.com/static-rsc-4/LbepF8FC-XL3OBYORv5cSiF1k6v9wLUPR0PSquWgf7vnTjv-37D2PDCrF_sERvx4KWG9uKOQed4YzzjA1OrHdwhaqo0mLLryYZLNQIpfl39meNc0ikgRi969YXw_dLuUhKRIcK9wmiWzurkkj_wYEo8ZGfgoYANFfDq29eHnYxs?purpose=inline)

![YITH WooCommerce Wishlist](https://images.openai.com/static-rsc-4/LdQP7Ts3MG074LZmRA1Vw8O-RNIhBiixbtvqPk2JoaFDgyN_Qxob3JNPbIgSXvahz4xzwqBPAi-oiGWRxKqLrNWTgQ2-7iO5UFZ71-hWW-sjWQBc4V0J2aqHIWE1ym-x6V6811AagOU6C8bPyyjLgC8yUuyBwA8TS8QizN1Wemk?purpose=inline)

![fangift](https://images.openai.com/static-rsc-4/xchs_TUKHV0Ls4ZNtEe-SCen-AZ71PSPjBjFy8LuRqSGzfP4C7UlkfNpOBKMPQ4J7LkHTKYGuHdhVczUxozK25dLnfBVbRjcoEfCFQkyBR99a_lZFk7YlzGnwO4_M1R8-JBpKhVtF5WVLysMSMIjOGJI7IIXsY6_uLni-tdR9Sk?purpose=inline)

8

ویژگی‌ها:

* مهمان یا کاربر

* چند Wishlist

* اشتراک‌گذاری

* اطلاع موجود شدن

* اطلاع کاهش قیمت

# فصل ۱۴ — Points & Rewards

![Loyalty programs for e-commerce: increasing repeat orders and customer retention](https://images.openai.com/static-rsc-4/ulVucgMjs4YxrMCAdjy1TrMH_zvqEIwUEq3tDc5w5wcHBqDXrUvlatCzKqeMjTLgW25dHuRmY9WNyzE_7TBoQ6ZYYTRKtu66wizG1BGPuVOixaeNCxiiEMzybYOpsu47YJXxcnU7SuTOMvQtp1p-yEQ0z1ioGHah4vxyuZNFt4E?purpose=inline)

![How To Manage Loyalty Points System In Loyalty Program](https://images.openai.com/static-rsc-4/D2POQnFNk0lOypUMeFkwHDSMTRsa3LiVF76dzVHJpwFKIYQTDMA9Rn6YAntGDXTQ27P73H7vgzBnFqTs1qo26XnFOTh8QGiJww0qr15RC4qxxasgrpKv64Uc2bnQf9kEPgZJ_T9adZzkU4q0tbgS6-CbAuLBRTogE_3tbq-0H3M?purpose=inline)

![WooCommerce Points and Rewards | Swipecart Integration](https://images.openai.com/static-rsc-4/DTNB7koI4bUMdQIRR4JxXl6nU9i1LfOnz7A6F5xp9t8Glmg65ImX3KQLL-WJRjKtGb_cqBKc6R9bPaVvSqcONsswj5b7JbS_4efl8o8AD6JBjpyKsxBU-BM5NuRdFcwV8uAgsHtvZcM5FhFGgE5XSNlMwmn1LxBeGHxc-QS5MDo?purpose=inline)

6

Ledger امتیاز.

Transaction Types:

* Earn

* Spend

* Expire

* Bonus

* Refund

# فصل ۱۵ — Customers Module

![eCom89- Ecommerce CRM Dashboard by Altamira Tripty for Netro Systems on Dribbble](https://images.openai.com/static-rsc-4/swD4D7ULXoAm2Fsiw-wlSMc8c5zEzBgzM059DOyn-yYxsGDmlqjfPI5WYWxKSTamzywZw7EedPDoIuoB-ECIKXOnqgpWDNov5R2Ndq1eZxvSDPRYUYT5U6pADaTfdYW1jiINsxcnaM8uGjqm4eG1qTjpu5FKKAx3yhKltNLsh48?purpose=inline)

![Assigning Multiple Phone Numbers and Email Addresses to a Customer](https://images.openai.com/static-rsc-4/s3v1fZPpUtGCz0NjpClo9VvQaw99iDePRNCDWNEYFkkXcJK_pqXNm62VpqPhFW2kbejmeWV03I7Eiuyw9HNmSzb7Gp90QuH-3ETEakO9kFz_Dy7fzecJc1tMDCHjUIlhTYaF4WtnK50mE9Nox_57hMy3Il7sJ7_Dm1QHQf8FNFI?purpose=inline)

![](https://images.openai.com/static-rsc-4/lD3owqB-sHd1QineBIVHrCNmeFAT_91aGhb0fS118-A26TJXML6wr77MrzReTgTPhK2oYElJElmgzxj6Bxx37HqENrGh8NgjUk6U9sexwGVkeHJtOJj7IlCYRNmNjPi_vJQ_idX6kQY4vFZ91s67KKtCXjM5Q15CBG1VuRixM5k?purpose=inline)

5

## Customer Profile

<table class="_6IUVGW_Table" data-d-column-sizing="auto" data-d-dividers="" style="table-layout: auto;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-has-width="" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Field</span></p></td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">توضیح</span></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">ملی / حقیقی / حقوقی</td><td data-d-component="table-cell" data-d-valign="start">نوع مشتری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">کد ملی</td><td data-d-component="table-cell" data-d-valign="start">اختیاری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شناسه ملی شرکت</td><td data-d-component="table-cell" data-d-valign="start">B2B</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شماره اقتصادی</td><td data-d-component="table-cell" data-d-valign="start">فاکتور رسمی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Wallet</td><td data-d-component="table-cell" data-d-valign="start">کیف پول</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Loyalty</td><td data-d-component="table-cell" data-d-valign="start">امتیاز</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Tags</td><td data-d-component="table-cell" data-d-valign="start">VIP، عمده...</td></tr></tbody></table>

## Addresses

![ویرایش فرم تسویه حساب ووکامرس با کد نویسی - چهارراه وردپرس](https://images.openai.com/static-rsc-4/ehooegBXv_OlF7nRBr1bhEqwZ0n_ruY3ZQy79EvFkzd7lvd4KTEQNun885huwHQc-TvTtC9O7algoiAGbkVDN8qdT4qzDc2vnjJbfLuV9lr7lyh05VdHGYt8uqYsM61O96lmLz9cFSow0sH3kBv5iLBOLc6n3bBLVxvh-9r69rA?purpose=inline)

![آموزش خرید از فروشگاه دیجی بانه](https://images.openai.com/static-rsc-4/5dFpmWq4JtPu94B0fb1bfWQXH02PjbTAvKwF6WvubEXVqUMTmYR1wGbBoUMak3YcSHc50dJSg_Ej4esceJH3t7BA20V1jTdDUaO-_10nLFSnnS_qS8GT4CcgsBlADHLf30sdcvbPUKfjLjpjk0XSFmMNs1fvlBH_hs6hg5i1Zec?purpose=inline)

![فروشگاه اینترنتی اکسین - نتین](https://images.openai.com/static-rsc-4/mmF_FCjSIVJ3OPzWTmfH0Ij1QMHrZ_tOnm5ekawVqX3qVZ880nvFXRZmu_nA7rFRx30bwcu-qlz3QlYogAubt43EuQpIXEfAAowD8kizhN23jJKRDa23aRxyoLWfQ-STxZXo8dFLR44H5EeO-Tok1qN4CzpFxUfGsApK2CulS7s?purpose=inline)

4

ساختار استاندارد ایران:

* استان

* شهر

* منطقه

* خیابان

* پلاک

* واحد

* کد پستی

* گیرنده

* شماره موبایل

# فصل ۱۶ — Notifications Engine

![Notification Panel designs, themes, templates and downloadable graphic elements on Dribbble](https://images.openai.com/static-rsc-4/PI3q-AF9vXRE9gToYbruxdynaHwvPTar6uG8FeZM2JjYwpJegx_HxPtDta2AHem78gq7FE93X6BijFgG3M-ZHcJRiHy9WzDzBXYiNcXK1ORCuTVDt4tCehI_W1UwxT9yQAz2esUEqRtj9Dv4T4sos70SFdrc8oV78wVayzkZDVg?purpose=inline)

![The best solution for sending product & customer emails](https://images.openai.com/static-rsc-4/VS11e1kQs8DIqtKxhr-JYZo5rHkhTp_a0ozX1n-CHWjNJPiF8OvCATK-Oh8WVDKYdOjdDjudhwnTRA_zsCUoMye13pdGWP34lRIgy3_Eg8owKyYbBWvY8kriJYm9qXEspM3kiWn4CTCZbMqgM60lxIt_XCy6F5bwrk72WxoLbZ4?purpose=inline)

![Graphical SMS launch, for more attractive SMS campaigns - Email Marketing Blog - Newsman](https://images.openai.com/static-rsc-4/g8DpMwPclU6aBzeyMgM1cn3sU-ae2fFntRKMjESJAN5j7HDSIoVoqNF_9yEETBlinBBlxuaQMyOR3ZSnJjZnIlAXBaMUuMX3dZYqOwxOGsVX8vNcCMssAxANO4ExQa3n_XWGF884BXTQlXvtKIzujdf5X29Xm5y9JthXf-Mr2rA?purpose=inline)

5

Channel ها:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">کانال</td><td data-d-component="table-cell" data-d-valign="start">Provider</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">SMS</td><td data-d-component="table-cell" data-d-valign="start">ملی پیامک، کاوه نگار...</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Email</td><td data-d-component="table-cell" data-d-valign="start">SMTP / SES</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Push</td><td data-d-component="table-cell" data-d-valign="start">Firebase</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">WhatsApp</td><td data-d-component="table-cell" data-d-valign="start">Business API</td></tr></tbody></table>

Template Engine:

* Variables

* Localization

* Queue

* Retry

# فصل ۱۷ — Analytics Engine

![Data warehouse for ecommerce | resilo data warehouse](https://images.openai.com/static-rsc-4/q_U_PgRE5FirOiq9gmOtCyxWmn8aqqjlyv9OHLBDUTFnyvGZfYc8RB0G0f8UKZOOKAjg6RQfrTi17PlziBYn6oNbFJmXnXGIlxRHHO3zgkOiK6oPBxvSagtUz7EA9ENtAjTrS5TOJzL8BCke_CipxMc7TqHSTsEGU0w6e64AxCE?purpose=inline)

![Retail Inventory Management Dashboard | Bold BI](https://images.openai.com/static-rsc-4/2sJkhlZZpJgMk4oxxEY377sYuBg_bmAvSLQ_p4GMeMvNHsoZ40sJ2vvmqrI3GUBCrzjneuruccPs2fviLnycY8NUBpxd6b9ahDv01n6caGlCFDYKWm2o51qiTwKGA9umG6p1dgi4eGj93FijMBnECKthEgQrFYfuEe4w4RZdpsA?purpose=inline)

![Ecommerce Revenue & Profit Dashboard by Qasim Ali on Dribbble](https://images.openai.com/static-rsc-4/b1qxag8bi1d58hkC_NeEMxXkM9lPd1YrnKSQmsrnVLjhARhBFZrFrXqP1wwL9iZPIAUUajfUj6uOT3b3Y8IPA0m2wvKPrLYYtKzuqAlMBtqc1eux2Tx1FUhM-jICNK9AS39XtLTXDGsZV1mHTYYNm-uY-4ZRSg1NMCxixwYWmbY?purpose=inline)

6

Dashboard ها:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Dashboard</td><td data-d-component="table-cell" data-d-valign="start">Metrics</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Sales</td><td data-d-component="table-cell" data-d-valign="start">Revenue، AOV، Conversion</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Products</td><td data-d-component="table-cell" data-d-valign="start">Top Selling</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Customers</td><td data-d-component="table-cell" data-d-valign="start">LTV، Retention</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Inventory</td><td data-d-component="table-cell" data-d-valign="start">Out of Stock، Aging</td></tr></tbody></table>

# فصل ۱۸ — Returns / Refunds (RMA)

![Order Fulfilment Software - Ectaro](https://images.openai.com/static-rsc-4/QbYD0goHk6q54cs5EtSD10ACLqDUOUSedYpgnNCGYo0lJ0lblK999eL-jdk2qSa7btJtfPELro5vAIi3Syd2ldl4R71Q-JdEQ0BckNDJDwTaIQFeA1myL0Qs74WN7QWzNAmW38SGy61C0T-Ag3_sz9xx-DtS05wTVUj1mRUxsFE?purpose=inline)

![Filtering and Tracking RMAs](https://images.openai.com/static-rsc-4/tRmBt2y1r6ZrJyTzjQGWRxvyDiawVTgZtYkerfw-25cXlr2_3139nTUZNgHQMyPGHzie4xxHlZLvjyJmpm1jV5W2VmOLKj8TN7iH48pkbixaxxFIDCcRDyr7FSbisWfcJaJiYvN2xNW_gBWGImecnecniVlazZYKvHTgfr2KyAg?purpose=inline)

![Reliable Returns Management Solutions | Atomix](https://images.openai.com/static-rsc-4/SNyqOxBvc7fC8R9qvKLNvSdqN0buaJYWBxdxaLbMAeGFqkVFZt9u7i4rRdgM8R9H9rIqtjfh1w0cfWW8AlT1533T4ectuPUPzdQuvHRUczirdWNmixC8WYrgLFpxlMjP4FV0Pk1iMZ5K_Tk-rAerSk489391ihQ_r9gi53C1ogs?purpose=inline)

5

Workflow:

![What Is Returns Management for Multi-Channel Sellers](https://images.openai.com/static-rsc-4/UeLQGjmzIiJuAdq4Nve1e9RIgn1Bns4p6eMl5Ngch2yy0JANbRXMa04F7ziarnBgfTt_sKg4vT91c7qhzifXkgSfLzBOlIAQhUDlGCvEVKn8jYTt_aSHFLLNYbVBq1S1rhK-iH_Xx921QGFNR04aBVvuobJMvhgfTUjO3I_NH_k?purpose=inline)

![What Is a Return Label? Meaning, Examples & Benefits for E-commerce](https://images.openai.com/static-rsc-4/CX6xSjlcR7ku4Ws-keQdQg8Dpize6heAhq_297ns9wtfLoNyXxSS326oSvJ7_tSw4gqHQ6J6CM3Qkv9BVtwCYgvACu9jWJTBOabbT1Qm-A-q6WFYih8inn0fcFl12JmLSF_s9QmEBCsRbHSUYiJKdqc_ZscWX_Wb8VJt1gs4DFg?purpose=inline)

![A Complete Guide to eCommerce Returns Management in Fashion](https://images.openai.com/static-rsc-4/-YwbfW_4Yj-QIquftG5RVkgT2LGCfXpS1lvVYuP8p6MGo3wtvscra56P9cOiWppAkagdiIDHfku3lLwyNJz0Vs0X3e7NtKnYcFoF9_lqZ348Bhb-So1XV4lBYA5kAVMMJJGz3z08vdunN-WElKiVeM6V2tOqV0NcLew8TEwQFFA?purpose=inline)

5

جداول:

* return_requests

* return_items

* inspections

* refunds

# فصل ۱۹ — Import / Export Engine

![How to Create CSV Files (WooCommerce CSV Import Example)](https://images.openai.com/static-rsc-4/hyEs2gindxBBgi1oplBG8g4lEOF7h29KaZxaRzTIzpKaATRaoMP2OvHX8viUp01rYnhp0oAbB00B1-d09FkwdgPCCz_bl6UodfFMoKhjSXW3TyX4VxlCfiWxsDvZsg7LOrdjz22iCd4NX73tcAI2fpL99TdiMDKZvQXPU1owSso?purpose=inline)

![How to Import WooCommerce Products with Images - Iconic](https://images.openai.com/static-rsc-4/AF6QtwFBh4QpSDloTYrAQmuubNvyRF7_G9yX4y0UqYAELK0NgBYqWzvXNvLr_acN43sb__FdtTK_g4ebIatiHo4BWxhFZ8tIge1waMUunpp_lMeEX6RwaC5gi_Ww-ClteUG8Bt9AxzJz9ncIpLPGZ20n8hl1unuRU1EccVEv1mc?purpose=inline)

![Essential Guide To Uploading Bulk Products On BigCommerce](https://images.openai.com/static-rsc-4/LDehy_kuHdnmTBcD5cbwsSFhzayLr482ssF0UNuFZHJiIVR6I1BesPZwn6r3sgpKXLgEpEa7FKedweJxBsv05a_gBCblODyufzQFL9gXTqRNHGQ4QubrKm8Uk8OUzZ_3Tl6wHWuyUjBq4625i-4ZEaxaU3dKMnBbNbMEwZ1xG-4?purpose=inline)

پشتیبانی:

* CSV

* Excel

* JSON

* XML

Features:

* Mapping

* Validation

* Preview

* Rollback

* Batch Import

# فصل ۲۰ — B2B Module

![B2B Portal & Sales Reps | DivSuite - Wholesale and Field Sales](https://images.openai.com/static-rsc-4/QQJXln7_fWmslXtHfsjPkLsp5M_aGf1qAEdub4A7lG7OAQnOUl0_kC5Du45zfPwuJlSmrSLYY2RP-CUAZzE8lNPCw_CHCafKYGBQLqdC6iBZ3VQqoE-WhASGmrDmVtEO9o53aa8_xM6-SMagDJN6p5qXOu8ox7YWIs5-lnUGfpc?purpose=inline)

![Shopify B2B Tools Now Available for All Merchants: Complete Guide
– Ecomheroes](https://images.openai.com/static-rsc-4/FlvhLPAMPYO6zKbtMrYZMFXza2EQYD64_pw7nnEqbCRsArt_a0reoNbKWHo-yGVYYzklauuIhPtOP528__Ub6OyAZXrmcG5NPkCCDpqmv8hwLO3xI_SuOVXHwrvGnVMV70ELRU1NxjJzO29xR6cWLoZfK7zQ49O4Z_A-lfTU1P0?purpose=inline)

![AI-Powered Wholesale Ecommerce Platform | CommerceWAVE](https://images.openai.com/static-rsc-4/iYIHjM7J8h2GbMJa3PyvdJyAMWs9AV2Ph3ok48w11AKKMdiIzYIqXkGDo8SweA2BmhWBCYptCG4lOTuACRfsJM7MLTXTqwAlDxQWpwaQYeargDtVC07icRSOdOWcNcIPR5bJgFvdemopo6vs6uFbWhZ2zicy_L3rDEfviNZ_jVk?purpose=inline)

6

ویژگی‌ها:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Feature</td><td data-d-component="table-cell" data-d-valign="start">توضیح</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Organization</td><td data-d-component="table-cell" data-d-valign="start">شرکت‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Multiple Buyers</td><td data-d-component="table-cell" data-d-valign="start">چند کاربر برای شرکت</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Approval Workflow</td><td data-d-component="table-cell" data-d-valign="start">تایید سفارش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Credit Limit</td><td data-d-component="table-cell" data-d-valign="start">اعتبار خرید</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Quotation</td><td data-d-component="table-cell" data-d-valign="start">پیش فاکتور</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Contract Pricing</td><td data-d-component="table-cell" data-d-valign="start">قیمت اختصاصی</td></tr></tbody></table>

# فصل ۲۱ — سیستم مالی ایران

![انواع صورتحساب در سامانه مودیان و کارپوشه مالیاتی](https://images.openai.com/static-rsc-4/vZnfuQpZD5wA5_pjcqC4Mk3WWRn_b-OQhYIWPz8EM-OV8-6jeHT5cbYqLektEOQjELCNic4vyOQoiZSuSOPd5MrbSFsVbDKP7P4mdhGq-CLJYuLzsQtT9flMO9vG_EQBs9aRWwmybE0MUAEtBwgZvyZnQeen4PRlt76IgJaMG7Y?purpose=inline)

![صورتحساب الکترونیکی نوع اول (A4-L) - نرم افزاری محسن](https://images.openai.com/static-rsc-4/nNvKf_54pXvAtiegZdFwEM52XfO75oodKTR6yi8vM0ogKK--3x_YEoc6kcEyopJdnNi5IBSEg9ayOUy0ZnOyIFQrUjK8UncXD2foLwMwI6jUxif4d1S-7a-DwiNgkb6Dvn9p5bDFqRPm-PYaNmhZm1FYzQdQpdanhQsQb5_mYx8?purpose=inline)

![نرم افزار حسابداری انلاین و تحت وب رایگان ابری](https://images.openai.com/static-rsc-4/T343ePMu1ec2sN26tgrWusyf4T51uEpS8SJZKIBDohaCbXW62WeOLjdhvM1lNiPTflNs5jTsc9zV8CYWfU-jUmYSBtdcVF1n5IX0_djy4kCrCq7xgF7ImbsN8DXIBEbWOo3I56Zf5trq0n4asGxAV5xQYXDJpu5ClGB06t0AIQA?purpose=inline)

5

### پشتیبانی کامل قوانین ایران

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">قابلیت</td><td data-d-component="table-cell" data-d-valign="start">توضیح</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">تومان / ریال</td><td data-d-component="table-cell" data-d-valign="start">نمایش و ذخیره مجزا</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">مالیات ارزش افزوده</td><td data-d-component="table-cell" data-d-valign="start">۹٪، قابل تنظیم</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شناسه کالا</td><td data-d-component="table-cell" data-d-valign="start">سامانه مودیان</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شناسه یکتا</td><td data-d-component="table-cell" data-d-valign="start">فاکتور رسمی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شمسی</td><td data-d-component="table-cell" data-d-valign="start">تقویم جلالی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">فاکتور رسمی PDF</td><td data-d-component="table-cell" data-d-valign="start">استاندارد ایران</td></tr></tbody></table>

# فصل ۲۲ — Permissions / RBAC

![AdminOS: Redesigning Role Management for the Modern Enterprise | by Manvendra Pratap | Dec, 2025 | Medium](https://images.openai.com/static-rsc-4/A1NR_0obGn7lfqexlMhHejpjFtbssgBFK6r-8MAD_ukVadKEMQGi1Rv2Ke8MOvWRa4TMgnvaF2jnZC-YvFjPqOoAHYknex7HiascGf3MK7kmGa6_NIUmp060cNnmbkLOep0lkvMr2wwFSSqGWSnT53cpgndJDi9P5wGQfJVt0Jk?purpose=inline)

![MAC, DAC, RBAC, and FGA: A Journey Through Access Control](https://images.openai.com/static-rsc-4/3NIeQ59i_02lhIrbmeMTWayXyIeTtGYL7Idl0CA0SqBqR-4XzjKzVt6f_LFT4IxHR1KIMspWm9CFaPct4TC855GbdOfx6iONW7OW5C5EPorxF228yHUGPKM479gY3MIp4_drFx8PoE5S9zaLAT55HyWjyhXF0vC0sri1LCWflho?purpose=inline)

![Appsheet Inventory Management System & Template | Barcode Scanner | Stock Tracker for Small Business | Digital Download - Etsy Ireland](https://images.openai.com/static-rsc-4/jXl5ohqaniQOK9UGWu4V-6BQ51mKXIdT6w2nhuJlaiHw681DyLyNekr-JC0-2NFZ3ISOd28BPFn0nmkvy6TYzwgGuHxkH0vs9ZYhm4QZ6Ieecmz2RdB8PmsEVfS2OLrvfrWu8gTPYg-VPNhhtgvYauJlSQnhLd_fGj3Lk2jm9Iw?purpose=inline)

6

Role ها:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Role</td><td data-d-component="table-cell" data-d-valign="start">دسترسی</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Super Admin</td><td data-d-component="table-cell" data-d-valign="start">همه چیز</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Manager</td><td data-d-component="table-cell" data-d-valign="start">فروشگاه</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Warehouse</td><td data-d-component="table-cell" data-d-valign="start">انبار</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Support</td><td data-d-component="table-cell" data-d-valign="start">سفارش</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Finance</td><td data-d-component="table-cell" data-d-valign="start">پرداخت و Refund</td></tr></tbody></table>

Permission Matrix سطح رکورد.

# فصل ۲۳ — Audit Log

تمام تغییرات ثبت شوند.

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Field</td><td data-d-component="table-cell" data-d-valign="start">مثال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">User</td><td data-d-component="table-cell" data-d-valign="start">Ali</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Entity</td><td data-d-component="table-cell" data-d-valign="start">Product</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Action</td><td data-d-component="table-cell" data-d-valign="start">UPDATE PRICE</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Before / After</td><td data-d-component="table-cell" data-d-valign="start">JSONB Diff</td></tr></tbody></table>

# فصل ۲۴ — Search Engine

![Advanced federated search experience for ecommerce - Algolia](https://images.openai.com/static-rsc-4/1tDTzzfzK3MYWlEYPUlqUBHMt48-aNeazP4fEFXwzxjUj02ia2jRTZD4VFXZx0gvBntDB1n4A09_rz1ghwiCgqzdxyU78DvzJ36_p29AA7JueJPs_PPuLnuUm1v92tCWw9Jm_mA-Fg2eSTeuXh9o8aCm8-lBy3wTqGJiVDmh73M?purpose=inline)

![16 Ecommerce Best Practices to Grow Traffic & Sales](https://images.openai.com/static-rsc-4/2ZIlmE-GQ7N2kY_c70pqlhtvEbAb7NFHLKTOFazdF4TtoKg2Lx300LRBpDIBYJGjKGJHoAbY1SKUUWJAJrQz3_h4R0WpXRjbd3d1L0UmIZkyJZQXU3K6v4ukK2IZNwOHERWVdTZlzFc3EyQYvQsha7IKJ3RmX2MmSEMY3tVZsWw?purpose=inline)

![Best of JS • Algolia Autocomplete.js](https://images.openai.com/static-rsc-4/dqSubBQpELw6hvfJhXiiXAseGYj5BUVKV-j0EPD3I8cY_fpoheccXpgdd4VqJj2mtPq7O0YK0AahIqqcGJaqYFw9KOc-oEpx0-ZKer_trpZTE_9nDjllVUK3eqS3LpA1yiSKcwXGHKvkJEn4QA_LBjEEasUg37sFIWTrCuqMivw?purpose=inline)

5

ویژگی‌ها:

* Full Text Search

* Fuzzy

* فارسی

* مترادف

* پیشنهاد لحظه‌ای

* فیلتر ترکیبی

Facets:

* برند

* قیمت

* رنگ

* موجودی

* امتیاز

# فصل ۲۵ — معماری Database (Best Practice PostgreSQL)

## حدود ۸۰ جدول اصلی

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Domain</td><td data-d-component="table-cell" data-d-valign="start">تعداد جدول</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Catalog</td><td data-d-component="table-cell" data-d-valign="start">15</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Inventory</td><td data-d-component="table-cell" data-d-valign="start">10</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Orders</td><td data-d-component="table-cell" data-d-valign="start">12</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Payments</td><td data-d-component="table-cell" data-d-valign="start">8</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Customers</td><td data-d-component="table-cell" data-d-valign="start">10</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Marketing</td><td data-d-component="table-cell" data-d-valign="start">12</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Shipping</td><td data-d-component="table-cell" data-d-valign="start">8</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Analytics</td><td data-d-component="table-cell" data-d-valign="start">5</td></tr></tbody></table>

## PostgreSQL Features

حتماً استفاده شود:

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Feature</td><td data-d-component="table-cell" data-d-valign="start">کاربرد</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">UUID</td><td data-d-component="table-cell" data-d-valign="start">ID ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">JSONB</td><td data-d-component="table-cell" data-d-valign="start">Metadata</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">GIN Index</td><td data-d-component="table-cell" data-d-valign="start">جستجوی Attribute</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Partial Index</td><td data-d-component="table-cell" data-d-valign="start">محصولات فعال</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Materialized View</td><td data-d-component="table-cell" data-d-valign="start">Analytics</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Generated Columns</td><td data-d-component="table-cell" data-d-valign="start">Search</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Triggers (کم)</td><td data-d-component="table-cell" data-d-valign="start">Ledger Integrity</td></tr></tbody></table>

# فصل ۲۶ — Event Driven Architecture

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20360%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%22270%22%20y%3D%2220%22%20width%3D%22220%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2250%22%20fill%3D%22white%22%20text-anchor%3D%22middle%22%3EEvent%20Bus%3C%2Ftext%3E%3Crect%20x%3D%2220%22%20y%3D%22120%22%20width%3D%22170%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22105%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EOrder%20Created%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2270%22%20x2%3D%22105%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22220%22%20y%3D%22120%22%20width%3D%22170%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22305%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EPayment%20Captured%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2270%22%20x2%3D%22305%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22470%22%20y%3D%22120%22%20width%3D%22170%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22555%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EInventory%20Reserved%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2270%22%20x2%3D%22555%22%20y2%3D%22120%22%20stroke%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22120%22%20y%3D%22240%22%20width%3D%22170%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22205%22%20y%3D%22270%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3EShipment%20Created%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2270%22%20x2%3D%22205%22%20y2%3D%22240%22%20stroke%3D%22%2316a34a%22%2F%3E%3Crect%20x%3D%22390%22%20y%3D%22240%22%20width%3D%22170%22%20height%3D%2250%22%20rx%3D%2210%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22475%22%20y%3D%22270%22%20text-anchor%3D%22middle%22%20font-size%3D%2213%22%3ESMS%20Sent%3C%2Ftext%3E%3Cline%20x1%3D%22380%22%20y1%3D%2270%22%20x2%3D%22475%22%20y2%3D%22240%22%20stroke%3D%22%2316a34a%22%2F%3E%3C%2Fsvg%3E)

رویدادها:

* ProductPublished

* InventoryChanged

* OrderCreated

* PaymentVerfied

* ShipmentDelivered

* RefundCompleted

* MembershipActivated

* SubscriptionRenewed

# فصل ۲۷ — API First Design

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">API Group</td><td data-d-component="table-cell" data-d-valign="start">نمونه Endpoint</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Catalog</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/products</code></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Orders</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/orders</code></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Inventory</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/inventory</code></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Checkout</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/checkout</code></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Payments</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/payments</code></p></td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">Customers</td><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><code class="er4J8W_Code" data-d-component="code">/customers</code></p></td></tr></tbody></table>

پشتیبانی:

* REST

* GraphQL

* Webhooks

* Idempotency-Key

# فصل ۲۸ — قابلیت‌های مخصوص ایران (ضروری)

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">ماژول</td><td data-d-component="table-cell" data-d-valign="start">جزئیات</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">تقویم شمسی</td><td data-d-component="table-cell" data-d-valign="start">ذخیره UTC + نمایش Jalali</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">واحد پول</td><td data-d-component="table-cell" data-d-valign="start">IRR/Toman همزمان</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">کد ملی</td><td data-d-component="table-cell" data-d-valign="start">Validation</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">شناسه ملی شرکت</td><td data-d-component="table-cell" data-d-valign="start">B2B</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">سامانه پیامکی</td><td data-d-component="table-cell" data-d-valign="start">Provider Interface</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">پست ایران</td><td data-d-component="table-cell" data-d-valign="start">API رهگیری</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">استان و شهر</td><td data-d-component="table-cell" data-d-valign="start">Dataset استاندارد</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">مالیات ایران</td><td data-d-component="table-cell" data-d-valign="start">VAT Rule Engine</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">فاکتور رسمی</td><td data-d-component="table-cell" data-d-valign="start">PDF + QR</td></tr></tbody></table>

# نسخه نهایی پیشنهادی (Enterprise Roadmap)

<table class="_6IUVGW_Table" data-d-column-sizing="equal" data-d-dividers="" style="table-layout: fixed;"><tbody><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start">سطح</td><td data-d-component="table-cell" data-d-valign="start">ماژول‌ها</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Core Commerce (MVP)</span></p></td><td data-d-component="table-cell" data-d-valign="start">Catalog، Variants، Inventory Ledger، Cart، Checkout، Orders، Payments، Shipping، Customers، Coupons، Wallet، Notifications</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Advanced Commerce</span></p></td><td data-d-component="table-cell" data-d-valign="start">Bundles، Composite Products، Add-ons، Dynamic Pricing، Wishlist، Gift Cards، Loyalty، Reviews، Multi Warehouse، Returns، Analytics</td></tr><tr data-d-component="table-row"><td data-d-component="table-cell" data-d-valign="start"><p class="w6asjq_TextBase _85PZeG_Text" data-d-component="text"><span class="w6asjq_TextBase _85PZeG_Text" data-d-component="text" data-d-default-strong="" data-d-inline="">Enterprise / ایران</span></p></td><td data-d-component="table-cell" data-d-valign="start">B2B Organizations، Memberships، Subscriptions، Bookings، Multi Vendor، Audit Log، Event Bus، سامانه مودیان، فاکتور رسمی، پیامک، درگاه‌های ایرانی، تقویم شمسی، API/Webhooks</td></tr></tbody></table>

## پیشنهاد معماری برای ساخت با Agent

برای اینکه Agent بتواند این سیستم را بدون بن‌بست پیاده‌سازی کند، بهتر است این پروژه را به یک مستند ۳۰ تا ۴۰ فصل تبدیل کنیم که هر فصل شامل موارد زیر باشد:

1. Domain Analysis (تمام قوانین کسب‌وکار).

2. ER Diagram کامل آن ماژول.

3. PostgreSQL Schema با تمام جداول، ایندکس‌ها، Constraintها و Triggerهای لازم.

4. API Specification (REST + GraphQL + Webhooks).

5. Service Layer و Use Caseها.

6. Event List و تعامل با سایر ماژول‌ها.

7. Performance Best Practices (Indexing، Caching، Pagination، JSONB، Full-text Search).

8. Iran-specific Rules (تومان، مالیات، پیامک، پست، فاکتور رسمی و ...).

این ساختار برای تولید یک Commerce Engine در سطح Enterprise مناسب است و از نظر طراحی دیتابیس و توسعه، بسیار منظم‌تر از تقلید مستقیم ساختار WooCommerce خواهد بود.
