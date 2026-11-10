'use client';

import { useSyncExternalStore } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
    LuArrowLeft,
    LuArrowRight,
    LuBell,
    LuCheck,
    LuDownload,
    LuImage,
    LuInfo,
    LuLayers,
    LuMoon,
    LuPalette,
    LuPlus,
    LuSearch,
    LuSettings,
    LuShapes,
    LuSparkles,
    LuStar,
    LuSun,
    LuTrash2,
    LuTriangleAlert,
    LuType,
    LuUpload,
} from 'react-icons/lu';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import styles from './SystemDesign.module.scss';

/* توکن‌های رنگی — مقدار روشن/تیره از globals.css؛ سواچ خودش از var زنده می‌خواند */
type ColorToken = {
    name: string;
    light: string;
    dark?: string;
    noteKey: string;
};

type ColorGroup = {
    titleKey: string;
    noteKey: string;
    tokens: ColorToken[];
};

const COLOR_GROUPS: ColorGroup[] = [
    {
        titleKey: 'group_brand_title',
        noteKey: 'group_brand_note',
        tokens: [
            { name: '--brand-color', light: '#7B64CF', noteKey: 'token_brand' },
            { name: '--button-background', light: '#7B64CF', noteKey: 'token_button_bg' },
            { name: '--selected-item', light: '#7B64CF', noteKey: 'token_selected_item' },
            { name: '--border-color-selected', light: '#7B64CF', noteKey: 'token_border_selected' },
            { name: '--active-card-path-color', light: '#0076FF', dark: '#454DDB', noteKey: 'token_active_path' },
        ],
    },
    {
        titleKey: 'group_actions_title',
        noteKey: 'group_actions_note',
        tokens: [
            { name: '--button-green', light: '#09C284', dark: '#318064', noteKey: 'token_button_green' },
            { name: '--icon-green', light: '#278E67', noteKey: 'token_icon_green' },
            { name: '--icon-red', light: '#BB5C5C', noteKey: 'token_icon_red' },
            { name: '--blue-bg', light: '#003DFF', noteKey: 'token_blue_bg' },
            { name: '--link-text-color', light: '#003DFF', dark: '#9FD5FF', noteKey: 'token_link' },
        ],
    },
    {
        titleKey: 'group_surfaces_title',
        noteKey: 'group_surfaces_note',
        tokens: [
            { name: '--body-background', light: '#EBEBEB', dark: '#060608', noteKey: 'token_body_bg' },
            { name: '--page-view-background-color', light: '#F7F7F7', dark: '#0C121F', noteKey: 'token_page_bg' },
            { name: '--plan-card-background-color', light: '#FFFFFF', dark: '#0D0E12', noteKey: 'token_plan_card_bg' },
            { name: '--card-background', light: '#EAEAEA', dark: '#0D1424', noteKey: 'token_card_bg' },
            { name: '--scrollable-list-item-background', light: '#FFFFFF', dark: '#0D1424', noteKey: 'token_list_item_bg' },
            { name: '--input-background-color', light: '#FFFFFF', dark: '#1B1B1B', noteKey: 'token_input_bg' },
            { name: '--sidebar-color', light: '#F1F1F1', dark: '#1D1D20', noteKey: 'token_sidebar' },
        ],
    },
    {
        titleKey: 'group_text_title',
        noteKey: 'group_text_note',
        tokens: [
            { name: '--body-text-color', light: '#000000', dark: '#D9D9D9', noteKey: 'token_body_text' },
            { name: '--icon-color', light: '#3F4149', dark: '#B0B0B0', noteKey: 'token_icon' },
            { name: '--settings-text-muted', light: '#666666', dark: '#9CA3AF', noteKey: 'token_text_muted' },
            { name: '--header-icon-color', light: '#D5D5D5', noteKey: 'token_header_icon' },
        ],
    },
    {
        titleKey: 'group_borders_title',
        noteKey: 'group_borders_note',
        tokens: [
            { name: '--border-color', light: '#CBCBCB', dark: '#303236', noteKey: 'token_border' },
            { name: '--card-border-color', light: '#DFDFDF', dark: '#232323', noteKey: 'token_card_border' },
            { name: '--input-border-color', light: '#E3E3E3', dark: '#29292F', noteKey: 'token_input_border' },
            { name: '--plan-card-border-color', light: '#DDDDDD', dark: '#1F293D', noteKey: 'token_plan_card_border' },
            { name: '--table-head-item', light: '#E3E3E3', dark: '#25252B', noteKey: 'token_table_head' },
            { name: '--menu-hover', light: '#C2C2C2', dark: '#30323C', noteKey: 'token_menu_hover' },
        ],
    },
    {
        titleKey: 'group_semantic_title',
        noteKey: 'group_semantic_note',
        tokens: [
            { name: '--blue-sky-background', light: '#E6F0FF', dark: '#1E2229', noteKey: 'token_blue_sky' },
            { name: '--green-sky-background', light: '#A5F2DC', dark: '#364D48', noteKey: 'token_green_sky' },
            { name: '--table-selected-row', light: '#EAF3FE', dark: '#20283A', noteKey: 'token_table_row' },
        ],
    },
];

