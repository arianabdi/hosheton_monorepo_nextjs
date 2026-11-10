import type { ScenarioName } from '../projects/[projectId]/chat/chatInput/cat/config';
import type { CatFlag } from '../projects/[projectId]/chat/chatInput/cat/debug';
import type { ParticleKind } from '../projects/[projectId]/chat/chatInput/cat/rig/CatRig';
import type { ParamName, SpringGroup } from '../projects/[projectId]/chat/chatInput/cat/rig/params';
import type { PoseName } from '../projects/[projectId]/chat/chatInput/cat/rig/poses';
import type { CatSoundName } from '../projects/[projectId]/chat/chatInput/cat/stage/CatSounds';

/*
 * کاتالوگ توضیحات صفحهٔ «انیمیشن‌ها»: هر مرحلهٔ سناریو، لایهٔ حرکت، ژست، پارامتر و قانون زمان‌بندی گربهٔ چت.
 * شناسه‌ها (ids) همان‌هایی‌اند که CatDirector با step() می‌فرستد؛ عددها از خود کد آمده‌اند —
 * اگر در CatDirector/CatRig عددی عوض شد، متن همین‌جا هم باید عوض شود.
 */

export type Txt = { fa: string; en: string };

/** ریشهٔ کد گربه (برای ارجاع دقیق در گزارش‌ها) */
export const CAT_DIR = 'app/(developers)/projects/[projectId]/chat/chatInput/cat';

export type StepDef = {
    key: string;
    /** شناسه‌های step() که این ردیف را روشن می‌کنند */
    ids: string[];
    title: Txt;
    body: Txt;
    /** زمان‌ها و احتمال‌ها */
    meta?: Txt;
    flags?: CatFlag[];
    code: string;
    poses?: PoseName[];
    /** رفتار داخل حلقهٔ مرحلهٔ قبل */
    sub?: boolean;
};

export type ScenarioDef = {
    name: ScenarioName;
    title: Txt;
    body: Txt;
    duration: Txt;
    code: string;
    steps: StepDef[];
};

const ENTER: StepDef = {
    key: 'enter',
    ids: ['enter.walk', 'enter.jump', 'enter.calm'],
    title: { fa: 'ورود', en: 'Enter' },
    body: {
        fa: 'از بیرون یکی از دو سر لبه راه می‌آید تا یک نقطهٔ تصادفی (۲۲٪ تا ۷۸٪ عرض)، یا از پشت چت‌باکس بالا می‌پرد (leap) و با crouchJump فرود می‌آید. در حالت کم‌تحرک همان‌جا محو و ظاهر می‌شود.',
        en: 'Walks in from either edge to a random spot (22–78% of the width), or leaps up from behind the chat box and lands in crouchJump. Reduced motion: fades in on the spot.',
    },
    meta: { fa: 'راه رفتن ۶۲٪ · پرش ۳۸٪ · بعدش ۰.۳۵ ثانیه ایستادن', en: 'walk 62% · jump 38% · then 0.35 s stand' },
    flags: ['enter.walk', 'enter.jump'],
    code: 'stage/CatDirector.ts › enter()',
    poses: ['walk', 'leap', 'crouchJump', 'stand'],
};

const LEAVE: StepDef = {
    key: 'leave',
    ids: ['leave.walk', 'leave.jump', 'leave.calm'],
    title: { fa: 'خروج', en: 'Leave' },
    body: {
        fa: 'معمولاً به سمت سرِ نزدیک‌تر (۷۵٪) راه می‌رود و از صحنه بیرون می‌رود؛ یا تا لبه می‌رود، رو برمی‌گرداند، جمع می‌شود (crouchJump) و با leap پایین می‌پرد. کم‌تحرک: محو در ۰.۷ ثانیه.',
        en: 'Usually heads to the nearer edge (75%) and walks off, or walks to the edge, turns, crouches and leaps down. Reduced motion: fades out in 0.7 s.',
    },
    meta: { fa: 'راه رفتن ۵۰٪ · پریدن ۵۰٪', en: 'walk 50% · jump 50%' },
    flags: ['leave.walk', 'leave.jump'],
    code: 'stage/CatDirector.ts › leave() · jumpDown()',
    poses: ['walk', 'crouchJump', 'leap'],
};

