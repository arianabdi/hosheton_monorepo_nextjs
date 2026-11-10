import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/plans منتقل شد */
export default function LegacySubscriptionRedirect() {
    redirect('/subscription/plans');
}
