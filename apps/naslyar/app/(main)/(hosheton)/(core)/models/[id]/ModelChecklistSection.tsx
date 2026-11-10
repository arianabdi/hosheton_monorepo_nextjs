'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import styles from './ModelChecklistSection.module.scss';
import { ErrorToaster } from '@my-workspace/utils';

type ChecklistTemplate = { _id: string; title: string };

type Props = {
    modelId: string;
    token?: string | null;
    baseUrl?: string;
};

/** آیکون کامنت خالی — برای آیتم بدون توضیح */
function CommentIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

/** آیکون کامنت با خط (متن‌دار) — برای آیتمی که توضیح دارد */
function CommentWithTextIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M13 8H7" />
            <path d="M17 12H7" />
        </svg>
    );
}

/**
 * بخش چک‌لیست در صفحه ویرایش مدل — تیک آیتم‌ها و توضیحِ هر آیتم به ازای این مدل.
 * هر تغییر بلافاصله ذخیره می‌شود (مستقل از دکمه «ذخیره تغییرات» فرم).
 * آیتم‌ها از تنظیمات هوش مصنوعی (تب چک‌لیست مدل‌ها) مدیریت می‌شوند.
 */
export default function ModelChecklistSection({ modelId, token, baseUrl }: Props) {
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // مودال توضیح: آیتم در حال ویرایش + مقدار فعلی input
    const [noteModal, setNoteModal] = useState<{ itemId: string; value: string } | null>(null);

    useEffect(() => {
        if (!token || !baseUrl || !modelId) return;
        let cancelled = false;
        (async () => {
            try {
                const [tplRes, modelRes] = await Promise.all([
                    axios.get(`${baseUrl}/api/provider-model-checklists`, {
                        headers: { authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${baseUrl}/api/provider-models/${modelId}?includeInactive=true`, {
                        headers: { authorization: `Bearer ${token}` },
                    }),
                ]);
                if (cancelled) return;
                if (tplRes.data.statusCode === 200) {
                    setTemplates(tplRes.data.data?.items || []);
                }
                if (modelRes.data.statusCode === 200) {
                    setCheckedIds(modelRes.data.data?.checklistItems || []);
                    setNotes(modelRes.data.data?.checklistNotes || {});
                }
            } catch (e) {
                ErrorToaster(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, baseUrl, modelId]);

    const toggle = async (itemId: string, next: boolean) => {
        if (!token || !baseUrl || saving) return;
        const prevIds = checkedIds;
        const nextIds = next ? [...checkedIds, itemId] : checkedIds.filter((id) => id !== itemId);
        setCheckedIds(nextIds); // optimistic — در خطا برمی‌گردد
        try {
            setSaving(true);
            const res = await axios.put(
                `${baseUrl}/api/provider-models/${modelId}/checklist`,
                { checkedItemIds: nextIds },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode !== 200) throw new Error('CHECKLIST_SAVE_FAILED');
        } catch (e) {
            setCheckedIds(prevIds);
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    /** ذخیره/حذف توضیح یک آیتم — فقط نقشه توضیحات ارسال می‌شود و تیک‌ها دست‌نخورده می‌مانند */
    const saveNote = async (itemId: string, text: string) => {
        if (!token || !baseUrl) return;
        const prevNotes = notes;
        const nextNotes = { ...notes };
        if (text.trim()) nextNotes[itemId] = text.trim();
        else delete nextNotes[itemId];
        setNotes(nextNotes); // optimistic — در خطا برمی‌گردد
        setNoteModal(null);
        try {
            setSaving(true);
            const res = await axios.put(
                `${baseUrl}/api/provider-models/${modelId}/checklist`,
                { checklistNotes: nextNotes },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode !== 200) throw new Error('CHECKLIST_NOTE_SAVE_FAILED');
        } catch (e) {
            setNotes(prevNotes);
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className={styles.hint}>در حال بارگذاری چک‌لیست...</p>;
    }

    const total = templates.length;
    const checked = checkedIds.filter((id) => templates.some((t) => t._id === id)).length;
    const pct = total > 0 ? checked / total : 0;
    // هم‌رنگ دایره‌های جدول: تا ۵۰٪ قرمز، تا ۷۰٪ آبی، زیر ۱۰۰٪ کهربایی، ۱۰۰٪ سبز
    const barColor = pct >= 1 ? '#137333' : pct > 0.7 ? '#f59e0b' : pct > 0.5 ? '#3b82f6' : '#ef4444';

    if (total === 0) {
        return (
            <p className={styles.hint}>
                هنوز آیتمی در چک‌لیست سراسری تعریف نشده است. از مسیر «تنظیمات ← چک‌لیست مدل‌ها» آیتم‌ها را اضافه کنید.
            </p>
        );
    }

    const modalItem = noteModal ? templates.find((t) => t._id === noteModal.itemId) : null;

    return (
        <div className={styles.wrapper}>
            <div className={styles.summary}>
                <span className={styles.count}>
                    {checked} از {total} مورد انجام شده
                </span>
                <div className={styles.barTrack}>
                    <div
                        className={styles.barFill}
                        style={{ width: `${Math.round(pct * 100)}%`, background: barColor }}
                    />
                </div>
            </div>

            <ul className={styles.list}>
                {templates.map((tpl) => {
                    const isChecked = checkedIds.includes(tpl._id);
                    const note = notes[tpl._id] || '';
                    return (
                        <li key={tpl._id} className={`${styles.row} ${isChecked ? styles.rowDone : ''} ${note ? styles.rowHasNote : ''}`}>
                            <label className={styles.rowLabel}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={saving}
                                    onChange={() => toggle(tpl._id, !isChecked)}
                                />
                                <span>{tpl.title}</span>
                            </label>
                            <button
                                type="button"
                                className={`${styles.noteBtn} ${note ? styles.noteBtnActive : ''}`}
                                title={note || 'افزودن توضیح برای این آیتم'}
                                onClick={() => setNoteModal({ itemId: tpl._id, value: note })}
                            >
                                {note ? <CommentWithTextIcon /> : <CommentIcon />}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className={styles.hint}>
                هر تغییر بلافاصله ذخیره می‌شود و در ستون چک‌لیست جدول مدل‌ها اعمال می‌گردد.
            </p>

            {noteModal && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={styles.modalOverlay}
                          onMouseDown={(e) => {
                              if (e.target === e.currentTarget) setNoteModal(null);
                          }}
                      >
                          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="توضیح آیتم چک‌لیست">
                              {modalItem ? (
                                  <>
                                      <h5 className={styles.modalTitle}>{modalItem.title}</h5>
                                      <p className={styles.modalKicker}>توضیح آیتم</p>
                                  </>
                              ) : (
                                  <h5 className={styles.modalTitle}>توضیح آیتم</h5>
                              )}
                              <textarea
                                  className={styles.modalInput}
                                  rows={3}
                                  value={noteModal.value}
                                  autoFocus
                                  onChange={(e) => setNoteModal({ ...noteModal, value: e.target.value })}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Escape') setNoteModal(null);
                                  }}
                                  placeholder="مثلاً: منتظر قیمت به‌روزشده از ارائه‌دهنده هستیم..."
                              />
                              <p className={styles.modalHint}>
                                  توضیح فقط برای پیگیری ذخیره می‌شود؛ پس از رفع مشکل، آن را حذف کنید.
                              </p>
                              <div className={styles.modalActions}>
                                  <button
                                      type="button"
                                      className={styles.modalSave}
                                      disabled={saving}
                                      onClick={() => saveNote(noteModal.itemId, noteModal.value)}
                                  >
                                      ذخیره
                                  </button>
                                  {notes[noteModal.itemId] ? (
                                      <button
                                          type="button"
                                          className={styles.modalDelete}
                                          disabled={saving}
                                          onClick={() => saveNote(noteModal.itemId, '')}
                                      >
                                          حذف توضیح
                                      </button>
                                  ) : null}
                                  <button
                                      type="button"
                                      className={styles.modalCancel}
                                      onClick={() => setNoteModal(null)}
                                  >
                                      انصراف
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}