export const SCENARIOS: ScenarioDef[] = [
    {
        name: 'sleep',
        title: { fa: 'خواب', en: 'Sleep' },
        body: {
            fa: 'می‌آید، دور خودش می‌چرخد و روی لبهٔ چت‌باکس می‌خوابد. تایپ زیاد یا کلیک روی خودش بیدارش می‌کند.',
            en: 'Comes in, spins around and falls asleep on the chat box edge. Heavy typing or a click on it wakes it up.',
        },
        duration: { fa: '۳۵ تا ۶۰ ثانیه', en: '35–60 s' },
        code: 'stage/CatDirector.ts › sleep()',
        steps: [
            ENTER,
            {
                key: 'spin',
                ids: ['sleep.spin'],
                title: { fa: 'چرخیدن دور خود', en: 'Spin around' },
                body: {
                    fa: 'مثل گربهٔ واقعی قبل از خواب یک یا دو دور دور خودش می‌چرخد؛ هر دور از جلو یا پشت. پاها در جا قدم برمی‌دارند (لایهٔ «قدم در جا»). کم‌تحرک: ندارد.',
                    en: 'Like a real cat before sleeping it turns around once or twice, each turn via front or back. The legs step in place (the "turn steps" layer). Not in reduced motion.',
                },
                meta: { fa: '۱ یا ۲ دور (۵۰/۵۰) · ۲۳۰ درجه در ثانیه · مکث ۰.۱۵ ثانیه', en: '1 or 2 turns (50/50) · 230°/s · 0.15 s pause' },
                flags: ['sleep.spin'],
                code: 'stage/CatDirector.ts › sleep() → rig.spin()',
                poses: ['stand'],
            },
            {
                key: 'lie',
                ids: ['sleep.curl', 'sleep.side'],
                title: { fa: 'دراز کشیدن', en: 'Lie down' },
                body: {
                    fa: 'کلوچه‌ای جمع می‌شود (lieCurl، دم دور بدن) یا به پهلو در طول لبه دراز می‌کشد (lieSide). گذار آرام با سرعت فنر ۰.۶۵ و بعد ۱.۸ ثانیه جاافتادن.',
                    en: 'Curls up (lieCurl, tail around the body) or lies on its side along the edge (lieSide). Slow transition (spring speed 0.65), then 1.8 s to settle.',
                },
                meta: { fa: 'کلوچه‌ای ۵۵٪ · به پهلو ۴۵٪ · کم‌تحرک: همیشه کلوچه‌ای', en: 'curled 55% · side 45% · reduced motion: always curled' },
                flags: ['sleep.curl', 'sleep.side'],
                code: 'stage/CatDirector.ts › sleep()',
                poses: ['lieCurl', 'lieSide'],
            },
            {
                key: 'loop',
                ids: ['sleep.loop'],
                title: { fa: 'خواب', en: 'Sleeping' },
                body: {
                    fa: 'چشم‌ها بسته، نفس آهسته و عمیق، دم تقریباً بی‌حرکت. هر ۲.۱ ثانیه یک «z» از بالای سر بلند می‌شود (کم‌تحرک: هر ۳ ثانیه).',
                    en: 'Eyes closed, slow deep breathing, tail almost still. A "z" rises every 2.1 s (reduced motion: every 3 s).',
                },
                meta: { fa: '۲۶ تا ۴۰ ثانیه', en: '26–40 s' },
                code: 'stage/CatDirector.ts › sleep() · rig.emit(\'z\')',
            },
            {
                key: 'noise',
                ids: ['sleep.noiseReact'],
                sub: true,
                title: { fa: 'واکنش به صدای کم', en: 'Small-noise reaction' },
                body: {
                    fa: 'هر تایپ یا کلیک در چت که هنوز بیدارش نکرده: یک گوش تکان می‌خورد؛ ۳۵٪ وقت‌ها یک چشم تا نیمه باز می‌شود و بعد از ۰.۷۵ ثانیه دوباره بسته می‌شود.',
                    en: 'Every keystroke or click that has not woken it yet: one ear twitches; 35% of the time one eye half-opens and closes again after 0.75 s.',
                },
                meta: { fa: 'حداکثر هر ۰.۴۵ ثانیه یک بار', en: 'at most every 0.45 s' },
                flags: ['sleep.noiseReact'],
                code: 'stage/CatDirector.ts › sleep() → rig.twitchEar()',
            },
            {
                key: 'wake',
                ids: ['sleep.wake'],
                title: { fa: 'بیدار شدن', en: 'Wake up' },
                body: {
                    fa: 'سه راه: کلیک یا تپ روی خود گربه = فوری. صدای زیاد: هر کلید ۱ و هر کلیک بیرون از گربه ۱.۷ امتیاز، در هر ثانیه ۰.۹ کم می‌شود و از ۳.۴ بیدارش می‌کند. وگرنه با پایان زمان خواب، آرام و بدون ترس بیدار می‌شود.',
                    en: 'Three ways: a click/tap on the cat wakes it at once. Noise: each key adds 1 and each click elsewhere 1.7, decaying 0.9/s; 3.4 wakes it. Otherwise it wakes calmly when the sleep time runs out.',
                },
                meta: { fa: 'آستانه ۳.۴ · کاهش ۰.۹ در ثانیه', en: 'threshold 3.4 · decay 0.9/s' },
                flags: ['sleep.wakeTap', 'sleep.wakeNoise'],
                code: 'stage/CatDirector.ts › sleep() · noise()',
            },
            {
                key: 'startle',
                ids: ['sleep.startle', 'sleep.annoyed', 'sleep.curious'],
                title: { fa: 'از جا پریدن و واکنش', en: 'Startle and reaction' },
                body: {
                    fa: 'فقط بیدار شدن ناگهانی: صدای noise، ژست startle با یک پرش کوچک و «!». بعد از ۰.۹ ثانیه یا دلخور به چت‌باکس نگاه می‌کند (annoyed) یا کنجکاو سرش را کج می‌کند و «؟» می‌دهد (curious). کم‌تحرک: به‌جای پرش فقط می‌نشیند.',
                    en: 'Only on a sudden wake: noise sound, startle pose with a small hop and "!". After 0.9 s it either glares at the chat box (annoyed) or tilts its head with a "?" (curious). Reduced motion: just sits up.',
                },
                meta: { fa: 'annoyed ۵۵٪ · curious ۴۵٪ · ۱.۴ ثانیه', en: 'annoyed 55% · curious 45% · 1.4 s' },
                code: 'stage/CatDirector.ts › sleep()',
                poses: ['startle', 'annoyed', 'curious', 'sitFront'],
            },
            {
                key: 'yawn',
                ids: ['sleep.yawn'],
                title: { fa: 'خمیازه', en: 'Yawn' },
                body: {
                    fa: 'نشسته رو به بیننده دهانش را کامل باز می‌کند، چشم‌ها بسته، گوش‌ها کمی عقب.',
                    en: 'Sitting toward the viewer it opens its mouth wide, eyes shut, ears slightly back.',
                },
                meta: { fa: '۱.۶ ثانیه', en: '1.6 s' },
                code: 'stage/CatDirector.ts › sleep()',
                poses: ['yawn'],
            },
            {
                key: 'stretch',
                ids: ['sleep.stretch'],
                title: { fa: 'کش و قوس', en: 'Stretch' },
                body: {
                    fa: 'می‌ایستد، دست‌ها را جلو می‌کشد و باسن را بالا می‌برد (play-bow)، بعد دوباره می‌ایستد. کم‌تحرک: ندارد.',
                    en: 'Stands, reaches forward with the front legs and raises its hips (play-bow), then stands again. Not in reduced motion.',
                },
                meta: { fa: '۰.۵ + ۱.۷ + ۰.۵ ثانیه · سرعت ۰.۸', en: '0.5 + 1.7 + 0.5 s · speed 0.8' },
                flags: ['sleep.stretch'],
                code: 'stage/CatDirector.ts › sleep()',
                poses: ['stand', 'stretch'],
            },
            LEAVE,
        ],
    },
    {
        name: 'watch',
        title: { fa: 'تماشا', en: 'Watch' },
        body: {
            fa: 'روی لبه می‌نشیند و ماوس را تماشا می‌کند: نوازش، میو، شکار ماوس، کنجکاوی و فکر ماهی.',
            en: 'Sits on the edge and watches the mouse: petting, meowing, hunting the cursor, curiosity and a fish daydream.',
        },
        duration: { fa: 'تا ۵۰ ثانیه (۱۵ ثانیه بی‌کاری = پایان)', en: 'up to 50 s (15 s idle ends it)' },
        code: 'stage/CatDirector.ts › watch()',
        steps: [
            ENTER,
            {
                key: 'sit',
                ids: ['watch.front', 'watch.back'],
                title: { fa: 'نشستن', en: 'Sit' },
                body: {
                    fa: 'رو به بیننده می‌نشیند (sitFront، دم موج‌دار کنار بدن) یا پشت به بیننده (sitBack، راه‌راه‌های پشت پیداست). کم‌تحرک: همیشه رو به بیننده.',
                    en: 'Sits facing the viewer (sitFront, waving tail) or with its back to the viewer (sitBack, back stripes visible). Reduced motion: always facing.',
                },
                meta: { fa: 'رو به بیننده ۵۵٪ · پشت ۴۵٪ · ۰.۹ ثانیه', en: 'facing 55% · back 45% · 0.9 s' },
                flags: ['watch.front', 'watch.back'],
                code: 'stage/CatDirector.ts › watch()',
                poses: ['sitFront', 'sitBack'],
            },
            {
                key: 'loop',
                ids: ['watch.loop'],
                title: { fa: 'حلقهٔ تماشا', en: 'Watch loop' },
                body: {
                    fa: 'هر فریم جای ماوس، سرعتش و نزدیکی‌اش به سر گربه را می‌خواند و یکی از رفتارهای زیر را انتخاب می‌کند. با ۱۵ ثانیه بی‌کاری یا ۵۰ ثانیه تمام می‌شود.',
                    en: 'Every frame it reads the mouse position, speed and distance to the head and picks one of the behaviours below. Ends after 15 s idle or 50 s.',
                },
                meta: { fa: 'حداکثر ۵۰ ثانیه', en: 'max 50 s' },
                code: 'stage/CatDirector.ts › watch()',
            },
            {
                key: 'look',
                ids: ['watch.look'],
                sub: true,
                title: { fa: 'نگاه به ماوس', en: 'Follow the mouse' },
                body: {
                    fa: 'تا فاصلهٔ ۴۶۰ پیکسل مردمک‌ها، سر و کج شدن سر ماوس را دنبال می‌کنند. اگر پشت به بیننده نشسته باشد، با نزدیک شدن ماوس سرش از روی شانه برمی‌گردد و با دور شدن ماوس دوباره رو برمی‌گرداند.',
                    en: 'Within 460 px the pupils, head and head tilt follow the mouse. When sitting with its back turned, the head turns over the shoulder as the mouse comes near and turns back when it leaves.',
                },
                flags: ['watch.look'],
                code: 'stage/CatDirector.ts › watch() → rig.lookAt()',
                poses: ['sitBackLook'],
            },
            {
                key: 'pet',
                ids: ['watch.pet'],
                sub: true,
                title: { fa: 'نوازش', en: 'Petting' },
                body: {
                    fa: 'ماوس روی گربه: چشم‌های کمانی خندان، سر کج، گوش کمی عقب، خرخر (purr به‌صورت حلقه) و یک قلب هر ۱.۱ ثانیه. موبایل: تپ = ۲.۴ ثانیه نوازش، تپ دوم = میو.',
                    en: 'Mouse over the cat: happy arc eyes, head tilt, ears slightly back, looping purr and a heart every 1.1 s. Mobile: a tap pets for 2.4 s, a second tap meows.',
                },
                flags: ['watch.pet'],
                code: 'stage/CatDirector.ts › watch()',
                poses: ['happy', 'petBack'],
            },
            {
                key: 'meow',
                ids: ['watch.meow'],
                sub: true,
                title: { fa: 'میو با کلیک', en: 'Meow on click' },
                body: {
                    fa: 'کلیک روی گربه: صدای meow (کمی زیر یا بم، تصادفی)، حباب «میو» بالای سر و باز و بسته شدن دهان.',
                    en: 'Click on the cat: meow sound (slightly random pitch), a "meow" bubble and the mouth opening and closing.',
                },
                meta: { fa: '۰.۵۴ ثانیه', en: '0.54 s' },
                flags: ['watch.meow'],
                code: 'stage/CatDirector.ts › meow() · say()',
            },
            {
                key: 'hunt',
                ids: ['watch.hunt', 'watch.huntSwipe', 'watch.huntLeap'],
                sub: true,
                title: { fa: 'شکار ماوس', en: 'Hunt the cursor' },
                body: {
                    fa: 'ماوس با سرعت بیش از ۶۵۰ پیکسل در ثانیه نزدیک گربه: کمین (crouch، باسن می‌لرزد) رو به ماوس، ۰.۶ ثانیه صبر، بعد یا دو بار پنجه می‌زند (swipe) یا یک جهش کوتاه به سمت ماوس می‌کند. کم‌تحرک: ندارد.',
                    en: 'Mouse moving faster than 650 px/s near the cat: crouch facing it (butt wiggle), wait 0.6 s, then swipe twice or make a short leap toward it. Not in reduced motion.',
                },
                meta: { fa: 'هر ۵ ثانیه حداکثر یک بار · پنجه ۵۰٪ · جهش ۵۰٪', en: 'at most every 5 s · swipe 50% · leap 50%' },
                flags: ['watch.hunt', 'watch.huntSwipe', 'watch.huntLeap'],
                code: 'stage/CatDirector.ts › hunt()',
                poses: ['crouch', 'swipe', 'leap'],
            },
            {
                key: 'curious',
                ids: ['watch.curious'],
                sub: true,
                title: { fa: 'کنجکاوی', en: 'Curious' },
                body: {
                    fa: 'ماوس نزدیک و بیش از ۰.۷ ثانیه بی‌حرکت: سرش را به یک طرف کج می‌کند، گوش‌ها تیز، مردمک بزرگ‌تر و یک «؟».',
                    en: 'Mouse near and still for over 0.7 s: tilts its head, perks its ears, widens its pupils and shows a "?".',
                },
                meta: { fa: '۱.۵ ثانیه · هر ۷ ثانیه', en: '1.5 s · every 7 s' },
                flags: ['watch.curious'],
                code: 'stage/CatDirector.ts › curious()',
            },
            {
                key: 'think',
                ids: ['watch.think'],
                sub: true,
                title: { fa: 'فکر ماهی', en: 'Fish daydream' },
                body: {
                    fa: 'بعد از ۴ ثانیه بی‌کاری، ابر فکری با یک ماهی بالای سرش ظاهر می‌شود (۲.۸ ثانیه).',
                    en: 'After 4 s without interaction a thought cloud with a fish appears above its head (2.8 s).',
                },
                meta: { fa: 'هر ۱۴ تا ۲۲ ثانیه', en: 'every 14–22 s' },
                flags: ['watch.think'],
                code: 'stage/CatDirector.ts › think()',
            },
            {
                key: 'yawn',
                ids: ['watch.yawn'],
                title: { fa: 'خمیازه', en: 'Yawn' },
                body: {
                    fa: 'پایان تماشا: نگاه آزاد می‌شود، ۱.۶ ثانیه خمیازه و ۰.۵ ثانیه ایستادن.',
                    en: 'End of watching: gaze released, 1.6 s yawn, 0.5 s stand.',
                },
                code: 'stage/CatDirector.ts › watch()',
                poses: ['yawn', 'stand'],
            },
            LEAVE,
        ],
    },
    {
        name: 'ball',
        title: { fa: 'بازی با توپ', en: 'Ball play' },
        body: {
            fa: 'یک توپ کاموا از کنار می‌غلتد و گربه دنبالش می‌کند؛ ضربه می‌زند، کمین می‌کند و آخر توپ را هل می‌دهد بیرون. کلیک روی توپ آن را می‌ترکاند و گربه عصبانی می‌شود.',
            en: 'A yarn ball rolls in and the cat chases it: bats, pounces and finally pushes it off. Clicking the ball pops it and the cat gets angry.',
        },
        duration: { fa: '۲۵ تا ۴۰ ثانیه', en: '25–40 s' },
        code: 'stage/CatDirector.ts › ballPlay()',
        steps: [
            {
                key: 'enter',
                ids: ['ball.enter'],
                title: { fa: 'ورود توپ', en: 'Ball rolls in' },
                body: {
                    fa: 'توپ از یک سر لبه وارد می‌شود و گربه از بیرون صحنه پشت سرش راه می‌افتد. تا توپ به لبه نرسیده آن سر باز است؛ بعد هر دو سر بسته می‌شوند و توپ برمی‌گردد.',
                    en: 'The ball enters from one edge and the cat follows from offstage. That edge stays open until the ball is on the ledge; then both edges bounce it back.',
                },
                meta: { fa: '۱۷۰ تا ۲۲۰ پیکسل در ثانیه · تا ۴ ثانیه صبر', en: '170–220 px/s · waits up to 4 s' },
                code: 'stage/CatDirector.ts › ballPlay() · stage/Ball.ts',
                poses: ['stand', 'walk'],
            },
            {
                key: 'chase',
                ids: ['ball.chase'],
                title: { fa: 'دنبال کردن', en: 'Chase' },
                body: {
                    fa: 'هدف کنار توپ است (۳۶ پیکسل فاصله)؛ اگر بیش از ۱۲۰ پیکسل دور باشد می‌دود وگرنه راه می‌رود، و همیشه به توپ نگاه می‌کند. وقتی توپ کند شد و در دسترس بود، ضربه می‌زند.',
                    en: 'Aims for a spot 36 px from the ball; runs when farther than 120 px, otherwise walks, always looking at the ball. When the ball slows down within reach it bats it.',
                },
                meta: { fa: 'بازی ۲۰ تا ۲۸ ثانیه', en: 'play lasts 20–28 s' },
                code: 'stage/CatDirector.ts › chaseAndBat()',
                poses: ['walk', 'run'],
            },
            {
                key: 'pounce',
                ids: ['ball.pounce'],
                title: { fa: 'کمین و جهش', en: 'Pounce' },
                body: {
                    fa: 'اگر توپ کند باشد و گربه رو به آن و در فاصلهٔ مناسب: ۰.۷۵ ثانیه کمین (crouch)، جهش روی توپ (leap) و ضربهٔ محکم که توپ را کمی بالا می‌پراند.',
                    en: 'With the ball slow, in front and at the right distance: 0.75 s crouch, a leap onto the ball and a strong hit that lifts it a little.',
                },
                meta: { fa: '۳۵٪ دورها · ضربه ۲۲۰ تا ۳۳۰ پیکسل در ثانیه', en: '35% of rounds · hit 220–330 px/s' },
                flags: ['ball.pounce'],
                code: 'stage/CatDirector.ts › pounce()',
                poses: ['crouch', 'leap'],
            },
            {
                key: 'bat',
                ids: ['ball.bat'],
                title: { fa: 'ضربهٔ پنجه', en: 'Bat' },
                body: {
                    fa: 'می‌ایستد، رو به توپ برمی‌گردد، دست جلو را بالا می‌برد (bat) و توپ را می‌زند؛ ۳۰٪ وقت‌ها توپ کمی بالا می‌پرد. بعد ۰.۳ تا ۰.۷ ثانیه نگاهش می‌کند.',
                    en: 'Stops, faces the ball, raises a front paw (bat) and hits it; 30% of the time the ball hops. Then watches it for 0.3–0.7 s.',
                },
                meta: { fa: 'ضربه ۱۵۰ تا ۳۰۰ پیکسل در ثانیه', en: 'hit 150–300 px/s' },
                code: 'stage/CatDirector.ts › bat()',
                poses: ['bat', 'stand'],
            },
            {
                key: 'pushOff',
                ids: ['ball.pushOff'],
                title: { fa: 'هل دادن توپ بیرون', en: 'Push the ball off' },
                body: {
                    fa: 'پایان بازی: سرِ نزدیک‌تر به توپ باز می‌شود؛ پشت توپ می‌رود و با ضربه‌های کوچک آن را تا بیرون می‌برد و دنبالش خارج می‌شود.',
                    en: 'End of play: the edge nearer the ball opens; the cat gets behind it, nudges it out with small hits and walks off after it.',
                },
                meta: { fa: 'ضربه ۸۰ تا ۱۲۰ پیکسل در ثانیه', en: 'nudges 80–120 px/s' },
                code: 'stage/CatDirector.ts › pushOff()',
                poses: ['walk', 'bat'],
            },
            {
                key: 'pop',
                ids: ['ball.pop', 'ball.angry', 'leave.run'],
                title: { fa: 'ترکیدن توپ', en: 'Ball pops' },
                body: {
                    fa: 'کلیک روی توپ در هر لحظه: صدای pop و پخش شدن تکه‌ها؛ سناریو قطع می‌شود. گربه عصبانی (پشت قوزدار با خار، دم پف‌کرده) رو به جای ترکیدن، دو بار «میو میو» قرمز، بعد با موهای سیخ می‌دود بیرون.',
                    en: 'Clicking the ball at any moment: pop sound and shards; the scenario is interrupted. The cat turns angry (arched spiky back, puffed tail) toward the pop, two red "meow meow"s, then runs off bristling.',
                },
                flags: ['ball.pop'],
                code: 'stage/CatDirector.ts › popBall() · angryExit()',
                poses: ['angry', 'run'],
            },
        ],
    },
    {
        name: 'walk',
        title: { fa: 'قدم‌زدن و کش و قوس', en: 'Walk & stretch' },
        body: {
            fa: 'آرام روی لبه قدم می‌زند، وسط آن کش و قوس می‌آید و از لبه پایین می‌پرد.',
            en: 'Strolls slowly onto the edge, stretches in the middle and jumps down.',
        },
        duration: { fa: '۱۵ تا ۲۰ ثانیه', en: '15–20 s' },
        code: 'stage/CatDirector.ts › walkStretch()',
        steps: [
            {
                key: 'enter',
                ids: ['enter.slow'],
                title: { fa: 'ورود آرام', en: 'Slow entrance' },
                body: {
                    fa: 'تا رسیدن به لبه قدم عادی؛ روی لبه آرام و قدم‌به‌قدم (walkSlow، سر پایین‌تر) تا نزدیک وسط.',
                    en: 'Normal walk up to the ledge, then slow step-by-step (walkSlow, head lower) to near the middle.',
                },
                meta: { fa: 'مقصد ۴۰ تا ۶۰٪ عرض', en: 'target 40–60% of width' },
                code: 'stage/CatDirector.ts › enter({ mode: \'slow\' })',
                poses: ['walk', 'walkSlow'],
            },
            {
                key: 'stretch',
                ids: ['walk.stretch'],
                title: { fa: 'کش و قوس جلو', en: 'Front stretch' },
                body: {
                    fa: '۰.۷ ثانیه ایستادن، بعد کش و قوس خیلی آرام: دست‌ها جلو، سینه پایین، باسن بالا، چشم‌ها خندان.',
                    en: '0.7 s stand, then a very slow stretch: front legs forward, chest down, hips up, happy eyes.',
                },
                meta: { fa: '۲.۳ ثانیه · سرعت ۰.۵۵', en: '2.3 s · speed 0.55' },
                code: 'stage/CatDirector.ts › walkStretch()',
                poses: ['stand', 'stretch'],
            },
            {
                key: 'yawn',
                ids: ['walk.yawn'],
                sub: true,
                title: { fa: 'خمیازه', en: 'Yawn' },
                body: {
                    fa: 'وسط کش و قوس دهانش کامل باز می‌شود و بسته می‌شود.',
                    en: 'Mid-stretch the mouth opens wide and closes.',
                },
                meta: { fa: '۶۰٪ · ۱.۱ ثانیه', en: '60% · 1.1 s' },
                flags: ['walk.yawn'],
                code: 'stage/CatDirector.ts › walkStretch()',
            },
            {
                key: 'hind',
                ids: ['walk.stretchHind'],
                title: { fa: 'کشیدن پای عقب', en: 'Hind-leg stretch' },
                body: {
                    fa: '۱ ثانیه ایستادن، بعد یک پای عقب را به عقب می‌کشد و دوباره می‌ایستد.',
                    en: '1 s stand, then it stretches one hind leg back and stands again.',
                },
                meta: { fa: '۱.۷ + ۰.۷ ثانیه', en: '1.7 + 0.7 s' },
                flags: ['walk.stretchHind'],
                code: 'stage/CatDirector.ts › walkStretch()',
                poses: ['stretchHind', 'stand'],
            },
            {
                key: 'leave',
                ids: ['walk.leave', 'leave.jump'],
                title: { fa: 'پریدن از لبه', en: 'Jump off' },
                body: {
                    fa: 'در همان جهتی که رو کرده تا سر لبه راه می‌رود، جمع می‌شود و با leap پایین می‌پرد.',
                    en: 'Walks on to the edge it is facing, crouches and leaps down.',
                },
                code: 'stage/CatDirector.ts › walkStretch() → jumpDown()',
                poses: ['walk', 'crouchJump', 'leap'],
            },
        ],
    },
];

