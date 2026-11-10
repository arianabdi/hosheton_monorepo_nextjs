'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { nodeCatalogApi, type CreateNodeCatalogPayload } from '../../../lib/node-catalog-api';
import { CATEGORY_LABELS_FA } from '../../../types/node-catalog';
import formStyles from '../../../../(core)/ProviderForm.module.scss';

const EMPTY_FORM: CreateNodeCatalogPayload = {
    type: '',
    category: 'input',
    label: '',
    labelFa: '',
    description: '',
    descriptionFa: '',
    icon: 'LuBox',
    executable: true,
    passthrough: false,
    sortOrder: 100,
};

export default function NodeForm() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string | undefined;
    const isEditing = Boolean(id);

    const [form, setForm] = useState<CreateNodeCatalogPayload>(EMPTY_FORM);
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing || !id) return;

        async function loadNode() {
            try {
                setLoading(true);
                const node = await nodeCatalogApi.getById(id);
                setForm({
                    type: node.type,
                    category: node.category,
                    label: node.label,
                    labelFa: node.labelFa,
                    description: node.description,
                    descriptionFa: node.descriptionFa,
                    icon: node.icon,
                    providerClass: node.providerClass,
                    executable: node.executable,
                    passthrough: node.passthrough,
                    sortOrder: node.sortOrder,
                    defaultData: node.defaultData,
                    settingsFields: node.settingsFields,
                });
                setIsActive(node.isActive !== false);
            } catch (error) {
                ErrorToaster(error);
                router.push('/projects/nodes');
            } finally {
                setLoading(false);
            }
        }

        loadNode();
    }, [id, isEditing, router]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.type.trim() || !form.labelFa.trim()) return;

        try {
            setSaving(true);
            if (isEditing && id) {
                await nodeCatalogApi.update(id, { ...form, isActive });
                SuccessToaster({ message: 'گره با موفقیت به‌روزرسانی شد' });
            } else {
                await nodeCatalogApi.create(form);
                SuccessToaster({ message: 'گره جدید با موفقیت ایجاد شد' });
            }
            router.push('/projects/nodes');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={`${formStyles.formContainer} ${formStyles.rtl}`}>
                <LoadingState />
            </div>
        );
    }

    return (
        <div className={`${formStyles.formContainer} ${formStyles.rtl}`}>
            <Link href="/projects/nodes" className={formStyles.hint} style={{ display: 'inline-block', marginBottom: '1rem' }}>
                ← بازگشت به لیست گره‌ها
            </Link>

            <h1 className={formStyles.formTitle}>
                {isEditing ? 'ویرایش گره Canvas' : 'ایجاد گره جدید'}
            </h1>
            <p className={formStyles.formDescription}>
                مشخصات گره را تعریف کنید تا در جعبه ابزار ویرایشگر workflow کاربران نمایش داده شود.
            </p>

            <form className={formStyles.form} onSubmit={handleSubmit}>
                <div className={formStyles.row}>
                    <label>
                        type (یکتا)
                        <input
                            value={form.type}
                            disabled={isEditing}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            placeholder="مثلا: textToImage"
                            required
                        />
                        <span className={formStyles.hint}>شناسه فنی گره؛ پس از ایجاد قابل تغییر نیست.</span>
                    </label>

                    <label>
                        category
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                            {Object.entries(CATEGORY_LABELS_FA).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className={formStyles.row}>
                    <label>
                        label (EN)
                        <input
                            value={form.label}
                            onChange={(e) => setForm({ ...form, label: e.target.value })}
                            placeholder="Text to Image"
                            required
                        />
                    </label>

                    <label>
                        labelFa
                        <input
                            value={form.labelFa}
                            onChange={(e) => setForm({ ...form, labelFa: e.target.value })}
                            placeholder="متن به تصویر"
                            required
                        />
                    </label>
                </div>

                <div className={formStyles.row}>
                    <label style={{ gridColumn: '1 / -1' }}>
                        descriptionFa
                        <textarea
                            rows={4}
                            value={form.descriptionFa}
                            onChange={(e) => setForm({ ...form, descriptionFa: e.target.value })}
                            placeholder="توضیح کوتاه برای نمایش در جعبه ابزار"
                        />
                    </label>
                </div>

                <div className={formStyles.row}>
                    <label>
                        icon (Lu*)
                        <input
                            value={form.icon}
                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                            placeholder="LuImage"
                        />
                    </label>

                    <label>
                        providerClass
                        <select
                            value={form.providerClass ?? ''}
                            onChange={(e) => setForm({ ...form, providerClass: e.target.value || undefined })}
                        >
                            <option value="">—</option>
                            <option value="text">text</option>
                            <option value="image">image</option>
                            <option value="video">video</option>
                            <option value="audio">audio</option>
                            <option value="3d">3d</option>
                        </select>
                    </label>
                </div>

                <div className={formStyles.row}>
                    <label>
                        sortOrder
                        <input
                            type="number"
                            value={form.sortOrder ?? 100}
                            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        />
                    </label>

                    {isEditing && (
                        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                            فعال در کاتالوگ
                        </label>
                    )}
                </div>

                <div className={formStyles.row}>
                    <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={form.executable}
                            onChange={(e) => setForm({ ...form, executable: e.target.checked })}
                        />
                        executable
                    </label>

                    <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={form.passthrough}
                            onChange={(e) => setForm({ ...form, passthrough: e.target.checked })}
                        />
                        passthrough
                    </label>
                </div>

                <button type="submit" className={formStyles.submit} disabled={saving}>
                    {saving ? 'در حال ذخیره...' : (isEditing ? 'ذخیره تغییرات' : 'ایجاد گره')}
                </button>
            </form>
        </div>
    );
}
