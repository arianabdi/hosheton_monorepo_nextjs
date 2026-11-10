'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useReferralData } from '../../../lib/ReferralAdminProvider';
import { referralHref } from '../../../lib/sections';
import type { ReferralAdminApi } from '../../../lib/referral-api';
import CampaignForm from '../../../components/CampaignForm';
import parentStyles from '../../../../Marketing.module.scss';
import styles from '../../../ReferralCode.module.scss';

export default function EditReferralCampaignPage() {
    const { id } = useParams<{ id: string }>();
    const loadCampaign = useCallback((api: ReferralAdminApi) => api.getCampaign(id), [id]);
    const { data: campaign, loading } = useReferralData(loadCampaign);

    if (!campaign) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                        {loading ? (
                            <div className={styles.loading}>
                                <span className={styles.spinner} />
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                کمپین پیدا نشد — <Link href={referralHref.campaigns}>بازگشت به کمپین‌ها</Link>
                            </div>
                        )}
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <CampaignForm
            key={campaign._id}
            campaignId={campaign._id}
            initialForm={{
                name: campaign.name,
                description: campaign.description,
                status: campaign.status,
                startAt: campaign.startAt,
                endAt: campaign.endAt,
                maxRewardsPerCustomer: campaign.maxRewardsPerCustomer,
                newCustomerOnly: campaign.newCustomerOnly,
                minimumOrderAmount: campaign.minimumOrderAmount,
                reviewPeriodDays: campaign.reviewPeriodDays,
                allowMultipleRewards: campaign.allowMultipleRewards,
            }}
            initialRules={(campaign.rules || []).map((rule) => ({
                _id: rule._id,
                name: rule.name,
                triggerType: rule.triggerType,
                rewardType: rule.rewardType,
                rewardValue: rule.rewardValue,
                rewardCap: rule.rewardCap,
                minimumTransactionAmount: rule.minimumTransactionAmount,
                tiered: rule.tiered,
                tierMetric: rule.tierMetric,
                tiers: rule.tiers || [],
                priority: rule.priority,
                isActive: rule.isActive,
            }))}
        />
    );
}
