import { Gateway } from './gateways.types';

export type GatewayCategoryFilter = 'all' | 'direct' | 'installment';
export type GatewayKindFilter = 'all' | 'online' | 'card2card';
export type GatewayTriState = 'all' | 'yes' | 'no';

export interface GatewayListFilters {
    q: string;
    category: GatewayCategoryFilter;
    kind: GatewayKindFilter;
    active: GatewayTriState;
    checkout: GatewayTriState;
}

export const DEFAULT_GATEWAY_FILTERS: GatewayListFilters = {
    q: '',
    category: 'all',
    kind: 'all',
    active: 'all',
    checkout: 'all',
};

export function applyGatewayFilters(items: Gateway[], filters: GatewayListFilters): Gateway[] {
    const q = filters.q.trim().toLowerCase();

    return items
        .filter((g) => {
            if (q) {
                const hay = `${g.name} ${g.slug} ${g.description || ''} ${g.providerType}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (filters.category !== 'all' && g.category !== filters.category) return false;
            if (filters.kind === 'card2card' && g.providerType !== 'card2card') return false;
            if (filters.kind === 'online' && g.providerType === 'card2card') return false;
            if (filters.active === 'yes' && !g.isActive) return false;
            if (filters.active === 'no' && g.isActive) return false;
            if (filters.checkout === 'yes' && !g.showInCheckout) return false;
            if (filters.checkout === 'no' && g.showInCheckout) return false;
            return true;
        })
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'));
}

export function hasActiveGatewayFilters(filters: GatewayListFilters): boolean {
    return (
        filters.q.trim() !== '' ||
        filters.category !== 'all' ||
        filters.kind !== 'all' ||
        filters.active !== 'all' ||
        filters.checkout !== 'all'
    );
}

export type GatewayFilterChip = {
    id: string;
    label: string;
    patch: Partial<GatewayListFilters>;
};

export function getGatewayFilterChips(filters: GatewayListFilters): GatewayFilterChip[] {
    const chips: GatewayFilterChip[] = [];
    if (filters.category === 'direct') {
        chips.push({ id: 'cat-direct', label: 'دسته: مستقیم', patch: { category: 'all' } });
    }
    if (filters.category === 'installment') {
        chips.push({ id: 'cat-inst', label: 'دسته: اقساطی', patch: { category: 'all' } });
    }
    if (filters.kind === 'online') {
        chips.push({ id: 'kind-online', label: 'نوع: آنلاین', patch: { kind: 'all' } });
    }
    if (filters.kind === 'card2card') {
        chips.push({ id: 'kind-c2c', label: 'کارت‌به‌کارت', patch: { kind: 'all' } });
    }
    if (filters.active === 'yes') {
        chips.push({ id: 'active-yes', label: 'فقط فعال', patch: { active: 'all' } });
    }
    if (filters.active === 'no') {
        chips.push({ id: 'active-no', label: 'فقط غیرفعال', patch: { active: 'all' } });
    }
    if (filters.checkout === 'yes') {
        chips.push({ id: 'co-yes', label: 'در checkout', patch: { checkout: 'all' } });
    }
    if (filters.checkout === 'no') {
        chips.push({ id: 'co-no', label: 'مخفی در checkout', patch: { checkout: 'all' } });
    }
    if (filters.q.trim()) {
        chips.push({ id: 'q', label: `جستجو: ${filters.q.trim()}`, patch: { q: '' } });
    }
    return chips;
}

export function countGatewayFilterDimensions(filters: GatewayListFilters): number {
    let n = 0;
    if (filters.category !== 'all') n++;
    if (filters.kind !== 'all') n++;
    if (filters.active !== 'all') n++;
    if (filters.checkout !== 'all') n++;
    if (filters.q.trim()) n++;
    return n;
}
