'use client';

import { useState } from 'react';
import { LuChevronDown, LuImagePlus, LuTrash2 } from 'react-icons/lu';

import styles from './SettingFieldEditor.module.scss';
import PlatformIconField from '../../ai-settings/PlatformIconField';
import type { PlatformIconItem } from '../../ai-settings/usePlatformIcons';
import { sanitizeSvg } from '../../ai-modes/modeIcons';
import {
    optionPreviewKind,
    syncRowsFromText,
    type NodeSettingFieldOption,
} from './settingFieldForm';

const KIND_LABEL = { audio: 'صدا', image: 'تصویر', video: 'ویدیو' } as const;

function PreviewMedia({ url }: { url: string }) {
    const kind = optionPreviewKind(url);
    if (!url || !kind) return null;
    if (kind === 'audio') return <audio controls preload="none" src={url} />;
    // eslint-disable-next-line @next/next/no-img-element
    if (kind === 'image') return <img src={url} alt="" loading="lazy" />;
    return <video controls preload="none" src={url} />;
}

/**
 * جدول فشرده‌ی گزینه‌های select: هر گزینه یک ردیف (آیکون · مقدار · عنوان · نمونه)،
 * جزئیات آیکون SVG و پخش نمونه فقط با باز کردن همان ردیف. حالت «ویرایش متنی» برای paste گروهی.
 */