const WASH_TOKENS = [
    '--table-empty-glow',
    '--table-empty-icon-bg',
    '--table-empty-icon-border',
    '--table-empty-hint-bg',
];

type TypeRow = { cls: string; specKey: string; sampleKey?: string; sample?: string };

const TYPE_CLASS: Record<string, string> = {
    '.sd-display': 'tDisplay',
    '.sd-h1': 'tH1',
    '.sd-h2': 'tH2',
    '.sd-h3': 'tH3',
    '.sd-lead': 'tLead',
    '.sd-body': 'tBody',
    '.sd-cap': 'tCap',
    '.sd-mono': 'tMono',
};

const TYPE_ROWS: TypeRow[] = [
    { cls: '.sd-display', specKey: 'spec_display', sampleKey: 'sample_display' },
    { cls: '.sd-h1', specKey: 'spec_h1', sampleKey: 'sample_h1' },
    { cls: '.sd-h2', specKey: 'spec_h2', sampleKey: 'sample_h2' },
    { cls: '.sd-h3', specKey: 'spec_h3', sampleKey: 'sample_h3' },
    { cls: '.sd-lead', specKey: 'spec_lead', sampleKey: 'sample_lead' },
    { cls: '.sd-body', specKey: 'spec_body', sampleKey: 'sample_body' },
    { cls: '.sd-cap', specKey: 'spec_cap', sampleKey: 'sample_cap' },
    { cls: '.sd-mono', specKey: 'spec_mono', sample: 'POST /v1/projects/{id}/render' },
];

type InventoryItem = { name: string; path: string; descKey: string; scope: 'pkg' | 'app' };

