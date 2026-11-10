'use client';

import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useSitemap } from '../../lib/SitemapProvider';
import GroupEditor from '../../components/GroupEditor';
import { EMPTY_GROUP_FORM } from '../../lib/sitemap.types';
import styles from '../../Sitemap.module.scss';

export default function NewSitemapGroupPage() {
    const { api } = useSitemap();

    return (
        <GroupEditor
            title="گروه جدید سایت‌مپ"
            subtitle="یک منبع محتوایی را با الگوی URL مشخص به سایت‌مپ اضافه کنید."
            guide={
                <>
                    الگوی URL باید دقیقاً مسیر صفحه در سایت باشد؛ مثلاً برای قالب‌ها{' '}
                    <span className={styles.keyBadge}>{'/explore/{slug}'}</span>. گروه بلافاصله بعد از ثبت در سایت‌مپ می‌آید؛
                    سپس از فهرست گروه‌ها ممیزی بگیرید تا URL ۴۰۴ منتشر نشود.
                </>
            }
            initial={EMPTY_GROUP_FORM}
            editMode={false}
            submitLabel="ثبت گروه"
            onSubmit={async (form) => {
                if (!api) return false;
                try {
                    await api.createGroup(form);
                    SuccessToaster({ message: `گروه «${form.title}» ساخته شد.` });
                    return true;
                } catch (e) {
                    ErrorToaster(e);
                    return false;
                }
            }}
        />
    );
}
