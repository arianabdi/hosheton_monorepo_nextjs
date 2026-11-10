'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
    LuArrowUp,
    LuCrown,
    LuFilm,
    LuHammer,
    LuHeart,
    LuImage,
    LuLayers,
    LuMessagesSquare,
    LuMousePointer2,
    LuMousePointerClick,
    LuMusic,
    LuPlay,
    LuPlus,
    LuSparkles,
    LuWallet,
} from 'react-icons/lu';
import { RiFlowChart, RiMessage3Line } from 'react-icons/ri';
import { CgEditFlipH } from 'react-icons/cg';
import { FeatureShowcase, type ShowcaseFeature } from './FeatureShowcase';
import styles from './ProjectsEmptyShowcase.module.scss';

/* حالت خالی لیست پروژه‌ها — صحنه‌های موشن قابلیت‌ها؛ چیدمان و پخش خودکار در FeatureShowcase است.
   موشن‌ها فقط CSS‌اند و هر صحنه ۳۶۰×۲۲۰ و چپ‌به‌راست (مثل کانواس)؛ زمان‌بندی keyframeها
   درصدی از --loop همان صحنه است که از loopMs همین فایل می‌آید. */

type ProjectsEmptyShowcaseProps = {
    createLabel: string;
};


/** نودِ نمادین شبیه نودهای کانواس: هدر (آیکن + عنوان) و بدنه دلخواه */
function MiniNode({ className, header, children }: { className: string; header?: ReactNode; children?: ReactNode }) {
    return (
        <span className={`${styles.wfNode} ${className}`}>
            <span className={styles.wfHeader}><i /><b />{header}</span>
            <span className={styles.wfBody}>{children}</span>
        </span>
    );
}

/* ───────── کاراکترهای فلت (الهام از آواتارهای تخت: سر گرد، مو/ریش/عینک ساده) ───────── */

export type FaceSpec = {
    hair: 'short' | 'quiff' | 'bob' | 'curly' | 'long' | 'tall' | 'cap' | 'bald';
    beard?: 'full' | 'mustache';
    glasses?: 'round' | 'sun' | 'gold';
    lips?: boolean;
    skin: string;
    hairColor: string;
    shirt: string;
    bg: string;
    hat?: string;
};

export const FACES = {
    bobPurple: { hair: 'bob', lips: true, skin: '#f8d3bc', hairColor: '#1f2937', shirt: '#7c3aed', bg: '#dbeafe' },
    gingerGlasses: { hair: 'quiff', glasses: 'round', skin: '#f6c7a6', hairColor: '#f0592a', shirt: '#2563eb', bg: '#fde68a' },
    curlyRed: { hair: 'curly', lips: true, skin: '#f8d3bc', hairColor: '#f97316', shirt: '#7e22ce', bg: '#fce7f3' },
    brownGlasses: { hair: 'short', glasses: 'round', skin: '#f2b38b', hairColor: '#7c3f1d', shirt: '#818cf8', bg: '#d1fae5' },
    darkBeard: { hair: 'bald', beard: 'full', skin: '#8b5a3c', hairColor: '#1f1f24', shirt: '#14b8a6', bg: '#e0e7ff' },
    capMustache: { hair: 'cap', beard: 'mustache', skin: '#f2a07b', hairColor: '#5b2c12', hat: '#3b5ba5', shirt: '#1e40af', bg: '#fee2e2' },
    hiTop: { hair: 'tall', glasses: 'gold', skin: '#7a4528', hairColor: '#141414', shirt: '#db2777', bg: '#fef3c7' },
    redLong: { hair: 'long', lips: true, skin: '#f8d3bc', hairColor: '#e5483b', shirt: '#6d28d9', bg: '#cffafe' },
    gingerBeard: { hair: 'quiff', beard: 'full', skin: '#f6c7a6', hairColor: '#e8642c', shirt: '#c026d3', bg: '#ede9fe' },
} satisfies Record<string, FaceSpec>;

