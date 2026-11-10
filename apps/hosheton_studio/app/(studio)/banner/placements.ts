/** کلیدهای جایگاه بنر در hosheton_studio — باید با رجیستری پنل ادمین (naslyar) هماهنگ باشد */
export const BANNER_PLACEMENTS = {
    /** باکس مربعی پایین سایدبار */
    SIDEBAR_SQUARE: 'studio.sidebar.square',
    /** باکس افقی هم‌عرض چت‌باکس، زیر آن — فقط صفحه چت */
    CHAT_INPUT_BELOW: 'studio.chat.input.below',
    /** باکس افقی صفحه کیف پول — بین موجودی و نرخ دلار */
    WALLET_BALANCE: 'studio.wallet.balance',
    /** اولین کارت لیست اکسپلور */
    EXPLORE_TOP: 'studio.explore.top',
} as const;

export type BannerPlacementKey = (typeof BANNER_PLACEMENTS)[keyof typeof BANNER_PLACEMENTS];
