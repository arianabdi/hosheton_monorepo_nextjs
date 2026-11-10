# Referral System — Implementation Specification

## 1. هدف سیستم

یک سیستم Referral قابل تنظیم، ساده و قابل مدیریت ایجاد کن که Admin بتواند بدون تغییر کد، کمپین‌های Referral مختلف ایجاد کند.

سیستم باید این مدل‌ها را پشتیبانی کند:

1. پاداش به ازای ثبت‌نام موفق Referral
2. پاداش به ازای اولین پرداخت Referral
3. پاداش درصدی از اولین پرداخت
4. پاداش درصدی از تمام پرداخت‌های Referral
5. پاداش نقدی ثابت
6. پاداش مرحله‌ای بر اساس تعداد Referralهای موفق
7. امکان ترکیب چند Rule در یک Campaign
8. محدودیت، زمان انقضا و شرایط eligibility
9. Pending / Approved / Rejected برای Reward
10. Anti-fraud پایه

هدف اصلی:

> Admin بتواند اکثر Referral Campaignها را بدون نیاز به Developer بسازد.

---

# 2. مفاهیم اصلی

سیستم را بر اساس این Entityها طراحی کن:

* ReferralCampaign
* ReferralRule
* ReferralTier
* Referral
* ReferralEvent
* ReferralReward
* ReferralCode / ReferralProfile
* FraudReview

رابطه کلی:

Campaign
↓
Rules
↓
Tiers (optional)
↓
Referral Events
↓
Eligibility Check
↓
Reward Calculation
↓
Pending Reward
↓
Approved / Rejected
↓
Reward Granted

---

# 3. ReferralCampaign

هر Campaign یک برنامه Referral مستقل است.

مثال:

Campaign:
"Summer Referral 2026"

Fields:

```text
id
name
description
status
start_at
end_at
max_rewards_per_customer
new_customer_only
minimum_order_amount
review_period_days
created_at
updated_at
```

Status:

```text
DRAFT
ACTIVE
PAUSED
ENDED
```

### نکته

Campaign نباید مستقیماً فقط یک reward داشته باشد.

هر Campaign می‌تواند چند Rule داشته باشد.

---

# 4. ReferralRule

Rule مشخص می‌کند:

> چه اتفاقی باید رخ دهد تا Reward ایجاد شود؟

هر Rule دارای یک Trigger است.

Triggerهای MVP:

```text
SIGNUP
FIRST_PAYMENT
PAYMENT
```

در آینده امکان اضافه‌کردن موارد زیر وجود داشته باشد:

```text
FIRST_ORDER
ORDER_COMPLETED
SUBSCRIPTION_STARTED
SUBSCRIPTION_RENEWED
```

اما در MVP فقط سه Trigger اصلی را پیاده‌سازی کن.

---

# 5. ReferralRule ساختار

```text
ReferralRule

id
campaign_id

name

trigger_type

reward_type

reward_value

reward_cap

minimum_transaction_amount

conditions

is_active

priority

created_at
updated_at
```

### trigger_type

```text
SIGNUP
FIRST_PAYMENT
PAYMENT
```

### reward_type

```text
FIXED_AMOUNT
PERCENTAGE_OF_PAYMENT
PERCENTAGE_OF_FIRST_PAYMENT
PERCENTAGE_OF_PROFIT
```

---

# 6. مثال Ruleهای ساده

## Example 1 — پول به ازای ثبت‌نام

```text
Trigger:
SIGNUP

Reward:
FIXED_AMOUNT

Value:
50,000
```

یعنی:

> به ازای هر Referral که ثبت‌نام موفق انجام دهد، 50,000 تومان پاداش.

---

## Example 2 — پول به ازای اولین پرداخت

```text
Trigger:
FIRST_PAYMENT

Reward:
FIXED_AMOUNT

Value:
100,000
```

---

## Example 3 — درصد از اولین پرداخت