/** یک کاراکتر فلت در کادر ۱۰em×۱۰em (اندازه با font-size والد)؛ talk = دهان و پلک متحرک */
function Face({ spec, talk = false }: { spec: FaceSpec; talk?: boolean }) {
    const longHair = spec.hair === 'bob' || spec.hair === 'curly' || spec.hair === 'long';
    const vars = {
        '--skin': spec.skin,
        '--hair': spec.hairColor,
        '--shirt': spec.shirt,
        '--hat': spec.hat ?? spec.hairColor,
    } as CSSProperties;

    return (
        <span className={`${styles.face} ${talk ? styles.faceTalk : ''}`} style={vars}>
            {longHair ? <i className={`${styles.fHairBack} ${styles[`fHairBack_${spec.hair}`]}`} /> : null}
            <i className={styles.fShirt} />
            <i className={styles.fNeck} />
            {longHair ? null : <><i className={styles.fEar} /><i className={`${styles.fEar} ${styles.fEarR}`} /></>}
            <i className={styles.fHead} />
            {spec.beard === 'full' ? <i className={styles.fBeard} /> : null}
            {spec.beard === 'full' ? null : <><i className={styles.fCheek} /><i className={`${styles.fCheek} ${styles.fCheekR}`} /></>}
            <i className={styles.fBrow} />
            <i className={`${styles.fBrow} ${styles.fBrowR}`} />
            <i className={styles.fEye} />
            <i className={`${styles.fEye} ${styles.fEyeR}`} />
            <i className={styles.fNose} />
            {spec.beard ? <i className={styles.fMustache} /> : null}
            <i className={`${styles.fMouth} ${spec.lips ? styles.fLips : ''}`} />
            {spec.glasses ? <i className={`${styles.fGlasses} ${styles[`fGlasses_${spec.glasses}`]}`} /> : null}
            <i className={`${styles.fHair} ${styles[`fHair_${spec.hair}`]}`} />
        </span>
    );
}

/** کاشی تصویر با کاراکتر (گالری چت، بین ادیتور، آواتارها) */
export function FaceTile({ spec, className, talk }: { spec: FaceSpec; className: string; talk?: boolean }) {
    return (
        <span className={className} style={{ '--bg': spec.bg } as CSSProperties}>
            <Face spec={spec} talk={talk} />
        </span>
    );
}

const CHAT_TILES: { spec: FaceSpec; className: string }[] = [
    { spec: FACES.gingerGlasses, className: `${styles.cvTile} ${styles.cvShift} ${styles.cvA}` },
    { spec: FACES.bobPurple, className: `${styles.cvTile} ${styles.cvShift} ${styles.cvB}` },
    { spec: FACES.capMustache, className: `${styles.cvTile} ${styles.cvShift} ${styles.cvC}` },
    { spec: FACES.curlyRed, className: `${styles.cvTile} ${styles.cvRow2} ${styles.cvD}` },
    { spec: FACES.darkBeard, className: `${styles.cvTile} ${styles.cvRow2} ${styles.cvE}` },
    { spec: FACES.redLong, className: `${styles.cvTile} ${styles.cvRow2} ${styles.cvF}` },
];

const BIN_FACES: FaceSpec[] = [
    FACES.gingerBeard, FACES.bobPurple, FACES.gingerBeard, FACES.hiTop, FACES.gingerBeard, FACES.redLong,
];

// گراف ورک‌فلو: دو ورودی (پرامپت، تصویر) → نود تولید → نود خروجی ویدیو
const WF_EDGE_1 = 'M90 42 C104 42 104 75 118 75';
const WF_EDGE_2 = 'M90 133 C104 133 104 99 118 99';
const WF_EDGE_OUT = 'M206 87 L236 87';

const LIVE_HOST: FaceSpec = { hair: 'short', skin: '#f08cb3', hairColor: '#1b1b1f', shirt: '#f5b400', bg: 'transparent' };

/** ویدیوی خروجی ورک‌فلو: میزبان روی مبل جلوی گوشی روی سه‌پایه، با رینگ‌لایت و برچسب LIVE */
function LiveScene() {
    return (
        <span className={styles.live}>
            <i className={styles.liveWall} />
            <i className={styles.livePicture} />
            <i className={styles.liveFloor} />
            <i className={styles.liveChair} />
            <i className={styles.liveLegs} />
            <i className={styles.liveBody} />
            <span className={styles.liveHost}><Face spec={LIVE_HOST} talk /></span>
            <i className={styles.liveArm} />
            <i className={styles.liveRing} />
            <em className={styles.liveTag}>LIVE</em>
            <i className={styles.liveTripod} />
            <i className={styles.livePhone} />
            <i className={styles.liveTable} />
        </span>
    );
}

