'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    LuLock,
    LuShieldCheck,
    LuUser,
    LuMail,
    LuPhone,
    LuZap,
    LuWallet,
    LuCreditCard,
    LuCircleCheck,
    LuCircleAlert,
    LuLoaderCircle,
    LuWorkflow,
} from 'react-icons/lu';
import { MoneySeparator, SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { mediaThumbSrc } from '@/app/(marketplace)/lib/template-media';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import type { MarketplaceTemplateItem, TemplatePurchaseQuote } from '@/app/(marketplace)/lib/types';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import checkoutStyles from '@/app/(developers)/checkout/CheckoutGateways.module.scss';
import styles from './BuyTemplatePage.module.scss';

type PaymentChoice = 'wallet' | 'gateway';
type GatewayKind = 'gateway' | 'card2card' | 'installment';

interface GatewayItem {
    _id: string;
    slug: string;
    name: string;
    description?: string;
    category: 'direct' | 'installment';
    providerType?: string;
    logoSvg?: string;
    logoUrl?: string;
    currency?: string;
}

interface FxRateQuote {
    code: string;
    priceRial: number;
    priceToman?: number;
}

function formatMoney(amount: number, currency: string, lang: string) {
    const code = String(currency || 'USD').toUpperCase();
    const n = Number(amount) || 0;
    if (code === 'IRT') return `${formatAppNumber(Math.round(n), lang)} IRT`;
    if (code === 'IRR') return `${formatAppNumber(Math.round(n), lang)} IRR`;
    const decimals = code === 'USD' ? (Math.abs(n) >= 1 ? 2 : 4) : 2;
    const symbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : '';
    return `${symbol}${formatAppNumber(n.toFixed(decimals), lang)}`;
}

function splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
}

function isCard2CardGateway(gateway?: GatewayItem | null) {
    if (!gateway) return false;
    const type = String(gateway.providerType || '').toLowerCase();
    const slug = String(gateway.slug || '').toLowerCase();
    const name = String(gateway.name || '').toLowerCase();
    return (
        type === 'card2card'
        || type === 'card-to-card'
        || type === 'manual'
        || slug.includes('card2card')
        || slug.includes('card-to-card')
        || slug.includes('manual')
        || slug.includes('kart')
        || name.includes('کارت')
        || name.includes('card to card')
        || name.includes('card2card')
    );
}

function isRialCurrency(currency?: string) {
    const code = String(currency || '').toUpperCase();
    return code === 'IRT' || code === 'IRR';
}

function chargeAmountFromForeign(foreignAmount: number, rateRial: number, gatewayCurrency: string) {
    const toman = Math.round((foreignAmount * rateRial) / 10);
    if (gatewayCurrency.toUpperCase() === 'IRR') return toman * 10;
    return toman;
}

function formatGatewayMoney(amount: number, gatewayCurrency: string, lang: string) {
    const code = String(gatewayCurrency || 'IRT').toUpperCase();
    return `${formatAppNumber(Math.round(amount), lang)} ${code}`;
}

function walletAmountToToman(amount: number, walletCurrency: string, fxRates: Record<string, FxRateQuote>) {
    const n = Number(amount) || 0;
    if (n <= 0) return 0;
    const code = String(walletCurrency || '').toUpperCase();
    if (code === 'IRT') return Math.round(n);
    if (code === 'IRR') return Math.round(n / 10);
    const rate = fxRates[code]?.priceRial;
    if (!rate) return 0;
    return chargeAmountFromForeign(n, rate, 'IRT');
}

