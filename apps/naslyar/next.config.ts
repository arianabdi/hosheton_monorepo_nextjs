import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    transpilePackages: ["@my-workspace/components", "@my-workspace/fonts", "react-markdown", "remark-math", "rehype-katex"],
    images: {
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'eu2.contabostorage.com',
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
    turbopack: {
        root: path.resolve(__dirname, '../..'),
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    experimental: {
        externalDir: true,
    },
    typescript: {
        // !! WARNING !!
        // Dangerously allow production builds to successfully complete
        // even if your project has Type errors.
        // !! WARNING !!
        ignoreBuildErrors: true,
    },
    // Fallback to webpack when turbopack is not used
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack', 'url-loader'],
        });
        return config;
    },

};

export default nextConfig;
