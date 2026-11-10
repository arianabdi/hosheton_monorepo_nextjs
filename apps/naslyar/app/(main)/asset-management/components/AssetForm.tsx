'use client';

import React from 'react';
import { AssetCategory, AssetItem, AssetLocation } from '../asset-management-api';
import { jalaliStringToIso, isoToJalaliString } from '../jalali.client';
import styles from '../AssetManagement.module.scss';

interface AssetFormProps {
    categories: AssetCategory[];
    locations: AssetLocation[];
    initial?: AssetItem | null;
    /** id تگ form — دکمه ثبت در فوتر مودال با همین id بایند می‌شود */
    formId: string;
    onSubmit: (body: Record<string, unknown>) => void;
}

interface FormState {
    title: string;
    assetCode: string;
    model: string;
    brand: string;
    serialNumber: string;
    categoryId: string;
    locationId: string;
    unit: string;
    invoiceNumber: string;
    contractNumber: string;
    supplier: string;
    purchaseDate: string;
    commissioningDate: string;
    purchasePrice: string;
    warrantyCompany: string;
    warrantyContractNumber: string;
    warrantyStartDate: string;
    warrantyEndDate: string;
    description: string;
}

const emptyForm = (): FormState => ({
    title: '',
    assetCode: '',
    model: '',
    brand: '',
    serialNumber: '',
    categoryId: '',
    locationId: '',
    unit: '',
    invoiceNumber: '',
    contractNumber: '',
    supplier: '',
    purchaseDate: '',
    commissioningDate: '',
    purchasePrice: '',
    warrantyCompany: '',
    warrantyContractNumber: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
    description: '',
});

const dateFields = [
    { key: 'purchaseDate', label: 'تاریخ خرید (شمسی)' },
    { key: 'commissioningDate', label: 'تاریخ بهره‌برداری (شمسی)' },
] as const;

const dateFieldNames: Record<string, string> = {
    purchaseDate: 'تاریخ خرید',
    commissioningDate: 'تاریخ بهره‌برداری',
    warrantyStartDate: 'شروع گارانتی',
    warrantyEndDate: 'پایان گارانتی',
};

