import localFont from 'next/font/local';

// Using next/font/local for better performance
export const bhoma = localFont({
    src: [
        {
            path: './bhoma.ttf',
            weight: '400',
            style: 'normal',
        }
    ],
    display: 'swap',
    variable: '--font-bhoma', // Optional CSS variable
});

// Also export the font family name for compatibility
export const bhomaFontFamily = 'bhoma';