```text
Trigger:
FIRST_PAYMENT

Reward:
PERCENTAGE_OF_FIRST_PAYMENT

Value:
10%

Cap:
500,000
```

اگر اولین پرداخت:

1,000,000

باشد:

Reward:

100,000

---

## Example 4 — درصد از هر پرداخت

```text
Trigger:
PAYMENT

Reward:
PERCENTAGE_OF_PAYMENT

Value:
5%

Cap:
1,000,000
```

اگر کاربر:

```text
Payment 1 = 1M
Payment 2 = 2M
Payment 3 = 500K
```

Reward:

```text
50K
100K
25K
```

---

# 7. مفهوم Profit

اگر Reward بر اساس Profit باشد، سیستم نباید خودش Profit را حدس بزند.

بهتر است Order/Payment دارای مقدار مشخصی باشد:

```text
payment_amount
profit_amount
```

و Rule بتواند مشخص کند:

```text
PERCENTAGE_OF_PROFIT
```

مثلاً:

```text
Profit = 500,000
Reward = 10%
```

نتیجه:

```text
50,000
```

---

# 8. Tiered Referral

این بخش باید به‌صورت Optional روی Rule فعال شود.

مثلاً:

```text
Tiered Reward = true
```

سپس Tierها:

```text
Tier 1
0 - 2,000
Fixed = 50,000

Tier 2
2,001 - 10,000
Percentage of Profit = 5%

Tier 3
10,001+
Percentage of Profit = 10%
```

Entity:

```text
ReferralTier

id
rule_id

min_count
max_count

reward_type
reward_value

created_at
updated_at
```

برای آخرین Tier:

```text
max_count = NULL
```

---

# 9. نکته بسیار مهم در Tier

مشخص کن که Tier بر اساس چه چیزی محاسبه می‌شود.

Field:

```text
tier_metric
```

مقادیر:

```text
SUCCESSFUL_REFERRALS
TOTAL_REFERRAL_REVENUE
TOTAL_REFERRAL_PROFIT
```

مثلاً:

```text
tier_metric = SUCCESSFUL_REFERRALS
```

یعنی Tier بر اساس تعداد Referralهای موفق تعیین می‌شود.

---

# 10. Tier Calculation

فرض کن:

```text
Tier 1:
0 - 2000
Fixed 50,000

Tier 2:
2001 - 10000
5% Profit

Tier 3:
10001+
10% Profit
```

وقتی Referral شماره 2500 موفق شود:

سیستم باید بررسی کند:

```text
successful_referrals = 2500
```

بنابراین Rule فعال:

```text
Tier 2
```

و Reward مربوط به Referral/Payment جدید با Tier 2 محاسبه شود.

---

# 11. مهم: Tier باید Snapshot شود

بعد از ایجاد Reward، اطلاعات Tier همان لحظه باید داخل Reward ذخیره شود.

مثلاً:

```text
Reward

amount = 250,000

calculation_type = PERCENTAGE_OF_PROFIT

calculation_value = 5

tier_id = 2

tier_snapshot = {
    "min_count": 2001,
    "max_count": 10000,
    "reward_type": "PERCENTAGE_OF_PROFIT",
    "reward_value": 5
}
```

علت:

اگر Admin بعداً Campaign را تغییر داد، Rewardهای قدیمی نباید تغییر کنند.

---

# 12. Referral

هر Referral یک رابطه بین Advocate و Referred User است.

```text
Referral

id

campaign_id

advocate_customer_id
referred_customer_id

referral_code
attribution_id

status

registered_at
converted_at

created_at
updated_at
```

Status:

```text
PENDING
QUALIFIED
REWARDED
REJECTED
EXPIRED
```

---

# 13. ReferralEvent

تمام اتفاقات مهم Referral را Event-based ذخیره کن.

```text
ReferralEvent

id

referral_id

customer_id

event_type

event_id

amount
profit_amount

metadata

created_at
```