/** برچسب کوتاه هر کلید */
export const FLAG_LABELS: Record<CatFlag, Txt> = {
    'rig.springs': { fa: 'نرمی گذارها', en: 'Spring transitions' },
    'rig.breath': { fa: 'نفس کشیدن', en: 'Breathing' },
    'rig.blink': { fa: 'پلک زدن', en: 'Blinking' },
    'rig.earTwitch': { fa: 'تکان گوش', en: 'Ear twitches' },
    'rig.tailWave': { fa: 'موج دم', en: 'Tail wave' },
    'rig.gaitLegs': { fa: 'قدم پاها', en: 'Leg stepping' },
    'rig.gaitBody': { fa: 'تاب بدن در راه رفتن', en: 'Body bob' },
    'rig.turnSteps': { fa: 'قدم در جا', en: 'Turn steps' },
    'rig.inertia': { fa: 'جا ماندن سر و دم', en: 'Inertia' },
    'rig.squash': { fa: 'فشردگی و کشیدگی', en: 'Squash & stretch' },
    'rig.airPitch': { fa: 'شیب در هوا', en: 'Air pitch' },
    'rig.lookAt': { fa: 'دنبال کردن نگاه', en: 'Look-at' },
    'rig.headLag': { fa: 'تأخیر چرخش سر', en: 'Head lag' },
    'rig.wiggle': { fa: 'لرزش باسن', en: 'Butt wiggle' },
    'rig.particles': { fa: 'نشانه‌ها', en: 'Particles' },
    'rig.depthSort': { fa: 'ترتیب عمق', en: 'Depth sorting' },
    'fx.bubble': { fa: 'حباب میو', en: 'Meow bubble' },
    'fx.speedLines': { fa: 'خطوط سرعت', en: 'Speed lines' },
    'enter.walk': { fa: 'ورود با راه رفتن', en: 'Walk in' },
    'enter.jump': { fa: 'ورود با پرش', en: 'Jump up' },
    'leave.walk': { fa: 'خروج با راه رفتن', en: 'Walk off' },
    'leave.jump': { fa: 'خروج با پریدن', en: 'Jump down' },
    'sleep.spin': { fa: 'چرخیدن', en: 'Spin' },
    'sleep.curl': { fa: 'کلوچه‌ای', en: 'Curled' },
    'sleep.side': { fa: 'به پهلو', en: 'On its side' },
    'sleep.noiseReact': { fa: 'واکنش به صدا', en: 'Noise reaction' },
    'sleep.wakeTap': { fa: 'بیدار شدن با کلیک', en: 'Wake on tap' },
    'sleep.wakeNoise': { fa: 'بیدار شدن با صدا', en: 'Wake on noise' },
    'sleep.stretch': { fa: 'کش و قوس', en: 'Stretch' },
    'watch.front': { fa: 'رو به بیننده', en: 'Facing' },
    'watch.back': { fa: 'پشت به بیننده', en: 'Back turned' },
    'watch.look': { fa: 'نگاه به ماوس', en: 'Follow mouse' },
    'watch.pet': { fa: 'نوازش', en: 'Petting' },
    'watch.meow': { fa: 'میو', en: 'Meow' },
    'watch.hunt': { fa: 'شکار', en: 'Hunt' },
    'watch.huntSwipe': { fa: 'پنجه', en: 'Swipe' },
    'watch.huntLeap': { fa: 'جهش', en: 'Leap' },
    'watch.curious': { fa: 'کنجکاوی', en: 'Curious' },
    'watch.think': { fa: 'فکر ماهی', en: 'Fish thought' },
    'ball.pounce': { fa: 'کمین و جهش', en: 'Pounce' },
    'ball.pop': { fa: 'ترکیدن با کلیک', en: 'Pop on click' },
    'walk.yawn': { fa: 'خمیازه', en: 'Yawn' },
    'walk.stretchHind': { fa: 'پای عقب', en: 'Hind-leg stretch' },
};

