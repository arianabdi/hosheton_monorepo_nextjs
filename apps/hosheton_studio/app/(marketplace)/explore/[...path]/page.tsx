import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { ExploreMasonry } from '../components/ExploreMasonry';
import { ExploreDetailOverlay } from '../components/ExploreDetailOverlay';

import {
    buildCategoryJsonLd,
    buildCategoryMetadata,
    buildTemplateJsonLd,
    buildTemplateMetadata,
    fetchExploreForSeo,
    fetchTemplateForSeo,
} from '@/app/(marketplace)/lib/seo';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import {
    categoryTrailFor,
    decodeSegments,
    fetchTemplateCategoryTree,
    resolveExplorePath,
} from '@/app/(marketplace)/lib/explore-taxonomy';
import { mediaThumbLargeSrc } from '@/app/(marketplace)/lib/template-media';

type ExplorePathPageProps = {
    params: Promise<{ path: string[] }>;
};

async function resolve(params: ExplorePathPageProps['params']) {
    const { path } = await params;
    const segments = decodeSegments(path);
    const tree = await fetchTemplateCategoryTree();
    return { segments, tree, resolution: resolveExplorePath(segments, tree) };
}

function JsonLd({ data }: { data: unknown }) {
    return (
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

export async function generateMetadata({ params }: ExplorePathPageProps): Promise<Metadata> {
    const { resolution } = await resolve(params);
    if (resolution.kind === 'category') return buildCategoryMetadata(resolution.node);
    if (resolution.kind !== 'template') return {};
    const template = await fetchTemplateForSeo(resolution.slug);
    if (!template) {
        return { title: 'قالب یافت نشد', robots: { index: false, follow: false } };
    }
    return buildTemplateMetadata(template);
}

/**
 * /explore/<...path> — هم صفحهٔ فرود دسته و هم صفحهٔ جزئیات قالب (قرارداد: lib/explore-taxonomy.ts).
 * ناوبری نرم داخل اکسپلور با @modal/(.)explore/[...path] رهگیری می‌شود؛ این صفحه برای لینک مستقیم،
 * رفرش و خزنده‌ها است.
 */
export default async function ExplorePathPage({ params }: ExplorePathPageProps) {
    const { segments, tree, resolution } = await resolve(params);

    if (resolution.kind === 'category') {
        const { node } = resolution;
        const initial = await fetchExploreForSeo(node.path);
        const items = initial?.templates || [];
        return (
            <div>
                <JsonLd data={buildCategoryJsonLd(node, categoryTrailFor(tree, node.path), items)} />
                <Suspense fallback={null}>
                    <ExploreMasonry
                        initialTree={tree}
                        initialData={initial ? { categoryPath: node.path, response: initial } : null}
                    />
                </Suspense>
            </div>
        );
    }

    if (resolution.kind !== 'template') notFound();

    const template = await fetchTemplateForSeo(resolution.slug);
    if (!template) notFound();

    // یک آدرس canonical برای هر قالب: مسیر قدیمی /explore/<slug> یا دستهٔ عوض‌شده → ۳۰۸ به آدرس فعلی
    const canonicalPath = templateDetailPath(template);
    const requestedPath = `/explore/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
    if (canonicalPath !== requestedPath) permanentRedirect(canonicalPath);

    const coverPreview = template.previewMedia?.find((media) => media.isCover)
        || template.primaryPreview
        || template.previewMedia?.[0];
    const cover = mediaThumbLargeSrc(coverPreview);
    const description = template.metaDescription || template.description;

    return (
        <div>
            <JsonLd data={buildTemplateJsonLd(template)} />
            {/*
                Crawlable / no-JS fallback content for the detail route.
                Once hydrated, the modal below opens over the grid exactly like soft navigation.
            */}
            <article
                style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                }}
            >
                <h1>{template.title}</h1>
                {description ? <p>{description}</p> : null}
                {cover ? <img src={cover} alt={template.title} width={640} height={480} /> : null}
            </article>

            <Suspense fallback={null}>
                <ExploreMasonry initialTree={tree} />
            </Suspense>
            <ExploreDetailOverlay key={template.slug || template._id} initialItem={template} />
        </div>
    );
}
