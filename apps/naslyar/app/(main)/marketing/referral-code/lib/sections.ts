/** مسیرها و تب‌های ماژول کد معرف — تب‌ها در layout مشترک (referral-code/(tabs)/layout.tsx) جابه‌جا می‌شوند */

export const REFERRAL_BASE = '/marketing/referral-code';

export const referralHref = {
    overview: REFERRAL_BASE,
    campaigns: `${REFERRAL_BASE}/campaigns`,
    newCampaign: `${REFERRAL_BASE}/campaigns/new`,
    editCampaign: (id: string) => `${REFERRAL_BASE}/campaigns/${id}/edit`,
    referrals: `${REFERRAL_BASE}/referrals`,
    rewards: (status?: string) => `${REFERRAL_BASE}/rewards${status ? `?status=${status}` : ''}`,
    auditLog: `${REFERRAL_BASE}/audit-log`,
};

export const REFERRAL_TABS = [
    { href: referralHref.overview, label: 'نمای کلی' },
    { href: referralHref.campaigns, label: 'کمپین‌ها' },
    { href: referralHref.referrals, label: 'دعوت‌شدگان' },
    { href: referralHref.rewards(), label: 'پاداش‌ها' },
    { href: referralHref.auditLog, label: 'گزارش تغییرات' },
];
