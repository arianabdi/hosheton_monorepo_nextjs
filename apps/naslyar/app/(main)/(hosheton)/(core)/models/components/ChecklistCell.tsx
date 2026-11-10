'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { ErrorToaster } from '@my-workspace/utils';
import styles from './ChecklistCell.module.scss';

export type ChecklistTemplate = { _id: string; title: string };

type Props = {
    model: { _id: string; checklistItems?: string[] };
    templates: ChecklistTemplate[];
    token?: string | null;
    baseUrl?: string;
    onUpdated: (modelId: string, checkedItemIds: string[]) => void;
};

const CIRCLE_SIZE = 44;
// مسیر (track) نازک و قوس پیشرفت کلفت روی یک شعاع — قوس مسیر را می‌پوشاند (سبک گیج)
const RING_RADIUS = 17;
const TRACK_STROKE = 2;
const ARC_STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * دایره پیشرفت چک‌لیست هر مدل در جدول — متن داخل دایره مثلا «۳/۹».
 * رنگ‌ها: تا ۵۰٪ قرمز، تا ۷۰٪ آبی، ۷۱ تا ۹۹٪ کهربایی، ۱۰۰٪ سبز.
 * کلیک روی دایره پاپ‌آور تیک‌زدن آیتم‌ها را باز می‌کند (ذخیره فوری در سرور).
 */
export default function ChecklistCell({ model, templates, token, baseUrl, onUpdated }: Props) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const templateIds = useMemo(() => new Set(templates.map((t) => t._id)), [templates]);
    // فقط آیتم‌های شناخته‌شده — آیتم حذف‌شده در تنظیمات، از پیشرفت خارج می‌شود
    const checkedIds = useMemo(
        () => (model.checklistItems || []).filter((id) => templateIds.has(id)),
        [model.checklistItems, templateIds],
    );
    const checked = checkedIds.length;
    const total = templates.length;
    const pct = total > 0 ? checked / total : 0;

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (total === 0) {
        return <span className={styles.noChecklist} title="هنوز چک‌لیستی در تنظیمات تعریف نشده است">—</span>;
    }

    // تا ۵۰٪ قرمز، تا ۷۰٪ آبی، تا زیر ۱۰۰٪ کهربایی، ۱۰۰٪ سبز
    const color = pct >= 1 ? '#137333' : pct > 0.7 ? '#f59e0b' : pct > 0.5 ? '#3b82f6' : '#ef4444';

    const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (open) {
            setOpen(false);
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const width = 260;
        setPosition({ top: rect.bottom + 6, left: Math.max(8, rect.right - width) });
        setOpen(true);
    };

    const handleToggleItem = async (itemId: string, next: boolean) => {
        if (!token || !baseUrl || saving) return;
        const nextIds = next ? [...checkedIds, itemId] : checkedIds.filter((id) => id !== itemId);
        try {
            setSaving(true);
            const res = await axios.put(
                `${baseUrl}/api/provider-models/${model._id}/checklist`,
                { checkedItemIds: nextIds },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                onUpdated(model._id, res.data.data?.checklistItems || nextIds);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={styles.circleBtn}
                style={{ '--progress-color': color } as React.CSSProperties}
                onClick={toggle}
                title="چک‌لیست این مدل — برای تیک زدن کلیک کنید"
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
                    {/* مسیر نازک خاکستری (در هر دو تم با متنِ تم می‌خواند) */}
                    <circle
                        className={styles.progressTrack}
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RING_RADIUS}
                        fill="none"
                        strokeWidth={TRACK_STROKE}
                    />
                    {pct > 0 && (
                        <circle
                            className={styles.progressArc}
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RING_RADIUS}
                            fill="none"
                            strokeWidth={ARC_STROKE}
                            strokeDasharray={`${CIRCUMFERENCE * pct} ${CIRCUMFERENCE}`}
                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                        />
                    )}
                    <text
                        x="50%"
                        y="50%"
                        dominantBaseline="central"
                        textAnchor="middle"
                        className={styles.circleText}
                    >
                        {checked}/{total}
                    </text>
                </svg>
            </button>

            {open && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={popRef}
                          className={styles.popover}
                          style={{ top: position.top, left: position.left }}
                          role="dialog"
                          aria-label="چک‌لیست مدل"
                      >
                          <div className={styles.popHeader}>
                              <span>چک‌لیست مدل</span>
                              <span className={styles.popCount}>
                                  {checked} از {total}
                              </span>
                          </div>
                          <div className={styles.popList}>
                              {templates.map((tpl) => {
                                  const isChecked = checkedIds.includes(tpl._id);
                                  return (
                                      <label key={tpl._id} className={styles.popRow}>
                                          <input
                                              type="checkbox"
                                              checked={isChecked}
                                              disabled={saving}
                                              onChange={() => handleToggleItem(tpl._id, !isChecked)}
                                          />
                                          <span>{tpl.title}</span>
                                      </label>
                                  );
                              })}
                          </div>
                          {saving && <div className={styles.popSaving}>در حال ذخیره...</div>}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
