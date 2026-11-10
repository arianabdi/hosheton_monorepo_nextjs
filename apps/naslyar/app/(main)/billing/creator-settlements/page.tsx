import { redirect } from 'next/navigation';

export default function CreatorSettlementsRedirectPage() {
    redirect('/support/requests?tab=settlements');
}