export default function AssetForm({ categories, locations, initial, formId, onSubmit }: AssetFormProps) {
    const [form, setForm] = React.useState<FormState>(emptyForm);

    React.useEffect(() => {
        if (initial) {
            setForm({
                title: initial.title || '',
                assetCode: initial.assetCode || '',
                model: initial.model || '',
                brand: initial.brand || '',
                serialNumber: initial.serialNumber || '',
                categoryId: initial.categoryId || '',
                locationId: initial.locationId || '',
                unit: initial.unit || '',
                invoiceNumber: initial.invoiceNumber || '',
                contractNumber: initial.contractNumber || '',
                supplier: initial.supplier || '',
                purchaseDate: isoToJalaliString(initial.purchaseDate),
                commissioningDate: isoToJalaliString(initial.commissioningDate),
                purchasePrice: initial.purchasePrice ? String(initial.purchasePrice) : '',
                warrantyCompany: initial.warrantyCompany || '',
                warrantyContractNumber: initial.warrantyContractNumber || '',
                warrantyStartDate: isoToJalaliString(initial.warrantyStartDate),
                warrantyEndDate: isoToJalaliString(initial.warrantyEndDate),
                description: initial.description || '',
            });
        } else {
            setForm(emptyForm());
        }
    }, [initial]);

    const set = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert('نام دارایی الزامی است');
            return;
        }
        // تاریخ‌های شمسی به ISO تبدیل می‌شوند؛ تاریخ نامعتبر خطا می‌دهد
        for (const [key, label] of Object.entries(dateFieldNames)) {
            const value = (form as unknown as Record<string, string>)[key];
            if (value?.trim() && !jalaliStringToIso(value)) {
                alert(`${label} نامعتبر است — قالب درست: ۱۴۰۳/۰۴/۱۲`);
                return;
            }
        }

        const body: Record<string, unknown> = {
            title: form.title.trim(),
            model: form.model || undefined,
            brand: form.brand || undefined,
            serialNumber: form.serialNumber || undefined,
            categoryId: form.categoryId || undefined,
            locationId: form.locationId || undefined,
            unit: form.unit || undefined,
            invoiceNumber: form.invoiceNumber || undefined,
            contractNumber: form.contractNumber || undefined,
            supplier: form.supplier || undefined,
            purchaseDate: jalaliStringToIso(form.purchaseDate) || undefined,
            commissioningDate: jalaliStringToIso(form.commissioningDate) || undefined,
            purchasePrice: form.purchasePrice ? Number(form.purchasePrice.replace(/,/g, '')) : 0,
            warrantyCompany: form.warrantyCompany || undefined,
            warrantyContractNumber: form.warrantyContractNumber || undefined,
            warrantyStartDate: jalaliStringToIso(form.warrantyStartDate) || undefined,
            warrantyEndDate: jalaliStringToIso(form.warrantyEndDate) || undefined,
            description: form.description || undefined,
        };
        if (!initial) {
            body.assetCode = form.assetCode.trim() || undefined;
        }
        onSubmit(body);
    };

    return (
        <form id={formId} className={styles.modalForm} onSubmit={submit}>
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>نام دارایی *</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => set('title', e.target.value)}
                        placeholder="مثال: لپ‌تاپ Lenovo ThinkPad T14"
                    />
                </div>
                <div className={styles.field}>
                    <label>گروه دارایی</label>
                    <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                        <option value="">— انتخاب کنید —</option>
                        {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                    {!initial && (
                        <span className={styles.fieldHint}>
                            کد اموال از پیشوند گروه ساخته می‌شود؛ یا دستی وارد کنید
                        </span>
                    )}
                </div>
                {!initial && (
                    <div className={styles.field}>
                        <label>کد اموال (اختیاری)</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.assetCode}
                            onChange={(e) => set('assetCode', e.target.value)}
                            placeholder="IT-LAP-00001"
                        />
                    </div>
                )}
                <div className={styles.field}>
                    <label>برند / سازنده</label>
                    <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
                </div>
                <div className={styles.field}>
                    <label>مدل</label>
                    <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)} />
                </div>
                <div className={styles.field}>
                    <label>شماره سریال</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.serialNumber}
                        onChange={(e) => set('serialNumber', e.target.value)}
                    />
                </div>
                <div className={styles.field}>
                    <label>محل استقرار</label>
                    <select value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
                        <option value="">— انتخاب کنید —</option>
                        {locations.map((l) => (
                            <option key={l._id} value={l._id}>
                                {l.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.field}>
                    <label>واحد سازمانی</label>
                    <input
                        type="text"
                        value={form.unit}
                        onChange={(e) => set('unit', e.target.value)}
                        placeholder="مثال: فناوری اطلاعات"
                    />
                </div>
            </div>

            <p className={styles.formSectionTitle}>اطلاعات خرید</p>
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>شماره فاکتور</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.invoiceNumber}
                        onChange={(e) => set('invoiceNumber', e.target.value)}
                    />
                </div>
                <div className={styles.field}>
                    <label>شماره قرارداد خرید</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.contractNumber}
                        onChange={(e) => set('contractNumber', e.target.value)}
                    />
                </div>
                <div className={styles.field}>
                    <label>تأمین‌کننده</label>
                    <input type="text" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
                </div>
                {dateFields.map((f) => (
                    <div className={styles.field} key={f.key}>
                        <label>{f.label}</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form[f.key]}
                            onChange={(e) => set(f.key, e.target.value)}
                            placeholder="1403/04/12"
                        />
                    </div>
                ))}
                <div className={styles.field}>
                    <label>قیمت خرید (ریال)</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.purchasePrice}
                        onChange={(e) => set('purchasePrice', e.target.value)}
                        placeholder="850000000"
                    />
                </div>
            </div>

            <p className={styles.formSectionTitle}>گارانتی</p>
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>شرکت گارانتی‌کننده</label>
                    <input
                        type="text"
                        value={form.warrantyCompany}
                        onChange={(e) => set('warrantyCompany', e.target.value)}
                    />
                </div>
                <div className={styles.field}>
                    <label>شماره قرارداد گارانتی</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.warrantyContractNumber}
                        onChange={(e) => set('warrantyContractNumber', e.target.value)}
                    />
                </div>
                <div className={styles.field}>
                    <label>شروع گارانتی (شمسی)</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.warrantyStartDate}
                        onChange={(e) => set('warrantyStartDate', e.target.value)}
                        placeholder="1403/04/12"
                    />
                </div>
                <div className={styles.field}>
                    <label>پایان گارانتی (شمسی)</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.warrantyEndDate}
                        onChange={(e) => set('warrantyEndDate', e.target.value)}
                        placeholder="1405/04/12"
                    />
                </div>
                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <label>توضیحات</label>
                    <textarea
                        rows={2}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                    />
                </div>
            </div>
        </form>
    );
}
