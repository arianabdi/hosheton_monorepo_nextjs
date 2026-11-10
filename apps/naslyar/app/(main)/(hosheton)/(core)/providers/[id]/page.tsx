'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { MdOutlineClose } from 'react-icons/md';

import styles from '../../ProviderForm.module.scss';
import { Field } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';

interface MetadataItem {
    key: string;
    value: string;
}

interface ProviderForm {
    name: string;
    displayName: string;
    baseUrl: string;
    lowCreditWarningThreshold: number;
}

export default function ProviderFormPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isEditing = id !== 'new';

    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [provider, setProvider] = useState<ProviderForm>({
        name: '',
        displayName: '',
        baseUrl: '',
        lowCreditWarningThreshold: 10,
    });
    const [metadata, setMetadata] = useState<MetadataItem[]>([{ key: '', value: '' }]);

    useEffect(() => {
        if (!isEditing || !token) return;

        async function loadProvider() {
            try {
                setIsSubmitting(true);
                const res = await axios.get(`${baseUrl}/api/providers/${id}`, {
                    headers: { authorization: `Bearer ${token}` },
                });

                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    setProvider({
                        name: data.name || '',
                        displayName: data.displayName || '',
                        baseUrl: data.baseUrl || '',
                        lowCreditWarningThreshold: data.lowCreditWarningThreshold ?? 10,
                    });
                    if (data.metadata?.length > 0) {
                        setMetadata(data.metadata);
                    }
                }
            } catch (e) {
                ErrorToaster(e);
            } finally {
                setIsSubmitting(false);
            }
        }

        loadProvider();
    }, [id, isEditing, token, baseUrl]);

    const handleSubmit = async () => {
        if (!token) return;

        try {
            setIsSubmitting(true);
            const payload = { ...provider, metadata };
            const res = isEditing
                ? await axios.put(`${baseUrl}/api/providers/${id}`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  })
                : await axios.post(`${baseUrl}/api/providers`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  });

            if (res.data.statusCode === 200) {
                SuccessToaster({
                    message: `ارائه دهنده با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد`,
                });
                router.push('/providers');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${styles.formContainer} ${styles.rtl}`}>
            <h3 className={styles.formTitle}>
                {isEditing ? 'ویرایش' : 'ایجاد'} ارائه دهنده
            </h3>
            <p className={styles.formDescription}>
                لطفا در وارد کردن اطلاعات ارائه دهنده هوش مصنوعی خود دقت کافی را داشته باشید تا مشکلی در روند کار ارائه دهنده ایجاد نشود.
            </p>

            <div className={styles.form}>
                <div className={styles.row}>
                    <label>
                        شناسه انگلیسی ارائه دهنده
                        <Field
                            value={provider.name}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setProvider((prev) => ({ ...prev, name: e }))}
                        />
                        <span className={styles.hint}>
                            باید از یک اسم انگلیسی کوتاه استفاده کنید. این اسم اختصاصی بوده و مجدد قابل اضافه کردن نخواهد بود. به عنوان مثال gemini
                        </span>
                    </label>
                    <label>
                        نام ارائه دهنده
                        <Field
                            value={provider.displayName}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setProvider((prev) => ({ ...prev, displayName: e }))}
                        />
                        <span className={styles.hint}>
                            این نام برای نمایش در فرم‌ها و بخش‌های مختلف سایت استفاده خواهد شد. به عنوان مثال Google Gemini AI
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        * آدرس استفاده از API
                        <Field
                            value={provider.baseUrl}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setProvider((prev) => ({ ...prev, baseUrl: e }))}
                        />
                        <span className={styles.hint}>
                            بعد از ایجاد API برای هوش مصنوعی مورد نظر خود، آدرس آن را از مستندات پیدا کرده و در اینجا وارد کنید.
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        حداقل موجودی جهت ارسال هشدار کم بودن موجودی به ادمین سایت
                        <Field
                            value={provider.lowCreditWarningThreshold}
                            type="number"
                            className="form-control form-control-sm"
                            onChange={(e) =>
                                setProvider((prev) => ({
                                    ...prev,
                                    lowCreditWarningThreshold: Number(e),
                                }))
                            }
                        />
                        <span className={styles.hint}>
                            در صورتی که مقداری تعیین نکنید به مقدار پیش‌فرض ۱۰ در نظر گرفته خواهد شد.
                        </span>
                    </label>
                </div>

                <div className={styles.column}>
                    <h6>متادیتاها</h6>
                    <div
                        className={styles.addButton}
                        onClick={() => setMetadata((prev) => [...prev, { key: '', value: '' }])}
                    >
                        افزودن متادیتا
                    </div>

                    {metadata.length === 0 ? (
                        <div className={styles.emptyPlaceholder}>متادیتایی ثبت نشده است.</div>
                    ) : (
                        metadata.map((item, index) => (
                            <div key={index} className={styles.metadataRow}>
                                <label>
                                    عنوان
                                    <Field
                                        value={item.key}
                                        type="text"
                                        className="form-control form-control-sm"
                                        onChange={(e) =>
                                            setMetadata((prev) =>
                                                prev.map((meta, i) =>
                                                    i === index ? { ...meta, key: e } : meta
                                                )
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    مقدار
                                    <Field
                                        value={item.value}
                                        type="text"
                                        className="form-control form-control-sm"
                                        onChange={(e) =>
                                            setMetadata((prev) =>
                                                prev.map((meta, i) =>
                                                    i === index ? { ...meta, value: e } : meta
                                                )
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={() =>
                                        setMetadata((prev) => prev.filter((_, i) => i !== index))
                                    }
                                >
                                    <MdOutlineClose size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button className={styles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                {isEditing ? 'ویرایش' : 'ایجاد'} ارائه دهنده
            </button>
        </div>
    );
}
