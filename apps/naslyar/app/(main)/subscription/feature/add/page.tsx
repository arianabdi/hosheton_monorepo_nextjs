import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/features/new منتقل شد */
export default function LegacySubscriptionRedirect() {
    redirect('/subscription/features/new');
}
