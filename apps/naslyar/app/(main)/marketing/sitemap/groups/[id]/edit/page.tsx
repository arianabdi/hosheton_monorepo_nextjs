'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LuRefreshCw } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useSitemap, useSitemapData } from '../../../lib/SitemapProvider';
import GroupEditor from '../../../components/GroupEditor';
import { EmptyState, SectionLoading } from '../../../components/fields';
import { sitemapHref } from '../../../lib/sections';
import { formatNumber } from '../../../lib/format';
import type { SitemapApi } from '../../../lib/sitemap-api';
import parentStyles from '../../../../Marketing.module.scss';
import styles from '../../../Sitemap.module.scss';

export default function EditSitemapGroupPage() {
    const { id } = useParams<{ id: string }>();
    const { api } = useSitemap();
    const loadGroup = useCallback((client: SitemapApi) => client.getGroup(id), [id]);
    const { data: group, loading } = useSitemapData(loadGroup);
    const [regenerating, setRegenerating] = useState(false);

    if (!group) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                        {loading ? (
                            <SectionLoading />
                        ) : (
                            <EmptyState>
                                گروه پیدا نشد — <Link href={sitemapHref.groups}>بازگشت به گروه‌ها</Link>
                            </EmptyState>
                        )}
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const onRegenerate = async () => {
        if (!api) return;
        try {
            setRegenerating(true);
            const result = await api.regenerateGroup(group._id);
            SuccessToaster({ message: `فایل‌های گروه بازتولید شد (${formatNumber(result.fileCount)} فایل، ${formatNumber(result.urlsCount)} URL).` });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setRegenerating(false);
        }
    };

    const { _id, ...initial } = group;

    return (
        <GroupEditor
            key={_id}
            title={`ویرایش گروه «${group.title}»`}
            subtitle={
                <>
                    شناسه گروه: <span className={styles.keyBadge}>{group.name}</span>
                </>
            }
            guide="تغییر الگوی URL یا شرایط انتشار، کش این گروه را باطل می‌کند و سایت‌مپ با درخواست بعدی با مقادیر جدید ساخته می‌شود. بعد از تغییر الگو، یک آدرس نمونه را در «بازرسی URL» چک کنید."
            initial={initial}
            editMode
            submitLabel="ذخیره تغییرات"
            headerAction={
                <button type="button" className={parentStyles.secondaryBtn} onClick={onRegenerate} disabled={regenerating || !group.enabled}>
                    <LuRefreshCw className={regenerating ? styles.spinIcon : undefined} /> {regenerating ? 'در حال تولید…' : 'تولید مجدد گروه'}
                </button>
            }
            onSubmit={async (form) => {
                if (!api) return false;
                try {
                    await api.updateGroup(_id, form);
                    SuccessToaster({ message: `گروه «${form.title}» ذخیره شد.` });
                    return true;
                } catch (e) {
                    ErrorToaster(e);
                    return false;
                }
            }}
        />
    );
}
