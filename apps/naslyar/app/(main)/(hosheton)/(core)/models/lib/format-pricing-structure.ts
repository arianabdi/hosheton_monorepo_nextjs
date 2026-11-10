/** Summarize pricing structure for plain-text display (legacy) */
export { getPricingStructureMeta } from './get-pricing-structure-meta';

import { getPricingStructureMeta } from './get-pricing-structure-meta';

export function formatPricingStructure(item: Parameters<typeof getPricingStructureMeta>[0]): string {
    return getPricingStructureMeta(item).labelFa;
}
