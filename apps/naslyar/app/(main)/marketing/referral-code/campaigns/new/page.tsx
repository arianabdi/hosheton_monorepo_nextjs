'use client';

import CampaignForm from '../../components/CampaignForm';
import { EMPTY_CAMPAIGN_FORM } from '../../lib/referral.types';

export default function NewReferralCampaignPage() {
    return <CampaignForm campaignId={null} initialForm={EMPTY_CAMPAIGN_FORM} initialRules={[]} />;
}