export type BehaviorDef = {
    flag: CatFlag;
    body: Txt;
    /** کجا بهتر دیده می‌شود */
    seeIt?: Txt;
    code: string;
};

export const BEHAVIOR_GROUPS: { title: Txt; note: Txt; items: BehaviorDef[] }[] = [
    {
        title: { fa: 'لایه‌های همیشگی', en: 'Always-on layers' },
        note: {
            fa: 'روی هر ژستی سوار می‌شوند و گربه را زنده نگه می‌دارند؛ روی همهٔ گربه‌های این صفحه اثر دارند.',
            en: 'Layered on top of every pose to keep the cat alive; they affect every cat on this page.',
        },
        items: [
            {
                flag: 'rig.springs',
                body: {
                    fa: 'هر پارامتر ژست فنر خودش را دارد (۲۴۰ زیرگام در ثانیه)، پس عوض شدن ژست نرم و بدون پرش است و سر و دم کمی دیرتر از بدن می‌رسند. خاموش = همه‌چیز فوری می‌پرد به ژست بعدی.',
                    en: 'Each pose parameter has its own spring (240 sub-steps/s), so pose changes are smooth and the head and tail arrive a little after the body. Off = everything snaps to the next pose.',
                },
                seeIt: { fa: 'زمین بازی: بین ژست‌ها جابه‌جا شوید', en: 'Playground: switch between poses' },
                code: 'rig/CatRig.ts › integrate() · rig/params.ts › SPRINGS',
            },
            {
                flag: 'rig.breath',
                body: {
                    fa: 'سینه و میانهٔ بدن با یک سینوس بالا و پایین می‌روند و کمی پهن می‌شوند. نرخ و دامنه از breathRate و breathAmp ژست؛ در خواب آهسته‌تر و عمیق‌تر.',
                    en: 'Chest and mid-body rise, fall and widen on a sine. Rate and depth come from the pose (breathRate, breathAmp); slower and deeper when asleep.',
                },
                seeIt: { fa: 'ژست‌ها: lieCurl', en: 'Poses: lieCurl' },
                code: 'rig/CatRig.ts › render() · br',
            },
            {
                flag: 'rig.blink',
                body: {
                    fa: 'هر ۲.۲ تا ۶ ثانیه یک پلک ۰.۱۷ ثانیه‌ای؛ ۱۸٪ وقت‌ها پلک دوم پشت‌سرش. دکمهٔ blink زمین بازی همچنان کار می‌کند.',
                    en: 'A 0.17 s blink every 2.2–6 s; 18% of the time a second blink follows. The playground blink button still works.',
                },
                code: 'rig/CatRig.ts › advance()',
            },
            {
                flag: 'rig.earTwitch',
                body: {
                    fa: 'هر گوش جداگانه هر ۲.۵ تا ۸.۵ ثانیه یک تکان فنری می‌خورد؛ با چشم بسته فقط ۴۰٪ وقت‌ها.',
                    en: 'Each ear gets a springy twitch every 2.5–8.5 s on its own; with closed eyes only 40% of the time.',
                },
                code: 'rig/CatRig.ts › advance() · twitchEar()',
            },
            {
                flag: 'rig.tailWave',
                body: {
                    fa: 'موج سینوسی از ریشه تا نوک دم؛ دامنه، بسامد، طول موج و تمرکز روی نوک از ژست (tailWave*). در حالت کم‌تحرک نصف.',
                    en: 'A sine wave travelling from root to tip; amplitude, frequency, wavelength and tip focus come from the pose (tailWave*). Halved in reduced motion.',
                },
                seeIt: { fa: 'ژست‌ها: crouch (تند)، sitFront (آرام)', en: 'Poses: crouch (fast), sitFront (slow)' },
                code: 'rig/CatRig.ts › render() · tail',
            },
            {
                flag: 'rig.lookAt',
                body: {
                    fa: 'مردمک‌ها، چرخش و کج شدن سر به سمت هدف نگاه (ماوس، توپ) می‌روند؛ با فنر خودشان، پس نگاه نرم دنبال می‌کند.',
                    en: 'Pupils, head turn and head tilt move toward the look target (mouse, ball) on their own springs, so the gaze follows smoothly.',
                },
                seeIt: { fa: 'زمین بازی: ماوس را روی صحنه حرکت دهید', en: 'Playground: move the mouse over the stage' },
                code: 'rig/CatRig.ts › lookAt() · integrate()',
            },
            {
                flag: 'rig.headLag',
                body: {
                    fa: 'جهت سر با فنر خودش دنبال بدن می‌آید و کمی دیرتر می‌چرخد؛ faceViewer تعیین می‌کند چقدر رو به بیننده بماند. خاموش = سر قفل به بدن.',
                    en: 'The head direction follows the body on its own spring, turning slightly later; faceViewer decides how much it keeps facing the viewer. Off = head locked to the body.',
                },
                seeIt: { fa: 'زمین بازی: turn', en: 'Playground: turn' },
                code: 'rig/CatRig.ts › integrate() · headTarget()',
            },
            {
                flag: 'rig.particles',
                body: {
                    fa: 'نشانه‌های بالای سر: z (خواب)، قلب (نوازش)، ؟ (کنجکاوی)، ! (ترس). تا ۸ نشانه هم‌زمان؛ بالا می‌روند و محو می‌شوند.',
                    en: 'Marks above the head: z (sleep), heart (petting), ? (curious), ! (startle). Up to 8 at once; they rise and fade.',
                },
                code: 'rig/CatRig.ts › emit() · renderParticles()',
            },
            {
                flag: 'rig.depthSort',
                body: {
                    fa: 'هر فریم دم، چهار پا، بدن و سر بر اساس عمق مرتب می‌شوند تا هنگام چرخیدن عضو جلوتر روی بقیه بیفتد. خاموش = ترتیب در آخرین حالت قفل می‌شود.',
                    en: 'Every frame the tail, four legs, body and head are sorted by depth so the nearer part draws on top while turning. Off = the order freezes.',
                },
                seeIt: { fa: 'زمین بازی: اسلایدر heading', en: 'Playground: heading slider' },
                code: 'rig/CatRig.ts › sortDepth()',
            },
        ],
    },
    {
        title: { fa: 'حرکت و پرش', en: 'Locomotion & jumps' },
        note: {
            fa: 'فقط وقتی گربه راه می‌رود، می‌چرخد یا می‌پرد دیده می‌شوند.',
            en: 'Only visible while the cat walks, turns or jumps.',
        },
        items: [
            {
                flag: 'rig.gaitLegs',
                body: {
                    fa: 'چرخهٔ قدم از سرعت واقعی درمی‌آید: هر پنجه در فاز تماس دقیقاً هم‌سرعت زمین عقب می‌رود تا نلغزد. راه رفتن: جفت‌پاهای قطری با هم (۶۲٪ تماس)؛ دویدن: جهشی (۴۰٪ تماس). خاموش = گربه سُر می‌خورد.',
                    en: 'The step cycle is driven by the real speed: each paw moves back at ground speed while planted so it never slides. Walk: diagonal pairs (62% contact); run: bounding (40%). Off = the cat glides.',
                },
                seeIt: { fa: 'ژست‌ها: walk و run', en: 'Poses: walk and run' },
                code: 'rig/CatRig.ts › advance() · render() legs · WALK_PHASE/RUN_PHASE',
            },
            {
                flag: 'rig.gaitBody',
                body: {
                    fa: 'هنگام راه رفتن بدن دو بار در هر چرخه بالا و پایین می‌رود و کمی تاب می‌خورد؛ در دویدن ستون فقرات خم و باز می‌شود.',
                    en: 'While walking the body bobs twice per cycle and rocks a little; when running the spine flexes and extends.',
                },
                seeIt: { fa: 'ژست‌ها: run', en: 'Poses: run' },
                code: 'rig/CatRig.ts › render() · bob/flex/rock',
            },
            {
                flag: 'rig.turnSteps',
                body: {
                    fa: 'وقتی جهت بدن سریع عوض می‌شود (چرخیدن در جا)، پاها قدم‌های کوتاه برمی‌دارند به‌جای اینکه ثابت بچرخند.',
                    en: 'When the heading changes quickly (turning in place) the legs take short steps instead of pivoting frozen.',
                },
                seeIt: { fa: 'زمین بازی: turn · سناریو خواب: چرخیدن', en: 'Playground: turn · Sleep: spin' },
                code: 'rig/CatRig.ts › advance() · stepW',
            },
            {
                flag: 'rig.inertia',
                body: {
                    fa: 'شتاب جلو/عقب باعث می‌شود سر و ریشهٔ دم کمی جا بمانند و فنری برگردند (راه افتادن و ایستادن).',
                    en: 'Forward/backward acceleration makes the head and tail root lag and spring back (starting and stopping).',
                },
                code: 'rig/CatRig.ts › stepLocomotion() · inertia',
            },
            {
                flag: 'rig.squash',
                body: {
                    fa: 'فرود از پرش: فشردگی عمودی و پهن شدن فنری؛ پرش‌های کوچک (hop، از جا پریدن) با kick روی lift. در حالت کم‌تحرک همیشه خاموش.',
                    en: 'Jump landings squash vertically and widen on a spring; small hops (hop, startle) kick the lift spring. Always off in reduced motion.',
                },
                seeIt: { fa: 'زمین بازی: hop', en: 'Playground: hop' },
                code: 'rig/CatRig.ts › kick() · stepJump()',
            },
            {
                flag: 'rig.airPitch',
                body: {
                    fa: 'در هوا بدن هم‌جهت مسیر پرش شیب می‌گیرد (بالا رفتن: سر بالا، پایین آمدن: سر پایین) و بعد از فرود صاف می‌شود.',
                    en: 'In the air the body pitches along the jump arc (nose up rising, nose down falling) and levels after landing.',
                },
                code: 'rig/CatRig.ts › stepJump() · airPitch',
            },
            {
                flag: 'rig.wiggle',
                body: {
                    fa: 'لرزش باسن و ریشهٔ دم قبل از شکار، مثل گربهٔ واقعی؛ مقدارش از پارامتر wiggle ژست crouch.',
                    en: 'The pre-pounce butt wiggle of a real cat; amount comes from the crouch pose (wiggle).',
                },
                seeIt: { fa: 'ژست‌ها: crouch', en: 'Poses: crouch' },
                code: 'rig/CatRig.ts › render() · wig',
            },
        ],
    },
    {
        title: { fa: 'جلوه‌های صحنه', en: 'Stage effects' },
        note: {
            fa: 'فقط در صحنهٔ زندهٔ چت‌باکس (کارگردان صحنه).',
            en: 'Only on the live chat-box stage (the scene director).',
        },
        items: [
            {
                flag: 'fx.bubble',
                body: {
                    fa: 'حباب گفتار «میو» بالای سر که با پرش کوچک باز می‌شود و محو می‌شود؛ در عصبانیت قرمز و دوتایی. صدا و دهان بدون حباب هم کار می‌کنند.',
                    en: 'The "meow" speech bubble that pops open above the head and fades; red and doubled when angry. Sound and mouth still work without it.',
                },
                code: 'stage/CatDirector.ts › say()',
            },
            {
                flag: 'fx.speedLines',
                body: {
                    fa: 'سه خط پشت گربه وقتی سرعتش از حدود ۸۰ پیکسل در ثانیه (× مقیاس) بیشتر شود؛ با سرعت پررنگ‌تر می‌شوند.',
                    en: 'Three lines behind the cat once it moves faster than ~80 px/s (× scale); they strengthen with speed.',
                },
                seeIt: { fa: 'سناریو توپ یا ترکیدن توپ', en: 'Ball scenario or popping the ball' },
                code: 'stage/CatDirector.ts › updateFx()',
            },
        ],
    },
];

