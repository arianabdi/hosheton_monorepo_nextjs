'use client';

import { getPricingStructureMeta } from '../lib/get-pricing-structure-meta';

interface PricingStructureCellProps {
    item: Parameters<typeof getPricingStructureMeta>[0];
}

export default function PricingStructureCell({ item }: PricingStructureCellProps) {
    const meta = getPricingStructureMeta(item);
    return <span>{meta.labelFa}</span>;
}