const INVENTORY: InventoryItem[] = [
    { name: 'Field', path: '@my-workspace/components/src/field', descKey: 'inv_field', scope: 'pkg' },
    { name: 'ModalHelper', path: '@my-workspace/components/src/modal-helper', descKey: 'inv_modal_helper', scope: 'pkg' },
    { name: 'Panels', path: '@my-workspace/components/src/panels', descKey: 'inv_panels', scope: 'pkg' },
    { name: 'TabButtons / TabContent', path: '@my-workspace/components/src/tab', descKey: 'inv_tabs', scope: 'pkg' },
    { name: 'Pagination', path: '@my-workspace/components/src/pagination', descKey: 'inv_pagination', scope: 'pkg' },
    { name: 'LoadingState', path: '@my-workspace/components/src/loading-state', descKey: 'inv_loading_state', scope: 'pkg' },
    { name: 'Divider', path: '@my-workspace/components/src/divider', descKey: 'inv_divider', scope: 'pkg' },
    { name: 'Wizard', path: '@my-workspace/components/src/Wizard', descKey: 'inv_wizard', scope: 'pkg' },
    { name: 'Dropdown', path: '@my-workspace/components/src/Dropdown', descKey: 'inv_dropdown', scope: 'pkg' },
    { name: 'ExpandableSection', path: '@my-workspace/components/src/expandableSection', descKey: 'inv_expandable', scope: 'pkg' },
    { name: 'PlanUsagePanel', path: '@my-workspace/components/src/subscription', descKey: 'inv_plan_usage', scope: 'pkg' },
    { name: 'SearchInput', path: 'app/components/SearchInput', descKey: 'inv_search_input', scope: 'app' },
    { name: 'LoadingSpinner', path: 'app/components/LoadingSpinner.tsx', descKey: 'inv_spinner', scope: 'app' },
    { name: 'LoginModal', path: 'app/components/LoginModal.tsx', descKey: 'inv_login_modal', scope: 'app' },
    { name: 'PageTransition', path: 'app/components/PageTransition.tsx', descKey: 'inv_page_transition', scope: 'app' },
    { name: 'ProtectedRoute', path: 'app/components/ProtectedRoute.tsx', descKey: 'inv_protected_route', scope: 'app' },
    { name: 'ProfileCompletionGuard', path: 'app/components/ProfileCompletionGuard.tsx', descKey: 'inv_profile_guard', scope: 'app' },
    { name: 'TableEmptyState', path: 'app/(developers)/components/TableEmptyState', descKey: 'inv_table_empty', scope: 'app' },
    { name: 'ProjectListTemplate', path: 'app/(developers)/components/ProjectListTemplate', descKey: 'inv_project_list', scope: 'app' },
    { name: 'BannerBox', path: 'app/(studio)/banner', descKey: 'inv_banner', scope: 'app' },
    { name: 'AppSidebar', path: 'app/components/sidebar', descKey: 'inv_sidebar', scope: 'app' },
    { name: 'ToastProvider', path: 'naslyar/app/toastProvider', descKey: 'inv_toast', scope: 'app' },
];

const DEMO_ICONS = [LuSearch, LuBell, LuSettings, LuUpload, LuDownload, LuTrash2, LuPlus, LuStar, LuImage, LuSparkles];

/* تگ <mono> در متن‌های مرکب ترجمه — مثل intro/type_note/elevation_note/footer */
const MONO_COMPONENTS = { mono: <span className={styles.mono} /> };

/* تم از attribute سراسری data-theme روی <html> خوانده می‌شود (مثل ChatMarkdown) */
function subscribeToTheme(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
}

const getThemeSnapshot = (): 'light' | 'dark' =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

const getServerTheme = (): 'light' | 'dark' => 'light';