export type PoseDef = {
    pose: PoseName;
    body: Txt;
    /** نمایش: ژست دوم برای رفت‌وبرگشت، نشانه، فاصلهٔ تکرار، جابه‌جایی افقی */
    alt?: PoseName;
    emit?: ParticleKind;
    every?: number;
    x?: number;
};

export const POSE_INFO: PoseDef[] = [
    { pose: 'stand', body: { fa: 'ایستاده از پهلو — پایهٔ همهٔ ژست‌ها؛ هر ژست فقط تفاوتش با این را می‌گوید.', en: 'Standing side view — the base every pose is a diff against.' } },
    { pose: 'walk', body: { fa: 'راه رفتن: جفت‌پاهای قطری با هم، بدن کمی پایین‌تر، دم بالا.', en: 'Walk: diagonal pairs together, body slightly lower, tail up.' } },
    { pose: 'walkSlow', body: { fa: 'راه رفتن آرام و قدم‌به‌قدم، سر پایین‌تر.', en: 'Slow step-by-step walk, head lower.' } },
    { pose: 'run', body: { fa: 'دویدن جهشی: قدم بلند، خم شدن ستون فقرات، گوش کمی عقب.', en: 'Bounding run: long stride, flexing spine, ears slightly back.' } },
    { pose: 'sitSide', body: { fa: 'نشسته از پهلو، ران و دم روی زمین. پایهٔ نشستن‌های دیگر.', en: 'Sitting side view, haunch and tail on the ground. Base of the other sits.' } },
    { pose: 'sitFront', body: { fa: 'نشسته رو به بیننده، دم موج‌دار کنار بدن.', en: 'Sitting toward the viewer, tail waving beside it.' } },
    { pose: 'sitFrontWrap', body: { fa: 'نشسته رو به بیننده، دم دور پنجه‌ها پیچیده.', en: 'Sitting toward the viewer, tail wrapped around the paws.' } },
    { pose: 'sitBack', body: { fa: 'نشسته پشت به بیننده؛ راه‌راه‌های پشت سر و بدن پیداست.', en: 'Sitting with its back turned; head and back stripes visible.' } },
    { pose: 'sitBackLook', body: { fa: 'پشت به بیننده، سر از روی شانه برگشته.', en: 'Back turned, looking over the shoulder.' } },
    { pose: 'lieCurl', body: { fa: 'خواب کلوچه‌ای: بدن جمع، سر روی پنجه‌ها، دم دور بدن، نفس آهسته.', en: 'Curled sleep: body tucked, head on paws, tail around, slow breathing.' }, emit: 'z', every: 1.7 },
    { pose: 'lieSide', body: { fa: 'خواب به پهلو در طول لبه، دست و پا دراز.', en: 'Sleeping on its side along the edge, legs stretched out.' }, emit: 'z', every: 2, x: 22 },
    { pose: 'stretch', body: { fa: 'کش و قوس (play-bow): دست‌ها جلو، سینه پایین، باسن بالا.', en: 'Play-bow stretch: front legs forward, chest down, hips up.' }, alt: 'stand', every: 2.6 },
    { pose: 'stretchHind', body: { fa: 'کشیدن یک پای عقب به عقب.', en: 'One hind leg stretched back.' }, alt: 'stand', every: 2.6 },
    { pose: 'crouch', body: { fa: 'کمین: بدن پایین، مردمک گشاد، دم کوتاه و تند، باسن می‌لرزد.', en: 'Hunting crouch: low body, wide pupils, quick tail flicks, butt wiggle.' } },
    { pose: 'swipe', body: { fa: 'پنجه زدن از حالت کمین.', en: 'Paw swipe out of the crouch.' }, alt: 'crouch', every: 0.9 },
    { pose: 'angry', body: { fa: 'عصبانی: پشت قوزدار با خار، دم پف‌کرده، گوش خوابیده، اخم و دهان باز.', en: 'Angry: arched spiky back, puffed tail, flat ears, frown and open mouth.' } },
    { pose: 'happy', body: { fa: 'خوشحال و خرخر: چشم‌های کمانی، سر کج — همان حالتی که نوازش با set() می‌سازد.', en: 'Happy/purring: arc eyes, head tilt — what petting builds with set().' }, emit: 'heart', every: 1.8 },
    { pose: 'yawn', body: { fa: 'خمیازه: دهان کامل باز، چشم‌ها بسته.', en: 'Yawn: mouth wide open, eyes shut.' }, alt: 'sitFront', every: 2.2 },
    { pose: 'curious', body: { fa: 'کنجکاو: سر کج، گوش تیز، نگاه کمی بالا.', en: 'Curious: head tilt, perked ears, gaze slightly up.' }, emit: 'question', every: 2.6 },
    { pose: 'startle', body: { fa: 'از جا پریدن: چشم گرد و مردمک ریز، موی کمی سیخ، دم بالا.', en: 'Startle: round eyes with tiny pupils, slightly raised fur, tail up.' }, alt: 'lieCurl', every: 2.4 },
    { pose: 'leap', body: { fa: 'در هوا: بدن کشیده، دست‌ها جلو، پاها عقب.', en: 'Airborne: body stretched, front legs forward, hind legs back.' } },
    { pose: 'crouchJump', body: { fa: 'جمع شدن قبل از پرش و ضربه‌گیر بعد از فرود.', en: 'Gathering before a jump and absorbing the landing.' }, alt: 'stand', every: 1.6 },
    { pose: 'annoyed', body: { fa: 'بیدار شده و دلخور: پلک نیمه‌بسته، اخم، نگاه پایین به چت‌باکس، دم تند.', en: 'Woken and annoyed: half-closed lids, frown, glaring down at the chat box, fast tail.' } },
    { pose: 'bat', body: { fa: 'ضربهٔ دست به توپ از حالت ایستاده.', en: 'Batting the ball with a front paw while standing.' }, alt: 'stand', every: 1.2 },
    { pose: 'petBack', body: { fa: 'نوازش از پشت: سر از روی شانه، چشم‌های خندان.', en: 'Petted from behind: looking over the shoulder with happy eyes.' }, emit: 'heart', every: 1.8 },
];

