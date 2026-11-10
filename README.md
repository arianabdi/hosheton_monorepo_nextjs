

# در صورتی که yarn پکیج شما را نصب نمیکند ممکن است به خاطر PnP باشد و شما باید روی node-module قرار بدین 

```agsl
yarn config set nodeLinker node-modules
```


# ایجاد اپلیکیشن جدید 
با استفاده از این دستور وقتی وارد فولدر اپلکیشن جدید در app شدیم محتوای پروژه را ایجاد میکنیم.

```agsl
npx create-next-app .
```


## نصب پکیج روی یکی از پروزه ها 

```
yarn workspace lingeecko add -D cross-env
```