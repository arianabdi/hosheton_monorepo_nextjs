'use client';

import { useMemo, useState } from 'react';
import { ModalBody, ModalFooter, ModalHeader, ModalHelper } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import mk from '../../marketing/Marketing.module.scss';
import hr from '../../management/hr/Hr.module.scss';
import { subscriptionApi } from '../lib/subscription-api';
import { useSubscriptionModule } from '../lib/SubscriptionProvider';
import { money, PERIOD_LABELS } from '../lib/format';

function Content({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
    const { plans, prices } = useSubscriptionModule();
    const [email, setEmail] = useState('');
    const [priceId, setPriceId] = useState('');
    const [days, setDays] = useState('');
    const [busy, setBusy] = useState(false);

    const options = useMemo(() => plans
        .filter((p) => p.status === 'active')
        .flatMap((plan) => prices
            .filter((pr) => pr.isAlive !== false && (typeof pr.planId === 'string' ? pr.planId : pr.planId?._id) === plan._id)
            .map((pr) => ({ id: pr._id, label: `${plan.name} — ${PERIOD_LABELS[pr.billingPeriod] || pr.billingPeriod} (${money(pr.price, pr.currency)})` }))),
    [plans, prices]);

    const submit = async () => {
        try {
            setBusy(true);
            await subscriptionApi.grant({ email: email.trim(), planPriceId: priceId, ...(days ? { days: Number(days) } : {}) });
            SuccessToaster({ message: 'اشتراک فعال شد' });
            onDone();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div dir="rtl">
            <ModalHeader>اعطای اشتراک</ModalHeader>
            <ModalBody>
                <p className={hr.fieldHintBlock}>
                    برای هدیه، جبران مشکل یا قرارداد سازمانی. اشتراک فعلی کاربر لغو و این پلن از همین لحظه فعال می‌شود — بدون پرداخت.
                </p>
                <div className={mk.field}>
                    <label>ایمیل کاربر *</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="user@example.com" />
                    <p className={hr.fieldHint}>همان ایمیلی که کاربر با آن وارد اپ می‌شود.</p>
                </div>
                <div className={mk.field}>
                    <label>پلن و دوره *</label>
                    <select value={priceId} onChange={(e) => setPriceId(e.target.value)}>
                        <option value="">— انتخاب کنید —</option>
                        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                    <p className={hr.fieldHint}>طول اعتبار به‌طور پیش‌فرض همان دوره است (ماهانه = یک ماه).</p>
                </div>
                <div className={mk.field}>
                    <label>طول دلخواه (روز)</label>
                    <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="خالی = طول دوره" />
                    <p className={hr.fieldHint}>مثلاً ۱۴ برای دو هفته آزمایش پلن حرفه‌ای.</p>
                </div>
            </ModalBody>
            <ModalFooter>
                <button type="button" className={mk.primaryBtn} disabled={busy || !email.trim() || !priceId} onClick={() => void submit()}>
                    {busy ? 'در حال فعال‌سازی…' : 'فعال کردن اشتراک'}
                </button>
                <button type="button" className={mk.secondaryBtn} onClick={onClose} disabled={busy}>انصراف</button>
            </ModalFooter>
        </div>
    );
}

export default function GrantDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="md"
            sheetTitle="اعطای اشتراک"
            closeOnOverlayClick={false}
            component={open ? <Content onClose={onClose} onDone={onDone} /> : null}
        />
    );
}