export const PARAM_INFO: Record<ParamName, Txt> = {
    heading: { fa: 'جهت بدن: ۰ رو به راست، ۹۰ رو به بیننده، ۱۸۰ رو به چپ، ۹۰- پشت به بیننده', en: 'Body heading: 0 right, 90 toward viewer, 180 left, -90 away' },
    lift: { fa: 'بلند شدن کل بدن از زمین (پرش کوچک)', en: 'Whole-body lift off the ground (small hop)' },
    sx: { fa: 'کشیدگی افقی (فرود)', en: 'Horizontal stretch (landing)' },
    sy: { fa: 'کشیدگی عمودی (فرود)', en: 'Vertical stretch (landing)' },
    hipA: { fa: 'لگن — جلو/عقب', en: 'Hip — forward/back' },
    hipB: { fa: 'لگن — ارتفاع', en: 'Hip — height' },
    hipR: { fa: 'لگن — شعاع', en: 'Hip — radius' },
    midA: { fa: 'میانهٔ بدن — جلو/عقب', en: 'Mid-body — forward/back' },
    midB: { fa: 'میانهٔ بدن — ارتفاع (قوز پشت)', en: 'Mid-body — height (back arch)' },
    midR: { fa: 'میانهٔ بدن — شعاع', en: 'Mid-body — radius' },
    chestA: { fa: 'سینه — جلو/عقب', en: 'Chest — forward/back' },
    chestB: { fa: 'سینه — ارتفاع', en: 'Chest — height' },
    chestR: { fa: 'سینه — شعاع', en: 'Chest — radius' },
    haunchR: { fa: 'شعاع ران عقب', en: 'Haunch radius' },
    furPuff: { fa: 'پف مو و خارهای پشت (عصبانیت)', en: 'Fur puff and back spikes (anger)' },
    headA: { fa: 'سر — جلو/عقب', en: 'Head — forward/back' },
    headB: { fa: 'سر — ارتفاع', en: 'Head — height' },
    headScale: { fa: 'اندازهٔ سر', en: 'Head scale' },
    headTilt: { fa: 'کج کردن سر (درجه)', en: 'Head tilt (degrees)' },
    headNod: { fa: 'پایین/بالا بردن صورت', en: 'Face nod down/up' },
    faceViewer: { fa: 'چقدر سر به‌جای جهت بدن رو به بیننده بچرخد (۰ تا ۱)', en: 'How much the head turns to the viewer instead of the body heading (0–1)' },
    lookSide: { fa: 'پشت به بیننده: سر از روی کدام شانه برگردد (۱- چپ، ۱+ راست)', en: 'Back turned: which shoulder to look over (-1 left, +1 right)' },
    headYaw: { fa: 'چرخش اضافهٔ سر به راست صفحه (درجه)', en: 'Extra head yaw to screen right (degrees)' },
    headZ: { fa: 'سوگیری عمق سر برای ترتیب رسم', en: 'Head depth bias for draw order' },
    eyeL: { fa: 'باز بودن چشم چپ (۰ بسته، ۱ باز)', en: 'Left eye openness (0 shut, 1 open)' },
    eyeR: { fa: 'باز بودن چشم راست', en: 'Right eye openness' },
    eyeHappy: { fa: 'چشم کمانی خندان (وقتی بسته است)', en: 'Happy arc when eyes are closed' },
    lidAngle: { fa: 'زاویهٔ پلک (اخم)', en: 'Lid angle (frown)' },
    pupil: { fa: 'اندازهٔ مردمک', en: 'Pupil size' },
    pupilSlit: { fa: 'باریک شدن مردمک (شکاف عمودی)', en: 'Pupil slit (vertical)' },
    gazeX: { fa: 'جهت پایهٔ نگاه — افقی', en: 'Base gaze — horizontal' },
    gazeY: { fa: 'جهت پایهٔ نگاه — عمودی', en: 'Base gaze — vertical' },
    mouthOpen: { fa: 'باز بودن دهان', en: 'Mouth open' },
    earFlat: { fa: 'خواباندن گوش‌ها', en: 'Ears flattened' },
    earPerk: { fa: 'تیز کردن گوش‌ها', en: 'Ears perked' },
    pawFNa: { fa: 'دست جلوی نزدیک — هدف پنجه جلو/عقب', en: 'Near front paw — target forward/back' },
    pawFNb: { fa: 'دست جلوی نزدیک — ارتفاع پنجه', en: 'Near front paw — height' },
    pawFFa: { fa: 'دست جلوی دور — جلو/عقب', en: 'Far front paw — forward/back' },
    pawFFb: { fa: 'دست جلوی دور — ارتفاع', en: 'Far front paw — height' },
    pawHNa: { fa: 'پای عقب نزدیک — جلو/عقب', en: 'Near hind paw — forward/back' },
    pawHNb: { fa: 'پای عقب نزدیک — ارتفاع', en: 'Near hind paw — height' },
    pawHFa: { fa: 'پای عقب دور — جلو/عقب', en: 'Far hind paw — forward/back' },
    pawHFb: { fa: 'پای عقب دور — ارتفاع', en: 'Far hind paw — height' },
    thighN: { fa: 'زاویهٔ ران نزدیک (درجه)', en: 'Near thigh angle (degrees)' },
    thighF: { fa: 'زاویهٔ ران دور (درجه)', en: 'Far thigh angle (degrees)' },
    spreadF: { fa: 'فاصلهٔ پهلویی دو دست', en: 'Front legs side spread' },
    spreadH: { fa: 'فاصلهٔ پهلویی دو پای عقب', en: 'Hind legs side spread' },
    tailPitch: { fa: 'زاویهٔ ریشهٔ دم (بالا مثبت)', en: 'Tail root pitch (up positive)' },
    tailCurl: { fa: 'خمیدگی در طول دم', en: 'Curl along the tail' },
    tailCurlTip: { fa: 'خمیدگی نوک دم', en: 'Tip curl' },
    tailSide: { fa: 'چرخش پهلویی ریشهٔ دم', en: 'Sideways tail root' },
    tailSideCurl: { fa: 'خمیدگی پهلویی (پیچیدن دور بدن)', en: 'Sideways curl (wrap around)' },
    tailPuff: { fa: 'پف دم و خارهای آن', en: 'Tail puff and spikes' },
    tailZ: { fa: 'سوگیری عمق دم', en: 'Tail depth bias' },
    tailWaveAmp: { fa: 'دامنهٔ موج دم', en: 'Tail wave amplitude' },
    tailWaveFreq: { fa: 'بسامد موج دم (بار در ثانیه)', en: 'Tail wave frequency (Hz)' },
    tailWaveLen: { fa: 'طول موج دم', en: 'Tail wavelength' },
    tailWaveTip: { fa: 'تمرکز موج روی نوک (توان)', en: 'Wave focus on the tip (exponent)' },
    breathRate: { fa: 'نرخ نفس (بار در ثانیه)', en: 'Breath rate (Hz)' },
    breathAmp: { fa: 'عمق نفس', en: 'Breath depth' },
    gait: { fa: 'چرخهٔ قدم در جا (۰ تا ۱) — برای گالری', en: 'In-place step cycle (0–1) — for the gallery' },
    gaitRun: { fa: 'آمیختگی راه رفتن ↔ دویدن', en: 'Walk ↔ run blend' },
    gaitFreq: { fa: 'آهنگ قدم (چرخه در ثانیه)', en: 'Step cadence (cycles/s)' },
    stride: { fa: 'طول قدم', en: 'Stride length' },
    wiggle: { fa: 'لرزش باسن', en: 'Butt wiggle' },
};

