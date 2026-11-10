/* تنظیمات گربهٔ چت‌باکس */

export type ScenarioName = 'sleep' | 'watch' | 'ball' | 'walk';

export const SCENARIO_NAMES: ScenarioName[] = ['sleep', 'watch', 'ball', 'walk'];

export type ChatCatConfig = {
    /** زمان‌بندی خودکار؛ وقتی خاموش است فقط با play() یا ?cat= می‌آید */
    enabled: boolean;
    /** تأخیر اولین ظهور بعد از باز شدن صفحه (ثانیه، بازهٔ تصادفی) */
    firstDelay: [number, number];
    /** فاصلهٔ هر ظهور از پایان ظهور قبلی (ثانیه، بازهٔ تصادفی) */
    interval: [number, number];
    /** سناریوهای مجاز؛ هیچ‌وقت یکی دو بار پشت‌سرهم نمی‌آید */
    scenarios: ScenarioName[];
    sound: boolean;
    /** بلندی صدا (0..1) */
    volume: number;
    /** ضریب اندازهٔ گربه (اندازهٔ پایه از عرض چت‌باکس درمی‌آید) */
    size: number;
};

export const DEFAULT_CHAT_CAT_CONFIG: ChatCatConfig = {
    enabled: true,
    firstDelay: [8, 16],
    interval: [20, 60],
    scenarios: SCENARIO_NAMES,
    sound: true,
    volume: 0.25,
    size: 1,
};
