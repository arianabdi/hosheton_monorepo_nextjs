import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/features منتقل شد */
export default function LegacySubscriptionRedirect() {
    redirect('/subscription/features');
}
