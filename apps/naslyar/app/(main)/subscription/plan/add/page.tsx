import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/plans/new منتقل شد */
export default function LegacySubscriptionRedirect() {
    redirect('/subscription/plans/new');
}
