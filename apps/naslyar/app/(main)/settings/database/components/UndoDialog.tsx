'use client';

import { useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useDatabase } from '../lib/DatabaseProvider';
import { runRestore } from '../lib/database-api';
import { relativeTime } from '../lib/format';

/** «برگرداندن به قبل»: the safety backup taken right before a restore is restored (2 clicks, no typing). */
export default function UndoDialog() {
    const { undoRequest, closeUndo, baseUrl, token, trackJob, jobRunning } = useDatabase();
    const [busy, setBusy] = useState(false);

    const run = async () => {
        if (!undoRequest) return;
        try {
            setBusy(true);
            const { jobId } = await runRestore(baseUrl, token, undoRequest.safetyBackupFileId, { db: undoRequest.db, mode: 'replace', confirm: true });
            trackJob({ jobId, op: 'restore', mode: 'replace', db: undoRequest.db, fileId: undoRequest.safetyBackupFileId, label: 'برگرداندن به قبل از بازگردانی' });
            closeUndo();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ConfirmDialog
            open={!!undoRequest}
            title="برگرداندن به قبل"
            confirmLabel={jobRunning ? 'یک کار دیگر در حال اجراست' : 'برگرداندن'}
            busy={busy || jobRunning}
            onClose={closeUndo}
            onConfirm={run}
        >
            دیتابیس به وضعیتِ درست قبل از بازگردانی{undoRequest?.at ? ` (${relativeTime(undoRequest.at)})` : ''} برمی‌گردد. از وضعیت فعلی هم
            دوباره بک‌آپ گرفته می‌شود، پس این کار هم برگشت‌پذیر است.
        </ConfirmDialog>
    );
}