function CheckoutMainSkeleton() {
    return (
        <div className={styles.ghostWrap} aria-hidden="true">
            <div className={styles.ghostAccountRow}>
                <span className={styles.ghostCircle} style={{ '--ghost-delay': '0ms' } as CSSProperties} />
                <div className={styles.ghostAccountText}>
                    <span className={styles.ghostLine} style={{ width: '38%', '--ghost-delay': '40ms' } as CSSProperties} />
                    <span className={styles.ghostLine} style={{ width: '62%', '--ghost-delay': '80ms' } as CSSProperties} />
                </div>
                <span className={styles.ghostBadge} style={{ '--ghost-delay': '120ms' } as CSSProperties} />
            </div>

            <section className={styles.section}>
                <span
                    className={`${styles.ghostLine} ${styles.ghostSectionTitle}`}
                    style={{ '--ghost-delay': '160ms' } as CSSProperties}
                />
                <div className={styles.ghostField}>
                    <span className={styles.ghostLine} style={{ width: '32%', '--ghost-delay': '200ms' } as CSSProperties} />
                    <span className={styles.ghostInput} style={{ '--ghost-delay': '240ms' } as CSSProperties} />
                </div>
                <div className={styles.ghostFieldRow}>
                    <div className={styles.ghostField}>
                        <span className={styles.ghostLine} style={{ width: '44%', '--ghost-delay': '280ms' } as CSSProperties} />
                        <span className={styles.ghostInput} style={{ '--ghost-delay': '320ms' } as CSSProperties} />
                    </div>
                    <div className={styles.ghostField}>
                        <span className={styles.ghostLine} style={{ width: '36%', '--ghost-delay': '360ms' } as CSSProperties} />
                        <span className={styles.ghostInput} style={{ '--ghost-delay': '400ms' } as CSSProperties} />
                    </div>
                </div>
                <div className={styles.ghostField}>
                    <span className={styles.ghostLine} style={{ width: '24%', '--ghost-delay': '440ms' } as CSSProperties} />
                    <span className={styles.ghostInput} style={{ '--ghost-delay': '480ms' } as CSSProperties} />
                </div>
            </section>

            <section className={styles.section}>
                <span
                    className={`${styles.ghostLine} ${styles.ghostSectionTitle}`}
                    style={{ '--ghost-delay': '520ms' } as CSSProperties}
                />
                <div className={styles.ghostDeliveryRow}>
                    <span className={styles.ghostIconBox} style={{ '--ghost-delay': '560ms' } as CSSProperties} />
                    <div className={styles.ghostDeliveryText}>
                        <div className={styles.ghostDeliveryTop}>
                            <span className={styles.ghostLine} style={{ width: '72%', '--ghost-delay': '600ms' } as CSSProperties} />
                            <span className={styles.ghostPill} style={{ '--ghost-delay': '640ms' } as CSSProperties} />
                        </div>
                        <span className={styles.ghostLine} style={{ width: '100%', '--ghost-delay': '680ms' } as CSSProperties} />
                        <span className={styles.ghostLine} style={{ width: '84%', '--ghost-delay': '720ms' } as CSSProperties} />
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <span
                    className={`${styles.ghostLine} ${styles.ghostSectionTitle}`}
                    style={{ '--ghost-delay': '760ms' } as CSSProperties}
                />
                <div className={styles.ghostPaymentBlock}>
                    <div className={styles.ghostPaymentHeader}>
                        <span className={styles.ghostRadio} style={{ '--ghost-delay': '800ms' } as CSSProperties} />
                        <span className={styles.ghostIconBox} style={{ '--ghost-delay': '840ms' } as CSSProperties} />
                        <div className={styles.ghostPaymentText}>
                            <span className={styles.ghostLine} style={{ width: '48%', '--ghost-delay': '880ms' } as CSSProperties} />
                            <span className={styles.ghostLine} style={{ width: '64%', '--ghost-delay': '920ms' } as CSSProperties} />
                        </div>
                    </div>
                    <div className={styles.ghostBalanceGrid}>
                        {[0, 1, 2].map((col) => (
                            <div key={col} className={styles.ghostBalanceCol}>
                                <span
                                    className={styles.ghostLine}
                                    style={{ width: '70%', '--ghost-delay': `${960 + col * 40}ms` } as CSSProperties}
                                />
                                <span
                                    className={styles.ghostLine}
                                    style={{ width: '55%', '--ghost-delay': `${980 + col * 40}ms` } as CSSProperties}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className={styles.ghostCta}>
                <span className={styles.ghostButton} style={{ '--ghost-delay': '1080ms' } as CSSProperties} />
                <span className={styles.ghostLine} style={{ width: '52%', '--ghost-delay': '1120ms' } as CSSProperties} />
            </div>
        </div>
    );
}

function CheckoutSummarySkeleton() {
    return (
        <div className={styles.ghostSummaryWrap} aria-hidden="true">
            <div className={styles.ghostSummaryHead}>
                <span className={styles.ghostLine} style={{ width: '46%', '--ghost-delay': '0ms' } as CSSProperties} />
                <span className={styles.ghostLine} style={{ width: '18%', '--ghost-delay': '40ms' } as CSSProperties} />
            </div>

            <div className={styles.ghostItemRow}>
                <span className={styles.ghostThumb} style={{ '--ghost-delay': '80ms' } as CSSProperties} />
                <div className={styles.ghostItemText}>
                    <span className={styles.ghostLine} style={{ width: '32%', '--ghost-delay': '120ms' } as CSSProperties} />
                    <span className={styles.ghostLine} style={{ width: '88%', '--ghost-delay': '160ms' } as CSSProperties} />
                    <span className={styles.ghostLine} style={{ width: '56%', '--ghost-delay': '200ms' } as CSSProperties} />
                </div>
                <span className={styles.ghostLine} style={{ width: '42px', '--ghost-delay': '240ms' } as CSSProperties} />
            </div>

            <div className={styles.ghostTotals}>
                {[['52%', '38%'], ['44%', '46%'], ['40%', '32%'], ['28%', '48%']].map(([labelW, valueW], index) => (
                    <div key={index} className={styles.ghostTotalRow}>
                        <span
                            className={styles.ghostLine}
                            style={{ width: labelW, '--ghost-delay': `${280 + index * 50}ms` } as CSSProperties}
                        />
                        <span
                            className={styles.ghostLine}
                            style={{ width: valueW, '--ghost-delay': `${300 + index * 50}ms` } as CSSProperties}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BuyTemplatePage() {
    const params = useParams<{ templateId: string }>();
    const templateId = String(params?.templateId || '');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, user } = useAuthStore();
    const { t, i18n } = useTranslation('marketplace');
    const { t: tc } = useTranslation('common');
    const { t: tw } = useTranslation('wallet');
    const lang = i18n.language;
    const rtl = isRtlLanguage(lang);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    const [item, setItem] = useState<MarketplaceTemplateItem | null>(null);
    const [quote, setQuote] = useState<TemplatePurchaseQuote | null>(null);
    const [email, setEmail] = useState(user?.email || '');
    const [firstName, setFirstName] = useState(splitName(user?.name || '').firstName);
    const [lastName, setLastName] = useState(splitName(user?.name || '').lastName);
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [payingGateway, setPayingGateway] = useState(false);
    const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('wallet');
    const [applyWalletOnGateway, setApplyWalletOnGateway] = useState(false);
    const [gatewayKind, setGatewayKind] = useState<GatewayKind>('gateway');
    const [gateways, setGateways] = useState<GatewayItem[]>([]);
    const [selectedGateway, setSelectedGateway] = useState('');
    const [fxRates, setFxRates] = useState<Record<string, FxRateQuote>>({});
    const autoPurchaseStarted = useRef(false);
    const purchaseLock = useRef(false);

    useEffect(() => {
        if (!token) {
            router.replace('/login');
            return;
        }
        if (!templateId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            marketplaceApi.getTemplate(templateId),
            marketplaceApi.getPurchaseQuote(templateId),
            axios.get(`${apiUrl}/api/user`, {
                headers: { authorization: `Bearer ${token}` },
            }).catch(() => null),
            axios.get(`${apiUrl}/api/checkout/public-data`).catch(() => null),
            axios.get(`${apiUrl}/api/billing/exchange-rates`).catch(() => null),
        ])
            .then(async ([detail, nextQuote, profileRes, publicRes, fxRes]) => {
                if (cancelled) return;
                setItem(detail);
                setQuote(nextQuote);
                const profile = profileRes?.data?.data?.user;
                if (profile) {
                    const names = splitName(String(profile.fullName || user?.name || ''));
                    setEmail(String(profile.email || user?.email || ''));
                    setFirstName(names.firstName);
                    setLastName(names.lastName);
                    setPhone(String(profile.mobile || ''));
                }
                let gw: GatewayItem[] =
                    publicRes?.data?.data?.gateways
                    || (Array.isArray(publicRes?.data?.data) ? publicRes.data.data : [])
                    || [];
                if (!Array.isArray(gw) || gw.length === 0) {
                    const fallback = await axios.get(`${apiUrl}/api/billing/gateways/public`).catch(() => null);
                    gw = fallback?.data?.data?.gateways || fallback?.data?.data || [];
                }
                const all = Array.isArray(gw) ? gw : [];
                setGateways(all);
                const first =
                    all.find((g) => g.category === 'direct' && !isCard2CardGateway(g))
                    || all.find((g) => g.category === 'direct')
                    || all[0];
                if (first) setSelectedGateway(first.slug);
                if (!nextQuote.canAfford && !nextQuote.alreadyPurchased && !nextQuote.alreadyFree && !nextQuote.isOwner) {
                    setPaymentChoice('gateway');
                }
                const snap = fxRes?.data?.data;
                const map: Record<string, FxRateQuote> = {};
                (snap?.rates || []).forEach((rate: FxRateQuote) => {
                    map[rate.code] = rate;
                });
                setFxRates(map);
            })
            .catch((err) => {
                if (!cancelled) notifyError(err, { fallback: t('buy_error') });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [templateId, token, router, t, user?.email, user?.name, apiUrl]);

    const cover = useMemo(() => {
        if (!item) return null;
        return item.previewMedia?.find((media) => media.isCover) || item.previewMedia?.[0] || item.primaryPreview;
    }, [item]);

    const chargeIfBuying = quote && !(quote.alreadyPurchased || quote.alreadyFree || quote.isOwner)
        ? quote.chargeAmount
        : 0;
    const applyWalletNow = paymentChoice === 'wallet' || applyWalletOnGateway;
    const afterBalance = quote
        ? (applyWalletNow ? Math.max(0, quote.availableBalance - chargeIfBuying) : quote.availableBalance)
        : 0;
    const payableWalletAmount = quote
        ? (applyWalletNow ? Math.max(0, quote.chargeAmount - quote.availableBalance) : quote.chargeAmount)
        : 0;
    const needsFunds = Boolean(quote && !quote.canAfford && !quote.alreadyPurchased && !quote.alreadyFree && !quote.isOwner);

    const onlineGateways = useMemo(
        () => gateways.filter((g) => g.category === 'direct' && !isCard2CardGateway(g)),
        [gateways],
    );
    const card2CardGateways = useMemo(
        () => gateways.filter((g) => isCard2CardGateway(g)),
        [gateways],
    );
    const installmentGateways = useMemo(
        () => gateways.filter((g) => g.category === 'installment'),
        [gateways],
    );
    const gatewayKindOptions = useMemo(
        () => [
            { id: 'gateway' as const, label: tw('online_gateway'), desc: tw('online_gateway_desc'), available: onlineGateways.length > 0 },
            { id: 'card2card' as const, label: tw('card_method'), desc: tw('card_upload_short'), available: card2CardGateways.length > 0 },
            { id: 'installment' as const, label: tw('installment'), desc: tw('installment_desc'), available: installmentGateways.length > 0 },
        ],
        [tw, onlineGateways.length, card2CardGateways.length, installmentGateways.length],
    );
    const visibleGatewayKinds = useMemo(
        () => gatewayKindOptions.filter((option) => option.available),
        [gatewayKindOptions],
    );
    const filteredGateways = useMemo(() => {
        if (gatewayKind === 'card2card') return card2CardGateways;
        if (gatewayKind === 'installment') return installmentGateways;
        return onlineGateways;
    }, [gatewayKind, card2CardGateways, installmentGateways, onlineGateways]);

    useEffect(() => {
        if (!visibleGatewayKinds.length) return;
        if (!visibleGatewayKinds.some((option) => option.id === gatewayKind)) {
            setGatewayKind(visibleGatewayKinds[0].id);
        }
    }, [visibleGatewayKinds, gatewayKind]);

    useEffect(() => {
        if (!filteredGateways.length) {
            setSelectedGateway('');
            return;
        }
        if (!filteredGateways.find((g) => g.slug === selectedGateway)) {
            setSelectedGateway(filteredGateways[0].slug);
        }
    }, [filteredGateways, selectedGateway]);

    const activeGateway = useMemo(
        () => filteredGateways.find((g) => g.slug === selectedGateway) || null,
        [filteredGateways, selectedGateway],
    );
    const isCardTransfer = gatewayKind === 'card2card' || isCard2CardGateway(activeGateway);
    const gatewayCurrency = String(activeGateway?.currency || 'IRT').toUpperCase();
    const productToman = useMemo(() => {
        if (!quote) return 0;
        if (isRialCurrency(quote.sourceCurrency)) {
            return String(quote.sourceCurrency).toUpperCase() === 'IRR'
                ? Math.round(quote.sourceAmount / 10)
                : Math.round(quote.sourceAmount);
        }
        return walletAmountToToman(quote.sourceAmount, quote.sourceCurrency, fxRates);
    }, [quote, fxRates]);
    const walletAppliedToman = useMemo(() => {
        if (!quote || paymentChoice !== 'gateway' || !applyWalletOnGateway) return 0;
        return Math.min(
            walletAmountToToman(quote.availableBalance, quote.chargeCurrency, fxRates),
            productToman,
        );
    }, [quote, paymentChoice, applyWalletOnGateway, fxRates, productToman]);
    const usdRateToman = useMemo(() => {
        const usd = fxRates.USD;
        if (!usd) return 0;
        if (usd.priceToman && usd.priceToman > 0) return Math.round(usd.priceToman);
        if (!usd.priceRial) return 0;
        return Math.round(usd.priceRial / 10);
    }, [fxRates]);
    const gatewayBaseAmount = useMemo(() => {
        if (!quote || payableWalletAmount <= 0) return 0;
        const payableToman = Math.max(0, productToman - walletAppliedToman);
        if (payableToman <= 0) return 0;
        return gatewayCurrency === 'IRR' ? payableToman * 10 : payableToman;
    }, [quote, payableWalletAmount, productToman, walletAppliedToman, gatewayCurrency]);
    const gatewayPaymentAmount = gatewayBaseAmount;

    const formatTomanEn = (amount: number) =>
        `${formatAppNumber(MoneySeparator(Math.round(amount)), 'en')} ${t('toman')}`;

    const summaryBreakdown = useMemo(() => {
        if (!quote) {
            return {
                useToman: false,
                productToman: 0,
                extras: [] as { key: string; label: string; amount: number }[],
                vatToman: 0,
                subtotalToman: 0,
                totalToman: 0,
            };
        }
        const useToman = paymentChoice === 'gateway';
        const extras: { key: string; label: string; amount: number }[] = [];
        const payableToman = Math.max(0, productToman - walletAppliedToman);
        if (walletAppliedToman > 0) {
            extras.push({ key: 'wallet', label: t('checkout_wallet_applied'), amount: -walletAppliedToman });
        }
        return {
            useToman,
            productToman,
            extras,
            vatToman: 0,
            subtotalToman: productToman,
            totalToman: payableToman,
        };
    }, [quote, paymentChoice, productToman, walletAppliedToman, t]);

    const confirmPurchase = useCallback(async (nextQuote?: TemplatePurchaseQuote) => {
        const current = nextQuote || quote;
        if (!current || purchaseLock.current) return;
        if (current.isOwner) {
            notifyError({ message: t('checkout_own') });
            setBuying(false);
            return;
        }
        if (current.alreadyPurchased || current.alreadyFree) {
            router.replace(templateDetailPath(item || { _id: templateId }));
            return;
        }
        if (!current.canAfford) {
            notifyError({ message: t('checkout_need_funds') });
            setBuying(false);
            return;
        }
        purchaseLock.current = true;
        setBuying(true);
        try {
            const result = await marketplaceApi.purchaseTemplate(templateId);
            if (result.alreadyPurchased || result.alreadyFree) {
                SuccessToaster({ message: t('checkout_already') });
            } else {
                SuccessToaster({ message: t('checkout_success') });
            }
            router.replace(templateDetailPath(item || { _id: templateId }));
        } catch (err) {
            notifyError(err, { fallback: t('buy_error') });
            purchaseLock.current = false;
            setBuying(false);
        }
    }, [quote, t, router, templateId, item]);

    useEffect(() => {
        if (!token || !templateId || loading) return;
        const failed = searchParams.get('pay') === 'failed';
        const recharged = searchParams.get('recharged') === '1';
        if (failed) {
            notifyError({ message: t('checkout_pay_failed') });
            router.replace(`/explore/buy/${templateId}`);
            return;
        }
        if (!recharged || autoPurchaseStarted.current) return;
        autoPurchaseStarted.current = true;
        setBuying(true);
        marketplaceApi.getPurchaseQuote(templateId)
            .then((nextQuote) => {
                setQuote(nextQuote);
                return confirmPurchase(nextQuote);
            })
            .catch((err) => {
                notifyError(err, { fallback: t('buy_error') });
                setBuying(false);
            })
            .finally(() => {
                router.replace(`/explore/buy/${templateId}`);
            });
    }, [token, templateId, loading, searchParams, t, router, confirmPurchase]);

    const startGatewayPayment = async () => {
        if (!quote || !token || payingGateway || buying) return;
        if (quote.isOwner) {
            notifyError({ message: t('checkout_own') });
            return;
        }
        if (payableWalletAmount <= 0) {
            void confirmPurchase();
            return;
        }
        if (!selectedGateway && !isCardTransfer) {
            notifyError({ message: t('checkout_no_gateway') });
            return;
        }
        if (!gatewayPaymentAmount) {
            notifyError({ message: t('checkout_no_gateway') });
            return;
        }
        const origin = (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_URL || '').replace(/\/$/, '');
        setPayingGateway(true);
        try {
            const response = await axios.post(
                `${apiUrl}/api/billing/recharge/initiate`,
                {
                    amount: gatewayPaymentAmount,
                    walletCreditAmount: payableWalletAmount,
                    gatewayName: selectedGateway || (isCardTransfer ? 'card2card' : ''),
                    paymentMethod: isCardTransfer ? 'card2card' : undefined,
                    callbackUrl: isCardTransfer
                        ? undefined
                        : `${apiUrl}/api/billing/recharge/callback?gateway=${selectedGateway}`,
                    ...(isCardTransfer
                        ? {}
                        : {
                            redirectSuccess: `${origin}/explore/buy/${templateId}?recharged=1`,
                            redirectFailed: `${origin}/explore/buy/${templateId}?pay=failed`,
                        }),
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            const data = response.data?.data || {};
            const method = String(data.paymentMethod || data.method || '').toLowerCase();
            const looksLikeCard2Card =
                isCardTransfer
                || method === 'card2card'
                || method === 'manual'
                || Boolean(data.bankDetails)
                || (!data.paymentUrl && (data.invoiceId || data.transactionId));
            if (looksLikeCard2Card) {
                SuccessToaster({ message: tw('transfer_created') });
                router.push('/wallet');
                return;
            }
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
                return;
            }
            notifyError({ message: t('checkout_no_gateway') });
            setPayingGateway(false);
        } catch (err) {
            notifyError(err, { fallback: t('buy_error') });
            setPayingGateway(false);
        }
    };

    const templateHref = templateId ? templateDetailPath(item || { _id: templateId }) : '/explore';
    const ready = Boolean(item && quote);
    const userInitials = (firstName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
    const busy = buying || payingGateway;
    const showGateway = paymentChoice === 'gateway';

    return (
        <div className={`${styles.page} ${iransansxvf.className}`} dir={rtl ? 'rtl' : 'ltr'}>
            <div className={styles.layout}>
                <main className={styles.main}>
                    <div className={styles.mainCard}>
                        {loading ? (
                            <CheckoutMainSkeleton />
                        ) : !ready ? (
                            <div className={styles.notFoundInner}>
                                <LuCircleAlert size={32} className={styles.notFoundIcon} />
                                <p>{t('not_found')}</p>
                                <Link href="/explore" className={styles.backBtn}>
                                    {t('checkout_continue')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className={styles.accountRow}>
                                    <div className={styles.accountAvatar}>{userInitials}</div>
                                    <div className={styles.accountDetails}>
                                        <span className={styles.accountLabel}>
                                            {t('checkout_signed_in', { email: '' })}
                                        </span>
                                        <span className={styles.accountEmail}>{email || user?.email || 'User'}</span>
                                    </div>
                                    <span className={styles.verifiedBadge}>
                                        <LuCircleCheck size={14} />
                                        <span>{t('checkout_verified')}</span>
                                    </span>
                                </div>

                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>{t('checkout_customer')}</h2>
                                    <div className={styles.formGrid}>
                                        <label className={styles.fieldFull}>
                                            <span className={styles.fieldLabel}>
                                                {t('checkout_email')} <em className={styles.required}>*</em>
                                            </span>
                                            <div className={styles.inputWrapper}>
                                                <LuMail className={styles.inputIcon} size={16} />
                                                <input type="email" value={email} readOnly className={styles.input} />
                                            </div>
                                        </label>

                                        <div className={styles.fieldRow}>
                                            <label className={styles.field}>
                                                <span className={styles.fieldLabel}>
                                                    {t('checkout_first_name')} <em className={styles.required}>*</em>
                                                </span>
                                                <div className={styles.inputWrapper}>
                                                    <LuUser className={styles.inputIcon} size={16} />
                                                    <input type="text" value={firstName} readOnly className={styles.input} />
                                                </div>
                                            </label>
                                            <label className={styles.field}>
                                                <span className={styles.fieldLabel}>{t('checkout_last_name')}</span>
                                                <div className={styles.inputWrapper}>
                                                    <input
                                                        type="text"
                                                        value={lastName}
                                                        readOnly
                                                        className={`${styles.input} ${styles.inputPlain}`}
                                                    />
                                                </div>
                                            </label>
                                        </div>

                                        <label className={styles.fieldFull}>
                                            <span className={styles.fieldLabel}>{t('checkout_phone')}</span>
                                            <div className={styles.inputWrapper}>
                                                <LuPhone className={styles.inputIcon} size={16} />
                                                <input
                                                    type="tel"
                                                    value={phone || '--'}
                                                    readOnly
                                                    className={styles.input}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </label>
                                    </div>
                                </section>

                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>{t('checkout_delivery_details')}</h2>
                                    <div className={styles.deliveryRow}>
                                        <div className={styles.deliveryIconWrap}>
                                            <LuZap size={18} />
                                        </div>
                                        <div className={styles.deliveryContent}>
                                            <div className={styles.deliveryTop}>
                                                <span className={styles.deliveryTitle}>{t('checkout_digital_delivery')}</span>
                                                <span className={styles.freeBadge}>{t('checkout_free')}</span>
                                            </div>
                                            <p>{t('checkout_terms_disclaimer')}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>{t('checkout_payment')}</h2>
                                    <div className={styles.paymentBlock}>
                                        <div className={styles.methodOptions}>
                                            <button
                                                type="button"
                                                className={`${styles.methodOption} ${paymentChoice === 'wallet' ? styles.methodOptionActive : styles.methodOptionIdle}`}
                                                onClick={() => setPaymentChoice('wallet')}
                                                disabled={busy}
                                            >
                                                <div className={styles.paymentRadio}>
                                                    {paymentChoice === 'wallet' ? <div className={styles.radioInner} /> : null}
                                                </div>
                                                <LuWallet className={styles.paymentWalletIcon} size={20} />
                                                <div className={styles.paymentMethodTitle}>
                                                    <span>{t('checkout_wallet_method')}</span>
                                                    <span className={styles.paymentMethodHint}>{t('checkout_wallet_hint')}</span>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.methodOption} ${paymentChoice === 'gateway' ? styles.methodOptionActive : styles.methodOptionIdle}`}
                                                onClick={() => setPaymentChoice('gateway')}
                                                disabled={busy}
                                            >
                                                <div className={styles.paymentRadio}>
                                                    {paymentChoice === 'gateway' ? <div className={styles.radioInner} /> : null}
                                                </div>
                                                <LuCreditCard className={styles.paymentWalletIcon} size={20} />
                                                <div className={styles.paymentMethodTitle}>
                                                    <span>{t('checkout_direct_method')}</span>
                                                    <span className={styles.paymentMethodHint}>{t('checkout_direct_hint')}</span>
                                                </div>
                                            </button>
                                        </div>

                                        <div className={styles.balanceGrid}>
                                            <div className={styles.balanceCol}>
                                                <span className={styles.balanceLabel}>{t('checkout_balance')}</span>
                                                <span className={styles.balanceValue}>
                                                    {formatMoney(quote!.availableBalance, quote!.chargeCurrency, lang)}
                                                </span>
                                            </div>
                                            <div className={styles.balanceDivider} />
                                            <div className={styles.balanceCol}>
                                                <span className={styles.balanceLabel}>{t('checkout_price')}</span>
                                                <span className={`${styles.balanceValue} ${styles.chargeValue}`}>
                                                    - {formatMoney(quote!.chargeAmount, quote!.chargeCurrency, lang)}
                                                </span>
                                            </div>
                                            <div className={styles.balanceDivider} />
                                            <div className={styles.balanceCol}>
                                                <span className={styles.balanceLabel}>{t('checkout_after_label')}</span>
                                                <span className={`${styles.balanceValue} ${styles.positiveValue}`}>
                                                    {formatMoney(afterBalance, quote!.chargeCurrency, lang)}
                                                </span>
                                            </div>
                                        </div>

                                        {showGateway && quote!.availableBalance > 0 && chargeIfBuying > 0 ? (
                                            <label className={`${styles.walletApplyRow} ${busy ? styles.walletApplyDisabled : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.walletApplyInput}
                                                    checked={applyWalletOnGateway}
                                                    disabled={busy}
                                                    onChange={(event) => setApplyWalletOnGateway(event.target.checked)}
                                                />
                                                <span className={styles.walletApplyText}>{t('checkout_use_wallet_remainder')}</span>
                                            </label>
                                        ) : null}

                                        {showGateway ? (
                                            <div className={styles.gatewayList}>
                                                {visibleGatewayKinds.length > 0 ? (
                                                    <div
                                                        className={
                                                            visibleGatewayKinds.length >= 3
                                                                ? checkoutStyles.gridOptions3
                                                                : visibleGatewayKinds.length === 2
                                                                    ? checkoutStyles.gridOptions
                                                                    : checkoutStyles.gridOptions2
                                                        }
                                                    >
                                                        {visibleGatewayKinds.map((option) => (
                                                            <div
                                                                key={option.id}
                                                                className={`${checkoutStyles.Box} ${gatewayKind === option.id ? checkoutStyles.active : ''}`}
                                                                onClick={() => {
                                                                    if (!busy) setGatewayKind(option.id);
                                                                }}
                                                            >
                                                                <div className={checkoutStyles.boxLabel}>
                                                                    <span>{option.label}</span>
                                                                    <small>{option.desc}</small>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                <span className={styles.balanceLabel}>
                                                    {gatewayKind === 'card2card' ? tw('dest_account') : tw('pick_gateway')}
                                                </span>
                                                {filteredGateways.length === 0 ? (
                                                    <p className={styles.gatewayHint}>{t('checkout_no_gateway')}</p>
                                                ) : (
                                                    <div className={checkoutStyles.gridOptions2}>
                                                        {filteredGateways.map((gateway) => (
                                                            <div
                                                                key={gateway.slug}
                                                                className={`${checkoutStyles.Box} ${selectedGateway === gateway.slug ? checkoutStyles.active : ''}`}
                                                                onClick={() => {
                                                                    if (!busy) setSelectedGateway(gateway.slug);
                                                                }}
                                                            >
                                                                <div className={checkoutStyles.labelContainer}>
                                                                    <div className={checkoutStyles.logo}>
                                                                        {gateway.logoUrl ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={gateway.logoUrl} alt={gateway.name} width={70} height={70} />
                                                                        ) : gateway.logoSvg ? (
                                                                            <div
                                                                                dangerouslySetInnerHTML={{ __html: gateway.logoSvg }}
                                                                                style={{ width: 70, height: 70 }}
                                                                            />
                                                                        ) : (
                                                                            <span>{gateway.name[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className={checkoutStyles.boxLabel}>
                                                                        <span>{gateway.name}</span>
                                                                        <small>
                                                                            {gatewayKind === 'card2card' || isCard2CardGateway(gateway)
                                                                                ? tw('card_to_card_desc')
                                                                                : gateway.description}
                                                                        </small>
                                                                    </div>
                                                                </div>
                                                                <div className={checkoutStyles.radioCircle} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {gatewayPaymentAmount > 0 ? (
                                                    <p className={styles.gatewayHint}>
                                                        {t('checkout_gateway_charge', {
                                                            amount: formatGatewayMoney(gatewayPaymentAmount, gatewayCurrency, lang),
                                                        })}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {needsFunds && paymentChoice === 'wallet' ? (
                                            <div className={styles.insufficientBox}>
                                                <div className={styles.insufficientHeader}>
                                                    <LuCircleAlert size={18} />
                                                    <span>{t('checkout_need_funds')}</span>
                                                </div>
                                                <p>{t('checkout_insufficient_hint')}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </section>

                                <div className={styles.ctaSection}>
                                    {quote!.alreadyPurchased || quote!.alreadyFree ? (
                                        <button
                                            type="button"
                                            className={styles.primaryPayBtn}
                                            onClick={() => void confirmPurchase()}
                                            disabled={busy || quote!.isOwner}
                                        >
                                            {t('checkout_already')}
                                        </button>
                                    ) : paymentChoice === 'gateway' ? (
                                        <button
                                            type="button"
                                            className={styles.primaryPayBtn}
                                            onClick={() => void startGatewayPayment()}
                                            disabled={busy || quote!.isOwner || !selectedGateway}
                                        >
                                            {payingGateway ? (
                                                <>
                                                    <LuLoaderCircle className={styles.spinner} size={18} />
                                                    <span>{tc('saving')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <LuLock size={16} />
                                                    <span>
                                                        {t('checkout_pay_gateway')}
                                                        {gatewayPaymentAmount > 0
                                                            ? ` (${formatGatewayMoney(gatewayPaymentAmount, gatewayCurrency, lang)})`
                                                            : ''}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    ) : quote!.canAfford ? (
                                        <button
                                            type="button"
                                            className={styles.primaryPayBtn}
                                            onClick={() => void confirmPurchase()}
                                            disabled={busy || quote!.isOwner}
                                        >
                                            {buying ? (
                                                <>
                                                    <LuLoaderCircle className={styles.spinner} size={18} />
                                                    <span>{tc('saving')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <LuLock size={16} />
                                                    <span>
                                                        {t('checkout_confirm')} (
                                                        {formatMoney(quote!.chargeAmount, quote!.chargeCurrency, lang)})
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.primaryPayBtn}
                                            onClick={() => setPaymentChoice('gateway')}
                                            disabled={busy}
                                        >
                                            <LuCreditCard size={16} />
                                            <span>{t('checkout_direct_method')}</span>
                                        </button>
                                    )}

                                    <p className={styles.ctaSecurityNotice}>
                                        <LuShieldCheck size={15} />
                                        <span>{t('checkout_secure_line')}</span>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </main>

                <aside className={styles.summary}>
                    <div className={styles.summaryCard}>
                        {loading ? (
                            <CheckoutSummarySkeleton />
                        ) : ready ? (
                            <>
                                <div className={styles.summaryHead}>
                                    <h2 className={styles.summaryTitle}>{t('checkout_summary_label')}</h2>
                                    <Link href={templateHref} className={styles.editLink}>
                                        {t('checkout_edit')}
                                    </Link>
                                </div>

                                <div className={`${styles.itemRow} ${summaryBreakdown.extras.length === 0 ? styles.itemRowSolo : ''}`}>
                                    <div className={styles.itemThumbWrap}>
                                        {cover ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={mediaThumbSrc(cover)}
                                                alt={item!.title}
                                                className={styles.itemThumb}
                                            />
                                        ) : (
                                            <div className={styles.thumbEmpty}>
                                                <LuWorkflow size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemKind}>
                                            {item!.kind === 'workflow' ? t('checkout_kind_workflow') : t('checkout_kind_prompt')}
                                        </span>
                                        <span className={styles.itemTitle}>{item!.title}</span>
                                        <span className={styles.itemMeta}>
                                            {t('checkout_qty', { count: 1 })}
                                            {item!.creator?.fullName ? ` · ${t('checkout_by', { name: item!.creator.fullName })}` : ''}
                                        </span>
                                    </div>
                                    <span className={styles.itemPrice}>
                                        {summaryBreakdown.useToman || isRialCurrency(quote!.sourceCurrency)
                                            ? formatTomanEn(summaryBreakdown.productToman)
                                            : formatMoney(quote!.sourceAmount || quote!.chargeAmount, quote!.sourceCurrency || quote!.chargeCurrency, 'en')}
                                    </span>
                                </div>

                                {summaryBreakdown.extras.length > 0 ? (
                                    <div className={styles.itemAddons}>
                                        {summaryBreakdown.extras.map((row) => (
                                            <div key={row.key} className={styles.itemAddon}>
                                                <span>{row.label}</span>
                                                <b>{`${row.amount < 0 ? '−' : '+'}${formatTomanEn(Math.abs(row.amount))}`}</b>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <dl className={styles.totalsList}>
                                    {usdRateToman > 0 ? (
                                        <div className={`${styles.totalItem} ${styles.fxRateItem}`}>
                                            <dt>{t('checkout_live_usd_rate')}</dt>
                                            <dd>{formatTomanEn(usdRateToman)}</dd>
                                        </div>
                                    ) : null}
                                    <div className={styles.totalItem}>
                                        <dt>{t('checkout_subtotal')}</dt>
                                        <dd>
                                            {summaryBreakdown.useToman
                                                ? formatTomanEn(summaryBreakdown.subtotalToman)
                                                : formatMoney(quote!.chargeAmount, quote!.chargeCurrency, 'en')}
                                        </dd>
                                    </div>
                                    <div className={styles.totalItem}>
                                        <dt>{t('checkout_delivery')}</dt>
                                        <dd className={styles.deliveryFreeTag}>{t('checkout_free_instant')}</dd>
                                    </div>
                                    <div className={styles.totalItem}>
                                        <dt>{t('checkout_tax')}</dt>
                                        <dd>
                                            {summaryBreakdown.useToman
                                                ? formatTomanEn(summaryBreakdown.vatToman)
                                                : formatMoney(0, quote!.chargeCurrency, 'en')}
                                        </dd>
                                    </div>
                                    <div className={styles.grandTotalItem}>
                                        <dt className={styles.grandTotalLabel}>{t('checkout_total')}</dt>
                                        <dd className={styles.grandTotalValue}>
                                            {summaryBreakdown.useToman
                                                ? formatTomanEn(summaryBreakdown.totalToman)
                                                : formatMoney(quote!.chargeAmount, quote!.chargeCurrency, 'en')}
                                        </dd>
                                    </div>
                                </dl>
                            </>
                        ) : null}
                    </div>
                </aside>
            </div>
        </div>
    );
}
