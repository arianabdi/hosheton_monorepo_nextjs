import localFont from 'next/font/local';

// Using next/font/local for better performance
export const yekanbakh = localFont({
    src: [
        {
            path: './YekanBakh-Hairline.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './YekanBakh-Light.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: './YekanBakh-Medium.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: './YekanBakh-Regular.ttf',
            weight: '900', // Extra bold typically 900
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-yekanbakh', // Optional CSS variable
});

// Also export the font family name for compatibility
export const yekanbakhFontFamily = 'yekanbakh';