Event Type:

```text
CLICK
SIGNUP
PAYMENT
FIRST_PAYMENT
ORDER_COMPLETED
REFUND
CANCELLED
```

این Event Log برای Debugging و Support بسیار مهم است.

---

# 14. ReferralReward

Reward باید Entity مستقل باشد.

```text
ReferralReward

id

referral_id
campaign_id
rule_id
tier_id

advocate_customer_id

event_id

reward_type

reward_value

base_amount

calculated_amount

currency

status

available_at

approved_at
paid_at

rejection_reason

calculation_snapshot

created_at
updated_at
```

Status:

```text
PENDING
APPROVED
PAID
REJECTED
CANCELLED
```

---

# 15. Calculation Snapshot

هر Reward باید دقیقاً مشخص کند چرا و چگونه این مبلغ محاسبه شده است.

مثلاً:

```json
{
  "trigger": "FIRST_PAYMENT",
  "reward_type": "PERCENTAGE_OF_PROFIT",
  "percentage": 5,
  "profit_amount": 500000,
  "calculated_amount": 25000,
  "tier": {
    "min_count": 2001,
    "max_count": 10000
  }
}
```

این اطلاعات نباید بعداً از Rule دوباره محاسبه شود.

---

# 16. Rule Conditions

برای اینکه سیستم در عین سادگی قابل توسعه باشد، Conditions را محدود ولی قابل استفاده طراحی کن.

مثلاً:

```text
minimum_order_amount
minimum_profit_amount
new_customer_only
first_payment_only
```

نمونه:

```json
{
  "new_customer_only": true,
  "minimum_order_amount": 500000
}
```

در MVP یک Rule Engine عمومی و پیچیده نساز.

یعنی چیزی شبیه:

```text
IF
AND
OR
NOT
Greater Than
Less Than
Contains
...
```

نساز.

این کار سیستم را unnecessarily پیچیده می‌کند.

---

# 17. Rule Priority

اگر یک Campaign چند Rule داشته باشد، Ruleها باید Priority داشته باشند.

مثلاً:

```text
Rule 1
SIGNUP
50,000

Priority = 1

Rule 2
FIRST_PAYMENT
100,000

Priority = 2
```

اما به‌صورت پیش‌فرض یک Event نباید بتواند چند بار برای یک Rule مشخص Reward ایجاد کند.

برای جلوگیری از Duplicate Reward:

```text
UNIQUE(
    referral_id,
    rule_id,
    event_id
)
```

---

# 18. Reward Stacking

در MVP به‌صورت پیش‌فرض:

```text
stacking = false
```

یعنی اگر یک Event چند Rule را match کرد، فقط یک Reward ایجاد شود.

در صورت نیاز Campaign می‌تواند داشته باشد:

```text
allow_multiple_rewards = true
```

ولی این قابلیت را default نکن.

---

# 19. Referral Attribution

Referral باید از طریق Referral Link یا Code ایجاد شود.

مثال:

```text
https://example.com/r/ALI123
```

وقتی کاربر وارد شود:

```text
referral_code = ALI123
```

ذخیره شود.

پس از Signup:

```text
advocate_customer_id = Ali
referred_customer_id = NewUser
campaign_id = Campaign
```

ایجاد شود.

---

# 20. Attribution Rules

در MVP:

### یک Referred Customer فقط یک Advocate داشته باشد.

یعنی:

```text
Customer X
      ↓
Advocate A
```

و نباید همزمان:

```text
Advocate B
```

باشد.

اگر Customer قبلاً attributed شده باشد، Referral جدید ایجاد نشود.

---

# 21. Existing Customer

اگر Campaign دارای:

```text
new_customer_only = true
```

باشد:

کاربرانی که قبلاً Customer بوده‌اند، نباید Referral محسوب شوند.

این check باید server-side انجام شود.

هرگز فقط به frontend اعتماد نکن.

---

# 22. Fraud Protection

