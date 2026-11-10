'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Copy, Upload } from 'lucide-react';
import styles from './WalletPage.module.scss';
import checkoutStyles from '../checkout/CheckoutGateways.module.scss';
import { MoneySeparator, SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useWalletStore } from '@/app/zustand/store/walletStore';
import { useWalletRealtime } from '@/app/hooks/useWalletRealtime';
import {
    resolveUploadedFileRef,
    uploadFileInChunks,
} from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { usePageLoading } from '@/app/components/PageTransition';
import { UsageHistoryPagination } from '@/app/(developers)/usage/components/UsageHistoryPagination';
import { BannerBox, BANNER_PLACEMENTS } from '@/app/(studio)/banner';

interface BankDetails {
    cardNumber?: string;
    sheba?: string;
    accountHolder?: string;
    bankName?: string;
    instructions?: string;
}

interface GatewayItem {
    _id: string;
    slug: string;
    name: string;
    description?: string;
    category: 'direct' | 'installment';
    providerType?: string;
    logoSvg?: string;
    logoUrl?: string;
    bankDetails?: BankDetails;
    config?: BankDetails;
    currency?: string;
}

interface WalletTransaction {
    _id: string;
    status: string;
    type: string;
    amount: number;
    createdAt?: string;
    gatewayDetails?: { gatewayName?: string };
    invoiceId?: string;
    metadata?: {
        walletCreditAmount?: number;
        walletCurrency?: string;
        paymentAmount?: number;
    } | null;
}

interface PendingCardTransfer {
    invoiceId: string;
    transactionId?: string;
    amount: number;
    gatewaySlug: string;
    bankDetails: BankDetails;
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
        || Boolean(gateway.bankDetails?.cardNumber)
        || Boolean(gateway.config?.cardNumber)
    );
}

function resolveBankDetails(gateway?: GatewayItem | null, fromApi?: BankDetails | null): BankDetails {
    return {
        ...(gateway?.bankDetails || {}),
        ...(gateway?.config || {}),
        ...(fromApi || {}),
    };
}

type PaymentMethod = 'gateway' | 'card2card' | 'installment';

type WalletCurrencyCode = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'AED' | 'IRT' | 'IRR';

interface RechargePackageConfig {
    label: string;
    amount: number;
    bonusPercent: number;
    order?: number;
    isActive?: boolean;
}

interface FxRateQuote {
    code: string;
    labelFa: string;
    priceRial: number;
    priceRialFormatted: string;
    priceToman: number;
    updatedAt: string;
    updatedAtFa?: string;
    profileUrl?: string;
}

function isRialWalletCurrency(currency?: string) {
    const c = (currency || '').toUpperCase();
    return c === 'IRT' || c === 'IRR';
}

function applyBonusCredit(baseAmount: number, bonusPercent: number) {
    return baseAmount * (1 + (bonusPercent || 0) / 100);
}

const CURRENCY_SYMBOL: Partial<Record<WalletCurrencyCode, string>> = {
    USD: '$',
    EUR: '€',
    CNY: '¥',
    GBP: '£',
    AED: 'د.إ',
};

function formatWalletBalance(amount: number, currency: string, lang: string, t: (key: string) => string) {
    const c = currency.toUpperCase();
    if (c === 'IRR') {
        return `${formatAppNumber(MoneySeparator(Math.round(amount)), lang)} ${t('rial')}`;
    }
    if (c === 'IRT') {
        return `${formatAppNumber(MoneySeparator(Math.round(amount)), lang)} ${t('toman')}`;
    }
    const prefix = CURRENCY_SYMBOL[c as WalletCurrencyCode] || '';
    const decimals = c === 'USD' ? 4 : 2;
    return `${prefix}${formatAppNumber(MoneySeparator(Number(amount).toFixed(decimals)), lang)} ${c}`;
}

function formatUsdEnglish(amount: number) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '$0.0000';
    return `$${Math.abs(n).toFixed(4)}`;
}

function resolveTransactionWalletAmount(trx: WalletTransaction): number {
    const credit = Number(trx.metadata?.walletCreditAmount);
    if (Number.isFinite(credit) && credit > 0) return credit;
    return Number(trx.amount) || 0;
}

function formatWalletBalanceLabel(currency: string, t: (key: string) => string) {
    const c = currency.toUpperCase();
    if (c === 'IRR') return t('rial');
    if (c === 'IRT') return t('toman');
    return c;
}

function chargeAmountFromForeign(foreignAmount: number, rateRial: number, gatewayCurrency: string): number {
    const toman = Math.round((foreignAmount * rateRial) / 10);
    if (gatewayCurrency.toUpperCase() === 'IRR') return toman * 10;
    return toman;
}

function formatGatewayMoney(amount: number, gatewayCurrency: string, lang: string, t: (key: string) => string) {
    if (gatewayCurrency.toUpperCase() === 'IRR') {
        return `${formatAppNumber(MoneySeparator(amount), lang)} ${t('rial')}`;
    }
    return `${formatAppNumber(MoneySeparator(amount), lang)} ${t('toman')}`;
}

