import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
    // source map مرورگر در build — فقط سرور پایش خطا با توکن پروژه می‌خواندش (proxy.ts → etrSourceMapGuard)
    // تا Stack Trace خطاهای production به فایل و خط اصلی برگردد
    productionBrowserSourceMaps: true,
    reactStrictMode: true,
    // دکمهٔ شناور Next.js Dev Tools در حالت dev حذف می‌شود — در loading سایت
    // و کنار محتوا آیکون اضافه نشان نمی‌دهد.
    devIndicators: false,
    transpilePackages: ["@my-workspace/components", "@my-workspace/fonts",'react-markdown', 'github-markdown-css'],
    images: {
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'eu2.contabostorage.com',
                pathname: '/**',
            },
            {
                // Storage inside Iran (managed from naslyar → Files → Settings)
                protocol: 'https',
                hostname: '**.parspack.net',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'mashinbazaar.storage.iran.liara.space',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.byteplusapi.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.byteintl.net',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.bytedance.net',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.volces.com',
                pathname: '/**',
            },
        ],
    },
    // Keep SVGs as static assets so next/image can use them as `src`.
    // Do not add SVGR under turbopack — it turns SVG imports into React components.
    turbopack: {},
    experimental: {
        externalDir: true,
    },
    // Used when running with --webpack
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/i,
            type: 'asset/resource',
        });
        return config;
    },
    typescript: {
        // !! WARNING !!
        // Dangerously allow production builds to successfully complete
        // even if your project has Type errors.
        // !! WARNING !!
        ignoreBuildErrors: true,
    },
    async redirects() {
        return [
            { source: '/templates2', destination: '/templates', permanent: false },
            { source: '/templates2/new', destination: '/templates/new', permanent: false },
            { source: '/templates2/:templateId/edit', destination: '/templates/:templateId/edit', permanent: false },
            // قوانین و حریم خصوصی حالا پست‌های قفل‌شدهٔ بلاگ در layout بلاگ هستند (app/lib/legal-pages.ts)
            { source: '/terms', destination: '/legal/terms', permanent: true },
            { source: '/privacy', destination: '/legal/privacy', permanent: true },
        ];
    },
    async rewrites() {
        return [
            { source: '/', destination: '/explore' },
            // فایل‌های SEO از ماژول سایت‌مپ API (app/seo-files) — مسیرها با SITEMAP_* در core یکی است
            { source: '/sitemap.xml', destination: '/seo-files/index' },
            { source: '/sitemaps/:name', destination: '/seo-files/files/:name' },
            { source: '/robots.txt', destination: '/seo-files/rules' },
            // فایل تایید کلید IndexNow روی ریشه دامنه (فایل‌های public مثل verification گوگل اولویت دارند)
            { source: '/:key([a-zA-Z0-9-]{8,128})\\.txt', destination: '/seo-files/indexnow/:key' },
        ];
    },
};

export default nextConfig;
