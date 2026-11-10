import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/prices منتقل شد */
export default function LegacySubscriptionRedirect() {
    redirect('/subscription/prices');
}
