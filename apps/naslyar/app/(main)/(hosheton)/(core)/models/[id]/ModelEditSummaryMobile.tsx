'use client';

import { useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import ModelEditSummaryContent, { type ModelEditSummaryContentProps } from './ModelEditSummaryContent';
import pageStyles from './ModelEditPage.module.scss';

export default function ModelEditSummaryMobile({
    onModeClick,
    onSettingClick,
    ...props
}: ModelEditSummaryContentProps) {
    const [open, setOpen] = useState(false);

    const handleModeClick = (editorId: string) => {
        setOpen(false);
        onModeClick?.(editorId);
    };

    const handleSettingClick = (index: number) => {
        setOpen(false);
        onSettingClick?.(index);
    };

    return (
        <>
            <button
                type="button"
                className={pageStyles.summaryMobileBtn}
                onClick={() => setOpen(true)}
            >
                خلاصه تنظیمات
            </button>

            <ModalHelper
                open={open}
                onClose={() => setOpen(false)}
                sheetTitle="خلاصه تنظیمات مدل"
                size="720px"
                component={(
                    <ModelEditSummaryContent
                        {...props}
                        onModeClick={handleModeClick}
                        onSettingClick={handleSettingClick}
                    />
                )}
            />
        </>
    );
}
