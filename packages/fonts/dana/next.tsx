import localFont from 'next/font/local';

// Using next/font/local for better performance
export const dana = localFont({
    src: [
        {
            path: './dana-regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './dana-bold.ttf',
            weight: '600',
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-dana', // Optional CSS variable
});

// Also export the font family name for compatibility
export const danaFontFamily = 'dana';