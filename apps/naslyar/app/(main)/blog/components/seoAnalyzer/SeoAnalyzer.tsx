'use client';

import React, { useEffect, useState } from 'react';
import { parse } from 'node-html-parser';
import style from '../seoAnalyzer/seoAnalyzer.module.scss';
import { ExpandableSection } from '@my-workspace/components';
import SeoResultComponent from '../seoAnalyzer/components/SeoResultComponent';
import { getReadabilityMessage } from '../seoAnalyzer/utils/getReadabilityMessage';
import { GetSeoAnalyticsMessage } from '../seoAnalyzer/utils/getSeoAnalyticsMessage';
import {
    extractHeadings,
    extractImagesAndAlts,
    extractKeywordDensity,
    extractLinksWithType,
} from '../seoAnalyzer/utils/helpers';

interface SeoAnalyzerProps {
    title: string;
    content: string;
    keywords: string[];
    metaDescription: string;
    domain: string;
}

export function SeoAnalyzer({ title, content, keywords, metaDescription, domain }: SeoAnalyzerProps) {
    const [report, setReport] = useState({
        wordCount: 0,
        headingCount: 0,
        imageCount: 0,
        imageWithAlt: 0,
        keywordDensity: [] as Array<Record<string, unknown>>,
        metaDescriptionWordCount: 0,
        internalLinks: [] as Array<{ link: string; text: string }>,
        externalLinks: [] as Array<{ link: string; text: string }>,
        internalLinksLength: 0,
        externalLinksLength: 0,
    });
    const [headingDetails, setHeadingDetails] = useState<ReturnType<typeof parse>['querySelectorAll'] extends (...args: infer _) => infer R ? R : never>([] as never);
    const [imageData, setImageData] = useState<Array<{ src: string | null; alt: string }>>([]);

    useEffect(() => {
        const root = parse(content || '');
        const firstParagraph = root.querySelector('p');
        let firstParagraphText = firstParagraph ? firstParagraph.text : root.text.trim().split(/\s+/).slice(0, 30).join(' ');
        const textContent = root.structuredText || '';
        const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
        const metaDescriptionWordCount = metaDescription.replace(/\s/g, '').length;
        const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
        setHeadingDetails(headings as never);
        const images = root.querySelectorAll('img');
        const imageInfo = images.map((img) => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || '',
        }));
        const imagesWithAlt = imageInfo.filter((img) => img.alt.trim() !== '');
        setImageData(imageInfo);
        const keywordDensity: Array<Record<string, unknown>> = [];
        if (keywords?.length) {
            keywords.forEach((keyword) => {
                const matches = textContent.split(keyword).length - 1;
                keywordDensity.push({
                    keyword,
                    count: matches,
                    density: wordCount > 0 ? ((matches / wordCount) * 100).toFixed(2) : 0,
                    inUrl: false,
                    inTitle: title.includes(keyword),
                    inFirstParagraph: firstParagraphText.toLowerCase().includes(keyword.trim().toLowerCase()),
                    inMetaDescription: metaDescription.includes(keyword),
                });
            });
        }
        const links = root.querySelectorAll('a');
        const internalLinks = links
            .filter((link) => {
                const href = link.getAttribute('href');
                return href && (href.startsWith('/') || href.includes(domain));
            })
            .map((link) => ({ link: link.getAttribute('href') || '', text: link.textContent.trim() }));
        const externalLinks = links
            .filter((link) => {
                const href = link.getAttribute('href');
                return href && !href.startsWith('/') && !href.includes(domain);
            })
            .map((link) => ({ link: link.getAttribute('href') || '', text: link.textContent.trim() }));

        setReport({
            wordCount,
            headingCount: headings.length,
            imageCount: images.length,
            imageWithAlt: imagesWithAlt.length,
            keywordDensity,
            metaDescriptionWordCount,
            internalLinks,
            externalLinks,
            internalLinksLength: internalLinks.length,
            externalLinksLength: externalLinks.length,
        });
    }, [content, keywords, metaDescription, title, domain]);

    const internalLinksResult = GetSeoAnalyticsMessage('internalLinks', report.internalLinksLength);
    const externalLinksResult = GetSeoAnalyticsMessage('externalLinks', report.externalLinksLength);
    const metaDescriptionResult = GetSeoAnalyticsMessage('metaDescription', report.metaDescriptionWordCount);
    const keywordDensityResult = GetSeoAnalyticsMessage('keywordDensity', report.keywordDensity);
    const keywordsResult = GetSeoAnalyticsMessage('keywords', keywords);
    const imagesResult = GetSeoAnalyticsMessage('images', { total: report.imageCount, withAlt: report.imageWithAlt });
    const wordCountResult = GetSeoAnalyticsMessage('wordCount', report.wordCount);
    const headingsResult = GetSeoAnalyticsMessage('headings', report.headingCount);

    return (
        <div className={style.seoAnalyzer}>
            <ExpandableSection title="تحلیل سئو (SEO Analysis)">
                <SeoResultComponent
                    results={[
                        { ...internalLinksResult, detail: report.internalLinksLength === 0 ? '' : extractLinksWithType(report.internalLinks, domain) },
                        { ...externalLinksResult, detail: report.externalLinksLength === 0 ? '' : extractLinksWithType(report.externalLinks, domain) },
                        metaDescriptionResult,
                        { ...keywordsResult, detail: extractKeywordDensity(report.keywordDensity as never, []) },
                        { ...keywordDensityResult, detail: extractKeywordDensity(report.keywordDensity as never, []) },
                        { ...imagesResult, detail: extractImagesAndAlts(imageData) },
                        wordCountResult,
                        { ...headingsResult, detail: extractHeadings(headingDetails as never) },
                    ]}
                />
            </ExpandableSection>
            <ExpandableSection title="تحلیل خوانایی متن (Readability Analysis)">
                <SeoResultComponent
                    results={[
                        getReadabilityMessage('transitionWords', 22),
                        getReadabilityMessage('passiveVoice', 22),
                        getReadabilityMessage('paragraphLength', 22),
                        getReadabilityMessage('sentenceLength', 22),
                        getReadabilityMessage('consecutiveSentences', 22),
                        getReadabilityMessage('wordComplexity', 22),
                    ]}
                />
            </ExpandableSection>
        </div>
    );
}
