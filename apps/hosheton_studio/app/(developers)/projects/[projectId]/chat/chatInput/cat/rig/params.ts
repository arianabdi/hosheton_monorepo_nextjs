/*
 * پارامترهای ژست گربه. هر پارامتر فنر خودش را دارد، پس هر تغییری نرم و بدون پرش انجام می‌شود.
 * مختصات محلی: a = جلو (سمت سر)، b = بالا (کف = 0)، c = پهلو. زاویه‌ها درجه‌اند.
 * heading: 0 = رو به راست، 90 = رو به بیننده، 180 = رو به چپ، -90 = پشت به بیننده.
 */

export type SpringGroup = 'body' | 'legs' | 'head' | 'face' | 'ears' | 'tail' | 'motion' | 'heading' | 'squash';

type ParamSpec = { readonly v: number; readonly g: SpringGroup };

export const PARAMS = {
    heading: { v: 0, g: 'heading' },
    lift: { v: 0, g: 'squash' },
    sx: { v: 1, g: 'squash' },
    sy: { v: 1, g: 'squash' },

    // ستون بدن: سه کره (لگن، میانه، سینه)
    hipA: { v: -15, g: 'body' },
    hipB: { v: 47, g: 'body' },
    hipR: { v: 14, g: 'body' },
    midA: { v: 0, g: 'body' },
    midB: { v: 48.5, g: 'body' },
    midR: { v: 13.6, g: 'body' },
    chestA: { v: 15, g: 'body' },
    chestB: { v: 49.5, g: 'body' },
    chestR: { v: 13.3, g: 'body' },
    haunchR: { v: 8.5, g: 'body' },
    furPuff: { v: 0, g: 'body' },

    // سر
    headA: { v: 26, g: 'head' },
    headB: { v: 70.5, g: 'head' },
    headScale: { v: 1, g: 'head' },
    headTilt: { v: 0, g: 'head' },
    headNod: { v: 0, g: 'head' },
    /** چقدر سر به‌جای جهت بدن رو به بیننده بچرخد (0..1) */
    faceViewer: { v: 0.78, g: 'head' },
    /** وقتی پشت به بیننده است، سر از روی کدام شانه برگردد (-1 چپ، +1 راست) */
    lookSide: { v: 1, g: 'head' },
    /** چرخش اضافهٔ سر به سمت راست صفحه (درجه) */
    headYaw: { v: 0, g: 'head' },
    /** سوگیری عمق سر برای ترتیب رسم (بزرگ‌تر = جلوتر) */
    headZ: { v: 4, g: 'head' },

    // صورت
    eyeL: { v: 1, g: 'face' },
    eyeR: { v: 1, g: 'face' },
    eyeHappy: { v: 0, g: 'face' },
    lidAngle: { v: 0, g: 'face' },
    pupil: { v: 1, g: 'face' },
    pupilSlit: { v: 0, g: 'face' },
    gazeX: { v: 0, g: 'face' },
    gazeY: { v: 0, g: 'face' },
    mouthOpen: { v: 0, g: 'face' },
    earFlat: { v: 0, g: 'ears' },
    earPerk: { v: 0, g: 'ears' },

    // پاها: هدف پنجه (a, b) — دست جلوی نزدیک/دور، پای عقب نزدیک/دور
    pawFNa: { v: 18.5, g: 'legs' },
    pawFNb: { v: 3.4, g: 'legs' },
    pawFFa: { v: 15.5, g: 'legs' },
    pawFFb: { v: 3.4, g: 'legs' },
    pawHNa: { v: -17, g: 'legs' },
    pawHNb: { v: 3.4, g: 'legs' },
    pawHFa: { v: -19.5, g: 'legs' },
    pawHFb: { v: 3.4, g: 'legs' },
    thighN: { v: -95, g: 'legs' },
    thighF: { v: -95, g: 'legs' },
    spreadF: { v: 5, g: 'legs' },
    spreadH: { v: 6.5, g: 'legs' },

    // دم: شکل پایه (زاویهٔ هر بند از «رو به عقب»، رو به بالا مثبت) + موج روان
    tailPitch: { v: 45, g: 'tail' },
    tailCurl: { v: 80, g: 'tail' },
    tailCurlTip: { v: 30, g: 'tail' },
    tailSide: { v: 0, g: 'tail' },
    tailSideCurl: { v: 0, g: 'tail' },
    tailPuff: { v: 0, g: 'tail' },
    tailZ: { v: 0, g: 'tail' },
    tailWaveAmp: { v: 0.2, g: 'motion' },
    tailWaveFreq: { v: 0.45, g: 'motion' },
    tailWaveLen: { v: 1.1, g: 'motion' },
    tailWaveTip: { v: 1.4, g: 'motion' },

    // حرکت‌های چرخه‌ای
    breathRate: { v: 0.45, g: 'motion' },
    breathAmp: { v: 0.02, g: 'motion' },
    gait: { v: 0, g: 'motion' },
    gaitRun: { v: 0, g: 'motion' },
    gaitFreq: { v: 1, g: 'motion' },
    stride: { v: 15, g: 'motion' },
    wiggle: { v: 0, g: 'motion' },
} as const satisfies Record<string, ParamSpec>;

export type ParamName = keyof typeof PARAMS;
export type Pose = Record<ParamName, number>;
export type PosePatch = Partial<Pose>;

export const PARAM_NAMES = Object.keys(PARAMS) as ParamName[];

/** سختی (k) و میرایی نسبی (z) هر گروه؛ سر و دم نرم‌ترند تا کمی از بدن عقب بمانند */
export const SPRINGS: Record<SpringGroup, { k: number; z: number }> = {
    body: { k: 70, z: 0.72 },
    legs: { k: 95, z: 0.78 },
    head: { k: 48, z: 0.62 },
    face: { k: 260, z: 0.9 },
    ears: { k: 150, z: 0.55 },
    tail: { k: 30, z: 0.62 },
    motion: { k: 22, z: 1 },
    heading: { k: 36, z: 0.85 },
    squash: { k: 200, z: 0.42 },
};

export function basePose(): Pose {
    const pose = {} as Pose;
    for (const name of PARAM_NAMES) pose[name] = PARAMS[name].v;
    return pose;
}