function ModesArt() {
    const { t } = useTranslation('projects');
    return (
        <>
            <span className={styles.modeTabs}>
                <span className={styles.modePill} />
                <span className={styles.modeTab}><RiFlowChart /><em>{t('workflow')}</em></span>
                <span className={styles.modeTab}><RiMessage3Line /><em>{t('chat')}</em></span>
                <span className={styles.modeTab}><CgEditFlipH /><em>{t('editor_tab')}</em></span>
            </span>

            {/* ── Workflow: وصل کردن نودهای ورودی با درگ، زدن Play و تحویل یک ویدیو ── */}
            <span className={`${styles.modeView} ${styles.viewWorkflow}`}>
                <svg className={styles.wfEdges} viewBox="0 0 360 180">
                    <path className={`${styles.wfLink} ${styles.wfLink1}`} pathLength={1} d={WF_EDGE_1} />
                    <path className={`${styles.wfLink} ${styles.wfLink2}`} pathLength={1} d={WF_EDGE_2} />
                    <path d={WF_EDGE_OUT} />
                    <path className={styles.wfFlowIn} d={WF_EDGE_1} />
                    <path className={styles.wfFlowIn} d={WF_EDGE_2} />
                    <path className={styles.wfFlowOut} d={WF_EDGE_OUT} />
                </svg>
                <MiniNode className={styles.wfPrompt}>
                    <b /><b /><b />
                    <span className={`${styles.wfHandle} ${styles.wfHandleOut} ${styles.wfH1}`} />
                </MiniNode>
                <MiniNode className={styles.wfImage}>
                    <span className={styles.wfThumb} />
                    <span className={`${styles.wfHandle} ${styles.wfHandleOut} ${styles.wfH2}`} />
                </MiniNode>
                <MiniNode className={styles.wfGen} header={<span className={styles.wfRun}><LuPlay /></span>}>
                    <span className={styles.wfModel}><LuSparkles /><b /></span>
                    <span className={styles.wfProgress}><i /></span>
                    <span className={`${styles.wfHandle} ${styles.wfHandleIn} ${styles.wfHandleInTop} ${styles.wfH1t}`} />
                    <span className={`${styles.wfHandle} ${styles.wfHandleIn} ${styles.wfHandleInBottom} ${styles.wfH2t}`} />
                    <span className={`${styles.wfHandle} ${styles.wfHandleOut} ${styles.wfH3}`} />
                </MiniNode>
                <MiniNode className={styles.wfOut}>
                    <span className={styles.wfVideo}>
                        <LiveScene />
                        <span className={styles.wfVideoBar}><i /></span>
                    </span>
                    <span className={`${styles.wfHandle} ${styles.wfHandleIn} ${styles.wfH3}`} />
                </MiniNode>
                <span className={styles.wfRipple} />
                <span className={styles.wfBurst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <LuMousePointerClick className={styles.wfCursor} />
            </span>

            {/* ── Chat v2: پرامپت در کامپوزر، باکس «در حال تولید» اول گرید گالری و تبدیلش به خروجی ── */}
            <span className={`${styles.modeView} ${styles.viewChat}`}>
                {CHAT_TILES.map((tile, i) => (
                    <FaceTile key={i} spec={tile.spec} className={tile.className} />
                ))}
                <span className={styles.cvProcessing}>
                    <svg className={styles.cvDash}><rect width="100%" height="100%" rx="9" ry="9" /></svg>
                    <span className={styles.cvMine}>
                        <span className={styles.cvLogo}><LuSparkles /></span>
                        <span className={styles.cvHammer}><LuHammer /></span>
                        <span className={styles.cvSparks}><i /><i /><i /></span>
                    </span>
                    <span className={styles.cvDots}><i /><i /><i /></span>
                </span>
                <FaceTile spec={FACES.hiTop} className={`${styles.cvTile} ${styles.cvNew}`} />
                <span className={styles.cvComposer}>
                    <span className={styles.cvMention}><LuImage /></span>
                    <span className={styles.cvText} />
                    <span className={styles.cvSend}><LuArrowUp /></span>
                </span>
            </span>

            {/* ── Editor: چیدمان شبیه Premiere — بین مدیا، مانیتور برنامه، میترهای صدا و تایم‌لاین چندترکی ── */}
            <span className={`${styles.modeView} ${styles.viewEditor}`}>
                <span className={styles.edBin}>
                    <b />
                    <span className={styles.edBinGrid}>
                        {BIN_FACES.map((spec, i) => (
                            <FaceTile key={i} spec={spec} className={styles.edBinThumb} />
                        ))}
                    </span>
                </span>
                {/* مانیتور: یک کاراکتر در حال صحبت؛ هر کلیپ V1 یک کادربندی (مدیوم، کلوزآپ، زاویه دوم) */}
                <span className={styles.edMonitor}>
                    <FaceTile spec={FACES.gingerBeard} talk className={`${styles.edFrame} ${styles.edFrame0}`} />
                    <FaceTile spec={FACES.gingerBeard} talk className={`${styles.edFrame} ${styles.edFrame1}`} />
                    <FaceTile spec={FACES.gingerBeard} talk className={`${styles.edFrame} ${styles.edFrame2}`} />
                    <span className={styles.edTitle}><b /><b /></span>
                </span>
                <span className={styles.edTransport}>
                    <em>00:00:04:12</em>
                    <LuPlay />
                </span>
                <span className={styles.edMeters}><i /><i /></span>
                <span className={styles.edFx}>
                    <b /><b /><b /><b />
                </span>
                <span className={styles.edTimeline}>
                    <span className={styles.edRuler} />
                    <span className={styles.edHeads}><em>V2</em><em>V1</em><em>A1</em><em>A2</em></span>
                    <span className={`${styles.edLane} ${styles.edV2}`}><i className={styles.edGfx} /></span>
                    <span className={`${styles.edLane} ${styles.edV1}`}><i /><i /><i /></span>
                    <span className={`${styles.edLane} ${styles.edA1}`}><i /></span>
                    <span className={`${styles.edLane} ${styles.edA2}`}><i /></span>
                    <span className={styles.edPlayhead} />
                </span>
                <span className={styles.edDrag}><b /><b /></span>
                <LuMousePointer2 className={styles.edCursor} />
            </span>
        </>
    );
}

// موجودی پروژه: شارژ ۲۰ دلار → مصرف ۵، ۱۰، ۵ تا صفر → شارژ دوباره ۲۰ دلار
type BillOutput = 'image' | 'video' | 'audio';
const BILL_USES: { spec: FaceSpec; output: FaceSpec; kind: BillOutput; cost: number }[] = [
    { spec: FACES.curlyRed, output: FACES.bobPurple, kind: 'image', cost: 5 },
    { spec: FACES.capMustache, output: FACES.darkBeard, kind: 'video', cost: 10 },
    { spec: FACES.hiTop, output: FACES.redLong, kind: 'audio', cost: 5 },
];
const BILL_ICONS: Record<BillOutput, IconType> = { image: LuImage, video: LuFilm, audio: LuMusic };
const BILL_BALANCE = [0, 20, 15, 5, 0, 20];
const BILL_COINS = [0, 1, 2, 3, 4, 5] as const;

/** صاحب پروژه (تاج‌دار) بالای باکس پروژه «+$20» می‌زند و سکه‌ها موجودی پروژه را شارژ می‌کنند؛ اعضای تیم
    با همان موجودی تصویر، ویدیو و صدا تولید می‌کنند و هر تولید یک ردیف هزینه می‌شود و موجودی کم می‌شود؛
    وقتی به صفر رسید، صاحب پروژه دوباره شارژ می‌کند */
function WalletArt() {
    return (
        <span className={styles.blScene}>
            {BILL_USES.map(({ spec, output, kind }, i) => (
                <span key={i} className={`${styles.blMember} ${styles[`blM${i + 1}`]}`}>
                    <FaceTile spec={spec} className={styles.blAvatar} />
                    <span className={styles.blOut}>
                        <i className={styles.blSpin} />
                        <span className={`${styles.blOutMedia} ${styles[`blOut_${kind}`]}`}>
                            {kind === 'audio' ? (
                                <span className={styles.blWave}><i /><i /><i /><i /><i /></span>
                            ) : (
                                <FaceTile spec={output} talk={kind === 'video'} className={styles.blOutFace} />
                            )}
                            {kind === 'video' ? <span className={styles.blPlay}><LuPlay /></span> : null}
                        </span>
                    </span>
                    <i className={styles.blDot} />
                </span>
            ))}

            <span className={styles.blOwner}>
                <FaceTile spec={FACES.gingerGlasses} className={styles.blAvatar} />
                <span className={styles.blCrown}><LuCrown /></span>
            </span>
            <span className={styles.blCharge}><LuPlus /><b>$20</b></span>

            <span className={styles.blBox}>
                <span className={styles.blHead}>
                    <LuWallet className={styles.blWalletIcon} />
                    <span className={styles.blAmount}>
                        {BILL_BALANCE.map((value, i) => <em key={i}>${value}</em>)}
                    </span>
                    <b />
                </span>
                <em className={`${styles.blDelta} ${styles.blPlus}`}>+$20</em>
                {BILL_USES.map(({ cost }, i) => (
                    <em key={i} className={`${styles.blDelta} ${styles.blMinus} ${styles[`blMinus${i + 1}`]}`}>−${cost}</em>
                ))}
                {BILL_USES.map(({ spec, kind, cost }, i) => {
                    const Icon = BILL_ICONS[kind];
                    return (
                        <span key={i} className={`${styles.blRow} ${styles[`blR${i + 1}`]}`}>
                            <FaceTile spec={spec} className={styles.blRowAvatar} />
                            <Icon className={styles.blRowIcon} />
                            <b />
                            <em>−${cost}</em>
                        </span>
                    );
                })}
            </span>

            {BILL_COINS.map((i) => <i key={i} className={`${styles.blCoin} ${styles[`blC${i + 1}`]}`} />)}

            <span className={styles.blRipple} />
            <span className={styles.blBurst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
            <LuMousePointerClick className={styles.blCursor} />
        </span>
    );
}

function TeamChatArt() {
    return (
        <>
            <FaceTile spec={FACES.curlyRed} className={`${styles.tcAvatar} ${styles.tcRow1}`} />
            <span className={`${styles.tcBubble} ${styles.tcRow1}`}><b /><b /></span>

            <FaceTile spec={FACES.brownGlasses} className={`${styles.tcAvatar} ${styles.tcRow2}`} />
            <span className={`${styles.tcBubble} ${styles.tcMine} ${styles.tcRow2}`}>
                <span className={styles.tcMentionChip} /><b />
            </span>

            <FaceTile spec={FACES.capMustache} className={`${styles.tcAvatar} ${styles.tcRow3}`} />
            <span className={`${styles.tcBubble} ${styles.tcMedia} ${styles.tcRow3}`}>
                <span className={styles.tcImage} />
                <b />
            </span>
            <span className={styles.tcHeart}><LuHeart /></span>

            <span className={styles.tcTyping}><i /><i /><i /></span>
            <span className={`${styles.tcBubble} ${styles.tcMine} ${styles.tcRow4}`}><b /></span>
        </>
    );
}

const FEATURES: Omit<ShowcaseFeature, 'title' | 'text'>[] = [
    { key: 'modes', Icon: LuLayers, Art: ModesArt, loopMs: 16500 },
    { key: 'wallet', Icon: LuWallet, Art: WalletArt, loopMs: 12000 },
    { key: 'team_chat', Icon: LuMessagesSquare, Art: TeamChatArt, loopMs: 7000 },
];

export function ProjectsEmptyShowcase({ createLabel }: ProjectsEmptyShowcaseProps) {
    const { t } = useTranslation('projects');
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
            title={t('empty')}
            lead={t('showcase_lead')}
            features={features}
            createLabel={createLabel}
            createHref="/projects/new"
        />
    );
}