MVP باید حداقل این موارد را داشته باشد:

### Self Referral

Advocate و Referred Customer نباید یک نفر باشند.

### Existing Customer

Customer قبلی نباید به‌عنوان New Referral ثبت شود.

### Duplicate Referral

یک Customer نباید چند بار attributed شود.

### Duplicate Reward

یک Event نباید چند Reward ایجاد کند.

### Referral Limit

مثلاً:

```text
max_rewards_per_customer = 20
```

### Suspicious Referral

در صورت مشاهده:

* same IP
* same device fingerprint
* abnormal velocity
* repeated payment method

Referral را می‌توان:

```text
SUSPICIOUS
```

کرد.

اما Fraud detection نباید در MVP به یک سیستم پیچیده تبدیل شود.

---

# 23. Admin Panel

Admin باید بتواند:

## Campaigns

```text
Campaigns
├── Create
├── Edit
├── Activate
├── Pause
└── End
```

---

# 24. Create Campaign UI

فرم ایجاد Campaign:

```text
Campaign Name

Description

Start Date
End Date

New Customer Only
[Yes]

Minimum Order Amount
[500,000]

Review Period
[7 days]

Maximum Rewards per Customer
[20]
```

بعد:

```text
Reward Rules

+ Add Rule
```

---

# 25. Add Rule UI

مثلاً:

```text
When:

[ First Payment ▼ ]

Reward:

[ Percentage ▼ ]

Value:

[ 5 ] %

Based On:

[ Profit ▼ ]

Maximum Reward:

[ 1,000,000 ]
```

یا:

```text
When:

[ Signup ▼ ]

Reward:

[ Fixed Amount ▼ ]

Value:

[ 50,000 ]
```

---

# 26. Tier UI

اگر Admin فعال کند:

```text
Enable Tiered Rewards
[ ON ]

Tier Metric:
[ Successful Referrals ]

---------------------------------

From       To          Reward

0          2,000       50,000 Fixed

2,001      10,000      5% Profit

10,001     Unlimited   10% Profit

---------------------------------

+ Add Tier
```

UI باید ساده باشد.

Admin نباید JSON یا expression بنویسد.

---

# 27. Customer Panel

Customer فقط باید این موارد را ببیند:

```text
Referral Program

Invite friends and earn rewards

Your Referral Code:
ALI123

Your Referral Link:
example.com/r/ALI123

[Copy Link]
[Share]

--------------------------------

Your Progress

Successful Referrals
1,245

Current Tier
Tier 1

Next Tier
2,000 referrals

Progress:
██████████░░░░

--------------------------------

Rewards

Pending
500,000

Available
1,200,000

Total Earned
4,500,000

--------------------------------

Referral History
```

---

# 28. Customer نباید پیچیدگی Rule Engine را ببیند

مثلاً لازم نیست این را نشان دهی:

```text
PERCENTAGE_OF_PROFIT
```

به‌جایش:

> با دعوت دوستان، تا 10٪ از سود حاصل از خرید آن‌ها پاداش می‌گیرید.

یا:

> به ازای هر ثبت‌نام موفق 50,000 تومان دریافت می‌کنید.

Business Rule را به زبان انسانی نمایش بده.

---

# 29. Progression

برای Tier Campaign حتماً Progress داشته باش.

مثلاً:

```text
1,850 Successful Referrals

Tier 1
0 → 2,000

Next Tier:
2,001 → 10,000

You need 151 more referrals
to unlock the next reward level.
```

این قسمت برای Referral Campaignهای tiered مهم است.

---

# 30. Reward Calculation Service

محاسبه Reward را در یک Service مستقل قرار بده.

مثلاً:

```text
ReferralRewardService
```

با متدهایی مانند:

```text
processEvent(event)

findEligibleCampaigns(event)

findEligibleRules(event)

checkConditions(rule, event)

resolveTier(rule, advocate)

calculateReward(rule, tier, event)

createPendingReward(...)

approveReward(...)

rejectReward(...)
```