export const SPRING_INFO: Record<SpringGroup, Txt> = {
    body: { fa: 'ستون بدن (لگن، میانه، سینه) و ران', en: 'Spine spheres (hip, mid, chest) and haunch' },
    legs: { fa: 'هدف پنجه‌ها، زاویهٔ ران و فاصلهٔ پاها', en: 'Paw targets, thigh angles, leg spread' },
    head: { fa: 'جای سر، کج شدن و رو به بیننده — نرم‌تر تا کمی از بدن عقب بماند', en: 'Head position, tilt, facing — softer so it trails the body' },
    face: { fa: 'چشم، پلک، مردمک و دهان — سریع و بی‌نوسان', en: 'Eyes, lids, pupils, mouth — fast, no overshoot' },
    ears: { fa: 'گوش‌ها — کمی فنری', en: 'Ears — a little springy' },
    tail: { fa: 'شکل پایهٔ دم — نرم‌ترین، دیرتر از بدن می‌رسد', en: 'Tail base shape — softest, arrives after the body' },
    motion: { fa: 'پارامترهای چرخه‌ای (موج دم، نفس، قدم) — بدون نوسان', en: 'Cyclic parameters (tail wave, breath, gait) — critically damped' },
    heading: { fa: 'جهت بدن (چرخیدن)', en: 'Body heading (turning)' },
    squash: { fa: 'فشردگی، کشیدگی و پرش کوچک — خیلی فنری', en: 'Squash, stretch and hops — very springy' },
};

