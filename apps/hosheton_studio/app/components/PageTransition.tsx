'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import styles from './PageTransition.module.scss';
import { useTranslation } from 'react-i18next';

// Short hold so a page that is already ready does not flash the overlay.
const FAST_REVEAL_MS = 280;
// Time given to the incoming page to register via usePageLoading.
const REGISTER_WINDOW_MS = 120;
// Safety cap so a hanging request can never lock the screen forever.
const MAX_LOADING_MS = 20000;

type PageLoadApi = {
    setLoading: (id: string, loading: boolean) => void;
    unregister: (id: string) => void;
};

const PageLoadContext = createContext<PageLoadApi | null>(null);

let pageLoadSeq = 0;

/**
 * Report this page's data-fetch state to the parent PageTransition.
 * Call with `true` while the request is in flight and `false` when the
 * page is ready to be revealed. Without this hook, waitForData cannot
 * know when children have finished loading.
 */
export function usePageLoading(isLoading: boolean) {
    const ctx = useContext(PageLoadContext);
    const idRef = useRef('');
    if (!idRef.current) {
        pageLoadSeq += 1;
        idRef.current = `page-load-${pageLoadSeq}`;
    }

    useLayoutEffect(() => {
        if (!ctx) return;
        const id = idRef.current;
        ctx.setLoading(id, isLoading);
        return () => ctx.unregister(id);
    }, [ctx, isLoading]);
}

interface PageTransitionProps {
    children: React.ReactNode;
    /**
     * When enabled, the incoming page stays behind a loading screen until
     * every child that called `usePageLoading` reports ready.
     */
    waitForData?: boolean;
    /** Stretch to the parent height so inner pages can pin a sidebar and scroll content. */
    fillHeight?: boolean;
}

export default function PageTransition({ children, waitForData = false, fillHeight = false }: PageTransitionProps) {
    const pathname = usePathname();
    const { t } = useTranslation('common');
    const [overlay, setOverlay] = useState(waitForData);
    const [trackedPath, setTrackedPath] = useState(pathname);
    const [loadingCount, setLoadingCount] = useState(0);
    const [registeredCount, setRegisteredCount] = useState(0);
    const prevPathRef = useRef(pathname);
    const contentRef = useRef<HTMLDivElement>(null);
    const loadersRef = useRef(new Map<string, boolean>());
    const startedAtRef = useRef(0);

    const syncCounts = () => {
        const values = [...loadersRef.current.values()];
        setRegisteredCount(loadersRef.current.size);
        setLoadingCount(values.filter(Boolean).length);
    };

    const api = useMemo<PageLoadApi>(() => ({
        setLoading(id, loading) {
            loadersRef.current.set(id, loading);
            syncCounts();
        },
        unregister(id) {
            loadersRef.current.delete(id);
            syncCounts();
        },
    }), []);

    // Reset reporters in the same render that the route changes, before
    // the incoming page's useLayoutEffect registers the new fetch.
    if (trackedPath !== pathname) {
        setTrackedPath(pathname);
        loadersRef.current.clear();
        setRegisteredCount(0);
        setLoadingCount(0);
        if (waitForData) setOverlay(true);
        startedAtRef.current = 0;
    }

    const isNavigating = prevPathRef.current !== pathname;
    const showLoading = waitForData && (isNavigating || overlay);

    useEffect(() => {
        prevPathRef.current = pathname;
        if (!waitForData) return;
        setOverlay(true);
        requestAnimationFrame(() => {
            const scroller = contentRef.current?.parentElement?.parentElement;
            if (scroller) scroller.scrollTop = 0;
        });
    }, [pathname, waitForData]);

    useEffect(() => {
        if (!showLoading) {
            startedAtRef.current = 0;
            return;
        }
        if (!startedAtRef.current) {
            startedAtRef.current = Date.now();
        }

        let cancelled = false;

        const finish = () => {
            if (cancelled) return;
            cancelled = true;
            setOverlay(false);
        };

        const tick = () => {
            if (cancelled) return;
            const elapsed = Date.now() - startedAtRef.current;
            if (elapsed >= MAX_LOADING_MS) {
                finish();
                return;
            }

            const stillLoading = loadingCount > 0;
            const hasReporter = registeredCount > 0;
            const ready =
                elapsed >= FAST_REVEAL_MS &&
                !stillLoading &&
                (hasReporter || elapsed >= REGISTER_WINDOW_MS);

            if (ready) {
                finish();
                return;
            }
            requestAnimationFrame(tick);
        };

        const rafId = requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [showLoading, pathname, loadingCount, registeredCount]);

    if (!waitForData) {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <PageLoadContext.Provider value={api}>
            <div className={`${styles.root} ${fillHeight ? styles.fill : ''}`}>
                <div ref={contentRef} className={`${styles.content} ${fillHeight ? styles.fill : ''}`}>
                    <motion.div
                        key={pathname}
                        className={fillHeight ? styles.fill : undefined}
                        initial={{ opacity: 0, y: 12 }}
                        animate={showLoading ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </div>
                {showLoading && (
                    <div className={styles.loadingScreen} aria-live="polite">
                        <div className={styles.spinner} />
                        <p className={styles.text}>{t('loading')}</p>
                    </div>
                )}
            </div>
        </PageLoadContext.Provider>
    );
}
