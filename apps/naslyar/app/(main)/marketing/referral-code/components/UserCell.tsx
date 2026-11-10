import { userLabel } from '../lib/format';
import type { AdminUserSummary } from '../lib/referral.types';
import styles from '../ReferralCode.module.scss';

/** کاربر در جدول‌های ادمین: نام + موبایل (به‌جای شناسه خام) */
export default function UserCell({ user }: { user: AdminUserSummary | null }) {
    const { name, detail } = userLabel(user);
    return (
        <div className={styles.userCell}>
            <strong>{name}</strong>
            {detail && <span>{detail}</span>}
        </div>
    );
}
