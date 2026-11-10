import { permanentRedirect } from 'next/navigation';

/** آدرس قدیمی فرم «backup جدید» — زمان‌بندی حالا تب خودش را دارد و بک‌آپ دستی از دکمهٔ هدر گرفته می‌شود */
export default function LegacyCreateBackupPage() {
    permanentRedirect('/settings/database/backups?auto=1');
}
