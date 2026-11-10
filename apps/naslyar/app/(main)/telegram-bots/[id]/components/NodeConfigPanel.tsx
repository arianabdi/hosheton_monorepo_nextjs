'use client';

import React from 'react';
import styles from '../../TelegramBots.module.scss';
import parentStyles from '../../../marketing/Marketing.module.scss';
import { createNodeId, NODE_LABELS, OPERATOR_LABELS } from '../../telegram-bots.types';
import type {
    TelegramBotButton,
    TelegramBotNodeData,
    TelegramBotNodeType,
    TelegramConditionOperator,
    TelegramBotSwitchCase,
} from '../../telegram-bots.types';

interface Props {
    nodeType: TelegramBotNodeType;
    data: TelegramBotNodeData;
    variables: string[];
    onChange: (patch: Partial<TelegramBotNodeData>) => void;
}

const MESSAGE_NODE_TYPES: TelegramBotNodeType[] = ['sendMessage', 'inlineKeyboard', 'replyKeyboard'];

export default function NodeConfigPanel({ nodeType, data, variables, onChange }: Props) {
    const setButtons = (buttons: TelegramBotButton[]) => onChange({ buttons });

    return (
        <div>
            <h3 style={{ marginTop: 0 }}>{data.label || 'تنظیمات گره'}</h3>

            <div className={parentStyles.field}>
                <label>عنوان گره</label>
                <input value={data.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} />
            </div>

            {(data.text !== undefined || MESSAGE_NODE_TYPES.includes(nodeType)) && (
                <div className={parentStyles.field}>
                    <label>متن پیام</label>
                    <textarea rows={4} value={data.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="سلام {{name}} عزیز" />
                    <p className={styles.hint}>می‌توانید از متغیرها استفاده کنید: {'{{variable}}'}</p>
                </div>
            )}

            {(data.photoUrl !== undefined) && (
                <div className={parentStyles.field}>
                    <label>آدرس عکس</label>
                    <input dir="ltr" value={data.photoUrl ?? ''} onChange={(e) => onChange({ photoUrl: e.target.value })} />
                    <label>زیرنویس</label>
                    <input value={data.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
                </div>
            )}

            {(data.fileUrl !== undefined) && (
                <div className={parentStyles.field}>
                    <label>آدرس فایل</label>
                    <input dir="ltr" value={data.fileUrl ?? ''} onChange={(e) => onChange({ fileUrl: e.target.value })} />
                    <label>زیرنویس</label>
                    <input value={data.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
                </div>
            )}

            {(data.command !== undefined) && (
                <div className={parentStyles.field}>
                    <label>دستور ورود (بدون /)</label>
                    <input dir="ltr" value={data.command ?? 'start'} onChange={(e) => onChange({ command: e.target.value.replace(/^\//, '') })} />
                </div>
            )}

            {(data.buttons !== undefined) && (
                <div className={parentStyles.field}>
                    <label>دکمه‌ها</label>
                    {(data.buttons ?? []).map((b, i) => (
                        <div key={i} className={styles.buttonRow}>
                            <input placeholder="متن دکمه" value={b.text} onChange={(e) => {
                                const next = [...(data.buttons ?? [])];
                                next[i] = { ...b, text: e.target.value };
                                setButtons(next);
                            }} />
                            <input dir="ltr" placeholder="ذخیره در متغیر (اختیاری)" value={b.saveTo ?? ''} onChange={(e) => {
                                const next = [...(data.buttons ?? [])];
                                next[i] = { ...b, saveTo: e.target.value };
                                setButtons(next);
                            }} />
                            <input dir="ltr" placeholder="لینک (اختیاری)" value={b.url ?? ''} onChange={(e) => {
                                const next = [...(data.buttons ?? [])];
                                next[i] = { ...b, url: e.target.value };
                                setButtons(next);
                            }} />
                            <button type="button" className={parentStyles.deleteBtn} onClick={() => setButtons((data.buttons ?? []).filter((_, j) => j !== i))}>×</button>
                        </div>
                    ))}
                    <button type="button" className={styles.smallBtn} onClick={() => setButtons([...(data.buttons ?? []), { text: '' }])}>+ دکمه</button>
                    <p className={styles.hint}>برای هر دکمه یک خروجی جدا در گره ساخته می‌شود.</p>
                </div>
            )}

            {(data.variable !== undefined) && (
                <div className={parentStyles.field}>
                    <label>متغیر</label>
                    <input dir="ltr" list="tbb-variables" value={data.variable ?? ''} onChange={(e) => onChange({ variable: e.target.value })} />
                    <datalist id="tbb-variables">
                        {variables.map((v) => <option key={v} value={v} />)}
                    </datalist>
                </div>
            )}

            {(data.operator !== undefined) && (
                <div className={parentStyles.field}>
                    <label>عملگر</label>
                    <select value={data.operator ?? 'equals'} onChange={(e) => onChange({ operator: e.target.value as TelegramConditionOperator })}>
                        {(Object.keys(OPERATOR_LABELS) as TelegramConditionOperator[]).map((op) => (
                            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                        ))}
                    </select>
                    <label>مقدار مقایسه</label>
                    <input value={data.value ?? ''} onChange={(e) => onChange({ value: e.target.value })} />
                </div>
            )}

            {(data.cases !== undefined) && (
                <div className={parentStyles.field}>
                    <label>حالت‌ها</label>
                    {(data.cases ?? []).map((c, i) => (
                        <div key={c.id} className={styles.caseRow}>
                            <input placeholder="عنوان" value={c.label} onChange={(e) => {
                                const next = [...(data.cases ?? [])];
                                next[i] = { ...c, label: e.target.value };
                                onChange({ cases: next });
                            }} />
                            <input dir="ltr" placeholder="مقدار" value={c.value} onChange={(e) => {
                                const next = [...(data.cases ?? [])];
                                next[i] = { ...c, value: e.target.value };
                                onChange({ cases: next });
                            }} />
                            <button type="button" className={parentStyles.deleteBtn} onClick={() => onChange({ cases: (data.cases ?? []).filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={styles.smallBtn} onClick={() => onChange({
                        cases: [...(data.cases ?? []), { id: createNodeId('case'), label: '', value: '' } as TelegramBotSwitchCase],
                    })}>+ حالت</button>
                </div>
            )}

            {(data.saveTo !== undefined && data.inputPrompt !== undefined) && (
                <div className={parentStyles.field}>
                    <label>ذخیره پاسخ در متغیر</label>
                    <input dir="ltr" value={data.saveTo ?? ''} onChange={(e) => onChange({ saveTo: e.target.value })} />
                    <label>متن درخواست ورودی</label>
                    <input value={data.inputPrompt ?? ''} onChange={(e) => onChange({ inputPrompt: e.target.value })} />
                </div>
            )}

            {(data.httpMethod !== undefined) && (
                <div className={parentStyles.field}>
                    <label>متد</label>
                    <select value={data.httpMethod ?? 'GET'} onChange={(e) => onChange({ httpMethod: e.target.value as 'GET' })}>
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <label>آدرس</label>
                    <input dir="ltr" value={data.url ?? ''} onChange={(e) => onChange({ url: e.target.value })} />
                    <label>بدنه (JSON)</label>
                    <textarea dir="ltr" rows={3} value={data.body ?? ''} onChange={(e) => onChange({ body: e.target.value })} />
                    <label>کلید داده پاسخ (اختیاری)</label>
                    <input dir="ltr" value={data.responseDataKey ?? ''} onChange={(e) => onChange({ responseDataKey: e.target.value })} />
                    <label>ذخیره پاسخ در متغیر</label>
                    <input dir="ltr" value={data.saveTo ?? ''} onChange={(e) => onChange({ saveTo: e.target.value })} />
                </div>
            )}
        </div>
    );
}