Business logic را داخل Controllerها قرار نده.

---

# 31. Event Processing

وقتی Event اتفاق افتاد:

```text
PaymentCreated
```

سیستم:

```text
1. Find Referral
2. Find Active Campaign
3. Find Matching Rules
4. Check Conditions
5. Resolve Tier
6. Calculate Reward
7. Run Fraud Checks
8. Create Reward
9. Store Calculation Snapshot
```

---

# 32. Idempotency

این قسمت بسیار مهم است.

اگر Payment event دوبار ارسال شد، نباید دوبار Reward ایجاد شود.

از:

```text
event_id
```

برای Idempotency استفاده کن.

مثلاً:

```text
UNIQUE(
    rule_id,
    event_id,
    referral_id
)
```

همچنین Event processing باید idempotent باشد.

---

# 33. Refund / Cancellation

اگر پرداختی که Reward بر اساس آن ایجاد شده Refund شد:

اگر Reward هنوز:

```text
PENDING
```

است:

```text
CANCELLED
```

شود.

اگر Reward قبلاً:

```text
PAID
```

شده:

نباید خودکار از کاربر پول کم شود مگر اینکه Business Policy مشخصی برای clawback وجود داشته باشد.

برای MVP بهتر است:

```text
PAID reward → no automatic clawback
```

و برای آینده:

```text
clawback
```

را قابل توسعه نگه دار.

---

# 34. Audit Log

تمام تغییرات Admin روی Campaign و Reward باید Audit Log داشته باشد.

```text
AuditLog

id
actor_id
action
entity_type
entity_id
old_value
new_value
created_at
```

مثلاً:

```text
Admin Ali

Changed Campaign:
Reward 5% → 10%

Date:
2026-10-01
```

---

# 35. API پیشنهادی

APIها را تقریباً به این شکل طراحی کن:

### Customer

```http
GET /referrals/me
GET /referrals/me/stats
GET /referrals/me/history
GET /referrals/me/rewards
GET /referrals/me/link
```

### Referral

```http
POST /referrals/attribute
```

### Admin

```http
GET    /admin/referral/campaigns
POST   /admin/referral/campaigns
GET    /admin/referral/campaigns/:id
PATCH  /admin/referral/campaigns/:id

POST   /admin/referral/campaigns/:id/rules
PATCH  /admin/referral/rules/:id

POST   /admin/referral/rules/:id/tiers
PATCH  /admin/referral/tiers/:id

GET    /admin/referrals
GET    /admin/referrals/:id

GET    /admin/referral/rewards
GET    /admin/referral/fraud-reviews
POST   /admin/referral/fraud-reviews/:id/approve
POST   /admin/referral/fraud-reviews/:id/reject
```

---

# 36. مهم: Money را Float ذخیره نکن

برای Amountها:

```text
DECIMAL
```

استفاده کن.

مثلاً:

```text
reward_amount DECIMAL(18,2)
payment_amount DECIMAL(18,2)
profit_amount DECIMAL(18,2)
```

هرگز برای Money از Float استفاده نکن.

---

# 37. Currency

Reward باید Currency داشته باشد:

```text
currency
```

مثلاً:

```text
IRR
EUR
USD
```

حتی اگر فعلاً فقط یک Currency داری، این را از ابتدا در Model قرار بده.

---

# 38. وضعیت نهایی پیشنهادی

ساختار نهایی:

```text
                    Referral Campaign
                           │
                    ┌──────┴──────┐
                    │             │
                 Rules          Settings
                    │
              ┌─────┴─────┐
              │           │
           Trigger       Reward
              │           │
              │       ┌───┴────┐
              │       │        │
              │     Fixed    Percentage
              │
              └──── Conditions
                      
                       │
                 Optional Tier
                       │
             ┌─────────┼─────────┐
             │         │         │
           Tier 1    Tier 2    Tier 3
             │         │         │
             └─────────┼─────────┘
                       │
                    Referral
                       │
                  ReferralEvent
                       │
                  Reward Engine
                       │
                ReferralReward
                       │
            ┌──────────┼──────────┐
            │          │          │
         Pending    Approved     Paid
```