export default function SettingOptionsTable({
    rows,
    text,
    icons,
    withMedia = true,
    valuePlaceholder = '16:9',
    labelPlaceholder = 'افقی ۱۶:۹',
    onRowsChange,
    onTextChange,
    onPickIcon,
    onIconChange,
}: {
    rows: NodeSettingFieldOption[];
    text: string;
    icons: PlatformIconItem[];
    /** ستون آیکون/نمونه (برای گزینه‌های خروجی فیلد ترکیبی لازم نیست) */
    withMedia?: boolean;
    valuePlaceholder?: string;
    labelPlaceholder?: string;
    onRowsChange: (rows: NodeSettingFieldOption[]) => void;
    onTextChange: (text: string, rows: NodeSettingFieldOption[]) => void;
    onPickIcon: (rowIdx: number) => void;
    onIconChange: (rowIdx: number, patch: Pick<NodeSettingFieldOption, 'iconSvg' | 'platformIconId'>) => void;
}) {
    const [bulk, setBulk] = useState(false);
    const [openRow, setOpenRow] = useState<number | null>(null);

    const valueCounts = new Map<string, number>();
    rows.forEach((row) => {
        const value = row.value.trim();
        if (value) valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    });
    const duplicates = [...valueCounts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
    const emptyCount = rows.filter((row) => !row.value.trim()).length;

    const patchRow = (rowIdx: number, patch: Partial<NodeSettingFieldOption>) => {
        onRowsChange(rows.map((row, i) => (i === rowIdx ? { ...row, ...patch } : row)));
    };

    const gridClass = withMedia ? styles.optGrid : `${styles.optGrid} ${styles.optGridPlain}`;

    return (
        <div>
            <div className={styles.optToolbar}>
                <span className={styles.hint}>
                    {rows.length ? `${rows.length} گزینه` : 'هنوز گزینه‌ای ندارد'}
                    {withMedia ? ' — «مقدار» به provider ارسال می‌شود، «عنوان» به کاربر نمایش داده می‌شود.' : ''}
                </span>
                <button type="button" className={styles.linkBtn} onClick={() => setBulk((on) => !on)}>
                    {bulk ? 'بازگشت به جدول' : 'ویرایش متنی (paste گروهی)'}
                </button>
            </div>

            {bulk ? (
                <>
                    <textarea
                        className={styles.bulkArea}
                        value={text}
                        spellCheck={false}
                        placeholder={'9:16|عمودی ۹:۱۶\n16:9|افقی ۱۶:۹\n1:1|مربع'}
                        onChange={(event) => onTextChange(event.target.value, syncRowsFromText(event.target.value, rows))}
                    />
                    <span className={styles.hint}>
                        هر خط یک گزینه: <code>مقدار|عنوان</code>. آیکون و نمونه‌ی گزینه‌هایی که مقدارشان عوض نشود حفظ می‌شود.
                    </span>
                </>
            ) : (
                <div className={styles.optTable}>
                    {rows.length ? (
                        <div className={`${gridClass} ${styles.optHead}`}>
                            <span className={styles.optIndex}>#</span>
                            {withMedia ? <span>آیکون</span> : null}
                            <span>مقدار (value)</span>
                            <span>عنوان نمایشی (label)</span>
                            {withMedia ? <span className={styles.optHeadPreview}>نمونه‌ی صدا / تصویر / ویدیو</span> : null}
                            <span />
                        </div>
                    ) : null}
                    {rows.map((row, rowIdx) => {
                        const value = row.value.trim();
                        const invalid = !value || duplicates.includes(value);
                        const previewUrl = (row.preview || '').trim();
                        const kind = previewUrl ? optionPreviewKind(previewUrl) : null;
                        const svg = sanitizeSvg(row.iconSvg);
                        const open = openRow === rowIdx;
                        return (
                            <div key={rowIdx} className={`${styles.optRow} ${invalid ? styles.optRowInvalid : ''}`}>
                                <div className={gridClass}>
                                    <span className={styles.optIndex}>{rowIdx + 1}</span>
                                    {withMedia ? (
                                        <button
                                            type="button"
                                            className={`${styles.optIcon} ${svg ? styles.optIconSet : ''}`}
                                            title={svg ? 'ویرایش آیکون' : 'انتخاب آیکون از کتابخانه'}
                                            onClick={() => (svg ? setOpenRow(open ? null : rowIdx) : onPickIcon(rowIdx))}
                                        >
                                            {svg
                                                ? <span aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
                                                : <LuImagePlus size={14} aria-hidden />}
                                        </button>
                                    ) : null}
                                    <input
                                        className={`${styles.optInput} ${styles.optValue}`}
                                        value={row.value}
                                        placeholder={valuePlaceholder}
                                        aria-label={`مقدار گزینه ${rowIdx + 1}`}
                                        onChange={(event) => patchRow(rowIdx, { value: event.target.value })}
                                    />
                                    <input
                                        className={styles.optInput}
                                        value={row.label}
                                        dir="auto"
                                        placeholder={labelPlaceholder}
                                        aria-label={`عنوان گزینه ${rowIdx + 1}`}
                                        onChange={(event) => patchRow(rowIdx, { label: event.target.value })}
                                    />
                                    {withMedia ? (
                                        <span className={styles.optPreviewCell}>
                                            <input
                                                className={`${styles.optInput} ${styles.ltr}`}
                                                value={row.preview || ''}
                                                placeholder="https://…/sample.mp3"
                                                aria-label={`لینک نمونه گزینه ${rowIdx + 1}`}
                                                onChange={(event) => patchRow(rowIdx, { preview: event.target.value })}
                                            />
                                            {previewUrl ? (
                                                <span className={`${styles.kindTag} ${kind ? '' : styles.kindTagWarn}`} title={kind ? undefined : 'پسوند لینک شناخته نشد'}>
                                                    {kind ? KIND_LABEL[kind] : '؟'}
                                                </span>
                                            ) : null}
                                        </span>
                                    ) : null}
                                    <span className={styles.optActions}>
                                        {withMedia ? (
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                aria-expanded={open}
                                                title={open ? 'بستن جزئیات' : 'جزئیات آیکون و نمونه'}
                                                onClick={() => setOpenRow(open ? null : rowIdx)}
                                            >
                                                <LuChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden />
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                            title="حذف گزینه"
                                            aria-label={`حذف گزینه ${rowIdx + 1}`}
                                            onClick={() => {
                                                if (openRow === rowIdx) setOpenRow(null);
                                                onRowsChange(rows.filter((_, i) => i !== rowIdx));
                                            }}
                                        >
                                            <LuTrash2 size={13} aria-hidden />
                                        </button>
                                    </span>
                                </div>
                                {withMedia && open ? (
                                    <div className={styles.optDetails}>
                                        <div className={styles.optDetailsMedia}>
                                            آیکون SVG
                                            <PlatformIconField
                                                iconSvg={row.iconSvg || ''}
                                                platformIconId={row.platformIconId}
                                                icons={icons}
                                                rows={2}
                                                onPick={() => onPickIcon(rowIdx)}
                                                onChange={(iconSvg) => onIconChange(rowIdx, { iconSvg })}
                                                onClear={() => onIconChange(rowIdx, { iconSvg: '', platformIconId: '' })}
                                            />
                                        </div>
                                        <div className={styles.optDetailsMedia}>
                                            تست نمونه
                                            {previewUrl && kind ? <PreviewMedia url={previewUrl} /> : (
                                                <span className={styles.hint}>
                                                    {previewUrl ? 'پسوند لینک شناخته نشد (mp3 / jpg / png / mp4 …).' : 'لینک نمونه‌ای وارد نشده است.'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        className={`${styles.optAdd} ${rows.length ? '' : styles.optAddOnly}`}
                        onClick={() => onRowsChange([...rows, { value: '', label: '', iconSvg: '', preview: '' }])}
                    >
                        + افزودن گزینه
                    </button>
                </div>
            )}

            {duplicates.length || emptyCount ? (
                <span className={`${styles.hint} ${styles.hintWarn}`}>
                    {duplicates.length ? `مقدار تکراری: ${duplicates.join('، ')}. ` : ''}
                    {emptyCount ? `${emptyCount} گزینه بدون مقدار است و ذخیره نمی‌شود.` : ''}
                </span>
            ) : null}
        </div>
    );
}

