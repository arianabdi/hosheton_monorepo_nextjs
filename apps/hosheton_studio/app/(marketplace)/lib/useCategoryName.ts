'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type NamedTag = { _id?: string; key?: string; name: string };

/**
 * نام دستهٔ اکسپلور (= تگ قالب) به زبان کاربر: ترجمهٔ key در `templateTags`، وگرنه نام فارسی/پنل.
 * HTML سرور و metadata از `name` (فارسی) استفاده می‌کنند؛ UI کلاینت از همین هوک.
 */
export function useCategoryName() {
    const { t } = useTranslation('templateTags');
    return useCallback((node: NamedTag) => {
        const key = node.key || node._id || '';
        return key ? t(key, { defaultValue: node.name }) : node.name;
    }, [t]);
}
