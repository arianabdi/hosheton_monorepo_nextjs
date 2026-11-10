'use client';

import { useTranslation } from 'react-i18next';
import type { TemplateCreateFields } from '@/app/zustand/store/useTemplateCreateStore';

type PublishStatus = TemplateCreateFields['publishStatus'];

/**
 * وضعیت انتشار قالب — فقط ادمین (فراخوان باید خودش با `useIsStaff` شرط بگذارد).
 * «منتشرشده» بدون صف بررسی در اکسپلور می‌آید؛ «پیش‌نویس» خصوصی می‌ماند.
 */
export function PublishStatusSelect({
    value,
    onChange,
    className,
    disabled,
}: {
    value: PublishStatus;
    onChange: (value: PublishStatus) => void;
    className?: string;
    disabled?: boolean;
}) {
    const { t } = useTranslation('templates');

    return (
        <select
            className={className}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value === 'draft' ? 'draft' : 'approved')}
        >
            <option value="approved">{t('publish_status_approved', { defaultValue: 'منتشرشده' })}</option>
            <option value="draft">{t('publish_status_draft', { defaultValue: 'پیش‌نویس (خصوصی)' })}</option>
        </select>
    );
}

export default PublishStatusSelect;
