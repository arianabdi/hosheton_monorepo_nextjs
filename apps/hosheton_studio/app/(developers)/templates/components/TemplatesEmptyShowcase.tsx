'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuBookmark,
    LuCheck,
    LuCircleDollarSign,
    LuHeart,
    LuImage,
    LuLock,
    LuMic,
    LuMousePointerClick,
    LuSearch,
    LuShare2,
    LuSparkles,
    LuTrendingUp,
    LuUsers,
    LuWorkflow,
} from 'react-icons/lu';
import { FeatureShowcase, type ShowcaseFeature } from '@/app/(developers)/projects/components/FeatureShowcase';
import { FACES, FaceTile, type FaceSpec } from '@/app/(developers)/projects/components/ProjectsEmptyShowcase';
import styles from './TemplatesEmptyShowcase.module.scss';

/* حالت خالی «قالب‌های من» — هم‌چیدمان حالت خالی پروژه‌ها (FeatureShowcase) با سه صحنه، هر کدام
   یک یا دو باکس ساده هم‌سبک نود: قالب بیشتر = مخاطب بیشتر، قالب پولی = درآمد، متن دقیق = سئوی گوگل. */

const AUDIENCE_FACES: FaceSpec[] = [
    FACES.bobPurple, FACES.capMustache, FACES.curlyRed, FACES.darkBeard, FACES.hiTop, FACES.redLong, FACES.brownGlasses,
];
const AUDIENCE_COUNTS = ['0', '120', '480', '1.2K', '3.4K'];
const SLOTS = [0, 1, 2, 3] as const;
const SALES = [0, 1, 2] as const;
const EARNINGS = [0, 5, 10, 15];

/** هر قالب تازه در پروفایل سازنده → شمار مخاطبان و آواتارهای دنبال‌کننده و نوار دسترسی بالا می‌رود */
function AudienceArt() {
    return (
        <span className={`${styles.box} ${styles.auBox}`}>
            <span className={styles.boxHead}>
                <FaceTile spec={FACES.gingerGlasses} className={styles.headAvatar} />
                <b />
            </span>
            <span className={styles.auSlots}>
                {SLOTS.map((i) => (
                    <span key={i} className={styles.auSlot}><span className={styles.auTpl}><i /></span></span>
                ))}
            </span>
            <span className={styles.auStats}>
                <LuUsers className={styles.auUsersIcon} />
                <span className={styles.auCount}>
                    {AUDIENCE_COUNTS.map((value) => <em key={value}>{value}</em>)}
                </span>
                <span className={styles.auFans}>
                    {AUDIENCE_FACES.map((spec, i) => <FaceTile key={i} spec={spec} className={styles.auFan} />)}
                </span>
            </span>
            <span className={styles.auReach}><i /></span>
        </span>
    );
}

// نمودار خطی درآمد ($0 → $5 → $10 → $15) در مختصات ۱۴۴×۶۲ همان کاغذ نمودار
const EARN_LINE = 'M4 56 L50 42 L96 24 L140 6';
const EARN_POINTS: [number, number][] = [[4, 56], [50, 42], [96, 24], [140, 6]];

/** پنجره جزئیات قالب (همان که با کلیک روی تصویر در اکسپلور باز می‌شود): مدیا چپ، سایدبار راست و
    دکمه «خرید» پایینش. خریدار روی خرید کلیک می‌کند → سکه روی «کاغذ» درآمد که روی پنجره افتاده می‌رود،
    جمع با جرقه و «+$5» بالا می‌رود و نمودار خطی یک قدم دیگر رشد می‌کند */
