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

interface ProviderOption {
    _id: string;
    name: string;
    displayName?: string;
}

interface MetadataItem {
    key: string;
    value: string;
}

interface AccountForm {
    name: string;
    apiKey: string;
    quotaLimit: number;
    providerId: string;
}

export default function ProviderAccountFormPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isEditing = id !== 'new';

    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [account, setAccount] = useState<AccountForm>({
        name: '',
        apiKey: '',
        quotaLimit: 0,
        providerId: '',
    });
    const [metadata, setMetadata] = useState<MetadataItem[]>([]);

    useEffect(() => {
        if (!token) return;

        async function loadProviders() {
            try {
                const res = await axios.get(`${baseUrl}/api/providers`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {
                    setProviders(res.data.data.providers || []);
                }
            } catch (e) {
                ErrorToaster(e);
            }
        }

        loadProviders();
    }, [token, baseUrl]);

    useEffect(() => {
        if (!isEditing || !token) return;

        async function loadAccount() {
            try {
                setIsSubmitting(true);
                const res = await axios.get(`${baseUrl}/api/provider-accounts/${id}`, {
                    headers: { authorization: `Bearer ${token}` },
                });

                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    setAccount({
                        name: data.name || '',
                        apiKey: data.apiKey || '',
                        quotaLimit: data.quotaLimit ?? 0,
                        providerId: data.providerId || '',
                    });
                    if (data.metadata && typeof data.metadata === 'object') {
                        const entries = Object.entries(data.metadata).map(([key, value]) => ({
                            key,
                            value: String(value),
                        }));
                        if (entries.length > 0) setMetadata(entries);
                    }
                }
            } catch (e) {
                ErrorToaster(e);
            } finally {
                setIsSubmitting(false);
            }
        }

        loadAccount();
    }, [id, isEditing, token, baseUrl]);

    const handleSubmit = async () => {
        if (!token) return;

        try {
            setIsSubmitting(true);
            const metadataObj = metadata.reduce<Record<string, string>>((acc, item) => {
                if (item.key.trim()) acc[item.key.trim()] = item.value;
                return acc;
            }, {});
            const payload = { ...account, metadata: metadataObj };
            const res = isEditing
                ? await axios.put(`${baseUrl}/api/provider-accounts/${id}`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  })
                : await axios.post(`${baseUrl}/api/provider-accounts`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  });

            if (res.data.statusCode === 200) {
                SuccessToaster({
                    message: `حساب با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد`,
                });
                router.push('/accounts');
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
                {isEditing ? 'ویرایش' : 'ایجاد'} حساب
            </h3>
            <p className={styles.formDescription}>
                لطفا در وارد کردن اطلاعات حساب هوش مصنوعی خود دقت کافی را داشته باشید تا مشکلی در روند کار حساب ایجاد نشود.
            </p>

            <div className={styles.form}>
                <div className={styles.row}>
                    <label>
                        نام حساب
                        <Field
                            value={account.name}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setAccount((prev) => ({ ...prev, name: e }))}
                        />
                        <span className={styles.hint}>
                            این نام برای نمایش در فرم‌ها و بخش‌های مختلف سایت استفاده خواهد شد.
                        </span>
                    </label>
                    <label>
                        ارائه دهنده هوش مصنوعی
                        <Field
                            value={account.providerId}
                            disabled={providers.length === 0}
                            type="select"
                            className="form-control form-control-sm"
                            options={providers.map((item) => ({
                                label: item.displayName || item.name,
                                value: item._id,
                            }))}
                            onChange={(e) => setAccount((prev) => ({ ...prev, providerId: e }))}
                        />
                        <span className={styles.hint}>
                            ارائه دهنده هوش مصنوعی که قصد افزودن حسابی از آن را دارید.
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        * کلید API
                        <Field
                            value={account.apiKey}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setAccount((prev) => ({ ...prev, apiKey: e }))}
                        />
                        <span className={styles.hint}>
                            بعد از ایجاد حساب و دریافت API Key، مقدار آن را وارد کنید.
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        حد مصرف روزانه به ازای توکن
                        <Field
                            value={account.quotaLimit}
                            type="number"
                            className="form-control form-control-sm"
                            onChange={(e) =>
                                setAccount((prev) => ({ ...prev, quotaLimit: Number(e) }))
                            }
                        />
                        <span className={styles.hint}>
                            این مقدار جهت تعویض اکانت از یک اکانت مصرف‌شده به اکانت دیگر به خاطر رسیدن حد quotaLimit می‌باشد.
                        </span>
                    </label>
                </div>
                <div className={styles.column}>
                    <h6>متادیتاها</h6>
                    <p className={styles.hint}>
                        برای ارائه‌دهندگانی مثل BytePlus که نیاز به پارامترهای اضافی دارند (مانند <code>apiKeyId</code>) مقادیر را اینجا وارد کنید.
                    </p>
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
                {isEditing ? 'ویرایش' : 'ایجاد'} حساب
            </button>
        </div>
    );
}