# 39. سه اصل مهم برای پیاده‌سازی

### اصل 1 — Campaign محور باش

به‌جای اینکه داخل Customer بگویی:

```text
referral_reward = 5%
```

بگو:

```text
Customer
   ↓
Referral
   ↓
Campaign
   ↓
Rule
   ↓
Reward
```

این باعث می‌شود بتوانی در آینده چند کمپین مختلف داشته باشی.

---

### اصل 2 — Rule قابل توسعه ولی محدود

Rule باید بتواند این موارد را پوشش دهد:

```text
Trigger
+
Conditions
+
Reward Type
+
Reward Value
+
Optional Tier
```

ولی فعلاً Rule Engine عمومی نساز.

---

### اصل 3 — Reward immutable باشد

بعد از ایجاد Reward:

```text
amount
rule
tier
calculation
```

باید snapshot شود.

تغییر Campaign نباید Reward تاریخی را تغییر دهد.

---

# 40. سناریوهای Acceptance Test

قبل از تمام‌شدن implementation این تست‌ها باید پاس شوند.

### Test 1

```text
Signup referral
Reward = 50K
```

باید یک Reward ایجاد شود.

### Test 2

```text
First payment = 1M
Reward = 5%
```

باید:

```text
50K
```

ایجاد شود.

### Test 3

```text
Payment = 1M
Profit = 400K
Reward = 10% Profit
```

باید:

```text
40K
```

ایجاد شود.

### Test 4

Customer قبلاً وجود داشته.

Referral نباید eligible باشد.

### Test 5

Advocate خودش از Referral Link خودش signup کند.

Reward نباید ایجاد شود.

### Test 6

یک Payment event دوبار ارسال شود.

فقط یک Reward ایجاد شود.

### Test 7

Tier:

```text
0-2000 = 50K
2001-10000 = 5%
10001+ = 10%
```

Referral شماره 2000:

```text
Tier 1
```

Referral شماره 2001:

```text
Tier 2
```

Referral شماره 10000:

```text
Tier 2
```

Referral شماره 10001:

```text
Tier 3
```

### Test 8

Campaign تغییر کند.

Rewardهای قبلی نباید تغییر کنند.

### Test 9

Payment refund شود.

Reward Pending باید Cancel شود.

### Test 10

دو Campaign فعال باشند.

سیستم باید طبق Campaign eligibility و priority مشخص کند کدام Rule اعمال شود و از ایجاد Reward ناخواسته جلوگیری کند.



یک پیشنهاد معماری مهم

برای چیزی که تو می‌خواهی، من Rule Engine عمومی نمی‌سازم؛ بلکه یک Configurable Referral Engine می‌سازم. تفاوتشان مهم است:

❌ Generic Rule Engine

IF
condition A
AND
condition B
OR
condition C
THEN
action X

در مقابل:

✅ Referral Engine

Trigger
+
Eligibility
+
Reward Type
+
Reward Value
+
Optional Tier

دومی هم ۸۰–۹۰٪ نیازهای واقعی Referral را پوشش می‌دهد، هم Admin می‌تواند با چند dropdown و input کمپین بسازد، و هم implementation برای AI coding agent بسیار قابل‌کنترل‌تر می‌شود.

یک نکته دیگر هم پیشنهاد می‌کنم: در مرحله بعد این specification را به Database Schema + ERD + دقیقاً JSON structure مربوط به Campaign/Rule/Tier + الگوریتم calculateReward() تبدیل کنیم؛ این بخش برای اینکه AI در کد پیاده‌سازی اشتباه نکند، بسیار مهم است.