export default function SystemDesign() {
    const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerTheme);
    const { t, i18n } = useTranslation('systemDesign');

    /* اعداد با فرمت محلی زبان فعلی — فارسی/عربی رقم‌بومی، بقیه لاتین */
    const digits = (n: number) => n.toLocaleString(i18n.language);
    const isRtl = isRtlLanguage(i18n.language);
    /* در RTL «قبلی» به راست اشاره می‌کند و برعکس */
    const PrevArrow = isRtl ? LuArrowRight : LuArrowLeft;
    const NextArrow = isRtl ? LuArrowLeft : LuArrowRight;

    const toggleTheme = () => {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className={`${styles.page} ${iransansxvf.className}`}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>
                            <span className={styles.brandDot} />
                            System Design
                            <span className={styles.subtitle}>{t('subtitle')}</span>
                        </h1>
                        <button type="button" className={styles.themeToggle} onClick={toggleTheme}>
                            {theme === 'dark' ? <LuSun size={15} /> : <LuMoon size={15} />}
                            {theme === 'dark' ? t('theme_light') : t('theme_dark')}
                        </button>
                    </div>
                    <nav className={styles.anchorNav}>
                        <a className={styles.anchorLink} href="#sd-color">{t('nav_colors')}</a>
                        <a className={styles.anchorLink} href="#sd-type">{t('nav_typography')}</a>
                        <a className={styles.anchorLink} href="#sd-components">{t('nav_components')}</a>
                        <a className={styles.anchorLink} href="#sd-inventory">{t('nav_inventory')}</a>
                        <a className={styles.anchorLink} href="#sd-elevation">{t('nav_shadows')}</a>
                    </nav>
                </div>
            </header>

            <main className={styles.body}>
                <p className={styles.sectionNote}>
                    <Trans i18nKey="intro" ns="systemDesign" components={MONO_COMPONENTS} />
                </p>

                {/* ---------- رنگ‌ها ---------- */}
                <section className={styles.section} id="sd-color">
                    <h2 className={styles.sectionTitle}>
                        <LuPalette size={19} />
                        {t('colors_title')}
                    </h2>
                    <p className={styles.sectionNote}>{t('colors_note')}</p>
                    {COLOR_GROUPS.map((group) => (
                        <div className={styles.groupCard} key={group.titleKey}>
                            <div className={styles.groupHead}>
                                <h3 className={styles.groupTitle}>{t(group.titleKey)}</h3>
                                <span className={styles.groupNote}>{t(group.noteKey)}</span>
                            </div>
                            <div className={styles.swatchGrid}>
                                {group.tokens.map((token) => (
                                    <div className={styles.swatch} key={token.name}>
                                        <span
                                            className={styles.chip}
                                            style={{ background: `var(${token.name})` }}
                                        />
                                        <span className={styles.swatchInfo}>
                                            <span className={`${styles.swatchName} ${styles.mono}`}>{token.name}</span>
                                            <span className={`${styles.swatchValues} ${styles.mono}`}>
                                                {token.light}
                                                {token.dark ? ` / ${token.dark}` : ''}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className={styles.groupCard}>
                        <div className={styles.groupHead}>
                            <h3 className={styles.groupTitle}>{t('wash_title')}</h3>
                            <span className={styles.groupNote}>
                                <Trans i18nKey="wash_note" ns="systemDesign" components={MONO_COMPONENTS} />
                            </span>
                        </div>
                        <div className={styles.washRow}>
                            {WASH_TOKENS.map((name) => (
                                <span
                                    className={styles.washItem}
                                    key={name}
                                    style={{ background: `var(${name})` }}
                                >
                                    <span className={styles.mono}>{name.replace('--table-empty-', '')}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------- تایپوگرافی ---------- */}
                <section className={styles.section} id="sd-type">
                    <h2 className={styles.sectionTitle}>
                        <LuType size={19} />
                        {t('type_title')}
                    </h2>
                    <p className={styles.sectionNote}>
                        <Trans i18nKey="type_note" ns="systemDesign" components={MONO_COMPONENTS} />
                    </p>
                    <div className={styles.typeCard}>
                        {TYPE_ROWS.map((row) => (
                            <div className={styles.typeRow} key={row.cls}>
                                <span className={`${styles.typeLabel} ${styles.mono}`}>
                                    {row.cls}
                                    <br />
                                    {t(row.specKey)}
                                </span>
                                <p className={styles[TYPE_CLASS[row.cls]]}>{row.sample ?? t(row.sampleKey!)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---------- کامپوننت‌ها ---------- */}
                <section className={styles.section} id="sd-components">
                    <h2 className={styles.sectionTitle}>
                        <LuShapes size={19} />
                        {t('components_title')}
                    </h2>
                    <p className={styles.sectionNote}>{t('components_note')}</p>
                    <div className={styles.demoGrid}>
                        {/* دکمه‌ها */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_buttons')}</span>
                            <div className={styles.demoRow}>
                                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
                                    <LuPlus size={15} />
                                    {t('btn_new_project')}
                                </button>
                                <button type="button" className={`${styles.btn} ${styles.btnOutline}`}>
                                    {t('btn_learn_more')}
                                </button>
                                <button type="button" className={`${styles.btn} ${styles.btnGhost}`}>
                                    {t('btn_download')}
                                </button>
                            </div>
                            <div className={styles.demoRow}>
                                <button type="button" className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`}>
                                    <LuCheck size={14} />
                                    {t('btn_save')}
                                </button>
                                <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}>
                                    <LuTrash2 size={14} />
                                    {t('btn_delete')}
                                </button>
                                <button type="button" className={`${styles.btn} ${styles.btnDisabled}`} disabled>
                                    {t('btn_disabled')}
                                </button>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --button-background · --settings-button-border · --button-green · --icon-red
                            </div>
                        </div>

                        {/* اینپوت‌ها */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_inputs')}</span>
                            <div className={styles.demoCol}>
                                <div className={styles.searchBox}>
                                    <LuSearch size={15} />
                                    <input
                                        className={styles.input}
                                        placeholder={t('ph_search')}
                                        aria-label={t('al_search')}
                                    />
                                </div>
                                <input className={styles.input} defaultValue={t('val_prompt')} aria-label={t('al_title')} />
                                <input className={`${styles.input} ${styles.inputDisabled}`} value={t('val_disabled')} disabled aria-label={t('val_disabled')} />
                                <textarea
                                    className={`${styles.input} ${styles.textarea}`}
                                    placeholder={t('ph_desc')}
                                    aria-label={t('al_desc')}
                                />
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --input-background-color · --input-border-color · focus → --brand-color
                            </div>
                        </div>

                        {/* چیپ و بج */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_chips')}</span>
                            <div className={styles.demoRow}>
                                <span className={`${styles.chipBase} ${styles.chipBrand}`}>{t('chip_smart')}</span>
                                <span className={`${styles.chipBase} ${styles.chipSuccess}`}>
                                    <LuCheck size={12} />
                                    {t('chip_ready')}
                                </span>
                                <span className={`${styles.chipBase} ${styles.chipInfo}`}>{t('chip_queue')}</span>
                                <span className={`${styles.chipBase} ${styles.chipNeutral}`}>{t('chip_draft')}</span>
                                <span className={`${styles.chipBase} ${styles.chipSpec}`}>SPEC · 01</span>
                            </div>
                            <div className={styles.demoRow}>
                                <span className={styles.avatar}>هـ</span>
                                <span className={`${styles.avatar} ${styles.avatarAlt}`}>
                                    ن
                                    <span className={styles.avatarDot} />
                                </span>
                                <span className={styles.badgeCount}>{digits(3)}</span>
                                <span className={styles.badgeCount}>{digits(12)}</span>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --green-sky-background · --blue-sky-background · --icon-green / --icon-red
                            </div>
                        </div>

                        {/* کارت‌ها */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_cards')}</span>
                            <div className={styles.demoRow}>
                                <div className={styles.miniCard}>
                                    <span className={styles.miniCardTitle}>{t('card_basic_title')}</span>
                                    <span className={styles.miniCardText}>{t('card_basic_text')}</span>
                                </div>
                                <div className={`${styles.miniCard} ${styles.miniCardHover}`}>
                                    <span className={styles.miniCardTitle}>{t('card_hover_title')}</span>
                                    <span className={styles.miniCardText}>{t('card_hover_text')}</span>
                                </div>
                                <div className={`${styles.miniCard} ${styles.miniCardSelected}`}>
                                    <span className={styles.miniCardTitle}>{t('card_selected_title')}</span>
                                    <span className={styles.miniCardText}>{t('card_selected_text')}</span>
                                </div>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --card-border-color · --card-background-selected · --border-color-selected
                            </div>
                        </div>

                        {/* جدول */}
                        <div className={`${styles.demoCard} ${styles.demoCardWide}`}>
                            <span className={styles.demoLabel}>{t('demo_table')}</span>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('th_project')}</th>
                                        <th>{t('th_model')}</th>
                                        <th>{t('th_status')}</th>
                                        <th>{t('th_cost')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{t('row_teaser')}</td>
                                        <td className={styles.mono}>veo-3</td>
                                        <td>
                                            <span className={`${styles.chipBase} ${styles.chipSuccess}`}>
                                                <LuCheck size={12} />
                                                {t('chip_done')}
                                            </span>
                                        </td>
                                        <td className={styles.mono}>{digits(42000)}</td>
                                    </tr>
                                    <tr className={styles.rowSelected}>
                                        <td>{t('row_instagram')}</td>
                                        <td className={styles.mono}>flux-pro</td>
                                        <td>
                                            <span className={`${styles.chipBase} ${styles.chipBrand}`}>{t('chip_rendering')}</span>
                                        </td>
                                        <td className={styles.mono}>{digits(18500)}</td>
                                    </tr>
                                    <tr>
                                        <td>{t('row_banner')}</td>
                                        <td className={styles.mono}>gpt-image</td>
                                        <td>
                                            <span className={`${styles.chipBase} ${styles.chipNeutral}`}>{t('chip_draft')}</span>
                                        </td>
                                        <td className={styles.mono}>{digits(0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --table-head-item · --table-selected-row · --plan-card-border-color
                            </div>
                        </div>

                        {/* حالت خالی */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_empty')}</span>
                            <div className={styles.emptyState}>
                                <span className={styles.iconRing}>
                                    <LuImage size={24} />
                                </span>
                                <p className={styles.emptyTitle}>{t('empty_title')}</p>
                                <p className={styles.emptyText}>{t('empty_text')}</p>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>{t('usage_empty')}</div>
                        </div>

                        {/* تب‌ها و سوییچ */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_tabs')}</span>
                            <div className={styles.tabs}>
                                <button type="button" className={`${styles.tab} ${styles.tabActive}`}>{t('tab_all')}</button>
                                <button type="button" className={styles.tab}>{t('tab_video')}</button>
                                <button type="button" className={styles.tab}>{t('tab_image')}</button>
                                <button type="button" className={styles.tab}>{t('tab_audio')}</button>
                            </div>
                            <div className={styles.demoRow}>
                                <button type="button" className={`${styles.switch} ${styles.switchOn}`} role="switch" aria-checked="true" aria-label={t('al_switch_on')} />
                                <button type="button" className={styles.switch} role="switch" aria-checked="false" aria-label={t('al_switch_off')} />
                                <span className={`${styles.checkbox} ${styles.checkboxOn}`}>
                                    <LuCheck size={13} />
                                </span>
                                <span className={styles.checkbox} />
                                <span className={`${styles.radio} ${styles.radioOn}`} />
                                <span className={styles.radio} />
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>{t('usage_tabs')}</div>
                        </div>

                        {/* لودینگ */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_loading')}</span>
                            <div className={styles.demoRow}>
                                <span className={styles.spinner} />
                                <div className={styles.skeletonCol}>
                                    <span className={styles.skeleton} style={{ width: '72%' }} />
                                    <span className={styles.skeleton} style={{ width: '100%' }} />
                                    <span className={styles.skeleton} style={{ width: '48%' }} />
                                </div>
                            </div>
                            <div className={styles.demoRow}>
                                <span className={styles.progress}>
                                    <span className={styles.progressFill} />
                                </span>
                                <span className={styles.mono} style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                                    {digits(64)}{t('percent')}
                                </span>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>--table-head-item · --brand-color</div>
                        </div>

                        {/* هشدارها */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_alerts')}</span>
                            <div className={styles.demoCol}>
                                <div className={`${styles.alert} ${styles.alertSuccess}`}>
                                    <LuCheck size={15} />
                                    {t('alert_success')}
                                </div>
                                <div className={`${styles.alert} ${styles.alertError}`}>
                                    <LuTriangleAlert size={15} />
                                    {t('alert_error')}
                                </div>
                                <div className={`${styles.alert} ${styles.alertInfo}`}>
                                    <LuInfo size={15} />
                                    {t('alert_info')}
                                </div>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --icon-green · --icon-red · --blue-sky-background
                            </div>
                        </div>

                        {/* پینگیشن */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_pagination')}</span>
                            <div className={styles.pagination}>
                                <button type="button" className={styles.pageBtn} aria-label={t('pg_prev')}>
                                    <PrevArrow size={14} />
                                </button>
                                {[1, 2, 3].map((p) => (
                                    <button
                                        type="button"
                                        key={p}
                                        className={`${styles.pageBtn} ${p === 2 ? styles.pageBtnActive : ''}`}
                                    >
                                        {digits(p)}
                                    </button>
                                ))}
                                <span className={styles.pageBtn} style={{ cursor: 'default' }}>…</span>
                                <button type="button" className={styles.pageBtn}>{digits(9)}</button>
                                <button type="button" className={styles.pageBtn} aria-label={t('pg_next')}>
                                    <NextArrow size={14} />
                                </button>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>{t('usage_pagination')}</div>
                        </div>

                        {/* مودال و دراور */}
                        <div className={`${styles.demoCard} ${styles.demoCardWide}`}>
                            <span className={styles.demoLabel}>{t('demo_modal')}</span>
                            <div className={styles.demoRow}>
                                <div className={styles.modalPreview} style={{ flex: 1, minWidth: 240 }}>
                                    <p className={styles.modalTitle}>{t('modal_title')}</p>
                                    <p className={styles.modalText}>{t('modal_text')}</p>
                                    <div className={styles.modalFooter}>
                                        <button type="button" className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}>
                                            {t('modal_cancel')}
                                        </button>
                                        <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}>
                                            {t('btn_delete')}
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.drawerPreview} style={{ flex: 1, minWidth: 240 }}>
                                    <span className={styles.miniCardTitle}>{t('drawer_title')}</span>
                                    <span className={styles.miniCardText}>{t('drawer_text')}</span>
                                </div>
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>
                                --modal-background · --sd-shadow-lg · ModalHelper / MobileBottomSheet
                            </div>
                        </div>

                        {/* آیکون‌ها */}
                        <div className={styles.demoCard}>
                            <span className={styles.demoLabel}>{t('demo_icons')}</span>
                            <div className={styles.demoRow}>
                                {DEMO_ICONS.map((Icon, index) => (
                                    <span className={styles.iconTile} key={index}>
                                        <Icon size={18} />
                                    </span>
                                ))}
                            </div>
                            <div className={`${styles.usage} ${styles.mono}`}>--icon-color · hover → --brand-color</div>
                        </div>
                    </div>
                </section>

                {/* ---------- فهرست کامپوننت‌ها ---------- */}
                <section className={styles.section} id="sd-inventory">
                    <h2 className={styles.sectionTitle}>
                        <LuLayers size={19} />
                        {t('inventory_title')}
                    </h2>
                    <p className={styles.sectionNote}>{t('inventory_note')}</p>
                    <div className={styles.invGrid}>
                        {INVENTORY.map((item) => (
                            <div className={styles.invCard} key={item.name}>
                                <div className={styles.invHead}>
                                    <span className={styles.invName}>{item.name}</span>
                                    <span className={`${styles.invScope} ${item.scope === 'app' ? styles.invScopeApp : ''}`}>
                                        {item.scope === 'pkg' ? '@my-workspace/components' : 'app'}
                                    </span>
                                </div>
                                <span className={styles.invPath}>{item.path}</span>
                                <p className={styles.invDesc}>{t(item.descKey)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---------- سایه‌ها ---------- */}
                <section className={styles.section} id="sd-elevation">
                    <h2 className={styles.sectionTitle}>
                        <LuLayers size={19} />
                        {t('elevation_title')}
                    </h2>
                    <p className={styles.sectionNote}>
                        <Trans i18nKey="elevation_note" ns="systemDesign" components={MONO_COMPONENTS} />
                    </p>
                    <div className={styles.elevGrid}>
                        <div className={styles.elevCard}>
                            <div className={`${styles.elevSwatch} ${styles.shadowSm}`} />
                            <span className={`${styles.elevName} ${styles.mono}`}>--sd-shadow-sm</span>
                        </div>
                        <div className={styles.elevCard}>
                            <div className={`${styles.elevSwatch} ${styles.shadowMd}`} />
                            <span className={`${styles.elevName} ${styles.mono}`}>--sd-shadow-md</span>
                        </div>
                        <div className={styles.elevCard}>
                            <div className={`${styles.elevSwatch} ${styles.shadowLg}`} />
                            <span className={`${styles.elevName} ${styles.mono}`}>--sd-shadow-lg</span>
                        </div>
                        <div className={styles.elevCard}>
                            <div className={`${styles.elevSwatch} ${styles.shadowBrand}`} />
                            <span className={`${styles.elevName} ${styles.mono}`}>--sd-shadow-brand</span>
                        </div>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <Trans i18nKey="footer" ns="systemDesign" components={MONO_COMPONENTS} />
            </footer>
        </div>
    );
}