export const SCHEDULE_RULES: { title: Txt; body: Txt; code: string }[] = [
    {
        title: { fa: 'اولین ظهور', en: 'First appearance' },
        body: { fa: '۸ تا ۱۶ ثانیه بعد از باز شدن صفحهٔ چت (بازهٔ تصادفی یکنواخت).', en: '8–16 s after the chat page opens (uniform random).' },
        code: 'config.ts › DEFAULT_CHAT_CAT_CONFIG.firstDelay',
    },
    {
        title: { fa: 'فاصلهٔ ظهورها', en: 'Interval' },
        body: { fa: '۲۰ تا ۶۰ ثانیه بعد از پایان ظهور قبلی.', en: '20–60 s after the previous appearance ends.' },
        code: 'config.ts › DEFAULT_CHAT_CAT_CONFIG.interval',
    },
    {
        title: { fa: 'بدون تکرار', en: 'No repeats' },
        body: {
            fa: 'هیچ سناریویی دو بار پشت‌سرهم نمی‌آید؛ از بقیهٔ سناریوهای مجاز یکی به‌تصادف انتخاب می‌شود.',
            en: 'No scenario plays twice in a row; one of the other allowed scenarios is picked at random.',
        },
        code: 'ChatCat.tsx › scheduler effect',
    },
    {
        title: { fa: 'تب پنهان', en: 'Hidden tab' },
        body: {
            fa: 'با پنهان شدن تب، شمارش معکوس متوقف می‌شود و بعد از برگشتن ادامه می‌یابد؛ حلقهٔ فریم هم می‌ایستد و صداها قطع می‌شوند.',
            en: 'When the tab is hidden the countdown pauses and resumes on return; the frame loop stops and sounds are cut.',
        },
        code: 'ChatCat.tsx › visibilitychange',
    },
    {
        title: { fa: 'ورودی قفل', en: 'Locked input' },
        body: {
            fa: 'وقتی ورودی چت قفل است یا پیامی در حال ویرایش است (hidden)، گربه نمی‌آید؛ اگر روی صحنه باشد در ۰.۳۵ ثانیه محو می‌شود.',
            en: 'While the chat input is locked or a message is being edited (hidden) the cat does not come; if on stage it fades out in 0.35 s.',
        },
        code: 'ChatCat.tsx › hidden · CatDirector.vanish()',
    },
    {
        title: { fa: 'کم‌تحرک', en: 'Reduced motion' },
        body: {
            fa: 'با prefers-reduced-motion فقط تماشا و خواب؛ ورود و خروج با محو شدن؛ بدون پرش، چرخیدن، شکار و کش و قوس؛ موج دم نصف؛ بدون فشردگی فرود.',
            en: 'With prefers-reduced-motion only watch and sleep; fade in/out; no jumps, spins, hunting or stretches; half tail wave; no landing squash.',
        },
        code: 'ChatCat.tsx › reduced · CatDirector opts.calm · CatRig.calm',
    },
    {
        title: { fa: 'کلید ادمین', en: 'Admin switch' },
        body: {
            fa: 'نسلیار › هوش مصنوعی › تنظیمات › چت: تنظیم studio.chat با catEnabled. هر بارگذاری صفحه یک بار خوانده می‌شود؛ خطا = روشن. دکمه‌های پخش این صفحه از آن مستقل‌اند.',
            en: 'Naslyar › AI › Settings › Chat: system setting studio.chat { catEnabled }. Read once per page load; a failed request counts as on. The play buttons here ignore it.',
        },
        code: 'ChatCat.tsx › fetchCatEnabled()',
    },
    {
        title: { fa: 'اندازه', en: 'Size' },
        body: {
            fa: 'مقیاس = clamp(عرض چت‌باکس ÷ ۹۰۰، ۰.۵۲، ۰.۷۸) × size؛ ارتفاع صحنه = ۱۹۰ × مقیاس. صحنه دقیقاً روی لبهٔ بالای چت‌باکس است، پایینش بریده و دو سرش محو می‌شود.',
            en: 'Scale = clamp(chat box width ÷ 900, 0.52, 0.78) × size; stage height = 190 × scale. The stage sits on the chat box top edge, clipped below and faded at both ends.',
        },
        code: 'ChatCat.tsx › CatStage measure() · ChatCat.module.scss',
    },
    {
        title: { fa: 'تست دستی', en: 'Manual testing' },
        body: {
            fa: '?cat=sleep|watch|ball|walk در آدرس هر صفحهٔ چت (۰.۹ ثانیه بعد)؛ در حالت توسعه window.__chatCat.play(\'ball\') و window.__chatCatStage.frame(1/30).',
            en: '?cat=sleep|watch|ball|walk on any chat page (after 0.9 s); in development window.__chatCat.play(\'ball\') and window.__chatCatStage.frame(1/30).',
        },
        code: 'ChatCat.tsx',
    },
];

export const SOUND_INFO: Record<CatSoundName, Txt> = {
    meow: { fa: 'میو با کلیک در تماشا (سرعت پخش تصادفی ۰.۹۵ تا ۱.۰۸)', en: 'Meow on click while watching (random rate 0.95–1.08)' },
    angry: { fa: 'دو میوی عصبانی بعد از ترکیدن توپ', en: 'Two angry meows after the ball pops' },
    purr: { fa: 'خرخر حلقه‌ای هنگام نوازش', en: 'Looping purr while petted' },
    pop: { fa: 'ترکیدن توپ', en: 'Ball pop' },
    noise: { fa: 'بیدار شدن ناگهانی از خواب (بلندی ۰.۶)', en: 'Sudden wake from sleep (gain 0.6)' },
};

export const INTERACTIONS: { input: Txt; effect: Txt }[] = [
    { input: { fa: 'ماوس روی گربه', en: 'Hover the cat' }, effect: { fa: 'نوازش (تماشا)', en: 'Petting (watch)' } },
    { input: { fa: 'کلیک یا تپ روی گربه', en: 'Click/tap the cat' }, effect: { fa: 'میو (تماشا) · بیدار شدن فوری (خواب)', en: 'Meow (watch) · instant wake (sleep)' } },
    { input: { fa: 'تایپ در چت‌باکس', en: 'Typing in the chat box' }, effect: { fa: '۱+ امتیاز صدا (خواب)', en: '+1 noise (sleep)' } },
    { input: { fa: 'کلیک جای دیگر ستون چت', en: 'Click elsewhere in the chat column' }, effect: { fa: '۱.۷+ امتیاز صدا (خواب)', en: '+1.7 noise (sleep)' } },
    { input: { fa: 'حرکت سریع ماوس نزدیک گربه', en: 'Fast mouse near the cat' }, effect: { fa: 'شکار (تماشا)', en: 'Hunt (watch)' } },
    { input: { fa: 'ماوس نزدیک و ثابت', en: 'Mouse near and still' }, effect: { fa: 'کنجکاوی (تماشا)', en: 'Curious (watch)' } },
    { input: { fa: 'کلیک روی توپ', en: 'Click the ball' }, effect: { fa: 'ترکیدن و عصبانیت (توپ)', en: 'Pop and anger (ball)' } },
];

/** همهٔ شناسه‌های مرحله → عنوان ردیف (برای لاگ) */
export const STEP_TITLES: Record<string, Txt> = (() => {
    const map: Record<string, Txt> = { vanish: { fa: 'محو فوری (ورودی قفل شد)', en: 'Vanish (input locked)' } };
    for (const scenario of SCENARIOS) {
        for (const step of scenario.steps) {
            for (const id of step.ids) map[id] ??= step.title;
        }
    }
    map['enter.calm'] = { fa: 'ورود با محو شدن', en: 'Fade in' };
    map['leave.calm'] = { fa: 'خروج با محو شدن', en: 'Fade out' };
    map['leave.run'] = { fa: 'دویدن بیرون', en: 'Run off' };
    map['ball.play'] = { fa: 'شروع بازی', en: 'Play starts' };
    map['ball.angry'] = { fa: 'عصبانیت', en: 'Angry' };
    for (const id of ['enter.walk', 'enter.jump', 'leave.walk', 'leave.jump', 'sleep.curl', 'sleep.side', 'watch.front', 'watch.back', 'watch.huntSwipe', 'watch.huntLeap'] as CatFlag[]) {
        map[id] = FLAG_LABELS[id];
    }
    return map;
})();

/** ژست → مراحلی که از آن استفاده می‌کنند */
export const POSE_USAGE: Partial<Record<PoseName, { scenario: ScenarioName; title: Txt }[]>> = (() => {
    const map: Partial<Record<PoseName, { scenario: ScenarioName; title: Txt }[]>> = {};
    for (const scenario of SCENARIOS) {
        for (const step of scenario.steps) {
            for (const pose of step.poses ?? []) {
                const list = (map[pose] ??= []);
                if (!list.some((item) => item.title === step.title)) list.push({ scenario: scenario.name, title: step.title });
            }
        }
    }
    return map;
})();
