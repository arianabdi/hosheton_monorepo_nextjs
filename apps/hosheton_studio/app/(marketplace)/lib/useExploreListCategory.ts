'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
    exploreSegmentsFromPathname,
    resolveExplorePath,
    type TemplateCategoryNode,
} from './explore-taxonomy';

type ListCategoryState = {
    category: TemplateCategoryNode | null;
    /** فهرست از یک آدرس فهرست (همه یا دسته) آمده — نه ورود مستقیم به آدرس قالب */
    fromList: boolean;
};

/**
 * دستهٔ فعال فهرست اکسپلور از URL: /explore → همه، /explore/<cat>/<sub> → همان دسته (با زیرشاخه‌ها).
 * روی آدرس قالب (مودال باز) فهرست قبلی دست نمی‌خورد — حتی «همه» — تا گرید زیر مودال دوباره
 * بارگذاری نشود و بعد از بستن، اسکرول و صفحه‌های لودشده سر جایشان باشند.
 * فقط ورود مستقیم به آدرس قالب، دستهٔ والد آن را نشان می‌دهد.
 * فقط usePathname — بدون useSearchParams تا سرصفحهٔ دسته در HTML سرور (سئو) رندر شود.
 */
export function useExploreListCategory(nodes: TemplateCategoryNode[], loaded: boolean) {
    const pathname = usePathname();
    const pick = useCallback((current: ListCategoryState): ListCategoryState => {
        const resolution = resolveExplorePath(exploreSegmentsFromPathname(pathname), nodes);
        if (resolution.kind === 'root') return { category: null, fromList: true };
        if (resolution.kind === 'category') return { category: resolution.node, fromList: true };
        if (current.fromList) return current;
        return { category: resolution.parent, fromList: false };
    }, [pathname, nodes]);
    const [state, setState] = useState<ListCategoryState>(
        () => (loaded ? pick({ category: null, fromList: false }) : { category: null, fromList: false }),
    );
    useEffect(() => {
        if (loaded) setState((current) => pick(current));
    }, [loaded, pick]);
    return state.category;
}
