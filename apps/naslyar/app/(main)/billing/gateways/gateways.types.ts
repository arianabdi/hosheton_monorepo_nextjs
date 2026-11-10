export interface Gateway {
    _id: string;
    slug: string;
    name: string;
    description?: string;
    category: 'direct' | 'installment';
    providerType: string;
    isActive: boolean;
    showInCheckout: boolean;
    order: number;
    logoSvg?: string;
    logoUrl?: string;
}