function EarnArt() {
    return (
        <>
            <span className={`${styles.box} ${styles.enWin}`}>
                <FaceTile spec={FACES.redLong} className={styles.enStage} />
                <span className={styles.enStageBar}><b /><i /><i /></span>

                <b className={styles.enTitle} />
                <FaceTile spec={FACES.gingerGlasses} className={styles.enCreator} />
                <b className={styles.enHandle} />
                <span className={styles.enKind}><LuWorkflow /></span>
                <span className={styles.enSocial}>
                    <i><LuHeart /></i><i><LuBookmark /></i><i><LuShare2 /></i>
                </span>
                <span className={styles.enLocked}><b /><b /><i><LuLock /></i></span>
                <b className={styles.enMoreLabel} />
                <span className={styles.enMore}><i /><i /><i /></span>

                <span className={styles.enCta}>
                    <span className={styles.enBuy}><LuLock /><b>$5</b></span>
                    <span className={styles.enUseRef}><LuImage /></span>
                </span>
                <span className={styles.enRipple} />
                <span className={styles.enBurst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <LuMousePointerClick className={styles.enCursor} />
            </span>

            {/* کاغذ درآمد روی پنجره، با یک برگه دیگر پشتش */}
            <span className={styles.enSheetBack} />
            <span className={styles.enSheet}>
                <LuCircleDollarSign className={styles.enEarnIcon} />
                <span className={styles.enTotal}>
                    {EARNINGS.map((value) => <em key={value}>${value}</em>)}
                </span>
                <span className={styles.enSparks}><i /><i /><i /><i /><i /><i /></span>
                <em className={styles.enPlus}>+$5</em>
                <span className={styles.enTrend}><LuTrendingUp /></span>

                <span className={styles.enChart}>
                    <svg viewBox="0 0 144 62">
                        <path className={styles.enGrid} d="M0 14 H144 M0 34 H144 M0 54 H144" />
                        <path className={styles.enLine} pathLength={1} d={EARN_LINE} />
                    </svg>
                    {EARN_POINTS.map(([x, y], i) => (
                        <span key={i} className={styles.enDot} style={{ left: x, top: y }}><i /></span>
                    ))}
                </span>
            </span>

            {SALES.map((i) => <span key={i} className={`${styles.enCoin} ${styles[`enCoin${i + 1}`]}`}>$</span>)}
        </>
    );
}

const GOOGLE_LETTERS = ['G', 'o', 'o', 'g', 'l', 'e'];

/** صفحه کوچک قالب (کاور کاراکتر با نشان AI) کامل‌تر می‌شود و نتیجه همان قالب در صفحه بزرگ
    جستجوی گوگل از رتبه ۳ به ۱ می‌رسد */
function SeoArt() {
    return (
        <>
            <span className={`${styles.box} ${styles.seForm}`}>
                <span className={styles.seCover}>
                    <FaceTile spec={FACES.redLong} className={styles.seCoverFace} />
                    <span className={styles.seAi}><LuSparkles /></span>
                </span>
                <span className={`${styles.seField} ${styles.seTitle}`}>
                    <i className={styles.seType} />
                    <span className={styles.seOk}><LuCheck /></span>
                </span>
                <span className={`${styles.seField} ${styles.seDesc}`}>
                    <i className={styles.seLine} /><i className={styles.seLine} />
                    <span className={styles.seOk}><LuCheck /></span>
                </span>
                <span className={styles.seTags}>
                    <i /><i /><i />
                    <span className={styles.seOk}><LuCheck /></span>
                </span>
                <span className={styles.seMeter}><em>SEO</em><span><i /></span></span>
            </span>

            <span className={`${styles.box} ${styles.seGoogle}`}>
                <span className={styles.seLogo}>
                    {GOOGLE_LETTERS.map((letter, i) => <em key={i}>{letter}</em>)}
                </span>
                <span className={styles.seSearch}><LuSearch /><b /><LuMic className={styles.seMic} /></span>
                <span className={styles.seTabs}><b /><b /><b /><b /></span>
                <span className={`${styles.seResult} ${styles.seOther1}`}><i /><b /><b /><b /></span>
                <span className={`${styles.seResult} ${styles.seOther2}`}><i /><b /><b /><b /></span>
                <span className={`${styles.seResult} ${styles.seMine}`}>
                    <i /><b /><b /><b />
                    <FaceTile spec={FACES.redLong} className={styles.seThumb} />
                    <span className={styles.seUp}><LuTrendingUp /></span>
                </span>
            </span>
        </>
    );
}

const FEATURES: Omit<ShowcaseFeature, 'title' | 'text'>[] = [
    { key: 'audience', Icon: LuUsers, Art: AudienceArt, loopMs: 10000 },
    { key: 'earn', Icon: LuCircleDollarSign, Art: EarnArt, loopMs: 11000 },
    { key: 'seo', Icon: LuSearch, Art: SeoArt, loopMs: 12000 },
];

export function TemplatesEmptyShowcase({ title }: { title: string }) {
    const { t } = useTranslation('templates');
    const features = useMemo(
        () => FEATURES.map((feature) => ({
            ...feature,
            title: t(`showcase_${feature.key}_title`),
            text: t(`showcase_${feature.key}_text`),
        })),
        [t],
    );

    return (
        <FeatureShowcase
            title={title}
            lead={t('showcase_lead')}
            features={features}
            createLabel={t('create')}
            createHref="/templates/new"
            // «+ ایجاد قالب» در هدر صفحه هست — معرفی تکراری نشان داده نمی‌شود
            showIntro={false}
        />
    );
}