function isRialBasedGatewayCurrency(currency?: string) {
    const c = (currency || 'IRT').toUpperCase();
    return c === 'IRT' || c === 'IRR';
}

function studioPaymentReturnUrls() {
    const origin = (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_URL || '').replace(/\/$/, '');
    return {
        redirectSuccess: `${origin}/payment/success`,
        redirectFailed: `${origin}/payment/failed`,
    };
}

export default function WalletPage() {
    const { t, i18n } = useTranslation('wallet');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;
    const rial = t('rial');
    const toman = t('toman');
    const searchParams = useSearchParams();
    const payInvoiceId = searchParams.get('payInvoice');
    const { token } = useAuthStore();
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [customAmount, setCustomAmount] = useState('');
    const [selectedGateway, setSelectedGateway] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gateway');
    const [gateways, setGateways] = useState<GatewayItem[]>([]);

    const [balance, setBalance] = useState(0);
    const [walletCurrency, setWalletCurrency] = useState<WalletCurrencyCode>('USD');
    const [walletStatus, setWalletStatus] = useState('active');
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [trxPage, setTrxPage] = useState(1);
    const [trxPerPage, setTrxPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [submitting, setSubmitting] = useState(false);

    const [pendingTransfer, setPendingTransfer] = useState<PendingCardTransfer | null>(null);
    const [trackingCode, setTrackingCode] = useState('');
    const [receiptNote, setReceiptNote] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const [rechargePackages, setRechargePackages] = useState<RechargePackageConfig[]>([]);
    const [selectedBonusPercent, setSelectedBonusPercent] = useState(0);
    const [fxRates, setFxRates] = useState<Record<string, FxRateQuote>>({});
    const [fxFetchedAt, setFxFetchedAt] = useState<string | null>(null);
    const [customForeignInput, setCustomForeignInput] = useState('');

    const [payableInvoice, setPayableInvoice] = useState<{
        invoiceId: string;
        amount: number;
        description?: string;
    } | null>(null);
    const [payingInvoice, setPayingInvoice] = useState(false);

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

    const paymentTypeOptions = useMemo(
        () => [
            {
                id: 'gateway' as const,
                label: t('online_gateway'),
                desc: t('online_gateway_desc'),
                available: onlineGateways.length > 0,
            },
            {
                id: 'card2card' as const,
                label: t('card_method'),
                desc: t('card_upload_short'),
                available: card2CardGateways.length > 0,
            },
            {
                id: 'installment' as const,
                label: t('installment'),
                desc: t('installment_desc'),
                available: installmentGateways.length > 0,
            },
        ],
        [t, onlineGateways.length, card2CardGateways.length, installmentGateways.length],
    );

    const visiblePaymentTypes = useMemo(
        () => paymentTypeOptions.filter((option) => option.available),
        [paymentTypeOptions],
    );

    const filteredGateways = useMemo(() => {
        if (paymentMethod === 'card2card') return card2CardGateways;
        if (paymentMethod === 'installment') return installmentGateways;
        return onlineGateways;
    }, [paymentMethod, card2CardGateways, installmentGateways, onlineGateways]);

    const activeGateway = useMemo(
        () => filteredGateways.find((g) => g.slug === selectedGateway) || null,
        [filteredGateways, selectedGateway],
    );

    const isCardTransfer = paymentMethod === 'card2card' || isCard2CardGateway(activeGateway);

    const gatewayChargeCurrency = useMemo(
        () => (activeGateway?.currency || 'IRT').toUpperCase(),
        [activeGateway],
    );

    const isRialWallet = isRialWalletCurrency(walletCurrency);

    const walletFxRate = useMemo(
        () => (isRialWallet ? null : fxRates[walletCurrency]),
        [fxRates, isRialWallet, walletCurrency],
    );

    const resolvePaymentFromBase = useCallback(
        (baseAmount: number) => {
            if (baseAmount <= 0) return 0;
            if (isRialWallet) return Math.round(baseAmount);
            if (!walletFxRate?.priceRial) return 0;
            return chargeAmountFromForeign(baseAmount, walletFxRate.priceRial, gatewayChargeCurrency);
        },
        [gatewayChargeCurrency, isRialWallet, walletFxRate],
    );

    const baseChargeInput = useMemo(() => {
        if (isRialWallet) {
            const n = parseInt(customAmount.trim(), 10);
            return Number.isFinite(n) ? n : 0;
        }
        const foreign = parseFloat(customForeignInput.trim());
        return Number.isFinite(foreign) && foreign > 0 ? foreign : 0;
    }, [customAmount, customForeignInput, isRialWallet]);

    const walletCreditAmount = useMemo(
        () => (baseChargeInput > 0 ? applyBonusCredit(baseChargeInput, selectedBonusPercent) : 0),
        [baseChargeInput, selectedBonusPercent],
    );

    const paymentAmount = useMemo(
        () => resolvePaymentFromBase(baseChargeInput),
        [baseChargeInput, resolvePaymentFromBase],
    );

    const fetchWalletData = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const headers = { authorization: `Bearer ${token}` };

            const [balanceRes, transactionsRes, publicRes, settingsRes, fxRes] = await Promise.allSettled([
                axios.get(`${API_URL}/api/billing/wallet/balance`, { headers }),
                axios.get(`${API_URL}/api/billing/wallet/transactions`, { headers }),
                axios.get(`${API_URL}/api/checkout/public-data`),
                axios.get(`${API_URL}/api/billing/settings/public`),
                axios.get(`${API_URL}/api/billing/exchange-rates`),
            ]);

            if (balanceRes.status === 'fulfilled' && balanceRes.value.data?.statusCode === 200) {
                const b = balanceRes.value.data.data;
                setBalance(b.balance);
                setWalletStatus(b.status);
                // Keep the global wallet snapshot (sidebar pill, usage page) in sync
                useWalletStore.getState().setFromApi(b);
            }

            if (transactionsRes.status === 'fulfilled' && transactionsRes.value.data?.statusCode === 200) {
                setTransactions(transactionsRes.value.data.data || []);
            }

            if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.statusCode === 200) {
                const s = settingsRes.value.data.data || {};
                const cur = (s.walletCurrency || s.walletSuggestedCurrency || 'USD') as WalletCurrencyCode;
                setWalletCurrency(cur);
                setRechargePackages(Array.isArray(s.walletRechargePackages) ? s.walletRechargePackages : []);
            } else if (balanceRes.status === 'fulfilled' && balanceRes.value.data?.data?.currency) {
                setWalletCurrency(String(balanceRes.value.data.data.currency).toUpperCase() as WalletCurrencyCode);
            }

            if (fxRes.status === 'fulfilled' && fxRes.value.data?.statusCode === 200) {
                const snap = fxRes.value.data.data;
                const map: Record<string, FxRateQuote> = {};
                (snap?.rates || []).forEach((r: FxRateQuote) => {
                    map[r.code] = r;
                });
                setFxRates(map);
                setFxFetchedAt(snap?.fetchedAt || null);
            }

            if (publicRes.status === 'fulfilled' && publicRes.value.data?.statusCode === 200) {
                const gw: GatewayItem[] = publicRes.value.data.data?.gateways || [];
                setGateways(gw);
                const firstOnline = gw.find((g) => g.category === 'direct' && !isCard2CardGateway(g)) || gw.find((g) => g.category === 'direct');
                if (firstOnline) setSelectedGateway(firstOnline.slug);
            } else if (publicRes.status === 'rejected') {
                const fallback = await axios.get(`${API_URL}/api/billing/gateways/public`).catch(() => null);
                if (fallback?.data?.statusCode === 200) {
                    const gw: GatewayItem[] = fallback.data.data || [];
                    setGateways(gw);
                    const firstOnline = gw.find((g) => g.category === 'direct' && !isCard2CardGateway(g)) || gw.find((g) => g.category === 'direct');
                    if (firstOnline) setSelectedGateway(firstOnline.slug);
                }
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    }, [API_URL, token]);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    // Live balance: `wallet:updated` socket events (admin credit, AI settle)
    // arrive through the shared studio socket and land in the global store.
    useWalletRealtime();
    const liveBalance = useWalletStore((s) => s.balance);
    const liveCurrency = useWalletStore((s) => s.currency);
    useEffect(() => {
        if (liveBalance != null) setBalance(liveBalance);
        if (liveCurrency) setWalletCurrency((cur) => (cur === liveCurrency ? cur : liveCurrency as WalletCurrencyCode));
    }, [liveBalance, liveCurrency]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchWalletData();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', fetchWalletData);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', fetchWalletData);
        };
    }, [fetchWalletData]);

    useEffect(() => {
        setSelectedPackage(null);
        setCustomAmount('');
        setCustomForeignInput('');
        setSelectedBonusPercent(0);
    }, [walletCurrency]);

    useEffect(() => {
        if (!payInvoiceId || !token || !API_URL) return;
        axios
            .get(`${API_URL}/api/billing/invoices/${payInvoiceId}/payable`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then(res => {
                if (res.data?.statusCode === 200) {
                    const d = res.data.data;
                    setPayableInvoice({
                        invoiceId: String(d.invoiceId),
                        amount: Number(d.amount),
                        description: d.description,
                    });
                }
            })
            .catch(notifyError);
    }, [payInvoiceId, token, API_URL]);

    const handlePayAdminInvoice = async () => {
        if (!token || !payableInvoice || !selectedGateway) {
            alert(t('pick_gateway_prompt'));
            return;
        }
        try {
            setPayingInvoice(true);
            const res = await axios.post(
                `${API_URL}/api/billing/invoices/${payableInvoice.invoiceId}/pay`,
                {
                    gatewayName: selectedGateway,
                    callbackUrl: `${API_URL}/api/billing/recharge/callback?gateway=${selectedGateway}`,
                    ...studioPaymentReturnUrls(),
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            const url = res.data?.data?.paymentUrl;
            if (url) {
                window.location.href = url;
                return;
            }
            alert(t('no_pay_link'));
        } catch (e) {
            notifyError(e);
        } finally {
            setPayingInvoice(false);
        }
    };

    useEffect(() => {
        if (!visiblePaymentTypes.length) return;
        if (!visiblePaymentTypes.some((option) => option.id === paymentMethod)) {
            setPaymentMethod(visiblePaymentTypes[0].id);
        }
    }, [visiblePaymentTypes, paymentMethod]);

    useEffect(() => {
        if (!filteredGateways.length) {
            setSelectedGateway('');
            return;
        }
        if (!filteredGateways.find((g) => g.slug === selectedGateway)) {
            setSelectedGateway(filteredGateways[0].slug);
        }
    }, [filteredGateways, selectedGateway]);

    useEffect(() => {
        return () => {
            if (receiptPreview) URL.revokeObjectURL(receiptPreview);
        };
    }, [receiptPreview]);

    const handlePackageSelect = (index: number, pkg: RechargePackageConfig) => {
        setSelectedPackage(index);
        setSelectedBonusPercent(pkg.bonusPercent || 0);
        if (isRialWalletCurrency(walletCurrency)) {
            setCustomAmount(String(Math.round(pkg.amount)));
            setCustomForeignInput('');
        } else {
            setCustomForeignInput(String(pkg.amount));
            setCustomAmount('');
        }
    };

    const copyText = async (value?: string) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value.replace(/\s|-/g, ''));
            SuccessToaster({ message: tc('copied') });
        } catch {
            alert(tc('copy_failed'));
        }
    };

    const resetReceiptForm = () => {
        setTrackingCode('');
        setReceiptNote('');
        setReceiptFile(null);
        setUploadProgress(0);
        if (receiptPreview) URL.revokeObjectURL(receiptPreview);
        setReceiptPreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleReceiptPick = (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert(t('image_or_pdf'));
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            alert(t('file_too_large'));
            return;
        }
        if (receiptPreview) URL.revokeObjectURL(receiptPreview);
        setReceiptFile(file);
        setReceiptPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!paymentAmount || paymentAmount < 1000) {
            alert(
                isRialWallet
                    ? t('invalid_amount')
                    : t('invalid_fx_amount'),
            );
            return;
        }
        if (!walletCreditAmount || walletCreditAmount <= 0) {
            alert(t('invalid_credit'));
            return;
        }
        if (!selectedGateway && !isCardTransfer) {
            alert(t('pick_gateway_err'));
            return;
        }

        try {
            setSubmitting(true);
            const response = await axios.post(
                `${API_URL}/api/billing/recharge/initiate`,
                {
                    amount: paymentAmount,
                    walletCreditAmount,
                    gatewayName: selectedGateway || (isCardTransfer ? 'card2card' : ''),
                    paymentMethod: isCardTransfer ? 'card2card' : undefined,
                    callbackUrl: isCardTransfer
                        ? undefined
                        : `${API_URL}/api/billing/recharge/callback?gateway=${selectedGateway}`,
                    ...(!isCardTransfer ? studioPaymentReturnUrls() : {}),
                },
                { headers: { authorization: `Bearer ${token}` } },
            );

            if (response.data?.statusCode !== 200) {
                alert(t('pay_request_err'));
                return;
            }

            const data = response.data.data || {};
            const method = String(data.paymentMethod || data.method || '').toLowerCase();
            const looksLikeCard2Card =
                isCardTransfer
                || method === 'card2card'
                || method === 'manual'
                || Boolean(data.bankDetails)
                || (!data.paymentUrl && (data.invoiceId || data.transactionId));

            if (looksLikeCard2Card) {
                const invoiceId = String(data.invoiceId || data.transactionId || data._id || '');
                if (!invoiceId) {
                    alert(t('no_transfer_id'));
                    return;
                }
                setPendingTransfer({
                    invoiceId,
                    transactionId: data.transactionId,
                    amount: paymentAmount,
                    gatewaySlug: selectedGateway,
                    bankDetails: resolveBankDetails(activeGateway, data.bankDetails),
                });
                resetReceiptForm();
                SuccessToaster({ message: t('transfer_created') });
                await fetchWalletData();
                return;
            }

            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
                return;
            }

            alert(t('bank_link_err'));
        } catch (error) {
            notifyError(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !pendingTransfer) return;
        if (!receiptFile) {
            alert(t('pick_receipt_err'));
            return;
        }

        try {
            setUploadingReceipt(true);
            setUploadProgress(0);

            const upload = await uploadFileInChunks({
                file: receiptFile,
                token,
                onProgress: setUploadProgress,
                metadata: {
                    type: 'PAYMENT_RECEIPT',
                    invoiceId: pendingTransfer.invoiceId,
                    mimetype: receiptFile.type,
                    size: receiptFile.size,
                },
            });

            const { fileId, fileKey } = resolveUploadedFileRef(upload);
            if (!fileId && !fileKey) {
                throw new Error(t('upload_fail'));
            }

            const res = await axios.post(
                `${API_URL}/api/billing/recharge/${pendingTransfer.invoiceId}/receipt`,
                {
                    fileId: fileId || undefined,
                    fileKey: fileKey || undefined,
                    trackingCode: trackingCode.trim() || undefined,
                    note: receiptNote.trim() || undefined,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );

            if (res.data?.statusCode !== 200) {
                throw new Error(t('register_fail'));
            }

            SuccessToaster({ message: t('receipt_sent') });
            setPendingTransfer(null);
            resetReceiptForm();
            await fetchWalletData();
        } catch (error) {
            notifyError(error);
        } finally {
            setUploadingReceipt(false);
        }
    };

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'paid':
            case 'approved':
                return { text: t('status_success'), className: styles.statusSuccess };
            case 'awaiting_review':
                return { text: t('status_pending_admin'), className: styles.statusPending };
            case 'awaiting_receipt':
                return { text: t('status_await_receipt'), className: styles.statusPending };
            case 'pending':
                return { text: t('status_await_pay'), className: styles.statusPending };
            case 'rejected':
                return { text: t('status_rejected'), className: styles.statusError };
            case 'failed':
                return { text: t('status_failed'), className: styles.statusError };
            case 'canceled':
                return { text: t('status_cancelled'), className: styles.statusError };
            case 'expired':
                return { text: t('status_expired'), className: styles.statusError };
            default:
                return { text: status, className: '' };
        }
    };

    const formatTrxDate = (dateString?: string) => formatAppDate(dateString, lang);

    const resolveGatewayLabel = (slug?: string) => {
        if (!slug) return t('internal_credit');
        return gateways.find((g) => g.slug === slug)?.name || slug;
    };

    const resumePendingTransfer = (trx: WalletTransaction) => {
        const gateway = gateways.find((g) => g.slug === trx.gatewayDetails?.gatewayName);
        const invoiceId = String(trx.invoiceId || trx._id);
        setPendingTransfer({
            invoiceId,
            amount: trx.amount,
            gatewaySlug: trx.gatewayDetails?.gatewayName || selectedGateway,
            bankDetails: resolveBankDetails(gateway),
        });
        resetReceiptForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const trxTotalPages = Math.max(1, Math.ceil(transactions.length / trxPerPage));
    const safeTrxPage = Math.min(trxPage, trxTotalPages);
    const pagedTransactions = transactions.slice(
        (safeTrxPage - 1) * trxPerPage,
        safeTrxPage * trxPerPage,
    );

    const handleTrxPageChange = (page: number) => {
        setTrxPage(page);
    };

    const handleTrxPerPageChange = (limit: number) => {
        setTrxPerPage(limit);
        setTrxPage(1);
    };

    if (loading) {
        return <div className={styles.loadingPlaceholder}>{t('loading')}</div>;
    }

    return (
        <div className={`${styles.container}${isRtlLanguage(lang) ? ` ${styles.rtl}` : ''}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>{t('page_title')}</h1>
                <p className={styles.subtitle}>
                    {t('subtitle', { currency: formatWalletBalanceLabel(walletCurrency, t) })}
                </p>
            </header>

            <div className={styles.layoutGrid}>
                <div className={styles.mainControls}>
                    <div className={`${styles.card} ${styles.balanceCard}`}>
                        <div>
                            <span className={styles.cardLabel}>{t('current_balance')}</span>
                            <div className={styles.balanceValue} dir={!isRialWallet ? 'ltr' : undefined}>
                                {formatWalletBalance(balance, walletCurrency, lang, t)}
                            </div>
                        </div>
                        <div className={styles.balanceMeta}>
                            <span>{t('account_status')} <strong style={{ color: walletStatus === 'active' ? '#2a9f51' : '#d9534f' }}>
                                {walletStatus === 'active' ? t('active_payg') : t('inactive')}
                            </strong></span>
                        </div>
                    </div>

                    {/* بنر افقی — بین موجودی فعلی و نرخ دلار */}
                    <BannerBox
                        placementKey={BANNER_PLACEMENTS.WALLET_BALANCE}
                        variant="wide"
                        fallbackRatio="4.5 / 1"
                    />

                    {/* درآمد فروش قالب‌ها (creator) — کیف پول تومانی جدا + دکمه تسویه حساب */}
                    <div className={`${styles.card} ${styles.creatorSettlementCta}`}>
                        <div>
                            <span className={styles.cardLabel}>{t('creator_sales_cta_title')}</span>
                            <p className={styles.creatorSettlementDesc}>{t('creator_sales_cta_desc')}</p>
                        </div>
                        <Link href="/wallet/creator-settlement?request=1" className={styles.creatorSettlementBtn}>
                            {t('creator_sales_cta_button')}
                        </Link>
                    </div>

                    {walletFxRate && !isRialWallet ? (
                        <div className={styles.fxStrip}>
                            <div>
                                <span className={styles.fxStripLabel}>
                                    {t('fx_rate', { label: lang.startsWith('fa') ? walletFxRate.labelFa : walletFxRate.code })}
                                </span>
                                <strong className={styles.fxStripValue}>
                                    {formatAppNumber(MoneySeparator(walletFxRate.priceRial), lang)} {rial}
                                </strong>
                            </div>
                        </div>
                    ) : null}

                    {payableInvoice ? (
                        <div className={styles.card}>
                            <h2 className={styles.sectionTitle}>{t('pay_invoice')}</h2>
                            <p className={styles.fieldHint}>
                                {payableInvoice.description || t('invoice_issued')}
                            </p>
                            <p className={styles.chargePreview}>
                                {t('amount_label')} <strong>{formatAppNumber(MoneySeparator(payableInvoice.amount), lang)} {toman}</strong>
                            </p>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={payingInvoice || !selectedGateway}
                                onClick={handlePayAdminInvoice}
                            >
                                {payingInvoice ? t('redirecting_gateway') : t('pay_invoice')}
                            </button>
                        </div>
                    ) : null}

                    {pendingTransfer ? (
                        <div className={styles.card}>
                            <h2 className={styles.sectionTitle}>{t('transfer_title')}</h2>
                            <div className={styles.transferBanner}>
                                {t('payable_amount')}{' '}
                                <strong>{formatAppNumber(MoneySeparator(pendingTransfer.amount), lang)} {toman}</strong>
                            </div>

                            <div className={styles.bankBox}>
                                <div className={styles.bankRow}>
                                    <span>{t('bank')}</span>
                                    <strong>{pendingTransfer.bankDetails.bankName || tc('empty_dash')}</strong>
                                </div>
                                <div className={styles.bankRow}>
                                    <span>{t('account_holder')}</span>
                                    <strong>{pendingTransfer.bankDetails.accountHolder || tc('empty_dash')}</strong>
                                </div>
                                <div className={styles.bankRow}>
                                    <span>{t('card_number')}</span>
                                    <div className={styles.copyValue}>
                                        <strong className={styles.ltr}>{pendingTransfer.bankDetails.cardNumber || tc('empty_dash')}</strong>
                                        {pendingTransfer.bankDetails.cardNumber ? (
                                            <button type="button" onClick={() => copyText(pendingTransfer.bankDetails.cardNumber)}>
                                                <Copy size={14} /> {tc('copy')}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                                {pendingTransfer.bankDetails.sheba ? (
                                    <div className={styles.bankRow}>
                                        <span>{t('sheba')}</span>
                                        <div className={styles.copyValue}>
                                            <strong className={styles.ltr}>{pendingTransfer.bankDetails.sheba}</strong>
                                            <button type="button" onClick={() => copyText(pendingTransfer.bankDetails.sheba)}>
                                                <Copy size={14} /> {tc('copy')}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                                {pendingTransfer.bankDetails.instructions ? (
                                    <p className={styles.transferHint}>{pendingTransfer.bankDetails.instructions}</p>
                                ) : (
                                    <p className={styles.transferHint}>
                                        {t('transfer_hint')}
                                    </p>
                                )}
                            </div>

                            <form className={styles.form} onSubmit={handleSubmitReceipt}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('tracking_optional')}</label>
                                    <input
                                        className={styles.input}
                                        value={trackingCode}
                                        onChange={(e) => setTrackingCode(e.target.value)}
                                        placeholder={t('tracking_placeholder')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('note_optional')}</label>
                                    <textarea
                                        className={styles.textarea}
                                        rows={3}
                                        value={receiptNote}
                                        onChange={(e) => setReceiptNote(e.target.value)}
                                        placeholder={t('note_placeholder')}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('receipt_required')}</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,application/pdf"
                                        hidden
                                        onChange={(e) => handleReceiptPick(e.target.files?.[0])}
                                    />
                                    <button
                                        type="button"
                                        className={styles.uploadBtn}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={16} />
                                        {receiptFile ? receiptFile.name : t('pick_receipt')}
                                    </button>
                                    {receiptPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={receiptPreview} alt={t('receipt_preview')} className={styles.receiptThumb} />
                                    ) : null}
                                    {uploadingReceipt ? (
                                        <div className={styles.progressTrack}>
                                            <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    ) : null}
                                </div>
                                <div className={styles.actionRow}>
                                    <button type="submit" className={styles.primaryBtn} disabled={uploadingReceipt || !receiptFile}>
                                        {uploadingReceipt ? t('uploading', { progress: formatAppNumber(uploadProgress, lang) }) : t('upload_receipt')}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        disabled={uploadingReceipt}
                                        onClick={() => {
                                            setPendingTransfer(null);
                                            resetReceiptForm();
                                        }}
                                    >
                                        {tc('later')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className={styles.card}>
                            <h2 className={styles.sectionTitle}>{t('add_credit_title')}</h2>

                            <label className={styles.label}>
                                {t('pick_packages')}
                                {!isRialWallet ? (
                                    <span className={styles.fieldHintInline}>
                                        {' '}
                                        {t('amounts_hint', {
                                            currency: walletCurrency,
                                            gateway: isRialBasedGatewayCurrency(gatewayChargeCurrency) ? t('rial_toman') : gatewayChargeCurrency,
                                        })}
                                    </span>
                                ) : null}
                            </label>
                            <div className={styles.packageGrid}>
                                {rechargePackages.map((pkg, index) => {
                                    const pay = resolvePaymentFromBase(pkg.amount);
                                    const credit = applyBonusCredit(pkg.amount, pkg.bonusPercent || 0);
                                    const bonusLabel = pkg.bonusPercent
                                        ? t('bonus', { percent: formatAppNumber(String(pkg.bonusPercent), lang) })
                                        : t('no_bonus');
                                    return (
                                        <div
                                            key={`${pkg.label}-${index}`}
                                            className={`${styles.packageCard} ${selectedPackage === index ? styles.activePackage : ''}`}
                                            onClick={() => handlePackageSelect(index, pkg)}
                                        >
                                            <span className={styles.pkgLabel}>{pkg.label}</span>
                                            <span className={styles.pkgAmount} dir={!isRialWallet ? 'ltr' : undefined}>
                                                {isRialWallet
                                                    ? formatWalletBalance(pkg.amount, walletCurrency, lang, t)
                                                    : `${CURRENCY_SYMBOL[walletCurrency] || ''}${formatAppNumber(String(pkg.amount), lang)} ${walletCurrency}`}
                                            </span>
                                            {!isRialWallet && pay > 0 ? (
                                                <span className={styles.pkgSubAmount}>
                                                    {t('pay_label', { amount: formatGatewayMoney(pay, gatewayChargeCurrency, lang, t) })}
                                                </span>
                                            ) : null}
                                            <span className={styles.pkgSubAmount}>
                                                {t('credit_to_wallet', { amount: formatWalletBalance(credit, walletCurrency, lang, t) })}
                                            </span>
                                            <span className={styles.pkgBonus}>{bonusLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <form className={styles.form} onSubmit={handlePaymentSubmit}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>
                                        {t('custom_amount', {
                                            currency: isRialWallet
                                                ? formatWalletBalanceLabel(walletCurrency, t)
                                                : walletCurrency,
                                        })}
                                    </label>
                                    {isRialWallet ? (
                                        <input
                                            type="number"
                                            placeholder={t('example_rial')}
                                            className={styles.input}
                                            value={customAmount}
                                            onChange={(e) => {
                                                setSelectedPackage(null);
                                                setSelectedBonusPercent(0);
                                                setCustomAmount(e.target.value);
                                            }}
                                            required
                                        />
                                    ) : (
                                        <>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder={t('example_fx', { currency: walletCurrency })}
                                                className={styles.input}
                                                value={customForeignInput}
                                                onChange={(e) => {
                                                    setSelectedPackage(null);
                                                    setSelectedBonusPercent(0);
                                                    setCustomForeignInput(e.target.value);
                                                }}
                                                required
                                            />
                                            {paymentAmount > 0 ? (
                                                <p className={styles.chargePreview}>
                                                    {t('gateway_charge', { amount: formatGatewayMoney(paymentAmount, gatewayChargeCurrency, lang, t) })}
                                                    {walletCreditAmount > 0 ? (
                                                        <>
                                                            {' '}
                                                            — {t('credit_to_wallet', { amount: formatWalletBalance(walletCreditAmount, walletCurrency, lang, t) })}
                                                        </>
                                                    ) : null}
                                                </p>
                                            ) : null}
                                        </>
                                    )}
                                </div>

                                {visiblePaymentTypes.length > 0 ? (
                                    <div className={styles.formGroup}>
                                        <h4 className={styles.subHeading}>
                                            <CreditCard size={18} style={{ verticalAlign: 'middle', marginLeft: '6px' }} />
                                            {t('payment_type')}
                                        </h4>
                                        <div
                                            className={
                                                visiblePaymentTypes.length >= 3
                                                    ? checkoutStyles.gridOptions3
                                                    : visiblePaymentTypes.length === 2
                                                        ? checkoutStyles.gridOptions
                                                        : checkoutStyles.gridOptions2
                                            }
                                        >
                                            {visiblePaymentTypes.map((option) => (
                                                <div
                                                    key={option.id}
                                                    className={`${checkoutStyles.Box} ${paymentMethod === option.id ? checkoutStyles.active : ''}`}
                                                    onClick={() => setPaymentMethod(option.id)}
                                                >
                                                    <div className={checkoutStyles.boxLabel}>
                                                        <span>{option.label}</span>
                                                        <small>{option.desc}</small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <div className={styles.formGroup}>
                                    <h4 className={styles.subHeading}>
                                        {paymentMethod === 'card2card' ? t('dest_account') : t('pick_gateway')}
                                    </h4>
                                    {filteredGateways.length === 0 ? (
                                        <p className={styles.fieldHint}>{t('no_gateway')}</p>
                                    ) : (
                                        <div className={checkoutStyles.gridOptions2}>
                                            {filteredGateways.map((gateway) => (
                                                <div
                                                    key={gateway.slug}
                                                    className={`${checkoutStyles.Box} ${selectedGateway === gateway.slug ? checkoutStyles.active : ''}`}
                                                    onClick={() => setSelectedGateway(gateway.slug)}
                                                >
                                                    <div className={checkoutStyles.labelContainer}>
                                                        <div className={checkoutStyles.logo}>
                                                            {gateway.logoUrl ? (
                                                                <img src={gateway.logoUrl} alt={gateway.name} width={70} height={70} />
                                                            ) : gateway.logoSvg ? (
                                                                <div dangerouslySetInnerHTML={{ __html: gateway.logoSvg }} style={{ width: 70, height: 70 }} />
                                                            ) : (
                                                                <span>{gateway.name[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className={checkoutStyles.boxLabel}>
                                                            <span>{gateway.name}</span>
                                                            <small>
                                                                {paymentMethod === 'card2card' || isCard2CardGateway(gateway)
                                                                    ? t('card_to_card_desc')
                                                                    : gateway.description}
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div className={checkoutStyles.radioCircle} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {isCardTransfer ? (
                                    <div className={styles.helpNote}>
                                        {t('card_steps')}
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    className={styles.primaryBtn}
                                    disabled={submitting || !selectedGateway}
                                >
                                    {submitting
                                        ? (isCardTransfer ? t('submitting_request') : t('connecting_bank'))
                                        : (isCardTransfer ? t('submit_card') : t('pay_online'))}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className={styles.historySection}>
                    <h2 className={styles.sectionTitle}>{t('history_title')}</h2>
                    <div className={styles.tableWrapper}>
                        {transactions.length === 0 ? (
                            <div className={styles.emptyPlaceholder}>{t('no_transactions')}</div>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('col_id')}</th>
                                        <th>{t('col_datetime')}</th>
                                        <th>{t('col_purpose')}</th>
                                        <th>{t('col_amount_usd')}</th>
                                        <th>{t('col_gateway')}</th>
                                        <th>{tc('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedTransactions.map((trx) => {
                                        const statusInfo = getStatusDetails(trx.status);
                                        const isDeposit = trx.type === 'deposit';
                                        const canResume = isDeposit && ['awaiting_receipt', 'pending'].includes(trx.status);
                                        return (
                                            <tr key={trx._id}>
                                                <td className={styles.codeText} data-label={t('col_id')} title={trx._id}>
                                                    {trx._id.substring(0, 8)}...
                                                </td>
                                                <td className={styles.timeText} data-label={t('col_datetime')}>{formatTrxDate(trx.createdAt)}</td>
                                                <td data-label={t('col_purpose')}>
                                                    {isDeposit
                                                        ? (trx.status === 'awaiting_review' || trx.status === 'awaiting_receipt'
                                                            ? t('card_topup')
                                                            : t('online_topup'))
                                                        : t('withdraw')}
                                                    {canResume ? (
                                                        <button
                                                            type="button"
                                                            className={styles.resumeLink}
                                                            onClick={() => resumePendingTransfer(trx)}
                                                        >
                                                            {t('resume_receipt')}
                                                        </button>
                                                    ) : null}
                                                </td>
                                                <td
                                                    className={`${styles.boldText} ${styles.ltr} ${isDeposit ? styles.positivePrice : styles.negativePrice}`}
                                                    data-label={t('col_amount_usd')}
                                                    lang="en"
                                                >
                                                    {isDeposit ? '+' : '−'}{formatUsdEnglish(resolveTransactionWalletAmount(trx))}
                                                </td>
                                                <td data-label={t('col_gateway')}>{resolveGatewayLabel(trx.gatewayDetails?.gatewayName)}</td>
                                                <td data-label={tc('status')}>
                                                    <span className={statusInfo.className}>{statusInfo.text}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <UsageHistoryPagination
                        itemPerPage={trxPerPage}
                        currentPage={safeTrxPage}
                        totalItems={transactions.length}
                        setRowsPerPage={handleTrxPerPageChange}
                        paginate={handleTrxPageChange}
                    />
                </div>
            </div>
        </div>
    );
}
