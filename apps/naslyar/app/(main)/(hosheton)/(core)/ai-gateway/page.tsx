import { redirect } from 'next/navigation';

/** دروازهٔ AI حالا تب «عبور از تحریم و فیلتر» در تنظیمات هوش مصنوعی است */
export default function AiGatewayRedirectPage() {
    redirect('/ai-settings?tab=bypass');
}
