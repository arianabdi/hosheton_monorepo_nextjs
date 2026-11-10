import { permanentRedirect } from 'next/navigation';

/** Old address of «بک‌آپ خودکار» — its settings live in the backups tab now (the #delivery hash is kept by the browser). */
export default function LegacySchedulePage() {
    permanentRedirect('/settings/database/backups?auto=1');
}
